const fs=require('fs'),assert=require('node:assert/strict'),ts=require('C:/DYD/DYDLMS/LMSAdmin/node_modules/typescript');
function load(file,reqs){const js=ts.transpileModule(fs.readFileSync(__dirname+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',js)(n=>reqs[n]||require(n),m,m.exports);return m.exports}
function run(env){if(env===undefined)delete process.env.NEXT_PUBLIC_LMS_ENV;else process.env.NEXT_PUBLIC_LMS_ENV=env;const read=load('lib/read-api.js',{});return {read,w:load('lib/write-api.js',{'./read-api':read})}}
(async()=>{
  const sent=[];global.fetch=async(url,init)=>{sent.push([init.method,url,init.body]);return {ok:true,status:204,text:async()=>''}};global.sessionStorage={getItem:()=>null,setItem(){}};global.document={cookie:'dydBearer=t'};
  let {read,w}=run('galilee-test');
  // books
  assert.match(w.bookFormError({name:' '}),/title/);assert.equal(w.bookFormError({name:'A'}),null);
  let r=w.createBookRequest(5,{name:' B ',author:'a',language:'en',description:'d',body:'<p>x</p>'});
  assert.deepEqual([r.method,r.path,r.options],['POST','/Groups/5/Books',{service:'books'}]);assert.deepEqual(r.body,{name:'B',author:'a',language:'en',description:'d',body:'<p>x</p>',productId:null});
  r=w.updateBookRequest(5,'ab-1',{name:'B2'},{productId:12});assert.deepEqual([r.method,r.path],['PUT','/Groups/5/Books/ab-1']);assert.equal(r.body.productId,12);assert.equal(w.updateBookRequest(5,'ab-1',{name:'B2'},{}).body.productId,null);
  r=w.deleteBookRequest(5,'ab-1');assert.deepEqual([r.method,r.path],['DELETE','/Groups/5/Books/ab-1']);
  r=w.bookStatusRequest(5,'ab-1','Archived');assert.deepEqual([r.method,r.path,r.body],['PUT','/Groups/5/Books/ab-1/status','Archived']);assert.throws(()=>w.bookStatusRequest(5,'x','Gone'),/Draft, Published/);
  for(const bad of ['','a/b','../x'])assert.throws(()=>w.deleteBookRequest(5,bad),/Unknown book/);assert.throws(()=>w.createBookRequest(0,{name:'A'}),/Unknown group/);
  // certifications
  const good={name:'C',language:'en',description:'d',certificateMessage:'m',isGroupMembershipRequired:0,isEnrollmentApprovalRequired:1,privacyLevel:'Public'};
  assert.equal(w.certificationFormError(good),null);assert.match(w.certificationFormError({...good,name:''}),/title/);assert.match(w.certificationFormError({...good,name:'x'.repeat(81)}),/80/);assert.match(w.certificationFormError({...good,description:'x'.repeat(501)}),/500/);assert.match(w.certificationFormError({...good,privacyLevel:'Secret'}),/Public or Unlisted/);
  r=w.createCertificationRequest(7,good);assert.deepEqual([r.method,r.path,r.groupId],['POST','/api/certifications?groupId=7',7]);assert.deepEqual(r.body,{name:'C',language:'en',description:'d',certificateMessage:'m',isGroupMembershipRequired:false,isEnrollmentApprovalRequired:true,privacyLevel:'Public'});
  r=w.updateCertificationRequest(7,3,good);assert.deepEqual([r.method,r.path],['PUT','/api/certifications/3']);
  r=w.deleteCertificationRequest(7,3);assert.deepEqual([r.method,r.path],['DELETE','/api/certifications/3']);
  assert.match(w.certificationPublishError({courses:[]}),/at least one/);assert.match(w.certificationPublishError({courses:[{status:'Draft'}]}),/published/);assert.equal(w.certificationPublishError({courses:[{status:'Published'}]}),null);
  assert.throws(()=>w.certificationStatusRequest(7,{id:3,courses:[]},'Published'),/at least one/);
  r=w.certificationStatusRequest(7,{id:3,courses:[{status:'Published'}]},'Published');assert.deepEqual([r.method,r.path,r.body],['PUT','/api/certifications/3/status','Published']);
  assert.equal(w.certificationStatusRequest(7,{id:3,courses:[]},'Archived').body,'Archived');assert.throws(()=>w.certificationStatusRequest(7,{id:3},'Draft'),/published or archived/);
  r=w.addCertificationCourseRequest(7,3,9);assert.deepEqual([r.method,r.path,r.body],['POST','/api/certifications/3/courses',9]);
  r=w.removeCertificationCourseRequest(7,3,9);assert.deepEqual([r.method,r.path],['DELETE','/api/certifications/3/courses/9']);
  r=w.reorderCertificationCourseRequest(7,3,9,2);assert.deepEqual([r.method,r.path,r.body],['PUT','/api/certifications/3/courses/9',{order:2}]);assert.throws(()=>w.reorderCertificationCourseRequest(7,3,9,0),/Unknown position/);
  assert.equal(read.certificationCourseCandidatesUrl(3,{search:'q'}),'https://api.learning-dev.dyd.solutions/api/certifications/3/courseCandidates?search=q&page=0&resultsPerPage=10');
  // sending
  sent.length=0;r=w.createBookRequest(5,{name:'B'});await w.writeApi(r.path,r.method,r.body,r.options);assert.equal(sent[0][1],'https://api.books-dev.dyd.solutions/Groups/5/Books');assert.equal(JSON.parse(sent[0][2]).name,'B');
  sent.length=0;r=w.certificationStatusRequest(7,{id:3,courses:[]},'Archived');await w.writeApi(r.path,r.method,r.body,{groupId:r.groupId});assert.equal(sent[0][1],'https://api.learning-dev.dyd.solutions/api/certifications/3/status');assert.equal(sent[0][2],'"Archived"');
  // Galilee Prod: blocked everywhere (books globally; certifications outside the RSTI group)
  ({read,w}=run('galilee-prod'));sent.length=0;read.writeScope.groupId=1003;
  r=w.createBookRequest(1003,{name:'B'});await assert.rejects(()=>w.writeApi(r.path,r.method,r.body,r.options),/Book changes are not available in Galilee Prod/);
  r=w.deleteCertificationRequest(5,3);await assert.rejects(()=>w.writeApi(r.path,r.method,r.body,{groupId:r.groupId}),/limited to the/);assert.equal(sent.length,0);
  console.log('Book and certification create/edit/delete/status, course add/remove/reorder, validation, routing and Prod blocking checks passed. No real API requests issued.');
})().catch(e=>{console.error(e);process.exit(1)});
