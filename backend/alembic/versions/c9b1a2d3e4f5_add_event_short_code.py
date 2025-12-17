"""add_event_short_code

Revision ID: c9b1a2d3e4f5
Revises: 37755f5fd702
Create Date: 2025-12-17 02:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import random
import string


# revision identifiers, used by Alembic.
revision: str = 'c9b1a2d3e4f5'
down_revision: Union[str, None] = '37755f5fd702'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ALLOWED_CHARS = ''.join(set(string.ascii_uppercase + string.digits) - {'O', '0', 'I', '1'})


def _generate_short_code() -> str:
    return '-'.join(
        ''.join(random.choice(ALLOWED_CHARS) for _ in range(3))
        for _ in range(3)
    )


def upgrade() -> None:
    op.add_column('event', sa.Column('short_code', sa.String(), nullable=True))

    conn = op.get_bind()
    existing_codes = set(
        code for (code,) in conn.execute(sa.text("SELECT short_code FROM event WHERE short_code IS NOT NULL"))
    )
    events = conn.execute(sa.text("SELECT id FROM event")).fetchall()

    for row in events:
        code = None
        for _ in range(20):
            candidate = _generate_short_code()
            if candidate not in existing_codes:
                code = candidate
                existing_codes.add(candidate)
                break
        if code is None:
            raise RuntimeError("Failed to generate unique event short code during migration")

        conn.execute(
            sa.text("UPDATE event SET short_code = :code WHERE id = :id"),
            {"code": code, "id": row.id},
        )

    op.alter_column('event', 'short_code', existing_type=sa.String(), nullable=False)
    op.create_index('ix_event_short_code', 'event', ['short_code'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_event_short_code', table_name='event')
    op.drop_column('event', 'short_code')
