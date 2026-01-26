import asyncio
import logging
import sys
import os

# Add the parent directory to sys.path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, and_, update
from app.db.session import async_session
from app.models.domain import Room, RoomMember, RoomRole, User
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_room_memberships():
    async with async_session() as db:
        logger.info("Starting room membership fix...")
        
        # 1. Fetch all rooms
        result = await db.execute(select(Room))
        rooms = result.scalars().all()
        logger.info(f"Found {len(rooms)} rooms.")

        fixed_count = 0
        
        for room in rooms:
            if not room.created_by_user_id:
                logger.warning(f"Room {room.id} ({room.name}) has no creator. Skipping.")
                continue

            # Check if creator is already a member
            member_check = await db.execute(
                select(RoomMember).where(
                    and_(
                        RoomMember.room_id == room.id,
                        RoomMember.user_id == room.created_by_user_id
                    )
                )
            )
            existing_member = member_check.scalar_one_or_none()

            if not existing_member:
                logger.info(f"Adding creator {room.created_by_user_id} to room {room.id} ({room.name})...")
                new_member = RoomMember(
                    room_id=room.id,
                    user_id=room.created_by_user_id,
                    role=RoomRole.owner,
                    joined_at=datetime.utcnow()
                )
                db.add(new_member)
                fixed_count += 1
            else:
                # Optional: Ensure role is owner if they are the creator
                if existing_member.role != RoomRole.owner:
                    logger.info(f"Updating role for creator in room {room.name} to owner.")
                    existing_member.role = RoomRole.owner
                    db.add(existing_member) # Mark for update
                    fixed_count += 1

        # 2. Backfill is_birthday_private = False where NULL
        logger.info("Backfilling missing is_birthday_private values...")
        update_result = await db.execute(
            update(User)
            .where(User.is_birthday_private == None)
            .values(is_birthday_private=False)
        )
        # update_result.rowcount is not always available with asyncpg/sqlalchemy in this context depending on version, 
        # but let's try to commit.
        
        await db.commit()
        logger.info(f"Successfully fixed {fixed_count} room memberships.")
        logger.info("Finished.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(fix_room_memberships())
