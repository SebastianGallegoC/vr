"""
VegasDelRio - Alembic Environment Configuration.

Configura la conexión de Alembic usando DATABASE_URL_DIRECT
(conexión directa al puerto 5432, no al pooler Supavisor).
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core import get_settings
from app.db.base import Base

# Importar TODOS los modelos para que Alembic los detecte
from app.models import (  # noqa: F401
    Owner,
    Property,
    PropertyOwner,
    BillingPeriod,
    Bill,
    BillItem,
    NotificationLog,
)

# Configuración de Alembic
config = context.config

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata de los modelos (para autogenerate)
target_metadata = Base.metadata

# Cargar URL de la BD desde .env (conexión directa para migraciones)
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url_direct)


def run_migrations_offline() -> None:
    """
    Ejecuta migraciones en modo 'offline'.

    Genera SQL sin conectarse a la BD.
    Útil para revisar los cambios antes de aplicarlos.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Ejecuta migraciones en modo 'online'.

    Se conecta directamente a la BD y aplica los cambios.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
