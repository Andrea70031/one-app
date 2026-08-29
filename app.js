const $ = id => document.getElementById(id);
const $$ = s => [...document.querySelectorAll(s)];

const SUPABASE_URL = "https://wthhtqudqcjlnhihfhba.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0aGh0cXVkcWNqbG5oaWhmaGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTUzNTUsImV4cCI6MjEwMzU5MTM1NX0.vIYa0RA6c_GemjI7SuK_BeRteCPzGG2oiug5Y-qDmq0";
const ONE_AI_ENDPOINT = `${SUPABASE_URL}/functions/v1/one-ai`;
const LEGAL_VERSION = "1.0-2026-08-29";

const TERMS_HTML = `<h3>1. Ambito e accettazione</h3>
<p>I presenti Termini disciplinano l'uso di ONE, attualmente disponibile in versione Beta. Utilizzando ONE accetti questi Termini. Se non li accetti, non utilizzare il servizio.</p>
<h3>2. Natura del servizio</h3>
<p>ONE è un assistente software basato anche su sistemi di intelligenza artificiale. Può analizzare testo, immagini, documenti e altri contenuti e suggerire azioni. Le funzionalità possono cambiare, essere sospese o non essere sempre disponibili.</p>
<h3>3. Versione Beta e accuratezza</h3>
<p>ONE è in fase di sviluppo. I risultati prodotti dall'intelligenza artificiale possono contenere errori, omissioni o informazioni non aggiornate. Devi verificare autonomamente le informazioni prima di usarle per decisioni importanti.</p>
<h3>4. Nessuna consulenza professionale</h3>
<p>ONE non sostituisce professionisti qualificati. Non fare affidamento esclusivo sul servizio per decisioni mediche, legali, fiscali, finanziarie, di sicurezza o altre decisioni ad alto impatto.</p>
<h3>5. Contenuti dell'utente</h3>
<p>Resti responsabile dei contenuti che fornisci a ONE e dichiari di avere i diritti necessari per utilizzarli. Non devi caricare contenuti illeciti, dannosi, lesivi di diritti altrui o dati che non sei autorizzato a trattare.</p>
<h3>6. Elaborazione tramite fornitori terzi</h3>
<p>Per fornire alcune funzionalità, ONE può trasmettere i contenuti ai servizi tecnici necessari, inclusi fornitori di infrastruttura cloud e di intelligenza artificiale. Le modalità effettive di trattamento sono descritte nell'informativa privacy applicabile.</p>
<h3>7. Azioni e conferme</h3>
<p>Quando ONE propone un'azione, sei responsabile di verificarla prima dell'esecuzione. Le operazioni irreversibili o che producono effetti verso terzi dovrebbero richiedere una conferma esplicita dell'utente.</p>
<h3>8. Uso consentito</h3>
<p>Non puoi utilizzare ONE per attività illecite, frodi, violazioni della sicurezza, diffusione di malware, elusione di protezioni, violazioni di diritti di terzi o altri usi abusivi.</p>
<h3>9. Disponibilità</h3>
<p>Il servizio è fornito nello stato in cui si trova. Non è garantita la disponibilità continua, l'assenza di errori o la compatibilità con ogni dispositivo o servizio esterno.</p>
<h3>10. Limitazione di responsabilità</h3>
<p>Nella misura consentita dalla legge applicabile, l'uso di ONE avviene sotto la responsabilità dell'utente. Nulla nei presenti Termini limita responsabilità che non possono essere escluse per legge.</p>
<h3>11. Sospensione e cessazione</h3>
<p>L'accesso può essere limitato o sospeso in caso di uso abusivo, esigenze di sicurezza, manutenzione o cessazione del servizio.</p>
<h3>12. Modifiche</h3>
<p>I Termini possono essere aggiornati con l'evoluzione del prodotto. In caso di modifiche rilevanti verrà richiesta una nuova accettazione quando appropriato.</p>
<h3>13. Legge applicabile</h3>
<p>La legge applicabile e il foro competente dovranno essere definiti nella versione commerciale definitiva in base al soggetto che offrirà ONE e ai mercati in cui il servizio sarà distribuito.</p>
`;
const PRIVACY_HTML = `<div class="legal-note"><strong>Informativa preliminare.</strong> Prima della distribuzione pubblica dovrà essere completata con titolare del trattamento, contatti, basi giuridiche, tempi di conservazione e ogni informazione richiesta dalla normativa applicabile.</div>
<h3>1. Dati che ONE può trattare</h3>
<p>A seconda delle funzioni utilizzate, ONE può trattare testo digitato, immagini selezionate o fotografate, documenti, registrazioni audio, metadati tecnici e informazioni generate durante l'uso del servizio.</p>
<h3>2. Finalità</h3>
<p>I dati vengono utilizzati per fornire le funzionalità richieste, analizzare il contenuto, generare risposte e azioni suggerite, mantenere sicurezza e affidabilità e migliorare l'esperienza del prodotto quando previsto e consentito.</p>
<h3>3. Elaborazione AI e infrastruttura</h3>
<p>Quando utilizzi funzioni AI, il contenuto necessario può essere inviato dal frontend al backend ONE e quindi a fornitori tecnici esterni necessari all'elaborazione, inclusi servizi cloud e modelli di intelligenza artificiale.</p>
<h3>4. Memoria locale</h3>
<p>Questa versione Beta conserva sul dispositivo una cronologia limitata delle attività tramite memoria locale del browser. Puoi cancellarla dalle impostazioni di ONE o cancellando i dati del sito dal browser.</p>
<h3>5. Dati sensibili</h3>
<p>Evita di inviare informazioni altamente sensibili o dati di terzi se non è necessario e se non disponi di una base legittima per farlo.</p>
<h3>6. Conservazione</h3>
<p>I tempi di conservazione lato server e presso eventuali fornitori esterni dovranno essere definiti e documentati prima del rilascio commerciale. La cronologia locale resta sul dispositivo finché non viene cancellata.</p>
<h3>7. Diritti dell'interessato</h3>
<p>Nella versione commerciale verranno indicati modalità e contatti per esercitare i diritti previsti dalla normativa applicabile, incluso il GDPR quando pertinente.</p>
<h3>8. Sicurezza</h3>
<p>ONE utilizza un backend per evitare di esporre nel frontend le credenziali segrete dei servizi AI. Nessun sistema può tuttavia garantire sicurezza assoluta.</p>
`;

