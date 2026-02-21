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
    """Tabla: billing_periods — Periodo mensual de facturación."""

    __tablename__ = "billing_periods"

    __table_args__ = (
        UniqueConstraint("month", "year", name="uq_period_month_year"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    month: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Mes del periodo (1-12)",
    )
    year: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Año del periodo (ej: 2026)",
    )
    description: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Descripción legible (ej: 'Febrero 2026')",
    )
    base_amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        comment="Monto base de administración para este periodo",
    )
    due_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="Fecha límite de pago",
    )
    status: Mapped[PeriodStatus] = mapped_column(
        Enum(PeriodStatus, name="period_status", create_constraint=True),
        default=PeriodStatus.OPEN,
        nullable=False,
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
    bills: Mapped[list["Bill"]] = relationship(
        "Bill",
        back_populates="billing_period",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<BillingPeriod(id={self.id}, period='{self.description}')>"


# ============================================================
# Bill: Factura individual por casa
# ============================================================

class Bill(Base):
    """Tabla: bills — Factura/cobro individual para una casa específica."""

    __tablename__ = "bills"

    __table_args__ = (
        UniqueConstraint(
            "property_id",
            "billing_period_id",
            name="uq_bill_property_period",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    bill_number: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
        comment="Número consecutivo de factura (ej: VDR-2026-02-001)",
    )

    # ---- Llaves Foráneas ----
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    billing_period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("billing_periods.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("owners.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Propietario al que se dirige este cobro",
    )

    # ---- Datos de la Factura ----
    total_amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        comment="Monto total del cobro (suma de items)",
    )
    status: Mapped[BillStatus] = mapped_column(
        Enum(BillStatus, name="bill_status", create_constraint=True),
        default=BillStatus.DRAFT,
        nullable=False,
    )
    pdf_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="URL del PDF generado (Supabase Storage o local)",
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Notas internas sobre la factura",
    )

    # ---- Fechas de Seguimiento ----
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Fecha/hora en que se envió la notificación",
    )
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Fecha/hora en que se registró el pago",
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
    property: Mapped["Property"] = relationship(
        "Property",
        back_populates="bills",
    )
    billing_period: Mapped["BillingPeriod"] = relationship(
        "BillingPeriod",
        back_populates="bills",
    )
    owner: Mapped["Owner"] = relationship(
        "Owner",
        back_populates="bills",
    )
    items: Mapped[list["BillItem"]] = relationship(
        "BillItem",
        back_populates="bill",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["NotificationLog"]] = relationship(
        "NotificationLog",
        back_populates="bill",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Bill(id={self.id}, number='{self.bill_number}', status='{self.status}')>"


# ============================================================
# BillItem: Conceptos detallados de una factura
# ============================================================

class BillItem(Base):
    """Tabla: bill_items — Líneas de detalle de cada factura."""

    __tablename__ = "bill_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ---- Llave Foránea ----
    bill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ---- Datos del Concepto ----
    concept: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        comment="Nombre del concepto (ej: 'Administración', 'Cuota Extraordinaria')",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Descripción detallada del concepto",
    )
    amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        comment="Monto de este concepto",
    )

    # ---- Auditoría ----
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ---- Relaciones ----
    bill: Mapped["Bill"] = relationship(
        "Bill",
        back_populates="items",
    )

    def __repr__(self) -> str:
        return f"<BillItem(concept='{self.concept}', amount={self.amount})>"


# ============================================================
# NotificationLog: Registro de entregas por canal
# ============================================================

class NotificationLog(Base):
    """Tabla: notification_logs — Auditoría de notificaciones enviadas."""

    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ---- Llave Foránea ----
    bill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ---- Datos de la Notificación ----
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel", create_constraint=True),
        nullable=False,
        comment="Canal usado: email, whatsapp, telegram, sms",
    )
    recipient: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
        comment="Dirección del destinatario (email o teléfono)",
    )
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notification_status", create_constraint=True),
        default=NotificationStatus.PENDING,
        nullable=False,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Mensaje de error si la entrega falló",
    )

    # ---- Fechas ----
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ---- Relaciones ----
    bill: Mapped["Bill"] = relationship(
        "Bill",
        back_populates="notifications",
    )

    def __repr__(self) -> str:
        return (
            f"<NotificationLog(channel='{self.channel}', "
            f"recipient='{self.recipient}', status='{self.status}')>"
        )
