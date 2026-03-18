"""
VegasDelRio - Schemas: Portal de Propietarios.

Schemas para el login y respuestas del portal público de propietarios,
donde pueden consultar su historial de facturas.
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.billing import BillStatus


# ============================================================
# Login
# ============================================================

class PortalLoginRequest(BaseModel):
    email: EmailStr = Field(..., examples=["propietario@email.com"])
    password: str = Field(..., min_length=1, examples=["6-21"])


class PortalOwnerInfo(BaseModel):
    id: uuid.UUID
    nombre_completo: str
    email: str

    model_config = {"from_attributes": True}


class PortalPropertyInfo(BaseModel):
    id: uuid.UUID
    numero_casa: str

    model_config = {"from_attributes": True}


class PortalLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    propietario: PortalOwnerInfo
    propiedad: PortalPropertyInfo


# ============================================================
# Perfil
# ============================================================

class PortalProfileResponse(BaseModel):
    propietario: PortalOwnerInfo
    propiedad: PortalPropertyInfo


# ============================================================
# Facturas del portal
# ============================================================

class PortalBillItemResponse(BaseModel):
    concepto: str
    descripcion: str | None
    monto: float

    model_config = {"from_attributes": True}


class PortalBillResponse(BaseModel):
    id: uuid.UUID
    numero_factura: str
    monto_total: float
    estado: BillStatus
    notas: str | None
    pagado_en: datetime | None
    creado_en: datetime
    periodo_descripcion: str | None = None
    items: list[PortalBillItemResponse] = []

    model_config = {"from_attributes": True}
