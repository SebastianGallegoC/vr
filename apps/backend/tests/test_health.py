"""Tests para el endpoint de health check."""

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


async def test_health_returns_200(client: AsyncClient):
    """GET /health → 200 con status healthy."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "app" in data
    assert "environment" in data
