# EventHorizon AI Features

EventHorizon nutzt modernste Künstliche Intelligenz (LLMs wie GPT-4o, DeepSeek und Gemini), um die Event-Planung für Teams zu automatisieren, zu personalisieren und zu optimieren. Dieses Dokument beschreibt die verfügbaren KI-Funktionen und deren technologische Basis.

---

## 1. Strategische Team-Analyse
Die Team-Analyse ist das Herzstück der personalisierten Planung. Sie analysiert die Profile aller Mitglieder eines Raums, um ein gemeinsames "DNA-Profil" zu erstellen.

- **Team Personality Profile:** Die KI ordnet dem Team einen kreativen Typus zu (z.B. "Die Dynamischen Entdecker" oder "Die Entspannten Genießer").
- **Synergy Score:** Ein berechneter Wert (0-100%), der angibt, wie gut die individuellen Interessen der Teammitglieder harmonieren.
- **Interessen-Radar:** Eine gewichtete Analyse der bevorzugten Aktivitätskategorien (Action, Food, Outdoor, etc.) basierend auf echten Favoriten und Profil-Daten.
- **Stärken & Herausforderungen:** Identifikation von Synergien (z.B. "Gemeinsames Interesse an Outdoor") und potenziellen Konfliktpunkten.
- **Social Vibe:** Einschätzung des gewünschten Levels an sozialer Interaktion (Low/Medium/High).

---

## 2. Intelligente Aktivitäts-Vorschläge
Statt manuell hunderte Aktivitäten zu durchsuchen, macht die KI gezielte Vorschläge für neue Events.

- **Match-Scoring:** Jede Aktivität erhält einen Score basierend auf:
  - **Budget Match:** Passt es in das definierte Event-Budget?
  - **Season Match:** Ist die Aktivität zum geplanten Zeitpunkt verfügbar/sinnvoll?
  - **Group Size Match:** Passt die Kapazität zur Teilnehmerzahl?
  - **Preference Match:** Wie gut passt es zum KI-Teamprofil?
- **Begründete Empfehlungen:** Die KI liefert zu jedem Vorschlag eine prägnante Begründung, warum diese Aktivität für das Team gewählt wurde.

---

## 3. Automatisierte Kommunikation
Die KI übernimmt das lästige Schreiben von Einladungen und Erinnerungen.

- **Personalisierte Einladungen:** Generierung von motivierenden Einladungstexten für neue Events, die auf den Empfänger und dessen Rolle (Organisator vs. Teilnehmer) zugeschnitten sind.
- **Dringlichkeits-basierte Reminder:** Automatische Erstellung von Voting-Erinnerungen. Der Tonfall passt sich der verbleibenden Zeit an (freundlich bei >3 Tagen, dringlich bei <24 Stunden).

---

## 4. Technologische Basis

EventHorizon nutzt eine Multi-Modell-Strategie über **OpenRouter**, um für jede Aufgabe die beste KI einzusetzen:

| Feature | Modell | Fokus |
| :--- | :--- | :--- |
| **Team-Analyse** | DeepSeek | Komplexe Datenanalyse & Reasoning |
| **Vorschläge** | GPT-4o | Präzises Ranking & Matching |
| **Copywriting** | Gemini 2.0 Flash | Kreativität & Geschwindigkeit |

### Daten-Privacy
- Es werden nur relevante anonymisierte Profildaten (Hobbys, Präferenzen) an die KI-Modelle übermittelt.
- Es findet kein Training der Modelle mit Nutzerdaten statt (gemäß OpenRouter/API-Standard).

---

## 5. Workflow für Entwickler

Die KI-Logik ist in zwei Hauptkomponenten unterteilt:

1.  **Backend Service:** `app/services/ai_service.py` - Enthält die Prompts, JSON-Schemata und die OpenRouter-Integration.
2.  **API Endpoints:** `app/api/endpoints/ai.py` - Orchestriert den Datenfluss zwischen Datenbank und KI-Service.

### Cache-Strategie
Um API-Kosten zu sparen und die Performance zu erhöhen, nutzt das System einen **Fingerprint-basierten Cache**. Eine neue Team-Analyse wird nur angefordert, wenn sich die Mitgliederstruktur oder die Favoriten im Team geändert haben.
