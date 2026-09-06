(() => {
  const orb = document.getElementById("orb");
  const navOrb = document.getElementById("navOrb");
  const core = orb?.querySelector(".orb-core");
  if (!orb || !navOrb || !core) return;

  const wave = document.getElementById("wave");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const STATES = {
    idle: { speed: 0.42, pull: 0.48, glow: 0.78, arms: 4, turbulence: 0.42, particles: 82, trail: 0.46 },
    listening: { speed: 0.76, pull: 0.68, glow: 1.03, arms: 4, turbulence: 0.72, particles: 108, trail: 0.62 },
    thinking: { speed: 1.26, pull: 0.98, glow: 1.34, arms: 5, turbulence: 1.08, particles: 138, trail: 0.78 },
    done: { speed: 0.64, pull: 0.58, glow: 1.15, arms: 4, turbulence: 0.56, particles: 96, trail: 0.58 }
  };

  const palette = [
    [77, 241, 255],
    [54, 180, 255],
    [93, 105, 255],
    [176, 83, 255],
    [245, 87, 211],
    [255, 151, 207]
  ];

  const makeCanvas = (className) => {
    const canvas = document.createElement("canvas");
    canvas.className = className;
    canvas.setAttribute("aria-hidden", "true");
    return canvas;
  };

  let mainCanvas = core.querySelector(".vortex-canvas");
  if (!mainCanvas) {
    mainCanvas = makeCanvas("vortex-canvas");
    core.prepend(mainCanvas);
  }

  let navCanvas = navOrb.querySelector(".vortex-nav-canvas");
  if (!navCanvas) {
    navCanvas = makeCanvas("vortex-nav-canvas");
    navOrb.prepend(navCanvas);
  }

  const mainCtx = mainCanvas.getContext("2d", { alpha: true });
  const navCtx = navCanvas.getContext("2d", { alpha: true });
  if (!mainCtx || !navCtx) return;

  let state = "idle";
  let lastTime = performance.now();
  let phase = 0;
  let raf = 0;
  let paused = document.hidden;

  const particleSets = { main: [], nav: [] };

  const currentState = () => {
    for (const candidate of ["listening", "thinking", "done", "idle"]) {
      if (orb.classList.contains(candidate)) return candidate;
    }
    return "idle";
  };

  const randomColor = () => palette[Math.floor(Math.random() * palette.length)];

  const createParticle = () => ({
    z: Math.random(),
    angle: Math.random() * Math.PI * 2,
    lane: 0.74 + Math.random() * 0.42,
    speed: 0.56 + Math.random() * 0.95,
    size: 0.65 + Math.random() * 1.65,
    alpha: 0.32 + Math.random() * 0.68,
    color: randomColor(),
    wobble: Math.random() * Math.PI * 2
  });

  const resetParticles = () => {
    const cfg = STATES[state];
    particleSets.main = Array.from({ length: cfg.particles }, createParticle);
    particleSets.nav = Array.from({ length: Math.max(26, Math.round(cfg.particles * 0.27)) }, createParticle);
  };

  const resizeCanvas = (canvas, ctx, cssSize) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.max(1, Math.round(cssSize));
    const px = Math.round(size * dpr);
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return size;
  };

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  const project = (cx, cy, R, z, angle, lane, time, turbulence) => {
    const depth = Math.max(0, Math.min(1, z));
    const near = Math.pow(depth, 0.78);
    const inner = R * 0.105;
    const outer = R * 0.84;
    const radius = inner + (outer - inner) * near * lane;
    const flatten = 0.48 + 0.31 * near;
    const sink = (1 - depth) * R * 0.055;
    const wobble = Math.sin(time * 0.0017 + angle * 1.8) * R * 0.012 * turbulence * (0.3 + near);
    return {
      x: cx + Math.cos(angle) * radius + wobble,
      y: cy + Math.sin(angle) * radius * flatten + sink,
      radius,
      near
    };
  };

  const drawAtmosphere = (ctx, cx, cy, R, cfg) => {
    const bg = ctx.createRadialGradient(cx, cy + R * 0.035, R * 0.015, cx, cy, R * 0.98);
    bg.addColorStop(0, "rgba(0,2,8,1)");
    bg.addColorStop(0.2, "rgba(4,9,22,0.99)");
    bg.addColorStop(0.55, "rgba(7,11,25,0.97)");
    bg.addColorStop(1, "rgba(2,4,9,1)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    const cyan = ctx.createRadialGradient(cx - R * 0.18, cy - R * 0.04, 0, cx - R * 0.18, cy, R * 0.78);
    cyan.addColorStop(0, `rgba(27,211,255,${0.08 * cfg.glow})`);
    cyan.addColorStop(1, "rgba(27,211,255,0)");
    ctx.fillStyle = cyan;
    ctx.fillRect(0, 0, R * 2, R * 2);

    const magenta = ctx.createRadialGradient(cx + R * 0.2, cy + R * 0.08, 0, cx + R * 0.2, cy, R * 0.8);
    magenta.addColorStop(0, `rgba(234,70,255,${0.07 * cfg.glow})`);
    magenta.addColorStop(1, "rgba(234,70,255,0)");
    ctx.fillStyle = magenta;
    ctx.fillRect(0, 0, R * 2, R * 2);
  };

  const drawTunnelRings = (ctx, cx, cy, R, cfg, time, mini) => {
    const rings = mini ? 18 : 36;
    for (let i = rings - 1; i >= 0; i -= 1) {
      const z = (i + 1) / rings;
      const p = project(cx, cy, R, z, phase * 0.52 + z * 2.6, 1, time, cfg.turbulence * 0.45);
      const rx = p.radius;
      const ry = p.radius * (0.48 + 0.3 * p.near);
      const c = palette[(i + Math.floor(phase * 1.4)) % palette.length];
      const alpha = (0.018 + 0.095 * Math.pow(p.near, 1.6)) * cfg.glow;
      ctx.save();
      ctx.translate(p.x - Math.cos(phase * 0.52 + z * 2.6) * p.radius, p.y - Math.sin(phase * 0.52 + z * 2.6) * p.radius * (0.48 + 0.3 * p.near));
      ctx.rotate(phase * 0.07 + z * 0.34);
      ctx.strokeStyle = rgba(c, alpha);
      ctx.lineWidth = mini ? 0.65 : 0.8 + p.near * 1.35;
      ctx.shadowBlur = mini ? 2 : 5 * cfg.glow;
      ctx.shadowColor = rgba(c, 0.3);
      ctx.beginPath();
      ctx.ellipse(0, (1 - z) * R * 0.035, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  const drawSpiralArms = (ctx, cx, cy, R, cfg, time, mini) => {
    const steps = mini ? 76 : 170;
    const arms = cfg.arms;
    const turns = state === "thinking" ? 4.15 : 3.55;

    for (let arm = 0; arm < arms; arm += 1) {
      const c = palette[(arm * 2 + (state === "thinking" ? 1 : 0)) % palette.length];
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let layer = 0; layer < (mini ? 1 : 2); layer += 1) {
        ctx.beginPath();
        for (let i = 0; i <= steps; i += 1) {
          const z = i / steps;
          const angularBoost = (1 - z) * (1 - z) * 2.5;
          const angle = phase * cfg.speed * 0.95 + arm * (Math.PI * 2 / arms) + z * turns * Math.PI * 2 + angularBoost;
          const lane = 0.88 + layer * 0.1 + 0.055 * Math.sin(z * 17 + arm * 1.7 + time * 0.0018);
          const p = project(cx, cy, R, z, angle, lane, time + arm * 311, cfg.turbulence);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = rgba(c, (mini ? 0.48 : 0.38 + layer * 0.13) * cfg.glow);
        ctx.lineWidth = mini ? 1.45 : 1.9 + layer * 1.4 + cfg.glow * 0.45;
        ctx.shadowBlur = mini ? 5 : 10 + 8 * cfg.glow;
        ctx.shadowColor = rgba(c, 0.7);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const drawParticles = (ctx, cx, cy, R, cfg, time, mini, dt) => {
    const set = mini ? particleSets.nav : particleSets.main;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const p of set) {
      const oldZ = p.z;
      const inward = dt * 0.000075 * cfg.pull * p.speed;
      p.z -= inward;
      if (p.z <= 0.015) {
        Object.assign(p, createParticle(), { z: 1 });
      }

      const angularSpeed = (0.55 + (1 - p.z) * 3.1) * cfg.speed * p.speed;
      p.angle += dt * 0.00042 * angularSpeed;
      p.wobble += dt * 0.0014;

      const cur = project(cx, cy, R, p.z, p.angle, p.lane, time + p.wobble * 130, cfg.turbulence);
      const prevAngle = p.angle - dt * 0.00042 * angularSpeed * (mini ? 1.5 : 2.3);
      const prev = project(cx, cy, R, Math.min(1, oldZ + inward * 2.8), prevAngle, p.lane, time - dt, cfg.turbulence);
      const size = (mini ? 0.45 : 0.75) * p.size * (0.35 + cur.near * 0.95);
      const alpha = p.alpha * (0.22 + cur.near * 0.78) * cfg.glow;

      ctx.strokeStyle = rgba(p.color, alpha * cfg.trail);
      ctx.lineWidth = Math.max(0.35, size * 0.72);
      ctx.shadowBlur = mini ? 3 : 7;
      ctx.shadowColor = rgba(p.color, 0.7);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();

      ctx.fillStyle = rgba(p.color, alpha);
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawCore = (ctx, cx, cy, R, cfg, mini) => {
    const holeR = R * (mini ? 0.13 : 0.115);
    const halo = ctx.createRadialGradient(cx, cy + R * 0.035, 0, cx, cy + R * 0.035, holeR * 2.8);
    halo.addColorStop(0, "rgba(0,0,0,1)");
    halo.addColorStop(0.48, "rgba(1,4,12,0.99)");
    halo.addColorStop(0.74, `rgba(35,86,160,${0.09 * cfg.glow})`);
    halo.addColorStop(1, "rgba(35,86,160,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy + R * 0.035, holeR * 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0,1,5,0.98)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + R * 0.04, holeR, holeR * 0.67, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawVortex = (ctx, canvas, cssSize, mini, time, dt) => {
    const size = resizeCanvas(canvas, ctx, cssSize);
    const cfg = STATES[state];
    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.985, 0, Math.PI * 2);
    ctx.clip();

    drawAtmosphere(ctx, cx, cy, R, cfg);
    drawTunnelRings(ctx, cx, cy, R, cfg, time, mini);
    drawSpiralArms(ctx, cx, cy, R, cfg, time, mini);
    drawParticles(ctx, cx, cy, R, cfg, time, mini, dt);
    drawCore(ctx, cx, cy, R, cfg, mini);

    ctx.restore();
  };

  const syncState = () => {
    const next = currentState();
    if (next === state) return;
    state = next;
    navOrb.dataset.oneState = state;
    if (wave) wave.dataset.oneState = state;
    resetParticles();
  };

  const frame = (time) => {
    if (paused) return;
    const dt = Math.min(36, Math.max(0, time - lastTime));
    lastTime = time;
    syncState();

    if (!reducedMotion.matches) phase += dt * 0.00125;

    const mainSize = Math.max(220, Math.round(core.getBoundingClientRect().width));
    const navSize = Math.max(48, Math.round(navOrb.getBoundingClientRect().width));
    drawVortex(mainCtx, mainCanvas, mainSize, false, time, reducedMotion.matches ? 0 : dt);
    drawVortex(navCtx, navCanvas, navSize, true, time, reducedMotion.matches ? 0 : dt);

    raf = requestAnimationFrame(frame);
  };

  const resume = () => {
    if (paused) return;
    cancelAnimationFrame(raf);
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  };

  resetParticles();
  navOrb.dataset.oneState = state;

  const observer = new MutationObserver(syncState);
  observer.observe(orb, { attributes: true, attributeFilter: ["class"] });

  document.addEventListener("visibilitychange", () => {
    paused = document.hidden;
    document.documentElement.classList.toggle("one-paused", paused);
    if (!paused) resume();
    else cancelAnimationFrame(raf);
  });

  reducedMotion.addEventListener?.("change", () => {
    lastTime = performance.now();
  });

  resume();
})();
