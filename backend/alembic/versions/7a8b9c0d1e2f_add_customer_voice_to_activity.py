"""add customer_voice to activity

Revision ID: 7a8b9c0d1e2f
Revises: b1c2d3e4f5g6
Create Date: 2026-01-13 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, None] = 'b1c2d3e4f5g6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('activity', sa.Column('customer_voice', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('activity', 'customer_voice')
