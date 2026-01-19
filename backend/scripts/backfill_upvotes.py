import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, func
from app.db.session import async_session
from app.models.domain import Activity, Vote, VoteType

async def backfill_upvotes():
    async with async_session() as db:
        print("Backfilling total_upvotes for all activities...")
        
        # Get all activities
        result = await db.execute(select(Activity))
        activities = result.scalars().all()
        
        updated_count = 0
        
        for activity in activities:
            # Count unique users who voted 'for' this activity
            # Note: VoteType.for_ is the enum value
            stmt = select(func.count(func.distinct(Vote.user_id))).where(
                Vote.activity_id == activity.id,
                Vote.vote == VoteType.for_
            )
            count_result = await db.execute(stmt)
            upvotes = count_result.scalar() or 0
            
            if activity.total_upvotes != upvotes:
                print(f"Updating '{activity.title}': {activity.total_upvotes} -> {upvotes}")
                activity.total_upvotes = upvotes
                updated_count += 1
                db.add(activity)
        
        await db.commit()
        print(f"Done. Updated {updated_count} activities.")

if __name__ == "__main__":
    asyncio.run(backfill_upvotes())