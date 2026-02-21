"""
VegasDelRio - Esquemas Pydantic: Property (Casa/Inmueble).
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ============================================================
# Base
# ============================================================

class PropertyBase(BaseModel):
    """Campos comunes de una propiedad."""
    house_number: str = Field(..., min_length=1, max_length=20, examples=["1", "2A", "15"])
    address: str | None = Field(default=None, max_length=300, examples=["Manzana 3, Lote 5"])
    area_m2: float | None = Field(default=None, ge=0, examples=[120.50])
    aliquot: float | None = Field(default=None, ge=0, le=100, examples=[2.5])
    notes: str | None = Field(default=None)


# ============================================================
# Create / Update
# ============================================================

class PropertyCreate(PropertyBase):
    """Esquema para crear una propiedad."""
    pass


class PropertyUpdate(BaseModel):
    """Esquema para actualizar una propiedad (campos opcionales)."""
    house_number: str | None = Field(default=None, min_length=1, max_length=20)
    address: str | None = Field(default=None, max_length=300)
    area_m2: float | None = Field(default=None, ge=0)
    aliquot: float | None = Field(default=None, ge=0, le=100)
    notes: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)


# ============================================================
# Response
# ============================================================

class PropertyResponse(PropertyBase):
    """Esquema de respuesta al consultar una propiedad."""
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PropertyListResponse(BaseModel):
    """Respuesta paginada de propiedades."""
    items: list[PropertyResponse]
    total: int
    page: int
    page_size: int
