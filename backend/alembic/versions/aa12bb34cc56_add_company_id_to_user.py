"""add_company_id_to_user

Revision ID: aa12bb34cc56
Revises: f7a3c1d2e9b0
Create Date: 2026-02-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "aa12bb34cc56"
down_revision: Union[str, None] = "f7a3c1d2e9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user", sa.Column("company_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "company_id")
