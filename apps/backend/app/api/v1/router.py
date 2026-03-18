"""
VegasDelRio - Router Principal API v1.

Agrupa todos los routers de endpoints bajo el prefijo /api/v1.
- Rutas de administración: requieren autenticación JWT de Supabase.
- Rutas del portal de propietarios: auth propia (JWT HS256).
"""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.v1.endpoints import owners, properties, billing, email_settings, owner_portal

# ---- Router de administración (requiere Supabase JWT) ----
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

# ---- Router del portal de propietarios (auth propia) ----
# No hereda get_current_user — el login es público y los endpoints
# protegidos usan get_current_owner individualmente.
portal_router = APIRouter()

portal_router.include_router(
    owner_portal.router,
    prefix="/portal",
    tags=["Portal Propietarios"],
)
