const fs=require('fs'),assert=require('node:assert/strict'),ts=require('C:/DYD/DYDLMS/LMSAdmin/node_modules/typescript');
function load(file,reqs){const js=ts.transpileModule(fs.readFileSync(__dirname+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',js)(n=>reqs[n]||require(n),m,m.exports);return m.exports}
function run(env){if(env===undefined)delete process.env.NEXT_PUBLIC_LMS_ENV;else process.env.NEXT_PUBLIC_LMS_ENV=env;const read=load('lib/read-api.js',{});return {read,write:load('lib/write-api.js',{'./read-api':read})}}
(async()=>{
  const sent=[];global.fetch=async(url,init)=>{sent.push([init.method,url,init.body]);return {ok:true,status:204,text:async()=>''}};
  global.sessionStorage={getItem:()=>null,setItem(){}};global.document={cookie:'dydBearer=t'};
  // addresses are the old admin's ALERTS_API values for each environment
  assert.equal(run(undefined).read.alertsUrl(),'https://api.rsti-dev.dyd.solutions/alerts/alerts');
  let {read,write}=run('galilee-test');
  assert.equal(read.alertsUrl(),'https://api.alerts-dev.dyd.solutions/alerts');
  assert.equal(run('galilee-prod').read.alertsUrl(),'https://api.alerts.dyd.solutions/alerts');
  // update body: type, message, isActive (same as the old admin)
  const r=write.updateAlertRequest(3,{type:'Success',message:'<p>Hello <strong>all</strong></p>',isActive:true});
  assert.deepEqual([r.method,r.path],['PUT','/alerts/3']);assert.deepEqual(r.body,{type:'Success',message:'<p>Hello <strong>all</strong></p>',isActive:true});
  assert.deepEqual(write.updateAlertRequest(3,{type:'Error',message:null,isActive:0}).body,{type:'Error',message:null,isActive:false});
  assert.equal(write.updateAlertRequest(3,{type:'Error',message:'',isActive:false}).body.message,'');
  assert.throws(()=>write.updateAlertRequest(3,{type:'Warning',message:'x',isActive:true}),/Error or Success/);assert.throws(()=>write.updateAlertRequest(3,{type:'',message:'x',isActive:true}),/Error or Success/);
  for(const bad of [0,-1,'x',null,undefined])assert.throws(()=>write.updateAlertRequest(bad,{type:'Error',message:'x',isActive:true}),/Unknown alert/);
  // sent to the alerts service as JSON
  sent.length=0;await write.writeApi(r.path,r.method,r.body,write.alertsService);
  assert.equal(sent[0][0],'PUT');assert.equal(sent[0][1],'https://api.alerts-dev.dyd.solutions/alerts/3');assert.deepEqual(JSON.parse(sent[0][2]),r.body);
  // RSTI dev works too
  ({read,write}=run(undefined));sent.length=0;await write.writeApi('/alerts/1','PUT',{type:'Error',message:'x',isActive:true},write.alertsService);assert.equal(sent[0][1],'https://api.rsti-dev.dyd.solutions/alerts/alerts/1');
  // Galilee Prod never changes alerts (they are shared by everyone), even inside the RSTI group
  ({read,write}=run('galilee-prod'));sent.length=0;read.writeScope.groupId=1003;
  await assert.rejects(()=>write.writeApi('/alerts/1','PUT',{type:'Error',message:'x',isActive:true},write.alertsService),/Alert changes are not available in Galilee Prod/);
  assert.equal(sent.length,0);
  console.log('Alert list address, update request, validation, service routing and Prod blocking checks passed. No real API requests issued.');
})().catch(e=>{console.error(e);process.exit(1)});
