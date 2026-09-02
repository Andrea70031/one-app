const $=id=>document.getElementById(id), $$=s=>[...document.querySelectorAll(s)];
const SUPABASE_URL="https://frehflwcnghrmqpzbpno.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_SuYaTiqS5F9OifFyuadFEA_xkAqQujw";
const ONE_AI_ENDPOINT=`${SUPABASE_URL}/functions/v1/one-ai`;
const ONE_TRANSCRIBE_ENDPOINT=`${SUPABASE_URL}/functions/v1/one-transcribe`;
const LEGAL_VERSION="1.1-2026-08-29";
const TERMS_HTML=`<div class="legal-note"><strong>Versione Beta.</strong> Questi termini sono una base operativa per il prototipo e dovranno essere completati prima della distribuzione commerciale.</div>
<h3>1. Ambito e accettazione</h3><p>I presenti Termini disciplinano l'uso di ONE, attualmente disponibile in versione Beta. Utilizzando ONE accetti questi Termini.</p>
<h3>2. Natura del servizio</h3><p>ONE è un assistente software basato anche su sistemi di intelligenza artificiale. Può analizzare testo, immagini, documenti e audio, memorizzare informazioni e suggerire azioni.</p>
<h3>3. Versione Beta e accuratezza</h3><p>I risultati AI possono contenere errori, omissioni o informazioni non aggiornate. Devi verificare le informazioni prima di usarle per decisioni importanti.</p>
<h3>4. Nessuna consulenza professionale</h3><p>ONE non sostituisce professionisti qualificati e non deve essere usato come unica fonte per decisioni mediche, legali, fiscali, finanziarie o di sicurezza.</p>
<h3>5. Contenuti dell'utente</h3><p>Resti responsabile dei contenuti caricati e dichiari di avere i diritti e le autorizzazioni necessari per utilizzarli.</p>
<h3>6. Account e sincronizzazione</h3><p>Puoi usare alcune funzioni senza account. Se crei un account, attività e Recall possono essere sincronizzati sul backend ONE e associati al tuo identificativo utente.</p>
<h3>7. Elaborazione tramite fornitori</h3><p>Per fornire le funzionalità richieste, ONE può trasmettere i contenuti ai servizi tecnici necessari, inclusi fornitori cloud e di intelligenza artificiale.</p>
<h3>8. Azioni e conferme</h3><p>Le azioni suggerite devono essere verificate dall'utente. Operazioni irreversibili o verso terzi dovranno richiedere conferma esplicita.</p>
<h3>9. Uso consentito</h3><p>È vietato usare ONE per attività illecite, frodi, malware, violazioni della sicurezza o dei diritti altrui.</p>
<h3>10. Disponibilità</h3><p>Il servizio è fornito nello stato in cui si trova e può essere modificato, sospeso o interrotto durante lo sviluppo.</p>
<h3>11. Responsabilità</h3><p>Nella misura consentita dalla legge, l'utente resta responsabile dell'uso dei risultati e delle azioni eseguite tramite ONE.</p>
<h3>12. Modifiche</h3><p>I Termini possono essere aggiornati con l'evoluzione del prodotto; per modifiche rilevanti potrà essere richiesta una nuova accettazione.</p>`;
const PRIVACY_HTML=`<div class="legal-note"><strong>Informativa preliminare Beta.</strong> Prima del rilascio commerciale dovrà essere completata con titolare, contatti, basi giuridiche, conservazione e altri elementi richiesti dal GDPR.</div>
<h3>1. Dati trattati</h3><p>A seconda delle funzioni utilizzate, ONE può trattare testo, immagini, documenti, audio, dati dell'account, attività e metadati tecnici.</p>
<h3>2. Finalità</h3><p>I dati sono usati per fornire le funzioni richieste, generare risposte e azioni, sincronizzare Recall e attività, mantenere sicurezza e affidabilità.</p>
<h3>3. AI e fornitori</h3><p>Quando usi funzioni AI, i contenuti necessari vengono inviati dal frontend al backend ONE e quindi ai fornitori tecnici necessari all'elaborazione.</p>
<h3>4. Memoria locale e cloud</h3><p>Senza account ONE usa una cronologia locale nel browser. Con un account, attività e Recall possono essere sincronizzati su Supabase con regole di accesso che limitano ogni utente ai propri dati.</p>
<h3>5. Dati sensibili</h3><p>Evita di inviare dati altamente sensibili o dati di terzi quando non è necessario o non sei autorizzato a farlo.</p>
<h3>6. Conservazione e diritti</h3><p>Tempi di conservazione, contatti e modalità per esercitare i diritti privacy saranno definiti nella versione commerciale definitiva.</p>
<h3>7. Sicurezza</h3><p>Le chiavi segrete dei servizi AI restano sul backend; il frontend usa esclusivamente credenziali pubblicabili e token di sessione personali.</p>`;

const orb=$("orb"),orbLabel=$("orbLabel"),orbSubtitle=$("orbSubtitle"),wave=$("wave"),particles=$("particles"),promptInput=$("promptInput"),micButton=$("micButton"),demoResult=$("demoResult"),navOrb=$("navOrb");
let state="idle",timer=null,recorder=null,chunks=[],stream=null,toastTimer=null,authMode="login",session=loadSession(),selectedSiteId=null,sitesCache=[];

const defaultActivities=[
{id:"demo1",icon:"▤",title:"Fattura ACME.pdf",detail:"Esempio attività ONE",time:"Demo",type:"document",demo:true},
{id:"demo2",icon:"⌂",title:"Ristorante salvato",detail:"Esempio Recall",time:"Demo",type:"place",demo:true},
{id:"demo3",icon:"✈",title:"Viaggio",detail:"Esempio monitoraggio",time:"Demo",type:"travel",demo:true}
];

