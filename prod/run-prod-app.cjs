// Starts the new admin against Galilee Prod (read-only) on http://127.0.0.1:3004.
// Uses its own build folder so it can run beside the RSTI instance on 3003.
const path = require('path');
const app = path.resolve(__dirname, '..', 'mui-preview');
process.env.NEXT_PUBLIC_LMS_ENV = 'galilee-prod';
process.env.NEXT_DIST_DIR = '.next-prod';
process.chdir(app);
process.argv = [process.argv[0], 'next', 'dev', '-H', '127.0.0.1', '-p', '3004'];
require(path.join(app, 'node_modules', 'next', 'dist', 'bin', 'next'));
