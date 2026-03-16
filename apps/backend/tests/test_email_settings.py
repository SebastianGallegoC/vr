"""Tests para endpoints de Configuración de Email."""

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio

SETTINGS_URL = "/api/v1/settings"


async def test_email_status_no_config(client: AsyncClient):
    """GET /settings/email/status sin Gmail vinculado → vinculado=false."""
    resp = await client.get(f"{SETTINGS_URL}/email/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["vinculado"] is False


async def test_unlink_gmail_no_config_returns_404(client: AsyncClient):
    """DELETE /settings/email/gmail/unlink sin config → 404."""
    resp = await client.delete(f"{SETTINGS_URL}/email/gmail/unlink")
    assert resp.status_code == 404
