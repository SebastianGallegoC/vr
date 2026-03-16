"""
VegasDelRio - Esquemas Pydantic: PropertyOwner (Relación Casa ↔ Propietario).
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class AssignOwnerRequest(BaseModel):
    """Request para asignar un propietario a una casa."""
    propietario_id: uuid.UUID


class PropertyOwnerResponse(BaseModel):
    """Datos de la relación propiedad-propietario con info del propietario."""
    id: uuid.UUID
    propiedad_id: uuid.UUID
    propietario_id: uuid.UUID
    es_principal: bool
    fecha_inicio: date
    fecha_fin: date | None
    creado_en: datetime

    # Datos embebidos del propietario
    propietario_nombre: str
    propietario_documento: str

    model_config = {"from_attributes": True}


class CurrentOwnerInfo(BaseModel):
    """Resumen del propietario actual para incluir en PropertyResponse."""
    propietario_id: uuid.UUID
    nombre_completo: str
    numero_documento: str
