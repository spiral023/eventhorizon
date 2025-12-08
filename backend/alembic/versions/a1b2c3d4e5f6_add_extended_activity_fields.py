"""Add extended activity fields

Revision ID: a1b2c3d4e5f6
Revises: 4e2e81349cee
Create Date: 2025-12-08 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '4e2e81349cee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('activity', sa.Column('accessibility_flags', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('activity', sa.Column('weather_dependent', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('activity', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('activity', sa.Column('external_rating', sa.Float(), nullable=True))
    op.add_column('activity', sa.Column('travel_time_from_office_minutes', sa.Integer(), nullable=True))
    op.add_column('activity', sa.Column('travel_time_from_office_minutes_walking', sa.Integer(), nullable=True))
    op.add_column('activity', sa.Column('primary_goal', sa.String(), nullable=True))
    op.add_column('activity', sa.Column('competition_level', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('activity', 'competition_level')
    op.drop_column('activity', 'primary_goal')
    op.drop_column('activity', 'travel_time_from_office_minutes_walking')
    op.drop_column('activity', 'travel_time_from_office_minutes')
    op.drop_column('activity', 'external_rating')
    op.drop_column('activity', 'description')
    op.drop_column('activity', 'weather_dependent')
    op.drop_column('activity', 'accessibility_flags')
