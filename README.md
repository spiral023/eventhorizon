# EventHorizon 🚀

**Die moderne Plattform für kollaborative Teamevent-Planung.**

EventHorizon vereinfacht die Organisation von Gruppenaktivitäten – vom ersten Vorschlag über demokratische Abstimmungen bis zur finalen Terminfindung. Entwickelt für Teams, Freunde und Communities.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20FastAPI%20%7C%20Docker-blueviolet)

---

## ✨ Features

### 🔄 Der 4-Phasen Workflow
EventHorizon führt Gruppen strukturiert durch den Planungsprozess:
1.  **💡 Proposal Phase:** Mitglieder schlagen Aktivitäten vor oder lassen sich von der KI inspirieren.
2.  **🗳️ Voting Phase:** Demokratische Abstimmung über Vorschläge.
3.  **📅 Scheduling Phase:** Terminfindung für die Gewinner-Aktivität.
4.  **ℹ️ Info Phase:** Alle Details (Ort, Zeit, Tickets) auf einen Blick.

### 🧠 AI-Powered Planning
*   **Team-Analyse:** Die KI analysiert die Präferenzen aller Gruppenmitglieder und erstellt ein Profil (z.B. "Abenteuer-lustig" oder "Entspannt").
*   **Smart Suggestions:** Basierend auf Budget, Wetter, Saison und Team-Vibe schlägt die KI passende Aktivitäten vor.
*   **Auto-Communication:** Generierung von einladenden E-Mail-Texten und Erinnerungen.

### 🛠️ Weitere Highlights
*   **Raum-basiert:** Organisiere verschiedene Gruppen (z.B. "Marketing Team", "Freunde") in separaten Räumen.
*   **Interaktive Karten:** Übersichtliche Darstellung von Aktivitäten auf der Karte.
*   **E-Mail Benachrichtigungen:** Automatische Einladungen, Voting-Reminder und Updates.
*   **Responsive Design:** Optimiert für Desktop und Mobile.

---

## 🏗️ Tech Stack

### Frontend
*   **Framework:** React 18 mit Vite
*   **Language:** TypeScript
*   **UI Library:** Shadcn UI (basierend auf Radix Primitives) + Tailwind CSS
*   **State Management:** Zustand (Client) & TanStack Query (Server)
*   **Maps:** React Leaflet

### Backend
*   **Framework:** FastAPI (Python 3.11+)
*   **Database:** PostgreSQL 15 (Async SQLAlchemy)
*   **AI Engine:** OpenRouter SDK (Claude 3.5 Sonnet, GPT-4o, Gemini 2.0)
*   **Email:** Resend API & Jinja2 Templates

### Infrastructure
*   **Containerization:** Docker & Docker Compose
*   **Proxy:** Nginx (Frontend) & Traefik (Reverse Proxy & SSL)

---

## 🚀 Quick Start (Development)

Führe die App lokal in einer Entwicklungsumgebung aus.

### Voraussetzungen
*   Node.js 18+
*   Python 3.11+
*   Docker & Docker Compose

### 1. Repository klonen
```bash
git clone https://github.com/eventhorizon/eventhorizon.git
cd eventhorizon
```

### 2. Environment Setup
Erstelle eine `.env` Datei im Hauptverzeichnis (kopiere `.env.example`):
```bash
cp .env.example .env
```
Fülle die Variablen aus (insb. API Keys für volle Funktionalität).

### 3. Backend & Datenbank starten
```bash
# Startet Postgres und FastAPI im Hot-Reload Modus
docker compose -f docker-compose.dev.yml up -d
```
Die API ist nun unter `http://localhost:8000/docs` erreichbar.

### 4. Frontend starten
```bash
cd frontend
npm install
npm run dev
```
Das Frontend läuft unter `http://localhost:5173`.

---

## 🌐 Deployment (Production)

Die Anwendung ist für den Betrieb auf einem VPS mit **Traefik** als Reverse Proxy optimiert.

### Server Setup
1.  Stelle sicher, dass Traefik auf deinem Server läuft und das Netzwerk `traefik` existiert.
2.  Klone das Repo nach `/opt/eventhorizon`.
3.  Erstelle die `.env` Datei mit **starken Passwörtern**.

### Konfiguration

**Wichtige `.env` Variablen für Prod:**
```ini
# Security
POSTGRES_PASSWORD=DeinSicheresDBPasswort
SECRET_KEY=GeneriereEinenLangenRandomString

# URLs
FRONTEND_URL=https://event-horizon.deine-domain.de
BACKEND_CORS_ORIGINS=["https://event-horizon.deine-domain.de"]

# External Services
OPENROUTER_API_KEY=sk-or-v1-...
RESEND_API_KEY=re_...
```

### Starten
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Traefik erkennt die Container automatisch und besorgt SSL-Zertifikate via Let's Encrypt.

---

## ⚙️ Feature Konfiguration

### 📧 E-Mail Versand (Resend)
EventHorizon nutzt [Resend](https://resend.com) für transaktionale E-Mails.
1.  Erstelle einen API Key bei Resend.
2.  Verifiziere deine Domain.
3.  Setze `RESEND_API_KEY` und `MAIL_FROM_EMAIL` in der `.env`.

Templates liegen unter `backend/app/templates/emails/` und können angepasst werden.

### 🤖 AI Features (OpenRouter)
Die App nutzt [OpenRouter](https://openrouter.ai), um auf verschiedene LLMs zuzugreifen.
1.  Hole einen API Key von OpenRouter.
2.  Setze `OPENROUTER_API_KEY` in der `.env`.
3.  Die Modelle werden in `backend/app/services/ai_service.py` konfiguriert (Standard: Claude 3.5 Sonnet für Analyse, GPT-4o für Vorschläge).

---

## 📚 API Dokumentation

Das Backend bietet eine vollautomatische OpenAPI (Swagger) Dokumentation.
Nach dem Start erreichbar unter:
*   **Lokal:** `http://localhost:8000/docs`
*   **Prod:** `https://deine-domain.de/api/v1/docs` (falls freigeschaltet)

---

## 🤝 Contributing

Pull Requests sind willkommen! Bitte beachte die `GEMINI.md` für detaillierte Architektur-Infos und Coding-Guidelines.

---

License: MIT