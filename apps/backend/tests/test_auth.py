"""Tests para endpoint de autenticación (JWT / deps)."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db import get_db
from tests.conftest import _override_get_db


pytestmark = pytest.mark.asyncio


async def test_request_without_token_returns_401():
    """Una request sin token JWT debe retornar 401."""
    # Solo sobreescribimos la BD, NO la autenticación
    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/v1/owners")

    app.dependency_overrides.clear()
    assert resp.status_code == 401


async def test_request_with_invalid_token_returns_401():
    """Una request con token inválido debe retornar 401."""
    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/owners",
            headers={"Authorization": "Bearer invalid-token-value"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 401


async def test_authenticated_request_succeeds(client: AsyncClient):
    """Con el override de auth, las requests deben funcionar (200)."""
    resp = await client.get("/api/v1/owners")
    assert resp.status_code == 200