function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.remove("hidden");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add("hidden"),2600)}
function setState(s){state=s;orb.className="orb "+s;wave.classList.toggle("hidden",s!=="listening");particles.classList.toggle("hidden",s!=="thinking");const m={idle:["ONE","Tocca per iniziare"],listening:["ONE","Ti ascolto…"],thinking:["ONE","Sto pensando…"],done:["✓","Fatto!"]};orbLabel.textContent=m[s][0];orbSubtitle.textContent=m[s][1]}
function setAIStatus(ok,label){const e=$("aiStatus");e.classList.toggle("degraded",!ok);e.innerHTML=`<span></span> ${label}`}
function resultTarget(){return selectedSiteId&&$("siteView")?.classList.contains("active-view")?$("siteAiResult"):demoResult}
function show(message,isError=false){const target=resultTarget();target.innerHTML="";const p=document.createElement("div");p.textContent=message;target.appendChild(p);target.classList.toggle("error",isError);target.classList.remove("hidden")}
function loadSession(){try{return JSON.parse(localStorage.getItem("one_session")||"null")}catch{return null}}
function saveSession(s){session=s;if(s)localStorage.setItem("one_session",JSON.stringify(s));else localStorage.removeItem("one_session");updateAccountUI()}
async function ensureSession(){
  if(!session?.access_token)throw new Error("not_authenticated");
  if(!session.expires_at||session.expires_at>Date.now()/1000+60)return session;
  if(!session.refresh_token){saveSession(null);throw new Error("session_expired")}
  try{const refreshed=await authFetch("token?grant_type=refresh_token",{refresh_token:session.refresh_token});refreshed.expires_at=Math.floor(Date.now()/1000)+(refreshed.expires_in||3600);saveSession(refreshed);return refreshed}catch{saveSession(null);throw new Error("session_expired")}
}
function userId(){return session?.user?.id||null}
function getLocalActivities(){try{return JSON.parse(localStorage.getItem("one_activities"))||defaultActivities}catch{return defaultActivities}}
function saveLocalActivities(a){if(localStorage.one_history!=="off")localStorage.setItem("one_activities",JSON.stringify(a.slice(0,40)))}
async function cloudRequest(path,{method="GET",body}={}){
  const activeSession=await ensureSession();
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{method,headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${activeSession.access_token}`,"Content-Type":"application/json","Prefer":"return=representation"},body:body?JSON.stringify(body):undefined});
  if(r.status===401){saveSession(null);throw new Error("session_expired")}
  const data=await r.json().catch(()=>null);if(!r.ok)throw new Error(data?.message||`Errore cloud ${r.status}`);return data
}
async function syncFromCloud(){
  if(!session)return;
  try{
    $("recallCloudState").innerHTML='<span class="sync-spinner"></span> Sincronizzazione';
    const rows=await cloudRequest("one_activities?select=*&order=created_at.desc&limit=40");
    if(Array.isArray(rows)&&rows.length){
      const a=rows.map(x=>({id:x.id,icon:x.icon||"✦",title:x.title,detail:x.detail||"",time:new Date(x.created_at).toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"}),type:x.type||"activity",cloud:true}));
      saveLocalActivities(a);renderActivities();
    }
    $("recallCloudState").textContent="● Cloud sincronizzato";$("recallCloudState").classList.add("online")
  }catch(e){$("recallCloudState").textContent="○ Sync non disponibile";$("recallCloudState").classList.remove("online")}
}
async function addActivity(title,detail,icon="✦",type="ai",payload={}){
  const a=getLocalActivities();const local={id:Date.now().toString(),icon,title:title.slice(0,100),detail:detail.slice(0,180),time:"Ora",type};a.unshift(local);saveLocalActivities(a);renderActivities();
  if(session){
    try{await cloudRequest("one_activities",{method:"POST",body:{user_id:userId(),site_id:selectedSiteId||null,type,title:title.slice(0,180),detail:detail.slice(0,500),icon,payload}})}catch{}
  }
}
async function saveMemory(result,sourceType="ai",sourceName=""){
  const title=result?.memory_title||result?.summary||"Nuova memoria",summary=result?.memory_summary||result?.intent||result?.summary||"";
  if(!session){toast("Salvato nella cronologia locale. Accedi per Recall cloud.");return}
  try{await cloudRequest("one_memories",{method:"POST",body:{user_id:userId(),site_id:selectedSiteId||null,kind:result?.type||"note",title:title.slice(0,180),summary:summary.slice(0,700),source_type:sourceType,source_name:sourceName,payload:result?.extracted||{}}});toast("Salvato in Recall cloud");await loadCloudMemories()}catch{toast("Non riesco a salvare in Recall cloud")}
}
async function loadCloudMemories(){
  if(!session)return;
  try{
    const rows=await cloudRequest("one_memories?select=*&order=created_at.desc&limit=40");
    $("recallList").innerHTML=rows.length?rows.map(x=>`<button class="activity-card"><span class="a-icon">◌</span><span class="a-copy"><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.summary||"")}</small></span><time>${new Date(x.created_at).toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"})}</time></button>`).join(""):`<div class="empty-state">Recall cloud è vuoto. Chiedi a ONE di analizzare qualcosa e salvalo.</div>`
  }catch{}
}
function getLocalActivities(){try{return JSON.parse(localStorage.getItem("one_activities"))||defaultActivities}catch{return defaultActivities}}
function renderActivities(){
  const a=getLocalActivities(), row=x=>`<button class="activity-card" data-activity="${x.id}"><span class="a-icon">${x.icon}</span><span class="a-copy"><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.detail)}</small></span><time>${escapeHtml(x.time)}</time></button>`;
  $("recentCard").innerHTML=a.slice(0,3).map(x=>`<button class="recent-row" data-activity="${x.id}"><div class="recent-icon">${x.icon}</div><div class="recent-copy"><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.detail)}</span></div><time>${escapeHtml(x.time)}</time></button>`).join("");
  $("allActivities").innerHTML=a.length?a.map(row).join(""):`<div class="empty-state">Nessuna attività.</div>`;
  if(!session)$("recallList").innerHTML=a.length?a.filter(x=>!x.demo).map(row).join("")||`<div class="empty-state">Recall locale è ancora vuoto.</div>`:`<div class="empty-state">Recall locale è ancora vuoto.</div>`;
  bindActivityClicks()
}
function bindActivityClicks(){$$("[data-activity]").forEach(b=>b.onclick=()=>{const a=getLocalActivities().find(x=>x.id===b.dataset.activity);if(a)openSheet("activity",a)})}

