"""
VegasDelRio - Servicio de Facturación.

Centraliza toda la lógica de negocio de facturación:
  - Validación de transiciones de estado de facturas.
  - Consulta única de estadísticas del dashboard.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.models.billing import BillStatus


# ============================================================
# Máquina de estados para facturas
# ============================================================

_VALID_TRANSITIONS: dict[BillStatus, set[BillStatus]] = {
    BillStatus.DRAFT: {BillStatus.PENDING, BillStatus.CANCELLED},
    BillStatus.PENDING: {BillStatus.PAID, BillStatus.OVERDUE, BillStatus.CANCELLED},
    BillStatus.OVERDUE: {BillStatus.PAID, BillStatus.CANCELLED},
    BillStatus.PAID: set(),
    BillStatus.CANCELLED: set(),
}


def validate_bill_state_transition(
    current: BillStatus,
    target: BillStatus,
) -> None:
    """
    Valida que la transición de estado sea permitida.

    Raises:
        HTTPException 400 si la transición no es válida.
    """
    if current == target:
        return

    allowed = _VALID_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Transición de estado no permitida: "
                f"'{current.value}' → '{target.value}'. "
                f"Transiciones válidas desde '{current.value}': "
                f"{[s.value for s in allowed] if allowed else 'ninguna (estado final)'}."
            ),
        )


def apply_bill_status_side_effects(bill, target: BillStatus) -> None:
    """Aplica efectos secundarios al cambiar estado de una factura."""
    if target == BillStatus.PAID and not bill.pagado_en:
        bill.pagado_en = datetime.now(timezone.utc)
    if target == BillStatus.PENDING and not bill.enviado_en:
        bill.enviado_en = datetime.now(timezone.utc)
