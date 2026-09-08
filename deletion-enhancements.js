(() => {
  const SOFT_TABLES = new Set([
    "sites",
    "one_memories",
    "one_reminders",
    "one_activities",
    "issues",
    "activities",
    "daily_reports",
    "documents"
  ]);
  const PERSONAL_TABLES = new Set(["one_memories", "one_reminders", "one_activities"]);
  const TRASH_DAYS = 30;
  const configs = {
    sites: {
      key: "sites", table: "sites", label: "Cantieri", icon: "⌂",
      select: "id,job_number,name,client,status,deleted_at", order: "updated_at.desc",
      title: row => `${row.job_number || "Cantiere"} · ${row.name || "Senza nome"}`,
      subtitle: row => row.client || row.status || "Cantiere"
    },
    memories: {
      key: "memories", table: "one_memories", label: "Note / Recall", icon: "◌", personal: true,
      select: "id,title,summary,kind,deleted_at", order: "created_at.desc",
      title: row => row.title || "Nota ONE", subtitle: row => row.summary || row.kind || "Recall"
    },
    reminders: {
      key: "reminders", table: "one_reminders", label: "Promemoria", icon: "◷", personal: true,
      select: "id,title,note,due_at,completed,deleted_at", order: "created_at.desc",
      title: row => row.title || "Promemoria", subtitle: row => row.note || (row.due_at ? `Scadenza ${new Date(row.due_at).toLocaleString("it-IT")}` : "Senza scadenza")
    },
    oneActivities: {
      key: "oneActivities", table: "one_activities", label: "Attività ONE", icon: "✦", personal: true,
      select: "id,title,detail,type,deleted_at", order: "created_at.desc",
      title: row => row.title || "Attività ONE", subtitle: row => row.detail || row.type || "Attività"
    },
    issues: {
      key: "issues", table: "issues", label: "Problemi", icon: "!", siteScoped: true,
      select: "id,site_id,title,details,priority,status,deleted_at", order: "created_at.desc",
      title: row => row.title || "Problema", subtitle: row => [row.priority, row.status, row.details].filter(Boolean).join(" · ") || "Problema cantiere"
    },
    siteActivities: {
      key: "siteActivities", table: "activities", label: "Lavori", icon: "✓", siteScoped: true,
      select: "id,site_id,title,notes,deleted_at", order: "created_at.desc",
      title: row => row.title || "Attività cantiere", subtitle: row => row.notes || "Attività cantiere"
    },
    reports: {
      key: "reports", table: "daily_reports", label: "Report", icon: "▤", siteScoped: true,
      select: "id,site_id,report_date,summary,works,deleted_at", order: "created_at.desc",
      title: row => row.report_date ? `Report ${new Date(row.report_date).toLocaleDateString("it-IT")}` : "Report cantiere",
      subtitle: row => row.summary || row.works || "Report giornaliero"
    },
    documents: {
      key: "documents", table: "documents", label: "Documenti", icon: "▱", siteScoped: true,
      select: "id,site_id,file_name,mime_type,category,deleted_at", order: "created_at.desc",
      title: row => row.file_name || "Documento", subtitle: row => row.category || row.mime_type || "Documento cantiere"
    }
  };

  let managerScope = "active";
  let managerCategory = "sites";
  let managerRows = [];
  let managerBusy = false;
  let undoTimer = null;

  const activePath = (path, options = {}) => {
    const method = String(options.method || "GET").toUpperCase();
    if (method !== "GET") return path;
    const table = String(path || "").split("?")[0];
    if (!SOFT_TABLES.has(table) || /(?:^|[?&])deleted_at=/.test(path)) return path;
    return `${path}${path.includes("?") ? "&" : "?"}deleted_at=is.null`;
  };

  if (typeof cloudRequest === "function") {
    const baseCloudRequest = cloudRequest;
    cloudRequest = (path, options = {}) => baseCloudRequest(activePath(path, options), options);
  }

  const readLocal = key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const writeLocal = (key, rows, limit = 140) => localStorage.setItem(key, JSON.stringify(rows.slice(0, limit)));
  const isActive = row => !row?.deleted_at;
  const cutoffMs = () => Date.now() - TRASH_DAYS * 86_400_000;

  const rawLocalActivities = () => {
    const raw = localStorage.getItem("one_activities");
    if (raw == null && typeof defaultActivities !== "undefined") return [...defaultActivities];
    return readLocal("one_activities");
  };
  const rawLocalReminders = () => readLocal("one_reminders");

  const purgeLocalTrash = () => {
    const purge = (key, rows) => writeLocal(key, rows.filter(row => !row.deleted_at || new Date(row.deleted_at).getTime() >= cutoffMs()));
    purge("one_activities", rawLocalActivities());
    purge("one_reminders", rawLocalReminders());
  };

  purgeLocalTrash();

  if (typeof getLocalActivities === "function") {
    getLocalActivities = () => rawLocalActivities().filter(isActive);
  }
  if (typeof saveLocalActivities === "function") {
    saveLocalActivities = activeRows => {
      if (localStorage.one_history === "off") return;
      const trashed = rawLocalActivities().filter(row => row.deleted_at);
      const active = (Array.isArray(activeRows) ? activeRows : []).filter(isActive);
      writeLocal("one_activities", [...active, ...trashed], 140);
    };
  }
  if (typeof getReminders === "function") {
    const baseGetReminders = getReminders;
    getReminders = async () => {
      const rows = await baseGetReminders();
      return Array.isArray(rows) ? rows.filter(isActive) : [];
    };
  }
  if (typeof toggleReminder === "function") {
    const baseToggleReminder = toggleReminder;
    toggleReminder = async (id, completed) => {
      if (typeof session !== "undefined" && session) return baseToggleReminder(id, completed);
      const rows = rawLocalReminders();
      const item = rows.find(row => String(row.id) === String(id) && !row.deleted_at);
      if (!item) return;
      item.completed = completed;
      writeLocal("one_reminders", rows, 140);
      if (typeof loadActionCenter === "function") await loadActionCenter();
    };
  }

  const purgeCloudTrash = async () => {
    if (typeof session === "undefined" || !session || typeof cloudRequest !== "function") return;
    try { await cloudRequest("rpc/purge_expired_trash", { method: "POST", body: {} }); } catch {}
  };
  if (typeof session !== "undefined" && session) void purgeCloudTrash();
  if (typeof saveSession === "function") {
    const baseSaveSession = saveSession;
    saveSession = value => {
      baseSaveSession(value);
      if (value) setTimeout(() => void purgeCloudTrash(), 0);
    };
  }

  const localEntry = (configKey, row) => ({ ...row, _configKey: configKey, _local: true });
  const cloudEntry = (configKey, row) => ({ ...row, _configKey: configKey, _local: false });

  const queryConfig = async (config, deleted) => {
    if (typeof session === "undefined" || !session) return [];
    if (config.siteScoped && !deleted && (typeof selectedSiteId === "undefined" || !selectedSiteId)) return [];
    const filters = [];
    filters.push(`deleted_at=${deleted ? "not.is.null" : "is.null"}`);
    if (config.personal && typeof userId === "function" && userId()) filters.push(`user_id=eq.${encodeURIComponent(userId())}`);
    if (config.siteScoped && !deleted && selectedSiteId) filters.push(`site_id=eq.${encodeURIComponent(selectedSiteId)}`);
    const path = `${config.table}?select=${encodeURIComponent(config.select)}&${filters.join("&")}&order=${config.order}&limit=180`;
    try {
      const rows = await cloudRequest(path);
      return Array.isArray(rows) ? rows.map(row => cloudEntry(config.key, row)) : [];
    } catch {
      return [];
    }
  };

  const loadActiveRows = async configKey => {
    const config = configs[configKey];
    if (!config) return [];
    if (typeof session !== "undefined" && session) {
      const cloud = await queryConfig(config, false);
      if (cloud.length || !config.personal) return cloud;
    }
    if (configKey === "oneActivities") return rawLocalActivities().filter(isActive).map(row => localEntry(configKey, row));
    if (configKey === "reminders") return rawLocalReminders().filter(isActive).map(row => localEntry(configKey, row));
    return [];
  };

  const loadTrashRows = async () => {
    const rows = [];
    if (typeof session !== "undefined" && session) {
      const groups = await Promise.all(Object.values(configs).map(config => queryConfig(config, true)));
      groups.forEach(group => rows.push(...group));
    } else {
      rows.push(...rawLocalActivities().filter(row => row.deleted_at).map(row => localEntry("oneActivities", row)));
      rows.push(...rawLocalReminders().filter(row => row.deleted_at).map(row => localEntry("reminders", row)));
    }
    return rows.sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0));
  };

  const localStoreFor = configKey => configKey === "reminders" ? "one_reminders" : "one_activities";
  const rawLocalFor = configKey => configKey === "reminders" ? rawLocalReminders() : rawLocalActivities();

  const patchCloudDeletedAt = async (entry, value) => {
    const config = configs[entry._configKey];
    if (!config) throw new Error("config_missing");
    let path = `${config.table}?id=eq.${encodeURIComponent(entry.id)}&select=id`;
    if (config.personal && typeof userId === "function" && userId()) path += `&user_id=eq.${encodeURIComponent(userId())}`;
    const result = await cloudRequest(path, { method: "PATCH", body: { deleted_at: value } });
    if (!Array.isArray(result) || !result.length) throw new Error("update_denied");
  };

  const hardDeleteCloud = async entry => {
    const config = configs[entry._configKey];
    if (!config) throw new Error("config_missing");
    let path = `${config.table}?id=eq.${encodeURIComponent(entry.id)}&deleted_at=not.is.null&select=id`;
    if (config.personal && typeof userId === "function" && userId()) path += `&user_id=eq.${encodeURIComponent(userId())}`;
    const result = await cloudRequest(path, { method: "DELETE" });
    if (!Array.isArray(result) || !result.length) throw new Error("delete_denied");
  };

  const patchLocalDeletedAt = (entry, value) => {
    const key = localStoreFor(entry._configKey);
    const rows = rawLocalFor(entry._configKey);
    const item = rows.find(row => String(row.id) === String(entry.id));
    if (!item) throw new Error("local_missing");
    if (value) item.deleted_at = value;
    else delete item.deleted_at;
    writeLocal(key, rows, 140);
  };

  const hardDeleteLocal = entry => {
    const key = localStoreFor(entry._configKey);
    const rows = rawLocalFor(entry._configKey).filter(row => String(row.id) !== String(entry.id));
    writeLocal(key, rows, 140);
  };

  const refreshViews = async entry => {
    try {
      if (entry._configKey === "memories" && typeof loadCloudMemories === "function") await loadCloudMemories();
      if (entry._configKey === "oneActivities" && typeof syncFromCloud === "function" && typeof session !== "undefined" && session) await syncFromCloud();
      if (entry._configKey === "oneActivities" && typeof renderActivities === "function") renderActivities();
      if (entry._configKey === "reminders" && typeof loadActionCenter === "function") await loadActionCenter();
      if (entry._configKey === "sites" && typeof loadWorkspaces === "function") await loadWorkspaces();
      if (["issues", "siteActivities", "reports", "documents"].includes(entry._configKey) && typeof selectedSiteId !== "undefined" && selectedSiteId && typeof openSite === "function") await openSite(selectedSiteId);
      if (typeof loadToday === "function") await loadToday();
    } catch {}
  };

  const ensureUndo = () => {
    let bar = document.getElementById("oneUndoBar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "oneUndoBar";
    bar.className = "one-undo-bar hidden";
    bar.innerHTML = `<span id="oneUndoText">Spostato nel Cestino</span><button id="oneUndoAction" type="button">Annulla</button>`;
    document.body.appendChild(bar);
    return bar;
  };

  const showUndo = (message, action) => {
    const bar = ensureUndo();
    const text = document.getElementById("oneUndoText");
    const button = document.getElementById("oneUndoAction");
    if (text) text.textContent = message;
    if (button) button.onclick = async () => {
      clearTimeout(undoTimer);
      bar.classList.add("hidden");
      await action();
    };
    bar.classList.remove("hidden");
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => bar.classList.add("hidden"), 6500);
  };

  const restoreEntry = async entry => {
    try {
      if (entry._local) patchLocalDeletedAt(entry, null);
      else await patchCloudDeletedAt(entry, null);
      if (typeof toast === "function") toast("Elemento ripristinato");
      await refreshViews(entry);
      if (managerScope === "trash") await loadManager();
    } catch {
      if (typeof toast === "function") toast("Non riesco a ripristinare questo elemento");
    }
  };

  const moveEntryToTrash = async entry => {
    if (managerBusy) return;
    managerBusy = true;
    const deletedAt = new Date().toISOString();
    try {
      if (entry._local) patchLocalDeletedAt(entry, deletedAt);
      else await patchCloudDeletedAt(entry, deletedAt);
      const moved = { ...entry, deleted_at: deletedAt };
      showUndo("Spostato nel Cestino", () => restoreEntry(moved));
      if (typeof toast === "function") toast("Elemento rimosso dalle liste");
      if (entry._configKey === "sites" && typeof selectedSiteId !== "undefined" && String(selectedSiteId) === String(entry.id)) {
        selectedSiteId = null;
        if (typeof navigate === "function") navigate("spaces", true);
      }
      await refreshViews(entry);
      await loadManager();
    } catch {
      if (typeof toast === "function") toast("Non posso eliminare questo elemento");
    } finally {
      managerBusy = false;
    }
  };

  const permanentlyDeleteEntry = async entry => {
    if (managerBusy) return;
    const config = configs[entry._configKey];
    const title = config ? config.title(entry) : "questo elemento";
    const siteWarning = entry._configKey === "sites" ? "\n\nVerranno eliminati definitivamente anche i dati collegati al cantiere." : "";
    if (!window.confirm(`Eliminare definitivamente “${title}”?${siteWarning}\n\nQuesta operazione non può essere annullata.`)) return;
    managerBusy = true;
    try {
      if (entry._local) hardDeleteLocal(entry);
      else await hardDeleteCloud(entry);
      if (typeof toast === "function") toast("Eliminato definitivamente");
      await refreshViews(entry);
      await loadManager();
    } catch {
      if (typeof toast === "function") toast("Eliminazione definitiva non riuscita");
    } finally {
      managerBusy = false;
    }
  };

  const entryTitle = entry => configs[entry._configKey]?.title(entry) || "Elemento ONE";
  const entrySubtitle = entry => configs[entry._configKey]?.subtitle(entry) || "";
  const daysLeft = entry => {
    if (!entry.deleted_at) return TRASH_DAYS;
    const elapsed = Math.floor((Date.now() - new Date(entry.deleted_at).getTime()) / 86_400_000);
    return Math.max(0, TRASH_DAYS - elapsed);
  };

  const ensureManager = () => {
    let modal = document.getElementById("oneTrashManager");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "oneTrashManager";
    modal.className = "one-manager-modal hidden";
    modal.innerHTML = `
      <div class="one-manager-scrim" data-one-manager-close></div>
      <section class="one-manager-sheet" role="dialog" aria-modal="true" aria-label="Gestisci e Cestino ONE">
        <div class="one-manager-handle"></div>
        <header class="one-manager-head">
          <div><span>GESTISCI</span><h2>Pulisci ONE</h2><p>Tutto ciò che crei può essere rimosso e recuperato.</p></div>
          <button type="button" data-one-manager-close aria-label="Chiudi">×</button>
        </header>
        <div class="one-manager-scope">
          <button type="button" data-one-scope="active" class="active">Elementi</button>
          <button type="button" data-one-scope="trash">Cestino</button>
        </div>
        <div id="oneManagerCategories" class="one-manager-categories"></div>
        <div id="oneManagerNotice" class="one-manager-notice"></div>
        <div id="oneManagerList" class="one-manager-list"><div class="one-manager-loading">Caricamento…</div></div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll("[data-one-manager-close]").forEach(el => el.addEventListener("click", closeManager));
    modal.querySelectorAll("[data-one-scope]").forEach(button => button.addEventListener("click", () => {
      managerScope = button.dataset.oneScope;
      modal.querySelectorAll("[data-one-scope]").forEach(x => x.classList.toggle("active", x === button));
      void loadManager();
    }));
    return modal;
  };

  const ensureDrawerButton = () => {
    if (document.getElementById("oneManageDataBtn")) return;
    const anchor = document.querySelector('#drawer [data-open="account"]');
    const section = anchor?.parentElement;
    if (!section) return;
    const button = document.createElement("button");
    button.id = "oneManageDataBtn";
    button.type = "button";
    button.innerHTML = `<i>⌫</i><span>Gestisci e Cestino</span><em>30 GG</em>`;
    button.addEventListener("click", () => {
      if (typeof closeDrawer === "function") closeDrawer();
      openManager();
    });
    section.appendChild(button);
  };

  const renderCategories = () => {
    const box = document.getElementById("oneManagerCategories");
    if (!box) return;
    box.classList.toggle("hidden", managerScope === "trash");
    if (managerScope === "trash") return;
    box.innerHTML = Object.values(configs).map(config => `<button type="button" data-one-category="${config.key}" class="${managerCategory === config.key ? "active" : ""}"><span>${config.icon}</span>${config.label}</button>`).join("");
    box.querySelectorAll("[data-one-category]").forEach(button => button.addEventListener("click", () => {
      managerCategory = button.dataset.oneCategory;
      void loadManager();
    }));
  };

  const renderManagerRows = () => {
    const list = document.getElementById("oneManagerList");
    const notice = document.getElementById("oneManagerNotice");
    if (!list || !notice) return;
    const config = configs[managerCategory];
    if (managerScope === "active" && config?.siteScoped && (typeof selectedSiteId === "undefined" || !selectedSiteId)) {
      notice.textContent = "Apri prima un cantiere per gestire questa categoria.";
    } else if (managerScope === "trash") {
      notice.textContent = "Gli elementi restano recuperabili per 30 giorni. Poi vengono eliminati quando ONE viene utilizzata.";
    } else {
      notice.textContent = "Il cestino rimuove subito l’elemento dalle liste, ma puoi ripristinarlo.";
    }
    if (!managerRows.length) {
      list.innerHTML = `<div class="one-manager-empty">${managerScope === "trash" ? "Cestino vuoto." : "Nessun elemento in questa sezione."}</div>`;
      return;
    }
    list.innerHTML = managerRows.map((entry, index) => {
      const configForRow = configs[entry._configKey];
      const meta = managerScope === "trash" ? `${configForRow?.label || "ONE"} · ${daysLeft(entry)} gg al definitivo` : (entrySubtitle(entry) || configForRow?.label || "ONE");
      return `<div class="one-manager-row">
        <span class="one-manager-icon">${configForRow?.icon || "✦"}</span>
        <span class="one-manager-copy"><strong>${typeof escapeHtml === "function" ? escapeHtml(entryTitle(entry)) : entryTitle(entry)}</strong><small>${typeof escapeHtml === "function" ? escapeHtml(meta) : meta}</small></span>
        ${managerScope === "trash"
          ? `<span class="one-manager-actions"><button type="button" data-one-restore="${index}" aria-label="Ripristina">↶</button><button type="button" class="danger" data-one-hard-delete="${index}" aria-label="Elimina definitivamente">⌫</button></span>`
          : `<button type="button" class="one-manager-delete" data-one-soft-delete="${index}" aria-label="Sposta nel Cestino">⌫</button>`}
      </div>`;
    }).join("");
    list.querySelectorAll("[data-one-soft-delete]").forEach(button => button.addEventListener("click", () => {
      const entry = managerRows[Number(button.dataset.oneSoftDelete)];
      if (!entry) return;
      const configForRow = configs[entry._configKey];
      const siteCopy = entry._configKey === "sites" ? "\n\nIl cantiere sparirà dalle liste; i dati collegati resteranno recuperabili finché il cantiere è nel Cestino." : "";
      if (window.confirm(`Spostare “${entryTitle(entry)}” nel Cestino?${siteCopy}`)) void moveEntryToTrash(entry);
    }));
    list.querySelectorAll("[data-one-restore]").forEach(button => button.addEventListener("click", () => {
      const entry = managerRows[Number(button.dataset.oneRestore)];
      if (entry) void restoreEntry(entry);
    }));
    list.querySelectorAll("[data-one-hard-delete]").forEach(button => button.addEventListener("click", () => {
      const entry = managerRows[Number(button.dataset.oneHardDelete)];
      if (entry) void permanentlyDeleteEntry(entry);
    }));
  };

  async function loadManager() {
    const list = document.getElementById("oneManagerList");
    if (list) list.innerHTML = `<div class="one-manager-loading">Caricamento…</div>`;
    renderCategories();
    managerRows = managerScope === "trash" ? await loadTrashRows() : await loadActiveRows(managerCategory);
    renderCategories();
    renderManagerRows();
  }

  function openManager(category) {
    if (category && configs[category]) managerCategory = category;
    managerScope = "active";
    const modal = ensureManager();
    modal.classList.remove("hidden");
    modal.querySelectorAll("[data-one-scope]").forEach(button => button.classList.toggle("active", button.dataset.oneScope === "active"));
    void loadManager();
  }
  function closeManager() {
    document.getElementById("oneTrashManager")?.classList.add("hidden");
  }

  const softDeleteCloudById = async (configKey, id) => {
    const config = configs[configKey];
    if (!config) return;
    const entry = cloudEntry(configKey, { id });
    await moveEntryToTrash(entry);
  };

  const decorateRecall = () => {
    const list = document.getElementById("recallList");
    if (!list) return;
    list.querySelectorAll("[data-memory]").forEach(row => {
      if (row.parentElement?.classList.contains("one-deletable-row")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "one-deletable-row";
      row.parentNode.insertBefore(wrapper, row);
      wrapper.appendChild(row);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "one-delete-btn";
      remove.setAttribute("aria-label", "Sposta nota nel Cestino");
      remove.textContent = "⌫";
      remove.addEventListener("click", async event => {
        event.preventDefault(); event.stopPropagation();
        if (typeof session !== "undefined" && session) {
          try {
            const rows = await cloudRequest("one_memories?select=id,title&deleted_at=is.null&order=created_at.desc&limit=40");
            const memory = rows?.[Number(row.dataset.memory)];
            if (!memory) return;
            if (!window.confirm(`Spostare “${memory.title || "questa nota"}” nel Cestino?`)) return;
            await softDeleteCloudById("memories", memory.id);
          } catch {}
        } else {
          const item = rawLocalActivities().find(x => String(x.id) === String(row.dataset.activity));
          if (item && window.confirm(`Spostare “${item.title || "questa nota"}” nel Cestino?`)) void moveEntryToTrash(localEntry("oneActivities", item));
        }
      });
      wrapper.appendChild(remove);
    });
    list.querySelectorAll("[data-activity]").forEach(row => {
      if (row.parentElement?.classList.contains("one-deletable-row")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "one-deletable-row";
      row.parentNode.insertBefore(wrapper, row);
      wrapper.appendChild(row);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "one-delete-btn";
      remove.setAttribute("aria-label", "Sposta nel Cestino");
      remove.textContent = "⌫";
      remove.onclick = event => {
        event.preventDefault(); event.stopPropagation();
        const item = rawLocalActivities().find(x => String(x.id) === String(row.dataset.activity));
        if (item && window.confirm(`Spostare “${item.title || "questo elemento"}” nel Cestino?`)) void moveEntryToTrash(localEntry("oneActivities", item));
      };
      wrapper.appendChild(remove);
    });
  };

  const decorateActivityList = () => {
    const list = document.getElementById("allActivities");
    if (!list) return;
    list.querySelectorAll("[data-activity]").forEach(row => {
      if (row.parentElement?.classList.contains("one-deletable-row")) return;
      const wrapper = document.createElement("div"); wrapper.className = "one-deletable-row";
      row.parentNode.insertBefore(wrapper, row); wrapper.appendChild(row);
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "one-delete-btn"; remove.textContent = "⌫";
      remove.setAttribute("aria-label", "Sposta attività nel Cestino");
      remove.onclick = event => {
        event.preventDefault(); event.stopPropagation();
        const item = rawLocalActivities().find(x => String(x.id) === String(row.dataset.activity));
        if (!item) return openManager("oneActivities");
        if (window.confirm(`Spostare “${item.title || "questa attività"}” nel Cestino?`)) void moveEntryToTrash(localEntry("oneActivities", item));
      };
      wrapper.appendChild(remove);
    });
  };

  const decorateReminders = () => {
    const list = document.getElementById("actionReminders");
    if (!list) return;
    list.querySelectorAll(".reminder-item").forEach(row => {
      if (row.querySelector(".one-reminder-delete")) return;
      const check = row.querySelector("[data-reminder]");
      if (!check) return;
      const remove = document.createElement("button");
      remove.type = "button"; remove.className = "one-reminder-delete"; remove.textContent = "⌫";
      remove.setAttribute("aria-label", "Sposta promemoria nel Cestino");
      remove.onclick = async event => {
        event.preventDefault(); event.stopPropagation();
        const id = check.dataset.reminder;
        if (typeof session !== "undefined" && session && !String(id).startsWith("local-")) {
          if (window.confirm("Spostare questo promemoria nel Cestino?")) await softDeleteCloudById("reminders", id);
        } else {
          const item = rawLocalReminders().find(x => String(x.id) === String(id));
          if (item && window.confirm(`Spostare “${item.title || "questo promemoria"}” nel Cestino?`)) void moveEntryToTrash(localEntry("reminders", item));
        }
      };
      row.appendChild(remove);
    });
  };

  const ensureSiteDeleteButton = () => {
    const header = document.querySelector("#siteView .site-view-header");
    if (!header) return;
    let button = document.getElementById("deleteCurrentSite");
    if (!button) {
      button = document.createElement("button");
      button.id = "deleteCurrentSite";
      button.type = "button";
      button.className = "one-site-delete";
      button.setAttribute("aria-label", "Sposta cantiere nel Cestino");
      header.appendChild(button);
    }
    button.innerHTML = "<span>⌫</span> Cestino";
    button.onclick = async () => {
      if (typeof selectedSiteId === "undefined" || !selectedSiteId || typeof session === "undefined" || !session) return;
      const site = typeof sitesCache !== "undefined" ? sitesCache.find(item => String(item.id) === String(selectedSiteId)) : null;
      const label = site ? `${site.job_number} · ${site.name}` : "questo cantiere";
      if (!window.confirm(`Spostare ${label} nel Cestino?\n\nSparirà dalle liste, ma potrai ripristinarlo con tutti i dati collegati.`)) return;
      await softDeleteCloudById("sites", selectedSiteId);
    };
  };

  const observer = new MutationObserver(() => {
    decorateRecall();
    decorateActivityList();
    decorateReminders();
    ensureSiteDeleteButton();
    ensureDrawerButton();
  });

  const start = () => {
    if (typeof renderActivities === "function") renderActivities();
    ensureManager();
    ensureDrawerButton();
    decorateRecall();
    decorateActivityList();
    decorateReminders();
    ensureSiteDeleteButton();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
