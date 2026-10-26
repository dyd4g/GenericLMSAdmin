const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript'), qs = require('qs');
function load(file, reqs) { const js = ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, m = { exports: {} }; new Function('require', 'module', 'exports', js)(n => reqs[n] || require(n), m, m.exports); return m.exports; }
function run(env) {
  if (env === undefined) delete process.env.NEXT_PUBLIC_LMS_ENV; else process.env.NEXT_PUBLIC_LMS_ENV = env;
  const read = load('lib/read-api.js', {});
  const settings = load('lib/group-settings.js', { './read-api': read });
  const assets = load('lib/user-assets.js', { './read-api': read });
  return { read, write: load('lib/write-api.js', { './read-api': read }), members: load('lib/members.js', { './read-api': read, './group-settings': settings, './user-assets': assets }) };
}
(async () => {
  const sent = [];
  global.fetch = async (url, init) => { sent.push([init.method, url, init.body]); return { ok: true, status: 204, text: async () => '' }; };
  global.sessionStorage = { getItem: () => null, setItem() {} }; global.document = { cookie: 'dydBearer=t' };
  let { read, write, members: m } = run('galilee-test');
  const L = read.connection.learning;

  // The members list asks the way the old admin does: same keys in the same order, empty filters left out.
  const old = o => `${L}/api/groups/5/members?${qs.stringify(o)}`;
  assert.equal(m.membersUrl(5), old({ search: '', page: 0, resultsPerPage: 10 }));
  assert.equal(m.membersUrl(5, { search: 'ann lee', sortBy: 'name', adminsOnly: true, membershipStatus: ['pending', 'member'], page: 3, resultsPerPage: 25 }), old({ search: 'ann lee', sortBy: 'name', isAdmin: true, page: 3, resultsPerPage: 25, membershipStatus: ['pending', 'member'] }));
  assert.equal(m.membersUrl(5, { sortBy: 'password', membershipStatus: ['bogus'], resultsPerPage: 9999, page: -2 }), old({ search: '', page: 0, resultsPerPage: 10 }));
  assert.equal(m.membersUrl(5, { search: 'x'.repeat(500) }).split('search=')[1].split('&')[0].length, 200);
  assert.throws(() => m.membersUrl(0), /Unknown group/); assert.throws(() => m.membersUrl('../x'), /Unknown group/);

  // Changes: same paths and bodies as the old admin.
  const shape = r => [r.method, r.path, r.body, r.options.userLevel];
  assert.deepEqual(shape(m.approveMemberRequest(5, 12)), ['POST', '/api/groups/5/members/12/approve', undefined, true]);
  assert.deepEqual(shape(m.setMemberRoleRequest(5, 12, 'Admin')), ['PUT', '/api/groups/5/members/12/role', 'Admin', true]);
  assert.deepEqual(shape(m.setMemberRoleRequest(5, 12, 'Member')), ['PUT', '/api/groups/5/members/12/role', 'Member', true]);
  assert.throws(() => m.setMemberRoleRequest(5, 12, 'Owner'), /Admin or Member/);
  assert.deepEqual(shape(m.removeMemberRequest(5, 12)), ['DELETE', '/api/Users/12/groups/5', undefined, true]);
  assert.deepEqual(shape(m.addMemberRequest(5, 12)), ['POST', '/api/Users/12/groups', 5, true]);
  for (const make of [() => m.approveMemberRequest(5, 0), () => m.removeMemberRequest('x', 1), () => m.setMemberRoleRequest(0, 1, 'Admin'), () => m.addMemberRequest(5, -1)]) assert.throws(make, /Unknown/);

  // Create: the old admin's body; the URL code only from a system administrator, and every limit enforced.
  const create = (values, opts) => m.createGroupRequest(values, opts);
  assert.deepEqual(shape(create({ name: ' Team A ', description: 'Hi', code: 'team-a' }, { isSystemAdmin: true })), ['POST', '/api/groups', { name: 'Team A', code: 'team-a', description: 'Hi', body: '' }, true]);
  assert.equal(create({ name: 'Team A', code: 'team-a' }, { isSystemAdmin: false }).body.code, null);
  assert.equal(create({ name: 'Team A', code: '' }, { isSystemAdmin: true }).body.code, null);
  assert.equal(create({ name: 'Team A' }).body.description, '');
  assert.throws(() => create({ name: '   ' }), /Enter a group name/); assert.throws(() => create({ name: 'x'.repeat(81) }), /80 characters/);
  assert.throws(() => create({ name: 'a', description: 'x'.repeat(501) }), /500 characters/);
  assert.throws(() => create({ name: 'a', code: 'bad code!' }, { isSystemAdmin: true }), /letters, numbers or hyphens/); assert.throws(() => create({ name: 'a', code: 'x'.repeat(26) }, { isSystemAdmin: true }), /25/);

  // Delete: system administrator only, only with the exact name typed.
  const group = { id: 7, name: 'Team A' };
  assert.deepEqual(shape(m.deleteGroupRequest(group, 'Team A', { isSystemAdmin: true })), ['DELETE', '/api/groups/7', undefined, true]);
  assert.throws(() => m.deleteGroupRequest(group, 'Team A'), /system administrator/); assert.throws(() => m.deleteGroupRequest(group, 'team a', { isSystemAdmin: true }), /exactly/);
  assert.throws(() => m.deleteGroupRequest({ id: 7, name: '' }, '', { isSystemAdmin: true }), /exactly/); assert.throws(() => m.deleteGroupRequest(null, 'x', { isSystemAdmin: true }), /Unknown group/);
  assert.equal(m.canCreateGroup({ isSystemAdmin: true, groupCount: 12 }), true); assert.equal(m.canCreateGroup({ isSystemAdmin: false, groupCount: 0 }), true); assert.equal(m.canCreateGroup({ isSystemAdmin: false, groupCount: 3 }), false); assert.equal(m.canCreateGroup({}), false);

  // Standing of a member.
  assert.equal(m.memberStatus({ isAdmin: true, membershipStatus: 'Member' }), 'admin'); assert.equal(m.memberStatus({ isAdmin: false, membershipStatus: 'Pending' }), 'pending'); assert.equal(m.memberStatus({ isAdmin: false, membershipStatus: 'Member' }), 'member'); assert.equal(m.memberStatus(null), 'member');

  // Writes go out as built on Galilee Test and are all blocked on Galilee Prod, even for the RSTI group.
  const send = r => write.writeApi(r.path, r.method, r.body, r.options);
  const all = () => [m.approveMemberRequest(5, 12), m.setMemberRoleRequest(5, 12, 'Admin'), m.removeMemberRequest(5, 12), m.addMemberRequest(5, 12), create({ name: 'A' }), m.deleteGroupRequest(group, 'Team A', { isSystemAdmin: true })];
  for (const r of all()) await send(r);
  assert.deepEqual(sent.map(s => s[0]), ['POST', 'PUT', 'DELETE', 'POST', 'POST', 'DELETE']);
  assert.equal(sent[4][1], `${L}/api/groups`); assert.equal(sent[4][2], JSON.stringify({ name: 'A', code: null, description: '', body: '' })); assert.equal(sent[1][2], '"Admin"');
  ({ read, write, members: m } = run('galilee-prod')); sent.length = 0; read.writeScope.groupId = 1003;
  const send2 = r => write.writeApi(r.path, r.method, r.body, r.options);
  for (const r of [m.approveMemberRequest(1003, 12), m.removeMemberRequest(1003, 12), m.createGroupRequest({ name: 'A' }), m.deleteGroupRequest(group, 'Team A', { isSystemAdmin: true })]) await assert.rejects(() => send2(r), /User changes are not available in Galilee Prod/);
  assert.equal(sent.length, 0);
  console.log('Group member lists, role, approval, removal, group creation and deletion checks passed. No real API requests issued.');
})().catch(e => { console.error(e); process.exit(1); });
