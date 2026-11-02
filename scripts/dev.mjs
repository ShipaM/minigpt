import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const tscWatch = 'npx tsc -p tsconfig.build.json --watch --preserveWatchOutput';
const isWindows = process.platform === 'win32';

const processes = [
  { cwd: 'packages/contracts', command: tscWatch },
  { cwd: 'apps/api', command: tscWatch },
  {
    cwd: 'apps/api',
    // Without --watch-preserve-output each restart clears the terminal, wiping the Next.js URL.
    command: 'node --env-file-if-exists=../../.env --watch --watch-preserve-output dist/main.js',
  },
  { cwd: 'apps/web', command: 'npm run dev' },
];

// On Unix each child gets its own process group so the whole tree can be killed at once.
const children = processes.map(({ cwd, command }) => ({
  command,
  child: spawn(command, { cwd, shell: true, stdio: 'inherit', detached: !isWindows }),
}));

let stopping = false;

// Killing only the shell would leave its children running, so kill the whole tree.
function stopAll() {
  if (stopping) return;
  stopping = true;
  for (const { child } of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    if (isWindows) {
      spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGTERM');
    }
  }
}

for (const { command, child } of children) {
  child.on('exit', (code, signal) => {
    if (stopping) return;
    process.stderr.write(
      `\n[dev] "${command}" exited (${signal ?? `code ${code}`}), stopping the rest.\n`,
    );
    process.exitCode = 1;
    stopAll();
  });
}

// On Unix the detached children do not receive Ctrl+C from the terminal.
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
