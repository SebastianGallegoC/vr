"""rename_tables_columns_to_spanish

Revision ID: a1b2c3d4e5f6
Revises: 7b5da8960037
Create Date: 2026-02-23 00:00:00.000000

Renombra todas las tablas y columnas del inglés al español.
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '7b5da8960037'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ================================================================
    # 1. Renombrar columnas ANTES de renombrar tablas
    #    (las FK references usan el nombre de tabla actual)
    # ================================================================

    # ---- properties ----
    op.alter_column('properties', 'house_number', new_column_name='numero_casa')
    op.alter_column('properties', 'address', new_column_name='direccion')
    # area_m2 se mantiene igual
    op.alter_column('properties', 'aliquot', new_column_name='alicuota')
    op.alter_column('properties', 'notes', new_column_name='notas')
    op.alter_column('properties', 'is_active', new_column_name='activo')
    op.alter_column('properties', 'created_at', new_column_name='creado_en')
    op.alter_column('properties', 'updated_at', new_column_name='actualizado_en')

    # ---- owners ----
    op.alter_column('owners', 'auth_user_id', new_column_name='id_usuario_auth')
    op.alter_column('owners', 'full_name', new_column_name='nombre_completo')
    op.alter_column('owners', 'id_type', new_column_name='tipo_documento')
    op.alter_column('owners', 'id_number', new_column_name='numero_documento')
    op.alter_column('owners', 'email', new_column_name='correo')
    op.alter_column('owners', 'phone', new_column_name='telefono')
    op.alter_column('owners', 'notes', new_column_name='notas')
    op.alter_column('owners', 'is_active', new_column_name='activo')
    op.alter_column('owners', 'created_at', new_column_name='creado_en')
    op.alter_column('owners', 'updated_at', new_column_name='actualizado_en')

    # ---- property_owners ----
    op.alter_column('property_owners', 'property_id', new_column_name='propiedad_id')
    op.alter_column('property_owners', 'owner_id', new_column_name='propietario_id')
    op.alter_column('property_owners', 'is_primary', new_column_name='es_principal')
    op.alter_column('property_owners', 'start_date', new_column_name='fecha_inicio')
    op.alter_column('property_owners', 'end_date', new_column_name='fecha_fin')
    op.alter_column('property_owners', 'created_at', new_column_name='creado_en')

    # ---- billing_periods ----
    op.alter_column('billing_periods', 'month', new_column_name='mes')
    op.alter_column('billing_periods', 'year', new_column_name='anio')
    op.alter_column('billing_periods', 'description', new_column_name='descripcion')
    op.alter_column('billing_periods', 'base_amount', new_column_name='monto_base')
    op.alter_column('billing_periods', 'due_date', new_column_name='fecha_vencimiento')
    op.alter_column('billing_periods', 'status', new_column_name='estado')
    op.alter_column('billing_periods', 'created_at', new_column_name='creado_en')
    op.alter_column('billing_periods', 'updated_at', new_column_name='actualizado_en')

    # ---- bills ----
    op.alter_column('bills', 'bill_number', new_column_name='numero_factura')
    op.alter_column('bills', 'property_id', new_column_name='propiedad_id')
    op.alter_column('bills', 'billing_period_id', new_column_name='periodo_facturacion_id')
    op.alter_column('bills', 'owner_id', new_column_name='propietario_id')
    op.alter_column('bills', 'total_amount', new_column_name='monto_total')
    op.alter_column('bills', 'status', new_column_name='estado')
    op.alter_column('bills', 'pdf_url', new_column_name='url_pdf')
    op.alter_column('bills', 'notes', new_column_name='notas')
    op.alter_column('bills', 'sent_at', new_column_name='enviado_en')
    op.alter_column('bills', 'paid_at', new_column_name='pagado_en')
    op.alter_column('bills', 'created_at', new_column_name='creado_en')
    op.alter_column('bills', 'updated_at', new_column_name='actualizado_en')

    # ---- bill_items ----
    op.alter_column('bill_items', 'bill_id', new_column_name='factura_id')
    op.alter_column('bill_items', 'concept', new_column_name='concepto')
    op.alter_column('bill_items', 'description', new_column_name='descripcion')
    op.alter_column('bill_items', 'amount', new_column_name='monto')
    op.alter_column('bill_items', 'created_at', new_column_name='creado_en')

    # ---- notification_logs ----
    op.alter_column('notification_logs', 'bill_id', new_column_name='factura_id')
    op.alter_column('notification_logs', 'channel', new_column_name='canal')
    op.alter_column('notification_logs', 'recipient', new_column_name='destinatario')
    op.alter_column('notification_logs', 'status', new_column_name='estado')
    op.alter_column('notification_logs', 'error_message', new_column_name='mensaje_error')
    op.alter_column('notification_logs', 'sent_at', new_column_name='enviado_en')
    op.alter_column('notification_logs', 'created_at', new_column_name='creado_en')

    # ================================================================
    # 2. Renombrar constraints
    # ================================================================
    op.execute('ALTER TABLE property_owners RENAME CONSTRAINT uq_property_owner_period TO uq_propiedad_propietario_periodo')
    op.execute('ALTER TABLE billing_periods RENAME CONSTRAINT uq_period_month_year TO uq_periodo_mes_anio')
    op.execute('ALTER TABLE bills RENAME CONSTRAINT uq_bill_property_period TO uq_factura_propiedad_periodo')

    # ================================================================
    # 3. Renombrar tablas
    # ================================================================
    op.rename_table('properties', 'propiedades')
    op.rename_table('owners', 'propietarios')
    op.rename_table('property_owners', 'propiedad_propietarios')
    op.rename_table('billing_periods', 'periodos_facturacion')
    op.rename_table('bills', 'facturas')
    op.rename_table('bill_items', 'items_factura')
    op.rename_table('notification_logs', 'registro_notificaciones')


def downgrade() -> None:
    # ================================================================
    # 1. Revertir nombres de tablas
    # ================================================================
    op.rename_table('propiedades', 'properties')
    op.rename_table('propietarios', 'owners')
    op.rename_table('propiedad_propietarios', 'property_owners')
    op.rename_table('periodos_facturacion', 'billing_periods')
    op.rename_table('facturas', 'bills')
    op.rename_table('items_factura', 'bill_items')
    op.rename_table('registro_notificaciones', 'notification_logs')

    # ================================================================
    # 2. Revertir constraints
    # ================================================================
    op.execute('ALTER TABLE property_owners RENAME CONSTRAINT uq_propiedad_propietario_periodo TO uq_property_owner_period')
    op.execute('ALTER TABLE billing_periods RENAME CONSTRAINT uq_periodo_mes_anio TO uq_period_month_year')
    op.execute('ALTER TABLE bills RENAME CONSTRAINT uq_factura_propiedad_periodo TO uq_bill_property_period')

    # ================================================================
    # 3. Revertir columnas
    # ================================================================

    # ---- properties ----
    op.alter_column('properties', 'numero_casa', new_column_name='house_number')
    op.alter_column('properties', 'direccion', new_column_name='address')
    op.alter_column('properties', 'alicuota', new_column_name='aliquot')
    op.alter_column('properties', 'notas', new_column_name='notes')
    op.alter_column('properties', 'activo', new_column_name='is_active')
    op.alter_column('properties', 'creado_en', new_column_name='created_at')
    op.alter_column('properties', 'actualizado_en', new_column_name='updated_at')

    # ---- owners ----
    op.alter_column('owners', 'id_usuario_auth', new_column_name='auth_user_id')
    op.alter_column('owners', 'nombre_completo', new_column_name='full_name')
    op.alter_column('owners', 'tipo_documento', new_column_name='id_type')
    op.alter_column('owners', 'numero_documento', new_column_name='id_number')
    op.alter_column('owners', 'correo', new_column_name='email')
    op.alter_column('owners', 'telefono', new_column_name='phone')
    op.alter_column('owners', 'notas', new_column_name='notes')
    op.alter_column('owners', 'activo', new_column_name='is_active')
    op.alter_column('owners', 'creado_en', new_column_name='created_at')
    op.alter_column('owners', 'actualizado_en', new_column_name='updated_at')

    # ---- property_owners ----
    op.alter_column('property_owners', 'propiedad_id', new_column_name='property_id')
    op.alter_column('property_owners', 'propietario_id', new_column_name='owner_id')
    op.alter_column('property_owners', 'es_principal', new_column_name='is_primary')
    op.alter_column('property_owners', 'fecha_inicio', new_column_name='start_date')
    op.alter_column('property_owners', 'fecha_fin', new_column_name='end_date')
    op.alter_column('property_owners', 'creado_en', new_column_name='created_at')

    # ---- billing_periods ----
    op.alter_column('billing_periods', 'mes', new_column_name='month')
    op.alter_column('billing_periods', 'anio', new_column_name='year')
    op.alter_column('billing_periods', 'descripcion', new_column_name='description')
    op.alter_column('billing_periods', 'monto_base', new_column_name='base_amount')
    op.alter_column('billing_periods', 'fecha_vencimiento', new_column_name='due_date')
    op.alter_column('billing_periods', 'estado', new_column_name='status')
    op.alter_column('billing_periods', 'creado_en', new_column_name='created_at')
    op.alter_column('billing_periods', 'actualizado_en', new_column_name='updated_at')

    # ---- bills ----
    op.alter_column('bills', 'numero_factura', new_column_name='bill_number')
    op.alter_column('bills', 'propiedad_id', new_column_name='property_id')
    op.alter_column('bills', 'periodo_facturacion_id', new_column_name='billing_period_id')
    op.alter_column('bills', 'propietario_id', new_column_name='owner_id')
    op.alter_column('bills', 'monto_total', new_column_name='total_amount')
    op.alter_column('bills', 'estado', new_column_name='status')
    op.alter_column('bills', 'url_pdf', new_column_name='pdf_url')
    op.alter_column('bills', 'notas', new_column_name='notes')
    op.alter_column('bills', 'enviado_en', new_column_name='sent_at')
    op.alter_column('bills', 'pagado_en', new_column_name='paid_at')
    op.alter_column('bills', 'creado_en', new_column_name='created_at')
    op.alter_column('bills', 'actualizado_en', new_column_name='updated_at')

    # ---- bill_items ----
    op.alter_column('bill_items', 'factura_id', new_column_name='bill_id')
    op.alter_column('bill_items', 'concepto', new_column_name='concept')
    op.alter_column('bill_items', 'descripcion', new_column_name='description')
    op.alter_column('bill_items', 'monto', new_column_name='amount')
    op.alter_column('bill_items', 'creado_en', new_column_name='created_at')

    # ---- notification_logs ----
    op.alter_column('notification_logs', 'factura_id', new_column_name='bill_id')
    op.alter_column('notification_logs', 'canal', new_column_name='channel')
    op.alter_column('notification_logs', 'destinatario', new_column_name='recipient')
    op.alter_column('notification_logs', 'estado', new_column_name='status')
    op.alter_column('notification_logs', 'mensaje_error', new_column_name='error_message')
    op.alter_column('notification_logs', 'enviado_en', new_column_name='sent_at')
    op.alter_column('notification_logs', 'creado_en', new_column_name='created_at')
