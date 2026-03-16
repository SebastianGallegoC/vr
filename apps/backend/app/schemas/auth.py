"""
VegasDelRio - Schemas: Autenticación.

Define el schema del usuario autenticado extraído del JWT de Supabase.
"""

from pydantic import BaseModel


class CurrentUser(BaseModel):
    """Datos del usuario autenticado extraídos del token JWT de Supabase."""

    id: str
    email: str
    role: str = "authenticated"
