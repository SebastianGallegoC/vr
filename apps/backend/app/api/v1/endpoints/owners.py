"""
VegasDelRio - Endpoints: Propietarios (Owners).

CRUD completo para gestionar los propietarios del conjunto residencial.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.owner import Owner
from app.schemas.owner import (
    OwnerCreate,
    OwnerListResponse,
    OwnerResponse,
    OwnerUpdate,
)

router = APIRouter()


# ---- GET /owners ----
@router.get("", response_model=OwnerListResponse)
async def list_owners(
    page: int = Query(default=1, ge=1, description="Número de página"),
    page_size: int = Query(default=20, ge=1, le=100, description="Resultados por página"),
    search: str | None = Query(default=None, description="Buscar por nombre o documento"),
    is_active: bool | None = Query(default=None, description="Filtrar por estado activo"),
    db: AsyncSession = Depends(get_db),
):
    """Lista propietarios con paginación y filtros opcionales."""
    query = select(Owner)

    # Filtros
    if is_active is not None:
        query = query.where(Owner.is_active == is_active)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            Owner.full_name.ilike(search_term) | Owner.id_number.ilike(search_term)
        )

    # Conteo total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginación
    offset = (page - 1) * page_size
    query = query.order_by(Owner.full_name).offset(offset).limit(page_size)
    result = await db.execute(query)
    owners = result.scalars().all()

    return OwnerListResponse(
        items=[OwnerResponse.model_validate(o) for o in owners],
        total=total,
        page=page,
        page_size=page_size,
    )


# ---- GET /owners/{id} ----
@router.get("/{owner_id}", response_model=OwnerResponse)
async def get_owner(
    owner_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Obtiene un propietario por su ID."""
    result = await db.execute(select(Owner).where(Owner.id == owner_id))
    owner = result.scalar_one_or_none()
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Propietario no encontrado",
        )
    return OwnerResponse.model_validate(owner)


# ---- POST /owners ----
@router.post("", response_model=OwnerResponse, status_code=status.HTTP_201_CREATED)
async def create_owner(
    data: OwnerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Crea un nuevo propietario."""
    # Verificar documento duplicado
    existing = await db.execute(
        select(Owner).where(Owner.id_number == data.id_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un propietario con el documento {data.id_number}",
        )

    owner = Owner(**data.model_dump())
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return OwnerResponse.model_validate(owner)


# ---- PUT /owners/{id} ----
@router.put("/{owner_id}", response_model=OwnerResponse)
async def update_owner(
    owner_id: uuid.UUID,
    data: OwnerUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Actualiza un propietario existente."""
    result = await db.execute(select(Owner).where(Owner.id == owner_id))
    owner = result.scalar_one_or_none()
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Propietario no encontrado",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(owner, field, value)

    await db.commit()
    await db.refresh(owner)
    return OwnerResponse.model_validate(owner)


# ---- DELETE /owners/{id} ----
@router.delete("/{owner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_owner(
    owner_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Elimina (desactiva) un propietario."""
    result = await db.execute(select(Owner).where(Owner.id == owner_id))
    owner = result.scalar_one_or_none()
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Propietario no encontrado",
        )

    # Soft delete: marcar como inactivo en lugar de borrar
    owner.is_active = False
    await db.commit()
