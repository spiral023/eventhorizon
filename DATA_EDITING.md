# Anleitung: Bearbeiten der Aktivitäten (Activities)

Diese Anleitung erklärt, wie du die Aktivitäten-Datenbank (`backend/data/activities.json`) einfach mit Excel bearbeiten und aktualisieren kannst.

## Voraussetzungen

- Das Projekt läuft (Docker Container `eventhorizon-backend-1` ist aktiv).
- Du hast Excel oder ein kompatibles Programm (LibreOffice, Google Sheets).

---

## Schritt 1: Daten nach Excel exportieren

Um die aktuellen Daten aus der Datenbank (JSON) in eine Excel-Datei umzuwandeln, führe folgenden Befehl in deinem Terminal aus:

```bash
docker exec eventhorizon-backend-1 python scripts/json_to_xlsx.py
```

✅ **Ergebnis:**
- Eine neue Datei `backend/data/activities.xlsx` wurde erstellt.
- Ein Backup der alten Datei wurde als `backend/data/activities_backup_YYYYMMDD_HHMMSS.xlsx` gespeichert.

---

## Schritt 2: Bearbeiten in Excel

1. Öffne die Datei `backend/data/activities.xlsx` in Excel.
2. Bearbeite die Daten nach Belieben:
   - **Zeilen hinzufügen:** Neue Aktivitäten eintragen.
   - **Zeilen löschen:** Veraltete Aktivitäten entfernen.
   - **Werte ändern:** Preise, Beschreibungen, Links anpassen.

### ⚠️ Wichtige Hinweise zur Formatierung

- **Listen (Tags, Flags):** Mehrere Werte müssen durch Komma getrennt werden.
  - *Beispiel Tags:* `action, teambuilding, indoor`
  - *Beispiel Accessibility:* `wheelchair, parking`
- **Koordinaten:** Müssen als JSON-Liste `[lat, lng]` eingetragen bleiben oder als `lat, lng` (Komma getrennt).
  - *Beispiel:* `[48.3061, 14.2869]` oder `48.3061, 14.2869`
- **Kategorien (Category):** Nur erlaubte Werte verwenden: `action`, `food`, `relax`, `party`, `culture`, `outdoor`, `creative`.
- **Regionen (Region):** Kürzel verwenden: `OOE`, `WIE`, `SBG`, etc.

---

## Schritt 3: Excel speichern und schließen

Speichere deine Änderungen in Excel (`STRG + S`) und **schließe die Datei**, damit der nächste Schritt nicht blockiert wird.

---

## Schritt 4: Daten zurück in JSON importieren

Um deine Änderungen wieder in das System zu laden:

```bash
docker exec eventhorizon-backend-1 python scripts/xlsx_to_json.py
```

✅ **Ergebnis:**
- Die Datei `backend/data/activities.json` wurde mit deinen Änderungen aktualisiert.
- Ein Backup der alten JSON-Datei wurde erstellt.

---

## Schritt 5: Datenbank aktualisieren (Seed)

Damit die Änderungen auch in der Datenbank und somit in der App sichtbar sind, musst du die Datenbank neu "seeden" (befüllen).

**Achtung:** Dies aktualisiert vorhandene Einträge anhand des `slug` (URL-Namen) oder erstellt neue.

```bash
docker exec eventhorizon-backend-1 python scripts/seed_activities.py
```

🎉 **Fertig!** Deine Änderungen sind nun in der EventHorizon App sichtbar.
