/* BoxBonus — real-time WebGL 3D layer (Three.js).
 * Presentation only. If WebGL or the CDN is unavailable this module simply
 * fails to load and the CSS 3D scene (design-3d.css) remains as fallback.
 *
 *  1. Global 3D world behind every page: gift boxes + coins that react to
 *     mouse, scroll speed, page-leave "warp" and success celebrations.
 *  2. Dashboard: interactive 3D gold coin (drag / click to spin).
 *  3. Admin: 3D radial bar-ring gauge for the redemption rate.
 *  4. Login / Register: interactive 3D gift box (drag, click to open).
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isLight = () => root.dataset.theme === 'light';
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------------- shared scheduler (one rAF for every scene) ---------------- */
const tickers = new Set();
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) { last = now; return; }
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickers.forEach(fn => fn(now / 1000, dt));
}
if (!reduced) requestAnimationFrame(frame);

/* ---------------- procedural studio environment for reflections ---------------- */
function makeEnv(renderer) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#d7ecff'); grad.addColorStop(0.45, '#fff3d6');
  grad.addColorStop(0.55, '#46507a'); grad.addColorStop(1, '#0d1230');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#ffffff';
  [[60, 40, 90, 34], [250, 26, 130, 30], [400, 62, 70, 26], [170, 112, 60, 18], [330, 120, 90, 14]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose(); pmrem.dispose();
  return env;
}

/* ---------------- materials + reusable builders ---------------- */
function makeMats() {
  const P = o => new THREE.MeshPhysicalMaterial(o);
  return {
    green: P({ color: 0x8edb5d, roughness: 0.3, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    lid: P({ color: 0xc8f7a1, roughness: 0.25, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15 }),
    gold: P({ color: 0xf2c65d, metalness: 1, roughness: 0.24, clearcoat: 0.5, envMapIntensity: 1.3 }),
    goldLight: P({ color: 0xffe6a0, metalness: 1, roughness: 0.18, envMapIntensity: 1.3 }),
    goldDark: P({ color: 0xa8731a, metalness: 1, roughness: 0.38, envMapIntensity: 1.1 }),
  };
}

function coinGeometries() {
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.22, a = Math.PI / 2 + i * Math.PI / 5;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) star.moveTo(x, y); else star.lineTo(x, y);
  }
  star.closePath();
  return {
    body: new THREE.CylinderGeometry(1, 1, 0.22, 56),
    rim: new THREE.TorusGeometry(0.84, 0.05, 10, 56),
    star: new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }),
  };
}

function buildCoin(M, geo) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo.body, M.gold); body.rotation.x = Math.PI / 2; g.add(body);
  [1, -1].forEach(side => {
    const rim = new THREE.Mesh(geo.rim, M.goldLight); rim.position.z = 0.112 * side; g.add(rim);
    const star = new THREE.Mesh(geo.star, M.goldDark);
    star.position.z = side === 1 ? 0.11 : -0.11;
    if (side === -1) star.rotation.y = Math.PI;
    g.add(star);
  });
  return g;
}

function buildGift(M) {
  const g = new THREE.Group();
  const add = (parent, geo, mat, pos) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); parent.add(m); return m; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  add(g, B(1.6, 1.2, 1.4), M.green, [0, 0, 0]);
  add(g, B(0.2, 1.22, 1.42), M.gold, [0, 0, 0]);
  add(g, B(1.62, 1.22, 0.2), M.gold, [0, 0, 0]);
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.6, -0.7); g.add(lidPivot);
  const lid = new THREE.Group(); lid.position.set(0, 0, 0.7); lidPivot.add(lid);
  add(lid, B(1.8, 0.28, 1.6), M.lid, [0, 0.14, 0]);
  add(lid, B(0.22, 0.3, 1.62), M.gold, [0, 0.14, 0]);
  add(lid, B(1.82, 0.3, 0.22), M.gold, [0, 0.14, 0]);
  const bow = new THREE.TorusGeometry(0.24, 0.065, 14, 36);
  const b1 = add(lid, bow, M.goldLight, [-0.2, 0.4, 0]); b1.rotation.z = 0.4; b1.scale.set(1.1, 0.75, 0.7);
  const b2 = add(lid, bow, M.goldLight, [0.2, 0.4, 0]); b2.rotation.z = -0.4; b2.scale.set(1.1, 0.75, 0.7);
  add(lid, new THREE.SphereGeometry(0.12, 24, 16), M.gold, [0, 0.38, 0]);
  return { group: g, lidPivot };
}

