"""Add slug to Activity model

Revision ID: 84c49b1b97d3
Revises: 37755f5fd702
Create Date: 2025-12-15 20:10:36.294285

"""
from typing import Sequence, Union
import re

from alembic import op
import sqlalchemy as sa
from unidecode import unidecode


# revision identifiers, used by Alembic.
revision: str = '84c49b1b97d3'
down_revision: Union[str, None] = '37755f5fd702'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def generate_slug(title: str) -> str:
    """Generate URL-safe slug from title"""
    # Convert German umlauts to their proper equivalents
    slug = title.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    slug = slug.replace('Ä', 'ae').replace('Ö', 'oe').replace('Ü', 'ue')

    # Lowercase and convert to ASCII
    slug = unidecode(slug.lower())

    # Replace non-alphanumeric with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', slug)

    # Remove leading/trailing hyphens
    slug = slug.strip('-')

    # Collapse multiple hyphens
    slug = re.sub(r'-+', '-', slug)

    # Limit length
    return slug[:200]


def upgrade() -> None:
    # Step 1: Add slug column as nullable
    op.add_column('activity', sa.Column('slug', sa.String(), nullable=True))

    # Step 2: Generate slugs for existing activities
    connection = op.get_bind()
    activities = connection.execute(sa.text("SELECT id, title FROM activity")).fetchall()

    # Track used slugs to ensure uniqueness
    used_slugs = {}

    for activity_id, title in activities:
        base_slug = generate_slug(title)
        slug = base_slug
        counter = 2

        # Ensure unique slug
        while slug in used_slugs:
            slug = f"{base_slug}-{counter}"
            counter += 1

        used_slugs[slug] = activity_id

        # Update activity with slug
        connection.execute(
            sa.text("UPDATE activity SET slug = :slug WHERE id = :id"),
            {"slug": slug, "id": activity_id}
        )

    # Step 3: Make slug NOT NULL
    op.alter_column('activity', 'slug', nullable=False)

    # Step 4: Create unique index
    op.create_index(op.f('ix_activity_slug'), 'activity', ['slug'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_activity_slug'), table_name='activity')
    op.drop_column('activity', 'slug')
