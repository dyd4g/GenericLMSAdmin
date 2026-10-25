// A separate build folder lets a second dev server (Galilee Prod, read-only) run beside the default one.
module.exports = { distDir: process.env.NEXT_DIST_DIR || '.next' };
