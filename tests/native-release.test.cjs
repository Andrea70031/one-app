const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022} }).outputText;
  vm.runInNewContext(code, { exports, require: name => { if (!(name in mocks)) throw new Error(`Unexpected dependency ${name}`); return mocks[name]; }, URL, URLSearchParams, setTimeout, clearTimeout, Promise, console });
  return exports;
}
const links = load('src/native/authLinks.ts');
test('password recovery accepts only the exact ONE callback and requires both tokens', () => {
  const tokens = links.parseAuthLink('one://auth/callback#type=recovery&access_token=abc&refresh_token=xyz');
  assert.equal(tokens.recovery, true);
  for (const url of ['https://evil.test/#access_token=abc&refresh_token=xyz', 'one://evil/callback#access_token=abc&refresh_token=xyz', 'one://auth/callback#access_token=abc', 'invalid']) assert.equal(links.parseAuthLink(url), null);
  assert.throws(() => links.parseAuthLink('one://auth/callback#error=access_denied'));
});
const review = load('src/native/actionReview.ts');
test('editing commessa discards the original AI destination and normalizes numbers', () => {
  const payload = review.reviewedPayload({site_id:'old',site_job_number:'26'}, {site_job_number:'27',progress:'45',hours:'2,5'});
  assert.equal(payload.site_id,undefined); assert.equal(payload.progress,45); assert.equal(payload.hours,2.5);
  assert.throws(() => review.reviewedPayload({}, {progress:'abc'}));
  assert.equal(review.reviewedPayload({}, {progress:''}).progress,null);
});
test('new-site review includes mandatory commessa and name, email exposes recipient and full body', () => {
  assert.deepEqual(Array.from(review.reviewFields('create_site'), f=>f.key).slice(0,2),['site_job_number','site_name']);
  assert.deepEqual(Array.from(review.reviewFields('email'), f=>f.key),['to','subject','body']);
});
test('declining consent never reads a file or invokes an AI endpoint', async () => {
  let calls=0;
  const ai=load('src/native/oneAI.ts',{'expo-file-system':{File:class{constructor(){calls++}}},'./supabase':{supabase:{functions:{invoke(){calls++}}}},'./aiConsent':{requestAIConsent:async()=>false}});
  assert.equal(await ai.askOneNative({attachments:[{kind:'audio',name:'voice.m4a',uri:'local'}]}),null);
  assert.equal(calls,0);
});
test('text documents are passed as text and unsupported files fail before upload', async () => {
  const requests=[];
  const ai=load('src/native/oneAI.ts',{'expo-file-system':{File:class{size=10;async text(){return 'Checklist completa'}}},'./supabase':{supabase:{functions:{invoke:async(name,options)=>{requests.push({name,...options});return{data:{result:{summary:'ok',actions:[]}}}}}}},'./aiConsent':{requestAIConsent:async()=>true}});
  await ai.askOneNative({attachments:[{kind:'document',name:'checklist.txt',uri:'local',mimeType:'text/plain'}]});
  assert.match(requests[0].body.text,/Checklist completa/); assert.equal(requests[0].body.file,null);
  assert.equal(requests[0].timeout,70000);
  await assert.rejects(ai.askOneNative({attachments:[{kind:'document',name:'unsupported.zip',uri:'local'}]}),/Formato non supportato/);
  assert.equal(requests.length,1);
});
test('a native reminder already created remains successful if cloud mirroring fails', async () => {
  const c=load('src/native/oneActionCoordinator.ts',{
    './aiActionAdapter':{nativeActionFromAI:a=>a}, './actionEngine':{executeNativeAction:async()=>({ok:true,status:'completed'})},
    './oneWorkspaceActions':{isWorkspaceAction:()=>false},
    './oneData':{logOneAction:async()=>{},addOneActivity:async()=>{throw Error('network')},mirrorReminder:async()=>{throw Error('network')}}
  });
  const result=await c.executeCoordinatedAction('u',{kind:'reminder'});
  assert.equal(result.ok,true); assert.match(result.message,/non ripetere/);
});
test('no invented calendar dates reach the calendar adapter', async()=>{
  let payload;
  const engine=load('src/native/actionEngine.ts',{'./calendarReminders':{presentCalendarEvent:async p=>{payload=p;return{ok:false}}},'./handoffs':{}});
  await engine.executeNativeAction({kind:'calendar',payload:{title:'Meeting'}});
  assert.equal(payload.start,'');assert.equal(payload.end,'');
});
test('zero rows updated does not produce a successful workspace update', async()=>{
  const q={select(){return q},eq(){return q},is(){return q},maybeSingle:async()=>({data:{id:'site'}}),update(){return q},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)}};
  const ws=load('src/native/oneWorkspaceActions.ts',{'./supabase':{supabase:{from:()=>q}}});
  const r=await ws.executeWorkspaceAction('u',{kind:'update_site_progress',payload:{site_id:'site',progress:50}});
  assert.equal(r.ok,false);
  const empty=await ws.executeWorkspaceAction('u',{kind:'update_site_progress',payload:{site_id:'site',progress:null}});
  assert.equal(empty.ok,false);
});
test('logout clears scheduled reminders and stale user refresh cannot recreate them', async()=>{
  const scheduled=[];const storage=new Map();
  const n=load('src/native/notifications.ts',{
    'react-native':{Platform:{OS:'ios'}},
    'expo-secure-store':{getItemAsync:async k=>storage.get(k)||null,setItemAsync:async(k,v)=>storage.set(k,v)},
    'expo-notifications':{setNotificationHandler(){},getPermissionsAsync:async()=>({granted:true}),getAllScheduledNotificationsAsync:async()=>scheduled.slice(),cancelScheduledNotificationAsync:async id=>{const i=scheduled.findIndex(x=>x.identifier===id);if(i>=0)scheduled.splice(i,1)},scheduleNotificationAsync:async x=>scheduled.push({...x,identifier:String(scheduled.length)}),SchedulableTriggerInputTypes:{DATE:'date',DAILY:'daily'}}
  });
  n.setNotificationUser('a'); await n.saveNotificationPreferences({enabled:true,briefing:false,briefingHour:8});
  await n.syncOneNotifications([{id:'r',title:'private',completed:false,due_at:new Date(Date.now()+600000).toISOString()}],'a');
  assert.equal(scheduled.length,1);
  n.setNotificationUser(null); await n.syncOneNotifications([],'a');assert.equal(scheduled.length,0);
  n.setNotificationUser('b');assert.equal((await n.loadNotificationPreferences()).enabled,false);
});
test('edited reminder due date overrides older alias and map query clears stale coordinates', async()=>{
 let payload;
 const engine=load('src/native/actionEngine.ts',{'./calendarReminders':{createNativeReminder:async p=>{payload=p;return{ok:true}}},'./handoffs':{}});
 await engine.executeNativeAction({kind:'reminder',payload:{title:'Call',dueAt:'old',due_at:'new'}});
 assert.equal(payload.dueAt,'new');
 const p=review.reviewedPayload({query:'Old address',latitude:1,longitude:2},{query:'New address'});
 assert.equal(p.latitude,undefined);assert.equal(p.longitude,undefined);
});
test('service worker does not intercept private API requests or delete other apps caches', async()=>{
 const handlers={},removed=[];let intercepted=0;
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{URL,Set,Response,self:{location:{href:'https://example.test/one/sw.js'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting(){},clients:{claim:async()=>{}}},caches:{keys:async()=>['one-v19','one-v20','another-app'],delete:async key=>removed.push(key)}});
 for (const url of ['https://backend.test/rest/v1/private','https://example.test/one/private']) handlers.fetch({request:{method:'GET',url,headers:new Headers()},respondWith(){intercepted++}});
 handlers.fetch({request:{method:'GET',url:'https://example.test/one/index.html',headers:new Headers({authorization:'Bearer private'})},respondWith(){intercepted++}});
 assert.equal(intercepted,0);let job;handlers.activate({waitUntil:p=>job=p});await job;assert.deepEqual(removed,['one-v19']);
});
