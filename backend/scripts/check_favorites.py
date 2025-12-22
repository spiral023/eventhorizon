import asyncio
import os
import sys

# Add parent directory to path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, func
from app.db.session import async_session
from app.models.domain import User, user_favorites, Activity, Room, RoomMember

async def check_favorites():
    async with async_session() as db:
        # Check total favorites count
        result = await db.execute(select(func.count()).select_from(user_favorites))
        count = result.scalar()
        print(f"Total favorites in DB: {count}")

        if count == 0:
            print("No favorites found! Go to the Activities page and like some activities.")
            return

        # Check favorites by user
        stmt = select(User.email, Activity.title, Activity.category).join(User.favorite_activities)
        result = await db.execute(stmt)
        rows = result.all()
        
        print("\n--- User Favorites ---")
        for email, title, category in rows:
            print(f"User: {email} | Activity: {title} | Category: {category}")

        # Check Room Memberships
        print("\n--- Room Members ---")
        stmt = select(Room.name, User.email).select_from(RoomMember).join(Room, RoomMember.room_id == Room.id).join(User, RoomMember.user_id == User.id)
        result = await db.execute(stmt)
        for room_name, user_email in result.all():
            print(f"Room: {room_name} | User: {user_email}")

if __name__ == "__main__":
    asyncio.run(check_favorites())
