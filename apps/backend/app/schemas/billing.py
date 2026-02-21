"""
VegasDelRio - Esquemas Pydantic: Billing (Periodos, Facturas, Items, Notificaciones).
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.billing import BillStatus, NotificationChannel, NotificationStatus, PeriodStatus


# ============================================================
# BillingPeriod
# ============================================================

class BillingPeriodBase(BaseModel):
    month: int = Field(..., ge=1, le=12, examples=[2])
    year: int = Field(..., ge=2020, le=2100, examples=[2026])
    description: str = Field(..., max_length=100, examples=["Febrero 2026"])
    base_amount: float = Field(..., gt=0, examples=[250000.00])
    due_date: date = Field(..., examples=["2026-02-28"])


class BillingPeriodCreate(BillingPeriodBase):
    pass


class BillingPeriodUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=100)
    base_amount: float | None = Field(default=None, gt=0)
    due_date: date | None = Field(default=None)
    status: PeriodStatus | None = Field(default=None)


class BillingPeriodResponse(BillingPeriodBase):
    id: uuid.UUID
    status: PeriodStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================================
# BillItem
# ============================================================

class BillItemBase(BaseModel):
    concept: str = Field(..., max_length=150, examples=["Administración"])
    description: str | None = Field(default=None, examples=["Cuota mensual"])
    amount: float = Field(..., examples=[250000.00])


class BillItemCreate(BillItemBase):
    pass


class BillItemResponse(BillItemBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================
# Bill
# ============================================================

class BillBase(BaseModel):
    property_id: uuid.UUID
    billing_period_id: uuid.UUID
    owner_id: uuid.UUID
    notes: str | None = Field(default=None)


class BillCreate(BillBase):
    """Crear factura con sus ítems."""
    items: list[BillItemCreate] = Field(..., min_length=1)


class BillUpdate(BaseModel):
    status: BillStatus | None = Field(default=None)
    notes: str | None = Field(default=None)
    paid_at: datetime | None = Field(default=None)


class BillResponse(BaseModel):
    id: uuid.UUID
    bill_number: str
    property_id: uuid.UUID
    billing_period_id: uuid.UUID
    owner_id: uuid.UUID
    total_amount: float
    status: BillStatus
    pdf_url: str | None
    notes: str | None
    sent_at: datetime | None
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[BillItemResponse] = []

    model_config = {"from_attributes": True}


class BillListResponse(BaseModel):
    items: list[BillResponse]
    total: int
    page: int
    page_size: int


# ============================================================
# NotificationLog
# ============================================================

class NotificationLogResponse(BaseModel):
    id: uuid.UUID
    bill_id: uuid.UUID
    channel: NotificationChannel
    recipient: str
    status: NotificationStatus
    error_message: str | None
    sent_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================
# Esquemas de Acción (Generar cobros masivos)
# ============================================================

class GenerateBillsRequest(BaseModel):
    """Request para generar cobros masivos de un periodo."""
    billing_period_id: uuid.UUID
    send_notifications: bool = Field(
        default=False,
        description="Si se envían las notificaciones inmediatamente después de generar",
    )


class GenerateBillsResponse(BaseModel):
    """Respuesta tras disparar la generación masiva."""
    task_id: str = Field(..., description="ID de la tarea de Celery para seguimiento")
    message: str
    bills_to_generate: int
