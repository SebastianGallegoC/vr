"""Tests para endpoints de Facturación (Billing)."""

import uuid

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio

BILLING_URL = "/api/v1/billing"
PROPERTIES_URL = "/api/v1/properties"
OWNERS_URL = "/api/v1/owners"


# ---- Helpers ----

def _period_payload(**overrides) -> dict:
    data = {
        "mes": 6,
        "anio": 2025,
        "descripcion": "Junio 2025",
        "monto_base": 250000,
        "fecha_vencimiento": "2025-06-30",
    }
    data.update(overrides)
    return data


async def _create_period(client: AsyncClient, **kw) -> dict:
    resp = await client.post(f"{BILLING_URL}/periods", json=_period_payload(**kw))
    assert resp.status_code == 201
    return resp.json()


async def _setup_property_with_owner(client: AsyncClient, casa: str = "101", doc: str = "111000"):
    """Crea una propiedad activa con propietario asignado."""
    prop_resp = await client.post(
        PROPERTIES_URL,
        json={"numero_casa": casa, "direccion": "Mz1"},
    )
    assert prop_resp.status_code == 201, prop_resp.text
    prop = prop_resp.json()

    owner_resp = await client.post(
        OWNERS_URL,
        json={
            "nombre_completo": f"Owner {doc}",
            "tipo_documento": "CC",
            "numero_documento": doc,
            "correos": [f"o{doc}@test.com"],
            "telefonos": ["+57300"],
        },
    )
    assert owner_resp.status_code == 201, owner_resp.text
    owner = owner_resp.json()

    await client.post(
        f"{PROPERTIES_URL}/{prop['id']}/owner",
        json={"propietario_id": owner["id"]},
    )
    return prop, owner


# ============================================================
# Periodos
# ============================================================

async def test_create_period(client: AsyncClient):
    """POST /billing/periods → 201."""
    data = await _create_period(client)
    assert data["mes"] == 6
    assert data["anio"] == 2025
    assert data["estado"] == "open"
    assert "id" in data


async def test_create_period_duplicate_returns_409(client: AsyncClient):
    """POST /billing/periods con mes/anio duplicado → 409."""
    await _create_period(client, mes=1, anio=2025)
    resp = await client.post(
        f"{BILLING_URL}/periods",
        json=_period_payload(mes=1, anio=2025),
    )
    assert resp.status_code == 409


async def test_list_periods(client: AsyncClient):
    """GET /billing/periods → lista de periodos."""
    await _create_period(client, mes=1, anio=2025, descripcion="Enero 2025")
    await _create_period(client, mes=2, anio=2025, descripcion="Febrero 2025")

    resp = await client.get(f"{BILLING_URL}/periods")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


async def test_list_periods_filter_by_year(client: AsyncClient):
    """GET /billing/periods?year=2025 → filtra por año."""
    await _create_period(client, mes=12, anio=2024, descripcion="Dic 2024")
    await _create_period(client, mes=1, anio=2025, descripcion="Ene 2025")

    resp = await client.get(f"{BILLING_URL}/periods", params={"year": 2025})
    data = resp.json()
    assert len(data) == 1
    assert data[0]["anio"] == 2025