/* ---------------- generic interactive widget ---------------- */
function widget(canvas, setup, { fov = 35, z = 5 } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (err) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer);
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.set(0, 0, z);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.1));
  const key = new THREE.DirectionalLight(0xfff2d0, 2.4); key.position.set(-3, 5, 5); scene.add(key);

  const ptr = { rotY: 0, rotX: 0, vx: 0, down: false, hx: 0, hy: 0 };
  const M = makeMats();
  const api = setup({ scene, camera, M, ptr });
  camera.lookAt(0, 0, 0);

  let down = false, moved = false, lx = 0, ly = 0, visible = true;
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', e => { down = ptr.down = true; moved = false; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture?.(e.pointerId); canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    ptr.hx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ptr.hy = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!down) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    ptr.rotY += dx * 0.012; ptr.vx = dx * 0.012; ptr.rotX = clamp(ptr.rotX + dy * 0.008, -0.8, 0.8);
  });
  const release = () => { if (!down) return; down = ptr.down = false; canvas.style.cursor = 'grab'; if (!moved) api.click?.(); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { down = ptr.down = false; });
  canvas.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); api.click?.(); } });
  canvas.style.cursor = 'grab';

  const resize = () => {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (reduced) { api.update(0, 0, ptr); renderer.render(scene, camera); }
  };
  new ResizeObserver(resize).observe(canvas); resize();

  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: '80px' }).observe(canvas);
  const tick = (t, dt) => {
    if (!visible) return;
    if (!down) { ptr.rotY += ptr.vx; ptr.vx *= 0.94; ptr.rotX *= 0.97; }
    api.update(t, dt, ptr);
    renderer.render(scene, camera);
  };
  if (!reduced) tickers.add(tick);
  return { renderer, scene, camera };
}

/* ====================================================================== */
/* 1. GLOBAL 3D WORLD                                                      */
/* ====================================================================== */
function backgroundWorld() {
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-webgl';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
  catch (err) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const small = window.innerWidth < 700;
  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer);
  scene.fog = new THREE.FogExp2(0x0b1020, 0.04);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
  camera.position.set(0, 0, 8);

  const hemi = new THREE.HemisphereLight(0xdfffd0, 0x172039, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4d9, 2.2); sun.position.set(-4, 6, 6); scene.add(sun);
  const green = new THREE.PointLight(0x9bff63, 26, 18, 2); green.position.set(5, 1, 2); scene.add(green);
  const violet = new THREE.PointLight(0x9382ff, 22, 18, 2); violet.position.set(-5, -1, 2); scene.add(violet);

  const M = makeMats();
  const geo = coinGeometries();
  const items = [];
  const nBox = small ? 5 : 9, nCoin = small ? 8 : 16;

  let range = 12;
  const measure = () => {
    const pages = Math.max(1, document.documentElement.scrollHeight / window.innerHeight);
    range = Math.max(10, (pages - 1) * 7 + 10);
  };
  measure();

  const place = (obj, spreadX = true) => {
    const side = Math.random() < 0.5 ? -1 : 1;
    obj.position.set(spreadX ? side * rand(3.2, 9.5) : rand(-8, 8), rand(3.5, -range), rand(-12, -1.5));
  };
  for (let i = 0; i < nBox; i++) {
    const { group } = buildGift(M);
    const s = rand(0.45, 0.95); group.scale.setScalar(s);
    place(group); scene.add(group);
    items.push({ obj: group, w: new THREE.Vector3(rand(-0.4, 0.4), rand(-0.5, 0.5), rand(-0.25, 0.25)), phase: rand(0, 6.28), amp: rand(0.15, 0.4) });
  }
  for (let i = 0; i < nCoin; i++) {
    const coin = buildCoin(M, geo);
    coin.scale.setScalar(rand(0.28, 0.5));
    place(coin); scene.add(coin);
    items.push({ obj: coin, w: new THREE.Vector3(rand(-0.3, 0.3), rand(0.8, 1.8), rand(-0.2, 0.2)), phase: rand(0, 6.28), amp: rand(0.2, 0.5) });
  }
  items.forEach(it => { it.baseY = it.obj.position.y; it.obj.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6)); });

  // Star-dust particles spread through the whole depth/height of the world.
  const pCount = small ? 140 : 320;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) { pPos[i * 3] = rand(-12, 12); pPos[i * 3 + 1] = rand(5, -range - 3); pPos[i * 3 + 2] = rand(-14, 2); }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xd9ffbc, size: 0.045, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(pGeo, pMat));

  // Celebration burst pool (3D coins shot from the centre on success).
  const burst = [];
  const celebrate = () => {
    for (let i = 0; i < 26; i++) {
      const coin = buildCoin(M, geo); coin.scale.setScalar(rand(0.22, 0.4));
      coin.position.set(camera.position.x + rand(-1, 1), camera.position.y - 2, 1);
      scene.add(coin);
      burst.push({ obj: coin, v: new THREE.Vector3(rand(-3.2, 3.2), rand(5, 8.5), rand(-1, 2)), life: 0, spin: rand(4, 10) });
    }
    boost = 3;
  };
  window.addEventListener('boxbonus:celebrate', celebrate);

  // Interaction state
  let mx = 0, my = 0, boost = 0, warp = 0, scrollY = window.scrollY, scrollSmooth = scrollY;
  if (finePointer) window.addEventListener('pointermove', e => { mx = (e.clientX / window.innerWidth - 0.5) * 2; my = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
  window.addEventListener('boxbonus:leave', () => { warp = 1; });
  window.addEventListener('pageshow', () => { warp = 0; });

  const applyTheme = () => {
    const light = isLight();
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim() || (light ? '#f4f6fb' : '#0b1020');
    scene.fog.color.set(bg);
    renderer.toneMappingExposure = light ? 0.95 : 1.15;
    hemi.intensity = light ? 1.5 : 1.0;
    pMat.color.set(light ? 0x6aa84a : 0xd9ffbc);
    pMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; pMat.needsUpdate = true;
  };
  applyTheme();
  new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    measure();
    if (reduced) renderer.render(scene, camera);
  };
  window.addEventListener('resize', resize); resize();
  if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); }).observe(document.body);

  const tick = (t, dt) => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const sy = window.scrollY;
    boost = Math.max(boost * 0.93, Math.min(4, Math.abs(sy - scrollY) * 0.06));
    scrollY = sy;
    scrollSmooth += (sy - scrollSmooth) * 0.06;
    warp *= 0.96;

    const targetY = -(scrollSmooth / maxScroll) * Math.max(0, range - 6);
    camera.position.y += (targetY - camera.position.y) * 0.08;
    camera.position.x += (mx * 0.9 - camera.position.x) * 0.04;
    camera.position.z += ((8 - (warp > 0.02 ? 5 : 0)) - camera.position.z) * (warp > 0.02 ? 0.08 : 0.05);
    camera.lookAt(camera.position.x * 0.25, camera.position.y - my * 0.5, 0);

    items.forEach(it => {
      const k = 1 + boost;
      it.obj.rotation.x += it.w.x * dt * k;
      it.obj.rotation.y += it.w.y * dt * k;
      it.obj.rotation.z += it.w.z * dt * k;
      it.obj.position.y = it.baseY + Math.sin(t * 0.8 + it.phase) * it.amp;
    });
    green.intensity = 26 + Math.sin(t * 1.4) * 4;
    violet.intensity = 22 + Math.cos(t * 1.1) * 4;

    for (let i = burst.length - 1; i >= 0; i--) {
      const b = burst[i]; b.life += dt;
      b.v.y -= 9 * dt;
      b.obj.position.addScaledVector(b.v, dt);
      b.obj.rotation.x += b.spin * dt; b.obj.rotation.y += b.spin * 0.7 * dt;
      if (b.life > 2.6) { scene.remove(b.obj); burst.splice(i, 1); }
    }
    renderer.render(scene, camera);
  };
  if (reduced) renderer.render(scene, camera); else tickers.add(tick);

  root.classList.add('webgl-bg');
}

