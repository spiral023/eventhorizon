import re
from uuid import UUID
from typing import Optional
from unidecode import unidecode
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import Activity


def generate_slug(title: str) -> str:
    """
    Generate URL-safe slug from title.

    Converts German umlauts to their proper equivalents:
    - ä → ae, ö → oe, ü → ue, ß → ss

    Args:
        title: The activity title to convert

    Returns:
        URL-safe slug string
    """
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


async def ensure_unique_slug(base_slug: str, db: AsyncSession, exclude_id: Optional[UUID] = None) -> str:
    """
    Ensure slug is unique by appending a counter if needed.

    Args:
        base_slug: The base slug to check/modify
        db: Database session
        exclude_id: Optional activity ID to exclude from uniqueness check

    Returns:
        Unique slug string
    """
    slug = base_slug
    counter = 2

    while True:
        query = select(Activity).where(Activity.slug == slug)
        if exclude_id:
            query = query.where(Activity.id != exclude_id)

        result = await db.execute(query)
        if not result.scalar_one_or_none():
            return slug

        slug = f"{base_slug}-{counter}"
        counter += 1


async def generate_unique_slug(title: str, db: AsyncSession, exclude_id: Optional[UUID] = None) -> str:
    """
    Generate a unique slug from title.

    Args:
        title: The activity title
        db: Database session
        exclude_id: Optional activity ID to exclude from uniqueness check

    Returns:
        Unique slug string
    """
    base_slug = generate_slug(title)
    return await ensure_unique_slug(base_slug, db, exclude_id)