function showAIResult(result,source={type:"ai",name:""}){
  const target=resultTarget();target.innerHTML="";target.classList.remove("error");
  const title=document.createElement("strong");title.textContent=result?.summary||"Analisi completata";target.appendChild(title);
  if(result?.intent){const i=document.createElement("div");i.style.cssText="margin-top:8px;opacity:.75";i.textContent="ONE ha capito: "+result.intent;target.appendChild(i)}
  const wrap=document.createElement("div");wrap.style.cssText="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px";
  const save=document.createElement("button");save.textContent=session?"Salva in Recall":"Ricorda";save.className="result-action";save.style.cssText="border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:white;border-radius:999px;padding:9px 12px;font-size:12px";save.onclick=()=>saveMemory(result,source.type,source.name);wrap.appendChild(save);
  (result?.actions||[]).slice(0,3).forEach(action=>{const b=document.createElement("button");b.textContent=action.label||"Azione";b.style.cssText=save.style.cssText;b.onclick=()=>confirmAndExecuteAction(action,result);wrap.appendChild(b)});
  target.appendChild(wrap);target.classList.remove("hidden");
  addActivity(result?.summary||"Richiesta AI",result?.intent||"Elaborata da ONE","✦","ai",result?.extracted||{})
}
async function askONE(payload,source={type:"ai",name:""}){
  if(!session){show("Accedi a ONE per usare l'AI e proteggere il tuo spazio.",true);openAuth();return}
  setState("thinking");show("ONE sta analizzando…");
  try{
    const activeSession=await ensureSession();
    const r=await fetch(ONE_AI_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${activeSession.access_token}`},body:JSON.stringify(payload)});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.detail||data?.error||`Errore ${r.status}`);
    setAIStatus(true,"ONE AI attiva");setState("done");showAIResult(data.result||data,source);clearTimeout(timer);timer=setTimeout(()=>setState("idle"),1600)
  }catch(err){
    setState("idle");const msg=(err?.message||"").toLowerCase();
    if(msg.includes("credits")||msg.includes("billing")||msg.includes("quota")){setAIStatus(false,"AI in pausa");show("ONE è operativo, ma il motore AI è temporaneamente in pausa per il credito API.",true)}
    else{setAIStatus(false,"AI non disponibile");show("Non riesco a contattare il motore AI in questo momento.",true)}
  }
}
for(let i=0;i<22;i++){const p=document.createElement("span");p.className="particle";p.style.left=(10+((i*17)%80))+"%";p.style.top=(10+((i*29)%80))+"%";p.style.opacity=(.25+(i%4)*.15);p.style.animationDelay=((i%6)*120)+"ms";particles.appendChild(p)}

function showFile(f,label){const c=$("captureCard"),img=$("captureImage"),ico=$("captureIcon");c.classList.remove("hidden");$("captureTitle").textContent=label;$("captureMeta").textContent=`${f.name} · ${Math.max(1,Math.round(f.size/1024))} KB`;if(f.type.startsWith("image/")){img.src=URL.createObjectURL(f);img.classList.remove("hidden");ico.classList.add("hidden")}else{img.classList.add("hidden");ico.classList.remove("hidden")}addActivity(label,f.name,f.type.startsWith("image/")?"▧":"▤","capture")}
function readAsDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
function readAsText(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsText(file)})}
function imageFileToDataURL(file,maxSide=1600,quality=.82){return new Promise((resolve,reject)=>{const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{let{width,height}=im;const sc=Math.min(1,maxSide/Math.max(width,height));width=Math.round(width*sc);height=Math.round(height*sc);const cv=document.createElement("canvas");cv.width=width;cv.height=height;cv.getContext("2d").drawImage(im,0,0,width,height);resolve(cv.toDataURL("image/jpeg",quality))};im.onerror=reject;im.src=rd.result};rd.onerror=reject;rd.readAsDataURL(file)})}
async function analyzeImageFile(file,label){showFile(file,label);try{await askONE({text:"Analizza ciò che ti sto mostrando e proponimi le azioni più utili.",image:await imageFileToDataURL(file)},{type:"image",name:file.name})}catch{show("Immagine acquisita, ma non riesco a prepararla per l'AI.",true)}}
async function analyzeDocument(file){
  showFile(file,"Documento");
  if(file.size>9_000_000){show("Per questa Beta i documenti devono essere inferiori a circa 9 MB.",true);return}
  try{
    if(file.type.startsWith("image/"))return analyzeImageFile(file,"Documento fotografato");
    if(file.type==="text/plain"||file.name.toLowerCase().endsWith(".txt"))return askONE({text:(await readAsText(file)).slice(0,18000)},{type:"document",name:file.name});
    const data=await readAsDataURL(file);
    await askONE({text:"Analizza questo documento. Riassumi i dati importanti e proponi azioni utili.",file:data,filename:file.name},{type:"document",name:file.name})
  }catch{show("Documento acquisito, ma l'analisi non è riuscita.",true)}
}
$("cameraBtn").onclick=()=>$("cameraInput").click();$("photoBtn").onclick=()=>$("photoInput").click();$("documentBtn").onclick=()=>$("documentInput").click();
$("cameraInput").onchange=e=>{const f=e.target.files?.[0];if(f)analyzeImageFile(f,"Foto dalla fotocamera")};
$("photoInput").onchange=e=>{const f=e.target.files?.[0];if(f)analyzeImageFile(f,"Foto selezionata")};
$("documentInput").onchange=e=>{const f=e.target.files?.[0];if(f)analyzeDocument(f)};
$("clearCapture").onclick=()=>{$("captureCard").classList.add("hidden");$("captureImage").src="";demoResult.classList.add("hidden")};

function blobToDataURL(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(blob)})}
async function transcribeAudio(blob){
  if(!session){setState("idle");show("Accedi a ONE per trascrivere e proteggere la nota vocale.",true);openAuth();return}
  setState("thinking");show("Sto trascrivendo la tua voce…");
  try{
    const activeSession=await ensureSession();
    const r=await fetch(ONE_TRANSCRIBE_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${activeSession.access_token}`},body:JSON.stringify({audio:await blobToDataURL(blob)})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.detail||d?.error||"Trascrizione non riuscita");
    if(!d.text)throw new Error("Nessun testo riconosciuto");
    addActivity("Nota vocale",d.text,"◉","audio");show(`Hai detto: “${d.text}”`);await askONE({text:d.text,...(selectedSiteId?{site_id:selectedSiteId}:{})},{type:"audio",name:"nota vocale"})
  }catch(e){setState("idle");show("La voce è stata acquisita, ma la trascrizione AI non è disponibile in questo momento.",true)}
}
async function toggleMic(){
  try{
    if(recorder&&recorder.state==="recording"){recorder.stop();return}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){show("Registrazione vocale non disponibile in questo browser.",true);return}
    stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    recorder.onstop=async()=>{const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});stream.getTracks().forEach(t=>t.stop());await transcribeAudio(blob)};
    recorder.start();setState("listening");show("Registrazione in corso… Tocca di nuovo per fermare.")
  }catch{setState("idle");show("Non riesco ad accedere al microfono. Controlla il permesso del sito in Safari.",true)}
}
micButton.onclick=toggleMic;navOrb.onclick=toggleMic;$("orbButton").onclick=toggleMic;

