"""merge heads after parallel migrations

Revision ID: ed2bfd858e14
Revises: 84c49b1b97d3, c9b1a2d3e4f5
Create Date: 2025-12-17 02:13:01.451347

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed2bfd858e14'
down_revision: Union[str, None] = ('84c49b1b97d3', 'c9b1a2d3e4f5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
