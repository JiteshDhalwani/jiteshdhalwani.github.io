(() => {
  const hero = document.querySelector('.hero');
  const cSky = hero && hero.querySelector('.fx-sky');
  const cAir = hero && hero.querySelector('.fx-air');
  if (!cSky || !cAir || !cSky.getContext) return;
  const sx = cSky.getContext('2d');
  const ax = cAir.getContext('2d');
  const moonEl = hero.querySelector('.moonwrap');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const moon = { x: 0, y: 0, r: 0 };
  let W = 0, H = 0, t = 0, last = 0, raf = 0, onScreen = true, skyClock = 1;
  let stars = [], flocks = [], meteors = [], nextFlock = 0, nextMeteor = rnd(3, 7);

  const sprite = (rgb) => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.16, `rgba(${rgb},.85)`);
    gr.addColorStop(0.42, `rgba(${rgb},.16)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 32, 32);
    return c;
  };
  const SPR = [sprite('238,241,255'), sprite('255,233,206'), sprite('205,219,255')];

  const grain = hero.querySelector('.grain');
  if (grain) {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    const d = g.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) {
      d.data[i] = d.data[i + 1] = d.data[i + 2] = 128 + (Math.random() - 0.5) * 150;
      d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    grain.style.backgroundImage = `url(${c.toDataURL()})`;
  }

  function layout() {
    const r = hero.getBoundingClientRect();
    W = r.width;
    H = r.height;
    const dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(5.5e6 / Math.max(1, W * H)));
    for (const [c, x] of [[cSky, sx], [cAir, ax]]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (moonEl) {
      const m = moonEl.getBoundingClientRect();
      moon.x = m.left - r.left + m.width / 2;
      moon.y = m.top - r.top + m.height / 2;
      moon.r = m.width * 0.23;
    }
    const n = Math.round(Math.min(230, Math.max(50, (W * H) / 10500)));
    stars = [];
    for (let i = 0; stars.length < n && i < n * 20; i++) {
      const x = Math.random() * W, y = Math.random() * H * 0.92;
      const d = Math.hypot(x - moon.x, y - moon.y) - moon.r;
      if (d < moon.r * 0.4 || Math.random() > Math.min(1, d / (moon.r * 3.2))) continue;
      const big = Math.random() < 0.05;
      stars.push({
        x, y,
        s: big ? rnd(5.5, 8.5) : rnd(1.8, 4.4),
        a: big ? rnd(0.75, 1) : rnd(0.28, 0.85),
        f: rnd(0.5, 2.2), p: rnd(0, TAU), k: big ? rnd(0.25, 0.45) : rnd(0.12, 0.6),
        spr: SPR[Math.random() < 0.72 ? 0 : Math.random() < 0.55 ? 1 : 2],
      });
    }
  }

  function drawSky() {
    sx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const tw = still ? 0.85 : 1 - s.k + s.k * (0.5 + 0.5 * Math.sin(t * s.f * TAU + s.p)) * (0.85 + 0.15 * Math.sin(t * 7.3 + s.p * 3));
      sx.globalAlpha = s.a * tw;
      sx.drawImage(s.spr, s.x - s.s / 2, s.y - s.s / 2, s.s, s.s);
    }
    sx.globalAlpha = 1;
    for (const m of meteors) {
      const p = m.age / m.dur, e = 1 - (1 - p) * (1 - p);
      const hx = m.x + m.dx * m.run * e, hy = m.y + m.dy * m.run * e;
      const tail = m.len * Math.min(1, p * 2.4);
      const tx = hx - m.dx * tail, ty = hy - m.dy * tail;
      const a = Math.sin(Math.PI * Math.min(1, p * 1.15)) * m.a;
      const g = sx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, 'rgba(235,240,255,0)');
      g.addColorStop(1, `rgba(245,247,255,${a})`);
      sx.strokeStyle = g;
      sx.lineWidth = m.w;
      sx.lineCap = 'round';
      sx.beginPath();
      sx.moveTo(tx, ty);
      sx.lineTo(hx, hy);
      sx.stroke();
      sx.globalAlpha = a;
      sx.drawImage(SPR[0], hx - 4, hy - 4, 8, 8);
      sx.globalAlpha = 1;
    }
  }

  function spawnMeteor() {
    for (let i = 0; i < 12; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = (0.5 + side * rnd(0.2, 0.46)) * W, y = rnd(0.04, 0.4) * H;
      if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 3) continue;
      const dir = side, ang = rnd(0.32, 0.7);
      const len = rnd(110, 230) * Math.min(1, W / 1100 + 0.25);
      meteors.push({ x, y, dx: Math.cos(ang) * dir, dy: Math.sin(ang), len, run: len * rnd(1.4, 2.1), dur: rnd(0.55, 0.95), age: 0, a: rnd(0.6, 0.95), w: rnd(1, 1.5) });
      return;
    }
  }

  const FAR = [30, 39, 84], NEAR = [4, 6, 15];
  function spawnFlock(initial) {
    const sc = Math.max(0.62, Math.min(1, W / 1300));
    const depth = Math.random();
    const size = (7 + depth * depth * 16) * sc;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const q = Math.random();
    const n = q < 0.22 ? 1 : q < 0.55 ? 2 + ((Math.random() * 3) | 0) : 4 + ((Math.random() * 4) | 0);
    let y0 = rnd(0.12, 0.5) * H;
    if (moon.r && Math.random() < 0.4) y0 = moon.y + rnd(-0.55, 0.55) * moon.r;
    const col = FAR.map((c, i) => Math.round(c + (NEAR[i] - c) * (0.4 + depth * 0.6)));
    const f = {
      dir, size, y0, x: initial ? W * (dir > 0 ? rnd(0.12, 0.38) : rnd(0.62, 0.88)) : dir > 0 ? -size * 4 : W + size * 4,
      v: size * rnd(2.7, 3.5) * (1 + depth * 0.35), bob: rnd(0.3, 1.1) * size, per: rnd(8, 15), ph: rnd(0, TAU),
      climb: rnd(-0.6, 0.6) * size, yaw: rnd(0.95, 1.35) * (Math.random() < 0.5 ? 1 : -1), fill: `rgb(${col})`, birds: [],
    };
    const gap = size * 2.5;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, rank = Math.ceil(i / 2);
      f.birds.push({
        ox: -rank * gap * rnd(0.8, 1.25), oy: side * rank * gap * rnd(0.3, 0.6), s: size * rnd(0.86, 1.12),
        ph: rnd(0, TAU), hz: rnd(2.5, 3.5), amp: 1, flap: 1, timer: rnd(0.4, 3), wx: rnd(0, TAU), wy: rnd(0, TAU),
      });
    }
    flocks.push(f);
  }

  const PITCH = 0.55;
  const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
  function shape(pts) {
    const n = pts.length;
    ax.beginPath();
    ax.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      ax.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ax.fill();
  }
  function drawBird(x, y, s, dir, yaw, ph, amp) {
    const sn = Math.sin(ph), up = Math.max(0, Math.cos(ph)) * amp;
    const ta = 0.12 + amp * 0.85 * sn;
    const th = ta + amp * 0.6 * Math.sin(ph - 0.9) - 0.06 - up * 0.45;
    const swa = 0.08 + up * 0.2, swh = 0.22 + up * 0.62, ch = 1 - up * 0.35, ext = 1 - up * 0.22;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const P = (X, Y, Z) => {
      const x1 = X * cy + Z * sy, z1 = Z * cy - X * sy;
      return [x + dir * x1 * s, y - (Y * cp + z1 * sp) * s];
    };
    for (const g of [-1, 1]) {
      const S = [0.02, 0, g * 0.05];
      const da = [-Math.sin(swa), Math.cos(swa) * Math.sin(ta), g * Math.cos(swa) * Math.cos(ta)];
      const Wr = [S[0] + 0.46 * da[0], S[1] + 0.46 * da[1], S[2] + 0.46 * da[2]];
      const dh = [-Math.sin(swh), Math.cos(swh) * Math.sin(th), g * Math.cos(swh) * Math.cos(th)];
      const L = 0.58 * ext;
      const T = [Wr[0] + L * dh[0], Wr[1] + L * dh[1], Wr[2] + L * dh[2]];
      const M1 = [(S[0] + Wr[0]) / 2, (S[1] + Wr[1]) / 2, (S[2] + Wr[2]) / 2];
      const M2 = [(Wr[0] + T[0]) / 2, (Wr[1] + T[1]) / 2, (Wr[2] + T[2]) / 2];
      shape([
        P(S[0] + 0.1, S[1], S[2]), P(M1[0] + 0.09, M1[1], M1[2]), P(Wr[0] + 0.05, Wr[1], Wr[2]), P(M2[0] + 0.02, M2[1], M2[2]),
        P(T[0], T[1], T[2]), P(T[0] - 0.1 * ch, T[1], T[2]), P(M2[0] - 0.26 * ch, M2[1], M2[2]), P(Wr[0] - 0.34 * ch, Wr[1], Wr[2]),
        P(M1[0] - 0.33 * ch, M1[1], M1[2]), P(S[0] - 0.3, S[1], S[2]),
      ]);
    }
    const N = P(0.42, 0, 0), B = P(-0.26, 0, 0);
    const lx = B[0] - N[0], ly = B[1] - N[1], l = Math.hypot(lx, ly) || 1;
    const nx = (-ly / l) * s, ny = (lx / l) * s;
    const at = (k, w) => [N[0] + lx * k + nx * w, N[1] + ly * k + ny * w];
    shape([at(-0.02, 0), at(0.06, 0.045), at(0.16, 0.06), at(0.3, 0.075), at(0.55, 0.085), at(0.85, 0.05), at(1, 0.03), at(1, -0.03), at(0.85, -0.05), at(0.55, -0.085), at(0.3, -0.075), at(0.16, -0.06), at(0.06, -0.045)]);
    shape([P(-0.2, 0, 0.05), P(-0.46, 0, 0.11), P(-0.42, 0, 0), P(-0.46, 0, -0.11), P(-0.2, 0, -0.05)]);
  }

  function drawAir(dt) {
    ax.clearRect(0, 0, W, H);
    for (let i = flocks.length - 1; i >= 0; i--) {
      const f = flocks[i];
      f.x += f.dir * f.v * dt;
      const prog = f.dir > 0 ? f.x / W : 1 - f.x / W;
      const ly = f.y0 + Math.sin((t / f.per) * TAU + f.ph) * f.bob + f.climb * prog * 4;
      let gone = true;
      ax.fillStyle = f.fill;
      for (const b of f.birds) {
        if (!still) {
          b.timer -= dt;
          if (b.timer <= 0) {
            b.flap = b.flap ? 0 : 1;
            b.timer = b.flap ? rnd(1.2, 3.4) : rnd(0.6, 1.7);
          }
          b.amp += (b.flap - b.amp) * Math.min(1, dt * 3.5);
          b.ph += dt * b.hz * TAU * (0.3 + 0.7 * b.amp);
        } else b.amp = 0;
        const bx = f.x + f.dir * (b.ox + Math.sin(t * 0.45 + b.wx) * f.size * 0.6);
        const by = ly + b.oy + Math.sin(t * 0.6 + b.wy) * f.size * 0.45 - b.amp * b.s * 0.1 * Math.cos(b.ph);
        if (f.dir > 0 ? bx < W + b.s * 3 : bx > -b.s * 3) gone = false;
        drawBird(bx, by, b.s, f.dir, f.yaw, b.ph, b.amp);
      }
      if (gone) flocks.splice(i, 1);
    }
  }

  const par = [];
  let px = 0, py = 0, tx = 0, ty = 0;
  if (!still && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    for (const [sel, d] of [['.fx-sky', 0.1], ['.moonwrap', 0.2], ['.drift2', 0.3], ['.clouds', 0.42], ['.fx-air', 0.55], ['.palm-tl', 0.95], ['.palm-br', 1.15]]) {
      hero.querySelectorAll(sel).forEach((el) => par.push([el, d]));
    }
    addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    t += dt;
    nextFlock -= dt;
    if (nextFlock <= 0 && flocks.length < 2) {
      spawnFlock(false);
      nextFlock = rnd(10, 22) * Math.min(1, 0.35 + W / 1400);
    }
    nextMeteor -= dt;
    if (nextMeteor <= 0) {
      spawnMeteor();
      nextMeteor = rnd(8, 18);
    }
    for (let i = meteors.length - 1; i >= 0; i--) if ((meteors[i].age += dt) >= meteors[i].dur) meteors.splice(i, 1);
    skyClock += dt;
    if (meteors.length || skyClock > 0.05) {
      drawSky();
      skyClock = 0;
    }
    drawAir(dt);
    if (par.length && (Math.abs(tx - px) > 0.0005 || Math.abs(ty - py) > 0.0005)) {
      px += (tx - px) * Math.min(1, dt * 2.5);
      py += (ty - py) * Math.min(1, dt * 2.5);
      for (const [el, d] of par) el.style.translate = `${(-px * 16 * d).toFixed(2)}px ${(-py * 9 * d).toFixed(2)}px`;
    }
    if (onScreen) raf = requestAnimationFrame(frame);
  }
  const start = () => {
    if (!raf && !still) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  function paintStill() {
    flocks = [];
    spawnFlock(true);
    drawSky();
    drawAir(0);
  }

  layout();
  if (still) paintStill();
  else {
    spawnFlock(true);
    nextFlock = rnd(5, 10);
    start();
  }
  new ResizeObserver(() => {
    layout();
    if (still) paintStill();
  }).observe(hero);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => {
      onScreen = e[e.length - 1].isIntersecting;
      if (onScreen) start();
    }).observe(hero);
  }
})();
