"""Tests para endpoints de Propiedades (Properties/Casas)."""

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio

PROPERTIES_URL = "/api/v1/properties"


# ---- Helpers ----

def _property_payload(numero_casa: str = "101", **overrides) -> dict:
    data = {
        "numero_casa": numero_casa,
        "direccion": "Manzana 1, Lote 1",
        "area_m2": 120.5,
        "alicuota": 2.5,
    }
    data.update(overrides)
    return data


async def _create_property(client: AsyncClient, **kw) -> dict:
    resp = await client.post(PROPERTIES_URL, json=_property_payload(**kw))
    assert resp.status_code == 201
    return resp.json()


# ---- CREATE ----

async def test_create_property(client: AsyncClient):
    """POST /properties → 201 con datos válidos."""
    data = await _create_property(client)
    assert data["numero_casa"] == "101"
    assert data["activo"] is True
    assert "id" in data


async def test_create_property_duplicate_returns_409(client: AsyncClient):
    """POST /properties con numero_casa duplicado → 409."""
    await _create_property(client, numero_casa="200")
    resp = await client.post(PROPERTIES_URL, json=_property_payload(numero_casa="200"))
    assert resp.status_code == 409


# ---- LIST ----

async def test_list_properties_empty(client: AsyncClient):
    """GET /properties sin datos → lista vacía."""
    resp = await client.get(PROPERTIES_URL)
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


async def test_list_properties_pagination(client: AsyncClient):
    """GET /properties con paginación."""
    for i in range(5):
        await _create_property(client, numero_casa=str(100 + i))

    resp = await client.get(PROPERTIES_URL, params={"page": 1, "page_size": 2})
    data = resp.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5
    assert data["page"] == 1
    assert data["page_size"] == 2


async def test_list_properties_search(client: AsyncClient):
    """GET /properties con búsqueda por numero_casa."""
    await _create_property(client, numero_casa="A-10")
    await _create_property(client, numero_casa="B-20")

    resp = await client.get(PROPERTIES_URL, params={"search": "A-10"})
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["numero_casa"] == "A-10"


async def test_list_properties_filter_activo(client: AsyncClient):
    """GET /properties filtrando por activo."""
    p = await _create_property(client, numero_casa="300")
    # Soft delete
    await client.delete(f"{PROPERTIES_URL}/{p['id']}")

    resp = await client.get(PROPERTIES_URL, params={"activo": True})
    assert resp.json()["total"] == 0

    resp = await client.get(PROPERTIES_URL, params={"activo": False})
    assert resp.json()["total"] == 1


# ---- DETAIL ----

async def test_get_property_by_id(client: AsyncClient):
    """GET /properties/{id} → 200."""
    p = await _create_property(client)
    resp = await client.get(f"{PROPERTIES_URL}/{p['id']}")
    assert resp.status_code == 200
    assert resp.json()["numero_casa"] == "101"


async def test_get_property_not_found(client: AsyncClient):
    """GET /properties/{id} inexistente → 404."""
    import uuid
    resp = await client.get(f"{PROPERTIES_URL}/{uuid.uuid4()}")
    assert resp.status_code == 404


# ---- UPDATE ----

async def test_update_property(client: AsyncClient):
    """PUT /properties/{id} → actualiza campos."""
    p = await _create_property(client)
    resp = await client.put(
        f"{PROPERTIES_URL}/{p['id']}",
        json={"direccion": "Nueva dirección", "area_m2": 200},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["direccion"] == "Nueva dirección"
    assert data["area_m2"] == 200
    # Campos no enviados no deben cambiar
    assert data["numero_casa"] == "101"


async def test_update_property_not_found(client: AsyncClient):
    """PUT /properties/{id} inexistente → 404."""
    import uuid
    resp = await client.put(
        f"{PROPERTIES_URL}/{uuid.uuid4()}",
        json={"direccion": "X"},
    )
    assert resp.status_code == 404


# ---- DELETE (soft) ----

async def test_delete_property(client: AsyncClient):
    """DELETE /properties/{id} → 204 y activo=False."""
    p = await _create_property(client)
    resp = await client.delete(f"{PROPERTIES_URL}/{p['id']}")
    assert resp.status_code == 204

    # Verificar soft delete
    detail = await client.get(f"{PROPERTIES_URL}/{p['id']}")
    assert detail.json()["activo"] is False


async def test_delete_property_not_found(client: AsyncClient):
    """DELETE /properties/{id} inexistente → 404."""
    import uuid
    resp = await client.delete(f"{PROPERTIES_URL}/{uuid.uuid4()}")
    assert resp.status_code == 404
