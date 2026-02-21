"""
VegasDelRio - Modelo: Owner (Propietario/Residente).

Almacena la información personal de cada propietario o residente
del conjunto residencial.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Owner(Base):
    """Tabla: owners — Propietarios del conjunto residencial."""

    __tablename__ = "owners"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Identificador único del propietario",
    )

    # Vinculación opcional con Supabase Auth (si el propietario se registra)
    auth_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=True,
        index=True,
        comment="ID del usuario en Supabase Auth (opcional)",
    )

    # ---- Datos Personales ----
    full_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Nombre completo del propietario",
    )
    id_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="CC",
        comment="Tipo de documento: CC, CE, NIT, Pasaporte",
    )
    id_number: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
        comment="Número de documento de identidad",
    )
    email: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
        index=True,
        comment="Correo electrónico para notificaciones",
    )
    phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="Teléfono (con código de país, ej: +573001234567)",
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Notas internas sobre el propietario",
    )

    # ---- Estado ----
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Si el propietario está activo en el sistema",
    )

    # ---- Auditoría ----
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ---- Relaciones ----
    property_ownerships: Mapped[list["PropertyOwner"]] = relationship(
        "PropertyOwner",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    bills: Mapped[list["Bill"]] = relationship(
        "Bill",
        back_populates="owner",
    )

    def __repr__(self) -> str:
        return f"<Owner(id={self.id}, name='{self.full_name}', doc='{self.id_number}')>"
