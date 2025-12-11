# E-Mail System Implementation für EventHorizon

## Übersicht

Diese Dokumentation beschreibt die Integration eines E-Mail-Systems für:
- Benutzerregistrierung & Passwort zurücksetzen
- Event-Einladungen & Erinnerungen
- Voting-Reminders
- Automatisierte Buchungsanfragen an Aktivitäts-Anbieter
- Benachrichtigungen über neue Events

## Architektur

```
┌─────────────────────────────────────────┐
│  FastAPI Backend                        │
│  ├── Email Service Layer                │
│  ├── Template Engine (Jinja2)           │
│  └── Task Queue (optional: Celery)      │
└─────────────────────────────────────────┘
         ↓ API Call
┌─────────────────────────────────────────┐
│  Resend API (oder SendGrid)             │
│  - Transactional Emails                 │
│  - Template Management                  │
│  - Analytics                            │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  Empfänger (User, Aktivitäts-Anbieter)  │
└─────────────────────────────────────────┘
```

---

## Setup

### 1. Dependencies hinzufügen

**backend/requirements.txt:**
```txt
# Existing dependencies...
openai==1.3.7
python-dotenv==1.0.0
httpx==0.25.2

# Email dependencies
resend==2.0.0
jinja2==3.1.2
```

### 2. Environment Variables

**docker-compose.dev.yml:**
```yaml
backend:
  environment:
    # ... existing vars

    # Email Configuration
    RESEND_API_KEY: ${RESEND_API_KEY}
    MAIL_FROM_EMAIL: ${MAIL_FROM_EMAIL:-noreply@eventhorizon.app}
    MAIL_FROM_NAME: ${MAIL_FROM_NAME:-EventHorizon}
    FRONTEND_URL: ${FRONTEND_URL:-http://localhost:5173}
```

**.env (Root):**
```env
# Resend API Key (get at: https://resend.com/api-keys)
RESEND_API_KEY=re_your_key_here

# Email Settings
MAIL_FROM_EMAIL=noreply@yourdomain.com
MAIL_FROM_NAME=EventHorizon
FRONTEND_URL=http://localhost:5173
```

---

## Backend Implementation

### 3. Email Service Layer

**backend/app/services/email_service.py:**

```python
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
jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(['html', 'xml'])
)


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
        template = jinja_env.get_template(template_name)
        return template.render(**context, frontend_url=self.frontend_url)

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
            "event_url": f"{self.frontend_url}/rooms/{event_id}",
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
            "event_url": f"{self.frontend_url}/rooms/{event_id}",
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
            "event_url": f"{self.frontend_url}/rooms/{event_id}",
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
            "event_url": f"{self.frontend_url}/rooms/{event_id}",
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
```

---

## Email Templates

### 4. Template-Struktur erstellen

Erstelle das Template-Verzeichnis:

```bash
backend/
├── app/
│   ├── templates/
│   │   └── emails/
│   │       ├── base.html                    # Base template
│   │       ├── welcome.html                 # Registration
│   │       ├── password_reset.html          # Password reset
│   │       ├── email_verification.html      # Email verification
│   │       ├── event_invitation.html        # Event invites
│   │       ├── voting_reminder.html         # Voting reminders
│   │       ├── event_update.html            # Event updates
│   │       ├── new_event_notification.html  # New event alerts
│   │       ├── booking_request.html         # Provider booking requests
│   │       ├── booking_confirmation.html    # Organizer confirmation
│   │       └── ai_generated.html            # AI-generated content
```

### 5. Base Template

