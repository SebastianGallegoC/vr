"""Tests para endpoints de asignación Propiedad ↔ Propietario."""

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio

PROPERTIES_URL = "/api/v1/properties"
OWNERS_URL = "/api/v1/owners"


# ---- Helpers ----

async def _create_property(client: AsyncClient, numero_casa: str = "101") -> dict:
    resp = await client.post(
        PROPERTIES_URL,
        json={"numero_casa": numero_casa, "direccion": "Mz 1", "area_m2": 100},
    )
    assert resp.status_code == 201
    return resp.json()


async def _create_owner(client: AsyncClient, doc: str = "111") -> dict:
    resp = await client.post(
        OWNERS_URL,
        json={
            "nombre_completo": f"Owner {doc}",
            "tipo_documento": "CC",
            "numero_documento": doc,
            "correos": [f"owner{doc}@test.com"],
            "telefonos": ["+57300000000"],
        },
    )
    assert resp.status_code == 201
    return resp.json()


# ---- Assign Owner ----

async def test_assign_owner_to_property(client: AsyncClient):
    """POST /properties/{id}/owner → 201."""
    prop = await _create_property(client)
    owner = await _create_owner(client)

    resp = await client.post(
        f"{PROPERTIES_URL}/{prop['id']}/owner",
        json={"propietario_id": owner["id"]},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["propietario_id"] == owner["id"]
    assert data["es_principal"] is True
    assert data["fecha_fin"] is None
    assert data["propietario_nombre"] == owner["nombre_completo"]


async def test_assign_owner_property_not_found(client: AsyncClient):
    """POST /properties/{id}/owner con propiedad inexistente → 404."""
    import uuid
    owner = await _create_owner(client)
    resp = await client.post(
        f"{PROPERTIES_URL}/{uuid.uuid4()}/owner",
        json={"propietario_id": owner["id"]},
    )
    assert resp.status_code == 404


async def test_assign_owner_not_found(client: AsyncClient):
    """POST /properties/{id}/owner con propietario inexistente → 404."""
    import uuid
    prop = await _create_property(client)
    resp = await client.post(
        f"{PROPERTIES_URL}/{prop['id']}/owner",
        json={"propietario_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 404


async def test_assign_same_owner_twice_returns_400(client: AsyncClient):
    """POST /properties/{id}/owner con el mismo propietario → 400."""
    prop = await _create_property(client)
    owner = await _create_owner(client)

    await client.post(
        f"{PROPERTIES_URL}/{prop['id']}/owner",
        json={"propietario_id": owner["id"]},
    )
    resp = await client.post(
        f"{PROPERTIES_URL}/{prop['id']}/owner",
        json={"propietario_id": owner["id"]},
    )
    assert resp.status_code == 400


# ---- Get Current Owner ----

async def test_get_property_owner(client: AsyncClient):
    """GET /properties/{id}/owner → propietario actual."""
    prop = await _create_property(client)
    owner = await _create_owner(client)
    await client.post(
        f"{PROPERTIES_URL}/{prop['id']}/owner",
        json={"propietario_id": owner["id"]},
    )

    resp = await client.get(f"{PROPERTIES_URL}/{prop['id']}/owner")
    assert resp.status_code == 200
    data = resp.json()
    assert data["propietario_id"] == owner["id"]


async def test_get_property_owner_none(client: AsyncClient):
    """GET /properties/{id}/owner sin propietario → null."""
    prop = await _create_property(client)
    resp = await client.get(f"{PROPERTIES_URL}/{prop['id']}/owner")
    assert resp.status_code == 200
    assert resp.json() is None


# ---- Reassign Owner (history) ----

async def test_reassign_owner_closes_previous(client: AsyncClient):
    """Asignar un nuevo propietario cierra la relación anterior."""
    prop = await _create_property(client)
    owner1 = await _create_owner(client, doc="AAA")
    owner2 = await _create_owner(client, doc="BBB")

    await client.post(
        f"{PROPERTIES_URL}/{prop['id']}/owner",
        json={"propietario_id": owner1["id"]},
    )
    resp = await client.post(
        f"{PROPERTIES_URL}/{prop['id']}/owner",
        json={"propietario_id": owner2["id"]},
    )
    assert resp.status_code == 201

    # El propietario actual debe ser owner2
    current = await client.get(f"{PROPERTIES_URL}/{prop['id']}/owner")
    assert current.json()["propietario_id"] == owner2["id"]


# ---- Remove Owner ----

async def test_remove_property_owner(client: AsyncClient):
    """DELETE /properties/{id}/owner → 204."""
    prop = await _create_property(client)
    owner = await _create_owner(client)
    await client.post(
        f"{PROPERTIES_URL}/{prop['id']}/owner",
        json={"propietario_id": owner["id"]},
    )

    resp = await client.delete(f"{PROPERTIES_URL}/{prop['id']}/owner")
    assert resp.status_code == 204

    # Ya no hay propietario
    current = await client.get(f"{PROPERTIES_URL}/{prop['id']}/owner")
    assert current.json() is None


async def test_remove_property_owner_when_none_returns_404(client: AsyncClient):
    """DELETE /properties/{id}/owner sin propietario → 404."""
    prop = await _create_property(client)
    resp = await client.delete(f"{PROPERTIES_URL}/{prop['id']}/owner")
    assert resp.status_code == 404