const orb=$("orb"),orbLabel=$("orbLabel"),orbSubtitle=$("orbSubtitle"),wave=$("wave"),particles=$("particles"),
promptInput=$("promptInput"),micButton=$("micButton"),demoResult=$("demoResult"),navOrb=$("navOrb");

let state="idle",timer=null,recorder=null,chunks=[],stream=null,toastTimer=null;
const defaultActivities=[
{id:"demo1",icon:"▤",title:"Fattura ACME.pdf",detail:"Salvata e promemoria creato",time:"10:34",type:"document"},
{id:"demo2",icon:"⌂",title:"Ristorante da Ibiza",detail:"Aggiunto ai preferiti",time:"Ieri",type:"place"},
{id:"demo3",icon:"✈",title:"Volo per Milano",detail:"Monitoraggio attivo",time:"Ieri",type:"travel"}
];

function getActivities(){try{return JSON.parse(localStorage.getItem("one_activities"))||defaultActivities}catch{return defaultActivities}}
function saveActivities(a){localStorage.setItem("one_activities",JSON.stringify(a.slice(0,30)))}
function addActivity(title,detail,icon="✦",type="ai"){
  const a=getActivities();a.unshift({id:Date.now().toString(),icon,title:title.slice(0,80),detail:detail.slice(0,120),time:"Ora",type});saveActivities(a);renderActivities();
}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.remove("hidden");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add("hidden"),2600)}
function setState(s){
  state=s;orb.className="orb "+s;wave.classList.toggle("hidden",s!=="listening");particles.classList.toggle("hidden",s!=="thinking");
  const m={idle:["ONE","Tocca per iniziare"],listening:["ONE","Ti ascolto…"],thinking:["ONE","Sto pensando…"],done:["✓","Fatto!"]};
  orbLabel.textContent=m[s][0];orbSubtitle.textContent=m[s][1];
}
function show(message,isError=false){
  demoResult.innerHTML="";const p=document.createElement("div");p.textContent=message;demoResult.appendChild(p);
  demoResult.classList.toggle("error",isError);demoResult.classList.remove("hidden");
}
function setAIStatus(ok,label){
  const el=$("aiStatus");el.classList.toggle("degraded",!ok);el.innerHTML=`<span></span> ${label}`;
}
function showAIResult(result){
  demoResult.innerHTML="";demoResult.classList.remove("error");
  const title=document.createElement("strong");title.textContent=result?.summary||"Analisi completata";demoResult.appendChild(title);
  if(result?.intent){const intent=document.createElement("div");intent.style.cssText="margin-top:8px;opacity:.75";intent.textContent="ONE ha capito: "+result.intent;demoResult.appendChild(intent)}
  if(Array.isArray(result?.actions)&&result.actions.length){
    const wrap=document.createElement("div");wrap.style.cssText="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px";
    result.actions.slice(0,4).forEach(action=>{const b=document.createElement("button");b.textContent=action.label||"Azione";b.style.cssText="border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:white;border-radius:999px;padding:9px 12px;font-size:12px";b.onclick=()=>openSheet("actions",{selected:action.label});wrap.appendChild(b)});demoResult.appendChild(wrap)
  }
  demoResult.classList.remove("hidden");
  addActivity(result?.summary||"Richiesta AI",result?.intent||"Elaborata da ONE","✦","ai");
}
async function askONE(payload){
  setState("thinking");show("ONE sta analizzando…");
  try{
    const r=await fetch(ONE_AI_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify(payload)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data?.detail||data?.error||`Errore ${r.status}`);
    setAIStatus(true,"ONE AI attiva");setState("done");showAIResult(data.result||data);clearTimeout(timer);timer=setTimeout(()=>setState("idle"),1600)
  }catch(err){
    setState("idle");const msg=(err?.message||"").toLowerCase();
    if(msg.includes("credits")||msg.includes("billing")||msg.includes("quota")){
      setAIStatus(false,"AI in pausa");
      show("ONE è operativo, ma il motore AI è temporaneamente in pausa per il credito API. Fotocamera, documenti, Recall, attività e menu continuano a funzionare.",true)
    }else{
      setAIStatus(false,"AI non disponibile");show("Non riesco a contattare il motore AI in questo momento. Le funzioni locali di ONE restano disponibili.",true)
    }
  }
}
for(let i=0;i<22;i++){const p=document.createElement("span");p.className="particle";p.style.left=(10+((i*17)%80))+"%";p.style.top=(10+((i*29)%80))+"%";p.style.opacity=(.25+(i%4)*.15);p.style.animationDelay=((i%6)*120)+"ms";particles.appendChild(p)}

