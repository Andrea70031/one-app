const $ = id => document.getElementById(id);

const SUPABASE_URL = "https://wthhtqudqcjlnhihfhba.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0aGh0cXVkcWNqbG5oaWhmaGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTUzNTUsImV4cCI6MjEwMzU5MTM1NX0.vIYa0RA6c_GemjI7SuK_BeRteCPzGG2oiug5Y-qDmq0";
const ONE_AI_ENDPOINT = `${SUPABASE_URL}/functions/v1/one-ai`;

const orb = $("orb"),
      orbLabel = $("orbLabel"),
      orbSubtitle = $("orbSubtitle"),
      wave = $("wave"),
      particles = $("particles"),
      promptInput = $("promptInput"),
      micButton = $("micButton"),
      demoResult = $("demoResult"),
      navOrb = $("navOrb");

let state = "idle";
let timer = null;
let recorder = null;
let chunks = [];
let stream = null;

function setState(s) {
  state = s;
  orb.className = "orb " + s;
  wave.classList.toggle("hidden", s !== "listening");
  particles.classList.toggle("hidden", s !== "thinking");

  const map = {
    idle: ["ONE", "Tocca per iniziare"],
    listening: ["ONE", "Ti ascolto…"],
    thinking: ["ONE", "Sto pensando…"],
    done: ["✓", "Fatto!"]
  };

  orbLabel.textContent = map[s][0];
  orbSubtitle.textContent = map[s][1];
}

function show(message) {
  demoResult.innerHTML = "";
  const p = document.createElement("div");
  p.textContent = message;
  demoResult.appendChild(p);
  demoResult.classList.remove("hidden");
}

function showAIResult(result) {
  demoResult.innerHTML = "";

  const title = document.createElement("strong");
  title.textContent = result?.summary || "Analisi completata";
  demoResult.appendChild(title);

  if (result?.intent) {
    const intent = document.createElement("div");
    intent.style.marginTop = "8px";
    intent.style.opacity = ".75";
    intent.textContent = "ONE ha capito: " + result.intent;
    demoResult.appendChild(intent);
  }

  if (Array.isArray(result?.actions) && result.actions.length) {
    const actionsWrap = document.createElement("div");
    actionsWrap.style.display = "flex";
    actionsWrap.style.flexWrap = "wrap";
    actionsWrap.style.gap = "8px";
    actionsWrap.style.marginTop = "12px";

    result.actions.slice(0, 4).forEach(action => {
      const b = document.createElement("button");
      b.textContent = action.label || "Azione";
      b.style.border = "1px solid rgba(255,255,255,.15)";
      b.style.background = "rgba(255,255,255,.06)";
      b.style.color = "white";
      b.style.borderRadius = "999px";
      b.style.padding = "9px 12px";
      b.style.fontSize = "12px";
      b.onclick = () => show(`Azione selezionata: ${action.label}. L'esecuzione automatica sarà il prossimo step.`);
      actionsWrap.appendChild(b);
    });

    demoResult.appendChild(actionsWrap);
  }

  demoResult.classList.remove("hidden");
}

async function askONE(payload) {
  setState("thinking");
  show("ONE sta analizzando…");

  try {
    const response = await fetch(ONE_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.detail || data?.error || `Errore ${response.status}`);
    }

    setState("done");
    showAIResult(data.result || data);

    clearTimeout(timer);
    timer = setTimeout(() => setState("idle"), 1600);
  } catch (err) {
    setState("idle");
    show("Errore AI: " + (err?.message || "richiesta non riuscita"));
  }
}

for (let i = 0; i < 22; i++) {
  const p = document.createElement("span");
  p.className = "particle";
  p.style.left = (10 + ((i * 17) % 80)) + "%";
  p.style.top = (10 + ((i * 29) % 80)) + "%";
  p.style.opacity = (.25 + (i % 4) * .15);
  p.style.animationDelay = ((i % 6) * 120) + "ms";
  particles.appendChild(p);
}

function showFile(f, label) {
  const card = $("captureCard");
  const img = $("captureImage");
  const ico = $("captureIcon");

  card.classList.remove("hidden");
  $("captureTitle").textContent = label;
  $("captureMeta").textContent = `${f.name} · ${Math.max(1, Math.round(f.size / 1024))} KB`;

  if (f.type.startsWith("image/")) {
    img.src = URL.createObjectURL(f);
    img.classList.remove("hidden");
    ico.classList.add("hidden");
  } else {
    img.classList.add("hidden");
    ico.classList.remove("hidden");
  }
}

function imageFileToDataURL(file, maxSide = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        let { width, height } = image;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      image.onerror = reject;
      image.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function analyzeImageFile(file, label) {
  showFile(file, label);
  try {
    const dataUrl = await imageFileToDataURL(file);
    await askONE({
      text: "Analizza ciò che ti sto mostrando e proponimi le azioni più utili.",
      image: dataUrl
    });
  } catch (e) {
    show("Non riesco a preparare questa immagine per l'analisi.");
  }
}

$("cameraBtn").onclick = () => $("cameraInput").click();
$("photoBtn").onclick = () => $("photoInput").click();
$("documentBtn").onclick = () => $("documentInput").click();

$("cameraInput").onchange = e => {
  const file = e.target.files?.[0];
  if (file) analyzeImageFile(file, "Foto dalla fotocamera");
};

$("photoInput").onchange = e => {
  const file = e.target.files?.[0];
  if (file) analyzeImageFile(file, "Foto selezionata");
};

$("documentInput").onchange = e => {
  const file = e.target.files?.[0];
  if (!file) return;

  showFile(file, "Documento");

  if (file.type.startsWith("image/")) {
    analyzeImageFile(file, "Documento fotografato");
  } else {
    show("Documento acquisito. In questa build l'AI è già attiva per testo e immagini; l'analisi PDF arriva nello step successivo.");
  }
};

$("clearCapture").onclick = () => {
  $("captureCard").classList.add("hidden");
  $("captureImage").src = "";
  demoResult.classList.add("hidden");
};

async function toggleMic() {
  try {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      show("Registrazione vocale non disponibile in questo browser.");
      return;
    }

    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    recorder = new MediaRecorder(stream);

    recorder.ondataavailable = e => {
      if (e.data.size) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      stream.getTracks().forEach(t => t.stop());
      setState("idle");
      show(`Audio acquisito (${Math.max(1, Math.round(blob.size / 1024))} KB). La trascrizione AI sarà collegata nel prossimo step.`);
    };

    recorder.start();
    setState("listening");
    show("Registrazione in corso… Tocca di nuovo il microfono per fermare.");
  } catch (e) {
    setState("idle");
    show("Non riesco ad accedere al microfono. Controlla il permesso del sito in Safari.");
  }
}

micButton.onclick = toggleMic;
navOrb.onclick = toggleMic;

$("orbButton").onclick = () => {
  if (state === "idle") toggleMic();
  else if (state === "listening") toggleMic();
};

promptInput.addEventListener("keydown", async e => {
  if (e.key !== "Enter") return;

  const value = e.target.value.trim();
  if (!value) return;

  e.preventDefault();
  e.target.value = "";
  await askONE({ text: value });
});

$("actionBtn").onclick = () => {
  show("Prima mostra, fotografa o scrivi qualcosa: ONE ti proporrà automaticamente le azioni migliori.");
};

$("menuBtn").onclick = () => show("Menu: Impostazioni · Recall · Privacy · Integrazioni");
$("profileBtn").onclick = () => show("Profilo ONE");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

setState("idle");
