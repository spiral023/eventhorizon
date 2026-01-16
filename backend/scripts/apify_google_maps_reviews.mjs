import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { ApifyClient } from 'apify-client';

const ACTOR_ID = 'compass/crawler-google-places';
const MAX_CRAWLED_PLACES_PER_SEARCH = 1;
const MAX_REVIEWS = 20;
const REVIEWS_START_DATE = '12 months';
const REVIEWS_SORT = 'newest';
const LANGUAGE = 'de';
const SCRAPE_CONTACTS = false;
const REQUEST_DELAY_MS = 0;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2].trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function toSafeSlug(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return 'unknown';
  }

  const replaced = raw
    .replace(/\u00e4/g, 'ae')
    .replace(/\u00f6/g, 'oe')
    .replace(/\u00fc/g, 'ue')
    .replace(/\u00c4/g, 'Ae')
    .replace(/\u00d6/g, 'Oe')
    .replace(/\u00dc/g, 'Ue')
    .replace(/\u00df/g, 'ss');

  const ascii = replaced.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'unknown';
}

function buildSearchString(activity) {
  const provider = activity?.provider?.trim();
  const address = activity?.address?.trim();
  if (!provider || !address) {
    return '';
  }
  return `${provider} ${address}`;
}

function getLocationQuery(address) {
  if (!address) {
    return undefined;
  }
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  const withDigits = parts.filter((part) => /\d/.test(part));
  if (withDigits.length > 0) {
    return withDigits[withDigits.length - 1];
  }
  return parts[parts.length - 1];
}

function parseListingIds(input) {
  const result = new Set();
  const parts = input.split(',').map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startRaw, endRaw] = part.split('-').map((value) => value.trim());
      const start = Number.parseInt(startRaw, 10);
      const end = Number.parseInt(endRaw, 10);
      if (Number.isNaN(start) || Number.isNaN(end)) {
        continue;
      }
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      for (let i = min; i <= max; i += 1) {
        result.add(i);
      }
    } else {
      const value = Number.parseInt(part, 10);
      if (!Number.isNaN(value)) {
        result.add(value);
      }
    }
  }

  return [...result];
}

