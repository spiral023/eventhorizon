from __future__ import annotations

from typing import Iterable, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Activity, CompanyActivityTravelTime


async def apply_company_travel_times(
    activities: Iterable[Activity],
    company_id: Optional[int],
    db: AsyncSession,
) -> None:
    activity_list = list(activities)
    if not activity_list:
        return

    if company_id is None:
        for activity in activity_list:
            activity.travel_time_from_office_minutes = None
            activity.travel_time_from_office_minutes_walking = None
        return

    activity_ids = [activity.id for activity in activity_list]
    result = await db.execute(
        select(CompanyActivityTravelTime).where(
            CompanyActivityTravelTime.company_id == company_id,
            CompanyActivityTravelTime.activity_id.in_(activity_ids),
        )
    )
    times_map = {row.activity_id: row for row in result.scalars().all()}

    for activity in activity_list:
        travel_time = times_map.get(activity.id)
        if travel_time:
            activity.travel_time_from_office_minutes = travel_time.drive_minutes
            activity.travel_time_from_office_minutes_walking = travel_time.walk_minutes
        else:
            activity.travel_time_from_office_minutes = None
            activity.travel_time_from_office_minutes_walking = None
