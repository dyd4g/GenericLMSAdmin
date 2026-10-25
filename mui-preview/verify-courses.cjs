const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript');
function load(file,reqs){const js=ts.transpileModule(fs.readFileSync(__dirname+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',js)(n=>reqs[n]||require(n),m,m.exports);return m.exports}
function run(env){if(env===undefined)delete process.env.NEXT_PUBLIC_LMS_ENV;else process.env.NEXT_PUBLIC_LMS_ENV=env;const read=load('lib/read-api.js',{});return {read,write:load('lib/write-api.js',{'./read-api':read})}}
(async()=>{
  const calls=[];global.fetch=async(url,init)=>{calls.push([init.method,url.replace('https://api.rsti-dev.dyd.solutions/learning','').replace('https://api.learning.dyd.solutions',''),init.body]);return {ok:true,status:201,text:async()=>'123'}};
  global.sessionStorage={getItem:()=>null,setItem(){}};global.document={cookie:'dydBearer=t'};
  let {read,write}=run(undefined);
  const base={name:' New course ',type:'CoachAssisted',language:'en',privacyLevel:'Unlisted',categoryId:'4'};
  const p=write.coursePayload(base,'<p>Intro</p>');
  assert.deepEqual(p,{name:'New course',description:'',body:'<p>Intro</p>',type:'CoachAssisted',language:'en',categoryId:4,isGroupMembershipRequired:false,isEnrollmentApprovalRequired:false,privacyLevel:'Unlisted',code:'',author:'',managementNotificationsEnabled:false,executionNotificationsEnabled:false,certificateMessage:'',hasCertificate:false,seo:{description:null,keywords:null,title:null},enforceSequentialExecution:false,requiresLicenseToEnroll:false});
  assert.equal(write.coursePayload({...base,categoryId:''}).categoryId,0);
  assert.equal(write.coursePayload({...base,hasCertificate:true,certificateMessage:'Well done'}).certificateMessage,'Well done');
  assert.equal(write.coursePayload({...base,hasCertificate:false,certificateMessage:'ignored'}).certificateMessage,'');
  assert.throws(()=>write.coursePayload({...base,name:'  '}),/name/);assert.throws(()=>write.coursePayload({...base,type:'Class'}),/type/);
  assert.throws(()=>write.coursePayload({...base,privacyLevel:'Secret'}),/visibility/);assert.throws(()=>write.coursePayload({...base,language:''}),/language/);
  // create request
  const req=write.createCourseRequest(7,p);assert.deepEqual([req.path,req.method,req.groupId],['/api/groups/7/courses','POST',7]);
  assert.throws(()=>write.createCourseRequest(undefined,p),/group/);assert.throws(()=>write.createCourseRequest(0,p),/group/);
  // delete request only for Draft / Test
  assert.deepEqual(write.deleteCourseRequest({id:5,status:'Draft'}),{path:'/api/courses/5',method:'DELETE'});
  assert.equal(write.deleteCourseRequest({id:5,status:'Test'}).method,'DELETE');
  for(const s of ['Published','Archived',undefined])assert.throws(()=>write.deleteCourseRequest({id:5,status:s}),/Draft or Test/);
  // RSTI dev writes freely
  await write.writeApi(req.path,req.method,req.body,{groupId:req.groupId});assert.equal(calls.length,1);assert.equal(calls[0][0],'POST');
  // Galilee Prod: create only in group 1003 (the group is explicit); delete only inside the open 1003 course
  ({read,write}=run('galilee-prod'));calls.length=0;
  assert.deepEqual(read.connection.languages,['en','es','pt','zh-Hans','zh-Hant']);assert.equal(read.connection.showCategories,false);
  await assert.rejects(()=>write.writeApi('/api/groups/44/courses','POST',{},{groupId:44}),/limited to the RSTI group/);
  await assert.rejects(()=>write.writeApi('/api/groups/10030/courses','POST',{},{groupId:10030}),/limited/);
  await assert.rejects(()=>write.writeApi('/api/groups/1/courses','POST',{},{groupId:undefined}),/limited/);
  assert.equal(calls.length,0);
  await write.writeApi('/api/groups/1003/courses','POST',{},{groupId:1003});assert.equal(calls.length,1);
  // an explicit wrong group is refused even while the RSTI course is open (the open course is not a fallback)
  read.writeScope.groupId=1003;await assert.rejects(()=>write.writeApi('/api/courses/9','DELETE',undefined,{groupId:44}),/limited/);assert.equal(calls.length,1);
  await write.writeApi('/api/courses/9','DELETE');assert.equal(calls.length,2);assert.equal(calls[1][0],'DELETE');
  console.log('Course create/delete payload, status limit and Prod group isolation checks passed. No real API requests issued.');
})().catch(e=>{console.error(e);process.exit(1)});
