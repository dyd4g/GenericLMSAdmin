const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript'), qs = require('qs');
function load(file, reqs) { const js = ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, m = { exports: {} }; new Function('require', 'module', 'exports', js)(n => reqs[n] || require(n), m, m.exports); return m.exports; }
function run(env) {
  if (env === undefined) delete process.env.NEXT_PUBLIC_LMS_ENV; else process.env.NEXT_PUBLIC_LMS_ENV = env;
  const read = load('lib/read-api.js', {});
  return { read, write: load('lib/write-api.js', { './read-api': read }), keys: load('lib/keys.js', { './read-api': read }) };
}
(async () => {
  const sent = [];
  global.fetch = async (url, init) => { sent.push([init.method, url, init.body]); return { ok: true, status: 204, text: async () => '' }; };
  global.sessionStorage = { getItem: () => null, setItem() {} }; global.document = { cookie: 'dydBearer=t' };
  let { read, write, keys: k } = run('galilee-test');
  const K = read.connection.licenses;

  // Lists: same addresses and the same query keys in the same order as the old admin (qs.stringify), filters left out when not chosen.
  const q = o => qs.stringify(o);
  assert.equal(k.keysUrl('trainee', 7, 5), `${K}/groups/5/courses/7/traineeLicenses?${q({ search: '', resultsPerPage: 10, page: 0 })}`);
  assert.equal(k.keysUrl('coach', 7, 5, { search: 'ab c', resultsPerPage: 25, page: 2, isActive: true, multipleActivations: false, activationsRemaining: true, sortBy: 'LastActivationDate' }),
    `${K}/groups/5/courses/7/coachLicenses?${q({ search: 'ab c', resultsPerPage: 25, page: 2, isActive: true, multipleActivations: false, activationsRemaining: true, sortBy: 'LastActivationDate' })}`);
  assert.equal(k.keysUrl('book', 'b-9_X', 5, { isActive: false }), `${K}/groups/5/books/b-9_X/licenses?${q({ search: '', resultsPerPage: 10, page: 0, isActive: false })}`);
  assert.equal(k.keysUrl('trainee', 7, 5, { isActive: 'yes', sortBy: 'drop table', resultsPerPage: 9999, page: -3 }), `${K}/groups/5/courses/7/traineeLicenses?${q({ search: '', resultsPerPage: 10, page: 0 })}`);
  assert.equal(k.keysUrl('trainee', 7, 5, { search: 'x'.repeat(300) }).split('search=')[1].split('&')[0].length, 100);
  for (const make of [() => k.keysUrl('trainee', 0, 5), () => k.keysUrl('trainee', 7, 'x'), () => k.keysUrl('book', '../x', 5), () => k.keysUrl('book', '', 5), () => k.keysUrl('other', 7, 5)]) assert.throws(make, /Unknown/);

  // Generating: how many, and the activation limit (one unless "multiple activation" is on).
  assert.deepEqual(k.generatePayload({ count: 3 }), { count: 3, maxActivationCount: 1 });
  assert.deepEqual(k.generatePayload({ count: '5', multiple: true, maxActivationCount: '20' }), { count: 5, maxActivationCount: 20 });
  assert.deepEqual(k.generatePayload({ count: 2, multiple: false, maxActivationCount: 50 }), { count: 2, maxActivationCount: 1 });
  for (const bad of [{ count: 0 }, { count: 101 }, { count: 1.5 }, { count: 'x' }, { count: 1, multiple: true, maxActivationCount: 0 }, { count: 1, multiple: true, maxActivationCount: 1001 }, { count: 1, multiple: true, maxActivationCount: '' }]) assert.throws(() => k.generatePayload(bad), /whole number/);
  const shape = r => [r.method, r.path, r.body, r.options.service];
  assert.deepEqual(shape(k.generateKeysRequest('trainee', 7, 5, { count: 2 })), ['POST', '/groups/5/courses/7/traineeLicenses/generate', { count: 2, maxActivationCount: 1 }, 'licenses']);
  assert.deepEqual(shape(k.generateKeysRequest('coach', 7, 5, { count: 2, multiple: true, maxActivationCount: 3 })), ['POST', '/groups/5/courses/7/coachLicenses/generate', { count: 2, maxActivationCount: 3 }, 'licenses']);
  assert.deepEqual(shape(k.generateKeysRequest('book', 'b1', 5, { count: 1 })), ['POST', '/groups/5/books/b1/licenses/generate', { count: 1, maxActivationCount: 1 }, 'licenses']);

  // Deactivating keeps the key's own limit (the service resets it otherwise); coach allocation is for course keys only.
  assert.deepEqual(shape(k.deactivateKeyRequest('trainee', 7, 5, { id: 99, maxActivationCount: 4, isActive: true })), ['PUT', '/groups/5/courses/7/traineeLicenses/99', { maxActivationCount: 4, isActive: false }, 'licenses']);
  assert.deepEqual(shape(k.deactivateKeyRequest('coach', 7, 5, { id: 98, maxActivationCount: 1 })), ['PUT', '/groups/5/courses/7/coachLicenses/98', { maxActivationCount: 1, isActive: false }, 'licenses']);
  assert.deepEqual(shape(k.deactivateKeyRequest('book', 'b1', 5, { id: 97, maxActivationCount: 1 })), ['PUT', '/groups/5/books/b1/licenses/97', { maxActivationCount: 1, isActive: false }, 'licenses']);
  assert.throws(() => k.deactivateKeyRequest('trainee', 7, 5, { id: 0, maxActivationCount: 1 }), /Unknown key/); assert.throws(() => k.deactivateKeyRequest('trainee', 7, 5, { id: 1 }), /activation limit/); assert.throws(() => k.deactivateKeyRequest('trainee', 7, 5, null), /Unknown key/);
  assert.deepEqual(shape(k.assignKeyCoachRequest(7, 5, 99, 4)), ['POST', '/groups/5/courses/7/traineeLicenses/99/coaches', 4, 'licenses']);
  assert.deepEqual(shape(k.unassignKeyCoachRequest(7, 5, 99, 4)), ['DELETE', '/groups/5/courses/7/traineeLicenses/99/coaches/4', undefined, 'licenses']);
  assert.throws(() => k.assignKeyCoachRequest(7, 5, 0, 4), /Unknown key/); assert.throws(() => k.unassignKeyCoachRequest(7, 5, 1, 'x'), /Unknown coach/);

  // Display and the spreadsheet export.
  assert.equal(k.displayKey('ABCD1234EFGH5678'), 'ABCD-1234-EFGH-5678'); assert.equal(k.displayKey('short'), 'short'); assert.equal(k.displayKey(null), '');
  assert.equal(k.activationText({ activationCount: 1, maxActivationCount: 3 }), '1/3'); assert.equal(k.activationText(null), '0/0'); assert.equal(k.keyStatus({ isActive: true }), 'Active'); assert.equal(k.keyStatus({}), 'Inactive');
  const csv = k.keysCsv([{ key: 'ABCD1234EFGH5678', activationCount: 1, maxActivationCount: 2, coaches: [{ name: '=HYPERLINK("x")' }, { name: 'Ann, Lee' }], isActive: true, creationDate: '2026-01-02T00:00:00Z', lastActivationDate: null }]).split('\r\n');
  assert.equal(csv[0], 'Key,Activations,Maximum activations,Coach,Status,Generated at,Last activation at');
  assert.equal(csv[1], `ABCD-1234-EFGH-5678,1,2,"'=HYPERLINK(""x""), Ann, Lee",Active,2026-01-02T00:00:00Z,`);
  assert.equal(k.keysCsv([]).split('\r\n').length, 1);

  // Changes go to the licenses service as built on Galilee Test and are all blocked on Galilee Prod.
  const send = r => write.writeApi(r.path, r.method, r.body, r.options);
  const all = () => [k.generateKeysRequest('trainee', 7, 5, { count: 1 }), k.deactivateKeyRequest('coach', 7, 5, { id: 3, maxActivationCount: 1 }), k.assignKeyCoachRequest(7, 5, 3, 4), k.unassignKeyCoachRequest(7, 5, 3, 4), k.generateKeysRequest('book', 'b1', 5, { count: 1 })];
  for (const r of all()) await send(r);
  assert.deepEqual(sent.map(s => s[0]), ['POST', 'PUT', 'POST', 'DELETE', 'POST']);
  assert.equal(sent[0][1], `${K}/groups/5/courses/7/traineeLicenses/generate`); assert.equal(sent[0][2], JSON.stringify({ count: 1, maxActivationCount: 1 })); assert.equal(sent[2][2], '4');
  ({ read, write, keys: k } = run('galilee-prod')); sent.length = 0; read.writeScope.groupId = 1003;
  const send2 = r => write.writeApi(r.path, r.method, r.body, r.options);
  for (const r of [k.generateKeysRequest('trainee', 7, 1003, { count: 1 }), k.deactivateKeyRequest('trainee', 7, 1003, { id: 3, maxActivationCount: 1 }), k.assignKeyCoachRequest(7, 1003, 3, 4)]) await assert.rejects(() => send2(r), /License key changes are not available in Galilee Prod/);
  assert.equal(sent.length, 0);
  console.log('License key lists, generation, deactivation, coach allocation, export and Prod blocking checks passed. No real API requests issued.');
})().catch(e => { console.error(e); process.exit(1); });
