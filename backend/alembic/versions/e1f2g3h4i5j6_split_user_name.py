"""Split user name into first and last name

Revision ID: e1f2g3h4i5j6
Revises: d6e7f8g9h0i1
Create Date: 2025-12-10 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e1f2g3h4i5j6'
down_revision: Union[str, None] = 'd6e7f8g9h0i1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add new columns
    op.add_column('user', sa.Column('first_name', sa.String(), nullable=True))
    op.add_column('user', sa.Column('last_name', sa.String(), nullable=True))

    # Data migration
    connection = op.get_bind()
    # Use text() for raw SQL
    users = connection.execute(sa.text('SELECT id, name FROM "user"')).fetchall()
    
    for user in users:
        # Tuple unpacking depends on driver, usually it returns row proxy or tuple
        user_id = user[0]
        name = user[1]
        
        parts = name.strip().split(' ', 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""
        
        connection.execute(
            sa.text('UPDATE "user" SET first_name = :first, last_name = :last WHERE id = :id'),
            {"first": first_name, "last": last_name, "id": user_id}
        )
    
    # Make columns not null
    op.alter_column('user', 'first_name', nullable=False)
    op.alter_column('user', 'last_name', nullable=False)
    
    # Drop old columns
    op.drop_column('user', 'name')
    # User requested username to be removed/not needed.
    # It seems safe to drop it as email is unique/index.
    op.drop_index("ix_user_username", table_name="user")
    op.drop_column('user', 'username')

def downgrade() -> None:
    op.add_column('user', sa.Column('username', sa.String(), nullable=True))
    op.add_column('user', sa.Column('name', sa.String(), nullable=True))
    
    # Data migration reverse
    connection = op.get_bind()
    users = connection.execute(sa.text('SELECT id, first_name, last_name, email FROM "user"')).fetchall()
    
    for user in users:
        user_id = user[0]
        first_name = user[1]
        last_name = user[2]
        email = user[3]
        
        name = f"{first_name} {last_name}".strip()
        username = email # Fallback
        
        connection.execute(
            sa.text('UPDATE "user" SET name = :name, username = :username WHERE id = :id'),
            {"name": name, "username": username, "id": user_id}
        )

    op.alter_column('user', 'name', nullable=False)
    op.alter_column('user', 'username', nullable=False)
    op.create_index("ix_user_username", "user", ["username"], unique=True)
    
    op.drop_column('user', 'last_name')
    op.drop_column('user', 'first_name')
