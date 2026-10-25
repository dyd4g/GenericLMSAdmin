const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript'),qs=require('qs');
function load(file,reqs){const js=ts.transpileModule(fs.readFileSync(__dirname+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',js)(n=>reqs[n]||require(n),m,m.exports);return m.exports}
function run(env){if(env===undefined)delete process.env.NEXT_PUBLIC_LMS_ENV;else process.env.NEXT_PUBLIC_LMS_ENV=env;const read=load('lib/read-api.js',{});return {read,write:load('lib/write-api.js',{'./read-api':read}),assets:load('lib/user-assets.js',{'./read-api':read})}}
(async()=>{
  const sent=[];global.fetch=async(url,init)=>{sent.push([init.method,url,init.body]);return {ok:true,status:204,text:async()=>''}};
  global.sessionStorage={getItem:()=>null,setItem(){}};global.document={cookie:'dydBearer=t'};
  let {read,write,assets:a}=run('galilee-test');
  const L=read.connection.learning,B=read.connection.books;
  // candidate lists use the old admin's calls (qs for the query)
  const q=s=>qs.stringify({search:s,page:0,resultsPerPage:100});
  for(const s of ['','test','a&b c','中文'])assert.equal(a.candidatesUrl('courses',12,s),`${L}/api/Users/12/traineeCourseCandidates?${q(s)}`);
  assert.equal(a.candidatesUrl('adminCourses',12,'x'),`${L}/api/Users/12/adminCourseCandidates?${q('x')}`);
  assert.equal(a.candidatesUrl('certifications',12,'x'),`${L}/api/Users/12/traineeCertificationCandidates?${q('x')}`);
  assert.equal(a.candidatesUrl('books',12,'x'),`${B}/Users/12/bookCandidates?${q('x')}`);
  assert.equal(a.candidatesUrl('groups',12,'x y'),`${L}/api/myAdminGroups?${qs.stringify({search:'x y',isAdmin:true,page:0,resultsPerPage:100})}`);
  assert.throws(()=>a.candidatesUrl('ftp',12),/Unknown kind/);assert.throws(()=>a.candidatesUrl('courses',0),/Unknown user/);
  assert.deepEqual(a.candidateRows([{id:1}]),[{id:1}]);assert.deepEqual(a.candidateRows({results:[{id:2}]}),[{id:2}]);assert.deepEqual(a.candidateRows(null),[]);
  // add requests: same paths and bodies as the old admin
  const add=(k,id)=>{const r=a.addAssetRequest(k,12,id);return [r.method,r.path,r.body,r.options.service]};
  assert.deepEqual(add('groups',5),['POST','/api/Users/12/groups',5,'learning']);
  assert.deepEqual(add('courses',6),['POST','/api/Users/12/traineeCourses',6,'learning']);
  assert.deepEqual(add('adminCourses',7),['POST','/api/Users/12/adminCourses',7,'learning']);
  assert.deepEqual(add('certifications',8),['POST','/api/Users/12/traineeCertifications',8,'learning']);
  assert.deepEqual(add('books','b-9_X'),['POST','/Users/12/books/b-9_X',undefined,'books']);
  // remove requests
  const rem=(k,id)=>{const r=a.removeAssetRequest(k,12,id);return [r.method,r.path,r.body,r.options.service]};
  assert.deepEqual(rem('groups',5),['DELETE','/api/Users/12/groups/5',undefined,'learning']);
  assert.deepEqual(rem('courses',6),['DELETE','/api/Users/12/traineeCourses/6',undefined,'learning']);
  assert.deepEqual(rem('adminCourses',7),['DELETE','/api/Users/12/adminCourses/7',undefined,'learning']);
  assert.deepEqual(rem('certifications',8),['DELETE','/api/Users/12/traineeCertifications/8',undefined,'learning']);
  assert.deepEqual(rem('books','b-9_X'),['DELETE','/Users/12/books/b-9_X',undefined,'books']);
  for(const bad of [0,-1,'x',null])assert.throws(()=>a.addAssetRequest('courses',12,bad),/Unknown course/);
  assert.throws(()=>a.addAssetRequest('books',12,'../x'),/Unknown book/);assert.throws(()=>a.removeAssetRequest('books',12,''),/Unknown book/);assert.throws(()=>a.removeAssetRequest('groups',0,1),/Unknown user/);
  // group role ("permission") and coach of a course
  const gr=a.groupRoleRequest(5,12,'Admin');assert.deepEqual([gr.method,gr.path,gr.body],['PUT','/api/groups/5/members/12/role','Admin']);
  assert.equal(a.groupRoleRequest(5,12,'Member').body,'Member');assert.throws(()=>a.groupRoleRequest(5,12,'Owner'),/Admin or Member/);
  assert.equal(a.coachesUrl(9),`${L}/api/courses/9/coaches`);
  const ac=a.assignCoachRequest(9,12,3);assert.deepEqual([ac.method,ac.path,ac.body],['POST','/api/courses/9/trainees/12/coach',3]);
  const uc=a.unassignCoachRequest(9,12,3);assert.deepEqual([uc.method,uc.path,uc.body],['DELETE','/api/courses/9/trainees/12/coach/3',undefined]);
  // writeApi sends them to the right service with the right body
  const send=r=>write.writeApi(r.path,r.method,r.body,r.options);
  sent.length=0;
  await send(a.addAssetRequest('courses',12,6));await send(a.addAssetRequest('books',12,'b1'));await send(a.groupRoleRequest(5,12,'Admin'));await send(a.removeAssetRequest('books',12,'b1'));
  assert.deepEqual(sent.map(s=>[s[0],s[1].replace(L,'L').replace(B,'B'),s[2]]),[['POST','L/api/Users/12/traineeCourses','6'],['POST','B/Users/12/books/b1',undefined],['PUT','L/api/groups/5/members/12/role','"Admin"'],['DELETE','B/Users/12/books/b1',undefined]]);
  // RSTI dev works too
  ({read,write,assets:a}=run(undefined));sent.length=0;await send(a.addAssetRequest('groups',12,5));assert.match(sent[0][1],/rsti-dev\.dyd\.solutions\/learning\/api\/Users\/12\/groups$/);
  // Galilee Prod refuses every one of them, even with an RSTI-group course open (they are about users, not groups)
  ({read,write,assets:a}=run('galilee-prod'));sent.length=0;read.writeScope.groupId=1003;
  const all=[a.addAssetRequest('groups',12,5),a.addAssetRequest('courses',12,6),a.addAssetRequest('adminCourses',12,7),a.addAssetRequest('certifications',12,8),a.addAssetRequest('books',12,'b'),a.removeAssetRequest('groups',12,5),a.removeAssetRequest('books',12,'b'),a.groupRoleRequest(1003,12,'Admin'),a.assignCoachRequest(9,12,3),a.unassignCoachRequest(9,12,3)];
  for(const r of all)await assert.rejects(()=>send(r),/(User|Book) changes are not available in Galilee Prod/);
  assert.equal(sent.length,0);
  // course changes inside the RSTI group still work on Prod (unchanged)
  await write.writeApi('/api/courses/9','DELETE');assert.equal(sent.length,1);
  console.log('Per-tab add/remove requests, candidate lists, group role, coach, service routing and Prod blocking checks passed. No real API requests issued.');
})().catch(e=>{console.error(e);process.exit(1)});
