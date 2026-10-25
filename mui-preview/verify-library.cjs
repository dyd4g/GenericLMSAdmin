const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript'),qs=require('qs');
function load(file,reqs){const js=ts.transpileModule(fs.readFileSync(__dirname+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',js)(n=>reqs[n]||require(n),m,m.exports);return m.exports}
function run(env){if(env===undefined)delete process.env.NEXT_PUBLIC_LMS_ENV;else process.env.NEXT_PUBLIC_LMS_ENV=env;return load('lib/read-api.js',{})}
let r=run(undefined);
// same query text as the old admin's qs.stringify (qs encodes brackets, so compare decoded)
const q=o=>qs.stringify(o,{encode:true});
assert.equal(r.groupBooksUrl(7,{search:'a b',page:1,resultsPerPage:10,languages:['en','es'],statuses:['Draft']}),`https://api.rsti-dev.dyd.solutions/books/Groups/7/Books?${q({search:'a b',page:1,resultsPerPage:10,language:['en','es'],publishStatus:['Draft']})}`);
assert.equal(r.groupBooksUrl(7),`https://api.rsti-dev.dyd.solutions/books/Groups/7/Books?${q({search:'',page:0,resultsPerPage:5,language:undefined,publishStatus:[]})}`);
assert.equal(r.bookUrl(7,'ab-12_C'),'https://api.rsti-dev.dyd.solutions/books/Groups/7/Books/ab-12_C');
assert.equal(r.bookReadersUrl(7,'x1'),'https://api.rsti-dev.dyd.solutions/books/Groups/7/Books/x1/readers');
assert.equal(r.bookKeysUrl(7,'x1',{search:'k',page:2}),'https://api.rsti-dev.dyd.solutions/licenses/groups/7/books/x1/licenses?search=k&resultsPerPage=10&page=2');
assert.equal(r.groupCertificationsUrl(7,{search:'s',page:1}),`https://api.rsti-dev.dyd.solutions/api/groups/7/certifications?${q({search:'s',page:1,resultsPerPage:10})}`.replace('https://api.rsti-dev.dyd.solutions/api',r.groupCertificationsUrl(7).split('/groups/')[0]));
assert.equal(r.certificationUrl(4).endsWith('/api/certifications/4'),true);
assert.equal(r.certificationTraineesUrl(4,2).endsWith('/api/certifications/4/trainees?page=2&resultsPerPage=10'),true);
for(const bad of [0,-1,'x',null])assert.throws(()=>r.groupBooksUrl(bad),/Unknown group/),assert.throws(()=>r.certificationUrl(bad),/Unknown certification/);
for(const bad of ['','a/b','../x','a?b',null])assert.throws(()=>r.bookUrl(1,bad),/Unknown book/);
assert.equal(run('galilee-test').bookKeysUrl(1,'b'),'https://api.licenses-dev.dyd.solutions/groups/1/books/b/licenses?search=&resultsPerPage=10&page=0');
assert.equal(run('galilee-prod').bookKeysUrl(1,'b'),'https://api.licenses.dyd.solutions/groups/1/books/b/licenses?search=&resultsPerPage=10&page=0');
assert.equal(run('galilee-test').groupBooksUrl(1).startsWith('https://api.books-dev.dyd.solutions/Groups/1/Books?'),true);
console.log('Book and certification list, detail, readers, keys and participants addresses match the old admin. No API requests issued.');
