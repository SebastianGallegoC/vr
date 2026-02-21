"""
VegasDelRio - Router Principal API v1.

Agrupa todos los routers de endpoints bajo el prefijo /api/v1.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import owners, properties, billing

api_v1_router = APIRouter()

api_v1_router.include_router(
    owners.router,
    prefix="/owners",
    tags=["Propietarios"],
)

api_v1_router.include_router(
    properties.router,
    prefix="/properties",
    tags=["Propiedades (Casas)"],
)

api_v1_router.include_router(
    billing.router,
    prefix="/billing",
    tags=["Facturación"],
)
