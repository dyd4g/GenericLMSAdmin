const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript'), qs = require('qs');
function load(file, reqs) { const js = ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, m = { exports: {} }; new Function('require', 'module', 'exports', js)(n => reqs[n] || require(n), m, m.exports); return m.exports; }
function run(env) {
  if (env === undefined) delete process.env.NEXT_PUBLIC_LMS_ENV; else process.env.NEXT_PUBLIC_LMS_ENV = env;
  const read = load('lib/read-api.js', {});
  return { read, write: load('lib/write-api.js', { './read-api': read }), people: load('lib/participants.js', { './read-api': read }), files: load('lib/download.js', { './read-api': read }) };
}
(async () => {
  const sent = [];
  global.fetch = async (url, init) => { sent.push([init.method, url, init.body]); return { ok: true, status: 204, text: async () => '' }; };
  global.sessionStorage = { getItem: () => null, setItem() {} }; global.document = { cookie: 'dydBearer=t' };
  let { read, write, people: p, files } = run('galilee-test');
  const L = read.connection.learning;

  // The participant list asks the way the old admin does: same keys in the same order, filters left out when empty.
  const old = o => `${L}/api/courses/7/trainees?${qs.stringify(o)}`;
  assert.equal(p.traineesUrl(7), old({ search: '', coachPending: false, page: 0, resultsPerPage: 10 }));
  assert.equal(p.traineesUrl(7, { search: 'ann lee', sortBy: 'name', coachIds: [3, 4], traineeStatus: ['finished', 'inProgress'], pendingApproval: true, coachPending: true, enrollmentDateStart: '2026-01-02', enrollmentDateEnd: '2026-03-04', page: 2, resultsPerPage: 25 }),
    old({ search: 'ann lee', sortBy: 'name', enrollmentDateStart: '2026-01-02', enrollmentDateEnd: '2026-03-04', coachId: [3, 4], traineeStatus: ['finished', 'inProgress'], enrollmentStatus: ['pending'], coachPending: true, page: 2, resultsPerPage: 25 }));
  // Unknown filter, sort, date and page-size values are dropped instead of being sent.
  assert.equal(p.traineesUrl(7, { sortBy: 'password', traineeStatus: ['x', 'finished'], enrollmentDateStart: 'yesterday', resultsPerPage: 5000, page: -4 }), old({ search: '', traineeStatus: ['finished'], coachPending: false, page: 0, resultsPerPage: 10 }));
  assert.equal(p.traineesUrl(7, { search: 'x'.repeat(500) }).split('search=')[1].split('&')[0].length, 200);
  assert.throws(() => p.traineesUrl(0), /Unknown course/); assert.throws(() => p.traineesUrl('../x'), /Unknown course/); assert.throws(() => p.traineesUrl(7, { coachIds: ['a'] }), /Unknown coach/);
  assert.equal(p.courseCoachesUrl(7), `${L}/api/courses/7/coaches`);
  assert.equal(p.traineeCandidatesUrl(7, 'a b'), `${L}/api/courses/7/traineeCandidates?${qs.stringify({ search: 'a b' })}`);
  assert.equal(p.coachCandidatesUrl(7), `${L}/api/courses/7/coachCandidates?${qs.stringify({ search: '' })}`);
  assert.equal(p.completionUrl(7, 12), `${L}/api/courses/7/trainees/12/lessons`);
  assert.equal(p.certificateUrl(12, 7), `${L}/api/trainee/12/courses/7/certificate`);
  assert.equal(p.transcriptUrl(12), `${L}/api/Users/12/transcript`);
  assert.equal(p.responsesUrl(7), `${L}/api/courses/7/formResponses?`); assert.equal(p.responsesUrl(7, 3), `${L}/api/courses/7/formResponses?coachId=3`);

  // Changes: same paths and bodies as the old admin, all treated as changes to people.
  const shape = r => [r.method, r.path, r.body, r.options.userLevel];
  assert.deepEqual(shape(p.approveRequest(7, 12)), ['POST', '/api/courses/7/trainees/12/approve', undefined, true]);
  assert.deepEqual(shape(p.enrollRequest(7, 12)), ['POST', '/api/Users/12/traineeCourses', 7, true]);
  assert.deepEqual(shape(p.removeParticipantRequest(7, 12)), ['DELETE', '/api/Users/12/traineeCourses/7', undefined, true]);
  assert.deepEqual(shape(p.addCoachRequest(7, 5)), ['POST', '/api/courses/7/coaches', 5, true]);
  assert.deepEqual(shape(p.removeCoachRequest(7, 5)), ['DELETE', '/api/courses/7/coaches/5', undefined, true]);
  assert.deepEqual(shape(p.assignCoachRequest(7, 12, 5)), ['POST', '/api/courses/7/trainees/12/coach', 5, true]);
  assert.deepEqual(shape(p.unassignCoachRequest(7, 12, 5)), ['DELETE', '/api/courses/7/trainees/12/coach/5', undefined, true]);
  assert.deepEqual(shape(p.finishTaskRequest(12, 99)), ['POST', '/api/trainees/12/task/99/finish', undefined, true]);
  for (const make of [() => p.approveRequest(7, 0), () => p.enrollRequest('x', 1), () => p.assignCoachRequest(7, 1, '../'), () => p.finishTaskRequest(1, -2), () => p.removeCoachRequest(7, 1.5)]) assert.throws(make, /Unknown/);

  // Standing of a participant, task rules, and the one-by-one runner.
  assert.equal(p.participantState({ progress: 1 }), 'completed'); assert.equal(p.participantState({ progress: 0.4 }), 'inProgress');
  assert.equal(p.participantState({ progress: 0, enrollmentStatus: 'Pending' }), 'waiting'); assert.equal(p.participantState({ progress: 0, enrollmentStatus: 'Enrolled' }), 'notStarted'); assert.equal(p.participantState(null), 'notStarted');
  assert.equal(p.isPending({ enrollmentStatus: 'pending' }), true); assert.equal(p.isPending({ enrollmentStatus: 'Enrolled' }), false);
  assert.equal(p.canMarkComplete({ status: 'NotStarted', isEnabled: true }), true); assert.equal(p.canMarkComplete({ status: 'Passed' }), false); assert.equal(p.canMarkComplete({ status: 'InProgress', isEnabled: false }), false); assert.equal(p.canMarkComplete(null), false);
  const calls = [];
  const result = await p.runEach([1, 2, 3], async request => { calls.push(request.id); if (request.id === 2) throw new Error('No access'); }, id => ({ id }));
  assert.deepEqual(calls, [1, 2, 3]); assert.deepEqual(result.done, [1, 3]); assert.deepEqual(result.failed, [{ id: 2, message: 'No access' }]);

  // Writes go out exactly as built, on Galilee Test; every one is blocked on Galilee Prod, even in the RSTI group that courses can be changed in.
  const send = r => write.writeApi(r.path, r.method, r.body, r.options);
  const all = () => [p.approveRequest(7, 12), p.enrollRequest(7, 12), p.removeParticipantRequest(7, 12), p.addCoachRequest(7, 5), p.removeCoachRequest(7, 5), p.assignCoachRequest(7, 12, 5), p.unassignCoachRequest(7, 12, 5), p.finishTaskRequest(12, 99)];
  for (const r of all()) await send(r);
  assert.equal(sent.length, 8); assert.deepEqual(sent.map(s => s[0]), ['POST', 'POST', 'DELETE', 'POST', 'DELETE', 'POST', 'DELETE', 'POST']);
  assert.equal(sent[1][1], `${L}/api/Users/12/traineeCourses`); assert.equal(sent[1][2], '7'); assert.equal(sent[0][2], undefined);
  ({ read, write, people: p } = run('galilee-prod')); sent.length = 0; read.writeScope.groupId = 1003;
  const send2 = r => write.writeApi(r.path, r.method, r.body, r.options);
  for (const r of all()) await assert.rejects(() => send2(r), /User changes are not available in Galilee Prod/);
  assert.equal(sent.length, 0);
  assert.equal(read.canWriteUsers(), false);

  // Files: the session is sent, the answer is handled by status, nothing is stored.
  ({ read, write, people: p, files } = run('galilee-test'));
  const seen = [];
  const answer = status => async (url, init) => { seen.push([url, init.headers.authorization, init.credentials]); return { ok: status === 200, status, blob: async () => 'BLOB' }; };
  assert.equal(await files.readFile('https://x.test/f', { fetcher: answer(200) }), 'BLOB'); assert.deepEqual(seen[0], ['https://x.test/f', 'Bearer t', 'omit']);
  await assert.rejects(() => files.readFile('u', { fetcher: answer(401) }), /session has expired/);
  await assert.rejects(() => files.readFile('u', { fetcher: answer(403) }), /permission/);
  await assert.rejects(() => files.readFile('u', { fetcher: answer(404) }), /not available/);
  await assert.rejects(() => files.readFile('u', { fetcher: answer(500) }), /HTTP 500/);
  global.document = { cookie: '' }; await assert.rejects(() => files.readFile('u', { fetcher: answer(200) }), /Sign in/); global.document = { cookie: 'dydBearer=t' };
  assert.equal(files.safeFileName('Ann/Lee: <b>x</b>.pdf'), 'AnnLee bxb.pdf');
  assert.equal(files.safeFileName('///'), 'download'); assert.equal(files.safeFileName('  '), 'download'); assert.equal(files.safeFileName('José Núñez'), 'José Núñez'); assert.equal(files.safeFileName('a'.repeat(300)).length, 100);
  assert.equal(files.todayStamp(new Date(2026, 0, 5)), '2026-01-05');
  console.log('Participant and coach lists, filters, writes, Prod blocking and file downloads checks passed. No real API requests issued.');
})().catch(e => { console.error(e); process.exit(1); });