/* ====================================================================== */
/* 2. DASHBOARD COIN                                                       */
/* ====================================================================== */
function coinWidget() {
  const canvas = $('[data-three-coin]');
  if (!canvas) return;
  const ready = widget(canvas, ({ scene, M }) => {
    const geo = coinGeometries();
    const coin = buildCoin(M, geo);
    scene.add(coin);
    const green = new THREE.PointLight(0x9bff63, 18, 10, 2); green.position.set(2.4, 1.2, 2); scene.add(green);
    let impulse = 0, spin = 0;
    return {
      click() { impulse = 0.45; },
      update(t, dt, p) {
        spin += 0.012 + impulse; impulse *= 0.94;
        coin.rotation.y = p.rotY + spin;
        coin.rotation.x = p.rotX * 0.6 + Math.sin(t * 0.9) * 0.12;
        coin.position.y = Math.sin(t * 1.4) * 0.07;
      },
    };
  }, { fov: 32, z: 4.6 });
  if (ready) canvas.closest('.points-card')?.classList.add('has-3d');
  else canvas.remove();
}

/* ====================================================================== */
/* 3. ADMIN 3D RING GAUGE                                                  */
/* ====================================================================== */
function gaugeWidget() {
  const canvas = $('[data-three-gauge]');
  if (!canvas) return;
  const value = clamp(Number(canvas.dataset.value) || 0, 0, 100);
  const ready = widget(canvas, ({ scene, M }) => {
    const N = 60, bars = [];
    const ring = new THREE.Group(); scene.add(ring);
    const lit = new THREE.MeshStandardMaterial({ color: 0xa6f36b, emissive: 0x5ccf2b, emissiveIntensity: 0.75, metalness: 0.3, roughness: 0.35 });
    const dim = new THREE.MeshStandardMaterial({ color: 0x3a4a6b, metalness: 0.2, roughness: 0.6 });
    const geo = new THREE.BoxGeometry(0.09, 1, 0.16);
    for (let i = 0; i < N; i++) {
      const a = Math.PI / 2 - (i / N) * Math.PI * 2;
      const bar = new THREE.Mesh(geo, i < (value / 100) * N ? lit : dim);
      bar.position.set(Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0);
      bar.rotation.z = a - Math.PI / 2;
      ring.add(bar); bars.push(bar);
    }
    const base = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.012, 8, 120), new THREE.MeshBasicMaterial({ color: 0x9785ff, transparent: true, opacity: 0.4 }));
    ring.add(base);
    const glow = new THREE.PointLight(0x9bff63, 12, 8, 2); glow.position.set(0, 0, 2.5); scene.add(glow);
    const litCount = (value / 100) * N;
    return {
      update(t, dt, p) {
        const reveal = clamp((t - 0.4) / 1.8, 0, 1);
        const shown = reveal * litCount;
        const light = isLight();
        dim.color.set(light ? 0xb8c3dc : 0x3a4a6b);
        bars.forEach((bar, i) => {
          const isLit = i < litCount;
          let h = 0.16;
          if (isLit && i < shown) h = 0.78 + Math.sin(t * 2 + i * 0.35) * 0.07;
          else if (isLit) h = 0.16;
          bar.scale.y += (h - bar.scale.y) * 0.18;
        });
        ring.rotation.y = p.rotY * 0.6 + Math.sin(t * 0.6) * 0.35;
        ring.rotation.x = -0.35 + p.rotX * 0.5 + Math.sin(t * 0.45) * 0.06;
      },
    };
  }, { fov: 35, z: 6.8 });
  if (!ready) canvas.remove();
}

