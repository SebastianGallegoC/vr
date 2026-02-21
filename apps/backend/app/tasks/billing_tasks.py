"""
VegasDelRio - Tareas de Celery: Facturación.

Tareas asíncronas para la generación masiva de PDFs y envío de correos.
Estas tareas se ejecutan en segundo plano sin bloquear la API.
"""

from datetime import datetime, timezone

from app.tasks.celery_app import celery_app


@celery_app.task(bind=True, name="billing.generate_period_bills")
def generate_period_bills(
    self,
    billing_period_id: str,
    send_notifications: bool = False,
) -> dict:
    """
    Tarea: Genera facturas para todas las casas activas de un periodo.

    Flujo:
    1. Consulta todas las casas activas con su propietario principal.
    2. Crea un registro Bill + BillItems para cada casa.
    3. Genera el PDF del recibo con WeasyPrint.
    4. (Opcional) Envía el correo con el PDF adjunto.

    Args:
        billing_period_id: UUID del periodo como string.
        send_notifications: Si debe enviar emails tras generar.

    Returns:
        dict con resumen de la operación.
    """
    # Nota: Las tareas de Celery son síncronas, usamos conexión directa
    # en lugar del engine async de FastAPI.
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.core import get_settings
    from app.models import (
        Bill, BillItem, BillingPeriod, Property, PropertyOwner, Owner,
        BillStatus, NotificationLog, NotificationChannel, NotificationStatus,
    )
    from app.services.pdf_service import generate_bill_pdf
    from app.services.email_service import send_bill_email

    settings = get_settings()

    # Conexión síncrona directa (las tareas de Celery NO son async)
    sync_url = settings.database_url_direct
    engine = create_engine(sync_url, pool_pre_ping=True)

    results = {
        "period_id": billing_period_id,
        "bills_generated": 0,
        "pdfs_created": 0,
        "emails_sent": 0,
        "errors": [],
    }

    with Session(engine) as db:
        # 1. Obtener el periodo
        period = db.query(BillingPeriod).filter_by(id=billing_period_id).first()
        if not period:
            results["errors"].append("Periodo no encontrado")
            return results

        # 2. Obtener casas activas con propietario principal
        active_assignments = (
            db.query(PropertyOwner)
            .join(Property, PropertyOwner.property_id == Property.id)
            .join(Owner, PropertyOwner.owner_id == Owner.id)
            .filter(
                Property.is_active == True,
                Owner.is_active == True,
                PropertyOwner.is_primary == True,
                PropertyOwner.end_date == None,  # Propietario actual
            )
            .all()
        )

        total = len(active_assignments)
        for i, assignment in enumerate(active_assignments):
            try:
                prop = db.query(Property).get(assignment.property_id)
                owner = db.query(Owner).get(assignment.owner_id)

                # Verificar si ya existe factura para esta casa/periodo
                existing = (
                    db.query(Bill)
                    .filter_by(
                        property_id=prop.id,
                        billing_period_id=period.id,
                    )
                    .first()
                )
                if existing:
                    continue

                # 3. Crear factura
                bill_number = (
                    f"VDR-{period.year}-{period.month:02d}-"
                    f"{prop.house_number.zfill(3)}"
                )
                bill = Bill(
                    bill_number=bill_number,
                    property_id=prop.id,
                    billing_period_id=period.id,
                    owner_id=owner.id,
                    total_amount=period.base_amount,
                    status=BillStatus.DRAFT,
                )
                db.add(bill)
                db.flush()   # Obtener ID sin commitear aún

                # 4. Crear item de administración
                item = BillItem(
                    bill_id=bill.id,
                    concept="Administración",
                    description=f"Cuota de administración - {period.description}",
                    amount=period.base_amount,
                )
                db.add(item)
                results["bills_generated"] += 1

                # 5. Generar PDF
                try:
                    bill_data = {
                        "bill_number": bill_number,
                        "generated_date": datetime.now(timezone.utc).strftime(
                            "%d/%m/%Y"
                        ),
                        "owner_name": owner.full_name,
                        "owner_id_type": owner.id_type,
                        "owner_id_number": owner.id_number,
                        "owner_email": owner.email,
                        "house_number": prop.house_number,
                        "period": period.description,
                        "due_date": period.due_date.strftime("%d/%m/%Y"),
                        "items": [
                            {
                                "concept": "Administración",
                                "description": f"Cuota - {period.description}",
                                "amount": float(period.base_amount),
                            }
                        ],
                        "total_amount": float(period.base_amount),
                    }
                    pdf_bytes = generate_bill_pdf(bill_data)
                    results["pdfs_created"] += 1

                    # 6. Enviar email si se solicita
                    if send_notifications and owner.email:
                        success = send_bill_email(
                            to_email=owner.email,
                            owner_name=owner.full_name,
                            period_description=period.description,
                            pdf_bytes=pdf_bytes,
                        )

                        # Registrar notificación
                        log = NotificationLog(
                            bill_id=bill.id,
                            channel=NotificationChannel.EMAIL,
                            recipient=owner.email,
                            status=(
                                NotificationStatus.SENT
                                if success
                                else NotificationStatus.FAILED
                            ),
                            sent_at=datetime.now(timezone.utc) if success else None,
                        )
                        db.add(log)

                        if success:
                            bill.status = BillStatus.PENDING
                            bill.sent_at = datetime.now(timezone.utc)
                            results["emails_sent"] += 1

                except Exception as pdf_err:
                    results["errors"].append(
                        f"Casa {prop.house_number}: Error PDF/Email - {str(pdf_err)}"
                    )

                # Actualizar progreso de la tarea
                self.update_state(
                    state="PROGRESS",
                    meta={"current": i + 1, "total": total},
                )

            except Exception as e:
                results["errors"].append(
                    f"Casa {assignment.property_id}: {str(e)}"
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
