"""
VegasDelRio - Base declarativa de SQLAlchemy.

Todos los modelos deben heredar de `Base` para que Alembic
los detecte automáticamente al generar migraciones.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Clase base para todos los modelos ORM del proyecto."""
    pass
