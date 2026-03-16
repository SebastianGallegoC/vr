"""
VegasDelRio - Modelo: Owner (Propietario/Residente).

Almacena la información personal de cada propietario o residente
del conjunto residencial.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.billing import Bill
    from app.models.property_owner import PropertyOwner

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Owner(Base):
    """Tabla: propietarios — Propietarios del conjunto residencial."""

    __tablename__ = "propietarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Identificador único del propietario",
    )

    # Vinculación opcional con Supabase Auth (si el propietario se registra)
    id_usuario_auth: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=True,
        index=True,
        comment="ID del usuario en Supabase Auth (opcional)",
    )

    # ---- Datos Personales ----
    nombre_completo: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Nombre completo del propietario",
    )
    tipo_documento: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="CC",
        comment="Tipo de documento: CC, CE, NIT, Pasaporte",
    )
    numero_documento: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
        comment="Número de documento de identidad",
    )
    correos: Mapped[list[str]] = mapped_column(
        ARRAY(String(254)),
        nullable=False,
        default=list,
        comment="Lista de correos electrónicos para notificaciones",
    )
    telefonos: Mapped[list[str]] = mapped_column(
        ARRAY(String(20)),
        nullable=False,
        default=list,
        comment="Lista de teléfonos (con código de país, ej: +573001234567)",
    )
    notas: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Notas internas sobre el propietario",
    )

    # ---- Estado ----
    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        comment="Si el propietario está activo en el sistema",
    )

    # ---- Auditoría ----
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ---- Relaciones ----
    propiedad_propietarios: Mapped[list["PropertyOwner"]] = relationship(
        "PropertyOwner",
        back_populates="propietario",
        cascade="all, delete-orphan",
    )
    facturas: Mapped[list["Bill"]] = relationship(
        "Bill",
        back_populates="propietario",
    )

    def __repr__(self) -> str:
        return f"<Owner(id={self.id}, nombre='{self.nombre_completo}', doc='{self.numero_documento}')>"
