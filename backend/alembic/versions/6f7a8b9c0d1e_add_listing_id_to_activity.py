"""add listing_id to activity

Revision ID: 6f7a8b9c0d1e
Revises: 7a8b9c0d1e2f
Create Date: 2026-01-14 02:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6f7a8b9c0d1e"
down_revision: Union[str, None] = "7a8b9c0d1e2f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("activity", sa.Column("listing_id", sa.Integer(), nullable=True))
    op.create_index(
        "ix_activity_listing_id", "activity", ["listing_id"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_activity_listing_id", table_name="activity")
    op.drop_column("activity", "listing_id")
