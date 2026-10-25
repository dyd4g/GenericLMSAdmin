const fs=require('fs'),assert=require('node:assert/strict'),ts=require('C:/DYD/DYDLMS/LMSAdmin/node_modules/typescript');
function load(file,reqs){const js=ts.transpileModule(fs.readFileSync(__dirname+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',js)(n=>reqs[n]||require(n),m,m.exports);return m.exports}
function run(env){if(env===undefined)delete process.env.NEXT_PUBLIC_LMS_ENV;else process.env.NEXT_PUBLIC_LMS_ENV=env;const read=load('lib/read-api.js',{});return {read,write:load('lib/write-api.js',{'./read-api':read})}}
(async()=>{
  const sent=[];global.fetch=async(url,init)=>{sent.push([init.method,url,init.body]);return {ok:true,status:201,text:async()=>'77'}};
  global.sessionStorage={getItem:()=>null,setItem(){}};global.document={cookie:'dydBearer=t'};
  let {read,write}=run('galilee-test');
  const ok={fullName:'  Test User ',preferredName:' Tester ',email:' test@example.com ',phoneNumber:' 5551234567 ',gender:'Female',country:'US',language:'en',timeZone:'America/Chicago',emailConfirmed:true,phoneNumberConfirmed:false};
  // form rules (same as the old admin form)
  assert.equal(write.userFormError(ok),null);
  assert.match(write.userFormError({...ok,fullName:' '}),/full name/);assert.match(write.userFormError({...ok,fullName:'x'.repeat(81)}),/80/);
  for(const bad of ['','no-at-sign','a b@c.com'])assert.match(write.userFormError({...ok,email:bad}),/email/);
  assert.match(write.userFormError({...ok,phoneNumber:''}),/phone/);assert.match(write.userFormError({...ok,phoneNumber:'1'.repeat(16)}),/15/);
  // create: trimmed fields, newsletter off, same path as the old admin
  const c=write.createUserRequest(ok);
  assert.deepEqual([c.path,c.method],['/api/users','POST']);
  assert.deepEqual(c.body,{fullName:'Test User',preferredName:'Tester',email:'test@example.com',phoneNumber:'5551234567',gender:'Female',country:'US',language:'en',timeZone:'America/Chicago',emailConfirmed:true,phoneNumberConfirmed:false,isNewsletterEnabled:false});
  assert.throws(()=>write.createUserRequest({...ok,email:'bad'}),/email/);
  // update: stored record merged with edits, no newsletter flag, keeps roles and id
  const stored={id:12,fullName:'Old',email:'old@example.com',roles:[{id:1,name:'Admin'}],customClaims:[{a:1}],isNewsletterEnabled:true,creationDate:'2022-01-01',isActive:true,picture:'p.png'};
  const u=write.updateUserRequest(stored,ok);
  assert.deepEqual([u.path,u.method],['/api/users/12','PUT']);
  assert.equal(u.body.fullName,'Test User');assert.equal(u.body.id,12);assert.deepEqual(u.body.roles,[{id:1,name:'Admin'}]);assert.equal(u.body.picture,'p.png');assert.equal('isNewsletterEnabled' in u.body,false);assert.equal(u.body.isActive,true);
  assert.throws(()=>write.updateUserRequest({...stored,id:0},ok),/Unknown user/);assert.throws(()=>write.updateUserRequest(stored,{...ok,fullName:''}),/full name/);
  // password: same rule as the old admin (8 to 20 characters, upper, lower, digit, symbol), sent as a plain string
  const lists=load('lib/user-lists.js',{});assert.equal(write.passwordPattern.source,lists.APP_Password_Regex.source);
  const pw=write.passwordRequest(12,'Abcdef1!','Abcdef1!');assert.deepEqual([pw.path,pw.method,pw.body],['/api/users/12/password','PUT','Abcdef1!']);
  assert.throws(()=>write.passwordRequest(12,'','' ),/Enter a new password/);assert.throws(()=>write.passwordRequest(12,'Ab1!','Ab1!'),/at least 8/);
  assert.throws(()=>write.passwordRequest(12,'abcdefgh','abcdefgh'),/upper-case/);assert.throws(()=>write.passwordRequest(12,'Abcdef1!'+'x'.repeat(13),'Abcdef1!'+'x'.repeat(13)),/8 to 20/);
  assert.throws(()=>write.passwordRequest(12,'Abcdef1!','Abcdef1?'),/do not match/);
  // confirmation email, roles, delete
  assert.deepEqual(write.confirmEmailRequest(12),{path:'/api/users/12/sendconfirmemailmessage',method:'POST',body:12});
  assert.deepEqual(write.assignRoleRequest(12,3),{path:'/api/Users/12/roles',method:'POST',body:3});
  assert.deepEqual(write.removeRoleRequest(12,3),{path:'/api/users/12/roles/3',method:'DELETE'});
  assert.throws(()=>write.assignRoleRequest(12,0),/Unknown role/);assert.throws(()=>write.removeRoleRequest(12,'x'),/Unknown role/);
  assert.deepEqual(write.deleteUserRequest(12),{path:'/api/users/12?keepAnalytics=false',method:'DELETE'});
  assert.deepEqual(write.deleteUserRequest(12,{keepAnalytics:true}),{path:'/api/users/12?keepAnalytics=true',method:'DELETE'});
  assert.throws(()=>write.deleteUserRequest('12/../1'),/Unknown user/);
  // identity writes go to the identity service with the right bodies (Galilee Test)
  sent.length=0;
  await write.writeApi(c.path,c.method,c.body,write.identity);
  await write.writeApi(pw.path,pw.method,pw.body,write.identity);
  await write.writeApi('/api/users/12/roles/3','DELETE',undefined,write.identity);
  assert.equal(sent[0][1],'https://api.identity-dev.dyd.solutions/api/users');assert.equal(JSON.parse(sent[0][2]).email,'test@example.com');
  assert.equal(sent[1][1],'https://api.identity-dev.dyd.solutions/api/users/12/password');assert.equal(sent[1][2],'"Abcdef1!"');
  assert.deepEqual([sent[2][0],sent[2][2]],['DELETE',undefined]);
  // learning writes still go to the learning service
  sent.length=0;await write.writeApi('/api/courses/1','DELETE');assert.equal(sent[0][1],'https://api.learning-dev.dyd.solutions/api/courses/1');
  await assert.rejects(()=>write.writeApi('/x','PUT',{}, {service:'ftp'}),/Unknown service/);
  // RSTI dev allows user changes; Galilee Prod never does (users are not tied to a group), even inside the RSTI group
  ({read,write}=run(undefined));sent.length=0;assert.equal(read.canWriteUsers(),true);await write.writeApi(c.path,c.method,c.body,write.identity);assert.match(sent[0][1],/rsti-dev\.dyd\.solutions\/identity\/api\/users$/);
  ({read,write}=run('galilee-prod'));sent.length=0;assert.equal(read.canWriteUsers(),false);read.writeScope.groupId=1003;
  for(const [p,m] of [['/api/users','POST'],['/api/users/12','PUT'],['/api/users/12/roles/3','DELETE'],['/api/users/12?keepAnalytics=true','DELETE']])await assert.rejects(()=>write.writeApi(p,m,{},write.identity),/User changes are not available in Galilee Prod/);
  assert.equal(sent.length,0);
  console.log('User create/update/password/email/roles/delete requests, validation, service routing and Prod blocking checks passed. No real API requests issued.');
})().catch(e=>{console.error(e);process.exit(1)});
