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
    mes: int = Field(..., ge=1, le=12, examples=[2])
    anio: int = Field(..., ge=2020, le=2100, examples=[2026])
    descripcion: str = Field(..., max_length=100, examples=["Febrero 2026"])
    monto_base: float = Field(..., gt=0, examples=[250000.00])
    fecha_vencimiento: date = Field(..., examples=["2026-02-28"])


class BillingPeriodCreate(BillingPeriodBase):
    pass


class BillingPeriodUpdate(BaseModel):
    descripcion: str | None = Field(default=None, max_length=100)
    monto_base: float | None = Field(default=None, gt=0)
    fecha_vencimiento: date | None = Field(default=None)
    estado: PeriodStatus | None = Field(default=None)


class BillingPeriodResponse(BillingPeriodBase):
    id: uuid.UUID
    estado: PeriodStatus
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


# ============================================================
# BillItem
# ============================================================

class BillItemBase(BaseModel):
    concepto: str = Field(..., max_length=150, examples=["Administración"])
    descripcion: str | None = Field(default=None, examples=["Cuota mensual"])
    monto: float = Field(..., examples=[250000.00])


class BillItemCreate(BillItemBase):
    pass


class BillItemResponse(BillItemBase):
    id: uuid.UUID
    creado_en: datetime

    model_config = {"from_attributes": True}


# ============================================================
# Bill
# ============================================================

class BillBase(BaseModel):
    propiedad_id: uuid.UUID
    periodo_facturacion_id: uuid.UUID
    propietario_id: uuid.UUID
    notas: str | None = Field(default=None)


class BillCreate(BillBase):
    """Crear factura con sus ítems."""
    items: list[BillItemCreate] = Field(..., min_length=1)


class BillUpdate(BaseModel):
    estado: BillStatus | None = Field(default=None)
    notas: str | None = Field(default=None)
    pagado_en: datetime | None = Field(default=None)


class BillResponse(BaseModel):
    id: uuid.UUID
    numero_factura: str
    propiedad_id: uuid.UUID
    periodo_facturacion_id: uuid.UUID
    propietario_id: uuid.UUID
    monto_total: float
    estado: BillStatus
    url_pdf: str | None
    notas: str | None
    enviado_en: datetime | None
    pagado_en: datetime | None
    creado_en: datetime
    actualizado_en: datetime
    items: list[BillItemResponse] = []

    # Campos extra para evitar lookups adicionales en frontend
    numero_casa: str | None = None
    nombre_propietario: str | None = None
    periodo_descripcion: str | None = None

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
    factura_id: uuid.UUID
    canal: NotificationChannel
    destinatario: str
    estado: NotificationStatus
    mensaje_error: str | None
    enviado_en: datetime | None
    creado_en: datetime

    model_config = {"from_attributes": True}


# ============================================================
# Esquemas de Acción (Generar cobros masivos)
# ============================================================

class GenerateBillsRequest(BaseModel):
    """Request para generar cobros masivos de un periodo."""
    periodo_facturacion_id: uuid.UUID
    enviar_notificaciones: bool = Field(
        default=False,
        description="Si se envían las notificaciones inmediatamente después de generar",
    )


class GenerateBillsResponse(BaseModel):
    """Respuesta tras generar cobros masivos."""
    facturas_generadas: int
    facturas_omitidas: int = 0
    mensaje: str
    errores: list[str] = []


class SendEmailsResponse(BaseModel):
    """Respuesta tras enviar correos de un periodo."""
    total_facturas: int
    emails_enviados: int
    emails_fallidos: int
    errores: list[str] = []


class DashboardStatsResponse(BaseModel):
    """Estadísticas resumidas para el dashboard."""
    total_propiedades: int
    total_propietarios_activos: int
    facturas_mes: int
    facturas_pendientes: int
