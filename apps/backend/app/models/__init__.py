"""
VegasDelRio - Registro central de modelos SQLAlchemy.

¡IMPORTANTE! Todos los modelos se importan aquí para que Alembic
pueda detectarlos automáticamente al generar migraciones.
"""

from app.models.owner import Owner
from app.models.property import Property
from app.models.property_owner import PropertyOwner
from app.models.email_config import EmailConfig
from app.models.billing import (
    BillingPeriod,
    Bill,
    BillItem,
    NotificationLog,
    # Enums (exportados para uso en esquemas y servicios)
    PeriodStatus,
    BillStatus,
    NotificationChannel,
    NotificationStatus,
)

__all__ = [
    # Modelos
    "Owner",
    "Property",
    "PropertyOwner",
    "EmailConfig",
    "BillingPeriod",
    "Bill",
    "BillItem",
    "NotificationLog",
    # Enums
    "PeriodStatus",
    "BillStatus",
    "NotificationChannel",
    "NotificationStatus",
]
