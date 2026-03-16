"""
VegasDelRio - Modelo: Property (Casa/Inmueble).

Representa cada casa dentro del conjunto residencial.
Es la entidad central a la que se asocian los cobros.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.billing import Bill
    from app.models.property_owner import PropertyOwner

from sqlalchemy import Boolean, DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Property(Base):
    """Tabla: propiedades — Casas del conjunto residencial."""

    __tablename__ = "propiedades"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Identificador único del inmueble",
    )

    # ---- Datos del Inmueble ----
    numero_casa: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
        comment="Número de la casa (ej: '1', '2A', '15')",
    )
    direccion: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True,
        comment="Dirección completa del inmueble (opcional)",
    )
    area_m2: Mapped[float | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="Área del inmueble en metros cuadrados",
    )
    alicuota: Mapped[float | None] = mapped_column(
        Numeric(6, 4),
        nullable=True,
        comment="Porcentaje de participación (alícuota) sobre áreas comunes",
    )
    notas: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Notas internas sobre la propiedad",
    )

    # ---- Estado ----
    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        comment="Si el inmueble está activo en el sistema de cobros",
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
        back_populates="propiedad",
        cascade="all, delete-orphan",
    )
    facturas: Mapped[list["Bill"]] = relationship(
        "Bill",
        back_populates="propiedad",
    )

    def __repr__(self) -> str:
        return f"<Property(id={self.id}, casa='{self.numero_casa}')>"
