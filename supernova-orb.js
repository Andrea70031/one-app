(() => {
  const orb = document.getElementById("orb");
  const navOrb = document.getElementById("navOrb");
  const core = orb?.querySelector(".orb-core");
  if (!orb || !navOrb || !core) return;

  const ensureSwirls = () => {
    if (core.querySelector(".supernova-swirl")) return;
    ["sn-a", "sn-b", "sn-c"].forEach(name => {
      const layer = document.createElement("div");
      layer.className = `supernova-swirl ${name}`;
      core.prepend(layer);
    });
  };

  const ensureParticles = () => {
    let field = orb.querySelector(":scope > .supernova-particles");
    if (field) return field;

    field = document.createElement("div");
    field.className = "supernova-particles";
    field.setAttribute("aria-hidden", "true");

    const colors = ["#55f7ff", "#43b8ff", "#6f79ff", "#bc5fff", "#ff62d5", "#ffd2a1"];
    const count = window.matchMedia("(max-width: 390px)").matches ? 22 : 28;

    for (let i = 0; i < count; i += 1) {
      const p = document.createElement("i");
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.32;
      const radius = 35 + Math.random() * 43;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      const size = 1.6 + Math.random() * 3.2;
      const drift = 4 + Math.random() * 12;
      const dx = `${Math.cos(angle + Math.PI / 2) * drift}px`;
      const dy = `${Math.sin(angle + Math.PI / 2) * drift}px`;
      const duration = `${2.6 + Math.random() * 3.8}s`;
      const delay = `${-Math.random() * 5}s`;
      const color = colors[Math.floor(Math.random() * colors.length)];

      p.style.setProperty("--x", `${x}%`);
      p.style.setProperty("--y", `${y}%`);
      p.style.setProperty("--s", `${size}px`);
      p.style.setProperty("--dx", dx);
      p.style.setProperty("--dy", dy);
      p.style.setProperty("--d", duration);
      p.style.setProperty("--delay", delay);
      p.style.setProperty("--c", color);
      field.appendChild(p);
    }

    orb.appendChild(field);
    return field;
  };

  const currentState = () => {
    for (const candidate of ["listening", "thinking", "done", "idle"]) {
      if (orb.classList.contains(candidate)) return candidate;
    }
    return "idle";
  };

  const syncNavState = () => {
    navOrb.dataset.oneState = currentState();
  };

  ensureSwirls();
  ensureParticles();
  syncNavState();

  const observer = new MutationObserver(syncNavState);
  observer.observe(orb, { attributes: true, attributeFilter: ["class"] });

  document.addEventListener("visibilitychange", () => {
    document.documentElement.classList.toggle("one-paused", document.hidden);
  });
})();
