import asyncio
import sys
import os
from datetime import datetime

# Pfad erweitern, damit 'app' gefunden wird
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.email_service import email_service

async def send_test():
    recipient = "philipp.asanger@gmail.com"
    print(f"Sende Test-Buchungsanfrage an {recipient}...")

    try:
        success = await email_service.send_booking_request_email(
            provider_email=recipient,
            provider_name="Test Provider GmbH",
            activity_title="Laser Tag Extreme",
            participant_count=12,
            requested_date="24.12.2025",
            start_time="14:00",
            end_time="16:00",
            contact_name="Max Mustermann",
            contact_email="max.mustermann@example.com",
            contact_phone="+43 664 1234567",
            notes="Wir haben zwei Vegetarier dabei und würden gerne im Anschluss den Seminarraum nutzen."
        )

        if success:
            print("✅ E-Mail erfolgreich versendet!")
        else:
            print("❌ Fehler beim Versenden.")

    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(send_test())
