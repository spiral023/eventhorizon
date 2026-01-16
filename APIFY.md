# Apify Integration (EventHorizon)

Dieses Dokument beschreibt die lokale Apify-Integration sowie die Skripte, mit denen Google‑Maps‑Daten und Reviews pro Activity verarbeitet werden.

## Voraussetzungen

- Node.js 16+ installiert (`node -v`).
- `APIFY_API_TOKEN` in der `.env` im Repo‑Root gesetzt (siehe `.env.example`).
- Abhängigkeiten für die Skripte installieren:
  ```bash
  cd backend/scripts
  npm install
  ```

## Apify Actor

Wir verwenden den Actor:

- `compass/crawler-google-places`

Die Inputs orientieren sich am Beispiel-Input aus der Apify-Dokumentation und sind auf Kostenkontrolle optimiert (keine Bilder, keine Enrichment-Add‑ons).

## Script: Apify Abruf (Google Maps)

Pfad: `backend/scripts/apify_google_maps_reviews.mjs`

Zweck:

- Lädt Daten aus Apify für jede Activity in `backend/data/activities.json`.
- Erstellt pro Activity eine JSON-Datei in `backend/data/activities/` (Name: `listing_id_provider.json`).
- Promptet für Auswahl (listing_id(s), alle, nur fehlende Dateien).
- Promptet vor Überschreiben bestehender Datei (y/n, default y).

Search-Logik:

- `searchString = provider + address`
- `language = de`
- Reviews aktiviert (Standard: max 20, sortiert nach `newest`, Zeitraum `12 months`).

Ausführung:

```bash
cd backend/scripts
node apify_google_maps_reviews.mjs
```

Wichtige Optionen im Script (Konstanten):

- `MAX_REVIEWS`
- `REVIEWS_START_DATE`
- `REVIEWS_SORT`
- `LANGUAGE`
- `SCRAPE_CONTACTS` (Kosten!)
- `SCRAPE_SOCIAL_MEDIA` (Kosten!)

## Script: Post‑Processing der Apify Outputs

Pfad: `backend/scripts/process_apify_activity_output.mjs`

Zweck:

- Nimmt Apify JSON‑Dateien aus `backend/data/activities/`.
- Erstellt pro Activity einen Ordner `listing_id_provider/`.
- Legt zwei Dateien an:
  - `listing_id_provider_basic.json`
  - `listing_id_provider_reviews.json`

`basic` enthält:

- `listing_id`
- `title`, `price`, `categoryName`
- `address`, `street`, `city`, `postalCode`, `countryCode`
- `website`, `phone`, `location { lat, lng }`
- `menu`, `totalScore`, `permanentlyClosed`
- `placeId`, `categories`, `reviewsCount`, `scrapedAt`
- `peopleAlsoSearch`, `Gruppen`
- `googleUrl`

`reviews` enthält:

- `id`
- `publishedAtDate`
- `stars`
- `text` (falls `textTranslated` vorhanden ist, wird dieser Wert verwendet)

Filter:

- Reviews mit mehr als 400 Zeichen im Text werden verworfen.

Ausführung:

```bash
cd backend/scripts
node process_apify_activity_output.mjs
```

Optional: Nur bestimmte Dateien verarbeiten:

```bash
node process_apify_activity_output.mjs 15_ristorante-il-teatro.json
```

## Kostenhinweis (Apify Pricing)

Auszug (Stand Umsetzung):

- Place scraped: $4.00 / 1,000
- Add‑on: review scraped: $0.50 / 1,000
- Add‑on: image scraped: $0.50 / 1,000
- Add‑on: additional place details scraped: $2.00 / 1,000
- Add‑on: company contacts enrichment: $2.00 / 1,000
- Add‑on: business leads enrichment: $100.00 / 1,000
- Add‑on: social media profile enrichment: $100.00 / 1,000
- Actor start: $0.007

Die Scripts sind so eingestellt, dass kostenintensive Add‑ons deaktiviert sind. Bei Aktivierung bitte bewusst entscheiden.
