"""add_social_links_to_activity

Revision ID: a7c4e6f8c9d0
Revises: e46f7d678dc3
Create Date: 2025-12-11 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7c4e6f8c9d0'
down_revision = 'e46f7d678dc3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('activity', sa.Column('facebook', sa.String(), nullable=True))
    op.add_column('activity', sa.Column('instagram', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('activity', 'instagram')
    op.drop_column('activity', 'facebook')
