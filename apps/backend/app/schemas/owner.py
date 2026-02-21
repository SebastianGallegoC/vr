"""
VegasDelRio - Esquemas Pydantic: Owner (Propietario).

Definen la validación de datos de entrada/salida para la API.
Separados del modelo SQLAlchemy para mantener la capa de transporte
independiente de la capa de persistencia.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ============================================================
# Base: campos compartidos entre crear y leer
# ============================================================

class OwnerBase(BaseModel):
    """Campos comunes de un propietario."""
    full_name: str = Field(..., min_length=2, max_length=200, examples=["Carlos Pérez"])
    id_type: str = Field(default="CC", max_length=20, examples=["CC", "CE", "NIT"])
    id_number: str = Field(..., min_length=3, max_length=30, examples=["1234567890"])
    email: str = Field(..., max_length=254, examples=["carlos@email.com"])
    phone: str | None = Field(default=None, max_length=20, examples=["+573001234567"])
    notes: str | None = Field(default=None, examples=["Propietario desde 2020"])


# ============================================================
# Create: para POST (crear nuevo propietario)
# ============================================================

class OwnerCreate(OwnerBase):
    """Esquema para crear un propietario."""
    pass


# ============================================================
# Update: para PUT/PATCH (todos los campos opcionales)
# ============================================================

class OwnerUpdate(BaseModel):
    """Esquema para actualizar un propietario (todos los campos opcionales)."""
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    id_type: str | None = Field(default=None, max_length=20)
    id_number: str | None = Field(default=None, min_length=3, max_length=30)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=20)
    notes: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)


# ============================================================
# Response: para leer la data desde la BD
# ============================================================

class OwnerResponse(OwnerBase):
    """Esquema de respuesta al consultar un propietario."""
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OwnerListResponse(BaseModel):
    """Respuesta paginada de propietarios."""
    items: list[OwnerResponse]
    total: int
    page: int
    page_size: int
