"""
Email-related API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.email_service import email_service
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.domain import User, Activity, Event

router = APIRouter(prefix="/emails", tags=["emails"])


class BookingRequestInput(BaseModel):
    """Booking request data"""
    activity_id: str
    event_id: str
    participant_count: int = Field(gt=0)
    preferred_date: str
    additional_notes: Optional[str] = None


@router.post("/booking-request")
async def send_booking_request(
    booking: BookingRequestInput,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send booking request to activity provider

    Organizer can request booking for selected activity
    """

    # Get activity details
    activity = await db.get(Activity, booking.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get event details
    event = await db.get(Event, booking.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Verify user is organizer
    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only event organizer can send booking requests")

    if not activity.contact_email:
        raise HTTPException(status_code=400, detail="Activity has no contact email")

    # Send to provider
    success = await email_service.send_booking_request_to_provider(
        provider_email=activity.contact_email,
        provider_name=activity.provider or "Activity Provider",
        activity_title=activity.title,
        event_name=event.name,
        organizer_name=current_user.name,
        organizer_email=current_user.email,
        organizer_phone=current_user.phone,
        participant_count=booking.participant_count,
        preferred_date=booking.preferred_date,
        budget=event.budget_amount if event.budget_amount else 0,
        additional_notes=booking.additional_notes
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send booking request")

    # Send confirmation to organizer
    await email_service.send_booking_confirmation_to_organizer(
        organizer_email=current_user.email,
        organizer_name=current_user.name,
        activity_title=activity.title,
        provider_name=activity.provider or "Activity Provider",
        provider_email=activity.contact_email
    )

    return {"success": True, "message": "Booking request sent"}
