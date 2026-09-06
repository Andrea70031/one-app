(() => {
  const cleanAppUrl = () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    return url.href;
  };

  const showConfirmationNotice = (message, kind = "success") => {
    let notice = document.getElementById("authConfirmationNotice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "authConfirmationNotice";
      notice.className = "auth-confirmation-notice";
      notice.setAttribute("role", "status");
      document.body.appendChild(notice);
    }
    notice.classList.toggle("error", kind === "error");
    notice.innerHTML = `<span>${kind === "error" ? "!" : "✓"}</span><div><strong>${kind === "error" ? "Link non valido" : "Email confermata"}</strong><small>${message}</small></div>`;
    notice.classList.add("visible");
    window.setTimeout(() => notice.classList.remove("visible"), 8000);
  };

  const email = document.getElementById("authEmail");
  document.querySelectorAll("[data-email-domain]").forEach(button => {
    button.addEventListener("click", () => {
      if (!email) return;
      const domain = button.dataset.emailDomain || "";
      const current = email.value.trim();
      const localPart = current.includes("@") ? current.slice(0, current.indexOf("@")) : current;
      email.value = `${localPart}${domain}`;
      email.focus();
      if (!localPart) email.setSelectionRange(0, 0);
      else email.setSelectionRange(email.value.length, email.value.length);
      email.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });

  if (typeof authFetch === "function") {
    const baseAuthFetch = authFetch;
    authFetch = (path, body) => {
      if (path === "signup") {
        const redirect = encodeURIComponent(cleanAppUrl());
        return baseAuthFetch(`signup?redirect_to=${redirect}`, body);
      }
      return baseAuthFetch(path, body);
    };
  }

  const finishAuthReturn = async () => {
    if (!window.location.hash) return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const authType = params.get("type");

    if (errorCode || params.get("error")) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
      const expired = errorCode === "otp_expired" || /expired/i.test(errorDescription || "");
      showConfirmationNotice(
        expired ? "Questo link è già stato usato o è scaduto. Richiedi una nuova email di conferma." : (errorDescription || "Non è stato possibile verificare questo link."),
        "error"
      );
      return;
    }

    if (!accessToken || !refreshToken || authType !== "signup") return;

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!response.ok) throw new Error(`user_${response.status}`);
      const user = await response.json();
      const expiresIn = Number(params.get("expires_in") || 3600);
      saveSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: params.get("token_type") || "bearer",
        expires_in: expiresIn,
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        user
      });
      history.replaceState(null, "", window.location.pathname + window.location.search);
      showConfirmationNotice("Indirizzo verificato con successo. Il tuo account ONE è attivo e hai già effettuato l'accesso.");
      await syncFromCloud();
    } catch {
      history.replaceState(null, "", window.location.pathname + window.location.search);
      showConfirmationNotice("Indirizzo verificato. Ora puoi accedere a ONE con email e password.");
    }
  };

  const ensureStylesheet = (href, key) => {
    if (document.querySelector(`link[data-one-enhancements="${key}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.oneEnhancements = key;
    document.head.appendChild(link);
  };

  const ensureScript = (src, key) => {
    if (document.querySelector(`script[data-one-enhancements="${key}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset.oneEnhancements = key;
    document.head.appendChild(script);
  };

  const loadProductEnhancements = () => {
    ensureStylesheet("pwa-orb-motion.css?v=1", "orb-motion-style");
    ensureScript("checklist-enhancements.js?v=1", "checklist");
    ensureStylesheet("integrations-enhancements.css?v=1", "integrations-style");
    ensureScript("integrations-enhancements.js?v=1", "integrations");
    ensureScript("smart-action-enhancements.js?v=1", "smart-actions");
  };

  finishAuthReturn();
  loadProductEnhancements();
})();