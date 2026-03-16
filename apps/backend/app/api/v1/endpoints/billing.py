"""
VegasDelRio - Endpoints: Facturación (Billing).

Gestión de periodos de cobro, facturas y generación masiva.
"""

import asyncio
import base64
import hashlib
import logging
import uuid
from datetime import datetime, timezone

from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import get_settings
from app.db import get_db
from app.models.billing import (
    Bill,
    BillItem,
    BillingPeriod,
    BillStatus,
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
)
from app.models.email_config import EmailConfig
from app.models.owner import Owner
from app.models.property import Property
from app.models.property_owner import PropertyOwner
from app.schemas.billing import (
    BillingPeriodCreate,
    BillingPeriodResponse,
    BillingPeriodUpdate,
    BillCreate,
    BillListResponse,
    BillResponse,
    BillUpdate,
    DashboardStatsResponse,
    GenerateBillsRequest,
    GenerateBillsResponse,
    NotificationLogResponse,
    SendEmailsResponse,
)
from app.services.email_service import send_bill_email
from app.services.pdf_service import generate_bill_pdf
from app.services.billing_service import validate_bill_state_transition, apply_bill_status_side_effects

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()


def _enrich_bill_response(bill: Bill) -> BillResponse:
    """Convierte un Bill ORM (con relaciones cargadas) a BillResponse con datos embebidos."""
    resp = BillResponse.model_validate(bill)
    if bill.propiedad:
        resp.numero_casa = bill.propiedad.numero_casa
    if bill.propietario:
        resp.nombre_propietario = bill.propietario.nombre_completo
    if bill.periodo_facturacion:
        resp.periodo_descripcion = bill.periodo_facturacion.descripcion
    return resp


