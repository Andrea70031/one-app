const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/one-transcribe/index.ts','utf8')).replace(/^import .*;\s*$/gm,'').replace('export default','globalThis.edge =');
async function call(audio,networkFailure=false){
 let calls=0;
 const c=vm.createContext({Response,Request,Blob,FormData,Uint8Array,atob,AbortSignal,Deno:{env:{get:()=> 'test-key'}},withSupabase:(_o,fn)=>fn,fetch:async()=>{calls++;if(networkFailure)throw new Error('network');return Response.json({text:'Test voce'})}});
 vm.runInContext(source,c);
 const r=await c.edge.fetch(new Request('https://example.test',{method:'POST',body:JSON.stringify({audio})}),{userClaims:{id:'test'},supabase:{rpc:async()=>({data:true})}});
 return{status:r.status,body:await r.json(),calls};
}
test('malformed or non-audio input is rejected before provider upload',async()=>{
 for(const audio of ['data:audio/mp4;base64,???','data:text/plain;base64,SGk=','data:audio/mp4;base64,=']){const r=await call(audio);assert.equal(r.status,400);assert.equal(r.calls,0)}
});
test('voice network error returns a controlled retriable response',async()=>{const r=await call('data:audio/mp4;base64,SGk=',true);assert.equal(r.status,503)});
test('valid audio returns the provider transcript',async()=>{const r=await call('data:audio/mp4;base64,SGk=');assert.equal(r.status,200);assert.equal(r.body.text,'Test voce')});