$("askForm").onsubmit=async e=>{e.preventDefault();const v=promptInput.value.trim();if(!v)return;promptInput.value="";updateSend();await addActivity(v,"Richiesta inviata a ONE","✦","prompt");await askONE({text:v},{type:"text",name:"richiesta"})};
function updateSend(){const has=!!promptInput.value.trim();$("sendBtn").classList.toggle("hidden",!has);micButton.classList.toggle("hidden",has)}
promptInput.addEventListener("input",updateSend);

function siteStatusLabel(status=""){return status||"Da pianificare"}
function progressValue(value){return Math.min(100,Math.max(0,Number(value)||0))}
function siteCard(site){const progress=progressValue(site.progress);return `<button class="workspace-card" data-site="${site.id}"><div class="workspace-card-top"><span class="workspace-icon">⌂</span><span class="workspace-copy"><strong>${escapeHtml(site.job_number)} · ${escapeHtml(site.name)}</strong><small>${escapeHtml(site.client||site.address||"Cantiere")}</small></span><span class="chev">›</span></div><div class="progress-row"><span><i style="width:${progress}%"></i></span><b>${progress}%</b></div><div class="workspace-meta"><span>${escapeHtml(siteStatusLabel(site.status))}</span><span>Apri spazio</span></div></button>`}
async function loadWorkspaces(){
  const list=$("workspaceSites"),workspaceState=$("workspaceState");
  if(!session){workspaceState.textContent="Accedi per vedere i cantieri assegnati al tuo account.";list.innerHTML=`<button class="workspace-login" id="workspaceLogin">Accedi a ONE</button>`;$("workspaceLogin").onclick=()=>openAuth();return}
  workspaceState.textContent="Caricamento spazi…";list.innerHTML=`<div class="empty-state"><span class="sync-spinner"></span> Sincronizzazione</div>`;
  try{sitesCache=await cloudRequest("sites?select=id,job_number,name,client,address,status,progress,updated_at&order=updated_at.desc");workspaceState.textContent=`${sitesCache.length} ${sitesCache.length===1?"cantiere disponibile":"cantieri disponibili"}`;list.innerHTML=sitesCache.length?sitesCache.map(siteCard).join(""):`<div class="empty-state">Non hai ancora cantieri assegnati.</div>`;$$("[data-site]").forEach(button=>button.onclick=()=>openSite(button.dataset.site))}catch{workspaceState.textContent="Spazi non disponibili";list.innerHTML=`<div class="empty-state">Non riesco a caricare i cantieri. Verifica la sessione e riprova.</div>`}
}
async function openSite(siteId){
  const site=sitesCache.find(item=>item.id===siteId);if(!site)return;
  selectedSiteId=siteId;navigate("site",true);$("siteTitle").textContent=site.name;$("siteSubtitle").textContent=`${site.job_number}${site.client?` · ${site.client}`:""}`;$("siteProgress").textContent=`${progressValue(site.progress)}%`;$("siteStatus").textContent=siteStatusLabel(site.status);$("siteAddress").textContent=site.address||"Indirizzo non indicato";$("sitePulse").innerHTML=`<div class="empty-state"><span class="sync-spinner"></span> Aggiornamento del cantiere</div>`;
  try{
    const [issues,activities,reports,documents,members]=await Promise.all([
      cloudRequest(`issues?select=id,title,details,priority,status,due_at,created_at&site_id=eq.${encodeURIComponent(siteId)}&order=created_at.desc&limit=30`),
      cloudRequest(`activities?select=id,title,notes,created_at&site_id=eq.${encodeURIComponent(siteId)}&order=created_at.desc&limit=20`),
      cloudRequest(`daily_reports?select=id,report_date,summary,works,blockers,workers,hours&site_id=eq.${encodeURIComponent(siteId)}&order=report_date.desc&limit=10`),
      cloudRequest(`documents?select=id,file_name,category,created_at&site_id=eq.${encodeURIComponent(siteId)}&order=created_at.desc&limit=20`),
      cloudRequest(`site_members?select=id,role&site_id=eq.${encodeURIComponent(siteId)}`)
    ]);
    const openIssues=issues.filter(issue=>!["Risolto","Chiusa","Completata"].includes(issue.status));
    const urgent=openIssues.filter(issue=>["Critica","Alta"].includes(issue.priority));
    $("sitePulse").innerHTML=`<div class="pulse-grid"><div><strong>${openIssues.length}</strong><span>Problemi aperti</span></div><div><strong>${urgent.length}</strong><span>Priorità alte</span></div><div><strong>${members.length}</strong><span>Persone</span></div><div><strong>${documents.length}</strong><span>Documenti</span></div></div>`;
    $("siteIssues").innerHTML=openIssues.length?openIssues.slice(0,6).map(issue=>`<div class="site-row"><span class="priority-dot ${issue.priority==="Critica"?"critical":issue.priority==="Alta"?"high":""}"></span><div><strong>${escapeHtml(issue.title)}</strong><small>${escapeHtml(issue.priority)} · ${escapeHtml(issue.status)}</small></div></div>`).join(""):`<div class="empty-state compact">Nessun problema aperto.</div>`;
    const feed=[...activities.map(item=>({title:item.title,detail:item.notes||"Attività",date:item.created_at,icon:"✓"})),...reports.map(item=>({title:`Report ${new Date(item.report_date).toLocaleDateString("it-IT")}`,detail:item.summary||item.works||"Report giornaliero",date:item.report_date,icon:"▤"}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
    $("siteFeed").innerHTML=feed.length?feed.map(item=>`<div class="site-row"><span class="feed-icon">${item.icon}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div></div>`).join(""):`<div class="empty-state compact">Nessun aggiornamento recente.</div>`;
  }catch{$("sitePulse").innerHTML=`<div class="empty-state">Dati del cantiere temporaneamente non disponibili.</div>`}
}

function navigate(name,preserveSite=false){const map={home:"homeView",spaces:"spacesView",site:"siteView",activities:"activitiesView",recall:"recallView",search:"searchView",profile:"profileView"};if(!preserveSite&&name!=="site")selectedSiteId=null;$$(".view").forEach(v=>v.classList.remove("active-view"));$(map[name]||map.home).classList.add("active-view");$$(".bottom-nav>button:not(.nav-orb)").forEach(b=>b.classList.remove("active"));const nav={home:"navHome",spaces:"navSpaces",site:"navSpaces",search:"navSearch",profile:"navProfile"};if(nav[name])$(nav[name]).classList.add("active");closeDrawer();window.scrollTo({top:0,behavior:"smooth"});if(name==="search")setTimeout(()=>$("searchInput").focus(),250);if(name==="recall"&&session)loadCloudMemories();if(name==="spaces")loadWorkspaces()}
$("navHome").onclick=()=>navigate("home");$("navSpaces").onclick=()=>navigate("spaces");$("navSearch").onclick=()=>navigate("search");$("navProfile").onclick=()=>navigate("profile");$$("[data-home]").forEach(b=>b.onclick=()=>navigate("home"));$("seeAll").onclick=()=>navigate("activities");$("memoryCard").onclick=()=>navigate("recall");$("profileBtn").onclick=()=>navigate("profile");$("siteBack").onclick=()=>navigate("spaces");
$("siteAskForm").onsubmit=async e=>{e.preventDefault();const input=$("sitePromptInput"),value=input.value.trim();if(!value||!selectedSiteId)return;input.value="";await addActivity(value,"Richiesta sul cantiere","✦","site_prompt");await askONE({text:value,site_id:selectedSiteId},{type:"site",name:$("siteTitle").textContent})};
function openDrawer(){$("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false");$("scrim").classList.remove("hidden")}
function closeDrawer(){$("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true");if(!$("sheet").classList.contains("open"))$("scrim").classList.add("hidden")}
$("menuBtn").onclick=openDrawer;$("drawerClose").onclick=closeDrawer;$("scrim").onclick=()=>{closeDrawer();closeSheet()};$$("[data-nav]").forEach(b=>b.onclick=()=>navigate(b.dataset.nav));

function openSheet(type,data={}){
  closeDrawer();const title=$("sheetTitle"),sub=$("sheetSubtitle"),body=$("sheetBody");
  const t={
    terms:()=>{title.textContent="Termini di utilizzo";sub.textContent="Versione 1.1 · 29 agosto 2026";body.innerHTML=TERMS_HTML},
    privacy:()=>{title.textContent="Privacy";sub.textContent="Informativa preliminare Beta";body.innerHTML=PRIVACY_HTML},
    account:()=>{title.textContent="Account e cloud";sub.textContent=session?"Sincronizzazione attiva":"Modalità locale";body.innerHTML=session?`<div class="sheet-row"><div><strong>${escapeHtml(session.user?.email||"Account ONE")}</strong><small>Recall e attività possono essere sincronizzati</small></div><span style="color:#79e7c7">ATTIVO</span></div><button class="primary-btn" id="sheetSync">Sincronizza adesso</button><button class="auth-mode-btn" id="sheetLogout" style="color:#ff9aaa">Esci dall'account</button>`:`<p>Puoi continuare a usare ONE senza account. Accedi solo se vuoi Recall e attività sincronizzati sul cloud.</p><button class="primary-btn" id="sheetLogin">Accedi o crea account</button>`;setTimeout(()=>{if($("sheetLogin"))$("sheetLogin").onclick=()=>{closeSheet();openAuth()};if($("sheetLogout"))$("sheetLogout").onclick=()=>logout();if($("sheetSync"))$("sheetSync").onclick=()=>{syncFromCloud();toast("Sincronizzazione avviata")}},0)},
    settings:()=>{title.textContent="Impostazioni";sub.textContent="Personalizza ONE";body.innerHTML=`<div class="sheet-row"><div><strong>Feedback aptico</strong><small>Vibrazione leggera sui comandi supportati</small></div><button class="toggle ${localStorage.one_haptics!=="off"?"on":""}" id="hapticToggle"><span></span></button></div><div class="sheet-row"><div><strong>Salva cronologia locale</strong><small>Memorizza le attività sul dispositivo</small></div><button class="toggle ${localStorage.one_history!=="off"?"on":""}" id="historyToggle"><span></span></button></div><div class="sheet-row"><div><strong>Cancella memoria locale</strong><small>Non cancella i dati cloud</small></div><button id="clearHistory" style="color:#ff8897">Cancella</button></div>`;setTimeout(bindSettings,0)},
    integrations:()=>{title.textContent="Integrazioni";sub.textContent="ONE Actions";body.innerHTML=`<div class="legal-note">ONE prepara le integrazioni. Calendario, Promemoria ed Email richiederanno autorizzazioni esplicite.</div>${["Calendario","Promemoria","Email","Mappe","File","Casa smart"].map(x=>`<div class="sheet-row"><div><strong>${x}</strong><small>Connessione non ancora attiva</small></div><span style="color:#687285;font-size:11px">PRESTO</span></div>`).join("")}`},
    actions:()=>{title.textContent="Centro azioni";sub.textContent="Azioni reali di ONE";body.innerHTML=`<div class="legal-note">ONE esegue azioni sul tuo dispositivo e chiede conferma prima di aprire app esterne.</div><div class="section-mini">PROMEMORIA</div><div id="actionReminders" class="action-list"><div class="empty-state">Caricamento…</div></div><div class="section-mini">ULTIME AZIONI</div><div id="actionHistory" class="action-list"><div class="empty-state">Caricamento…</div></div>`;setTimeout(loadActionCenter,0)},
    about:()=>{title.textContent="ONE";sub.textContent="Versione 0.8 Beta";body.innerHTML=`<div style="text-align:center;padding:20px"><div class="recall-orb"><span></span></div><h3>Show it. Say it. Done.</h3><p>ONE 0.8 unisce lo spazio personale ai cantieri, mantenendo un solo assistente e una sola esperienza.</p></div>`},
    activity:()=>{title.textContent=data.title||"Attività";sub.textContent=data.time||"";body.innerHTML=`<div class="activity-card"><span class="a-icon">${data.icon||"✦"}</span><span class="a-copy"><strong>${escapeHtml(data.title||"")}</strong><small>${escapeHtml(data.detail||"")}</small></span></div><p>${data.cloud?"Sincronizzata sul cloud ONE.":"Memorizzata sul dispositivo."}</p>`}
  };(t[type]||t.about)();$("sheet").classList.add("open");$("sheet").setAttribute("aria-hidden","false");$("scrim").classList.remove("hidden")
}
function closeSheet(){$("sheet").classList.remove("open");$("sheet").setAttribute("aria-hidden","true");if(!$("drawer").classList.contains("open"))$("scrim").classList.add("hidden")}
$("sheetClose").onclick=closeSheet;$$("[data-open]").forEach(b=>b.onclick=()=>openSheet(b.dataset.open));$("actionBtn").onclick=()=>openSheet("actions");
function bindSettings(){const ht=$("hapticToggle"),hs=$("historyToggle"),cl=$("clearHistory");if(ht)ht.onclick=()=>{ht.classList.toggle("on");localStorage.one_haptics=ht.classList.contains("on")?"on":"off";haptic()};if(hs)hs.onclick=()=>{hs.classList.toggle("on");localStorage.one_history=hs.classList.contains("on")?"on":"off";toast("Preferenza salvata")};if(cl)cl.onclick=()=>{if(confirm("Vuoi cancellare tutta la memoria locale di ONE?")){localStorage.removeItem("one_activities");renderActivities();closeSheet();toast("Memoria locale cancellata")}}}
function haptic(){if(localStorage.one_haptics!=="off"&&navigator.vibrate)navigator.vibrate(10)}document.addEventListener("click",e=>{if(e.target.closest("button"))haptic()});
$("searchInput").addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase(),a=getLocalActivities().filter(x=>(x.title+" "+x.detail).toLowerCase().includes(q));$("searchResults").innerHTML=q?(a.length?a.map(x=>`<button class="activity-card" data-activity="${x.id}"><span class="a-icon">${x.icon}</span><span class="a-copy"><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.detail)}</small></span><time>${escapeHtml(x.time)}</time></button>`).join(""):`<div class="empty-state">Nessun risultato per “${escapeHtml(q)}”.</div>`):`<div class="empty-state">Inizia a scrivere per cercare.</div>`;bindActivityClicks()});

function initLegal(){const accepted=localStorage.getItem("one_legal_version")===LEGAL_VERSION;$("legalGate").classList.toggle("hidden",accepted);$("legalCheck").onchange=e=>$("acceptLegal").disabled=!e.target.checked;$("acceptLegal").onclick=()=>{localStorage.setItem("one_legal_version",LEGAL_VERSION);$("legalGate").classList.add("hidden");toast("Benvenuto in ONE")};$("gateTerms").onclick=()=>openSheet("terms");$("gatePrivacy").onclick=()=>openSheet("privacy")}

function updateAccountUI(){
  const logged=!!session, email=session?.user?.email||"";
  $("profileName").textContent=logged?(email.split("@")[0]||"Utente ONE"):"Andrea";
  $("profileStatus").textContent=logged?`Cloud attivo · ${email}`:"Modalità locale · Beta";
  $("accountTitle").textContent=logged?"Cloud ONE attivo":"Sincronizza ONE";
  $("accountSubtitle").textContent=logged?"Recall e attività sono collegati al tuo account.":"Accedi per avere Recall e attività sul cloud.";
  $("accountBtn").textContent=logged?"Gestisci":"Accedi";
  $("recallCloudState").textContent=logged?"● Cloud attivo":"○ Solo dispositivo";$("recallCloudState").classList.toggle("online",logged);
  if(logged)syncFromCloud();if($("spacesView")?.classList.contains("active-view"))loadWorkspaces()
}
function openAuth(mode="login"){authMode=mode;$("authModal").classList.remove("hidden");$("authMessage").classList.add("hidden");updateAuthMode();setTimeout(()=>$("authEmail").focus(),200)}
function closeAuth(){$("authModal").classList.add("hidden")}
function updateAuthMode(){const signup=authMode==="signup";$("authTitle").textContent=signup?"Crea account ONE":"Accedi a ONE";$("authLead").textContent=signup?"Attiva Recall e cronologia cloud.":"Sincronizza Recall e attività in modo privato.";$("authSubmit").textContent=signup?"Crea account":"Accedi";$("authModeBtn").textContent=signup?"Hai già un account? Accedi":"Non hai un account? Crealo"}
function authMessage(msg,error=false){const e=$("authMessage");e.textContent=msg;e.classList.toggle("error",error);e.classList.remove("hidden")}
async function authFetch(path,body){
  const r=await fetch(`${SUPABASE_URL}/auth/v1/${path}`,{method:"POST",headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.msg||d?.message||d?.error_description||`Errore ${r.status}`);return d
}
$("authForm").onsubmit=async e=>{e.preventDefault();const email=$("authEmail").value.trim(),password=$("authPassword").value;authMessage("Connessione…");$("authSubmit").disabled=true;try{
  if(authMode==="signup"){const d=await authFetch("signup",{email,password});if(d.access_token){d.expires_at=Math.floor(Date.now()/1000)+(d.expires_in||3600);saveSession(d);closeAuth();toast("Account ONE creato")}else{authMessage("Account creato. Controlla l'email per confermare l'indirizzo, poi accedi.")}}
  else{const d=await authFetch("token?grant_type=password",{email,password});d.expires_at=Math.floor(Date.now()/1000)+(d.expires_in||3600);saveSession(d);closeAuth();toast("Accesso effettuato");await syncFromCloud()}
}catch(err){authMessage(err.message||"Accesso non riuscito",true)}finally{$("authSubmit").disabled=false}};
$("authModeBtn").onclick=()=>{authMode=authMode==="login"?"signup":"login";updateAuthMode();$("authMessage").classList.add("hidden")};$("authClose").onclick=closeAuth;$("accountBtn").onclick=()=>session?openSheet("account"):openAuth();
$("authResetBtn").onclick=async()=>{const email=$("authEmail").value.trim();if(!email){authMessage("Inserisci prima l'email del tuo account.",true);return}authMessage("Invio del link di recupero…");try{await authFetch("recover",{email});authMessage("Controlla la tua email: ti abbiamo inviato il link per impostare una nuova password.")}catch(err){authMessage(err.message||"Invio non riuscito",true)}};
function logout(){saveSession(null);sitesCache=[];selectedSiteId=null;closeSheet();renderActivities();navigate("home");toast("Sei uscito da ONE")}


function actionIcon(k){return({reminder:"◷",calendar:"▣",email:"✉",call:"☎",maps:"⌖",share:"↗",copy:"⧉",download:"⇩",search:"⌕",open_url:"↗",sms:"◌",whatsapp:"◉",save:"⌁"})[k]||"⚡"}
function normalizeAction(a={}){return{kind:(a.kind||a.type||"other").toLowerCase(),label:a.label||a.kind||"Azione",payload:a.payload||{},id:a.id||null}}
function actionDescription(a){const p=a.payload||{};return({reminder:p.title||p.text||"Crea promemoria ONE",calendar:p.title||p.event||"Aggiungi evento al calendario",email:p.to?`Email a ${p.to}`:"Prepara email",call:p.phone?`Chiama ${p.phone}`:"Avvia chiamata",maps:p.address||p.query||"Apri Mappe",share:"Apri Condividi di iOS",copy:"Copia negli appunti",search:p.query||"Cerca sul web",open_url:p.url||"Apri collegamento",sms:p.phone?`Messaggio a ${p.phone}`:"Apri Messaggi",whatsapp:p.phone?`WhatsApp a ${p.phone}`:"Apri WhatsApp"})[a.kind]||a.label}
function confirmAndExecuteAction(action,context={}){const a=normalizeAction(action);if(["email","call","maps","calendar","open_url","sms","whatsapp","search"].includes(a.kind)&&!confirm(`${a.label}\n\n${actionDescription(a)}\n\nVuoi continuare?`)){logAction(a,"cancelled");return}executeAction(a,context)}
async function logAction(a,status="executed"){if(!session)return;try{await cloudRequest("one_actions",{method:"POST",body:{user_id:userId(),site_id:selectedSiteId||null,kind:a.kind,label:a.label,status,payload:a.payload||{},executed_at:status==="executed"?new Date().toISOString():null}})}catch{}}
function icsEsc(x=""){return String(x).replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;")}
function icsDate(v){const d=v?new Date(v):new Date();return (Number.isNaN(d.getTime())?new Date():d).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z/,"Z")}
function createCalendarFile(p={}){const start=p.start||p.start_at||p.date||new Date(Date.now()+3600000).toISOString(),sd=new Date(start),end=p.end||p.end_at||new Date(sd.getTime()+3600000).toISOString(),ics=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ONE//Action Engine//IT\r\nBEGIN:VEVENT\r\nUID:one-${Date.now()}@one\r\nDTSTAMP:${icsDate(new Date())}\r\nDTSTART:${icsDate(start)}\r\nDTEND:${icsDate(end)}\r\nSUMMARY:${icsEsc(p.title||p.event||"Evento ONE")}\r\nDESCRIPTION:${icsEsc(p.notes||p.description||"Creato con ONE")}\r\nLOCATION:${icsEsc(p.location||p.address||"")}\r\nEND:VEVENT\r\nEND:VCALENDAR`,blob=new Blob([ics],{type:"text/calendar;charset=utf-8"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=p.filename||"evento-one.ics";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)}
async function createReminder(p={}){const title=p.title||p.text||"Promemoria ONE",note=p.note||p.notes||"",due=p.due_at||p.date||p.datetime||null,l=JSON.parse(localStorage.getItem("one_reminders")||"[]"),item={id:`local-${Date.now()}`,title,note,due_at:due,completed:false,created_at:new Date().toISOString()};l.unshift(item);localStorage.setItem("one_reminders",JSON.stringify(l.slice(0,50)));if(session)try{const r=await cloudRequest("one_reminders",{method:"POST",body:{user_id:userId(),site_id:selectedSiteId||null,title,note,due_at:due||null,completed:false,source:p}});if(r?.[0]){l[0]={...item,id:r[0].id};localStorage.setItem("one_reminders",JSON.stringify(l.slice(0,50)))}}catch{}toast("Promemoria creato in ONE");addActivity(title,due?`Promemoria · ${new Date(due).toLocaleString("it-IT")}`:"Promemoria ONE","◷","reminder")}
async function executeAction(action,context={}){const a=normalizeAction(action),p=a.payload||{};try{switch(a.kind){
case"reminder":await createReminder(p);break;
case"calendar":createCalendarFile(p);toast("Evento pronto per Calendario");break;
case"email":location.href=`mailto:${encodeURIComponent(p.to||p.email||"")}?subject=${encodeURIComponent(p.subject||context?.summary||"")}&body=${encodeURIComponent(p.body||p.text||context?.summary||"")}`;break;
case"call":location.href=`tel:${String(p.phone||p.number||"").replace(/[^\d+]/g,"")}`;break;
case"sms":{const ph=String(p.phone||"").replace(/[^\d+]/g,""),tx=p.text||p.body||context?.summary||"";location.href=`sms:${ph}${tx?`&body=${encodeURIComponent(tx)}`:""}`;break}
case"whatsapp":window.open(`https://wa.me/${String(p.phone||"").replace(/[^\d]/g,"")}?text=${encodeURIComponent(p.text||p.body||context?.summary||"")}`,"_blank","noopener");break;
case"maps":window.open(`https://maps.apple.com/?q=${encodeURIComponent(p.address||p.query||p.location||context?.summary||"")}`,"_blank","noopener");break;
case"search":window.open(`https://www.google.com/search?q=${encodeURIComponent(p.query||p.text||context?.summary||"")}`,"_blank","noopener");break;
case"open_url":if(!(p.url||p.href))throw Error("URL mancante");window.open(p.url||p.href,"_blank","noopener");break;
case"copy":await navigator.clipboard.writeText(p.text||p.content||context?.summary||"");toast("Copiato negli appunti");break;
case"share":{const d={title:p.title||"ONE",text:p.text||context?.summary||"",url:p.url||undefined};if(navigator.share)await navigator.share(d);else{await navigator.clipboard.writeText([d.text,d.url].filter(Boolean).join("\n"));toast("Contenuto copiato")};break}
case"download":{const b=new Blob([p.content||p.text||context?.summary||""],{type:p.mime||"text/plain;charset=utf-8"}),u=URL.createObjectURL(b),ln=document.createElement("a");ln.href=u;ln.download=p.filename||"one.txt";document.body.appendChild(ln);ln.click();ln.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);break}
case"save":await saveMemory(context,"action","");break;
default:toast("Questa azione richiede ancora un'integrazione dedicata");await logAction(a,"unsupported");return}
await logAction(a,"executed");addActivity(a.label,actionDescription(a),actionIcon(a.kind),"action",p)}catch(e){toast("Azione non completata");await logAction(a,"failed")}}
async function getReminders(){if(session)try{const r=await cloudRequest("one_reminders?select=*&order=created_at.desc&limit=20");localStorage.setItem("one_reminders",JSON.stringify(r));return r}catch{}try{return JSON.parse(localStorage.getItem("one_reminders")||"[]")}catch{return[]}}
async function toggleReminder(id,completed){let l=await getReminders(),x=l.find(v=>v.id===id);if(!x)return;x.completed=completed;localStorage.setItem("one_reminders",JSON.stringify(l));if(session&&!String(id).startsWith("local-"))try{await cloudRequest(`one_reminders?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",body:{completed,updated_at:new Date().toISOString()}})}catch{}await loadActionCenter()}
async function loadActionCenter(){const re=$("actionReminders"),hi=$("actionHistory");if(!re||!hi)return;const r=await getReminders();re.innerHTML=r.length?r.slice(0,10).map(x=>`<div class="reminder-item ${x.completed?"done":""}"><button class="reminder-check" data-reminder="${x.id}" data-completed="${x.completed?"1":"0"}">${x.completed?"✓":""}</button><div class="reminder-copy"><strong>${escapeHtml(x.title)}</strong><small>${x.due_at?escapeHtml(new Date(x.due_at).toLocaleString("it-IT")):"Senza scadenza"}${x.note?" · "+escapeHtml(x.note):""}</small></div></div>`).join(""):`<div class="empty-state">Nessun promemoria ONE.</div>`;$$("[data-reminder]").forEach(b=>b.onclick=()=>toggleReminder(b.dataset.reminder,b.dataset.completed!=="1"));if(session)try{const rows=await cloudRequest("one_actions?select=*&order=created_at.desc&limit=15");hi.innerHTML=rows.length?rows.map(x=>`<div class="action-item"><div class="ai">${actionIcon(x.kind)}</div><div class="ac"><strong>${escapeHtml(x.label)}</strong><small>${escapeHtml(x.kind)}</small></div><span class="status">${escapeHtml(x.status)}</span></div>`).join(""):`<div class="empty-state">Nessuna azione eseguita.</div>`}catch{hi.innerHTML=`<div class="empty-state">Storico cloud non disponibile.</div>`}else hi.innerHTML=`<div class="empty-state">Accedi a ONE per sincronizzare lo storico delle azioni.</div>`}

if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js?v=8").catch(()=>{}))}
renderActivities();$("searchResults").innerHTML=`<div class="empty-state">Inizia a scrivere per cercare.</div>`;setState("idle");initLegal();updateSend();updateAccountUI();
