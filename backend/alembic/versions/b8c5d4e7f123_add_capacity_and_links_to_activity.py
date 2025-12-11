"""add_capacity_and_links_to_activity

Revision ID: b8c5d4e7f123
Revises: a7c4e6f8c9d0
Create Date: 2025-12-11 10:40:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b8c5d4e7f123'
down_revision = 'a7c4e6f8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('activity', sa.Column('max_capacity', sa.Integer(), nullable=True))
    op.add_column('activity', sa.Column('outdoor_seating', sa.Boolean(), nullable=True))
    op.add_column('activity', sa.Column('reservation_url', sa.String(), nullable=True))
    op.add_column('activity', sa.Column('menu_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('activity', 'menu_url')
    op.drop_column('activity', 'reservation_url')
    op.drop_column('activity', 'outdoor_seating')
    op.drop_column('activity', 'max_capacity')
