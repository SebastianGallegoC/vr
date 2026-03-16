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
from app.models.property import Property
from app.models.property_owner import PropertyOwner
from app.schemas.owner import (
    CurrentPropertyInfo,
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
    activo: bool | None = Query(default=None, description="Filtrar por estado activo"),
    sin_propiedad: bool | None = Query(default=None, description="Filtrar propietarios sin casa asignada actualmente"),
    db: AsyncSession = Depends(get_db),
):
    """Lista propietarios con paginación y filtros opcionales."""
    query = select(Owner)

    # Filtros
    if activo is not None:
        query = query.where(Owner.activo == activo)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            Owner.nombre_completo.ilike(search_term) | Owner.numero_documento.ilike(search_term)
        )
    if sin_propiedad is True:
        # Propietarios que NO tienen relación activa (fecha_fin IS NULL)
        active_owner_ids = (
            select(PropertyOwner.propietario_id)
            .where(PropertyOwner.fecha_fin.is_(None))
        )
        query = query.where(~Owner.id.in_(active_owner_ids))

    # Conteo total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginación
    offset = (page - 1) * page_size
    query = query.order_by(Owner.nombre_completo).offset(offset).limit(page_size)
    result = await db.execute(query)
    owners = result.scalars().all()

    owner_ids = [o.id for o in owners]
    casas_por_propietario: dict[uuid.UUID, CurrentPropertyInfo] = {}
    if owner_ids:
        assigned_result = await db.execute(
            select(
                PropertyOwner.propietario_id,
                Property.id,
                Property.numero_casa,
            )
            .join(Property, Property.id == PropertyOwner.propiedad_id)
            .where(
                PropertyOwner.fecha_fin.is_(None),
                PropertyOwner.propietario_id.in_(owner_ids),
            )
        )
        for propietario_id, propiedad_id, numero_casa in assigned_result.all():
            if propietario_id not in casas_por_propietario:
                casas_por_propietario[propietario_id] = CurrentPropertyInfo(
                    propiedad_id=propiedad_id,
                    numero_casa=numero_casa,
                )

    items = [
        OwnerResponse.model_validate(o).model_copy(
            update={"casa_actual": casas_por_propietario.get(o.id)}
        )
        for o in owners
    ]

    return OwnerListResponse(
        items=items,
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

    assigned = await db.execute(
        select(
            Property.id,
            Property.numero_casa,
        )
        .join(PropertyOwner, Property.id == PropertyOwner.propiedad_id)
        .where(
            PropertyOwner.propietario_id == owner_id,
            PropertyOwner.fecha_fin.is_(None),
        )
        .limit(1)
    )
    row = assigned.first()
    casa_actual = (
        CurrentPropertyInfo(propiedad_id=row[0], numero_casa=row[1]) if row else None
    )

    return OwnerResponse.model_validate(owner).model_copy(
        update={"casa_actual": casa_actual}
    )


# ---- POST /owners ----
@router.post("", response_model=OwnerResponse, status_code=status.HTTP_201_CREATED)
async def create_owner(
    data: OwnerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Crea un nuevo propietario."""
    # Verificar documento duplicado
    existing = await db.execute(
        select(Owner).where(Owner.numero_documento == data.numero_documento)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un propietario con el documento {data.numero_documento}",
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
    owner.activo = False
    await db.commit()
