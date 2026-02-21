"""
VegasDelRio - Sesión de Base de Datos (Async).

Configura el engine de SQLAlchemy con asyncpg para conectar
a PostgreSQL (Supabase) usando el pooler Supavisor (puerto 6543).
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core import get_settings

settings = get_settings()

# Engine asíncrono — pool_size conservador para respetar límites de Supabase
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,       # Loguea SQL en modo desarrollo
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,        # Verifica conexión antes de usarla
    pool_recycle=300,          # Recicla conexiones cada 5 min
)

# Fábrica de sesiones — cada request obtiene su propia sesión
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
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
