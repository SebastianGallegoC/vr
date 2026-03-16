"""
VegasDelRio - Schemas: Configuración de Email.

Schemas de respuesta para la vinculación de Gmail OAuth.
Nunca expone tokens de acceso.
"""

from datetime import datetime

from pydantic import BaseModel


class EmailConfigResponse(BaseModel):
    """Estado de la configuración de email (sin tokens sensibles)."""

    vinculado: bool
    proveedor: str | None = None
    email_vinculado: str | None = None
    vinculado_en: datetime | None = None

    model_config = {"from_attributes": True}


class GmailAuthUrlResponse(BaseModel):
    """URL de consentimiento de Google OAuth."""

    auth_url: str


class GmailCallbackRequest(BaseModel):
    """Código de autorización recibido tras el consentimiento."""

    code: str
