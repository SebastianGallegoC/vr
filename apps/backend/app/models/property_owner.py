"""
VegasDelRio - Modelo: PropertyOwner (Relación Casa ↔ Propietario).

Tabla pivote que vincula inmuebles con propietarios.
Soporta:
  - Múltiples propietarios por casa.
  - Historial de propiedad (start_date / end_date).
  - Propietario principal (is_primary) para dirigir cobros.
"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PropertyOwner(Base):
    """Tabla: property_owners — Relación muchos-a-muchos Casa ↔ Propietario."""

    __tablename__ = "property_owners"

    # Constraint: una misma combinación property + owner no se repite activa
    __table_args__ = (
        UniqueConstraint(
            "property_id",
            "owner_id",
            "start_date",
            name="uq_property_owner_period",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ---- Llaves Foráneas ----
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("owners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ---- Datos de la Relación ----
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Si es el propietario principal (recibe los cobros)",
    )
    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="Fecha de inicio de la relación de propiedad",
    )
    end_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="Fecha de fin (NULL = propietario actual)",
    )

    # ---- Auditoría ----
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ---- Relaciones ----
    property: Mapped["Property"] = relationship(
        "Property",
        back_populates="property_ownerships",
    )
    owner: Mapped["Owner"] = relationship(
        "Owner",
        back_populates="property_ownerships",
    )

    def __repr__(self) -> str:
        return (
            f"<PropertyOwner(property={self.property_id}, "
            f"owner={self.owner_id}, primary={self.is_primary})>"
        )
