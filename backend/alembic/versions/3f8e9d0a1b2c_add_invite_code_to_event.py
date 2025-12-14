"""add_invite_code_to_event

Revision ID: 3f8e9d0a1b2c
Revises: 2d6e7f93f9f4
Create Date: 2025-12-14 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f8e9d0a1b2c'
down_revision: Union[str, None] = '2d6e7f93f9f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('event', sa.Column('invite_code', sa.String(), nullable=True))
    op.create_index(op.f('ix_event_invite_code'), 'event', ['invite_code'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_event_invite_code'), table_name='event')
    op.drop_column('event', 'invite_code')
