const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript');
const cache={};
function load(file,reqs){const js=ts.transpileModule(fs.readFileSync(__dirname+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',js)(n=>reqs[n]||require(n),m,m.exports);return m.exports}
const model=load('lib/form-model.js',{});const calls=[];
const write={writeApi:async(path,method,body)=>{calls.push([method,path,body]);return null},formPayload:()=>{}};
const {saveKey}=load('lib/quiz-key.js',{'./write-api':write,'./form-model':model});
const noop=()=>{};
const opt=(id,k)=>({id,_k:k??String(id),body:'o'+id});
// answerKeyError
assert.match(model.answerKeyError({type:'radiobox',options:[opt(1),opt(2)],_answer:[]}),/correct answer/);
assert.equal(model.answerKeyError({type:'radiobox',options:[opt(1),opt(2)],_answer:['2']}),null);
assert.equal(model.answerKeyError({type:'checkbox',options:[opt(1)],_answer:['9']}) !== null,true);
assert.match(model.answerKeyError({type:'singlelinetext',expectedAnswer:'  '}),/expected answer/);
assert.equal(model.answerKeyError({type:'singlelinetext',expectedAnswer:'x'}),null);
assert.equal(model.answerKeyError({type:'linearscale'}),null);
const grid={type:'radioboxgrid',options:[opt(1),opt(2)],subQuestions:[{id:5,_k:'5',_answer:['1']},{id:6,_k:'6',_answer:[]}]};
assert.match(model.answerKeyError(grid),/every grid row/);
grid.subQuestions[1]._answer=['2'];assert.equal(model.answerKeyError(grid),null);
// radio: new answer posted once as a bare number
(async()=>{
 let q={id:10,type:'RadioBox',options:[opt(1),opt(2)],_answer:['2'],_serverAnswer:['1'],subQuestions:[]};
 await saveKey(q,noop);assert.deepEqual(calls.splice(0),[['POST','/api/questions/10/expectedOptions',2]]);assert.deepEqual(q._serverAnswer,['2']);
 // unchanged -> no calls
 await saveKey(q,noop);assert.equal(calls.length,0);
 // checkbox: add 3, remove 1
 q={id:11,type:'CheckBox',options:[opt(1),opt(2),opt(3)],_answer:['2','3'],_serverAnswer:['1','2'],subQuestions:[]};
 await saveKey(q,noop);assert.deepEqual(calls.splice(0),[['POST','/api/questions/11/expectedOptions',3],['DELETE','/api/expectedOptions/1',undefined]]);
 // removed option's old answer is not deleted
 q={id:12,type:'CheckBox',options:[opt(2)],_answer:['2'],_serverAnswer:['1','2'],subQuestions:[]};
 await saveKey(q,noop);assert.equal(calls.length,0);
 // new local options resolved after creation
 q={id:13,type:'DropDown',options:[{id:77,_k:'local-a',body:'a'},{id:78,_k:'local-b',body:'b'}],_answer:['local-b'],_serverAnswer:[],subQuestions:[]};
 await saveKey(q,noop);assert.deepEqual(calls.splice(0),[['POST','/api/questions/13/expectedOptions',78]]);
 // radio grid per row; checkbox grid add/remove
 q={id:14,type:'RadioBoxGrid',options:[opt(1),opt(2)],subQuestions:[{id:5,_answer:['2'],_serverAnswer:['1']},{id:6,_answer:['1'],_serverAnswer:['1']}]};
 await saveKey(q,noop);assert.deepEqual(calls.splice(0),[['POST','/api/subQuestions/5/expectedOptions',2]]);
 q={id:15,type:'CheckBoxGrid',options:[opt(1),opt(2)],subQuestions:[{id:7,_answer:['2'],_serverAnswer:['1']}]};
 await saveKey(q,noop);assert.deepEqual(calls.splice(0),[['POST','/api/subQuestions/7/expectedOptions',2],['DELETE','/api/subQuestions/7/expectedOptions/1',undefined]]);
 // short answer
 q={id:16,type:'SingleLineText',expectedAnswer:' Paris ',_serverText:'',options:[],subQuestions:[]};
 await saveKey(q,noop);assert.deepEqual(calls.splice(0),[['PUT','/api/questions/16/expectedAnswer','Paris']]);
 await saveKey(q,noop);assert.equal(calls.length,0);
 // unsupported type ignored
 await saveKey({id:17,type:'LinearScale',options:[],subQuestions:[]},noop);assert.equal(calls.length,0);
 console.log('Quiz answer-key validation and request checks passed. No API requests issued.');
})().catch(e=>{console.error(e);process.exit(1)});
