"""
VegasDelRio - Modelo: PropertyOwner (Relación Casa ↔ Propietario).

Tabla pivote que vincula inmuebles con propietarios.
Soporta:
  - Múltiples propietarios por casa.
  - Historial de propiedad (fecha_inicio / fecha_fin).
  - Propietario principal (es_principal) para dirigir cobros.
"""

import uuid
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.owner import Owner
    from app.models.property import Property

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PropertyOwner(Base):
    """Tabla: propiedad_propietarios — Relación muchos-a-muchos Casa ↔ Propietario."""

    __tablename__ = "propiedad_propietarios"

    # Constraint: una misma combinación propiedad + propietario no se repite activa
    __table_args__ = (
        UniqueConstraint(
            "propiedad_id",
            "propietario_id",
            "fecha_inicio",
            name="uq_propiedad_propietario_periodo",
        ),
        Index("ix_propowner_principal_activo", "es_principal", "fecha_fin"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ---- Llaves Foráneas ----
    propiedad_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("propiedades.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    propietario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("propietarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ---- Datos de la Relación ----
    es_principal: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Si es el propietario principal (recibe los cobros)",
    )
    fecha_inicio: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="Fecha de inicio de la relación de propiedad",
    )
    fecha_fin: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="Fecha de fin (NULL = propietario actual)",
    )

    # ---- Auditoría ----
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ---- Relaciones ----
    propiedad: Mapped["Property"] = relationship(
        "Property",
        back_populates="propiedad_propietarios",
    )
    propietario: Mapped["Owner"] = relationship(
        "Owner",
        back_populates="propiedad_propietarios",
    )

    def __repr__(self) -> str:
        return (
            f"<PropertyOwner(propiedad={self.propiedad_id}, "
            f"propietario={self.propietario_id}, principal={self.es_principal})>"
        )
