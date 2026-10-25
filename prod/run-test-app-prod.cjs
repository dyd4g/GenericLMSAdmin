// Builds the new admin for Galilee Test (fully editable) and serves the production build on http://127.0.0.1:3004.
// Used instead of `next dev`, which renders a blank page after a reload on Next 15.5.28. Only touches the new app's own folder.
// After changing code, restart this server so it rebuilds.
const path = require('path');
const { spawnSync } = require('child_process');
const app = path.resolve(__dirname, '..', 'mui-preview');
const next = path.join(app, 'node_modules', 'next', 'dist', 'bin', 'next');
process.env.NEXT_PUBLIC_LMS_ENV = 'galilee-test';
process.env.NEXT_DIST_DIR = '.next-test-prod';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.chdir(app);
const build = spawnSync(process.execPath, [next, 'build'], { stdio: 'inherit', env: process.env });
if (build.status !== 0) process.exit(build.status || 1);
process.argv = [process.argv[0], 'next', 'start', '-H', '127.0.0.1', '-p', '3004'];
require(next);
