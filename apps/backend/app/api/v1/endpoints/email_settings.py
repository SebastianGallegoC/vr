"""
VegasDelRio - Endpoints: Configuración de Email (Gmail OAuth).

Permite al administrador vincular su cuenta de Gmail para enviar
correos a través de Gmail API en lugar de SMTP manual.
"""

import asyncio
import base64
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from urllib.parse import urlencode

import requests as http_requests
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core import get_settings
from app.db import get_db
from app.models.email_config import EmailConfig
from app.schemas.email_config import (
    EmailConfigResponse,
    GmailAuthUrlResponse,
    GmailCallbackRequest,
)

router = APIRouter()
settings = get_settings()

# Scopes: enviar correos + leer email del usuario
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
]

GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URI = "https://www.googleapis.com/oauth2/v2/userinfo"


@lru_cache(maxsize=1)
def _get_fernet() -> Fernet:
    """Crea una instancia de Fernet usando el secret_key de la app (32 bytes, base64). Cacheada."""
    key = hashlib.sha256(settings.secret_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def _get_redirect_uri() -> str:
    return f"{settings.frontend_url}/dashboard/settings/gmail/callback"


# ---- GET /settings/email/status ----

@router.get("/email/status", response_model=EmailConfigResponse)
async def get_email_status(db: AsyncSession = Depends(get_db)):
    """Consulta si hay una cuenta de Gmail vinculada."""
    result = await db.execute(select(EmailConfig).limit(1))
    config = result.scalar_one_or_none()

    if not config:
        return EmailConfigResponse(vinculado=False)

    return EmailConfigResponse(
        vinculado=True,
        proveedor=config.proveedor,
        email_vinculado=config.email_vinculado,
        vinculado_en=config.vinculado_en,
    )


# ---- GET /settings/email/gmail/auth-url ----

@router.get("/email/gmail/auth-url", response_model=GmailAuthUrlResponse)
async def get_gmail_auth_url():
    """
    Genera la URL de consentimiento de Google OAuth.
    El frontend abre esta URL en un popup.
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET no configurados.",
        )

    params = urlencode({
        "client_id": settings.google_client_id,
        "redirect_uri": _get_redirect_uri(),
        "response_type": "code",
        "scope": " ".join(GMAIL_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    })
    auth_url = f"{GOOGLE_AUTH_URI}?{params}"

    return GmailAuthUrlResponse(auth_url=auth_url)


# ---- POST /settings/email/gmail/callback ----

@router.post("/email/gmail/callback", response_model=EmailConfigResponse)
async def gmail_oauth_callback(
    body: GmailCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Recibe el código de autorización de Google, intercambia por tokens,
    cifra y almacena en la base de datos.
    """
    # Intercambiar código por tokens (en thread para no bloquear el event loop)
    token_response = await asyncio.to_thread(
        http_requests.post,
        GOOGLE_TOKEN_URI,
        data={
            "code": body.code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": _get_redirect_uri(),
            "grant_type": "authorization_code",
        },
        timeout=30,
    )

    if token_response.status_code != 200:
        try:
            error_detail = token_response.json().get("error_description", token_response.text)
        except ValueError:
            error_detail = token_response.text
        logger.error("Error intercambiando código OAuth: %s", error_detail)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error intercambiando código OAuth: {error_detail}",
        )

    try:
        token_data = token_response.json()
    except ValueError:
        logger.error("Google devolvió respuesta no-JSON: %s", token_response.text[:200])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Google devolvió una respuesta inesperada.",
        )
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in")  # segundos

    logger.info("Token obtenido. refresh_token presente: %s", bool(refresh_token))

    if not refresh_token:
        logger.error("No se recibió refresh_token de Google.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se recibió refresh_token. Revoca el acceso en tu cuenta de Google e intenta de nuevo.",
        )

    # Obtener el email de la cuenta vinculada (en thread)
    userinfo_resp = await asyncio.to_thread(
        http_requests.get,
        GOOGLE_USERINFO_URI,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if userinfo_resp.status_code == 200:
        try:
            linked_email = userinfo_resp.json().get("email", "desconocido")
        except ValueError:
            linked_email = "desconocido"
    else:
        logger.warning("No se pudo obtener email del usuario: %s", userinfo_resp.text)
        linked_email = "desconocido"

    # Cifrar tokens antes de guardar
    fernet = _get_fernet()
    access_enc = fernet.encrypt(access_token.encode()).decode()
    refresh_enc = fernet.encrypt(refresh_token.encode()).decode()

    now = datetime.now(timezone.utc)
    token_expiry = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)) if expires_in else None

    # Upsert: eliminar config anterior si existe y crear nueva
    result = await db.execute(select(EmailConfig).limit(1))
    existing = result.scalar_one_or_none()

    if existing:
        existing.proveedor = "google"
        existing.email_vinculado = linked_email
        existing.access_token_enc = access_enc
        existing.refresh_token_enc = refresh_enc
        existing.token_expiry = token_expiry
        existing.actualizado_en = now
        config = existing
    else:
        config = EmailConfig(
            proveedor="google",
            email_vinculado=linked_email,
            access_token_enc=access_enc,
            refresh_token_enc=refresh_enc,
            token_expiry=token_expiry,
            vinculado_en=now,
            actualizado_en=now,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)

    return EmailConfigResponse(
        vinculado=True,
        proveedor=config.proveedor,
        email_vinculado=config.email_vinculado,
        vinculado_en=config.vinculado_en,
    )


# ---- DELETE /settings/email/gmail/unlink ----

@router.delete("/email/gmail/unlink")
async def unlink_gmail(db: AsyncSession = Depends(get_db)):
    """Desvincula la cuenta de Gmail."""
    result = await db.execute(select(EmailConfig).limit(1))
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay cuenta vinculada.",
        )

    await db.delete(config)
    await db.commit()

    return {"detail": "Cuenta de Gmail desvinculada correctamente."}
