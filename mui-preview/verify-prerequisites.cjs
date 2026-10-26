const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript'), qs = require('qs');
function load(file, reqs) { const js = ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, m = { exports: {} }; new Function('require', 'module', 'exports', js)(n => reqs[n] || require(n), m, m.exports); return m.exports; }
function run(env) {
  if (env === undefined) delete process.env.NEXT_PUBLIC_LMS_ENV; else process.env.NEXT_PUBLIC_LMS_ENV = env;
  const read = load('lib/read-api.js', {});
  return { read, write: load('lib/write-api.js', { './read-api': read }), p: load('lib/prerequisites.js', { './read-api': read }) };
}
(async () => {
  const sent = [];
  global.fetch = async (url, init) => { sent.push([init.method, url, init.body]); return { ok: true, status: 204, text: async () => '' }; };
  global.sessionStorage = { getItem: () => null, setItem() {} }; global.document = { cookie: 'dydBearer=t' };
  let { read, write, p } = run('galilee-test');
  const L = read.connection.learning;

  // The lists come with the course.
  assert.equal(p.coursePrerequisitesUrl(7), `${L}/api/courses/7`);
  assert.deepEqual(p.prerequisiteRows({ coachQualifyingCourses: [{ id: 1 }], coachQualifiedCourses: [{ id: 2 }, { id: 3 }] }), { required: [{ id: 1 }], unlocks: [{ id: 2 }, { id: 3 }] });
  assert.deepEqual(p.prerequisiteRows({}), { required: [], unlocks: [] }); assert.deepEqual(p.prerequisiteRows(null), { required: [], unlocks: [] }); assert.deepEqual(p.prerequisiteRows({ coachQualifyingCourses: 'x' }), { required: [], unlocks: [] });

  // Candidates: same keys in the same order as the old admin (qs.stringify); unknown page sizes fall back to 10.
  assert.equal(p.prerequisiteCandidatesUrl(7), `${L}/api/courses/7/coachQualifyingCourseCandidates?${qs.stringify({ search: '', page: 0, resultsPerPage: 10 })}`);
  assert.equal(p.prerequisiteCandidatesUrl(7, 'ab c', { page: 2, resultsPerPage: 25 }), `${L}/api/courses/7/coachQualifyingCourseCandidates?${qs.stringify({ search: 'ab c', page: 2, resultsPerPage: 25 })}`);
  assert.equal(p.prerequisiteCandidatesUrl(7, '', { page: -4, resultsPerPage: 9999 }), `${L}/api/courses/7/coachQualifyingCourseCandidates?${qs.stringify({ search: '', page: 0, resultsPerPage: 10 })}`);
  assert.equal(p.prerequisiteCandidatesUrl(7, 'x'.repeat(300)).split('search=')[1].split('&')[0].length, 200);
  assert.throws(() => p.prerequisiteCandidatesUrl(0), /Unknown course/); assert.throws(() => p.prerequisiteCandidatesUrl('../x'), /Unknown course/);

  // Changes: same paths and bodies as the old admin, scoped to the course's group.
  const shape = r => [r.method, r.path, r.body, r.options.groupId];
  assert.deepEqual(shape(p.addPrerequisiteRequest(7, 5, 9)), ['POST', '/api/courses/7/coachQualifyingCourses', 9, 5]);
  assert.deepEqual(shape(p.removePrerequisiteRequest(7, 5, 9)), ['DELETE', '/api/courses/7/coachQualifyingCourses/9', undefined, 5]);
  assert.throws(() => p.addPrerequisiteRequest(7, 5, 7), /own prerequisite/); assert.throws(() => p.addPrerequisiteRequest(7, 5, 0), /Unknown prerequisite/); assert.throws(() => p.removePrerequisiteRequest(0, 5, 1), /Unknown course/);

  // Sending on Galilee Test goes to the learning service; on Galilee Prod only the RSTI group can be changed.
  const send = r => write.writeApi(r.path, r.method, r.body, r.options);
  await send(p.addPrerequisiteRequest(7, 5, 9)); await send(p.removePrerequisiteRequest(7, 5, 9));
  assert.deepEqual(sent.map(s => s[0]), ['POST', 'DELETE']); assert.equal(sent[0][1], `${L}/api/courses/7/coachQualifyingCourses`); assert.equal(sent[0][2], '9'); assert.equal(sent[1][1], `${L}/api/courses/7/coachQualifyingCourses/9`);
  ({ read, write, p } = run('galilee-prod')); sent.length = 0;
  const send2 = r => write.writeApi(r.path, r.method, r.body, r.options);
  // Galilee Prod only allows the RSTI group (1003), like other course edits; any other group is blocked and nothing is sent.
  for (const r of [p.addPrerequisiteRequest(7, 5, 9), p.removePrerequisiteRequest(7, 5, 9)]) await assert.rejects(() => send2(r), /limited to the/);
  assert.equal(sent.length, 0);
  await send2(p.addPrerequisiteRequest(7, 1003, 9)); assert.equal(sent.length, 1);
  console.log('Coach prerequisite lists, candidates, add, remove and Prod blocking checks passed. No real API requests issued.');
})().catch(e => { console.error(e); process.exit(1); });
