// Starts a copy of the login portal on http://127.0.0.1:3012 that signs in against the Galilee Test identity API.
// The session cookie is scoped to 127.0.0.1, so it stays separate from the RSTI session on localhost.
// Settings are passed as process environment only; no env file is edited.
const path = require('path');
const copy = path.join(__dirname, 'auth-copy');
Object.assign(process.env, {
  NEXT_PUBLIC_IDENTITY_API_URL: 'https://api.identity-dev.dyd.solutions',
  NEXT_PUBLIC_ANALYTICS_API_URL: 'https://api.analytics-dev.dyd.solutions',
  NEXT_PUBLIC_CLIENT_ID: '1',
  NEXT_PUBLIC_TOKEN_DOMAIN: '127.0.0.1',
  NEXT_PUBLIC_COOKIE_IS_SECURE: 'false',
  NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3012',
  NEXT_PUBLIC_DEFAULT_REDIRECT: 'http://127.0.0.1:3004',
  NEXT_PUBLIC_SHOW_SIGNUP: 'false',
});
process.chdir(copy);
process.argv = [process.argv[0], 'next', 'dev', '-H', '127.0.0.1', '-p', '3012'];
require(path.join(copy, 'node_modules', 'next', 'dist', 'bin', 'next'));
