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
    nombre_completo: str = Field(..., min_length=2, max_length=200, examples=["Carlos Pérez"])
    tipo_documento: str = Field(default="CC", max_length=20, examples=["CC", "CE", "NIT"])
    numero_documento: str = Field(..., min_length=3, max_length=30, examples=["1234567890"])
    correos: list[str] = Field(..., min_length=1, examples=[["carlos@email.com"]])
    telefonos: list[str] = Field(default_factory=list, examples=[["+573001234567"]])
    notas: str | None = Field(default=None, examples=["Propietario desde 2020"])


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
    nombre_completo: str | None = Field(default=None, min_length=2, max_length=200)
    tipo_documento: str | None = Field(default=None, max_length=20)
    numero_documento: str | None = Field(default=None, min_length=3, max_length=30)
    correos: list[str] | None = Field(default=None, min_length=1)
    telefonos: list[str] | None = Field(default=None)
    notas: str | None = Field(default=None)
    activo: bool | None = Field(default=None)


class CurrentPropertyInfo(BaseModel):
    """Casa actualmente asignada al propietario (si existe)."""
    propiedad_id: uuid.UUID
    numero_casa: str


# ============================================================
# Response: para leer la data desde la BD
# ============================================================

class OwnerResponse(OwnerBase):
    """Esquema de respuesta al consultar un propietario."""
    id: uuid.UUID
    activo: bool
    creado_en: datetime
    actualizado_en: datetime
    casa_actual: CurrentPropertyInfo | None = None

    model_config = {"from_attributes": True}


class OwnerListResponse(BaseModel):
    """Respuesta paginada de propietarios."""
    items: list[OwnerResponse]
    total: int
    page: int
    page_size: int
