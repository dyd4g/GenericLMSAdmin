// Serial, debounced writes. Each key keeps only its newest pending revision.
export class AutosaveQueue {
 constructor({delay=1200,onStatus=()=>{},setTimer=(callback,delay)=>globalThis.setTimeout(callback,delay),clearTimer=timer=>globalThis.clearTimeout(timer),now=Date.now}={}){Object.assign(this,{delay,onStatus,setTimer,clearTimer,now});this.pending=new Map();this.blocked=new Set();this.timer=null;this.running=null;this.disposed=false;}
 schedule(key,value,write){this.pending.set(key,{value,write,due:this.now()+this.delay});this.blocked.delete(key);this.onStatus(key,{state:'pending'});this.arm();}
 arm(){if(this.timer)this.clearTimer(this.timer);this.timer=null;if(this.disposed||this.running)return;const jobs=[...this.pending.entries()].filter(([key])=>!this.blocked.has(key));if(!jobs.length)return;const due=Math.min(...jobs.map(([,job])=>job.due));this.timer=this.setTimer(()=>{this.timer=null;this.drain()},Math.max(0,due-this.now()));}
 async drain(){if(this.running||this.disposed)return;const next=[...this.pending.entries()].find(([key,job])=>!this.blocked.has(key)&&job.due<=this.now());if(!next){this.arm();return}const[key,job]=next;this.pending.delete(key);this.running=key;this.onStatus(key,{state:'saving'});try{await job.write(job.value);this.onStatus(key,{state:this.pending.has(key)?'pending':'saved',savedAt:this.now()});}catch(error){if(!this.pending.has(key))this.pending.set(key,job);this.blocked.add(key);this.onStatus(key,{state:'error',error:error.message||'Unable to save.'});}finally{this.running=null;this.arm();}}
 retry(key){const job=this.pending.get(key);if(!job)return;job.due=this.now();this.blocked.delete(key);this.onStatus(key,{state:'pending'});this.arm();}
 cancel(key){if(this.running===key)return false;this.pending.delete(key);this.blocked.delete(key);this.onStatus(key,{state:'saved'});this.arm();return true;}
 dispose(){this.disposed=true;if(this.timer)this.clearTimer(this.timer);this.timer=null;}
}
export function autosaveFingerprint(value){const {id,localDraft,_autosaveKey,...fields}=value;return JSON.stringify(fields);}
