import { spawn } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scripts = [
  {
    key: '1',
    label: 'Apify: Google-Maps-Daten abrufen',
    description:
      'Ruft pro Activity Google-Maps-Daten über Apify ab und speichert je Activity eine JSON-Datei in backend/data/activities.',
    command: {
      cmd: 'node',
      args: [path.join(__dirname, 'apify_google_maps_reviews.mjs')],
    },
  },
  {
    key: '2',
    label: 'Apify-Output verarbeiten (basic/reviews)',
    description:
      'Erstellt pro Activity einen Ordner mit *_basic.json und *_reviews.json aus den Apify-Outputs.',
    command: {
      cmd: 'node',
      args: [path.join(__dirname, 'process_apify_activity_output.mjs')],
    },
  },
  {
    key: '3',
    label: 'OpenRouter: Customer Voice generieren',
    description:
      'Aggregiert Reviews via OpenRouter zu einer kurzen Customer-Voice-Zusammenfassung pro Activity.',
    command: {
      cmd: 'node',
      args: [path.join(__dirname, 'openrouter_customer_voice.mjs')],
    },
  },
  {
    key: '4',
    label: 'activities.json aktualisieren',
    description:
      'Überträgt customer_voice und ausgewählte Felder (Adresse, Kontakt, Koordinaten, Menü, Rating) aus *_basic/_customer_voice nach activities.json.',
    command: {
      cmd: 'node',
      args: [path.join(__dirname, 'update_activities.mjs')],
    },
  },
  {
    key: '5',
    label: 'Seed Activities (DB)',
    description:
      'Lädt backend/data/activities.json in die Datenbank (Python, DB muss laufen).',
    command: {
      cmd: 'python',
      args: [path.join(__dirname, 'seed_activities.py')],
    },
  },
  {
    key: '6',
    label: 'Activities importieren (DB)',
    description:
      'Importiert Activities aus einer JSON-Datei (Python, benötigt Dateipfad als Argument).',
    command: {
      cmd: 'python',
      args: [path.join(__dirname, 'import_activities.py')],
      needsArgs: true,
    },
  },
  {
    key: '7',
    label: 'Activities geocoden',
    description:
      'Ergänzt fehlende Koordinaten in backend/data/activities.json (Python, 1 req/s).',
    command: {
      cmd: 'python',
      args: [path.join(__dirname, 'geocode_activities.py')],
    },
  },
  {
    key: '8',
    label: 'E-Mail-Test',
    description:
      'Sendet eine Test-E-Mail via Resend (Python, erwartet Empfänger-Adresse als Argument).',
    command: {
      cmd: 'python',
      args: [path.join(__dirname, 'test_email.py')],
      needsArgs: true,
    },
  },
];

function printHeader() {
  console.log('Daten-Management');
  console.log('Interaktiver Launcher für die wichtigsten Daten- und KI-Skripte.');
  console.log('Beachte: Python-Skripte benötigen ggf. venv + DB.');
  console.log('');
}

function printMenu() {
  for (const entry of scripts) {
    console.log(`${entry.key}) ${entry.label}`);
    console.log(`   ${entry.description}`);
  }
  console.log('0) Beenden');
  console.log('');
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => resolve(code));
  });
}

function createInterface() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question) => new Promise((resolve) => rl.question(question, resolve));
  return { rl, ask };
}

function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.resume();
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter drücken, um zum Menü zurückzukehren...', () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  while (true) {
    const { rl, ask } = createInterface();
    let shouldClose = true;

    try {
      printHeader();
      printMenu();

      const choice = (await ask('Auswahl: ')).trim();
      if (choice === '0' || choice.toLowerCase() === 'q') {
        return;
      }

      const entry = scripts.find((item) => item.key === choice);
      if (!entry) {
        console.log('Ungültige Auswahl.');
        console.log('');
        continue;
      }

      console.log('');
      console.log(entry.description);
      let extraArgs = [];

      if (entry.command.needsArgs) {
        const rawArgs = (await ask('Zusätzliche Argumente (leer lassen, wenn keine): ')).trim();
        if (rawArgs) {
          extraArgs = rawArgs.split(' ').filter(Boolean);
        }
      }

      const confirm = (await ask('Jetzt ausführen? (y/n, default y): ')).trim().toLowerCase();
      const shouldRun = confirm === '' || confirm.startsWith('y');
      if (!shouldRun) {
        console.log('Abgebrochen.');
        console.log('');
        continue;
      }

      rl.close();
      shouldClose = false;

      console.log('');
      const exitCode = await runCommand(entry.command.cmd, [...entry.command.args, ...extraArgs]);
      console.log('');
      console.log(`Fertig (Exit-Code ${exitCode}).`);
      console.log('');
      await waitForEnter();
      console.log('');
    } finally {
      if (shouldClose) {
        rl.close();
      }
    }
  }
}

main().catch((error) => {
  console.error(error?.message ?? String(error));
  process.exitCode = 1;
});
