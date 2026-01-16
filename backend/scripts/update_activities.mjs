import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

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

function resolveActivityFolders(baseDir) {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const folderPath = path.join(baseDir, entry.name);
    const files = fs.readdirSync(folderPath);
    const basicFile = files.find((name) => name.endsWith('_basic.json'));
    const voiceFile = files.find((name) => name.endsWith('_customer_voice.json'));
    if (!basicFile || !voiceFile) {
      continue;
    }

    const basicPath = path.join(folderPath, basicFile);
    const voicePath = path.join(folderPath, voiceFile);
    const baseName = basicFile.replace(/_basic\.json$/, '');

    let listingId = null;
    try {
      const basicRaw = fs.readFileSync(basicPath, 'utf8');
      const basic = JSON.parse(basicRaw);
      if (Number.isFinite(basic?.listing_id)) {
        listingId = basic.listing_id;
      }
    } catch {
      listingId = null;
    }

    if (!Number.isFinite(listingId)) {
      const prefix = baseName.split('_')[0];
      const parsed = Number.parseInt(prefix, 10);
      listingId = Number.isNaN(parsed) ? null : parsed;
    }

    result.push({
      listingId,
      baseName,
      basicPath,
      voicePath,
    });
  }

  return result;
}

function normalizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function buildCoordinates(location) {
  if (!location || typeof location !== 'object') {
    return null;
  }
  const lat = location.lat;
  const lng = location.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return [lat, lng];
}

function areCoordinatesEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 2 || b.length !== 2) {
    return false;
  }
  return a[0] === b[0] && a[1] === b[1];
}

function buildChangeList(activity, basic, voice) {
  const changes = [];

  const addChange = (field, nextValue) => {
    if (nextValue === null || nextValue === undefined || nextValue === '') {
      return;
    }
    const currentValue = activity[field];
    if (field === 'coordinates') {
      if (areCoordinatesEqual(currentValue, nextValue)) {
        return;
      }
    } else if (currentValue === nextValue) {
      return;
    }

    changes.push({
      field,
      before: currentValue ?? null,
      after: nextValue,
    });
  };

  addChange('customer_voice', normalizeString(voice?.customer_voice));
  addChange('address', normalizeString(basic?.address));
  addChange('website', normalizeString(basic?.website));
  addChange('phone', normalizeString(basic?.phone));
  addChange('coordinates', buildCoordinates(basic?.location));
  addChange('menu_url', normalizeString(basic?.menu));

  const totalScore = basic?.totalScore;
  if (Number.isFinite(totalScore)) {
    addChange('external_rating', totalScore);
  }

  return changes;
}

