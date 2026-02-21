"""
VegasDelRio - Endpoints: Facturación (Billing).

Gestión de periodos de cobro, facturas y generación masiva.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.billing import Bill, BillingPeriod, NotificationLog
from app.schemas.billing import (
    BillingPeriodCreate,
    BillingPeriodResponse,
    BillingPeriodUpdate,
    BillCreate,
    BillListResponse,
    BillResponse,
    BillUpdate,
    GenerateBillsRequest,
    GenerateBillsResponse,
    NotificationLogResponse,
)

router = APIRouter()


# ============================================================
# Periodos de Facturación
# ============================================================

@router.get("/periods", response_model=list[BillingPeriodResponse])
async def list_periods(
    year: int | None = Query(default=None, description="Filtrar por año"),
    db: AsyncSession = Depends(get_db),
):
    """Lista todos los periodos de facturación."""
    query = select(BillingPeriod).order_by(
        BillingPeriod.year.desc(), BillingPeriod.month.desc()
    )
    if year:
        query = query.where(BillingPeriod.year == year)

    result = await db.execute(query)
    periods = result.scalars().all()
    return [BillingPeriodResponse.model_validate(p) for p in periods]


@router.post(
    "/periods",
    response_model=BillingPeriodResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_period(
    data: BillingPeriodCreate,
    db: AsyncSession = Depends(get_db),
):
    """Crea un nuevo periodo de facturación."""
    # Verificar periodo duplicado
    existing = await db.execute(
        select(BillingPeriod).where(
            BillingPeriod.month == data.month,
            BillingPeriod.year == data.year,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un periodo para {data.month}/{data.year}",
        )

    period = BillingPeriod(**data.model_dump())
    db.add(period)
    await db.commit()
    await db.refresh(period)
    return BillingPeriodResponse.model_validate(period)


@router.put("/periods/{period_id}", response_model=BillingPeriodResponse)
async def update_period(
    period_id: uuid.UUID,
    data: BillingPeriodUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Actualiza un periodo de facturación."""
    result = await db.execute(
        select(BillingPeriod).where(BillingPeriod.id == period_id)
    )
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(period, field, value)

    await db.commit()
    await db.refresh(period)
    return BillingPeriodResponse.model_validate(period)


# ============================================================
# Facturas (Bills)
# ============================================================

@router.get("/bills", response_model=BillListResponse)
async def list_bills(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    period_id: uuid.UUID | None = Query(default=None, description="Filtrar por periodo"),
    bill_status: str | None = Query(default=None, alias="status", description="Filtrar por estado"),
    db: AsyncSession = Depends(get_db),
):
    """Lista facturas con paginación y filtros."""
    query = select(Bill).options(selectinload(Bill.items))

    if period_id:
        query = query.where(Bill.billing_period_id == period_id)
    if bill_status:
        query = query.where(Bill.status == bill_status)

    # Conteo total
    count_query = select(func.count()).select_from(
        select(Bill.id).where(
            *([Bill.billing_period_id == period_id] if period_id else []),
            *([Bill.status == bill_status] if bill_status else []),
        ).subquery()
    )
    total = (await db.execute(count_query)).scalar_one()

    # Paginación
    offset = (page - 1) * page_size
    query = query.order_by(Bill.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    bills = result.scalars().unique().all()

    return BillListResponse(
        items=[BillResponse.model_validate(b) for b in bills],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/bills/{bill_id}", response_model=BillResponse)
async def get_bill(
    bill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Obtiene una factura con sus items."""
    result = await db.execute(
        select(Bill)
        .options(selectinload(Bill.items), selectinload(Bill.notifications))
        .where(Bill.id == bill_id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return BillResponse.model_validate(bill)


@router.put("/bills/{bill_id}", response_model=BillResponse)
async def update_bill(
    bill_id: uuid.UUID,
    data: BillUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Actualiza el estado de una factura."""
    result = await db.execute(
        select(Bill).options(selectinload(Bill.items)).where(Bill.id == bill_id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(bill, field, value)

    await db.commit()
    await db.refresh(bill)
    return BillResponse.model_validate(bill)


# ============================================================
# Generación Masiva
# ============================================================

@router.post("/generate", response_model=GenerateBillsResponse)
async def generate_bills(
    data: GenerateBillsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Genera facturas masivas para todas las casas activas de un periodo.

    Dispara una tarea de Celery que:
    1. Crea registros Bill + BillItems en la BD.
    2. Genera el PDF con WeasyPrint.
    3. (Opcional) Envía notificaciones por email.
    """
    # Verificar que el periodo existe y está abierto
    result = await db.execute(
        select(BillingPeriod).where(BillingPeriod.id == data.billing_period_id)
    )
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")
    if period.status != "open":
        raise HTTPException(
            status_code=400,
            detail="El periodo no está abierto para generación de cobros",
        )

    # TODO: Disparar tarea de Celery cuando esté configurado
    # from app.tasks.billing_tasks import generate_period_bills
    # task = generate_period_bills.delay(str(data.billing_period_id), data.send_notifications)

    return GenerateBillsResponse(
        task_id="pending-celery-setup",
        message=f"Generación de cobros programada para: {period.description}",
        bills_to_generate=0,  # Se calculará en la tarea
    )


# ============================================================
# Notificaciones
# ============================================================

@router.get(
    "/bills/{bill_id}/notifications",
    response_model=list[NotificationLogResponse],
)
async def get_bill_notifications(
    bill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Lista el historial de notificaciones de una factura."""
    result = await db.execute(
        select(NotificationLog)
        .where(NotificationLog.bill_id == bill_id)
        .order_by(NotificationLog.created_at.desc())
    )
    logs = result.scalars().all()
    return [NotificationLogResponse.model_validate(log) for log in logs]
