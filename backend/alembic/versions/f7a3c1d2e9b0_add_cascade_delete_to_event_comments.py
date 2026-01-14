"""add_cascade_delete_to_event_comments

Revision ID: f7a3c1d2e9b0
Revises: f5d9757931f3
Create Date: 2026-01-14 04:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f7a3c1d2e9b0"
down_revision: Union[str, None] = "f5d9757931f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("event_comment_event_id_fkey", "event_comment", type_="foreignkey")
    op.create_foreign_key(
        "event_comment_event_id_fkey",
        "event_comment",
        "event",
        ["event_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("event_comment_event_id_fkey", "event_comment", type_="foreignkey")
    op.create_foreign_key(
        "event_comment_event_id_fkey",
        "event_comment",
        "event",
        ["event_id"],
        ["id"],
    )
