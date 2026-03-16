"""
VegasDelRio - Modelos: Billing (Periodos, Facturas, Items, Notificaciones).

Define las tablas relacionadas con el proceso de facturación:
  - BillingPeriod: Periodo mensual de cobro.
  - Bill: Factura individual por casa.
  - BillItem: Conceptos detallados de cada factura.
  - NotificationLog: Registro de envíos (email, WhatsApp, etc.).
"""

import uuid
from datetime import date, datetime, timezone
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.owner import Owner
    from app.models.property import Property

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ============================================================
# Enums para estados tipados
# ============================================================

class PeriodStatus(str, PyEnum):
    """Estados posibles de un periodo de facturación."""
    OPEN = "open"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class BillStatus(str, PyEnum):
    """Estados posibles de una factura."""
    DRAFT = "draft"             # Generada, no enviada
    PENDING = "pending"         # Enviada, esperando pago
    PAID = "paid"               # Pagada
    OVERDUE = "overdue"         # Vencida
    CANCELLED = "cancelled"     # Cancelada/Anulada


class NotificationChannel(str, PyEnum):
    """Canales de notificación disponibles."""
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    SMS = "sms"


class NotificationStatus(str, PyEnum):
    """Estados posibles de una notificación enviada."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"


# ============================================================
# BillingPeriod: Periodo mensual de cobro
# ============================================================

class BillingPeriod(Base):
    """Tabla: periodos_facturacion — Periodo mensual de facturación."""

    __tablename__ = "periodos_facturacion"

    __table_args__ = (
        UniqueConstraint("mes", "anio", name="uq_periodo_mes_anio"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    mes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Mes del periodo (1-12)",
    )
    anio: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Año del periodo (ej: 2026)",
    )
    descripcion: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Descripción legible (ej: 'Febrero 2026')",
    )
    monto_base: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        comment="Monto base de administración para este periodo",
    )
    fecha_vencimiento: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="Fecha límite de pago",
    )
    estado: Mapped[PeriodStatus] = mapped_column(
        Enum(PeriodStatus, name="period_status", create_constraint=True),
        default=PeriodStatus.OPEN,
        nullable=False,
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
    facturas: Mapped[list["Bill"]] = relationship(
        "Bill",
        back_populates="periodo_facturacion",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<BillingPeriod(id={self.id}, periodo='{self.descripcion}')>"


# ============================================================
# Bill: Factura individual por casa
# ============================================================

class Bill(Base):
    """Tabla: facturas — Factura/cobro individual para una casa específica."""

    __tablename__ = "facturas"

    __table_args__ = (
        UniqueConstraint(
            "propiedad_id",
            "periodo_facturacion_id",
            name="uq_factura_propiedad_periodo",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    numero_factura: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
        comment="Número consecutivo de factura (ej: VDR-2026-02-001)",
    )

    # ---- Llaves Foráneas ----
    propiedad_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("propiedades.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    periodo_facturacion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("periodos_facturacion.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    propietario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("propietarios.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Propietario al que se dirige este cobro",
    )

    # ---- Datos de la Factura ----
    monto_total: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        comment="Monto total del cobro (suma de items)",
    )
    estado: Mapped[BillStatus] = mapped_column(
        Enum(BillStatus, name="bill_status", create_constraint=True),
        default=BillStatus.DRAFT,
        nullable=False,
        index=True,
    )
    url_pdf: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="URL del PDF generado (Supabase Storage o local)",
    )
    notas: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Notas internas sobre la factura",
    )

    # ---- Fechas de Seguimiento ----
    enviado_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Fecha/hora en que se envió la notificación",
    )
    pagado_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Fecha/hora en que se registró el pago",
    )

    # ---- Auditoría ----
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ---- Relaciones ----
    propiedad: Mapped["Property"] = relationship(
        "Property",
        back_populates="facturas",
    )
    periodo_facturacion: Mapped["BillingPeriod"] = relationship(
        "BillingPeriod",
        back_populates="facturas",
    )
    propietario: Mapped["Owner"] = relationship(
        "Owner",
        back_populates="facturas",
    )
    items: Mapped[list["BillItem"]] = relationship(
        "BillItem",
        back_populates="factura",
        cascade="all, delete-orphan",
    )
    notificaciones: Mapped[list["NotificationLog"]] = relationship(
        "NotificationLog",
        back_populates="factura",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Bill(id={self.id}, numero='{self.numero_factura}', estado='{self.estado}')>"


# ============================================================
# BillItem: Conceptos detallados de una factura
# ============================================================

class BillItem(Base):
    """Tabla: items_factura — Líneas de detalle de cada factura."""

    __tablename__ = "items_factura"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ---- Llave Foránea ----
    factura_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("facturas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ---- Datos del Concepto ----
    concepto: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        comment="Nombre del concepto (ej: 'Administración', 'Cuota Extraordinaria')",
    )
    descripcion: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Descripción detallada del concepto",
    )
    monto: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        comment="Monto de este concepto",
    )

    # ---- Auditoría ----
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ---- Relaciones ----
    factura: Mapped["Bill"] = relationship(
        "Bill",
        back_populates="items",
    )

    def __repr__(self) -> str:
        return f"<BillItem(concepto='{self.concepto}', monto={self.monto})>"


# ============================================================
# NotificationLog: Registro de entregas por canal
# ============================================================

class NotificationLog(Base):
    """Tabla: registro_notificaciones — Auditoría de notificaciones enviadas."""

    __tablename__ = "registro_notificaciones"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ---- Llave Foránea ----
    factura_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("facturas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ---- Datos de la Notificación ----
    canal: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel", create_constraint=True),
        nullable=False,
        comment="Canal usado: email, whatsapp, telegram, sms",
    )
    destinatario: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
        comment="Dirección del destinatario (email o teléfono)",
    )
    estado: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notification_status", create_constraint=True),
        default=NotificationStatus.PENDING,
        nullable=False,
    )
    mensaje_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Mensaje de error si la entrega falló",
    )

    # ---- Fechas ----
    enviado_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ---- Relaciones ----
    factura: Mapped["Bill"] = relationship(
        "Bill",
        back_populates="notificaciones",
    )

    def __repr__(self) -> str:
        return (
            f"<NotificationLog(canal='{self.canal}', "
            f"destinatario='{self.destinatario}', estado='{self.estado}')>"
        )
