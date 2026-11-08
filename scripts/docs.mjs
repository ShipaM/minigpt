import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

// Same default as apps/api/src/config/env.ts.
const port = process.env.PORT || '4000';
const url = `http://localhost:${port}/docs`;
const isWindows = process.platform === 'win32';

async function isUp() {
  try {
    return (await globalThis.fetch(url)).ok;
  } catch {
    // Connection refused: the API is not running yet.
    return false;
  }
}

function openBrowser() {
  const [command, args] = isWindows
    ? ['cmd', ['/c', 'start', '""', url]]
    : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  spawn(command, args, { stdio: 'ignore', detached: true }).unref();
  process.stdout.write(`[docs] Swagger UI: ${url}\n`);
}

// The API is already running (e.g. `npm run dev`): just open the page.
if (await isUp()) {
  openBrowser();
  process.exit(0);
}

const build = spawnSync('npm run build -w @minigpt/api', { shell: true, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

const api = spawn('node --env-file-if-exists=../../.env dist/main.js', {
  cwd: 'apps/api',
  shell: true,
  stdio: 'inherit',
});

let stopping = false;

// Killing only the shell would leave node running, so kill the whole tree.
function stop() {
  if (stopping) return;
  stopping = true;
  if (isWindows) {
    spawnSync('taskkill', ['/T', '/F', '/PID', String(api.pid)], { stdio: 'ignore' });
  } else {
    api.kill('SIGTERM');
  }
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
api.on('exit', (code) => {
  if (!stopping) process.exitCode = code ?? 1;
});

// Wait up to 30 seconds for the API to start (it fails fast on bad env or no database).
for (let i = 0; i < 60 && api.exitCode === null; i++) {
  if (await isUp()) {
    openBrowser();
    break;
  }
  await sleep(500);
}
