"""merge_heads_company_id

Revision ID: b5c9d2e4f7a1
Revises: 24bf56c84187, aa12bb34cc56
Create Date: 2026-02-01 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b5c9d2e4f7a1"
down_revision: Union[str, None] = ("24bf56c84187", "aa12bb34cc56")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
