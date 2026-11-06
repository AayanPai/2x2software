(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;

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
})();
