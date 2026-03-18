"""
VegasDelRio - Sesión de Base de Datos (Async).

Configura el engine de SQLAlchemy con asyncpg para conectar
a PostgreSQL (Supabase) usando el pooler Supavisor en modo sesión (puerto 5432).
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core import get_settings

settings = get_settings()

# Engine asíncrono — Session mode (puerto 5432) soporta prepared statements
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_recycle=300,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

# Fábrica de sesiones — cada request obtiene su propia sesión
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependencia de FastAPI: provee una sesión de BD por request.

    Uso:
        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