function applyChanges(activity, changes) {
  for (const change of changes) {
    activity[change.field] = change.after;
  }
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return String(value);
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const activitiesPath = path.join(repoRoot, 'backend', 'data', 'activities.json');
  const activitiesDir = path.join(repoRoot, 'backend', 'data', 'activities');

  if (!fs.existsSync(activitiesPath)) {
    console.error(`activities.json nicht gefunden: ${activitiesPath}`);
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(activitiesDir)) {
    console.error(`Ordner nicht gefunden: ${activitiesDir}`);
    process.exitCode = 1;
    return;
  }

  const activities = JSON.parse(fs.readFileSync(activitiesPath, 'utf8'));
  if (!Array.isArray(activities)) {
    console.error('activities.json hat kein Array-Format.');
    process.exitCode = 1;
    return;
  }

  const folderEntries = resolveActivityFolders(activitiesDir);
  if (folderEntries.length === 0) {
    console.log('Keine Activity-Ordner mit _basic.json und _customer_voice.json gefunden.');
    return;
  }

  const activityIndex = new Map();
  for (const activity of activities) {
    if (Number.isFinite(activity?.listing_id)) {
      activityIndex.set(activity.listing_id, activity);
    }
  }

  const folderIndex = new Map();
  for (const entry of folderEntries) {
    if (Number.isFinite(entry.listingId)) {
      folderIndex.set(entry.listingId, entry);
    }
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

  let updatedCount = 0;

  try {
    console.log(`Gefundene Activities: ${folderEntries.length}`);
    console.log('Auswahl:');
    console.log('1) listing_id(s) (z.B. 1,2,5-7)');
    console.log('2) alle (Warnung: kann teuer sein)');
    console.log('3) nur fehlende customer_voice in activities.json');

    const choiceRaw = await ask('Auswahl (1/2/3): ');
    const choice = String(choiceRaw ?? '').replace(/[^\d]/g, '').trim().charAt(0);
    let selectedIds = [];

    if (choice === '1') {
      const input = (await ask('listing_id(s): ')).trim();
      const ids = parseListingIds(input);
      if (ids.length === 0) {
        console.log('Keine gültigen listing_id(s) angegeben. Abbruch.');
        return;
      }
      selectedIds = ids;
    } else if (choice === '2') {
      const confirm = (await ask('Wirklich alle Activities aktualisieren? (ja/nein): '))
        .trim()
        .toLowerCase();
      if (!['j', 'ja', 'y', 'yes'].includes(confirm)) {
        console.log('Abbruch.');
        return;
      }
      selectedIds = folderEntries.map((entry) => entry.listingId).filter((id) => Number.isFinite(id));
    } else if (choice === '3') {
      selectedIds = activities
        .filter((activity) => !normalizeString(activity.customer_voice))
        .map((activity) => activity.listing_id)
        .filter((id) => Number.isFinite(id));
      if (selectedIds.length === 0) {
        console.log('Keine fehlenden customer_voice-Einträge gefunden. Abbruch.');
        return;
      }
    } else {
      console.log('Ungültige Auswahl. Abbruch.');
      return;
    }

    for (const listingId of selectedIds) {
      const activity = activityIndex.get(listingId);
      const folder = folderIndex.get(listingId);

      if (!activity) {
        console.log(`Warnung: listing_id ${listingId} nicht in activities.json gefunden.`);
        continue;
      }

      if (!folder) {
        console.log(`Warnung: listing_id ${listingId} nicht im Activities-Ordner gefunden.`);
        continue;
      }

      let basic;
      let voice;
      try {
        basic = JSON.parse(fs.readFileSync(folder.basicPath, 'utf8'));
        voice = JSON.parse(fs.readFileSync(folder.voicePath, 'utf8'));
      } catch {
        console.log(`Ungültige JSON-Datei für listing_id ${listingId}. Übersprungen.`);
        continue;
      }

      const changes = buildChangeList(activity, basic, voice);
      if (changes.length === 0) {
        console.log(`[${listingId}] Keine Änderungen gefunden.`);
        continue;
      }

      console.log(`\n[${listingId}] ${activity.title ?? activity.provider ?? folder.baseName}`);
      console.log('Vorschau der Änderungen:');
      for (const change of changes) {
        console.log(`- ${change.field}: ${formatValue(change.before)} -> ${formatValue(change.after)}`);
      }

      const confirmRaw = (await ask('Änderungen übernehmen? (y/n, default y): '))
        .trim()
        .toLowerCase();
      const shouldApply = confirmRaw === '' || confirmRaw.startsWith('y');
      if (!shouldApply) {
        console.log('Übersprungen.');
        continue;
      }

      applyChanges(activity, changes);
      updatedCount += 1;
    }

    if (updatedCount === 0) {
      console.log('Keine Änderungen übernommen.');
      return;
    }

    const saveConfirmRaw = (await ask('Änderungen in activities.json speichern? (y/n, default y): '))
      .trim()
      .toLowerCase();
    const shouldSave = saveConfirmRaw === '' || saveConfirmRaw.startsWith('y');
    if (!shouldSave) {
      console.log('Speichern abgebrochen.');
      return;
    }

    fs.writeFileSync(activitiesPath, JSON.stringify(activities, null, 2), 'utf8');
    console.log(`Gespeichert: ${activitiesPath}`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error?.message ?? String(error));
  process.exitCode = 1;
});
