"""
VegasDelRio - Punto de Entrada de la Aplicación FastAPI.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text

from app.core import get_settings
from app.api.v1.router import api_v1_router
from app.db.session import AsyncSessionLocal

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación: startup y shutdown."""
    logger.info("%s API iniciada [%s]", settings.app_name, settings.app_env)
    logger.info("CORS Origins: %s", settings.cors_origins)
    yield
    logger.info("%s API detenida", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    description="API para la gestión de cobros del conjunto residencial Vegas del Río.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

# ---- Middleware: GZip ----
app.add_middleware(GZipMiddleware, minimum_size=500)

# ---- Middleware: CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"http://localhost:\d+" if settings.is_development else None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# ---- Rutas de la API v1 ----
app.include_router(api_v1_router, prefix=settings.api_v1_prefix)


# ---- Health Check ----
@app.get("/health", tags=["Sistema"])
async def health_check():
    """Endpoint de verificación de estado del servidor con ping a la BD."""
    db_ok = False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        logger.warning("Health check: fallo al conectar con la base de datos.")

    status_val = "healthy" if db_ok else "degraded"
    return {
        "status": status_val,
        "app": settings.app_name,
        "environment": settings.app_env,
        "database": "ok" if db_ok else "unreachable",
    }
