const fs=require('fs'),assert=require('node:assert/strict'),ts=require('C:/DYD/DYDLMS/LMSAdmin/node_modules/typescript');
function load(file,reqs){const js=ts.transpileModule(fs.readFileSync(__dirname+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',js)(n=>reqs[n]||require(n),m,m.exports);return m.exports}
function run(env){if(env===undefined)delete process.env.NEXT_PUBLIC_LMS_ENV;else process.env.NEXT_PUBLIC_LMS_ENV=env;const read=load('lib/read-api.js',{});const write=load('lib/write-api.js',{'./read-api':read});return {read,write,assets:load('lib/user-assets.js',{'./read-api':read})}}
(async()=>{
  const sent=[];global.fetch=async(url,init)=>{sent.push([init.method,url,init.body]);return {ok:true,status:204,text:async()=>''}};
  global.sessionStorage={getItem:()=>null,setItem(){}};global.document={cookie:'dydBearer=t'};
  // addresses are the old admin's ANALYTICS_API / REFERRAL_URL for each environment
  let {read,write,assets}=run(undefined);
  assert.equal(read.referralsUrl({search:'a b',page:2}),'https://api.rsti-dev.dyd.solutions/analytics/partners?search=a%20b&page=2&resultsPerPage=10');
  assert.equal(read.referralShareLink('abc'),'https://rsti-dev.dyd.solutions/go/abc');assert.equal(read.referralShareLink(''),'');
  assert.equal(read.referralCategoriesUrl(),'https://api.rsti-dev.dyd.solutions/analytics/partners/categories');
  assert.equal(read.userAssetUrl('referrals',7),'https://api.rsti-dev.dyd.solutions/analytics/partners/byReps/7');
  for(const bad of [0,-1,'x',null])assert.throws(()=>read.referralUrl(bad),/Unknown referral/);
  ({read,write,assets}=run('galilee-test'));
  assert.equal(read.referralsUrl(),'https://api.analytics-dev.dyd.solutions/partners?search=&page=0&resultsPerPage=10');
  assert.equal(read.referralShareLink('x'),'https://galilee-test.dyd.solutions/go/x');
  assert.equal(run('galilee-prod').read.referralShareLink('x'),'https://www.galileeone.com/go/x');
  assert.equal(run('galilee-prod').read.referralsUrl(),'https://api.analytics.dyd.solutions/partners?search=&page=0&resultsPerPage=10');
  // validation
  assert.match(write.referralFormError({name:'',categoryId:'1'}),/name/);assert.match(write.referralFormError({name:'x'.repeat(81),categoryId:'1'}),/80/);
  assert.match(write.referralFormError({name:'A',categoryId:''}),/category/);
  for(const c of ['a b','a/b','a?b','a#b','a%b'])assert.match(write.referralFormError({name:'A',categoryId:'1',code:c}),/code/i);
  assert.equal(write.referralFormError({name:'A',categoryId:'1',code:'good-Code_1'}),null);assert.equal(write.referralFormError({name:'A',categoryId:'1'}),null);
  // bodies
  const c=write.createReferralRequest({name:' ZZ ',shortName:'z',code:'zz',externalId:'9',categoryId:3});
  assert.deepEqual([c.method,c.path],['POST','/partners']);assert.deepEqual(c.body,{name:'ZZ',shortName:'z',code:'zz',externalId:'9',categoryId:'3'});
  const u=write.updateReferralRequest({id:5,category:{id:3,name:'Church'}},{name:'ZZ2',categoryId:'3'});
  assert.deepEqual([u.method,u.path],['PUT','/partners/5']);assert.deepEqual(u.body,{id:5,categoryName:'Church',name:'ZZ2',shortName:'',code:'',externalId:'',categoryId:'3'});
  assert.throws(()=>write.updateReferralRequest({id:0},{name:'A',categoryId:'1'}),/Unknown referral/);
  // user tab requests
  const a=assets.addAssetRequest('referrals',7,5);assert.deepEqual([a.method,a.path,a.body,a.options],['POST','/partners/5/reps',{userId:7},{service:'analytics'}]);
  const r=assets.removeAssetRequest('referrals',7,5);assert.deepEqual([r.method,r.path,r.options],['DELETE','/partners/5/reps/7',{service:'analytics'}]);
  assert.equal(assets.candidatesUrl('referrals',7,'q'),'https://api.analytics-dev.dyd.solutions/partners/byReps/7/candidates?search=q&page=0&resultsPerPage=100');
  // routed to the analytics service as JSON
  sent.length=0;await write.writeApi(c.path,c.method,c.body,write.analyticsService);
  assert.equal(sent[0][1],'https://api.analytics-dev.dyd.solutions/partners');assert.deepEqual(JSON.parse(sent[0][2]),c.body);
  sent.length=0;await write.writeApi(a.path,a.method,a.body,a.options);assert.equal(sent[0][1],'https://api.analytics-dev.dyd.solutions/partners/5/reps');
  // Galilee Prod never changes referrals, even inside the RSTI group
  ({read,write}=run('galilee-prod'));sent.length=0;read.writeScope.groupId=1003;
  await assert.rejects(()=>write.writeApi('/partners','POST',{},write.analyticsService),/Referral changes are not available in Galilee Prod/);assert.equal(sent.length,0);
  console.log('Referral addresses, validation, request bodies, user-tab calls, routing and Prod blocking checks passed. No real API requests issued.');
})().catch(e=>{console.error(e);process.exit(1)});
