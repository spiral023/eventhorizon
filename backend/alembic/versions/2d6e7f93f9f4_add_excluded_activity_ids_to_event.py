"""add_excluded_activity_ids_to_event

Revision ID: 2d6e7f93f9f4
Revises: f5d9757931f3
Create Date: 2025-12-12 01:20:45.093176

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2d6e7f93f9f4'
down_revision: Union[str, None] = 'f5d9757931f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('event', sa.Column('excluded_activity_ids', postgresql.ARRAY(sa.UUID()), nullable=True))


def downgrade() -> None:
    op.drop_column('event', 'excluded_activity_ids')