"""
VegasDelRio - Esquemas Pydantic: Property (Casa/Inmueble).
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.property_owner import CurrentOwnerInfo


# ============================================================
# Base
# ============================================================

class PropertyBase(BaseModel):
    """Campos comunes de una propiedad."""
    numero_casa: str = Field(..., min_length=1, max_length=20, examples=["1", "2A", "15"])
    direccion: str | None = Field(default=None, max_length=300, examples=["Manzana 3, Lote 5"])
    area_m2: float | None = Field(default=None, ge=0, examples=[120.50])
    alicuota: float | None = Field(default=None, ge=0, le=100, examples=[2.5])
    notas: str | None = Field(default=None)


# ============================================================
# Create / Update
# ============================================================

class PropertyCreate(PropertyBase):
    """Esquema para crear una propiedad."""
    pass


class PropertyUpdate(BaseModel):
    """Esquema para actualizar una propiedad (campos opcionales)."""
    numero_casa: str | None = Field(default=None, min_length=1, max_length=20)
    direccion: str | None = Field(default=None, max_length=300)
    area_m2: float | None = Field(default=None, ge=0)
    alicuota: float | None = Field(default=None, ge=0, le=100)
    notas: str | None = Field(default=None)
    activo: bool | None = Field(default=None)


# ============================================================
# Response
# ============================================================

class PropertyResponse(PropertyBase):
    """Esquema de respuesta al consultar una propiedad."""
    id: uuid.UUID
    activo: bool
    creado_en: datetime
    actualizado_en: datetime
    propietario_actual: Optional[CurrentOwnerInfo] = None

    model_config = {"from_attributes": True}


class PropertyListResponse(BaseModel):
    """Respuesta paginada de propiedades."""
    items: list[PropertyResponse]
    total: int
    page: int
    page_size: int
