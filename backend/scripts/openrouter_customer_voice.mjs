import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const DEFAULT_MODEL = 'deepseek/deepseek-v3.2';
const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_APP_NAME = 'EventHorizon';
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_TOKENS = 120;

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

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\s+/g, ' ').trim();
}

function buildPrompt(basic, reviews) {
  const reviewsCount = basic?.reviewsCount ?? 'unbekannt';
  const title = basic?.title ?? 'Unbekannt';
  const categoryName = basic?.categoryName ?? 'Unbekannt';
  const totalScore = basic?.totalScore ?? 'unbekannt';

  const reviewLines = reviews.map((review) => {
    const text = normalizeText(review.text).replace(/"/g, '\\"');
    const stars = review.stars ?? 'unbekannt';
    return `ID: ${review.id}, Stars: ${stars}, Text: "${text}"`;
  });

  return [
    'Du bist ein Experte für die Analyse von Kundenfeedback. Deine Aufgabe ist es, aus den folgenden Rezensionen eine prägnante Zusammenfassung ("Customer Voice") zu erstellen.',
    '',
    'Befolge strikt diese Regeln:',
    '',
    'Länge: Der Text soll ca. 40 Wörter lang sein.',
    '',
    'Format: Schreibe einen flüssigen Absatz (keine Aufzählungszeichen).',
    '',
    'Inhalt: Identifiziere die am häufigsten genannten positiven Aspekte (z. B. Spaßfaktor, Essen, Personal) und gewichte sie gegen die häufigsten negativen Aspekte (z. B. Preise, Wartezeiten, Hygiene). Reflektiere das allgemeine Stimmungsbild (Verhältnis positiv/negativ).',
    '',
    'Stil: Schreibe aus der Dritten Person Plural ("Die Kunden loben...", "Besucher bemängeln...", "Gäste schätzen..."). Bleibe sachlich und objektiv.',
    '',
    'Input:',
    `${reviewsCount} Kunden bewerten "${title}" (${categoryName}) auf Google mit ${totalScore} Sterne und sagen folgendes:`,
    reviewLines.join('\n'),
  ].join('\n');
}

function requestOpenRouter({ apiKey, baseUrl, model, messages, temperature, maxTokens, appName, siteUrl }) {
  const url = new URL(baseUrl);
  const options = {
    hostname: url.hostname,
    path: `${url.pathname.replace(/\/$/, '')}/chat/completions`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': appName,
    },
  };

  if (siteUrl) {
    options.headers['HTTP-Referer'] = siteUrl;
  }

  const payload = JSON.stringify({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`OpenRouter HTTP ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Antwort konnte nicht geparst werden: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.write(payload);
    req.end();
  });
}

function resolveActivities(baseDir) {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const activities = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const folderPath = path.join(baseDir, entry.name);
    const files = fs.readdirSync(folderPath);
    const basicFile = files.find((name) => name.endsWith('_basic.json'));
    const reviewsFile = files.find((name) => name.endsWith('_reviews.json'));
    if (!basicFile || !reviewsFile) {
      continue;
    }

    const basicPath = path.join(folderPath, basicFile);
    const reviewsPath = path.join(folderPath, reviewsFile);
    const baseName = basicFile.replace(/_basic\.json$/, '');
    const outputPath = path.join(folderPath, `${baseName}_customer_voice.json`);

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

    activities.push({
      baseName,
      folderPath,
      basicPath,
      reviewsPath,
      outputPath,
      listingId,
    });
  }

  return activities;
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');

  loadEnvFile(path.join(repoRoot, '.env'));
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY fehlt. Bitte in der .env setzen.');
    process.exitCode = 1;
    return;
  }

  const baseUrl = process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const appName = process.env.OPENROUTER_APP_NAME || DEFAULT_APP_NAME;
  const siteUrl = process.env.OPENROUTER_SITE_URL || '';

  const activitiesDir = path.join(repoRoot, 'backend', 'data', 'activities');
  if (!fs.existsSync(activitiesDir)) {
    console.error(`Ordner nicht gefunden: ${activitiesDir}`);
    process.exitCode = 1;
    return;
  }

  const activities = resolveActivities(activitiesDir);
  if (activities.length === 0) {
    console.log('Keine Activities mit _basic.json und _reviews.json gefunden.');
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

  try {
    console.log(`Gefundene Activities: ${activities.length}`);
    console.log('Auswahl:');
    console.log('1) listing_id(s) (z.B. 1,2,5-7)');
    console.log('2) alle (Warnung: kann teuer sein)');
    console.log('3) nur fehlende customer_voice');

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
      selected = activities.filter((activity) => idSet.has(activity.listingId));
      const missing = ids.filter((id) => !selected.some((activity) => activity.listingId === id));
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
      selected = activities.filter((activity) => !fs.existsSync(activity.outputPath));
      if (selected.length === 0) {
        console.log('Keine fehlenden customer_voice-Dateien gefunden. Abbruch.');
        return;
      }
    } else {
      console.log('Ungültige Auswahl. Abbruch.');
      return;
    }

    for (const activity of selected) {
      if (!fs.existsSync(activity.basicPath) || !fs.existsSync(activity.reviewsPath)) {
        console.log(`Übersprungen (fehlende Dateien): ${activity.baseName}`);
        continue;
      }

      if (fs.existsSync(activity.outputPath)) {
        const confirmRaw = (await ask(`Datei existiert (${path.basename(activity.outputPath)}). Überschreiben? (y/n, default y): `))
          .trim()
          .toLowerCase();
        const shouldOverwrite = confirmRaw === '' || confirmRaw.startsWith('y');
        if (!shouldOverwrite) {
          console.log(`Übersprungen: ${activity.baseName}`);
          continue;
        }
      }

      const basic = JSON.parse(fs.readFileSync(activity.basicPath, 'utf8'));
      const reviews = JSON.parse(fs.readFileSync(activity.reviewsPath, 'utf8'));

      if (!Array.isArray(reviews) || reviews.length === 0) {
        console.log(`Übersprungen (keine Reviews): ${activity.baseName}`);
        continue;
      }

      const prompt = buildPrompt(basic, reviews);
      const messages = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      console.log(`\n[${activity.listingId ?? '?'}] ${activity.baseName}`);
      console.log(`Modell: ${model}`);

      try {
        const response = await requestOpenRouter({
          apiKey,
          baseUrl,
          model,
          messages,
          temperature: DEFAULT_TEMPERATURE,
          maxTokens: DEFAULT_MAX_TOKENS,
          appName,
          siteUrl,
        });

        const content = response?.choices?.[0]?.message?.content?.trim();
        if (!content) {
          throw new Error('Leere Antwort von OpenRouter erhalten.');
        }

        const payload = {
          customer_voice: content,
        };

        fs.writeFileSync(activity.outputPath, JSON.stringify(payload, null, 2), 'utf8');
        console.log(`Gespeichert: ${activity.outputPath}`);
      } catch (error) {
        console.error(`Fehler bei ${activity.baseName}: ${error.message}`);
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
