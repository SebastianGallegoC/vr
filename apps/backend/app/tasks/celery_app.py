"""
VegasDelRio - Configuración de la Aplicación Celery.

Configura el worker de Celery para procesamiento en segundo plano:
  - Generación masiva de PDFs.
  - Envío masivo de emails.
  - Tareas programadas (futuro: recordatorios, vencimientos).

IMPORTANTE (Windows):
  Ejecutar con: celery -A app.tasks.celery_app worker --pool=solo -l info
"""

from celery import Celery

from app.core import get_settings

settings = get_settings()

celery_app = Celery(
    "vegasdelrio_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

# ---- Configuración General ----
celery_app.conf.update(
    # Serialización
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Zona horaria (Colombia)
    timezone="America/Bogota",
    enable_utc=True,

    # Reintentos
    task_acks_late=True,               # ACK después de procesar (no antes)
    task_reject_on_worker_lost=True,   # Re-encolar si el worker muere
    broker_connection_retry_on_startup=True,  # Reintentar conexión al iniciar

    # Resultados
    result_expires=3600,               # Resultados expiran en 1 hora

    # Pool (crítico para Windows)
    worker_pool="solo",
)

# ---- Autodescubrir tareas en el módulo tasks ----
celery_app.autodiscover_tasks(["app.tasks"])
