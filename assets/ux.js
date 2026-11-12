/* BoxBonus — 3D animation + validation UX layer.
 * Presentation and client-side validation only. The server re-validates every
 * field; nothing here is trusted for security. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* =====================================================
   * 1. 3D ambient scene: floating cubes, perspective floor
   * ===================================================== */
  (function buildScene() {
    const scene = document.createElement('div');
    scene.className = 'scene3d';
    scene.setAttribute('aria-hidden', 'true');
    const floor = document.createElement('div');
    floor.className = 'floor';
    scene.appendChild(floor);
    const defs = [
      { x: '7%',  y: '16%', s: '64px',  d: '26s', k: 14 },
      { x: '88%', y: '12%', s: '48px',  d: '32s', k: -10 },
      { x: '78%', y: '58%', s: '88px',  d: '38s', k: 22 },
      { x: '4%',  y: '66%', s: '56px',  d: '29s', k: -16 },
      { x: '46%', y: '8%',  s: '34px',  d: '24s', k: 8 },
      { x: '93%', y: '84%', s: '42px',  d: '34s', k: -20 },
    ];
    defs.forEach(def => {
      const layer = document.createElement('div');
      layer.className = 'layer';
      layer.style.setProperty('--k', def.k);
      const cube = document.createElement('div');
      cube.className = 'cube';
      cube.style.cssText = `--x:${def.x};--y:${def.y};--s:${def.s};--d:${def.d}`;
      for (let i = 0; i < 6; i++) cube.appendChild(document.createElement('i'));
      layer.appendChild(cube);
      scene.appendChild(layer);
    });
    document.body.appendChild(scene);

    if (reduced || !finePointer) return;
    let raf = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', e => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        scene.style.setProperty('--px', tx.toFixed(3));
        scene.style.setProperty('--py', ty.toFixed(3));
      });
    }, { passive: true });
  })();

  /* =====================================================
   * 2. Scroll progress bar
   * ===================================================== */
  (function scrollProgress() {
    if (reduced) return;
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = root.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  })();

  /* =====================================================
   * 3. 3D tilt + moving glare on panels / cards
   * ===================================================== */
  if (!reduced && finePointer) {
    $$('.panel, .how-step').forEach(card => {
      let raf = 0;
      card.addEventListener('pointermove', e => {
        if (card.matches(':focus-within')) return; // keep forms steady while typing
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          card.style.transitionDelay = '0ms';
          card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
          card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
          if (card.classList.contains('how-step')) return; // CSS handles its own hover
          card.style.transform = `perspective(1100px) rotateX(${((0.5 - py) * 5).toFixed(2)}deg) rotateY(${((px - 0.5) * 6).toFixed(2)}deg) translateY(-3px)`;
        });
      });
      card.addEventListener('pointerleave', () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        card.style.transform = '';
      });
    });
  }

  /* =====================================================
   * 4. Button ripple + theme switch flourish
   * ===================================================== */
  document.addEventListener('pointerdown', e => {
    const btn = e.target.closest('.btn');
    if (!btn || btn.disabled || reduced) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    btn.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove());
  });

  document.addEventListener('click', e => {
    const toggle = e.target.closest('.theme-toggle');
    if (!toggle) return;
    root.classList.add('theme-fade');
    if (!reduced) { toggle.classList.add('spin'); setTimeout(() => toggle.classList.remove('spin'), 650); }
    setTimeout(() => root.classList.remove('theme-fade'), 700);
  }, true);

  /* =====================================================
   * 5. Count-up numbers
   * ===================================================== */
  if (!reduced) {
    $$('.points-number, .metric-card strong, .big-rate').forEach(el => {
      const node = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.nodeValue));
      if (!node) return;
      const target = parseInt(node.nodeValue.replace(/[^\d]/g, ''), 10);
      if (!Number.isFinite(target) || target === 0) return;
      const original = node.nodeValue;
      const start = performance.now(), duration = Math.min(1500, 600 + target * 0.6);
      const fmt = new Intl.NumberFormat('en-US');
      const tick = now => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        node.nodeValue = fmt.format(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick); else node.nodeValue = original;
      };
      requestAnimationFrame(tick);
    });
  }

  /* =====================================================
   * 6. Flash notices: live region, auto-dismiss, confetti
   * ===================================================== */
  $$('.notice').forEach(notice => {
    notice.setAttribute('role', notice.classList.contains('error') ? 'alert' : 'status');
    if (notice.classList.contains('success')) {
      setTimeout(() => {
        notice.classList.add('is-leaving');
        notice.addEventListener('animationend', () => notice.remove(), { once: true });
        setTimeout(() => notice.remove(), 800);
      }, 7000);
      confetti();
    }
  });

  function confetti() {
    window.dispatchEvent(new Event('boxbonus:celebrate')); // 3D coin burst in the WebGL world
    if (reduced) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width = window.innerWidth * dpr;
    const h = canvas.height = window.innerHeight * dpr;
    const colors = ['#b9ff72', '#f2c65d', '#9c8bff', '#72e5ff', '#ffffff'];
    const pieces = Array.from({ length: 90 }, () => ({
      x: w * (0.3 + Math.random() * 0.4), y: h * 0.22,
      vx: (Math.random() - 0.5) * 15 * dpr, vy: (-Math.random() * 13 - 3) * dpr,
      s: (4 + Math.random() * 6) * dpr, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      c: colors[(Math.random() * colors.length) | 0], t: Math.random() * Math.PI * 2,
    }));
    const start = performance.now();
    (function frame(now) {
      const life = (now - start) / 2200;
      ctx.clearRect(0, 0, w, h);
      pieces.forEach(p => {
        p.vy += 0.42 * dpr; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.t += 0.2;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.scale(1, Math.cos(p.t)); // fake 3D flip
        ctx.globalAlpha = Math.max(0, 1 - life);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (life < 1) requestAnimationFrame(frame); else canvas.remove();
    })(start);
  }

  /* =====================================================
   * 7. Validation engine
   * ===================================================== */
  const enc = new TextEncoder();
  const fieldCounter = { n: 0 };

  const rules = {
    name(v) {
      v = v.trim();
      if (!v) return 'Enter your full name.';
      if ([...v].length < 2 || [...v].length > 80) return 'Name must be 2–80 characters.';
      if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'.\-]*$/u.test(v)) return "Name may contain letters, spaces, apostrophes, dots and hyphens only.";
      return '';
    },
    email(v) {
      v = v.trim();
      if (!v) return 'Enter your email address.';
      if (v.length > 190) return 'Email address is too long (190 characters max).';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || /\.\./.test(v)) return 'Enter a valid email address.';
      return '';
    },
    'password-new'(v) {
      if (!v) return 'Create a password.';
      if (v.length < 8) return 'Password must be at least 8 characters.';
      if (enc.encode(v).length > 72) return 'Password must be 72 bytes or fewer.';
      if (!/[A-Z]/.test(v)) return 'Add at least one uppercase letter.';
      if (!/[0-9]/.test(v)) return 'Add at least one number.';
      return '';
    },
    'password-current'(v) {
      if (!v) return 'Enter your password.';
      if (v.length > 1024) return 'Password is too long.';
      return '';
    },
    'password-confirm'(v, input) {
      const pw = $('[data-validate="password-new"]', input.form);
      if (!v) return 'Confirm your password.';
      if (pw && v !== pw.value) return 'Passwords do not match.';
      return '';
    },
    code(v) {
      if (!v) return 'Enter the 12-character code from inside your box.';
      if (v.length < 12) return `Code needs 12 characters — you have ${v.length}.`;
      if (!/^[A-Z0-9]{12}$/.test(v)) return 'Codes use letters and numbers only.';
      return '';
    },
    int(v, input) {
      const min = Number(input.min), max = Number(input.max);
      const label = input.dataset.label || 'Value';
      if (v.trim() === '') return `${label} is required.`;
      if (!/^\d+$/.test(v.trim())) return `${label} must be a whole number.`;
      const n = Number(v);
      if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
      return '';
    },
  };

  function ensureStructure(input) {
    if (input._ux) return input._ux;
    const ux = { touched: false };
    const isClaim = input.parentElement.classList.contains('claim-form');
    const control = document.createElement('span');
    control.className = 'field-control';
    input.parentElement.insertBefore(control, input);
    control.appendChild(input);
    const state = document.createElement('span');
    state.className = 'field-state';
    state.setAttribute('aria-hidden', 'true');
    control.appendChild(state);
    const msg = document.createElement('span');
    msg.className = 'field-msg';
    msg.id = `fmsg-${++fieldCounter.n}`;
    msg.setAttribute('role', 'status');
    msg.setAttribute('aria-live', 'polite');
    let host = control;
    if (isClaim) {
      host = document.createElement('div');
      host.className = 'claim-field';
      control.parentElement.insertBefore(host, control);
      host.appendChild(control);
      const meter = document.createElement('span');
      meter.className = 'code-meter';
      meter.innerHTML = '<b></b>';
      host.appendChild(meter);
      ux.meter = meter;
    }
    host.insertAdjacentElement(isClaim ? 'beforeend' : 'afterend', msg);
    ux.control = control; ux.msg = msg;
    input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), msg.id].filter(Boolean).join(' '));
    input._ux = ux;
    return ux;
  }

  function show(input, text, kind) {
    const ux = ensureStructure(input);
    input.classList.toggle('is-invalid', kind === 'error');
    input.classList.toggle('is-valid', kind === 'ok');
    if (kind === 'error') input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    ux.msg.className = 'field-msg' + (text ? ' show' : '') + (kind === 'error' ? ' is-error' : kind === 'ok' ? ' is-ok' : ' is-warn');
    ux.msg.textContent = text || '';
    if (kind === 'error' && !reduced) { input.style.animation = 'none'; void input.offsetWidth; input.style.animation = ''; }
  }

  function check(input, { quiet = false } = {}) {
    const type = input.dataset.validate;
    const rule = rules[type];
    if (!rule) return true;
    const ux = ensureStructure(input);
    const value = input.value;
    const message = rule(value, input);
    if (message) {
      if (!quiet || ux.touched) show(input, message, 'error');
      return false;
    }
    if (ux.touched && value !== '') show(input, input.dataset.okText || '', 'ok');
    else show(input, '', '');
    return true;
  }

  function wireField(input) {
    const ux = ensureStructure(input);
    const type = input.dataset.validate;

    // Browser-native bubbles are replaced by our inline messages.
    input.form?.setAttribute('novalidate', '');

    if (type === 'code') {
      const normalize = () => {
        const clean = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
        if (clean !== input.value) input.value = clean;
        const pct = (clean.length / 12) * 100;
        const bar = ux.meter?.firstElementChild;
        if (bar) bar.style.width = pct + '%';
        ux.meter?.classList.toggle('full', clean.length === 12);
      };
      input.addEventListener('input', () => { normalize(); if (ux.touched || input.value.length === 12) { ux.touched = true; check(input); } });
      normalize();
    } else {
      input.addEventListener('input', () => {
        if (ux.touched || input.classList.contains('is-invalid')) check(input);
        if (type === 'password-new') {
          updateStrength(input);
          const confirm = $('[data-validate="password-confirm"]', input.form);
          if (confirm && confirm._ux?.touched) check(confirm);
        }
      });
    }
    input.addEventListener('blur', () => {
      if (input.value === '' && !ux.touched) return; // don't nag on a simple tab-through
      ux.touched = true; check(input);
    });

    if (type.startsWith('password')) enhancePassword(input, ux);
    if (type === 'password-new') buildStrength(input, ux);

    // Server-side errors (rendered by PHP) become inline field errors too.
    const serverError = input.dataset.serverError;
    if (serverError) { ux.touched = true; show(input, serverError, 'error'); }
  }

  /* --- Password helpers: show/hide, caps-lock, strength --- */
  function enhancePassword(input, ux) {
    ux.control.classList.add('has-toggle');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pw-toggle';
    toggle.textContent = 'SHOW';
    toggle.setAttribute('aria-label', 'Show password');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      toggle.textContent = showing ? 'SHOW' : 'HIDE';
      toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      toggle.setAttribute('aria-pressed', String(!showing));
      input.focus();
    });
    ux.control.appendChild(toggle);

    const caps = document.createElement('span');
    caps.className = 'caps-warning';
    caps.textContent = '⇪ Caps Lock is on';
    ux.control.insertAdjacentElement('afterend', caps);
    const handler = e => { if (typeof e.getModifierState === 'function') caps.classList.toggle('show', e.getModifierState('CapsLock')); };
    input.addEventListener('keydown', handler);
    input.addEventListener('keyup', handler);
    input.addEventListener('blur', () => caps.classList.remove('show'));
  }

  function buildStrength(input, ux) {
    const meter = document.createElement('div');
    meter.className = 'strength';
    meter.dataset.score = '0';
    meter.innerHTML = '<i></i><i></i><i></i><i></i>';
    const label = document.createElement('span');
    label.className = 'strength-label';
    label.setAttribute('aria-live', 'polite');
    const list = document.createElement('ul');
    list.className = 'checklist';
    list.innerHTML = '<li data-r="len">8+ characters</li><li data-r="upper">Uppercase letter</li><li data-r="digit">A number</li><li data-r="bonus">12+ chars or symbol</li>';
    ux.msg.insertAdjacentElement('afterend', list);
    list.insertAdjacentElement('beforebegin', label);
    label.insertAdjacentElement('beforebegin', meter);
    ux.strength = { meter, label, list };
    updateStrength(input);
  }

  function updateStrength(input) {
    const s = input._ux?.strength; if (!s) return;
    const v = input.value;
    const met = {
      len: v.length >= 8,
      upper: /[A-Z]/.test(v),
      digit: /[0-9]/.test(v),
      bonus: v.length >= 12 || /[^A-Za-z0-9]/.test(v),
    };
    const score = v ? Object.values(met).filter(Boolean).length : 0;
    s.meter.dataset.score = String(score);
    s.label.textContent = v ? ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score] : '';
    $$('li', s.list).forEach(li => li.classList.toggle('met', met[li.dataset.r]));
  }

  /* --- Wire every field and every form --- */
  $$('[data-validate]').forEach(wireField);

  // Mark required fields visibly (decorative asterisk; aria-required carries the semantics).
  $$('[data-validate][required]').forEach(input => {
    input.setAttribute('aria-required', 'true');
    const label = input.closest('label');
    const textNode = label && [...label.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
    if (textNode && !label.querySelector('.req')) {
      const star = document.createElement('span');
      star.className = 'req'; star.setAttribute('aria-hidden', 'true'); star.textContent = '*';
      textNode.after(star);
    }
  });

  $$('form').forEach(form => {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', event => {
      if (event.defaultPrevented) return; // e.g. user cancelled a confirm() dialog
      if (form.dataset.submitting === '1') { event.preventDefault(); return; }

      const fields = $$('[data-validate]', form);
      let firstBad = null;
      fields.forEach(input => {
        ensureStructure(input).touched = true;
        if (!check(input) && !firstBad) firstBad = input;
      });
      if (firstBad) {
        event.preventDefault();
        firstBad.focus({ preventScroll: false });
        firstBad.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        return;
      }

      // Valid: lock the form to stop double submissions, show a spinner.
      form.dataset.submitting = '1';
      const submitter = event.submitter || $('button[type=submit], button:not([type])', form);
      setTimeout(() => { // after the browser has captured the submitter's name/value
        $$('button[type=submit], button:not([type])', form).forEach(btn => {
          if (!btn.disabled) { btn.disabled = true; btn.dataset.uxLocked = '1'; }
        });
        if (submitter) {
          submitter.dataset.original = submitter.innerHTML;
          submitter.classList.add('is-loading');
          submitter.innerHTML = '<span class="spin" aria-hidden="true"></span><span>Please wait…</span>';
        }
      }, 0);
    });
  });


  /* =====================================================
   * 8. 3D page transitions (+ WebGL "warp" via event)
   * ===================================================== */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    let url; try { url = new URL(a.href, location.href); } catch { return; }
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    if (reduced) return;
    e.preventDefault();
    document.body.classList.add('page-leave');
    window.dispatchEvent(new Event('boxbonus:leave'));
    setTimeout(() => { location.href = a.href; }, 430);
  });
  window.addEventListener('pageshow', () => document.body.classList.remove('page-leave'));

  /* =====================================================
   * 9. Scroll-driven 3D (landing page sections)
   * ===================================================== */
  (function scroll3d() {
    if (reduced) return;
    const els = $$('.step-visual, .landing-banner, .section-intro');
    if (!els.length) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      els.forEach(el => {
        const r = el.getBoundingClientRect();
        const c = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        el.style.setProperty('--p', clamp(c, -1, 1).toFixed(3));
      });
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  // Back/forward cache: restore buttons if the user returns to a submitted page.
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    $$('form').forEach(form => {
      delete form.dataset.submitting;
      $$('button', form).forEach(btn => {
        if (btn.dataset.uxLocked) { btn.disabled = false; delete btn.dataset.uxLocked; }
        btn.classList.remove('is-loading');
        if (btn.dataset.original) { btn.innerHTML = btn.dataset.original; delete btn.dataset.original; }
      });
    });
  });
})();