function renderActivities(){
  const a=getActivities();
  const html=a=>`<button class="activity-card" data-activity="${a.id}"><span class="a-icon">${a.icon}</span><span class="a-copy"><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml(a.detail)}</small></span><time>${escapeHtml(a.time)}</time></button>`;
  $("recentCard").innerHTML=a.slice(0,3).map(x=>`<button class="recent-row" data-activity="${x.id}"><div class="recent-icon">${x.icon}</div><div class="recent-copy"><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.detail)}</span></div><time>${escapeHtml(x.time)}</time></button>`).join("");
  $("allActivities").innerHTML=a.length?a.map(html).join(""):`<div class="empty-state">Nessuna attività.</div>`;
  $("recallList").innerHTML=a.length?a.map(html).join(""):`<div class="empty-state">Recall è ancora vuoto.</div>`;
  bindActivityClicks();
}
function bindActivityClicks(){$$("[data-activity]").forEach(b=>b.onclick=()=>{const a=getActivities().find(x=>x.id===b.dataset.activity);if(a)openSheet("activity",a)})}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function showFile(f,label){
  const c=$("captureCard"),img=$("captureImage"),ico=$("captureIcon");c.classList.remove("hidden");$("captureTitle").textContent=label;$("captureMeta").textContent=`${f.name} · ${Math.max(1,Math.round(f.size/1024))} KB`;
  if(f.type.startsWith("image/")){img.src=URL.createObjectURL(f);img.classList.remove("hidden");ico.classList.add("hidden")}else{img.classList.add("hidden");ico.classList.remove("hidden")}
  addActivity(label,f.name,f.type.startsWith("image/")?"▧":"▤","capture")
}
function imageFileToDataURL(file,maxSide=1600,quality=.82){return new Promise((resolve,reject)=>{const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{let{width,height}=im;const sc=Math.min(1,maxSide/Math.max(width,height));width=Math.round(width*sc);height=Math.round(height*sc);const cv=document.createElement("canvas");cv.width=width;cv.height=height;cv.getContext("2d").drawImage(im,0,0,width,height);resolve(cv.toDataURL("image/jpeg",quality))};im.onerror=reject;im.src=rd.result};rd.onerror=reject;rd.readAsDataURL(file)})}
async function analyzeImageFile(file,label){showFile(file,label);try{await askONE({text:"Analizza ciò che ti sto mostrando e proponimi le azioni più utili.",image:await imageFileToDataURL(file)})}catch{show("Immagine acquisita. L'analisi AI non è disponibile.",true)}}

