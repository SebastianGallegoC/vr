"""
VegasDelRio - Punto de Entrada de la Aplicación FastAPI.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import get_settings
from app.api.v1.router import api_v1_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación: startup y shutdown."""
    # --- Startup ---
    print(f"🚀 {settings.app_name} API iniciada [{settings.app_env}]")
    yield
    # --- Shutdown ---
    print(f"🛑 {settings.app_name} API detenida")


app = FastAPI(
    title=settings.app_name,
    description="API para la gestión de cobros del conjunto residencial Vegas del Río.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

# ---- Middleware: CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Rutas de la API v1 ----
app.include_router(api_v1_router, prefix=settings.api_v1_prefix)


# ---- Health Check ----
@app.get("/health", tags=["Sistema"])
async def health_check():
    """Endpoint de verificación de estado del servidor."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.app_env,
    }
