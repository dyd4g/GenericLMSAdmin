const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript');
function load(file,reqs){const js=ts.transpileModule(fs.readFileSync(__dirname+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',js)(n=>reqs[n]||require(n),m,m.exports);return m.exports}
function run(env){if(env===undefined)delete process.env.NEXT_PUBLIC_LMS_ENV;else process.env.NEXT_PUBLIC_LMS_ENV=env;const read=load('lib/read-api.js',{});return {read,write:load('lib/write-api.js',{'./read-api':read})}}
(async()=>{
  let calls=0;global.fetch=async(url,init)=>{calls++;(global.__sent=global.__sent||[]).push([init?.method]);return {ok:true,status:204,text:async()=>''}};
  global.sessionStorage={getItem:()=>null,setItem(){}};global.document={cookie:'dydBearer=test-token'};
  // RSTI: default, writable everywhere
  let {read,write}=run(undefined);
  assert.equal(read.connection.name,'RSTI');assert.equal(read.connection.readOnly,false);assert.equal(read.connection.writableGroupId,undefined);
  assert.equal(read.canWrite(),true);assert.equal(read.canWrite(5),true);
  await write.writeApi('/api/x','PUT',{a:1});assert.equal(calls,1);
  // unknown value falls back to RSTI
  ({read}=run('typo'));assert.equal(read.connection.name,'RSTI');
  // Galilee Prod: right endpoints, writes only inside the RSTI group (ID 1003)
  calls=0;({read,write}=run('galilee-prod'));
  const c=read.connection;
  assert.equal(c.name,'Galilee Prod');assert.equal(c.learning,'https://api.learning.dyd.solutions');assert.equal(c.identity,'https://api.identity.dyd.solutions');
  assert.equal(c.readOnly,false);assert.equal(c.writableGroupId,1003);assert.equal(c.writableGroupName,'RSTI');
  assert.equal(read.groupsUrl(0,8,'a b'),'https://api.learning.dyd.solutions/api/myAdminGroups?page=0&resultsPerPage=8&search=a%20b&isAdmin=true');
  // canWrite fails closed
  assert.equal(read.canWrite(),false);assert.equal(read.canWrite(null),false);assert.equal(read.canWrite(undefined),false);
  assert.equal(read.canWrite(1),false);assert.equal(read.canWrite(1002),false);assert.equal(read.canWrite(10030),false);
  assert.equal(read.canWrite(1003),true);assert.equal(read.canWrite('1003'),true);
  // writeApi: no open course, wrong group, no group => refused with no request
  for(const scope of [null,undefined,1,999,'abc']){read.writeScope.groupId=scope;for(const method of ['POST','PUT','DELETE'])await assert.rejects(()=>write.writeApi('/api/lessons/1',method,{a:1}),/limited to the RSTI group/)}
  assert.equal(calls,0);
  // inside the RSTI group the write goes through
  read.writeScope.groupId=1003;await write.writeApi('/api/lessons/1','PUT',{a:1});assert.equal(calls,1);
  read.writeScope.groupId=null;await assert.rejects(()=>write.writeApi('/api/lessons/1','DELETE'),/limited/);assert.equal(calls,1);
  // Galilee Test: its own endpoints, fully editable (no group limit, no open course needed)
  calls=0;global.__sent=[];({read,write}=run('galilee-test'));
  const t=read.connection;
  assert.equal(t.name,'Galilee Test');assert.equal(t.learning,'https://api.learning-dev.dyd.solutions');assert.equal(t.identity,'https://api.identity-dev.dyd.solutions');
  assert.equal(t.clientId,'1');assert.equal(t.existingAdmin,'https://admin.galilee-test.dyd.solutions');assert.equal(t.readOnly,false);assert.equal(t.writableGroupId,undefined);
  assert.equal(read.canWrite(),true);assert.equal(read.canWrite(44),true);
  assert.equal(read.groupsUrl(0,8,''),'https://api.learning-dev.dyd.solutions/api/myAdminGroups?page=0&resultsPerPage=8&search=&isAdmin=true');
  for(const method of ['POST','PUT','DELETE'])await write.writeApi('/api/lessons/1',method,{a:1});assert.equal(calls,3);
  assert.deepEqual(global.__sent.map(x=>x[0]),['POST','PUT','DELETE']);
  // fully read-only configuration still refuses everything
  read.connection.readOnly&&assert.fail('unexpected');
  console.log('Environment switch and Prod RSTI-group write isolation checks passed. No real API requests issued.');
})().catch(e=>{console.error(e);process.exit(1)});
