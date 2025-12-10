import asyncio
import sys
import os

# Pfad erweitern, damit 'app' gefunden wird
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.email_service import email_service

async def test_email():
    print("\n📧 EventHorizon Email Test")
    print("-------------------------")
    
    # 1. API Key Check
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        print("❌ FEHLER: RESEND_API_KEY ist nicht gesetzt!")
        return

    print(f"🔑 API Key gefunden: {api_key[:5]}...")
    
    # 2. Empfänger abfragen
    if len(sys.argv) > 1:
        recipient = sys.argv[1]
    else:
        recipient = input("Bitte Empfänger-E-Mail eingeben: ")

    if not recipient or "@" not in recipient:
        print("❌ Ungültige E-Mail Adresse")
        return

    print(f"\nSende Willkommens-Email an: {recipient}...")

    # 3. Senden
    try:
        success = await email_service.send_welcome_email(
            user_email=recipient,
            user_name="Test-Pilot"
        )

        if success:
            print(f"✅ E-Mail erfolgreich an {recipient} versendet!")
            print("   Bitte Posteingang (und Spam-Ordner) prüfen.")
        else:
            print("❌ E-Mail konnte nicht gesendet werden.")
            print("   Überprüfe die Docker-Logs für Details.")
            
    except Exception as e:
        print(f"❌ Unerwarteter Fehler: {e}")

if __name__ == "__main__":
    asyncio.run(test_email())