$("cameraBtn").onclick=()=>$("cameraInput").click();$("photoBtn").onclick=()=>$("photoInput").click();$("documentBtn").onclick=()=>$("documentInput").click();
$("cameraInput").onchange=e=>{const f=e.target.files?.[0];if(f)analyzeImageFile(f,"Foto dalla fotocamera")};
$("photoInput").onchange=e=>{const f=e.target.files?.[0];if(f)analyzeImageFile(f,"Foto selezionata")};
$("documentInput").onchange=e=>{const f=e.target.files?.[0];if(!f)return;showFile(f,"Documento");if(f.type.startsWith("image/"))analyzeImageFile(f,"Documento fotografato");else show("Documento acquisito. L'analisi nativa di PDF e Office arriverà nella prossima versione.")};
$("clearCapture").onclick=()=>{$("captureCard").classList.add("hidden");$("captureImage").src="";demoResult.classList.add("hidden")};

async function toggleMic(){
  try{
    if(recorder&&recorder.state==="recording"){recorder.stop();return}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){show("Registrazione vocale non disponibile in questo browser.",true);return}
    stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});stream.getTracks().forEach(t=>t.stop());setState("idle");show(`Audio acquisito (${Math.max(1,Math.round(blob.size/1024))} KB). La trascrizione AI sarà collegata nella prossima versione.`);addActivity("Nota vocale","Audio acquisito","◉","audio")};
    recorder.start();setState("listening");show("Registrazione in corso… Tocca di nuovo il microfono per fermare.")
  }catch{setState("idle");show("Non riesco ad accedere al microfono. Controlla il permesso del sito in Safari.",true)}
}
micButton.onclick=toggleMic;navOrb.onclick=toggleMic;$("orbButton").onclick=()=>state==="listening"?toggleMic():toggleMic();

$("askForm").onsubmit=async e=>{e.preventDefault();const v=promptInput.value.trim();if(!v)return;promptInput.value="";updateSend();addActivity(v,"Richiesta inviata a ONE","✦","prompt");await askONE({text:v})};
function updateSend(){const has=!!promptInput.value.trim();$("sendBtn").classList.toggle("hidden",!has);micButton.classList.toggle("hidden",has)}
promptInput.addEventListener("input",updateSend);

