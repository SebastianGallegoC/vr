"""
VegasDelRio - Configuración Central de la Aplicación.

Carga las variables de entorno y las expone como un objeto tipado
para ser usado de forma segura en toda la aplicación.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración de la aplicación cargada desde variables de entorno."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- Aplicación ----
    app_name: str = "VegasDelRio"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "cambiar-por-una-clave-segura-de-32-caracteres"
    api_v1_prefix: str = "/api/v1"

    # ---- Base de Datos (Supabase) ----
    database_url: str = ""
    database_url_direct: str = ""

    # ---- Supabase Auth ----
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # ---- Redis ----
    redis_url: str = "redis://localhost:6379/0"

    # ---- Celery ----
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # ---- Email ----
    email_provider: str = "smtp"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "Vegas del Río"
    smtp_from_email: str = ""
    resend_api_key: str = ""

    # ---- CORS ----
    cors_origins: List[str] = ["http://localhost:3000"]

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache()
def get_settings() -> Settings:
    """Singleton: devuelve la misma instancia de Settings en toda la app."""
    return Settings()
