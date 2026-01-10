"""remove_user_profile_fields

Revision ID: 4f3e2d1c0b9a
Revises: ed2bfd858e14
Create Date: 2026-01-10 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4f3e2d1c0b9a'
down_revision: Union[str, None] = 'ed2bfd858e14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Drop columns from user table
    op.drop_column('user', 'budget_preference')
    op.drop_column('user', 'travel_willingness')
    op.drop_column('user', 'preferred_group_size')

def downgrade() -> None:
    # Add columns back
    op.add_column('user', sa.Column('preferred_group_size', sa.String(), nullable=True))
    op.add_column('user', sa.Column('travel_willingness', sa.String(), nullable=True))
    op.add_column('user', sa.Column('budget_preference', sa.String(), nullable=True))
