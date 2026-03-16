"""
VegasDelRio - Router Principal API v1.

Agrupa todos los routers de endpoints bajo el prefijo /api/v1.
Todos los endpoints bajo este router requieren autenticación JWT.
"""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.v1.endpoints import owners, properties, billing, email_settings

api_v1_router = APIRouter(dependencies=[Depends(get_current_user)])

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

api_v1_router.include_router(
    email_settings.router,
    prefix="/settings",
    tags=["Configuración"],
)
