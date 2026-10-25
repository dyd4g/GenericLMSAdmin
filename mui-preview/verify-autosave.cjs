const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const {AutosaveQueue}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('lib/autosave-queue.js','utf8')).toString('base64'));
 let time=0,calls=[],statuses={},release;
 const q=new AutosaveQueue({now:()=>time,setTimer:()=>1,clearTimer:()=>{},onStatus:(k,s)=>statuses[k]=s});
 q.schedule('a',1,async v=>calls.push(v));q.schedule('a',2,async v=>calls.push(v));time=1200;await q.drain();assert.deepEqual(calls,[2]);assert.equal(statuses.a.state,'saved');
 q.schedule('a',3,v=>new Promise(r=>{calls.push(v);release=r}));time=2400;const running=q.drain();q.schedule('a',4,async v=>calls.push(v));q.schedule('b',5,async v=>calls.push(v));time=3600;await q.drain();assert.deepEqual(calls,[2,3]);release();await running;await q.drain();await q.drain();assert.deepEqual(calls,[2,3,4,5]);
 let fail=true;q.schedule('c',6,async v=>{if(fail)throw Error('offline');calls.push(v)});time=4800;await q.drain();assert.equal(statuses.c.state,'error');await q.drain();assert.equal(statuses.c.state,'error');fail=false;q.retry('c');await q.drain();assert.equal(statuses.c.state,'saved');
 q.schedule('d',7,async v=>calls.push(v));q.cancel('d');time=6000;await q.drain();assert(!calls.includes(7));q.schedule('e',8,async v=>calls.push(v));q.dispose();time=7200;await q.drain();assert(!calls.includes(8));q.disposed=false;await q.drain();assert(calls.includes(8));
 // Browser timer functions require the global receiver; Node timers do not.
 const vm=require('node:vm');
 const browserSource=fs.readFileSync('lib/autosave-queue.js','utf8').replaceAll('export ','');
 const browserResult=vm.runInNewContext(`
 let scheduled=0,cleared=0;
 function setTimeout(callback,delay){if(this!==globalThis)throw new TypeError('Illegal invocation');scheduled++;return scheduled;}
 function clearTimeout(timer){if(this!==globalThis)throw new TypeError('Illegal invocation');cleared++;}
 `+browserSource+`
 const queue=new AutosaveQueue();
 queue.schedule('new-lesson',{name:'Lesson'},async()=>{});
 queue.schedule('new-lesson',{name:'Updated lesson'},async()=>{});
 queue.dispose();
 ({scheduled,cleared});
 `);
 assert.equal(browserResult.scheduled,2);assert.equal(browserResult.cleared,2);
 console.log('PASS: browser timer receiver on scheduling, rescheduling and disposal');
 console.log('PASS: coalescing, serial writes, edits during save, retry, cancellation and remount recovery');
 const ts=require('typescript');
 const statusModule={};const statusCode=ts.transpileModule(fs.readFileSync('AutosaveStatus.jsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 new Function('require','exports',statusCode)(require,statusModule);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 for(const state of ['pending','saving','saved',undefined])assert.equal(renderToStaticMarkup(React.createElement(statusModule.default,{status:state?{state}:undefined})), '');
 const failure=renderToStaticMarkup(React.createElement(statusModule.default,{status:{state:'error',error:'Offline'},onRetry:()=>{}}));assert(failure.includes('Offline'));assert(failure.includes('Retry'));assert(failure.includes('role="alert"'));
 console.log('PASS: autosave labels stay invisible during normal operation; failures retain accessible error and Retry');
 const parser=require('@babel/parser');for(const file of ['LessonWorkspace.jsx','LiveCourses.jsx','Preview.jsx','AutosaveStatus.jsx','useAutosave.js'])parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']});console.log('PASS: JSX syntax');
})().catch(e=>{console.error(e);process.exit(1)});
