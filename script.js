(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- theme ---------- */
  const isDark = () => {
    const set = root.getAttribute('data-theme');
    return set ? set === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  };
  const meta = $('meta[name="theme-color"]');
  const syncMeta = () => meta.setAttribute('content', isDark() ? '#111111' : '#f7f7f5');
  syncMeta();
  $('#theme').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('2x2-theme', next); } catch (e) {}
    syncMeta();
  });

  /* ---------- nav ---------- */
  const nav = $('#nav');
  let lastY = scrollY, ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      nav.classList.toggle('scrolled', y > 8);
      nav.classList.toggle('hide', y > lastY + 4 && y > 240);
      if (y < lastY - 4 || y < 240) nav.classList.remove('hide');
      lastY = y;
      ticking = false;
    });
  }, { passive: true });

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------- hero parallax ---------- */
  const art = $('#art');
  if (art && !reduced) {
    const mark = $('.art-mark', art);
    const layers = $$('.layer', art);
    let tx = 0, ty = 0, x = 0, y = 0, lastMove = -1e5, visible = true, raf;

    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
      ty = clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
      lastMove = performance.now();
    }, { passive: true });

    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    }).observe(art);

    function tick(now) {
      raf = 0;
      if (!visible) return;
      if (now - lastMove > 2500) {
        tx = Math.sin(now / 2600) * 0.55;
        ty = Math.cos(now / 3300) * 0.45;
      }
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      mark.style.transform = `translate3d(${x * 20}px, ${y * 20}px, 0) rotate(${x * 5}deg)`;
      layers.forEach((l) => {
        const d = +l.dataset.d;
        l.style.transform = `translate(${-x * d}px, ${-y * d}px)`;
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }

  /* ---------- idea sorter ---------- */
  const matrix = $('#matrix'), puck = $('#puck');
  const chips = $$('#chips button');
  const ro = { box: $('.readout'), idea: $('#ro-idea'), verdict: $('#ro-verdict'), note: $('#ro-note') };
  const quads = {
    hl: ['Do it this week', 'Little work, big payoff. These are rare, so we jump on them.'],
    hh: ['Build it properly', 'A lot of work, but worth it. This is where real products come from.'],
    ll: ['Weekend experiment', "Little work, little payoff. Fun to try, but it won't become a product."],
    lh: ['Politely pass', 'A lot of work for little payoff. We note it down and move on.'],
  };
  const special = { 'A gaming journal': 'A lot of work, but worth it. This is how Bifrost started.' };
  let pos = { x: 80, y: 68 }, name = 'A gaming journal', current = '', swapTimer;

  const quadOf = ({ x, y }) => (y >= 50 ? 'h' : 'l') + (x >= 50 ? 'h' : 'l');

  function render(animate) {
    if (animate) matrix.classList.add('moved');
    puck.style.left = pos.x + '%';
    puck.style.top = (100 - pos.y) + '%';
    const q = quadOf(pos);
    $$('.q', matrix).forEach((el) => el.classList.toggle('active', el.dataset.q === q));
    const key = q + '|' + name;
    if (key === current) return;
    current = key;
    const write = () => {
      ro.idea.textContent = name;
      ro.verdict.textContent = quads[q][0];
      ro.note.textContent = (!isCustom && special[name]) || quads[q][1];
    };
    if (!animate) return write();
    clearTimeout(swapTimer);
    ro.box.classList.add('swap');
    swapTimer = setTimeout(() => { write(); ro.box.classList.remove('swap'); }, 170);
  }
  let isCustom = false;

  chips.forEach((c) => c.addEventListener('click', () => {
    chips.forEach((o) => o.setAttribute('aria-checked', o === c));
    isCustom = false;
    name = c.dataset.name;
    pos = { x: +c.dataset.x, y: +c.dataset.y };
    render(true);
  }));

  const custom = () => {
    if (isCustom) return;
    isCustom = true;
    name = 'Your idea';
    chips.forEach((o) => o.setAttribute('aria-checked', 'false'));
  };

  const toPos = (e) => {
    const r = matrix.getBoundingClientRect();
    return {
      x: Math.round(clamp(((e.clientX - r.left) / r.width) * 100, 4, 96)),
      y: Math.round(clamp(100 - ((e.clientY - r.top) / r.height) * 100, 4, 96)),
    };
  };

  matrix.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.puck')) return;
    custom(); pos = toPos(e); render(true);
  });
  puck.addEventListener('pointerdown', (e) => {
    puck.setPointerCapture(e.pointerId);
    puck.classList.add('drag');
    custom(); pos = toPos(e); render(true);
  });
  puck.addEventListener('pointermove', (e) => {
    if (!puck.hasPointerCapture(e.pointerId)) return;
    pos = toPos(e); render(true);
  });
  const drop = (e) => { puck.classList.remove('drag'); if (puck.hasPointerCapture(e.pointerId)) puck.releasePointerCapture(e.pointerId); };
  puck.addEventListener('pointerup', drop);
  puck.addEventListener('pointercancel', drop);
  puck.addEventListener('keydown', (e) => {
    const step = 5, d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!d) return;
    e.preventDefault();
    custom();
    pos = { x: clamp(pos.x + d[0], 4, 96), y: clamp(pos.y + d[1], 4, 96) };
    render(true);
  });
  render(false);

  /* ---------- Bifrost screens ---------- */
  const feats = $('#feats'), rows = $$('li', feats), shots = $$('.shot');
  const body = $('.product-body');
  let idx = 0;

  function show(i) {
    if (i === idx) return;
    const prev = shots[idx], next = shots[i];
    prev.classList.remove('on'); prev.classList.add('out');
    next.style.transition = 'none';
    next.classList.remove('out');
    void next.offsetWidth;
    next.style.transition = '';
    next.classList.add('on');
    rows[idx].classList.remove('on');
    rows[i].classList.add('on');
    idx = i;
  }

  rows.forEach((li, i) => $('button', li).addEventListener('click', () => {
    feats.classList.remove('auto');
    show(i);
  }));
  feats.addEventListener('animationend', (e) => {
    if (e.animationName === 'fill') show((idx + 1) % rows.length);
  });

  if (!reduced) {
    new IntersectionObserver(([en]) => feats.classList.toggle('auto', en.isIntersecting && !feats.dataset.manual))
      .observe(body);
    $$('button', feats).forEach((b) => b.addEventListener('click', () => { feats.dataset.manual = '1'; }));
    body.addEventListener('pointerenter', () => feats.classList.add('paused'));
    body.addEventListener('pointerleave', () => feats.classList.remove('paused'));
  }

  /* ---------- open slots ---------- */
  $$('.slot:not(.filled)').forEach((s) => s.addEventListener('click', () => s.classList.toggle('flip')));
})();
