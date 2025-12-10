"""Add missing user profile fields

Revision ID: f3g4h5i6j7k8
Revises: e1f2g3h4i5j6
Create Date: 2025-12-10 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f3g4h5i6j7k8'
down_revision: Union[str, None] = 'e1f2g3h4i5j6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('user', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('user', sa.Column('position', sa.String(), nullable=True))
    op.add_column('user', sa.Column('location', sa.String(), nullable=True))
    op.add_column('user', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('user', sa.Column('hobbies', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('user', sa.Column('activity_preferences', sa.JSON(), nullable=True))
    op.add_column('user', sa.Column('dietary_restrictions', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('user', sa.Column('allergies', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('user', sa.Column('preferred_group_size', sa.String(), nullable=True))
    op.add_column('user', sa.Column('travel_willingness', sa.String(), nullable=True))
    op.add_column('user', sa.Column('budget_preference', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('user', 'budget_preference')
    op.drop_column('user', 'travel_willingness')
    op.drop_column('user', 'preferred_group_size')
    op.drop_column('user', 'allergies')
    op.drop_column('user', 'dietary_restrictions')
    op.drop_column('user', 'activity_preferences')
    op.drop_column('user', 'hobbies')
    op.drop_column('user', 'bio')
    op.drop_column('user', 'location')
    op.drop_column('user', 'position')
    op.drop_column('user', 'phone')
