const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript');
function load(file,reqs){const js=ts.transpileModule(fs.readFileSync(__dirname+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',js)(n=>reqs[n]||require(n),m,m.exports);return m.exports}
(async()=>{
  delete process.env.NEXT_PUBLIC_LMS_ENV;
  const read=load('lib/read-api.js',{});const write=load('lib/write-api.js',{'./read-api':read});
  // payload matches the old admin's video fields; the file and the URL are never part of it
  const p=write.videoPayload({name:'Intro',description:'',assignedTo:undefined},2);
  assert.deepEqual(p,{name:'Intro',description:null,order:2,isRequired:true,isEnabled:true,assignedTo:'Trainee',canSkipForward:true});
  assert.equal(write.videoPayload({name:'x',assignedTo:'Coach',canSkipForward:false,isRequired:false},1).canSkipForward,false);
  assert.throws(()=>write.videoPayload({name:' '},1),/name/);assert.throws(()=>write.videoPayload({name:'x',assignedTo:'Both'},1),/trainee or the coach/);
  // upload requests
  const file={name:'clip.mp4',size:1234};
  assert.deepEqual(write.initVideoUploadRequest(7,file),{path:'/api/videos/7/upload',method:'PUT',body:{fileName:'clip.mp4',fileSize:1234}});
  assert.throws(()=>write.initVideoUploadRequest('local-1',file),/Save the video task/);assert.throws(()=>write.initVideoUploadRequest(7,{name:'a',size:0}),/not empty/);assert.throws(()=>write.initVideoUploadRequest(7,null),/not empty/);
  assert.deepEqual(write.finishVideoUploadRequest(7),{path:'/api/videos/7/upload/finish',method:'POST'});
  assert.deepEqual(write.removeVideoUploadRequest(7),{path:'/api/videos/7/upload',method:'DELETE'});
  assert.throws(()=>write.finishVideoUploadRequest(undefined),/Unknown/);assert.throws(()=>write.removeVideoUploadRequest(0),/Unknown/);
  // provider routing and block sizes (same as the old admin)
  const upload=load('lib/video-upload.js',{});
  assert.deepEqual(upload.knownProviders,['AzureBlobStorage','Vimeo']);
  assert.equal(typeof upload.uploadHandlerFor('Vimeo'),'function');assert.equal(typeof upload.uploadHandlerFor('AzureBlobStorage'),'function');
  assert.throws(()=>upload.uploadHandlerFor('YouTube'),/unsupported upload provider/);
  const MB=1048576;
  for(const [size,block] of [[MB,256*1024],[4*MB,256*1024],[5*MB,MB],[32*MB,MB],[33*MB,4*MB],[256*MB,4*MB],[300*MB,8*MB]])assert.equal(upload.azureBlockSize(size),block);
  // writes on Galilee Prod are still limited to the RSTI group
  process.env.NEXT_PUBLIC_LMS_ENV='galilee-prod';
  const prodRead=load('lib/read-api.js',{}),prodWrite=load('lib/write-api.js',{'./read-api':prodRead});
  global.sessionStorage={getItem:()=>null,setItem(){}};global.document={cookie:'dydBearer=t'};let sent=0;global.fetch=async()=>{sent++;return {ok:true,status:204,text:async()=>''}};
  const init=prodWrite.initVideoUploadRequest(7,file);
  prodRead.writeScope.groupId=44;await assert.rejects(()=>prodWrite.writeApi(init.path,init.method,init.body),/limited to the RSTI group/);assert.equal(sent,0);
  prodRead.writeScope.groupId=1003;await prodWrite.writeApi(init.path,init.method,init.body);assert.equal(sent,1);
  console.log('Video payload, upload request, provider routing and Prod isolation checks passed. No real API requests issued.');
})().catch(e=>{console.error(e);process.exit(1)});