**backend/app/templates/emails/base.html:**

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}EventHorizon{% endblock %}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #3b82f6;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
        }
        .content {
            padding: 20px 0;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #3b82f6;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #2563eb;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        h1 { color: #1f2937; margin-bottom: 20px; }
        p { margin: 15px 0; }
        .highlight {
            background-color: #eff6ff;
            padding: 15px;
            border-left: 4px solid #3b82f6;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 EventHorizon</div>
        </div>
        <div class="content">
            {% block content %}{% endblock %}
        </div>
        <div class="footer">
            <p>© 2025 EventHorizon | <a href="{{ frontend_url }}">Zur App</a></p>
            <p>Du erhältst diese E-Mail, weil du bei EventHorizon registriert bist.</p>
        </div>
    </div>
</body>
</html>
```

### 6. Beispiel-Templates

**welcome.html:**
```html
{% extends "base.html" %}

{% block content %}
<h1>Willkommen bei EventHorizon, {{ user_name }}! 🎉</h1>

<p>Schön, dass du dabei bist!</p>

<p>EventHorizon hilft dir dabei, unvergessliche Team-Events zu planen – von der Ideenfindung über die Abstimmung bis zur finalen Organisation.</p>

<div class="highlight">
    <strong>Was du jetzt tun kannst:</strong>
    <ul>
        <li>Einem Room beitreten oder einen eigenen erstellen</li>
        <li>Aktivitäten entdecken und favorisieren</li>
        <li>Events planen und dein Team abstimmen lassen</li>
    </ul>
</div>

<a href="{{ login_url }}" class="button">Jetzt loslegen</a>

<p>Viel Spaß beim Event-Planen!</p>
<p>Dein EventHorizon Team</p>
{% endblock %}
```

**voting_reminder.html:**
```html
{% extends "base.html" %}

{% block content %}
<h1>⏰ Abstimmung läuft bald ab!</h1>

<p>Hallo {{ user_name }},</p>

<p>Die Abstimmung für <strong>{{ event_name }}</strong> endet in
{% if days_remaining == 0 %}
    heute!
{% elif days_remaining == 1 %}
    morgen!
{% else %}
    {{ days_remaining }} Tagen.
{% endif %}
</p>

<div class="highlight">
    <strong>Deadline:</strong> {{ deadline }}
</div>

<p>Deine Stimme zählt! Hilf deinem Team, das perfekte Event zu finden.</p>

<a href="{{ event_url }}" class="button">Jetzt abstimmen</a>

<p>Beste Grüße,<br>Dein EventHorizon Team</p>
{% endblock %}
```

**booking_request.html:**
```html
{% extends "base.html" %}

{% block content %}
<h1>Neue Buchungsanfrage für {{ activity_title }}</h1>

<p>Hallo {{ provider_name }},</p>

<p>Sie haben eine neue Buchungsanfrage über EventHorizon erhalten.</p>

<div class="highlight">
    <h3>Anfrage-Details:</h3>
    <ul>
        <li><strong>Aktivität:</strong> {{ activity_title }}</li>
        <li><strong>Event:</strong> {{ event_name }}</li>
        <li><strong>Teilnehmerzahl:</strong> {{ participant_count }} Personen</li>
        <li><strong>Gewünschter Termin:</strong> {{ preferred_date }}</li>
        <li><strong>Budget:</strong> ca. {{ budget }}€ pro Person</li>
    </ul>
</div>

<h3>Kontaktperson:</h3>
<p>
    <strong>{{ organizer_name }}</strong><br>
    E-Mail: <a href="mailto:{{ organizer_email }}">{{ organizer_email }}</a><br>
    {% if organizer_phone %}
    Telefon: {{ organizer_phone }}<br>
    {% endif %}
</p>

{% if additional_notes %}
<div class="highlight">
    <strong>Zusätzliche Hinweise:</strong>
    <p>{{ additional_notes }}</p>
</div>
{% endif %}

<p>Bitte kontaktieren Sie {{ organizer_name }} direkt, um die Buchung zu besprechen.</p>

<p>Mit freundlichen Grüßen,<br>Das EventHorizon Team</p>
{% endblock %}
```

---

## API Integration

### 7. Email Endpoints

**backend/app/api/endpoints/emails.py:**

```python
"""
Email-related API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from app.services.email_service import email_service
from app.api.deps import get_current_user
from app.models.domain import User

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

    # Send to provider
    success = await email_service.send_booking_request_to_provider(
        provider_email=activity.contact_email,
        provider_name=activity.provider,
        activity_title=activity.title,
        event_name=event.name,
        organizer_name=current_user.name,
        organizer_email=current_user.email,
        organizer_phone=current_user.phone,
        participant_count=booking.participant_count,
        preferred_date=booking.preferred_date,
        budget=event.budget_amount,
        additional_notes=booking.additional_notes
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send booking request")

    # Send confirmation to organizer
    await email_service.send_booking_confirmation_to_organizer(
        organizer_email=current_user.email,
        organizer_name=current_user.name,
        activity_title=activity.title,
        provider_name=activity.provider,
        provider_email=activity.contact_email
    )

    return {"success": True, "message": "Booking request sent"}
```

### 8. Integrate with Auth

Update **backend/app/api/endpoints/auth.py**:

```python
from app.services.email_service import email_service

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # ... existing registration code ...

    # Send welcome email
    await email_service.send_welcome_email(
        user_email=user.email,
        user_name=user.name
    )

    return token
```

### 9. Integrate with AI Service

Update AI service to actually send emails:

```python
# In ai.py endpoints

@router.post("/events/{event_id}/invites", response_model=dict)
async def send_event_invites(...):
    # ... existing code ...

    for participant in event.participants:
        user = ...
        invite = ai_service.generate_event_invite(...)

        # Actually send the email!
        await email_service.send_ai_generated_invite(
            user_email=user.email,
            subject=invite["subject"],
            body=invite["body"],
            call_to_action_text=invite["callToAction"],
            call_to_action_url=f"{frontend_url}/rooms/{room_id}/events/{event_id}"
        )
```

---

## Async Task Queue (Optional, für Production)

Für bessere Performance kannst du E-Mails asynchron versenden:

### Mit Celery + Redis

**docker-compose.dev.yml:**
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  celery:
    build: ./backend
    command: celery -A app.celery worker --loglevel=info
    depends_on:
      - redis
      - db
    environment:
      CELERY_BROKER_URL: redis://redis:6379/0
```

**backend/app/celery.py:**
```python
from celery import Celery

celery_app = Celery(
    "eventhorizon",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

@celery_app.task
def send_email_task(to, subject, html_content, reply_to=None):
    # Email sending logic
    pass
```

Dann in deinem Service:
```python
# Synchron (blockiert Request)
await email_service.send_email(...)

# Asynchron (Background Task)
send_email_task.delay(to, subject, html_content)
```

---

## Testing

### 10. Test E-Mail Versand

```bash
# Im Backend-Container
curl -X POST http://localhost:8000/api/v1/emails/booking-request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activity_id": "activity-uuid",
    "event_id": "event-uuid",
    "participant_count": 15,
    "preferred_date": "2025-07-15",
    "additional_notes": "Wir hätten gerne eine vegetarische Option"
  }'
```

---

## Kosten-Übersicht

### Resend Pricing
- **Free Tier**: 3.000 E-Mails/Monat, 100/Tag
- **Pro**: $20/Monat für 50.000 E-Mails
- **Enterprise**: Custom
