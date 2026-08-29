const $=id=>document.getElementById(id), $$=s=>[...document.querySelectorAll(s)];
const SUPABASE_URL="https://wthhtqudqcjlnhihfhba.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0aGh0cXVkcWNqbG5oaWhmaGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTUzNTUsImV4cCI6MjEwMzU5MTM1NX0.vIYa0RA6c_GemjI7SuK_BeRteCPzGG2oiug5Y-qDmq0";
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
let state="idle",timer=null,recorder=null,chunks=[],stream=null,toastTimer=null,authMode="login",session=loadSession();

const defaultActivities=[
{id:"demo1",icon:"▤",title:"Fattura ACME.pdf",detail:"Esempio attività ONE",time:"Demo",type:"document",demo:true},
{id:"demo2",icon:"⌂",title:"Ristorante salvato",detail:"Esempio Recall",time:"Demo",type:"place",demo:true},
{id:"demo3",icon:"✈",title:"Viaggio",detail:"Esempio monitoraggio",time:"Demo",type:"travel",demo:true}
];

function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.remove("hidden");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add("hidden"),2600)}
function setState(s){state=s;orb.className="orb "+s;wave.classList.toggle("hidden",s!=="listening");particles.classList.toggle("hidden",s!=="thinking");const m={idle:["ONE","Tocca per iniziare"],listening:["ONE","Ti ascolto…"],thinking:["ONE","Sto pensando…"],done:["✓","Fatto!"]};orbLabel.textContent=m[s][0];orbSubtitle.textContent=m[s][1]}
function setAIStatus(ok,label){const e=$("aiStatus");e.classList.toggle("degraded",!ok);e.innerHTML=`<span></span> ${label}`}
function show(message,isError=false){demoResult.innerHTML="";const p=document.createElement("div");p.textContent=message;demoResult.appendChild(p);demoResult.classList.toggle("error",isError);demoResult.classList.remove("hidden")}
function authToken(){return session?.access_token||SUPABASE_ANON_KEY}
function loadSession(){try{const s=JSON.parse(localStorage.getItem("one_session")||"null");if(s?.expires_at&&Date.now()/1000>s.expires_at){localStorage.removeItem("one_session");return null}return s}catch{return null}}
function saveSession(s){session=s;if(s)localStorage.setItem("one_session",JSON.stringify(s));else localStorage.removeItem("one_session");updateAccountUI()}
function userId(){return session?.user?.id||null}
function getLocalActivities(){try{return JSON.parse(localStorage.getItem("one_activities"))||defaultActivities}catch{return defaultActivities}}
function saveLocalActivities(a){if(localStorage.one_history!=="off")localStorage.setItem("one_activities",JSON.stringify(a.slice(0,40)))}
async function cloudRequest(path,{method="GET",body}={}){
  if(!session?.access_token)throw new Error("not_authenticated");
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{method,headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json","Prefer":"return=representation"},body:body?JSON.stringify(body):undefined});
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
    try{await cloudRequest("one_activities",{method:"POST",body:{user_id:userId(),type,title:title.slice(0,180),detail:detail.slice(0,500),icon,payload}})}catch{}
  }
}
async function saveMemory(result,sourceType="ai",sourceName=""){
  const title=result?.memory_title||result?.summary||"Nuova memoria",summary=result?.memory_summary||result?.intent||result?.summary||"";
  if(!session){toast("Salvato nella cronologia locale. Accedi per Recall cloud.");return}
  try{await cloudRequest("one_memories",{method:"POST",body:{user_id:userId(),kind:result?.type||"note",title:title.slice(0,180),summary:summary.slice(0,700),source_type:sourceType,source_name:sourceName,payload:result?.extracted||{}}});toast("Salvato in Recall cloud");await loadCloudMemories()}catch{toast("Non riesco a salvare in Recall cloud")}
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
  demoResult.innerHTML="";demoResult.classList.remove("error");
  const title=document.createElement("strong");title.textContent=result?.summary||"Analisi completata";demoResult.appendChild(title);
  if(result?.intent){const i=document.createElement("div");i.style.cssText="margin-top:8px;opacity:.75";i.textContent="ONE ha capito: "+result.intent;demoResult.appendChild(i)}
  const wrap=document.createElement("div");wrap.style.cssText="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px";
  const save=document.createElement("button");save.textContent=session?"Salva in Recall":"Ricorda";save.className="result-action";save.style.cssText="border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:white;border-radius:999px;padding:9px 12px;font-size:12px";save.onclick=()=>saveMemory(result,source.type,source.name);wrap.appendChild(save);
  (result?.actions||[]).slice(0,3).forEach(action=>{const b=document.createElement("button");b.textContent=action.label||"Azione";b.style.cssText=save.style.cssText;b.onclick=()=>openSheet("actions",{selected:action.label});wrap.appendChild(b)});
  demoResult.appendChild(wrap);demoResult.classList.remove("hidden");
  addActivity(result?.summary||"Richiesta AI",result?.intent||"Elaborata da ONE","✦","ai",result?.extracted||{})
}
async function askONE(payload,source={type:"ai",name:""}){
  setState("thinking");show("ONE sta analizzando…");
  try{
    const r=await fetch(ONE_AI_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${authToken()}`},body:JSON.stringify(payload)});
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
  setState("thinking");show("Sto trascrivendo la tua voce…");
  try{
    const r=await fetch(ONE_TRANSCRIBE_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${authToken()}`},body:JSON.stringify({audio:await blobToDataURL(blob)})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.detail||d?.error||"Trascrizione non riuscita");
    if(!d.text)throw new Error("Nessun testo riconosciuto");
    addActivity("Nota vocale",d.text,"◉","audio");show(`Hai detto: “${d.text}”`);await askONE({text:d.text},{type:"audio",name:"nota vocale"})
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

function navigate(name){const map={home:"homeView",activities:"activitiesView",recall:"recallView",search:"searchView",profile:"profileView"};$$(".view").forEach(v=>v.classList.remove("active-view"));$(map[name]||map.home).classList.add("active-view");$$(".bottom-nav>button:not(.nav-orb)").forEach(b=>b.classList.remove("active"));const nav={home:"navHome",activities:"navActivity",search:"navSearch",profile:"navProfile"};if(nav[name])$(nav[name]).classList.add("active");closeDrawer();window.scrollTo({top:0,behavior:"smooth"});if(name==="search")setTimeout(()=>$("searchInput").focus(),250);if(name==="recall"&&session)loadCloudMemories()}
$("navHome").onclick=()=>navigate("home");$("navActivity").onclick=()=>navigate("activities");$("navSearch").onclick=()=>navigate("search");$("navProfile").onclick=()=>navigate("profile");$$("[data-home]").forEach(b=>b.onclick=()=>navigate("home"));$("seeAll").onclick=()=>navigate("activities");$("memoryCard").onclick=()=>navigate("recall");$("profileBtn").onclick=()=>navigate("profile");
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
    integrations:()=>{title.textContent="Integrazioni";sub.textContent="ONE Actions";body.innerHTML=`<div class="legal-note">La 0.6 prepara le integrazioni. Calendario, Promemoria ed Email richiederanno autorizzazioni esplicite.</div>${["Calendario","Promemoria","Email","Mappe","File","Casa smart"].map(x=>`<div class="sheet-row"><div><strong>${x}</strong><small>Connessione non ancora attiva</small></div><span style="color:#687285;font-size:11px">PRESTO</span></div>`).join("")}`},
    actions:()=>{title.textContent="Centro azioni";sub.textContent="Da capire a fare";body.innerHTML=`<p>ONE ha già la struttura per proporre azioni. L'esecuzione verso app esterne verrà abilitata con conferma esplicita.</p><div class="settings-group"><button><span>◷</span><div><strong>Crea promemoria</strong><small>Da testo, foto o documento</small></div><b>›</b></button><button><span>▣</span><div><strong>Aggiungi al calendario</strong><small>Eventi, prenotazioni e scadenze</small></div><b>›</b></button><button><span>⌁</span><div><strong>Salva in Recall</strong><small>Disponibile con account</small></div><b>›</b></button></div>`},
    about:()=>{title.textContent="ONE";sub.textContent="Versione 0.6 Beta";body.innerHTML=`<div style="text-align:center;padding:20px"><div class="recall-orb"><span></span></div><h3>Show it. Say it. Done.</h3><p>ONE 0.6 introduce account, Recall cloud, documenti e trascrizione voce.</p></div>`},
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
  if(logged)syncFromCloud()
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
function logout(){saveSession(null);closeSheet();renderActivities();toast("Sei uscito da ONE")}

if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js?v=6").catch(()=>{}))}
renderActivities();$("searchResults").innerHTML=`<div class="empty-state">Inizia a scrivere per cercare.</div>`;setState("idle");initLegal();updateSend();updateAccountUI();
