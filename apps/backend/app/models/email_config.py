"""
VegasDelRio - Modelo: Configuración de Email.

Almacena las credenciales OAuth de Gmail vinculadas por el administrador
para enviar correos a través de Gmail API.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EmailConfig(Base):
    """Tabla: configuracion_email — Credenciales OAuth del proveedor de email."""

    __tablename__ = "configuracion_email"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    proveedor: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="google",
        comment="Proveedor OAuth (google)",
    )
    email_vinculado: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Dirección de correo vinculada",
    )
    access_token_enc: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Access token cifrado con Fernet",
    )
    refresh_token_enc: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Refresh token cifrado con Fernet",
    )
    token_expiry: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Fecha de expiración del access token",
    )
    vinculado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Fecha en que se vinculó la cuenta",
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Última actualización de tokens",
    )
