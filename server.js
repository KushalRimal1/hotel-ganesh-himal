// Compatibility entry point: `node server.js` now starts the Next.js website.
const { spawn } = require('child_process');
const path = require('path');

const development = process.argv.includes('--dev');
const args = process.argv.slice(2).filter(arg => arg !== '--dev');
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), development ? 'dev' : 'start', ...args], {
  cwd: path.dirname(__filename),
  env: process.env,
  stdio: 'inherit'
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