function navigate(name){
  const map={home:"homeView",activities:"activitiesView",recall:"recallView",search:"searchView",profile:"profileView"};
  $$(".view").forEach(v=>v.classList.remove("active-view"));$(map[name]||map.home).classList.add("active-view");
  $$(".bottom-nav>button:not(.nav-orb)").forEach(b=>b.classList.remove("active"));
  const nav={home:"navHome",activities:"navActivity",search:"navSearch",profile:"navProfile"};if(nav[name])$(nav[name]).classList.add("active");
  closeDrawer();window.scrollTo({top:0,behavior:"smooth"});
  if(name==="search")setTimeout(()=>$("searchInput").focus(),250)
}
$("navHome").onclick=()=>navigate("home");$("navActivity").onclick=()=>navigate("activities");$("navSearch").onclick=()=>navigate("search");$("navProfile").onclick=()=>navigate("profile");
$$("[data-home]").forEach(b=>b.onclick=()=>navigate("home"));
$("seeAll").onclick=()=>navigate("activities");$("memoryCard").onclick=()=>navigate("recall");
$("profileBtn").onclick=()=>navigate("profile");

function openDrawer(){$("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false");$("scrim").classList.remove("hidden")}
function closeDrawer(){$("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true");if(!$("sheet").classList.contains("open"))$("scrim").classList.add("hidden")}
$("menuBtn").onclick=openDrawer;$("drawerClose").onclick=closeDrawer;$("scrim").onclick=()=>{closeDrawer();closeSheet()};
$$("[data-nav]").forEach(b=>b.onclick=()=>navigate(b.dataset.nav));

