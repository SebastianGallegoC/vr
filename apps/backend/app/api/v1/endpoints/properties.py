"""
VegasDelRio - Endpoints: Propiedades (Casas).

CRUD completo para gestionar las casas del conjunto residencial.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.property import Property
from app.schemas.property import (
    PropertyCreate,
    PropertyListResponse,
    PropertyResponse,
    PropertyUpdate,
)

router = APIRouter()


# ---- GET /properties ----
@router.get("", response_model=PropertyListResponse)
async def list_properties(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, description="Buscar por número de casa"),
    is_active: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Lista casas con paginación y filtros opcionales."""
    query = select(Property)

    if is_active is not None:
        query = query.where(Property.is_active == is_active)
    if search:
        query = query.where(Property.house_number.ilike(f"%{search}%"))

    # Conteo total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Paginación
    offset = (page - 1) * page_size
    query = query.order_by(Property.house_number).offset(offset).limit(page_size)
    result = await db.execute(query)
    properties = result.scalars().all()

    return PropertyListResponse(
        items=[PropertyResponse.model_validate(p) for p in properties],
        total=total,
        page=page,
        page_size=page_size,
    )


# ---- GET /properties/{id} ----
@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(
    property_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Obtiene una propiedad por su ID."""
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Propiedad no encontrada",
        )
    return PropertyResponse.model_validate(prop)


# ---- POST /properties ----
@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    data: PropertyCreate,
    db: AsyncSession = Depends(get_db),
):
    """Crea una nueva propiedad (casa)."""
    # Verificar número de casa duplicado
    existing = await db.execute(
        select(Property).where(Property.house_number == data.house_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una propiedad con el número '{data.house_number}'",
        )

    prop = Property(**data.model_dump())
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    return PropertyResponse.model_validate(prop)


# ---- PUT /properties/{id} ----
@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: uuid.UUID,
    data: PropertyUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Actualiza una propiedad existente."""
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Propiedad no encontrada",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prop, field, value)

    await db.commit()
    await db.refresh(prop)
    return PropertyResponse.model_validate(prop)


# ---- DELETE /properties/{id} ----
@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Desactiva una propiedad (soft delete)."""
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Propiedad no encontrada",
        )

    prop.is_active = False
    await db.commit()
