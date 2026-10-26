(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tactile = matchMedia('(hover: none)').matches;

  /* ── En-tête : fond au défilement, masqué en descente ── */
  const entete = $('#entete');
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    entete.classList.toggle('is-scrolled', y > 60);
    entete.classList.toggle('is-hidden', y > 500 && y > lastY + 4);
    if (y < lastY - 4) entete.classList.remove('is-hidden');
    document.documentElement.classList.toggle('entete-cache', entete.classList.contains('is-hidden'));
    lastY = y;
  }, { passive: true });

  /* ── Menu mobile ── */
  const burger = $('#burger');
  burger.addEventListener('click', () => {
    const o = document.body.classList.toggle('menu-ouvert');
    burger.setAttribute('aria-expanded', o);
  });
  $$('#volet a').forEach(a => a.addEventListener('click', () => { document.body.classList.remove('menu-ouvert'); burger.setAttribute('aria-expanded', false); }));

  /* ── Titres découpés mot à mot ── */
  $$('.sp').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(t => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.append(' '); return; }
            const m = document.createElement('span'); m.className = 'm';
            const s = document.createElement('span'); s.textContent = t; s.style.setProperty('--i', i++);
            m.append(s); frag.append(m);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
  });

  /* ── Révélations à l’entrée dans l’écran ── */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('.rv, .sp').forEach(el => io.observe(el));
  const pio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { $$('.img-rv', e.target).forEach(i => i.classList.add('in')); pio.unobserve(e.target); } }), { threshold: .1 });
  new Set($$('.img-rv').map(i => i.parentElement)).forEach(p => pio.observe(p));
  const cercle = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-circled'); }), { threshold: .6 });
  $$('.mot.is-circle').forEach(el => cercle.observe(el));

  /* ── Hero : slides, flèches, glisser, clavier ── */
  const hero = $('#hero');
  const slides = hero ? $$('.slide', hero) : [];

  let cur = 0, timer, anim = false;
  const DUREE = 7000;
  const aller = (n, dir) => {
    if (anim) return;
    n = (n + slides.length) % slides.length;
    if (n === cur) return;
    anim = true;
    const from = slides[cur], to = slides[n];
    dir = dir || (n > cur ? 1 : -1);
    slides.forEach(s => s.classList.remove('is-prev', 'is-back'));
    from.classList.remove('is-active'); from.classList.add('is-prev');
    if (dir < 0) { to.style.transition = 'none'; to.classList.add('is-back'); to.getBoundingClientRect(); to.style.transition = ''; to.classList.remove('is-back'); }
    to.classList.add('is-active');
    cur = n; hero.dataset.s = n;
    setTimeout(() => { from.classList.remove('is-prev'); anim = false; }, 1100);
    lancer();
  };
  const lancer = () => {
    clearTimeout(timer);
    if (reduit) return;
    timer = setTimeout(() => aller(cur + 1, 1), DUREE);
  };
  if (hero) {
    $('#suiv').addEventListener('click', () => aller(cur + 1, 1));
    $('#prec').addEventListener('click', () => aller(cur - 1, -1));
    addEventListener('keydown', e => { if (scrollY < innerHeight) { if (e.key === 'ArrowRight') aller(cur + 1, 1); if (e.key === 'ArrowLeft') aller(cur - 1, -1); } });
    let sx = null;
    hero.addEventListener('pointerdown', e => { if (e.target.closest('a,button')) return; sx = e.clientX; });
    addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) aller(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    lancer();
  }

  /* ── Rails horizontaux : glisser à la souris + barre de progression ── */
  $$('.rail').forEach(r => {
    let down = false, x0 = 0, s0 = 0, moved = 0;
    r.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') return; down = true; moved = 0; x0 = e.clientX; s0 = r.scrollLeft; });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - x0; moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) r.classList.add('is-drag');
      r.scrollLeft = s0 - dx;
    });
    addEventListener('pointerup', () => { down = false; setTimeout(() => r.classList.remove('is-drag'), 30); });
    r.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; if (!r.matches(':hover') || e.shiftKey) return; }, { passive: true });
  });
  const rh = $('#rail-histoire'), ph = $('#progres-histoire');
  if (rh && ph) {
    const maj = () => { const m = rh.scrollWidth - rh.clientWidth; ph.style.transform = `translateX(${(rh.scrollLeft / m) * 400}%)`; };
    rh.addEventListener('scroll', maj, { passive: true }); maj();
  }

  /* ── Curseur ── */
  const cur_ = $('#curseur');
  if (!tactile && !reduit) {
    let tx = 0, ty = 0, x = 0, y = 0;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur_.classList.add('on'); });
    const boucle = () => { x += (tx - x) * .2; y += (ty - y) * .2; cur_.style.transform = `translate(${x}px,${y}px)`; requestAnimationFrame(boucle); };
    boucle();
    const lab = cur_.firstElementChild;
    document.addEventListener('pointerover', e => {
      const r = e.target.closest('[data-curseur]');
      const l = e.target.closest('a,button,.mot');
      cur_.classList.toggle('est-label', !!r && !l);
      cur_.classList.toggle('est-lien', !!l && !r);
      lab.textContent = r ? r.dataset.curseur : '';
    });
    document.addEventListener('pointerleave', () => cur_.classList.remove('on'));
  }

  /* ── Image qui suit la souris : nuage de mots + marchés ── */
  const survol = $('#survol');
  if (survol) {
    const imgs = {};
    $$('#nuage .mot, .marche[data-img]').forEach(m => {
      const im = new Image(); im.src = m.dataset.img; im.alt = ''; survol.append(im); imgs[m.dataset.img] = im;
      m.addEventListener('mouseenter', () => { $$('img', survol).forEach(i => i.classList.remove('on')); im.classList.add('on'); survol.classList.add('on'); });
      m.addEventListener('mouseleave', () => survol.classList.remove('on'));
    });
    let sx_ = 0, sy_ = 0, px = 0, py = 0;
    addEventListener('pointermove', e => { sx_ = e.clientX; sy_ = e.clientY; });
    (function suit() { px += (sx_ - px) * .14; py += (sy_ - py) * .14; survol.style.left = px + 'px'; survol.style.top = py + 'px'; requestAnimationFrame(suit); })();
  }

  /* ── Hero : l’image suit doucement la souris ── */
  if (!tactile && !reduit) {
    if (hero) hero.addEventListener('pointermove', e => {
      const x = (e.clientX / innerWidth - .5) * -26, y = (e.clientY / innerHeight - .5) * -16;
      $$('.slide__img', hero).forEach(i => i.style.translate = `${x}px ${y}px`);
    });
    $$('.btn:not(.btn--petit), .fleche').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
      b.addEventListener('pointerleave', () => b.style.transform = '');
    });
  }

  /* ── Parallaxe douce ── */
  const par = $$('[data-par]');
  const tick = () => {
    const vh = innerHeight;
    par.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.translate = `0 ${p * parseFloat(el.dataset.par)}px`;
    });
  };
  if (!reduit) { addEventListener('scroll', () => requestAnimationFrame(tick), { passive: true }); tick(); }
})();
