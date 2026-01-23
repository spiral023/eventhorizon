"""drop_activity_unused_fields

Revision ID: d7e8f9a0b1c2
Revises: c2d3e4f5a6b7
Create Date: 2026-02-01 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "d7e8f9a0b1c2"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("activity", "travel_time_from_office_minutes_walking")
    op.drop_column("activity", "travel_time_from_office_minutes")
    op.drop_column("activity", "price_includes")
    op.drop_column("activity", "gallery_urls")
    op.drop_column("activity", "duration")
    op.drop_column("activity", "accessibility_flags")
    op.drop_column("activity", "description")


def downgrade() -> None:
    op.add_column("activity", sa.Column("description", sa.Text(), nullable=True))
    op.add_column(
        "activity",
        sa.Column("accessibility_flags", postgresql.ARRAY(sa.String()), nullable=True),
    )
    op.add_column("activity", sa.Column("duration", sa.String(), nullable=True))
    op.add_column(
        "activity",
        sa.Column("gallery_urls", postgresql.ARRAY(sa.String()), nullable=True),
    )
    op.add_column("activity", sa.Column("price_includes", sa.Text(), nullable=True))
    op.add_column("activity", sa.Column("travel_time_from_office_minutes", sa.Integer(), nullable=True))
    op.add_column(
        "activity",
        sa.Column("travel_time_from_office_minutes_walking", sa.Integer(), nullable=True),
    )
