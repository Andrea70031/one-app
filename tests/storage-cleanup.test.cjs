const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/_shared/storageCleanup.ts','utf8')).replace('export async function','async function');
function setup({failStorage=false,failAck=false,locked=false}={}) {
 const events=[];let queued=true;
 const admin={rpc:async(name)=>{
   events.push(name);
   if(name==='claim_one_storage_worker')return{data:!locked};
   if(name==='one_storage_deletion_batch')return{data:queued?[{path:'site/documents/test'}]:[]};
   return{};
 },storage:{from:()=>({remove:async(paths)=>{events.push('remove');assert.equal(paths.length,1);return{error:failStorage?{}:null}}})},from:()=>({delete:()=>({in:async()=>{events.push('ack');if(!failAck)queued=false;return{error:failAck?{}:null}}})})};
 const c=vm.createContext({crypto:require('node:crypto').webcrypto,Date});vm.runInContext(source,c);
 return{run:()=>c.drainStorageCleanup(admin),events,get queued(){return queued}};
}
test('cleanup removes bytes before acknowledging queue',async()=>{const s=setup();assert.equal((await s.run()).removed,1);assert.equal(s.queued,false);assert.ok(s.events.indexOf('remove')<s.events.indexOf('ack'));assert.equal(s.events.at(-1),'release_one_storage_worker')});
test('storage outage retains durable work for retry and releases lock',async()=>{const s=setup({failStorage:true});await assert.rejects(s.run());assert.equal(s.queued,true);assert.ok(!s.events.includes('ack'));assert.equal(s.events.at(-1),'release_one_storage_worker')});
test('lost acknowledgement keeps retry idempotent',async()=>{const s=setup({failAck:true});await assert.rejects(s.run());assert.equal(s.queued,true)});
test('concurrent worker cannot remove files',async()=>{const s=setup({locked:true});await assert.rejects(s.run());assert.ok(!s.events.includes('remove'))});
