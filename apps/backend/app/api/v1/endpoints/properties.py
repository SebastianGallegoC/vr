"""
VegasDelRio - Endpoints: Propiedades (Casas).

CRUD completo para gestionar las casas del conjunto residencial.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.property import Property
from app.models.property_owner import PropertyOwner
from app.models.owner import Owner
from app.schemas.property import (
    PropertyCreate,
    PropertyListResponse,
    PropertyResponse,
    PropertyUpdate,
)
from app.schemas.property_owner import (
    AssignOwnerRequest,
    CurrentOwnerInfo,
    PropertyOwnerResponse,
)

router = APIRouter()


# ---- GET /properties ----
@router.get("", response_model=PropertyListResponse)
async def list_properties(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, description="Buscar por número de casa"),
    activo: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Lista casas con paginación y filtros opcionales."""
    filters = []
    if activo is not None:
        filters.append(Property.activo == activo)
    if search:
        filters.append(Property.numero_casa.ilike(f"%{search}%"))

    # Conteo total (reutiliza los mismos filtros, sin duplicar condiciones)
    count_query = select(func.count()).select_from(
        select(Property.id).where(*filters).subquery()
    )
    total = (await db.execute(count_query)).scalar_one()

    # Query principal con relaciones
    query = (
        select(Property)
        .options(
            selectinload(Property.propiedad_propietarios).selectinload(PropertyOwner.propietario)
        )
        .where(*filters)
    )

    # Paginación
    offset = (page - 1) * page_size
    query = query.order_by(Property.numero_casa).offset(offset).limit(page_size)
    result = await db.execute(query)
    properties = result.scalars().unique().all()

    items = []
    for p in properties:
        resp = PropertyResponse.model_validate(p)
        # Buscar propietario principal actual
        current_po = next(
            (po for po in p.propiedad_propietarios
             if po.es_principal and po.fecha_fin is None),
            None,
        )
        if current_po and current_po.propietario:
            resp.propietario_actual = CurrentOwnerInfo(
                propietario_id=current_po.propietario_id,
                nombre_completo=current_po.propietario.nombre_completo,
                numero_documento=current_po.propietario.numero_documento,
            )
        items.append(resp)

    return PropertyListResponse(
        items=items,
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
        select(Property).where(Property.numero_casa == data.numero_casa)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una propiedad con el número '{data.numero_casa}'",
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

    prop.activo = False
    await db.commit()


# ============================================================
# Propietario de una Casa
# ============================================================

@router.get("/{property_id}/owner", response_model=PropertyOwnerResponse | None)
async def get_property_owner(
    property_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Obtiene el propietario principal actual de una casa."""
    result = await db.execute(
        select(PropertyOwner)
        .options(selectinload(PropertyOwner.propietario))
        .where(
            PropertyOwner.propiedad_id == property_id,
            PropertyOwner.es_principal.is_(True),
            PropertyOwner.fecha_fin.is_(None),
        )
    )
    po = result.scalar_one_or_none()
    if not po:
        return None

    return PropertyOwnerResponse(
        id=po.id,
        propiedad_id=po.propiedad_id,
        propietario_id=po.propietario_id,
        es_principal=po.es_principal,
        fecha_inicio=po.fecha_inicio,
        fecha_fin=po.fecha_fin,
        creado_en=po.creado_en,
        propietario_nombre=po.propietario.nombre_completo,
        propietario_documento=po.propietario.numero_documento,
    )


@router.post(
    "/{property_id}/owner",
    response_model=PropertyOwnerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def assign_property_owner(
    property_id: uuid.UUID,
    data: AssignOwnerRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Asigna un propietario principal a una casa.

    Si la casa ya tiene un propietario principal, cierra la relación
    anterior (fecha_fin = hoy) y crea una nueva.
    """
    # Verificar que la propiedad existe
    prop_result = await db.execute(
        select(Property).where(Property.id == property_id)
    )
    if not prop_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")

    # Verificar que el propietario existe
    owner_result = await db.execute(
        select(Owner).where(Owner.id == data.propietario_id)
    )
    owner = owner_result.scalar_one_or_none()
    if not owner:
        raise HTTPException(status_code=404, detail="Propietario no encontrado")

    today = datetime.now(timezone.utc).date()

    # Cerrar relación anterior si existe
    current_result = await db.execute(
        select(PropertyOwner).where(
            PropertyOwner.propiedad_id == property_id,
            PropertyOwner.es_principal.is_(True),
            PropertyOwner.fecha_fin.is_(None),
        )
    )
    current_po = current_result.scalar_one_or_none()
    if current_po:
        if current_po.propietario_id == data.propietario_id:
            raise HTTPException(
                status_code=400,
                detail="Este propietario ya está asignado como principal a esta casa.",
            )
        current_po.fecha_fin = today

    # Crear nueva relación
    new_po = PropertyOwner(
        propiedad_id=property_id,
        propietario_id=data.propietario_id,
        es_principal=True,
        fecha_inicio=today,
    )
    db.add(new_po)
    await db.commit()
    await db.refresh(new_po)

    return PropertyOwnerResponse(
        id=new_po.id,
        propiedad_id=new_po.propiedad_id,
        propietario_id=new_po.propietario_id,
        es_principal=new_po.es_principal,
        fecha_inicio=new_po.fecha_inicio,
        fecha_fin=new_po.fecha_fin,
        creado_en=new_po.creado_en,
        propietario_nombre=owner.nombre_completo,
        propietario_documento=owner.numero_documento,
    )


@router.delete("/{property_id}/owner", status_code=status.HTTP_204_NO_CONTENT)
async def remove_property_owner(
    property_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Desasocia el propietario principal actual de una casa."""
    result = await db.execute(
        select(PropertyOwner).where(
            PropertyOwner.propiedad_id == property_id,
            PropertyOwner.es_principal.is_(True),
            PropertyOwner.fecha_fin.is_(None),
        )
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(
            status_code=404,
            detail="No hay propietario principal asignado a esta casa.",
        )

    po.fecha_fin = datetime.now(timezone.utc).date()
    await db.commit()
