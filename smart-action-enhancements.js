(() => {
  let lastPrompt = "";
  const ACTION_STYLE = "border:1px solid rgba(121,231,199,.24);background:rgba(121,231,199,.08);color:#8be9cf;border-radius:999px;padding:9px 12px;font-size:12px";

  function normalize(value = "") {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function configuredShortcuts() {
    try {
      return window.ONEIntegrations?.getShortcuts?.() || [];
    } catch {
      return [];
    }
  }

  function findMatchingShortcut(prompt = "") {
    const text = normalize(prompt);
    if (!text) return null;
    const items = configuredShortcuts();
    let best = null;
    let bestScore = 0;
    for (const item of items) {
      const candidates = [item.label, item.name].map(normalize).filter(Boolean);
      for (const candidate of candidates) {
        let score = 0;
        if (text === candidate) score = 100;
        else if (text.includes(candidate) && candidate.length >= 5) score = 85;
        else if (candidate.includes(text) && text.length >= 5) score = 70;
        if (score > bestScore) {
          bestScore = score;
          best = item;
        }
      }
    }
    return bestScore >= 70 ? best : null;
  }

  function addSmartAction(prompt) {
    const item = findMatchingShortcut(prompt);
    if (!item || typeof resultTarget !== "function") return;
    const target = resultTarget();
    if (!target || target.dataset.smartActionAdded === item.id) return;
    const wrap = target.querySelector(".result-action")?.parentElement;
    if (!wrap) return;
    target.dataset.smartActionAdded = item.id;
    const button = document.createElement("button");
    button.className = "result-action";
    button.style.cssText = ACTION_STYLE;
    button.textContent = `Esegui · ${item.label || item.name}`;
    button.onclick = () => {
      const label = item.label || item.name;
      if (!confirm(`Casa smart\n\nEseguire “${label}”?`)) return;
      window.ONEIntegrations?.runShortcut?.(item);
    };
    wrap.prepend(button);
  }

  function enhanceAskOne() {
    if (typeof askONE !== "function" || askONE.__oneSmartPromptEnhanced) return;
    const base = askONE;
    const enhanced = async function(payload, source) {
      if (payload?.text) lastPrompt = String(payload.text);
      return base(payload, source);
    };
    enhanced.__oneSmartPromptEnhanced = true;
    try { askONE = enhanced; } catch {}
    try { window.askONE = enhanced; } catch {}
  }

  function enhanceResults() {
    if (typeof showAIResult !== "function" || showAIResult.__oneSmartResultEnhanced) return;
    const base = showAIResult;
    const enhanced = function(result, source) {
      base(result, source);
      requestAnimationFrame(() => addSmartAction(lastPrompt));
    };
    enhanced.__oneSmartResultEnhanced = true;
    try { showAIResult = enhanced; } catch {}
    try { window.showAIResult = enhanced; } catch {}
  }

  enhanceAskOne();
  enhanceResults();
})();
