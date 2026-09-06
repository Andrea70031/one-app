(() => {
  const confirmDelete = (message) => window.confirm(message);

  const deleteCloudMemoryByIndex = async (index) => {
    if (!session) return;
    try {
      const rows = await cloudRequest("one_memories?select=id,title&order=created_at.desc&limit=40");
      const memory = rows?.[index];
      if (!memory) return toast("Nota non trovata");
      if (!confirmDelete(`Eliminare definitivamente \"${memory.title || "questa nota"}\"?`)) return;
      const deleted = await cloudRequest(`one_memories?id=eq.${encodeURIComponent(memory.id)}&select=id`, { method: "DELETE" });
      if (!Array.isArray(deleted) || deleted.length === 0) throw new Error("delete_denied");
      toast("Nota eliminata");
      await loadCloudMemories();
      await syncFromCloud().catch(() => undefined);
      decorateRecall();
    } catch {
      toast("Non riesco a eliminare questa nota");
    }
  };

  const deleteLocalActivity = (id, title) => {
    if (!confirmDelete(`Eliminare definitivamente \"${title || "questa nota"}\" da questo dispositivo?`)) return;
    const next = getLocalActivities().filter((item) => String(item.id) !== String(id));
    saveLocalActivities(next);
    renderActivities();
    toast("Nota eliminata");
    decorateRecall();
  };

  function decorateRecall() {
    const list = document.getElementById("recallList");
    if (!list) return;

    list.querySelectorAll("[data-memory]").forEach((row) => {
      if (row.parentElement?.classList.contains("one-deletable-row")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "one-deletable-row";
      row.parentNode.insertBefore(wrapper, row);
      wrapper.appendChild(row);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "one-delete-btn";
      remove.setAttribute("aria-label", "Elimina nota");
      remove.textContent = "⌫";
      remove.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteCloudMemoryByIndex(Number(row.dataset.memory));
      });
      wrapper.appendChild(remove);
    });

    list.querySelectorAll("[data-activity]").forEach((row) => {
      if (row.parentElement?.classList.contains("one-deletable-row")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "one-deletable-row";
      row.parentNode.insertBefore(wrapper, row);
      wrapper.appendChild(row);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "one-delete-btn";
      remove.setAttribute("aria-label", "Elimina nota");
      remove.textContent = "⌫";
      remove.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const item = getLocalActivities().find((entry) => String(entry.id) === String(row.dataset.activity));
        deleteLocalActivity(row.dataset.activity, item?.title || "questa nota");
      });
      wrapper.appendChild(remove);
    });
  }

  const ensureSiteDeleteButton = () => {
    const header = document.querySelector("#siteView .site-view-header");
    if (!header || document.getElementById("deleteCurrentSite")) return;
    const button = document.createElement("button");
    button.id = "deleteCurrentSite";
    button.type = "button";
    button.className = "one-site-delete";
    button.setAttribute("aria-label", "Elimina cantiere");
    button.innerHTML = "<span>⌫</span> Elimina";
    header.appendChild(button);

    button.addEventListener("click", async () => {
      if (!selectedSiteId || !session) return;
      const site = sitesCache.find((item) => item.id === selectedSiteId);
      const label = site ? `${site.job_number} · ${site.name}` : "questo cantiere";
      const accepted = confirmDelete(`Eliminare definitivamente ${label}?\n\nVerranno eliminati anche problemi, attività, report, promemoria e note collegati al cantiere.`);
      if (!accepted) return;
      if (!confirmDelete("Conferma definitiva: questa operazione non può essere annullata.")) return;

      button.disabled = true;
      button.textContent = "Eliminazione…";
      try {
        const deleted = await cloudRequest(`sites?id=eq.${encodeURIComponent(selectedSiteId)}&select=id`, { method: "DELETE" });
        if (!Array.isArray(deleted) || deleted.length === 0) throw new Error("delete_denied");
        selectedSiteId = null;
        toast("Cantiere eliminato");
        await loadWorkspaces();
        navigate("spaces", true);
      } catch {
        toast("Non puoi eliminare questo cantiere o l'operazione non è riuscita");
      } finally {
        button.disabled = false;
        button.innerHTML = "<span>⌫</span> Elimina";
      }
    });
  };

  const observer = new MutationObserver(() => {
    decorateRecall();
    ensureSiteDeleteButton();
  });

  const start = () => {
    decorateRecall();
    ensureSiteDeleteButton();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
