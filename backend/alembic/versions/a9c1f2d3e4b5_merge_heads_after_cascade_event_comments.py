"""merge_heads_after_cascade_event_comments

Revision ID: a9c1f2d3e4b5
Revises: 6f7a8b9c0d1e, f7a3c1d2e9b0
Create Date: 2026-01-14 05:05:00.000000

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "a9c1f2d3e4b5"
down_revision: Union[str, Sequence[str], None] = ("6f7a8b9c0d1e", "f7a3c1d2e9b0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
