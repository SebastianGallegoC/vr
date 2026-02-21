"""
VegasDelRio - Modelo: Property (Casa/Inmueble).

Representa cada casa dentro del conjunto residencial.
Es la entidad central a la que se asocian los cobros.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Property(Base):
    """Tabla: properties — Casas del conjunto residencial."""

    __tablename__ = "properties"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Identificador único del inmueble",
    )

    # ---- Datos del Inmueble ----
    house_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
        comment="Número de la casa (ej: '1', '2A', '15')",
    )
    address: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True,
        comment="Dirección completa del inmueble (opcional)",
    )
    area_m2: Mapped[float | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="Área del inmueble en metros cuadrados",
    )
    aliquot: Mapped[float | None] = mapped_column(
        Numeric(6, 4),
        nullable=True,
        comment="Porcentaje de participación (alícuota) sobre áreas comunes",
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Notas internas sobre la propiedad",
    )

    # ---- Estado ----
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Si el inmueble está activo en el sistema de cobros",
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
        back_populates="property",
        cascade="all, delete-orphan",
    )
    bills: Mapped[list["Bill"]] = relationship(
        "Bill",
        back_populates="property",
    )

    def __repr__(self) -> str:
        return f"<Property(id={self.id}, house='{self.house_number}')>"