async def _get_gmail_tokens(db: AsyncSession) -> tuple[str | None, str | None]:
    """Obtiene los tokens de Gmail descifrados desde la BD. Retorna (access_token, refresh_token)."""
    try:
        result = await db.execute(select(EmailConfig).limit(1))
        cfg = result.scalar_one_or_none()
        if cfg and cfg.access_token_enc and cfg.refresh_token_enc:
            key = hashlib.sha256(settings.secret_key.encode()).digest()
            fernet = Fernet(base64.urlsafe_b64encode(key))
            return (
                fernet.decrypt(cfg.access_token_enc.encode()).decode(),
                fernet.decrypt(cfg.refresh_token_enc.encode()).decode(),
            )
    except Exception as e:
        logger.warning("No se pudieron obtener credenciales de Gmail: %s", e)
    return None, None


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
        BillingPeriod.anio.desc(), BillingPeriod.mes.desc()
    )
    if year:
        query = query.where(BillingPeriod.anio == year)

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
            BillingPeriod.mes == data.mes,
            BillingPeriod.anio == data.anio,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un periodo para {data.mes}/{data.anio}",
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
    query = select(Bill).options(
        selectinload(Bill.items),
        selectinload(Bill.propietario),
        selectinload(Bill.propiedad),
        selectinload(Bill.periodo_facturacion),
    )

    if period_id:
        query = query.where(Bill.periodo_facturacion_id == period_id)
    if bill_status:
        query = query.where(Bill.estado == bill_status)

    # Conteo total
    count_query = select(func.count()).select_from(
        select(Bill.id).where(
            *([Bill.periodo_facturacion_id == period_id] if period_id else []),
            *([Bill.estado == bill_status] if bill_status else []),
        ).subquery()
    )
    total = (await db.execute(count_query)).scalar_one()

    # Paginación
    offset = (page - 1) * page_size
    query = query.order_by(Bill.creado_en.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    bills = result.scalars().unique().all()

    return BillListResponse(
        items=[_enrich_bill_response(b) for b in bills],
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
        .options(
            selectinload(Bill.items),
            selectinload(Bill.notificaciones),
            selectinload(Bill.propietario),
            selectinload(Bill.propiedad),
            selectinload(Bill.periodo_facturacion),
        )
        .where(Bill.id == bill_id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return _enrich_bill_response(bill)


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

    update_data = data.model_dump(exclude_unset=True)

    # Validar transición de estado si se solicita cambio
    if "estado" in update_data:
        target = update_data["estado"]
        validate_bill_state_transition(bill.estado, target)
        apply_bill_status_side_effects(bill, target)

    for field, value in update_data.items():
        setattr(bill, field, value)

    await db.commit()
    await db.refresh(bill)
    return BillResponse.model_validate(bill)


# ============================================================
# Envío de Correos por Periodo
# ============================================================

@router.post(
    "/periods/{period_id}/send-emails",
    response_model=SendEmailsResponse,
)
async def send_period_emails(
    period_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Envía por email las facturas de un periodo a todos los propietarios.

    Para cada factura del periodo:
    1. Genera el PDF del recibo.
    2. Envía el correo al primer email del propietario.
    3. Registra la notificación en el historial.
    4. Actualiza el estado de la factura a 'pending'.
    """
    # Verificar que el periodo existe
    result = await db.execute(
        select(BillingPeriod).where(BillingPeriod.id == period_id)
    )
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")

    # Obtener todas las facturas del periodo con relaciones
    result = await db.execute(
        select(Bill)
        .options(
            selectinload(Bill.items),
            selectinload(Bill.propietario),
            selectinload(Bill.propiedad),
        )
        .where(Bill.periodo_facturacion_id == period_id)
    )
    bills = result.scalars().unique().all()

    if not bills:
        raise HTTPException(
            status_code=400,
            detail="No hay facturas generadas para este periodo. Primero genera los cobros.",
        )

    # Obtener credenciales de Gmail (fallback a SMTP/Resend si no hay cuenta vinculada)
    gmail_access_token, gmail_refresh_token = await _get_gmail_tokens(db)

    response = SendEmailsResponse(
        total_facturas=len(bills),
        emails_enviados=0,
        emails_fallidos=0,
        errores=[],
    )

    # Semáforo para limitar concurrencia (cubre PDF + email para evitar sobrecarga)
    sem = asyncio.Semaphore(5)

    async def _process_bill(bill: Bill) -> dict:
        """Genera PDF y envía email para una factura. Retorna resultado."""
        owner: Owner = bill.propietario
        prop: Property = bill.propiedad

        if not owner.correos or len(owner.correos) == 0:
            return {
                "bill": bill, "success": False, "skipped": True,
                "error": f"Casa {prop.numero_casa}: Propietario {owner.nombre_completo} sin correo.",
            }

        to_email = owner.correos[0]
        try:
            async with sem:
                bill_data = {
                    "bill_number": bill.numero_factura,
                    "generated_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
                    "owner_name": owner.nombre_completo,
                    "owner_id_type": owner.tipo_documento,
                    "owner_id_number": owner.numero_documento,
                    "owner_email": to_email,
                    "house_number": prop.numero_casa,
                    "period": period.descripcion,
                    "due_date": period.fecha_vencimiento.strftime("%d/%m/%Y"),
                    "items": [
                        {
                            "concept": item.concepto,
                            "description": item.descripcion or "",
                            "amount": float(item.monto),
                        }
                        for item in bill.items
                    ],
                    "total_amount": float(bill.monto_total),
                }
                pdf_bytes = await asyncio.to_thread(generate_bill_pdf, bill_data)

                success = await asyncio.to_thread(
                    send_bill_email,
                    to_email=to_email,
                    owner_name=owner.nombre_completo,
                    period_description=period.descripcion,
                    pdf_bytes=pdf_bytes,
                    gmail_access_token=gmail_access_token,
                    gmail_refresh_token=gmail_refresh_token,
                )

            return {
                "bill": bill, "success": success, "skipped": False,
                "to_email": to_email, "owner": owner, "prop": prop,
                "error": None if success else f"Casa {prop.numero_casa}: Error enviando email a {to_email}.",
            }
        except Exception as e:
            return {
                "bill": bill, "success": False, "skipped": False,
                "error": f"Casa {prop.numero_casa}: {str(e)}",
            }

    # Ejecutar todos los envíos en paralelo (limitados por semáforo)
    results = await asyncio.gather(*[_process_bill(b) for b in bills])

    # Actualizar DB con los resultados
    now = datetime.now(timezone.utc)
    for r in results:
        bill = r["bill"]
        if r["skipped"]:
            response.emails_fallidos += 1
            response.errores.append(r["error"])
            continue

        if r["success"]:
            log = NotificationLog(
                factura_id=bill.id,
                canal=NotificationChannel.EMAIL,
                destinatario=r["to_email"],
                estado=NotificationStatus.SENT,
                enviado_en=now,
            )
            db.add(log)
            bill.estado = BillStatus.PENDING
            bill.enviado_en = now
            response.emails_enviados += 1
        else:
            log = NotificationLog(
                factura_id=bill.id,
                canal=NotificationChannel.EMAIL,
                destinatario=r.get("to_email", ""),
                estado=NotificationStatus.FAILED,
                enviado_en=None,
            )
            db.add(log)
            response.emails_fallidos += 1
            if r["error"]:
                response.errores.append(r["error"])

    await db.commit()
    return response


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

    Para cada propiedad activa con propietario principal:
    1. Crea un registro Bill en estado 'draft'.
    2. Crea un BillItem con el concepto 'Administración' y el monto_base del periodo.
    3. Genera un número de factura secuencial (VDR-YYYY-MM-NNN).
    Omite propiedades que ya tengan factura para ese periodo.
    """
    # Verificar que el periodo existe y está abierto
    result = await db.execute(
        select(BillingPeriod).where(BillingPeriod.id == data.periodo_facturacion_id)
    )
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")
    if period.estado != "open":
        raise HTTPException(
            status_code=400,
            detail="El periodo no está abierto para generación de cobros",
        )

    # Obtener propiedades que ya tienen factura para este periodo
    existing_result = await db.execute(
        select(Bill.propiedad_id).where(
            Bill.periodo_facturacion_id == period.id
        )
    )
    existing_property_ids = set(existing_result.scalars().all())

    # Obtener todas las propiedades activas con su propietario principal actual
    props_result = await db.execute(
        select(Property)
        .where(Property.activo.is_(True))
        .order_by(Property.numero_casa)
    )
    properties = props_result.scalars().all()

    # Pre-cargar TODOS los propietarios principales activos en una sola query
    all_owners_result = await db.execute(
        select(PropertyOwner).where(
            PropertyOwner.es_principal.is_(True),
            PropertyOwner.fecha_fin.is_(None),
        )
    )
    owners_by_property: dict[uuid.UUID, PropertyOwner] = {
        po.propiedad_id: po for po in all_owners_result.scalars().all()
    }

    response = GenerateBillsResponse(
        facturas_generadas=0,
        facturas_omitidas=0,
        mensaje="",
        errores=[],
    )

    # Contar último número de factura para el periodo (para secuencia)
    last_bill_result = await db.execute(
        select(func.count()).select_from(Bill).where(
            Bill.periodo_facturacion_id == period.id
        )
    )
    bill_counter = last_bill_result.scalar_one() or 0

    for prop in properties:
        # Omitir si ya tiene factura
        if prop.id in existing_property_ids:
            response.facturas_omitidas += 1
            continue

        # Buscar propietario principal (desde el dict pre-cargado)
        po = owners_by_property.get(prop.id)

        if not po:
            response.errores.append(
                f"Casa {prop.numero_casa}: Sin propietario principal asignado."
            )
            continue

        # Generar número de factura
        bill_counter += 1
        numero_factura = (
            f"VDR-{period.anio}-{period.mes:02d}-{bill_counter:03d}"
        )

        # Crear la factura (UUID generado en Python, sin flush necesario)
        bill_id = uuid.uuid4()
        bill = Bill(
            id=bill_id,
            numero_factura=numero_factura,
            propiedad_id=prop.id,
            periodo_facturacion_id=period.id,
            propietario_id=po.propietario_id,
            monto_total=float(period.monto_base),
            estado=BillStatus.DRAFT,
        )
        db.add(bill)

        # Crear item de administración
        item = BillItem(
            factura_id=bill_id,
            concepto="Administración",
            descripcion=f"Cuota de administración {period.descripcion}",
            monto=float(period.monto_base),
        )
        db.add(item)

        response.facturas_generadas += 1

    await db.commit()

    total = response.facturas_generadas
    omitidas = response.facturas_omitidas
    errores_count = len(response.errores)
    parts = [f"{total} factura(s) generada(s) para: {period.descripcion}."]
    if omitidas > 0:
        parts.append(f"{omitidas} ya existían.")
    if errores_count > 0:
        parts.append(f"{errores_count} propiedad(es) sin propietario principal.")
    response.mensaje = " ".join(parts)

    return response


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
        .where(NotificationLog.factura_id == bill_id)
        .order_by(NotificationLog.creado_en.desc())
    )
    logs = result.scalars().all()
    return [NotificationLogResponse.model_validate(log) for log in logs]


# ============================================================
# Dashboard Stats
# ============================================================

@router.get("/dashboard-stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Retorna estadísticas resumidas para las tarjetas del dashboard (consulta única)."""
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year

    # Una sola query con subselects para las 4 métricas
    stats_query = select(
        select(func.count()).select_from(Property).where(Property.activo.is_(True)).correlate(None).scalar_subquery().label("total_props"),
        select(func.count()).select_from(Owner).where(Owner.activo.is_(True)).correlate(None).scalar_subquery().label("total_owners"),
        select(func.count()).select_from(Bill).join(
            BillingPeriod, Bill.periodo_facturacion_id == BillingPeriod.id
        ).where(
            BillingPeriod.mes == current_month, BillingPeriod.anio == current_year
        ).correlate(None).scalar_subquery().label("bills_month"),
        select(func.count()).select_from(Bill).where(
            Bill.estado.in_(["pending", "overdue"])
        ).correlate(None).scalar_subquery().label("bills_pending"),
    )
    row = (await db.execute(stats_query)).one()

    return DashboardStatsResponse(
        total_propiedades=row.total_props,
        total_propietarios_activos=row.total_owners,
        facturas_mes=row.bills_month,
        facturas_pendientes=row.bills_pending,
    )


