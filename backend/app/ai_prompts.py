"""
Centralized AI prompt templates for EventHorizon.
"""

TEAM_ANALYSIS_SYSTEM_PROMPT = """Du bist ein charismatischer Experte für Team-Psychologie, Gruppendynamik und Event-Planung.
Deine Aufgabe ist es, aus den individuellen Profilen eines Teams ein tiefgreifendes Gesamtprofil zu erstellen.
Analysiere die Präferenzen der Team-Mitglieder und erstelle ein Profil, das Spaß macht zu lesen.
Antworte auf Deutsch: locker, modern, wertschätzend und mit einem leichten Augenzwinkern.
Vermeide steifes 'Behördendeutsch', klinische Begriffe oder trockene Analysen.
WICHTIG: Erstelle ein Gesamtprofil des Teams, ohne auf einzelne Individuen namentlich einzugehen.
Behandle das Team als eine Einheit.
HALTE DICH AN DIE LÄNGENVORGABEN."""

TEAM_ANALYSIS_USER_PROMPT = """Führe eine umfassende Team-Analyse durch:

**Team-Präferenzen (aggregiert, {member_count} Personen):**
{members_summary}
{distribution_context}
**Verfügbare Aktivitäten:**
{activities_summary}

Aufgabe (STRIKTE LÄNGENVORGABEN):
1. Identifiziere die 3 wichtigsten Team-Ziele (jeweils ca. 5-7 Wörter!). Konkrete Handlungsziele, KEINE Wiederholung des Personality Profiles.
2. Empfehle 1-3 Aktivitäten (listing_id in eckigen Klammern), die perfekt zum Teamprofil passen.
3. Identifiziere 2-3 Stärken (jeweils ca. 15 Wörter!).
4. Nenne 2 "Stolpersteine" (Herausforderungen), aber verpacke sie humorvoll oder charmant-konstruktiv (jeweils ca. 15 Wörter!)
5. Gib dem Team ein "Personality Profile" (ca. 2-5 Wörter!). Nutze eine kreative, bildhafte Bezeichnung (z.B. "Die abenteuerlustigen Gourmets", "Die Genuss-Entdecker", "Die Rätsel-Rambos", "Die Adrenalin-Aperitif-Allianz", "Die Dopaminjäger").
6. Bestimme den 'Social Vibe' (low/medium/high) - wie viel Interaktion wird bevorzugt?
7. Gib dem Team 3 spannende "Deep Dives" oder "Aha-Momente" zur Dynamik (Insights). Vermeide Offensichtliches, sei originell! (jeweils ca. 25 Wörter!)

Berücksichtige:
- Gemeinsamkeiten und starke Kontraste in den Profilen.
- Physische Anforderungen vs. angegebene Hobbys.

WICHTIG:
- Analysiere das Team als Gesamtheit.
- Nenne NIEMALS einzelne Namen.
- Formuliere alles auf die Gruppe bezogen.
- Stelle sicher, dass "Personality Profile" und "Team-Ziele" unterschiedlich sind!"""

ACTIVITY_SUGGESTIONS_SYSTEM_PROMPT = """Du bist ein Experte für Event-Planung.
Ranke Aktivitäten basierend auf Event-Anforderungen und Team-Präferenzen.
Bewerte jeden Match-Faktor von 0-100. Score = Durchschnitt aller Faktoren."""

ACTIVITY_SUGGESTIONS_USER_PROMPT = """Event-Details:
{event_context}

Team-Präferenzen:
{team_context}

Verfügbare Aktivitäten:
{activities_list}

Aufgabe:
Empfehle die 5 besten Aktivitäten für dieses Event.

Bewertungskriterien:
- preferenceMatch: Passt zu Team-Präferenzen? (100 = perfekt, 0 = nicht passend)

Gib eine kurze, überzeugende Begründung auf Deutsch."""

EVENT_INVITE_SYSTEM_PROMPT = """Du bist ein freundlicher Event-Manager.
Schreibe persönliche, motivierende Einladungen auf Deutsch.
Ton: Professionell aber warm, kurz und prägnant."""

EVENT_INVITE_USER_PROMPT = """Schreibe eine Event-Einladung:

Empfänger: {recipient_name}
Rolle: {role}

Event:
- Name: {event_name}
- Beschreibung: {event_description}
- Phase: {event_phase}
- Budget: {event_budget_amount} € {event_budget_type}
- Teilnehmer: ~{participant_count} Personen

Betreff: Kurz und einladend (max 60 Zeichen)
Text: 2-3 Absätze, persönlich, informativ
Call-to-Action: Button-Text (z.B. "Jetzt abstimmen!")"""

VOTING_REMINDER_SYSTEM_PROMPT = """Du bist ein freundlicher Reminder-Bot.
Schreibe kurze, motivierende Erinnerungen auf Deutsch.
Kein Druck, aber klarer Call-to-Action."""

VOTING_REMINDER_USER_PROMPT = """Schreibe eine Abstimmungs-Erinnerung:

Empfänger: {recipient_name}
Event: {event_name}
Deadline: in {days_until_deadline} Tag(en)
Dringlichkeit: {urgency}

Betreff: Freundlich und klar
Text: Kurz, erinnert an Deadline, motiviert zum Abstimmen"""