async function fetchAllItems(datasetClient) {
  const items = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const page = await datasetClient.listItems({ limit, offset });
    const batch = page.items ?? [];
    items.push(...batch);
    offset += batch.length;

    if (batch.length === 0 || (page.total !== undefined && offset >= page.total)) {
      break;
    }
  }

  return items;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');

  loadEnvFile(path.join(repoRoot, '.env'));
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    console.error('APIFY_API_TOKEN fehlt. Bitte in der .env setzen.');
    process.exitCode = 1;
    return;
  }

  const activitiesPath = path.join(repoRoot, 'backend', 'data', 'activities.json');
  const outputDir = path.join(repoRoot, 'backend', 'data', 'activities');

  if (!fs.existsSync(activitiesPath)) {
    console.error(`activities.json nicht gefunden: ${activitiesPath}`);
    process.exitCode = 1;
    return;
  }

  const activitiesRaw = fs.readFileSync(activitiesPath, 'utf8');
  const activities = JSON.parse(activitiesRaw);
  if (!Array.isArray(activities)) {
    console.error('activities.json hat kein Array-Format.');
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

  try {
    console.log(`Gefundene Activities: ${activities.length}`);
    console.log('Auswahl:');
    console.log('1) listing_id(s) (z.B. 1,2,5-7)');
    console.log('2) alle (Warnung: kann teuer sein)');
    console.log('3) nur fehlende Dateien');

    const choice = (await ask('Auswahl (1/2/3): ')).trim();
    let selected = [];

    if (choice === '1') {
      const input = (await ask('listing_id(s): ')).trim();
      const ids = parseListingIds(input);
      if (ids.length === 0) {
        console.log('Keine gültigen listing_id(s) angegeben. Abbruch.');
        return;
      }
      const idSet = new Set(ids);
      selected = activities.filter((activity) => idSet.has(activity.listing_id));
      const missing = ids.filter((id) => !selected.some((activity) => activity.listing_id === id));
      if (missing.length > 0) {
        console.log(`Warnung: Nicht gefunden: ${missing.join(', ')}`);
      }
    } else if (choice === '2') {
      const confirm = (await ask('Wirklich alle Activities abrufen? (ja/nein): ')).trim().toLowerCase();
      if (!['j', 'ja', 'y', 'yes'].includes(confirm)) {
        console.log('Abbruch.');
        return;
      }
      selected = [...activities];
    } else if (choice === '3') {
      selected = activities.filter((activity) => {
        const provider = activity.provider ?? activity.title ?? 'unknown';
        const filename = `${activity.listing_id}_${toSafeSlug(provider)}.json`;
        const outputPath = path.join(outputDir, filename);
        return !fs.existsSync(outputPath);
      });
      if (selected.length === 0) {
        console.log('Keine fehlenden Dateien gefunden. Abbruch.');
        return;
      }
    } else {
      console.log('Ungültige Auswahl. Abbruch.');
      return;
    }

    if (selected.length === 0) {
      console.log('Keine passenden Activities gefunden. Abbruch.');
      return;
    }

    const client = new ApifyClient({ token });

    for (const activity of selected) {
      const listingId = activity.listing_id ?? 'unknown';
      const provider = activity.provider ?? activity.title ?? 'unknown';
      const filename = `${listingId}_${toSafeSlug(provider)}.json`;
      const outputPath = path.join(outputDir, filename);
      const searchString = buildSearchString(activity);

      if (!searchString) {
        console.log(`[${listingId}] Kein Suchstring verfügbar, übersprungen.`);
        continue;
      }

      if (fs.existsSync(outputPath)) {
        const confirmRaw = (await ask(`Datei existiert (${filename}). Überschreiben? (y/n, default y): `))
          .trim()
          .toLowerCase();
        const shouldOverwrite = confirmRaw === '' || confirmRaw.startsWith('y');
        if (!shouldOverwrite) {
          console.log(`[${listingId}] Übersprungen.`);
          continue;
        }
      }

      console.log(`\n[${listingId}] ${provider}`);
      console.log(`Suche: ${searchString}`);

      try {
        const locationQuery = getLocationQuery(activity?.address);
        const input = {
          includeWebResults: false,
          language: LANGUAGE,
          maxCrawledPlacesPerSearch: MAX_CRAWLED_PLACES_PER_SEARCH,
          maxImages: 0,
          maxReviews: MAX_REVIEWS,
          maximumLeadsEnrichmentRecords: 0,
          reviewsOrigin: 'google',
          reviewsSort: REVIEWS_SORT,
          reviewsStartDate: REVIEWS_START_DATE,
          scrapeContacts: SCRAPE_CONTACTS,
          scrapeDirectories: false,
          scrapeImageAuthors: false,
          scrapePlaceDetailPage: false,
          scrapeReviewsPersonalData: false,
          scrapeTableReservationProvider: false,
          searchStringsArray: [searchString],
          skipClosedPlaces: false,
          proxyConfig: { useApifyProxy: true },
          searchMatching: 'all',
          placeMinimumStars: '',
          website: 'allPlaces',
          maxQuestions: 0,
          reviewsFilterString: '',
          allPlacesNoSearchAction: '',
        };

        if (locationQuery) {
          input.locationQuery = locationQuery;
        }

        const run = await client.actor(ACTOR_ID).call(input);
        const datasetClient = client.dataset(run.defaultDatasetId);
        const items = await fetchAllItems(datasetClient);

        fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf8');
        console.log(`Gespeichert: ${outputPath} (${items.length} items)`);
      } catch (error) {
        const message = error?.message ?? String(error);
        console.error(`[${listingId}] Fehler: ${message}`);
      }

      if (REQUEST_DELAY_MS > 0) {
        await sleep(REQUEST_DELAY_MS);
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error?.message ?? String(error));
  process.exitCode = 1;
});
