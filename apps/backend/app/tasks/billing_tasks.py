"""
VegasDelRio - Tareas de Celery: Facturación.

Tareas asíncronas para la generación masiva de PDFs y envío de correos.
Estas tareas se ejecutan en segundo plano sin bloquear la API.
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, joinedload

from app.core import get_settings
from app.models import (
    Bill, BillItem, BillingPeriod, Property, PropertyOwner, Owner,
    BillStatus, NotificationLog, NotificationChannel, NotificationStatus,
)
from app.services.pdf_service import generate_bill_pdf
from app.services.email_service import send_bill_email
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# Engine síncrono singleton — reutilizado entre invocaciones de tareas.
_sync_engine = None


def _get_sync_engine():
    global _sync_engine
    if _sync_engine is None:
        settings = get_settings()
        _sync_engine = create_engine(
            settings.database_url_direct,
            pool_pre_ping=True,
            pool_size=3,
            max_overflow=5,
        )
    return _sync_engine


@celery_app.task(bind=True, name="billing.generate_period_bills")
def generate_period_bills(
    self,
    billing_period_id: str,
    send_notifications: bool = False,
) -> dict:
    """
    Tarea: Genera facturas para todas las casas activas de un periodo.

    Flujo:
    1. Consulta todas las casas activas con su propietario principal (una sola query).
    2. Crea un registro Bill + BillItems para cada casa.
    3. Genera el PDF del recibo.
    4. (Opcional) Envía el correo con el PDF adjunto.
    """
    engine = _get_sync_engine()

    results = {
        "period_id": billing_period_id,
        "bills_generated": 0,
        "pdfs_created": 0,
        "emails_sent": 0,
        "errors": [],
    }

    with Session(engine) as db:
        # 1. Obtener el periodo
        period = db.execute(
            select(BillingPeriod).where(BillingPeriod.id == billing_period_id)
        ).scalar_one_or_none()
        if not period:
            results["errors"].append("Periodo no encontrado")
            return results

        # 2. Obtener asignaciones activas con joinedload (elimina N+1)
        stmt = (
            select(PropertyOwner)
            .join(Property, PropertyOwner.propiedad_id == Property.id)
            .join(Owner, PropertyOwner.propietario_id == Owner.id)
            .options(
                joinedload(PropertyOwner.propiedad),
                joinedload(PropertyOwner.propietario),
            )
            .where(
                Property.activo.is_(True),
                Owner.activo.is_(True),
                PropertyOwner.es_principal.is_(True),
                PropertyOwner.fecha_fin.is_(None),
            )
        )
        active_assignments = db.execute(stmt).unique().scalars().all()

        # 3. Pre-cargar propiedades que ya tienen factura para este periodo
        existing_property_ids = set(
            db.execute(
                select(Bill.propiedad_id).where(
                    Bill.periodo_facturacion_id == period.id
                )
            ).scalars().all()
        )

        total = len(active_assignments)
        bill_counter = len(existing_property_ids)

        for i, assignment in enumerate(active_assignments):
            try:
                prop = assignment.propiedad
                owner = assignment.propietario

                # Omitir si ya tiene factura
                if prop.id in existing_property_ids:
                    continue

                # 4. Crear factura
                bill_counter += 1
                numero_factura = (
                    f"VDR-{period.anio}-{period.mes:02d}-"
                    f"{prop.numero_casa.zfill(3)}"
                )
                bill_id = uuid.uuid4()
                bill = Bill(
                    id=bill_id,
                    numero_factura=numero_factura,
                    propiedad_id=prop.id,
                    periodo_facturacion_id=period.id,
                    propietario_id=owner.id,
                    monto_total=float(period.monto_base),
                    estado=BillStatus.DRAFT,
                )
                db.add(bill)

                # 5. Crear item de administración
                item = BillItem(
                    factura_id=bill_id,
                    concepto="Administración",
                    descripcion=f"Cuota de administración - {period.descripcion}",
                    monto=float(period.monto_base),
                )
                db.add(item)
                results["bills_generated"] += 1

                # 6. Generar PDF
                try:
                    to_email = owner.correos[0] if owner.correos else None
                    bill_data = {
                        "bill_number": numero_factura,
                        "generated_date": datetime.now(timezone.utc).strftime(
                            "%d/%m/%Y"
                        ),
                        "owner_name": owner.nombre_completo,
                        "owner_id_type": owner.tipo_documento,
                        "owner_id_number": owner.numero_documento,
                        "owner_email": to_email or "",
                        "house_number": prop.numero_casa,
                        "period": period.descripcion,
                        "due_date": period.fecha_vencimiento.strftime("%d/%m/%Y"),
                        "items": [
                            {
                                "concept": "Administración",
                                "description": f"Cuota - {period.descripcion}",
                                "amount": float(period.monto_base),
                            }
                        ],
                        "total_amount": float(period.monto_base),
                    }
                    pdf_bytes = generate_bill_pdf(bill_data)
                    results["pdfs_created"] += 1

                    # 7. Enviar email si se solicita
                    if send_notifications and to_email:
                        success = send_bill_email(
                            to_email=to_email,
                            owner_name=owner.nombre_completo,
                            period_description=period.descripcion,
                            pdf_bytes=pdf_bytes,
                        )

                        log = NotificationLog(
                            factura_id=bill_id,
                            canal=NotificationChannel.EMAIL,
                            destinatario=to_email,
                            estado=(
                                NotificationStatus.SENT
                                if success
                                else NotificationStatus.FAILED
                            ),
                            enviado_en=datetime.now(timezone.utc) if success else None,
                        )
                        db.add(log)

                        if success:
                            bill.estado = BillStatus.PENDING
                            bill.enviado_en = datetime.now(timezone.utc)
                            results["emails_sent"] += 1

                except Exception as pdf_err:
                    logger.exception("Error PDF/Email Casa %s", prop.numero_casa)
                    results["errors"].append(
                        f"Casa {prop.numero_casa}: Error PDF/Email - {str(pdf_err)}"
                    )

                # Actualizar progreso de la tarea
                self.update_state(
                    state="PROGRESS",
                    meta={"current": i + 1, "total": total},
                )

            except Exception as e:
                logger.exception("Error procesando asignación %s", assignment.propiedad_id)
                results["errors"].append(
                    f"Casa {assignment.propiedad_id}: {str(e)}"
                )

        db.commit()

    return results


@celery_app.task(name="billing.send_bill_notification")
def send_bill_notification(bill_id: str, channel: str = "email") -> dict:
    """
    Tarea: Envía la notificación de una factura individual.

    Útil para reenviar un cobro específico sin regenerar todo el periodo.
    """
    # TODO: Implementar cuando se necesite reenvío individual
    return {"bill_id": bill_id, "channel": channel, "status": "not_implemented"}


@celery_app.task(name="system.ping")
def ping() -> str:
    """Tarea de prueba para verificar que Celery funciona correctamente."""
    return "pong 🏓"
