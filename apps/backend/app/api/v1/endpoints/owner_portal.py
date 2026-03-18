"""
VegasDelRio - Endpoints: Portal de Propietarios.

Portal público donde los propietarios pueden autenticarse con su
correo electrónico y número de casa para consultar su historial
de facturas.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentOwner, get_current_owner
from app.core.security import create_access_token
from app.db import get_db
from app.models.billing import Bill, BillingPeriod
from app.models.owner import Owner
from app.models.property import Property
from app.models.property_owner import PropertyOwner
from app.schemas.portal import (
    PortalBillResponse,
    PortalLoginRequest,
    PortalLoginResponse,
    PortalOwnerInfo,
    PortalProfileResponse,
    PortalPropertyInfo,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Mensaje genérico para no revelar qué campo falló.
_INVALID_CREDENTIALS = "Credenciales inválidas. Verifica tu correo y contraseña."


@router.post("/login", response_model=PortalLoginResponse)
async def portal_login(
    data: PortalLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Autentica a un propietario.

    - **email**: cualquiera de los correos registrados del propietario.
    - **password**: número de casa en formato manzana-número (ej: "6-21").
    """
    email_lower = data.email.strip().lower()
    password_trimmed = data.password.strip().lower()

    # 1. Buscar propietario que tenga este email en su array de correos
    result = await db.execute(
        select(Owner).where(
            Owner.activo.is_(True),
            Owner.correos.any(email_lower),
        )
    )
    owner = result.scalar_one_or_none()

    if not owner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_INVALID_CREDENTIALS,
        )

    # 2. Buscar la propiedad vinculada actualmente a este propietario
    result = await db.execute(
        select(Property)
        .join(PropertyOwner, PropertyOwner.propiedad_id == Property.id)
        .where(
            PropertyOwner.propietario_id == owner.id,
            PropertyOwner.fecha_fin.is_(None),  # vínculo activo
            Property.activo.is_(True),
        )
    )
    properties = result.scalars().all()

    # 3. Comparar el password con el numero_casa de alguna propiedad vinculada
    matched_property: Property | None = None
    for prop in properties:
        if prop.numero_casa.strip().lower() == password_trimmed:
            matched_property = prop
            break

    if not matched_property:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_INVALID_CREDENTIALS,
        )

    # 4. Generar JWT con role=owner y property_id en el payload
    token = create_access_token(
        data={
            "sub": str(owner.id),
            "property_id": str(matched_property.id),
            "email": email_lower,
            "role": "owner",
        }
    )

    return PortalLoginResponse(
        access_token=token,
        propietario=PortalOwnerInfo(
            id=owner.id,
            nombre_completo=owner.nombre_completo,
            email=email_lower,
        ),
        propiedad=PortalPropertyInfo(
            id=matched_property.id,
            numero_casa=matched_property.numero_casa,
        ),
    )


@router.get("/profile", response_model=PortalProfileResponse)
async def portal_profile(
    current: CurrentOwner = Depends(get_current_owner),
    db: AsyncSession = Depends(get_db),
):
    """Retorna los datos del propietario y su propiedad."""
    owner = await db.get(Owner, uuid.UUID(current.owner_id))
    prop = await db.get(Property, uuid.UUID(current.property_id))

    if not owner or not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Propietario o propiedad no encontrados.",
        )

    return PortalProfileResponse(
        propietario=PortalOwnerInfo(
            id=owner.id,
            nombre_completo=owner.nombre_completo,
            email=current.email,
        ),
        propiedad=PortalPropertyInfo(
            id=prop.id,
            numero_casa=prop.numero_casa,
        ),
    )


@router.get("/bills", response_model=list[PortalBillResponse])
async def portal_bills(
    current: CurrentOwner = Depends(get_current_owner),
    db: AsyncSession = Depends(get_db),
):
    """Lista las facturas de la propiedad del propietario autenticado."""
    property_id = uuid.UUID(current.property_id)

    result = await db.execute(
        select(Bill)
        .where(Bill.propiedad_id == property_id)
        .options(
            selectinload(Bill.items),
            selectinload(Bill.periodo_facturacion),
        )
        .order_by(Bill.creado_en.desc())
    )
    bills = result.scalars().all()

    response: list[PortalBillResponse] = []
    for bill in bills:
        resp = PortalBillResponse.model_validate(bill)
        if bill.periodo_facturacion:
            resp.periodo_descripcion = bill.periodo_facturacion.descripcion
        response.append(resp)

    return response
