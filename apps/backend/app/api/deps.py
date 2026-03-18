"""
VegasDelRio - Dependencias Compartidas de la API.

Provee dependencias reutilizables de FastAPI:
- get_current_user: autenticación JWT (Supabase) para el panel de administración.
- get_current_owner: autenticación JWT (propio) para el portal de propietarios.
"""

import json
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core import get_settings
from app.core.security import verify_token
from app.schemas.auth import CurrentUser

settings = get_settings()
logger = logging.getLogger(__name__)

# ---- Admin (Supabase Auth) ----
# El tokenUrl no se usa realmente (Supabase maneja el login),
# pero es necesario para que Swagger muestre el botón "Authorize".
# auto_error=False para poder manejar la ausencia de token en dev.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# ---- Portal de propietarios (JWT propio HS256) ----
portal_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/portal/login",
    auto_error=True,
)


class CurrentOwner(BaseModel):
    """Datos del propietario autenticado extraídos del JWT del portal."""
    owner_id: str
    property_id: str
    email: str


async def get_current_owner(
    token: str = Depends(portal_oauth2_scheme),
) -> CurrentOwner:
    """
    Dependencia de FastAPI: valida el Bearer token JWT propio (HS256)
    y retorna los datos del propietario autenticado en el portal.

    Raises:
        HTTPException 401: Si el token es inválido, expirado o el rol no es 'owner'.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = verify_token(token)
    if not payload:
        raise credentials_exception

    if payload.get("role") != "owner":
        raise credentials_exception

    owner_id = payload.get("sub")
    property_id = payload.get("property_id")
    email = payload.get("email")

    if not owner_id or not property_id or not email:
        raise credentials_exception

    return CurrentOwner(owner_id=owner_id, property_id=property_id, email=email)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
) -> CurrentUser:
    """
    Dependencia de FastAPI: valida el Bearer token JWT de Supabase
    y retorna los datos del usuario autenticado.

    En desarrollo, si SUPABASE_JWT_SECRET no está configurado,
    permite el acceso sin autenticación.

    Raises:
        HTTPException 401: Si el token es inválido, expirado o falta.
    """
    jwt_secret = settings.supabase_jwt_secret

    # En desarrollo sin JWT secret configurado, permitir acceso
    if not jwt_secret:
        if settings.app_env == "development":
            return CurrentUser(id="dev-user", email="dev@localhost", role="authenticated")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET no configurado en el servidor.",
        )

    # Si el secret existe, el token es obligatorio
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        jwt_secret_clean = jwt_secret.strip()
        if (
            len(jwt_secret_clean) >= 2
            and jwt_secret_clean[0] == jwt_secret_clean[-1]
            and jwt_secret_clean[0] in {"'", '"'}
        ):
            jwt_secret_clean = jwt_secret_clean[1:-1].strip()

        jwk_dict = json.loads(jwt_secret_clean)
        payload = jwt.decode(
            token,
            jwk_dict,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except (JWTError, json.JSONDecodeError) as e:
        logger.warning("Error decodificando JWT: %s", e)
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    user_email: str | None = payload.get("email")
    user_role: str = payload.get("role", "authenticated")

    if not user_id or not user_email:
        raise credentials_exception

    return CurrentUser(id=user_id, email=user_email, role=user_role)
