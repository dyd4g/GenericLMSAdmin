const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript');
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const auth={};new Function('require','exports',compile('lib/admin-auth.js'))(()=>({connection:{identity:'https://identity.test',learning:'https://learning.test',clientId:'1'}}),auth);
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
(async()=>{
 assert(auth.isSystemAdmin({roles:['Admin']}));assert(auth.isSystemAdmin({role:'Admin'}));assert(!auth.isSystemAdmin({role:'NotAdmin'}));
 let calls=[];const queue=(values)=>async(url,options)=>{calls.push({url,options});return values.shift()};
 await auth.verifyAdminAccess('t',queue([response({roles:['Admin']})]));assert.equal(calls.length,1);
 calls=[];await auth.verifyAdminAccess('t',queue([response({role:['User']}),response({results:[{id:1}]})]));assert.equal(calls.length,2);
 calls=[];await auth.verifyAdminAccess('t',queue([response({role:['User']}),response({results:[]}),response({results:[{id:2}]})]));assert.equal(calls.length,3);
 await assert.rejects(()=>auth.verifyAdminAccess('t',queue([response({role:['User']}),response({results:[]}),response({results:[]})])),e=>e.status===403);
 await assert.rejects(()=>auth.verifyAdminAccess('t',queue([response({},401)])),e=>e.status===401);
 await assert.rejects(()=>auth.verifyAdminAccess('t',queue([response({role:[]}),response({resultsCount:1})])),e=>e.status===503);
 calls=[];const signed=await auth.signInAdmin(' admin@example.com ','password',queue([response({access_token:'token',expires_in:900}),response({role:['Admin']})]));assert.equal(signed.accessToken,'token');assert.equal(calls[0].url,'https://identity.test/api/token');assert.equal(calls[0].options.body.get('grant_type'),'password');assert.equal(calls[0].options.body.get('username'),'admin@example.com');assert.equal(calls[0].options.body.get('client_id'),'1');
 await assert.rejects(()=>auth.signInAdmin('x','p',queue([response({},400)])),e=>e.status===401);
 await assert.rejects(()=>auth.signInAdmin('x','p',queue([response({},429)])),e=>e.status===429);
 await assert.rejects(()=>auth.signInAdmin('x','p',queue([response({access_token:'token'}),response({role:[]}),response({results:[]}),response({results:[]})])),e=>e.status===403);
 const handlerExports={};new Function('require','exports',compile('pages/api/admin-session.js'))(()=>auth,handlerExports);
 async function route(req){let result={};const res={setHeader:()=>{},status:v=>(result.status=v,res),json:v=>(result.body=v,result)};await handlerExports.default(req,res);return result;}
 assert.equal((await route({method:'DELETE',headers:{}})).status,405);
 assert.equal((await route({method:'GET',headers:{}})).status,401);
 assert.equal((await route({method:'POST',headers:{host:'localhost:3004',origin:'https://other.test','content-type':'application/json'}})).status,403);
 assert.equal((await route({method:'POST',headers:{host:'localhost:3004',origin:'http://localhost:3004','content-type':'text/plain'}})).status,415);
 const read={};const store=new Map();new Function('exports','process','sessionStorage','document',compile('lib/read-api.js'))(read,{env:{}},{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},{cookie:'dydBearer=old-token'});
 assert.equal(read.readAccessToken(),'old-token');read.saveAdminSession('new-token',900);assert.equal(read.readAccessToken(),'new-token');read.clearAdminSession();assert.equal(read.readAccessToken(),'');store.set(read.sessionKey,JSON.stringify({accessToken:'expired',expiresAt:0}));assert.equal(read.readAccessToken(),'');
 const parser=require('@babel/parser');for(const file of ['AdminAccess.jsx','Preview.jsx','theme.js','pages/index.jsx','pages/login.jsx','pages/api/admin-session.js','lib/admin-auth.js','lib/read-api.js']){if(fs.existsSync(file))parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']});}
 console.log('PASS: admin and assigned permissions, denial, invalid/expired sessions, login contract, rate-limit errors, request origin, environment session storage and JSX syntax. No live credentials or data used.');
})().catch(e=>{console.error(e);process.exit(1)});
