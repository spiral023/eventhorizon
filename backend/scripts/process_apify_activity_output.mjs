import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function pickBestItem(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const ranked = items.filter((item) => Number.isFinite(item?.rank));
  if (ranked.length === 0) {
    return items[0];
  }

  return ranked.reduce((best, current) => (current.rank < best.rank ? current : best), ranked[0]);
}

function getGruppenValue(item) {
  const publikum = item?.additionalInfo?.Publikum;
  if (!Array.isArray(publikum)) {
    return null;
  }

  for (const entry of publikum) {
    if (entry && Object.prototype.hasOwnProperty.call(entry, 'Gruppen')) {
      return entry.Gruppen;
    }
  }

  return null;
}

function getGoogleUrl(item) {
  if (item?.url) {
    return item.url;
  }
  if (item?.placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${item.placeId}`;
  }
  if (item?.searchPageUrl) {
    return item.searchPageUrl;
  }
  return null;
}

function toBasicPayload(item, listingId) {
  return {
    listing_id: listingId,
    title: item?.title ?? null,
    price: item?.price ?? null,
    categoryName: item?.categoryName ?? null,
    address: item?.address ?? null,
    street: item?.street ?? null,
    city: item?.city ?? null,
    postalCode: item?.postalCode ?? null,
    countryCode: item?.countryCode ?? null,
    website: item?.website ?? null,
    phone: item?.phone ?? null,
    location: item?.location
      ? {
          lat: item.location.lat ?? null,
          lng: item.location.lng ?? null,
        }
      : null,
    menu: item?.menu ?? null,
    totalScore: item?.totalScore ?? null,
    permanentlyClosed: item?.permanentlyClosed ?? null,
    placeId: item?.placeId ?? null,
    categories: item?.categories ?? null,
    reviewsCount: item?.reviewsCount ?? null,
    scrapedAt: item?.scrapedAt ?? null,
    peopleAlsoSearch: item?.peopleAlsoSearch ?? null,
    Gruppen: getGruppenValue(item),
    googleUrl: getGoogleUrl(item),
  };
}

function toReviewPayloads(item) {
  const reviews = Array.isArray(item?.reviews) ? item.reviews : [];
  const filtered = [];

  for (const review of reviews) {
    const translated = review?.textTranslated;
    const text =
      translated !== null && translated !== undefined ? translated : review?.text ?? null;

    if (typeof text !== 'string' || text.length > 400) {
      continue;
    }

    filtered.push({
      publishedAtDate: review?.publishedAtDate ?? null,
      stars: review?.stars ?? null,
      text,
    });
  }

  return filtered.map((review, index) => ({
    id: index + 1,
    ...review,
  }));
}

function resolveInputFiles(inputDir, args) {
  if (args.length === 0) {
    return fs
      .readdirSync(inputDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => path.join(inputDir, entry.name));
  }

  return args.map((arg) => {
    if (arg.includes(path.sep) || arg.includes('/')) {
      return path.resolve(arg);
    }
    const name = arg.endsWith('.json') ? arg : `${arg}.json`;
    return path.join(inputDir, name);
  });
}

function parseListingId(baseName) {
  const prefix = baseName.split('_')[0];
  const value = Number.parseInt(prefix, 10);
  return Number.isNaN(value) ? null : value;
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const inputDir = path.join(repoRoot, 'backend', 'data', 'activities');

  if (!fs.existsSync(inputDir)) {
    console.error(`Input-Ordner fehlt: ${inputDir}`);
    process.exitCode = 1;
    return;
  }

  const files = resolveInputFiles(inputDir, process.argv.slice(2));
  if (files.length === 0) {
    console.log('Keine Dateien gefunden.');
    return;
  }

  const shouldOverwriteAll = await new Promise((resolve) => {
    process.stdout.write('Vorhandene Dateien überschreiben? (y/n, default y): ');
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => {
      const answer = String(data || '').trim().toLowerCase();
      const decision = answer === '' || answer.startsWith('y');
      process.stdin.pause();
      resolve(decision);
    });
  });

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      console.log(`Datei nicht gefunden, übersprungen: ${filePath}`);
      continue;
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      continue;
    }

    const baseName = path.basename(filePath, '.json');
    const listingId = parseListingId(baseName);
    const outputFolder = path.join(inputDir, baseName);

    const raw = fs.readFileSync(filePath, 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      console.log(`Ungültiges JSON, übersprungen: ${filePath}`);
      continue;
    }

    const item = pickBestItem(Array.isArray(data) ? data : [data]);
    if (!item) {
      console.log(`Keine Items gefunden, übersprungen: ${filePath}`);
      continue;
    }

    const basicPath = path.join(outputFolder, `${baseName}_basic.json`);
    const reviewsPath = path.join(outputFolder, `${baseName}_reviews.json`);

    if (!shouldOverwriteAll && (fs.existsSync(basicPath) || fs.existsSync(reviewsPath))) {
      console.log(`Übersprungen (Datei existiert): ${outputFolder}`);
      continue;
    }

    fs.mkdirSync(outputFolder, { recursive: true });

    const basicPayload = toBasicPayload(item, listingId);
    const reviewPayloads = toReviewPayloads(item);

    fs.writeFileSync(basicPath, JSON.stringify(basicPayload, null, 2), 'utf8');
    fs.writeFileSync(reviewsPath, JSON.stringify(reviewPayloads, null, 2), 'utf8');

    console.log(`Erstellt: ${basicPath}`);
    console.log(`Erstellt: ${reviewsPath}`);
  }
}

main().catch((error) => {
  console.error(error?.message ?? String(error));
  process.exitCode = 1;
});