function openSheet(type,data={}){
  closeDrawer();const title=$("sheetTitle"),sub=$("sheetSubtitle"),body=$("sheetBody");
  const templates={
    terms:()=>{title.textContent="Termini di utilizzo";sub.textContent="Versione 1.0 · 29 agosto 2026";body.innerHTML=TERMS_HTML},
    privacy:()=>{title.textContent="Privacy";sub.textContent="Informativa preliminare Beta";body.innerHTML=PRIVACY_HTML},
    settings:()=>{title.textContent="Impostazioni";sub.textContent="Personalizza ONE";body.innerHTML=`
      <div class="sheet-row"><div><strong>Feedback aptico</strong><small>Vibrazione leggera sui comandi supportati</small></div><button class="toggle ${localStorage.one_haptics!=="off"?"on":""}" id="hapticToggle"><span></span></button></div>
      <div class="sheet-row"><div><strong>Salva cronologia locale</strong><small>Memorizza le attività sul dispositivo</small></div><button class="toggle ${localStorage.one_history!=="off"?"on":""}" id="historyToggle"><span></span></button></div>
      <div class="sheet-row"><div><strong>Cancella memoria locale</strong><small>Rimuove tutte le attività salvate sul dispositivo</small></div><button id="clearHistory" style="color:#ff8897">Cancella</button></div>`;setTimeout(bindSettings,0)},
    integrations:()=>{title.textContent="Integrazioni";sub.textContent="In arrivo";body.innerHTML=`<div class="legal-note">Questa sezione prepara ONE Actions.</div>${["Calendario","Promemoria","Email","Mappe","File","Casa smart"].map(x=>`<div class="sheet-row"><div><strong>${x}</strong><small>Connessione non ancora attiva</small></div><span style="color:#687285;font-size:11px">PRESTO</span></div>`).join("")}`},
    actions:()=>{title.textContent="Centro azioni";sub.textContent="Da capire a fare";body.innerHTML=`<p>ONE Actions raccoglierà qui le operazioni che possono essere eseguite sul contenuto acquisito.</p><div class="settings-group"><button><span>◷</span><div><strong>Crea promemoria</strong><small>Da testo, foto o documento</small></div><b>›</b></button><button><span>▣</span><div><strong>Aggiungi al calendario</strong><small>Eventi, prenotazioni e scadenze</small></div><b>›</b></button><button><span>⌁</span><div><strong>Salva in Recall</strong><small>Ricorda per ritrovarlo dopo</small></div><b>›</b></button></div>`},
    about:()=>{title.textContent="ONE";sub.textContent="Versione 0.5 Beta";body.innerHTML=`<div style="text-align:center;padding:20px"><div class="recall-orb"><span></span></div><h3>Show it. Say it. Done.</h3><p>ONE è un prototipo di assistente universale orientato alle azioni. Build 0.5 · 29/08/2026.</p></div>`},
    activity:()=>{title.textContent=data.title||"Attività";sub.textContent=data.time||"";body.innerHTML=`<div class="activity-card"><span class="a-icon">${data.icon||"✦"}</span><span class="a-copy"><strong>${escapeHtml(data.title||"")}</strong><small>${escapeHtml(data.detail||"")}</small></span></div><p>Questa attività è memorizzata localmente sul dispositivo.</p>`}
  };
  (templates[type]||templates.about)();$("sheet").classList.add("open");$("sheet").setAttribute("aria-hidden","false");$("scrim").classList.remove("hidden")
}
function closeSheet(){$("sheet").classList.remove("open");$("sheet").setAttribute("aria-hidden","true");if(!$("drawer").classList.contains("open"))$("scrim").classList.add("hidden")}
$("sheetClose").onclick=closeSheet;
$$("[data-open]").forEach(b=>b.onclick=()=>openSheet(b.dataset.open));
$("actionBtn").onclick=()=>openSheet("actions");
function bindSettings(){
  const ht=$("hapticToggle"),hs=$("historyToggle"),clear=$("clearHistory");
  if(ht)ht.onclick=()=>{ht.classList.toggle("on");localStorage.one_haptics=ht.classList.contains("on")?"on":"off";haptic()};
  if(hs)hs.onclick=()=>{hs.classList.toggle("on");localStorage.one_history=hs.classList.contains("on")?"on":"off";toast("Preferenza salvata")};
  if(clear)clear.onclick=()=>{if(confirm("Vuoi cancellare tutta la memoria locale di ONE?")){localStorage.removeItem("one_activities");renderActivities();closeSheet();toast("Memoria locale cancellata")}}
}
function haptic(){if(localStorage.one_haptics!=="off"&&navigator.vibrate)navigator.vibrate(10)}
document.addEventListener("click",e=>{if(e.target.closest("button"))haptic()});

$("searchInput").addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase(),a=getActivities().filter(x=>(x.title+" "+x.detail).toLowerCase().includes(q));$("searchResults").innerHTML=q?(a.length?a.map(x=>`<button class="activity-card" data-activity="${x.id}"><span class="a-icon">${x.icon}</span><span class="a-copy"><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.detail)}</small></span><time>${escapeHtml(x.time)}</time></button>`).join(""):`<div class="empty-state">Nessun risultato per “${escapeHtml(q)}”.</div>`):`<div class="empty-state">Inizia a scrivere per cercare nella memoria locale.</div>`;bindActivityClicks()});

function initLegal(){
  const accepted=localStorage.getItem("one_legal_version")===LEGAL_VERSION;
  $("legalGate").classList.toggle("hidden",accepted);
  $("legalCheck").onchange=e=>$("acceptLegal").disabled=!e.target.checked;
  $("acceptLegal").onclick=()=>{localStorage.setItem("one_legal_version",LEGAL_VERSION);$("legalGate").classList.add("hidden");toast("Benvenuto in ONE")};
  $("gateTerms").onclick=()=>openSheet("terms");$("gatePrivacy").onclick=()=>openSheet("privacy")
}
if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js?v=5").catch(()=>{}))}
renderActivities();$("searchResults").innerHTML=`<div class="empty-state">Inizia a scrivere per cercare nella memoria locale.</div>`;setState("idle");initLegal();updateSend();
