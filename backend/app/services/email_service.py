"""
Email Service für EventHorizon

Handles all email-related functionality:
- User registration & password reset
- Event invitations & reminders
- Booking requests to activity providers
- Event notifications
"""

import os
import resend
from typing import Optional, Dict, Any, List
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = os.getenv("RESEND_API_KEY")

# Jinja2 Template Environment
TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "emails"

# Ensure directory exists to avoid errors on startup if not yet created
if not TEMPLATE_DIR.exists():
    # We might not want to create it here in production, but for dev it helps.
    # Actually, let's just let it fail or wrap in try/except during render if strictly needed,
    # but Environment loader usually expects it to exist.
    pass

try:
    jinja_env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(['html', 'xml'])
    )
except Exception as e:
    logger.warning(f"Could not initialize Jinja2 environment: {e}")
    jinja_env = None


class EmailService:
    """
    Zentraler Email Service

    Alle E-Mails werden über diesen Service versendet.
    Templates werden mit Jinja2 gerendert.
    """

    def __init__(self):
        self.from_email = os.getenv("MAIL_FROM_EMAIL", "noreply@eventhorizon.app")
        self.from_name = os.getenv("MAIL_FROM_NAME", "EventHorizon")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    def _render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render email template with context"""
        if not jinja_env:
            logger.error("Jinja2 environment not initialized.")
            return ""
            
        try:
            template = jinja_env.get_template(template_name)
            return template.render(**context, frontend_url=self.frontend_url)
        except Exception as e:
            logger.error(f"Error rendering template {template_name}: {e}")
            return ""

    async def send_email(
        self,
        to: str | List[str],
        subject: str,
        html_content: str,
        reply_to: Optional[str] = None
    ) -> bool:
        """
        Send email via Resend

        Args:
            to: Recipient email(s)
            subject: Email subject
            html_content: HTML content
            reply_to: Optional reply-to address

        Returns:
            True if successful, False otherwise
        """
        if not os.getenv("RESEND_API_KEY"):
            logger.warning("RESEND_API_KEY not set. Email not sent.")
            logger.info(f"Mock Email to {to}: {subject}")
            return False

        try:
            params = {
                "from": f"{self.from_name} <{self.from_email}>",
                "to": [to] if isinstance(to, str) else to,
                "subject": subject,
                "html": html_content,
            }

            if reply_to:
                params["reply_to"] = reply_to

            response = resend.Emails.send(params)
            logger.info(f"Email sent successfully to {to}: {response}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to}: {str(e)}")
            return False

    # ========================================
    # AUTH EMAILS
    # ========================================

    async def send_welcome_email(self, user_email: str, user_name: str) -> bool:
        """Send welcome email after registration"""
        context = {
            "user_name": user_name,
            "login_url": f"{self.frontend_url}/login"
        }

        html = self._render_template("welcome.html", context)

        return await self.send_email(
            to=user_email,
            subject="Willkommen bei EventHorizon! 🎉",
            html_content=html
        )

    async def send_password_reset_email(
        self,
        user_email: str,
        user_name: str,
        reset_token: str
    ) -> bool:
        """Send password reset email"""
        context = {
            "user_name": user_name,
            "reset_url": f"{self.frontend_url}/reset-password?token={reset_token}",
            "expiry_hours": 24
        }

        html = self._render_template("password_reset.html", context)

        return await self.send_email(
            to=user_email,
            subject="Passwort zurücksetzen - EventHorizon",
            html_content=html
        )

    async def send_email_verification(
        self,
        user_email: str,
        user_name: str,
        verification_token: str
    ) -> bool:
        """Send email verification"""
        context = {
            "user_name": user_name,
            "verify_url": f"{self.frontend_url}/verify-email?token={verification_token}"
        }

        html = self._render_template("email_verification.html", context)

        return await self.send_email(
            to=user_email,
            subject="E-Mail bestätigen - EventHorizon",
            html_content=html
        )

    # ========================================
    # EVENT EMAILS
    # ========================================

    async def send_event_invitation(
        self,
        user_email: str,
        user_name: str,
        event_name: str,
        event_description: str,
        event_id: str,
        organizer_name: str,
        room_name: str
    ) -> bool:
        """Send event invitation"""
        context = {
            "user_name": user_name,
            "event_name": event_name,
            "event_description": event_description,
            "event_url": f"{self.frontend_url}/rooms/{event_id}",  # Note: Room ID is needed, but event_id might be enough if routing handles it, or assuming hierarchy
            "organizer_name": organizer_name,
            "room_name": room_name
        }

        html = self._render_template("event_invitation.html", context)

        return await self.send_email(
            to=user_email,
            subject=f"Einladung: {event_name} 📅",
            html_content=html
        )

    async def send_voting_reminder(
        self,
        user_email: str,
        user_name: str,
        event_name: str,
        event_id: str,
        deadline: str,
        days_remaining: int
    ) -> bool:
        """Send voting reminder"""
        context = {
            "user_name": user_name,
            "event_name": event_name,
            "event_url": f"{self.frontend_url}/events/{event_id}", # Corrected URL assumption
            "deadline": deadline,
            "days_remaining": days_remaining,
            "urgency": "high" if days_remaining <= 1 else "medium" if days_remaining <= 3 else "low"
        }

        html = self._render_template("voting_reminder.html", context)

        subject = "⏰ Erinnerung: Abstimmung läuft ab!" if days_remaining <= 1 else f"Abstimmung für {event_name}"

        return await self.send_email(
            to=user_email,
            subject=subject,
            html_content=html
        )

    async def send_event_update_notification(
        self,
        user_emails: List[str],
        event_name: str,
        event_id: str,
        update_message: str
    ) -> bool:
        """Send notification about event updates"""
        context = {
            "event_name": event_name,
            "event_url": f"{self.frontend_url}/events/{event_id}",
            "update_message": update_message
        }

        html = self._render_template("event_update.html", context)

        return await self.send_email(
            to=user_emails,
            subject=f"Update: {event_name}",
            html_content=html
        )

    async def send_new_event_notification(
        self,
        user_email: str,
        user_name: str,
        event_name: str,
        event_id: str,
        room_name: str,
        creator_name: str
    ) -> bool:
        """Notify room members about new event"""
        context = {
            "user_name": user_name,
            "event_name": event_name,
            "event_url": f"{self.frontend_url}/events/{event_id}",
            "room_name": room_name,
            "creator_name": creator_name
        }

        html = self._render_template("new_event_notification.html", context)

        return await self.send_email(
            to=user_email,
            subject=f"Neues Event in {room_name}: {event_name} 🎉",
            html_content=html
        )

    # ========================================
    # ACTIVITY PROVIDER EMAILS
    # ========================================

    async def send_booking_request_to_provider(
        self,
        provider_email: str,
        provider_name: str,
        activity_title: str,
        event_name: str,
        organizer_name: str,
        organizer_email: str,
        organizer_phone: Optional[str],
        participant_count: int,
        preferred_date: str,
        budget: float,
        additional_notes: Optional[str] = None
    ) -> bool:
        """Send booking request to activity provider"""
        context = {
            "provider_name": provider_name,
            "activity_title": activity_title,
            "event_name": event_name,
            "organizer_name": organizer_name,
            "organizer_email": organizer_email,
            "organizer_phone": organizer_phone,
            "participant_count": participant_count,
            "preferred_date": preferred_date,
            "budget": budget,
            "additional_notes": additional_notes
        }

        html = self._render_template("booking_request.html", context)

        return await self.send_email(
            to=provider_email,
            subject=f"Buchungsanfrage: {activity_title} für {participant_count} Personen",
            html_content=html,
            reply_to=organizer_email
        )

    async def send_booking_confirmation_to_organizer(
        self,
        organizer_email: str,
        organizer_name: str,
        activity_title: str,
        provider_name: str,
        provider_email: str
    ) -> bool:
        """Confirm booking request was sent to organizer"""
        context = {
            "organizer_name": organizer_name,
            "activity_title": activity_title,
            "provider_name": provider_name,
            "provider_email": provider_email
        }

        html = self._render_template("booking_confirmation.html", context)

        return await self.send_email(
            to=organizer_email,
            subject=f"Buchungsanfrage versendet: {activity_title}",
            html_content=html
        )

    # ========================================
    # AI-GENERATED EMAILS
    # ========================================

    async def send_ai_generated_invite(
        self,
        user_email: str,
        subject: str,
        body: str,
        call_to_action_text: str,
        call_to_action_url: str
    ) -> bool:
        """Send AI-generated email (from OpenRouter service)"""
        context = {
            "body": body,
            "cta_text": call_to_action_text,
            "cta_url": call_to_action_url
        }

        html = self._render_template("ai_generated.html", context)

        return await self.send_email(
            to=user_email,
            subject=subject,
            html_content=html
        )


# Singleton instance
email_service = EmailService()
