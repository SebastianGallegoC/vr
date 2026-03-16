"""
VegasDelRio - Fixtures compartidos para todos los tests del backend.

Configura:
  - Base de datos SQLite async in-memory (sin PostgreSQL externo).
  - Cliente HTTP (httpx.AsyncClient) conectado a la app FastAPI.
  - Override de autenticación (sin JWT real de Supabase).
"""

import json
import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import JSON, String, event, TypeDecorator
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles

from app.db.base import Base
from app.main import app
from app.api.deps import get_current_user
from app.db import get_db
from app.schemas.auth import CurrentUser


# ----------------------------------------------------------------
# Adaptar tipos PostgreSQL → SQLite
# ----------------------------------------------------------------
# SQLite no soporta ARRAY nativo. Usamos dos mecanismos:
#   1. @compiles → que la DDL genere columnas JSON.
#   2. Parchear columnas ARRAY del modelo → TypeDecorator que
#      serializa listas Python ↔ JSON text automáticamente.


@compiles(ARRAY, "sqlite")
def _compile_array_sqlite(type_, compiler, **kw):
    """SQLite: compilar ARRAY como JSON (TEXT internamente)."""
    return "JSON"


class _JSONEncodedList(TypeDecorator):
    """Almacena listas Python como JSON text en SQLite."""

    impl = JSON
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        # Ya es una lista → serializarla como cadena JSON
        return json.dumps(value) if isinstance(value, (list, tuple)) else value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            return json.loads(value)
        return value  # ya es lista (driver lo parseó)


def _patch_array_columns():
    """Reemplaza columnas ARRAY en los modelos por _JSONEncodedList."""
    from app.models.owner import Owner

    for col_name in ("correos", "telefonos"):
        col = Owner.__table__.columns[col_name]
        col.type = _JSONEncodedList()


_patch_array_columns()


# ----------------------------------------------------------------
# Base de datos de prueba: SQLite async in-memory
# ----------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite://"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@event.listens_for(test_engine.sync_engine, "connect")
def _enable_sqlite_fk(dbapi_conn, _connection_record):
    """Habilita claves foráneas en SQLite (desactivadas por defecto)."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# ----------------------------------------------------------------
# Fixtures
# ----------------------------------------------------------------

MOCK_USER = CurrentUser(
    id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    email="test@vegasdelrio.com",
    role="authenticated",
)


@pytest.fixture(autouse=True)
async def _setup_db():
    """Crea todas las tablas antes de cada test y las elimina después."""
    # Importar todos los modelos para que Base.metadata los registre
    import app.models  # noqa: F401

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provee una sesión de la BD de test en lugar de la real."""
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def _override_get_current_user() -> CurrentUser:
    """Retorna un usuario mock sin validar JWT."""
    return MOCK_USER


@pytest.fixture()
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Cliente HTTP que apunta a la app FastAPI con la BD de test
    y autenticación mockeada.
    """
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture()
async def unauth_client() -> AsyncGenerator[AsyncClient, None]:
    """
    Cliente HTTP SIN override de autenticación — para probar
    que los endpoints rechazan requests sin token.
    """
    app.dependency_overrides[get_db] = _override_get_db
    # No override de get_current_user → la dependencia real se ejecuta

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture()
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Sesión de BD directa para preparar datos en tests."""
    async with TestSessionLocal() as session:
        yield session
