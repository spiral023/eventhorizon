"""Add auth fields to user (username, hashed_password, is_active)

Revision ID: c5f4ed7c9c4f
Revises: 4e2e81349cee
Create Date: 2025-12-08 21:45:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c5f4ed7c9c4f"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns with temporary nullability/defaults to backfill existing rows
    op.add_column("user", sa.Column("username", sa.String(), nullable=True))
    op.add_column("user", sa.Column("hashed_password", sa.String(), nullable=True))
    op.add_column(
        "user",
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )

    # Backfill username from email where missing
    op.execute('UPDATE "user" SET username = email WHERE username IS NULL')
    # Backfill hashed_password with empty string placeholder to satisfy NOT NULL constraint
    op.execute('UPDATE "user" SET hashed_password = \'\' WHERE hashed_password IS NULL')

    # Enforce NOT NULL after backfill
    op.alter_column("user", "username", nullable=False)
    op.alter_column("user", "hashed_password", nullable=False)

    # Unique index for username
    op.create_index(op.f("ix_user_username"), "user", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_username"), table_name="user")
    op.drop_column("user", "is_active")
    op.drop_column("user", "hashed_password")
    op.drop_column("user", "username")
