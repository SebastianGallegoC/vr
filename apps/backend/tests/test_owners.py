"""Tests para endpoints de Propietarios (Owners)."""

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio

OWNERS_URL = "/api/v1/owners"


# ---- Helpers ----

def _owner_payload(numero_documento: str = "123456789", **overrides) -> dict:
    data = {
        "nombre_completo": "Carlos Pérez",
        "tipo_documento": "CC",
        "numero_documento": numero_documento,
        "correos": ["carlos@test.com"],
        "telefonos": ["+573001234567"],
    }
    data.update(overrides)
    return data


async def _create_owner(client: AsyncClient, **kw) -> dict:
    resp = await client.post(OWNERS_URL, json=_owner_payload(**kw))
    assert resp.status_code == 201
    return resp.json()


# ---- CREATE ----

async def test_create_owner(client: AsyncClient):
    """POST /owners → 201 con datos válidos."""
    data = await _create_owner(client)
    assert data["nombre_completo"] == "Carlos Pérez"
    assert data["correos"] == ["carlos@test.com"]
    assert data["activo"] is True
    assert "id" in data


async def test_create_owner_duplicate_document_returns_409(client: AsyncClient):
    """POST /owners con documento duplicado → 409."""
    await _create_owner(client, numero_documento="999")
    resp = await client.post(OWNERS_URL, json=_owner_payload(numero_documento="999"))
    assert resp.status_code == 409


async def test_create_owner_missing_required_fields(client: AsyncClient):
    """POST /owners sin campos requeridos → 422."""
    resp = await client.post(OWNERS_URL, json={"nombre_completo": "X"})
    assert resp.status_code == 422


# ---- LIST ----

async def test_list_owners_empty(client: AsyncClient):
    """GET /owners sin datos → lista vacía."""
    resp = await client.get(OWNERS_URL)
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


async def test_list_owners_pagination(client: AsyncClient):
    """GET /owners con paginación."""
    for i in range(5):
        await _create_owner(client, numero_documento=str(1000 + i))

    resp = await client.get(OWNERS_URL, params={"page": 1, "page_size": 3})
    data = resp.json()
    assert len(data["items"]) == 3
    assert data["total"] == 5


async def test_list_owners_search_by_name(client: AsyncClient):
    """GET /owners con búsqueda por nombre."""
    await _create_owner(client, nombre_completo="Ana García", numero_documento="AAA")
    await _create_owner(client, nombre_completo="Pedro López", numero_documento="BBB")

    resp = await client.get(OWNERS_URL, params={"search": "Ana"})
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["nombre_completo"] == "Ana García"


async def test_list_owners_search_by_document(client: AsyncClient):
    """GET /owners con búsqueda por número de documento."""
    await _create_owner(client, numero_documento="XYZ789")

    resp = await client.get(OWNERS_URL, params={"search": "XYZ789"})
    data = resp.json()
    assert data["total"] == 1


async def test_list_owners_filter_activo(client: AsyncClient):
    """GET /owners filtrando por activo."""
    o = await _create_owner(client)
    await client.delete(f"{OWNERS_URL}/{o['id']}")

    resp = await client.get(OWNERS_URL, params={"activo": True})
    assert resp.json()["total"] == 0

    resp = await client.get(OWNERS_URL, params={"activo": False})
    assert resp.json()["total"] == 1


# ---- DETAIL ----

async def test_get_owner_by_id(client: AsyncClient):
    """GET /owners/{id} → 200."""
    o = await _create_owner(client)
    resp = await client.get(f"{OWNERS_URL}/{o['id']}")
    assert resp.status_code == 200
    assert resp.json()["numero_documento"] == "123456789"


async def test_get_owner_not_found(client: AsyncClient):
    """GET /owners/{id} inexistente → 404."""
    import uuid
    resp = await client.get(f"{OWNERS_URL}/{uuid.uuid4()}")
    assert resp.status_code == 404


# ---- UPDATE ----

async def test_update_owner(client: AsyncClient):
    """PUT /owners/{id} → actualiza campos."""
    o = await _create_owner(client)
    resp = await client.put(
        f"{OWNERS_URL}/{o['id']}",
        json={"nombre_completo": "Carlos Actualizado", "correos": ["nuevo@test.com"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["nombre_completo"] == "Carlos Actualizado"
    assert data["correos"] == ["nuevo@test.com"]
    # Campos no enviados no cambian
    assert data["numero_documento"] == "123456789"


async def test_update_owner_not_found(client: AsyncClient):
    """PUT /owners/{id} inexistente → 404."""
    import uuid
    resp = await client.put(
        f"{OWNERS_URL}/{uuid.uuid4()}",
        json={"nombre_completo": "XX"},
    )
    assert resp.status_code == 404


# ---- DELETE (soft) ----

async def test_delete_owner(client: AsyncClient):
    """DELETE /owners/{id} → 204 y activo=False."""
    o = await _create_owner(client)
    resp = await client.delete(f"{OWNERS_URL}/{o['id']}")
    assert resp.status_code == 204

    detail = await client.get(f"{OWNERS_URL}/{o['id']}")
    assert detail.json()["activo"] is False


async def test_delete_owner_not_found(client: AsyncClient):
    """DELETE /owners/{id} inexistente → 404."""
    import uuid
    resp = await client.delete(f"{OWNERS_URL}/{uuid.uuid4()}")
    assert resp.status_code == 404
