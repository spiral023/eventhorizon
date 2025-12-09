"""Add invite_code to room

Revision ID: d6e7f8g9h0i1
Revises: c5f4ed7c9c4f
Create Date: 2025-12-09 00:00:00.000000
"""
from typing import Sequence, Union
import random
import string

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d6e7f8g9h0i1"
down_revision: Union[str, None] = "c5f4ed7c9c4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def generate_invite_code() -> str:
    """Generate a random room invite code in format XXX-XXX-XXX."""
    allowed_chars = ''.join(set(string.ascii_uppercase + string.digits) - {'O', '0', 'I', '1'})
    code_parts = []
    for _ in range(3):
        part = ''.join(random.choice(allowed_chars) for _ in range(3))
        code_parts.append(part)
    return '-'.join(code_parts)


def upgrade() -> None:
    # Add invite_code column as nullable first
    op.add_column("room", sa.Column("invite_code", sa.String(), nullable=True))

    # Get connection to execute raw SQL
    connection = op.get_bind()

    # Backfill existing rooms with unique invite codes
    result = connection.execute(sa.text('SELECT id FROM room'))
    for row in result:
        room_id = row[0]
        # Generate a unique code (with retry logic in case of collision)
        max_retries = 10
        for attempt in range(max_retries):
            code = generate_invite_code()
            # Check if code already exists
            existing = connection.execute(
                sa.text('SELECT COUNT(*) FROM room WHERE invite_code = :code'),
                {"code": code}
            ).scalar()
            if existing == 0:
                # Update room with unique code
                connection.execute(
                    sa.text('UPDATE room SET invite_code = :code WHERE id = :room_id'),
                    {"code": code, "room_id": room_id}
                )
                break

    # Make invite_code NOT NULL after backfill
    op.alter_column("room", "invite_code", nullable=False)

    # Create unique index for invite_code
    op.create_index(op.f("ix_room_invite_code"), "room", ["invite_code"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_room_invite_code"), table_name="room")
    op.drop_column("room", "invite_code")
