import asyncio
import os
import sys
import logging
import json
from uuid import uuid4
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Setup path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load env
load_dotenv()

from app.db.session import async_session
from app.models.domain import User, Room, RoomMember, Activity, user_favorites, RoomRole
from app.services.ai_service import ai_service

async def create_test_data(db):
    # 1. Create 2 Users
    user1_email = f"test_creator_{uuid4().hex[:8]}@example.com"
    user2_email = f"test_member_{uuid4().hex[:8]}@example.com"
    
    user1 = User(
        id=uuid4(),
        email=user1_email,
        first_name="Test",
        last_name="Creator",
        hashed_password="hashed_password",
        activity_preferences={"social": 8, "active": 7},
        hobbies=["Hiking", "Coding"]
    )
    
    user2 = User(
        id=uuid4(),
        email=user2_email,
        first_name="Test",
        last_name="Member",
        hashed_password="hashed_password",
        activity_preferences={"social": 9, "food": 8},
        hobbies=["Cooking", "Gaming"]
    )
    
    db.add(user1)
    db.add(user2)
    await db.commit()
    logger.info(f"Created users: {user1.email}, {user2.email}")

    # 2. Create Room
    room = Room(
        id=uuid4(),
        name=f"Test Room {uuid4().hex[:6]}",
        created_by_user_id=user1.id,
        invite_code=uuid4().hex[:8].upper()
    )
    db.add(room)
    await db.commit()
    logger.info(f"Created room: {room.name} ({room.id})")

    # 3. Add Member to Room
    member = RoomMember(
        room_id=room.id,
        user_id=user2.id,
        role=RoomRole.member
    )
    db.add(member)
    await db.commit()
    logger.info("Added user2 to room")

    # 4. Fetch Activities & Add Favorites
    activities_result = await db.execute(select(Activity).limit(10))
    activities = activities_result.scalars().all()
    
    if len(activities) < 5:
        logger.warning("Not enough activities found in DB to assign favorites properly.")
    
    # Assign some favorites
    if len(activities) > 0:
        # User 1 likes 0, 1, 2
        for i in range(min(3, len(activities))):
            await db.execute(
                user_favorites.insert().values(user_id=user1.id, activity_id=activities[i].id)
            )
        # User 2 likes 2, 3, 4
        for i in range(min(3, len(activities))):
            idx = i + 2
            if idx < len(activities):
                await db.execute(
                    user_favorites.insert().values(user_id=user2.id, activity_id=activities[idx].id)
                )
    
    await db.commit()
    logger.info("Assigned favorites")
    
    return room.id, user1, user2

async def run_analysis(room_id):
    async with async_session() as db:
        # Re-fetch room to ensure session attachment
        room_result = await db.execute(
            select(Room)
            .options(selectinload(Room.members))
            .where(Room.id == room_id)
        )
        room = room_result.scalar_one()

        # Get all members
        members_result = await db.execute(
            select(User)
            .options(selectinload(User.favorite_activities))
            .where(
                User.id.in_(
                    select(RoomMember.user_id).where(RoomMember.room_id == room_id)
                ) | (User.id == room.created_by_user_id)
            )
        )
        members = members_result.scalars().all()
        
        logger.info(f"Analyzing room with {len(members)} members")

        # Calculate Distribution
        category_counts = {}
        total_favorites = 0
        for member in members:
            for activity in member.favorite_activities:
                cat_val = activity.category.value if hasattr(activity.category, 'value') else str(activity.category)
                category_counts[cat_val] = category_counts.get(cat_val, 0) + 1
                total_favorites += 1
        
        real_distribution = []
        if total_favorites > 0:
            for cat, count in category_counts.items():
                percentage = round((count / total_favorites) * 100, 1)
                real_distribution.append({
                    "category": cat,
                    "percentage": percentage,
                    "count": count
                })
            real_distribution.sort(key=lambda x: x["percentage"], reverse=True)

        logger.info(f"Real Distribution: {json.dumps(real_distribution, indent=2)}")

        # Prepare Data for AI
        members_data = [
            {
                "name": m.name,
                "activity_preferences": m.activity_preferences,
                "hobbies": m.hobbies or [],
            }
            for m in members
        ]

        activities_result = await db.execute(select(Activity))
        activities = activities_result.scalars().all()
        activities_data = [
            {
                "id": str(a.id),
                "listing_id": a.listing_id,
                "title": a.title,
                "category": a.category,
                "est_price_pp": a.est_price_per_person,
                "location_region": a.location_region,
                "season": a.season,
                "primary_goal": a.primary_goal,
                "physical_intensity": a.physical_intensity,
                "social_interaction_level": a.social_interaction_level
            }
            for a in activities
        ]
        
        # Print Summary of Input Data
        print("\n--- Input Data Summary ---")
        print(f"Users in room: {len(members)}")
        print("Favorites per category:")
        for item in real_distribution:
            print(f"  - {item['category']}: {item['count']} ({item['percentage']}%) ")

        # Call AI
        print("\n--- Calling AI Service ---")
        try:
            ai_result = ai_service.analyze_team_preferences(
                room_id=str(room_id),
                members=members_data,
                activities=activities_data,
                current_distribution=real_distribution if total_favorites > 0 else None
            )
            
            print("\n--- AI Analysis Result ---")
            print(json.dumps(ai_result, indent=2, ensure_ascii=False))
            
            print(f"Team Personality: {ai_result.get('teamPersonality')}")
            print(f"Synergy Score: {ai_result.get('synergyScore')}")
            print(f"Team Vibe: {ai_result.get('teamVibe')}")
            print(f"Social Vibe: {ai_result.get('socialVibe')}")
            
        except Exception as e:
            logger.error(f"AI Analysis Failed: {e}")
            # Do NOT import traceback here if it's already imported or just print exception str

async def main():
    async with async_session() as db:
        try:
            room_id, _, _ = await create_test_data(db)
            await run_analysis(room_id)
        except Exception as e:
            logger.error(f"Test failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
