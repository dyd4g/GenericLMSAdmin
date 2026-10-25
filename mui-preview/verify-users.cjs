const fs=require('fs'),assert=require('node:assert/strict'),ts=require('C:/DYD/DYDLMS/LMSAdmin/node_modules/typescript'),qs=require('C:/DYD/DYDLMS/LMSAdmin/node_modules/qs');
function load(file,reqs){const js=ts.transpileModule(fs.readFileSync(__dirname+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',js)(n=>reqs[n]||require(n),m,m.exports);return m.exports}
function run(env){if(env===undefined)delete process.env.NEXT_PUBLIC_LMS_ENV;else process.env.NEXT_PUBLIC_LMS_ENV=env;return load('lib/read-api.js',{})}
// The old admin's getUsers, copied from LMSAdmin/src/domain/services/as-admin.ts
function oldGetUsersUrl(base,search,sortBy,page,resultsPerPage,filters){
  const filterString=filters&&filters.length>0?`&${filters.map(f=>encodeURIComponent(f).replace('%3D','=')).join('&')}`:'';
  return `${base}/api/users?${qs.stringify({search,sortBy,page,resultsPerPage})}${filterString}`;
}
const read=run(undefined);const base=read.connection.identity;
const cases=[
  ['', 'creationDate', 0, 10, []],
  ['ann', 'name', 2, 10, ['emailConfirmed=true']],
  ["o'brien & co (test)", 'creationDate', 0, 10, ['emailConfirmed=false','language=pt']],
  ['中文 / 用户', 'name', 3, 10, ['language=zh-Hans','language=en']],
  ['a+b=c', 'creationDate', 0, 10, []],
];
for(const [search,sortBy,page,resultsPerPage,filters] of cases)assert.equal(read.usersUrl({search,sortBy,page,resultsPerPage,filters}),oldGetUsersUrl(base,search,sortBy,page,resultsPerPage,filters),JSON.stringify([search,filters]));
assert.equal(read.usersUrl(),`${base}/api/users?search=&sortBy=creationDate&page=0&resultsPerPage=10`);
assert.equal(read.userUrl(12),`${base}/api/users/12`);assert.throws(()=>read.userUrl(0),/Unknown user/);assert.throws(()=>read.userUrl('x'),/Unknown user/);assert.throws(()=>read.userUrl('1/../2'),/Unknown user/);
const L=read.connection.learning+'/api/Users/12';
assert.equal(read.userAssetUrl('groups',12),L+'/groups');
assert.equal(read.userAssetUrl('courses',12),L+'/traineeCourses?resultsPerPage=50');
assert.equal(read.userAssetUrl('coaching',12),L+'/coachCourses');
assert.equal(read.userAssetUrl('adminCourses',12,20),L+'/adminCourses?resultsPerPage=20');
assert.equal(read.userAssetUrl('certifications',12),L+'/traineeCertifications?resultsPerPage=50');
assert.equal(read.userAssetUrl('books',12),read.connection.books+'/Users/12/books');
assert.throws(()=>read.userAssetUrl('ftp',12),/Unknown user list/);assert.throws(()=>read.userAssetUrl('groups',-1),/Unknown user/);
// each environment has its own identity and books service
assert.equal(run('galilee-test').connection.books,'https://api.books-dev.dyd.solutions');
assert.equal(run('galilee-prod').connection.books,'https://api.books.dyd.solutions');
const t=run('galilee-test');assert.equal(t.usersUrl({search:'x'}),'https://api.identity-dev.dyd.solutions/api/users?search=x&sortBy=creationDate&page=0&resultsPerPage=10');
console.log('Users list and detail request URLs match the old admin serializer for 5 search/filter cases and all 6 detail lists. No API requests issued.');
