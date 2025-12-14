"""merge_heads

Revision ID: 40a1b2c3d4e5
Revises: 3f8e9d0a1b2c, f5d9757931f3
Create Date: 2025-12-14 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '40a1b2c3d4e5'
down_revision: Union[str, Sequence[str], None] = ('3f8e9d0a1b2c', 'f5d9757931f3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