async def test_update_period(client: AsyncClient):
    """PUT /billing/periods/{id} → actualiza campos."""
    p = await _create_period(client)
    resp = await client.put(
        f"{BILLING_URL}/periods/{p['id']}",
        json={"descripcion": "Actualizado", "monto_base": 300000},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["descripcion"] == "Actualizado"
    assert data["monto_base"] == 300000


async def test_update_period_not_found(client: AsyncClient):
    """PUT /billing/periods/{id} inexistente → 404."""
    resp = await client.put(
        f"{BILLING_URL}/periods/{uuid.uuid4()}",
        json={"descripcion": "X"},
    )
    assert resp.status_code == 404


# ============================================================
# Generación masiva de facturas
# ============================================================

async def test_generate_bills(client: AsyncClient):
    """POST /billing/generate → genera facturas para casas activas."""
    period = await _create_period(client)
    await _setup_property_with_owner(client, casa="A1", doc="DDD1")
    await _setup_property_with_owner(client, casa="A2", doc="DDD2")

    resp = await client.post(
        f"{BILLING_URL}/generate",
        json={"periodo_facturacion_id": period["id"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["facturas_generadas"] == 2
    assert data["facturas_omitidas"] == 0


async def test_generate_bills_skips_existing(client: AsyncClient):
    """POST /billing/generate omite propiedades con factura existente."""
    period = await _create_period(client)
    await _setup_property_with_owner(client, casa="B1", doc="EEE1")

    # Primera generación
    await client.post(
        f"{BILLING_URL}/generate",
        json={"periodo_facturacion_id": period["id"]},
    )
    # Segunda generación → debe omitir
    resp = await client.post(
        f"{BILLING_URL}/generate",
        json={"periodo_facturacion_id": period["id"]},
    )
    data = resp.json()
    assert data["facturas_generadas"] == 0
    assert data["facturas_omitidas"] == 1


async def test_generate_bills_period_not_found(client: AsyncClient):
    """POST /billing/generate con periodo inexistente → 404."""
    resp = await client.post(
        f"{BILLING_URL}/generate",
        json={"periodo_facturacion_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 404


async def test_generate_bills_closed_period_returns_400(client: AsyncClient):
    """POST /billing/generate con periodo cerrado → 400."""
    period = await _create_period(client)
    # Cerrar el periodo
    await client.put(
        f"{BILLING_URL}/periods/{period['id']}",
        json={"estado": "closed"},
    )
    resp = await client.post(
        f"{BILLING_URL}/generate",
        json={"periodo_facturacion_id": period["id"]},
    )
    assert resp.status_code == 400


# ============================================================
# Facturas (Bills)
# ============================================================

async def test_list_bills_empty(client: AsyncClient):
    """GET /billing/bills sin facturas → lista vacía."""
    resp = await client.get(f"{BILLING_URL}/bills")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


async def test_list_bills_after_generation(client: AsyncClient):
    """GET /billing/bills después de generar → retorna facturas."""
    period = await _create_period(client)
    await _setup_property_with_owner(client, casa="C1", doc="FFF1")
    await client.post(
        f"{BILLING_URL}/generate",
        json={"periodo_facturacion_id": period["id"]},
    )

    resp = await client.get(f"{BILLING_URL}/bills")
    data = resp.json()
    assert data["total"] == 1
    bill = data["items"][0]
    assert bill["monto_total"] == 250000
    assert bill["estado"] == "draft"
    assert bill["numero_factura"].startswith("VDR-")


async def test_list_bills_filter_by_period(client: AsyncClient):
    """GET /billing/bills?period_id=... filtra por periodo."""
    p1 = await _create_period(client, mes=1, anio=2025, descripcion="Ene")
    p2 = await _create_period(client, mes=2, anio=2025, descripcion="Feb")
    await _setup_property_with_owner(client, casa="D1", doc="GGG1")

    await client.post(f"{BILLING_URL}/generate", json={"periodo_facturacion_id": p1["id"]})
    await client.post(f"{BILLING_URL}/generate", json={"periodo_facturacion_id": p2["id"]})

    resp = await client.get(f"{BILLING_URL}/bills", params={"period_id": p1["id"]})
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["periodo_facturacion_id"] == p1["id"]


async def test_get_bill_detail(client: AsyncClient):
    """GET /billing/bills/{id} → factura con items."""
    period = await _create_period(client)
    await _setup_property_with_owner(client, casa="E1", doc="HHH1")
    await client.post(
        f"{BILLING_URL}/generate",
        json={"periodo_facturacion_id": period["id"]},
    )

    # Obtener la factura
    bills_resp = await client.get(f"{BILLING_URL}/bills")
    bill_id = bills_resp.json()["items"][0]["id"]

    resp = await client.get(f"{BILLING_URL}/bills/{bill_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == bill_id
    assert len(data["items"]) >= 1
    assert data["items"][0]["concepto"] == "Administración"


async def test_get_bill_not_found(client: AsyncClient):
    """GET /billing/bills/{id} inexistente → 404."""
    resp = await client.get(f"{BILLING_URL}/bills/{uuid.uuid4()}")
    assert resp.status_code == 404


async def test_update_bill_status(client: AsyncClient):
    """PUT /billing/bills/{id} → actualiza estado siguiendo la máquina de estados."""
    period = await _create_period(client)
    await _setup_property_with_owner(client, casa="F1", doc="III1")
    await client.post(
        f"{BILLING_URL}/generate",
        json={"periodo_facturacion_id": period["id"]},
    )

    bills_resp = await client.get(f"{BILLING_URL}/bills")
    bill_id = bills_resp.json()["items"][0]["id"]

    # draft → pending (transición válida)
    resp = await client.put(
        f"{BILLING_URL}/bills/{bill_id}",
        json={"estado": "pending"},
    )
    assert resp.status_code == 200
    assert resp.json()["estado"] == "pending"

    # pending → paid (transición válida)
    resp = await client.put(
        f"{BILLING_URL}/bills/{bill_id}",
        json={"estado": "paid"},
    )
    assert resp.status_code == 200
    assert resp.json()["estado"] == "paid"


async def test_update_bill_invalid_transition_returns_400(client: AsyncClient):
    """PUT /billing/bills/{id} → transición inválida retorna 400."""
    period = await _create_period(client, mes=11)
    await _setup_property_with_owner(client, casa="F2", doc="III2")
    await client.post(
        f"{BILLING_URL}/generate",
        json={"periodo_facturacion_id": period["id"]},
    )

    bills_resp = await client.get(f"{BILLING_URL}/bills", params={"period_id": period["id"]})
    bill_id = bills_resp.json()["items"][0]["id"]

    # draft → paid no es válido (debe pasar por pending primero)
    resp = await client.put(
        f"{BILLING_URL}/bills/{bill_id}",
        json={"estado": "paid"},
    )
    assert resp.status_code == 400


# ============================================================
# Notificaciones
# ============================================================

async def test_get_bill_notifications_empty(client: AsyncClient):
    """GET /billing/bills/{id}/notifications → lista vacía."""
    period = await _create_period(client)
    await _setup_property_with_owner(client, casa="G1", doc="JJJ1")
    await client.post(
        f"{BILLING_URL}/generate",
        json={"periodo_facturacion_id": period["id"]},
    )
    bills_resp = await client.get(f"{BILLING_URL}/bills")
    bill_id = bills_resp.json()["items"][0]["id"]

    resp = await client.get(f"{BILLING_URL}/bills/{bill_id}/notifications")
    assert resp.status_code == 200
    assert resp.json() == []
