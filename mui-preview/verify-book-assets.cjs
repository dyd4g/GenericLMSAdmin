const fs = require('fs'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file, reqs) { const js = ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, m = { exports: {} }; new Function('require', 'module', 'exports', js)(n => reqs[n] || require(n), m, m.exports); return m.exports; }
function run(env) {
  if (env === undefined) delete process.env.NEXT_PUBLIC_LMS_ENV; else process.env.NEXT_PUBLIC_LMS_ENV = env;
  const read = load('lib/read-api.js', {});
  const write = load('lib/write-api.js', { './read-api': read });
  return { read, write, b: load('lib/book-assets.js', { './read-api': read, './write-api': write }) };
}
(async () => {
  const sent = [];
  global.fetch = async (url, init) => { sent.push([init.method, url, init.body, init.headers]); return { ok: true, status: 204, text: async () => '' }; };
  global.sessionStorage = { getItem: () => null, setItem() {} }; global.document = { cookie: 'dydBearer=t' };
  global.FormData = class { constructor() { this.parts = []; } append(name, value) { this.parts.push([name, value]); } };
  let { read, write, b } = run('galilee-test');
  const B = read.connection.books;
  const shape = r => [r.method, r.path, r.body, r.options.service];

  // Rules: what can be changed on which book.
  assert.equal(b.canChangeCover({ publishStatus: 'Draft' }), true); assert.equal(b.canChangeCover({ publishStatus: 'Published' }), true); assert.equal(b.canChangeCover({ publishStatus: 'Archived' }), false); assert.equal(b.canChangeCover(null), false);
  assert.equal(b.canChangeFile({ publishStatus: 'Draft' }), true); assert.equal(b.canChangeFile({ publishStatus: 'Published' }), false); assert.equal(b.canChangeFile({ publishStatus: 'Archived' }), false);
  assert.equal(b.canManagePublished({ publishStatus: 'Published' }, true), true); assert.equal(b.canManagePublished({ publishStatus: 'Published' }, false), false); assert.equal(b.canManagePublished({ publishStatus: 'Draft' }, true), false);

  // Files are checked before anything is sent.
  assert.match(b.coverError(null), /Choose an image/); assert.match(b.coverError({ type: 'text/plain', size: 5 }), /image file/); assert.match(b.coverError({ type: 'image/png', size: 0 }), /empty/); assert.equal(b.coverError({ type: 'image/png', size: 5 }), null);
  assert.match(b.bookFileError({ name: 'a.pdf', size: 5 }), /EPUB/); assert.match(b.bookFileError({ name: 'a.epub', size: 0 }), /empty/); assert.equal(b.bookFileError({ name: 'Book.EPUB', size: 5 }), null); assert.match(b.bookFileError(null), /EPUB/);

  // Store listings: both fields, a real web link.
  assert.match(b.storeListingError({ storeName: ' ', productUrl: 'https://x.test/a' }), /store name/); assert.match(b.storeListingError({ storeName: 'S', productUrl: '' }), /link/);
  assert.match(b.storeListingError({ storeName: 'S', productUrl: 'not a url' }), /http/); assert.match(b.storeListingError({ storeName: 'S', productUrl: 'javascript:alert(1)' }), /http/); assert.match(b.storeListingError({ storeName: 'x'.repeat(101), productUrl: 'https://x.test' }), /100/);
  assert.equal(b.storeListingError({ storeName: 'Shop', productUrl: 'https://shop.test/book?id=1' }), null);

  // Requests: same addresses and bodies as the old admin, all to the books service.
  assert.deepEqual(shape(b.removeCoverRequest(5, 'ab-1')), ['DELETE', '/Groups/5/Books/ab-1/cover', undefined, 'books']);
  assert.deepEqual(shape(b.removeFileRequest(5, 'ab-1')), ['DELETE', '/Groups/5/Books/ab-1/file', undefined, 'books']);
  assert.deepEqual(shape(b.revisionRequest(5, 'ab-1', true)), ['PUT', '/Groups/5/Books/ab-1/revisionStatus', 'Revised', 'books']);
  assert.deepEqual(shape(b.revisionRequest(5, 'ab-1', false)), ['PUT', '/Groups/5/Books/ab-1/revisionStatus', 'NotRevised', 'books']);
  assert.deepEqual(shape(b.addStoreListingRequest(5, 'ab-1', { storeName: ' Shop ', productUrl: ' https://shop.test/b ' })), ['POST', '/Groups/5/Books/ab-1/externalProductLocations', { storeName: 'Shop', productUrl: 'https://shop.test/b' }, 'books']);
  assert.deepEqual(shape(b.removeStoreListingRequest(5, 'ab-1', 12)), ['DELETE', '/Groups/5/Books/ab-1/externalProductLocations/12', undefined, 'books']);
  assert.throws(() => b.addStoreListingRequest(5, 'ab-1', { storeName: '', productUrl: 'https://x.test' }), /store name/);
  for (const make of [() => b.removeCoverRequest(0, 'a'), () => b.removeFileRequest(5, '../x'), () => b.revisionRequest(5, '', true), () => b.removeStoreListingRequest(5, 'a', 0)]) assert.throws(make, /Unknown/);
  assert.equal(JSON.stringify(b.revisionRequest(5, 'a', true).body), '"Revised"');

  // Sending: the two uploads are a form with one part called "file", and the form's content type is left to the browser.
  const send = r => write.writeApi(r.path, r.method, r.body, r.options);
  await b.uploadCover(5, 'ab-1', { type: 'image/png', size: 3, name: 'c.png' });
  assert.deepEqual([sent[0][0], sent[0][1]], ['PUT', `${B}/Groups/5/Books/ab-1/cover`]); assert.equal(sent[0][2].parts[0][0], 'file'); assert.equal(sent[0][2].parts[0][1].name, 'c.png');
  assert.equal(Object.keys(sent[0][3]).some(k => k.toLowerCase() === 'content-type'), false); assert.match(sent[0][3].authorization, /^Bearer /);
  await b.uploadBookFile(5, 'ab-1', { name: 'b.epub', size: 3 });
  assert.equal(sent[1][1], `${B}/Groups/5/Books/ab-1/file`);
  await assert.rejects(() => b.uploadCover(5, 'ab-1', { type: 'text/plain', size: 3 }), /image file/); await assert.rejects(() => b.uploadBookFile(5, 'ab-1', { name: 'b.txt', size: 3 }), /EPUB/);
  assert.equal(sent.length, 2);
  sent.length = 0;
  for (const r of [b.removeCoverRequest(5, 'ab-1'), b.removeFileRequest(5, 'ab-1'), b.revisionRequest(5, 'ab-1', true), b.addStoreListingRequest(5, 'ab-1', { storeName: 'S', productUrl: 'https://s.test' }), b.removeStoreListingRequest(5, 'ab-1', 3)]) await send(r);
  assert.deepEqual(sent.map(s => s[0]), ['DELETE', 'DELETE', 'PUT', 'POST', 'DELETE']); assert.equal(sent[2][2], '"Revised"'); assert.equal(sent[3][2], JSON.stringify({ storeName: 'S', productUrl: 'https://s.test' }));

  // Everything is blocked on Galilee Prod, and nothing is sent.
  ({ read, write, b } = run('galilee-prod')); sent.length = 0; read.writeScope.groupId = 1003;
  const send2 = r => write.writeApi(r.path, r.method, r.body, r.options);
  await assert.rejects(() => b.uploadCover(1003, 'ab-1', { type: 'image/png', size: 3 }), /Book changes are not available in Galilee Prod/);
  await assert.rejects(() => b.uploadBookFile(1003, 'ab-1', { name: 'b.epub', size: 3 }), /Book changes are not available in Galilee Prod/);
  for (const r of [b.removeCoverRequest(1003, 'ab-1'), b.revisionRequest(1003, 'ab-1', true), b.addStoreListingRequest(1003, 'ab-1', { storeName: 'S', productUrl: 'https://s.test' })]) await assert.rejects(() => send2(r), /Book changes are not available in Galilee Prod/);
  assert.equal(sent.length, 0);
  console.log('Book cover, file, revision and store listing rules, requests, uploads and Prod blocking checks passed. No real API requests issued.');
})().catch(e => { console.error(e); process.exit(1); });
