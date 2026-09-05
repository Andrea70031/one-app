(() => {
  const STORAGE_SHORTCUTS = "one_smart_shortcuts";
  const $id = id => document.getElementById(id);
  const esc = value => typeof escapeHtml === "function"
    ? escapeHtml(String(value ?? ""))
    : String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));

  const integrations = [
    { id: "calendar", icon: "▣", name: "Calendario", detail: "Crea eventi e passali al calendario del dispositivo." },
    { id: "reminders", icon: "◷", name: "Promemoria", detail: "Crea, sincronizza e completa promemoria ONE." },
    { id: "email", icon: "✉", name: "Email", detail: "Prepara email e apri l'app di posta per l'invio." },
    { id: "maps", icon: "⌖", name: "Mappe", detail: "Cerca luoghi, indirizzi e apri Apple Maps." },
    { id: "files", icon: "▤", name: "File", detail: "Importa documenti, foto e allegati per ONE." },
    { id: "smart", icon: "⌂", name: "Casa smart", detail: "Avvia scene e automazioni tramite Comandi Rapidi Apple." }
  ];

  function readShortcuts() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_SHORTCUTS) || "[]");
      return Array.isArray(value) ? value.slice(0, 12) : [];
    } catch {
      return [];
    }
  }

  function saveShortcuts(items) {
    localStorage.setItem(STORAGE_SHORTCUTS, JSON.stringify(items.slice(0, 12)));
  }

  function smartConfigured() {
    return readShortcuts().length > 0;
  }

  function statusFor(id) {
    if (id === "smart") return smartConfigured() ? { label: "ATTIVO", kind: "active" } : { label: "CONFIGURA", kind: "setup" };
    return { label: "ATTIVO", kind: "active" };
  }

  function showSheet(title, subtitle, html) {
    const sheetTitle = $id("sheetTitle"), sheetSubtitle = $id("sheetSubtitle"), body = $id("sheetBody"), sheet = $id("sheet"), scrim = $id("scrim");
    if (!sheetTitle || !sheetSubtitle || !body || !sheet) return;
    sheetTitle.textContent = title;
    sheetSubtitle.textContent = subtitle;
    body.innerHTML = html;
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    if (scrim) scrim.classList.remove("hidden");
  }

  function centerHtml() {
    return `
      <div class="integration-note">
        <strong>ONE Actions attive</strong>
        <span>Le azioni compatibili con iPhone e web sono operative. ONE apre servizi esterni solo quando lo chiedi tu.</span>
      </div>
      <div class="integration-list">
        ${integrations.map(item => {
          const status = statusFor(item.id);
          return `<button class="integration-row" type="button" data-integration="${item.id}">
            <span class="integration-icon">${item.icon}</span>
            <span class="integration-copy"><strong>${item.name}</strong><small>${item.detail}</small></span>
            <span class="integration-status ${status.kind}">${status.label}</span>
            <span class="integration-chevron">›</span>
          </button>`;
        }).join("")}
      </div>
      <div class="integration-footnote">Calendario usa un file evento compatibile (.ics). Promemoria è sincronizzato in ONE. Casa smart usa i Comandi Rapidi presenti sul tuo iPhone.</div>`;
  }

  function renderCenter() {
    showSheet("Integrazioni", "ONE Actions", centerHtml());
    document.querySelectorAll("[data-integration]").forEach(button => {
      button.onclick = () => renderDetail(button.dataset.integration);
    });
  }

  function localDateTimeValue(date = new Date()) {
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0, 16);
  }

  function formShell(icon, title, description, fields, submitLabel) {
    return `
      <button class="integration-back" type="button" id="integrationBack">‹ Tutte le integrazioni</button>
      <div class="integration-detail-head"><span>${icon}</span><div><strong>${title}</strong><small>${description}</small></div></div>
      <form id="integrationForm" class="integration-form">
        ${fields}
        <div id="integrationMessage" class="integration-message hidden"></div>
        <button class="primary-btn" type="submit">${submitLabel}</button>
      </form>`;
  }

  function message(text, error = false) {
    const el = $id("integrationMessage");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("error", error);
    el.classList.remove("hidden");
  }

  async function runAction(action, context = {}) {
    if (typeof executeAction !== "function") throw new Error("Action Engine non disponibile");
    return executeAction(action, context);
  }

  function bindBack() {
    const back = $id("integrationBack");
    if (back) back.onclick = renderCenter;
  }

  function renderCalendar() {
    const start = new Date(Date.now() + 3600000);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 3600000);
    showSheet("Calendario", "ONE Actions", formShell("▣", "Nuovo evento", "ONE prepara l'evento e lo passa al calendario del dispositivo.", `
      <label>Titolo<input name="title" required maxlength="180" placeholder="Es. Riunione con cliente"></label>
      <div class="integration-grid"><label>Inizio<input name="start" type="datetime-local" required value="${localDateTimeValue(start)}"></label><label>Fine<input name="end" type="datetime-local" required value="${localDateTimeValue(end)}"></label></div>
      <label>Luogo<input name="location" maxlength="300" placeholder="Indirizzo o luogo"></label>
      <label>Note<textarea name="notes" maxlength="1600" placeholder="Dettagli dell'evento"></textarea></label>`, "Prepara per Calendario"));
    bindBack();
    $id("integrationForm").onsubmit = async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const startDate = new Date(data.start), endDate = new Date(data.end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) return message("Controlla data e ora: la fine deve essere successiva all'inizio.", true);
      message("Preparazione evento…");
      try {
        await runAction({ kind: "calendar", label: `Calendario · ${data.title}`, payload: { title: data.title, start: startDate.toISOString(), end: endDate.toISOString(), location: data.location, notes: data.notes } });
        message("✓ Evento pronto. Apri il file .ics per aggiungerlo al calendario.");
      } catch {
        message("Non riesco a preparare l'evento.", true);
      }
    };
  }

  async function reminderPreviewHtml() {
    let reminders = [];
    try { reminders = typeof getReminders === "function" ? await getReminders() : []; } catch {}
    const open = reminders.filter(item => !item.completed).slice(0, 5);
    if (!open.length) return `<div class="integration-empty">Nessun promemoria aperto.</div>`;
    return `<div class="integration-mini-list">${open.map(item => `<div><span>◷</span><p><strong>${esc(item.title)}</strong><small>${item.due_at ? esc(new Date(item.due_at).toLocaleString("it-IT")) : "Senza scadenza"}</small></p></div>`).join("")}</div>`;
  }

  async function renderReminders() {
    const preview = await reminderPreviewHtml();
    showSheet("Promemoria", "ONE Actions", `
      <button class="integration-back" type="button" id="integrationBack">‹ Tutte le integrazioni</button>
      <div class="integration-detail-head"><span>◷</span><div><strong>Promemoria ONE</strong><small>Sincronizzati nel tuo account e disponibili nel Centro azioni.</small></div></div>
      <form id="integrationForm" class="integration-form">
        <label>Titolo<input name="title" required maxlength="180" placeholder="Es. Chiamare il fornitore"></label>
        <label>Quando <span class="integration-optional">opzionale</span><input name="due_at" type="datetime-local"></label>
        <label>Note<textarea name="note" maxlength="1000" placeholder="Dettagli"></textarea></label>
        <div id="integrationMessage" class="integration-message hidden"></div>
        <button class="primary-btn" type="submit">Crea promemoria</button>
      </form>
      <div class="integration-section-title">APERti</div>${preview}
      <button class="integration-secondary" id="openActionCenter" type="button">Apri Centro azioni</button>`);
    bindBack();
    const actionCenter = $id("openActionCenter");
    if (actionCenter) actionCenter.onclick = () => typeof openSheet === "function" && openSheet("actions");
    $id("integrationForm").onsubmit = async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const due = data.due_at ? new Date(data.due_at) : null;
      if (due && Number.isNaN(due.getTime())) return message("Data del promemoria non valida.", true);
      message("Creazione promemoria…");
      try {
        await runAction({ kind: "reminder", label: `Promemoria · ${data.title}`, payload: { title: data.title, note: data.note, due_at: due ? due.toISOString() : null } });
        message("✓ Promemoria creato in ONE.");
        setTimeout(renderReminders, 450);
      } catch {
        message("Non riesco a creare il promemoria.", true);
      }
    };
  }

  function renderEmail() {
    showSheet("Email", "ONE Actions", formShell("✉", "Nuova email", "ONE prepara il messaggio e apre l'app di posta. L'invio resta sempre sotto il tuo controllo.", `
      <label>A<input name="to" type="email" inputmode="email" autocomplete="email" placeholder="nome@email.it"></label>
      <label>Oggetto<input name="subject" maxlength="180" placeholder="Oggetto"></label>
      <label>Messaggio<textarea name="body" rows="7" maxlength="6000" placeholder="Scrivi il messaggio"></textarea></label>`, "Apri nell'app Email"));
    bindBack();
    $id("integrationForm").onsubmit = async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      if (!data.to && !data.subject && !data.body) return message("Inserisci almeno un destinatario o il contenuto dell'email.", true);
      message("Apertura app Email…");
      try {
        await runAction({ kind: "email", label: "Prepara email", payload: { to: data.to, subject: data.subject, body: data.body } });
      } catch {
        message("Non riesco ad aprire l'app Email.", true);
      }
    };
  }

  function renderMaps() {
    showSheet("Mappe", "ONE Actions", formShell("⌖", "Apri in Mappe", "Cerca un indirizzo o un luogo e continua nell'app Mappe.", `
      <label>Luogo o indirizzo<input name="query" required maxlength="500" autocomplete="street-address" placeholder="Es. Piazza Bra, Verona"></label>`, "Apri Apple Maps"));
    bindBack();
    $id("integrationForm").onsubmit = async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      message("Apertura Mappe…");
      try {
        await runAction({ kind: "maps", label: "Apri in Mappe", payload: { query: data.query, address: data.query } });
      } catch {
        message("Non riesco ad aprire Mappe.", true);
      }
    };
  }

  function renderFiles() {
    showSheet("File", "ONE Actions", `
      <button class="integration-back" type="button" id="integrationBack">‹ Tutte le integrazioni</button>
      <div class="integration-detail-head"><span>▤</span><div><strong>File e immagini</strong><small>Porta documenti e foto dentro ONE per analizzarli, ricordarli o trasformarli in azioni.</small></div></div>
      <div class="integration-file-actions">
        <button type="button" data-file-source="document"><span>▤</span><strong>Scegli documento</strong><small>PDF, testo e altri file supportati</small></button>
        <button type="button" data-file-source="photo"><span>▧</span><strong>Scegli foto</strong><small>Immagini dalla libreria</small></button>
        <button type="button" data-file-source="camera"><span>◉</span><strong>Scatta foto</strong><small>Usa subito la fotocamera</small></button>
      </div>
      <div class="integration-footnote">I file selezionati seguono lo stesso flusso di analisi già usato nella home di ONE.</div>`);
    bindBack();
    document.querySelectorAll("[data-file-source]").forEach(button => {
      button.onclick = () => {
        const id = ({ document: "documentInput", photo: "photoInput", camera: "cameraInput" })[button.dataset.fileSource];
        const input = $id(id);
        if (!input) return typeof toast === "function" && toast("Selettore file non disponibile");
        if (typeof closeSheet === "function") closeSheet();
        input.click();
      };
    });
  }

  function shortcutUrl(item, overrideText = "") {
    const name = encodeURIComponent(item.name || item.label || "");
    const text = String(overrideText || item.text || "").trim();
    return text
      ? `shortcuts://run-shortcut?name=${name}&input=text&text=${encodeURIComponent(text)}`
      : `shortcuts://run-shortcut?name=${name}`;
  }

  async function runShortcut(item, overrideText = "") {
    if (!item?.name) return;
    const url = shortcutUrl(item, overrideText);
    try {
      if (typeof logAction === "function") await logAction({ kind: "open_url", label: `Casa smart · ${item.label || item.name}`, payload: { url, shortcut_name: item.name } }, "executed");
      if (typeof addActivity === "function") addActivity(item.label || item.name, "Comando rapido Apple", "⌂", "smart_home", { shortcut_name: item.name });
    } catch {}
    window.location.href = url;
  }

  function smartListHtml(items) {
    if (!items.length) return `<div class="integration-empty">Nessun comando configurato. Aggiungi il nome di un Comando Rapido già presente sul tuo iPhone.</div>`;
    return `<div class="smart-command-list">${items.map(item => `<div class="smart-command"><span>⌂</span><p><strong>${esc(item.label || item.name)}</strong><small>${esc(item.name)}</small></p><button type="button" data-run-shortcut="${esc(item.id)}">Esegui</button><button class="smart-delete" type="button" data-delete-shortcut="${esc(item.id)}">×</button></div>`).join("")}</div>`;
  }

  function renderSmart() {
    const items = readShortcuts();
    showSheet("Casa smart", "ONE Actions", `
      <button class="integration-back" type="button" id="integrationBack">‹ Tutte le integrazioni</button>
      <div class="integration-detail-head"><span>⌂</span><div><strong>Comandi Rapidi Apple</strong><small>ONE può lanciare un comando rapido già presente su iPhone; quel comando può controllare Casa, HomeKit o altre automazioni.</small></div></div>
      ${smartListHtml(items)}
      <div class="integration-section-title">AGGIUNGI COMANDO</div>
      <form id="integrationForm" class="integration-form">
        <label>Nome in ONE<input name="label" required maxlength="80" placeholder="Es. Apri cancello"></label>
        <label>Nome esatto del Comando Rapido<input name="name" required maxlength="120" placeholder="Es. Apri cancello"></label>
        <label>Input da passare <span class="integration-optional">opzionale</span><input name="text" maxlength="500" placeholder="Testo ricevuto dal comando"></label>
        <div id="integrationMessage" class="integration-message hidden"></div>
        <button class="primary-btn" type="submit">Salva comando</button>
      </form>
      <button class="integration-secondary" type="button" id="openShortcutsApp">Apri Comandi Rapidi</button>
      <div class="integration-footnote">ONE non riceve accesso diretto alla tua casa: apre soltanto il comando che hai scelto. Le autorizzazioni Home restano gestite da Apple.</div>`);
    bindBack();
    $id("openShortcutsApp").onclick = () => { window.location.href = "shortcuts://"; };
    document.querySelectorAll("[data-run-shortcut]").forEach(button => {
      button.onclick = () => runShortcut(items.find(item => item.id === button.dataset.runShortcut));
    });
    document.querySelectorAll("[data-delete-shortcut]").forEach(button => {
      button.onclick = () => {
        saveShortcuts(items.filter(item => item.id !== button.dataset.deleteShortcut));
        renderSmart();
      };
    });
    $id("integrationForm").onsubmit = event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const entry = { id: `shortcut-${Date.now()}`, label: String(data.label || "").trim(), name: String(data.name || "").trim(), text: String(data.text || "").trim() };
      if (!entry.name || !entry.label) return message("Inserisci nome in ONE e nome esatto del Comando Rapido.", true);
      saveShortcuts([entry, ...items.filter(item => item.name !== entry.name)]);
      if (typeof toast === "function") toast("Comando Casa smart salvato");
      renderSmart();
    };
  }

  function renderDetail(id) {
    if (id === "calendar") return renderCalendar();
    if (id === "reminders") return renderReminders();
    if (id === "email") return renderEmail();
    if (id === "maps") return renderMaps();
    if (id === "files") return renderFiles();
    if (id === "smart") return renderSmart();
    renderCenter();
  }

  function enhanceOpenSheet() {
    if (typeof openSheet !== "function" || openSheet.__oneIntegrationsEnhanced) return;
    const base = openSheet;
    const enhanced = function(type, data) {
      base(type, data);
      if (type === "integrations") renderCenter();
    };
    enhanced.__oneIntegrationsEnhanced = true;
    enhanced.__oneIntegrationsBase = base;
    try { openSheet = enhanced; } catch {}
    try { window.openSheet = enhanced; } catch {}
  }

  function exposeHelpers() {
    window.ONEIntegrations = {
      open: renderCenter,
      openDetail: renderDetail,
      runShortcut,
      getShortcuts: readShortcuts
    };
  }

  enhanceOpenSheet();
  exposeHelpers();
})();