/* ====================================================================== */
/* 4. LOGIN / REGISTER GIFT BOX                                            */
/* ====================================================================== */
function miniGift() {
  const canvas = $('[data-three-mini]');
  if (!canvas) return;
  const wrap = canvas.closest('.mini-3d');
  const ready = widget(canvas, ({ scene, camera, M }) => {
    camera.position.set(3.4, 2.4, 5.4);
    const { group, lidPivot } = buildGift(M);
    scene.add(group);
    const geo = coinGeometries();
    const coins = Array.from({ length: 5 }, (_, i) => { const c = buildCoin(M, geo); c.scale.setScalar(0.2); c.userData.phase = i * 1.26; scene.add(c); return c; });
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x26384a, metalness: 0.8, roughness: 0.25, clearcoat: 1 }));
    pedestal.position.y = -0.72; scene.add(pedestal);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.02, 8, 80), new THREE.MeshBasicMaterial({ color: 0xa6f36b, transparent: true, opacity: 0.8 }));
    halo.rotation.x = Math.PI / 2; halo.position.y = -0.65; scene.add(halo);
    const l1 = new THREE.PointLight(0x9bff63, 22, 12, 2); l1.position.set(3, 1, -2); scene.add(l1);
    const l2 = new THREE.PointLight(0x9382ff, 18, 12, 2); l2.position.set(-3, 1, 1); scene.add(l2);
    let open = false, target = 0, auto = 0;
    return {
      click() { open = !open; target = open ? -1.15 : 0; },
      update(t, dt, p) {
        if (!p.down) auto += dt * 0.45;
        group.rotation.y = p.rotY + auto;
        group.rotation.x = p.rotX * 0.5;
        group.position.y = Math.sin(t * 1.2) * 0.07;
        lidPivot.rotation.x += (target - lidPivot.rotation.x) * 0.08;
        coins.forEach(c => {
          const a = t * 0.6 + c.userData.phase;
          c.position.set(Math.cos(a) * 1.9, 0.3 + Math.sin(a * 1.3) * 0.5, Math.sin(a) * 1.4);
          c.rotation.y = a * 2;
        });
        halo.rotation.z += 0.004;
      },
    };
  }, { fov: 34, z: 6 });
  if (ready) { wrap?.classList.add('is-ready'); wrap?.querySelector('.floating-box')?.remove(); }
  else if (wrap && !wrap.querySelector('.floating-box')) wrap.remove();
  else canvas.remove();
}

/* ---------------- boot ---------------- */
try {
  backgroundWorld();
  coinWidget();
  gaugeWidget();
  miniGift();
} catch (error) {
  console.warn('BoxBonus 3D layer unavailable; CSS 3D fallback in use.', error);
}
