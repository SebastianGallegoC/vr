"""correo_telefono_to_arrays

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-11 00:00:00.000000

Convierte correo (string) a correos (array) y telefono (string nullable)
a telefonos (array) en la tabla propietarios.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Agregar columnas array nuevas
    op.add_column('propietarios', sa.Column('correos', ARRAY(sa.String(254)), nullable=True))
    op.add_column('propietarios', sa.Column('telefonos', ARRAY(sa.String(20)), nullable=True))

    # 2. Migrar datos existentes: correo → correos, telefono → telefonos
    op.execute("""
        UPDATE propietarios
        SET correos = CASE
                WHEN correo IS NOT NULL AND correo != '' THEN ARRAY[correo]
                ELSE ARRAY[]::varchar(254)[]
            END,
            telefonos = CASE
                WHEN telefono IS NOT NULL AND telefono != '' THEN ARRAY[telefono]
                ELSE ARRAY[]::varchar(20)[]
            END
    """)

    # 3. Hacer correos NOT NULL ahora que tiene datos
    op.alter_column('propietarios', 'correos', nullable=False)
    op.alter_column('propietarios', 'telefonos', nullable=False)

    # 4. Eliminar columnas viejas
    op.drop_index('ix_owners_email', table_name='propietarios')
    op.drop_column('propietarios', 'correo')
    op.drop_column('propietarios', 'telefono')


def downgrade() -> None:
    # 1. Recrear columnas singulares
    op.add_column('propietarios', sa.Column('correo', sa.String(254), nullable=True))
    op.add_column('propietarios', sa.Column('telefono', sa.String(20), nullable=True))

    # 2. Migrar datos: tomar el primer elemento del array
    op.execute("""
        UPDATE propietarios
        SET correo = CASE
                WHEN correos IS NOT NULL AND array_length(correos, 1) > 0 THEN correos[1]
                ELSE ''
            END,
            telefono = CASE
                WHEN telefonos IS NOT NULL AND array_length(telefonos, 1) > 0 THEN telefonos[1]
                ELSE NULL
            END
    """)

    # 3. Hacer correo NOT NULL
    op.alter_column('propietarios', 'correo', nullable=False)

    # 4. Recrear index y eliminar columnas array
    op.create_index('ix_owners_email', 'propietarios', ['correo'], unique=False)
    op.drop_column('propietarios', 'correos')
    op.drop_column('propietarios', 'telefonos')
