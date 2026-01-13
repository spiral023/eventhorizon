"""remove_risk_level

Revision ID: a1b2c3d4e5f7
Revises: 2d6e7f93f9f4
Create Date: 2026-01-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = '2d6e7f93f9f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the column first
    op.drop_column('activity', 'risk_level')
    
    # Drop the enum type
    # We need to execute raw SQL for dropping enum if we don't want to use specific dialect helpers,
    # but using op.execute is safest for Postgres Enums.
    op.execute("DROP TYPE IF EXISTS risklevel")


def downgrade() -> None:
    # Re-create the enum type
    op.execute("CREATE TYPE risklevel AS ENUM ('low', 'medium', 'high')")
    
    # Re-add the column
    op.add_column('activity', sa.Column('risk_level', 
        postgresql.ENUM('low', 'medium', 'high', name='risklevel', create_type=False),
        nullable=True
    ))
