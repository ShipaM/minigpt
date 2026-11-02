import { spawn } from 'node:child_process';

const tscWatch = 'npx tsc -p tsconfig.build.json --watch --preserveWatchOutput';

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

// Ctrl+C reaches every child through the shared console, so no signal forwarding is needed.
for (const { cwd, command } of processes) {
  spawn(command, { cwd, shell: true, stdio: 'inherit' });
}
