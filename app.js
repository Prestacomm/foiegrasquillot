/* Comportements communs à toutes les pages : en-tête, menu mobile, révélations, hero, rails, curseur, images au survol,
   parallaxe, formulaires, invitation. JavaScript sans bibliothèque. Les boucles d'animation s'arrêtent quand rien ne bouge,
   et tout effet décoratif est coupé par prefers-reduced-motion. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const souris = matchMedia('(hover: hover)').matches;
  const racine = document.documentElement;
  racine.classList.add('js');

  /* Anciens liens profonds vers la fenêtre de fiche produit : on renvoie vers la page du produit */
  if (location.hash.startsWith('#voir-')) location.replace('produit-' + location.hash.slice(6) + '.html');

  /* ── En-tête : fond au défilement, masqué en descente, de retour dès qu'on remonte ── */
  const entete = $('#entete');
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    entete.classList.toggle('is-scrolled', y > 60);
    const bloque = document.body.classList.contains('menu-ouvert') || entete.contains(document.activeElement);
    entete.classList.toggle('is-hidden', !bloque && y > 500 && y > lastY + 4);
    if (y < lastY - 4) entete.classList.remove('is-hidden');
    racine.classList.toggle('entete-cache', entete.classList.contains('is-hidden'));
    lastY = y;
  }, { passive: true });
  entete.addEventListener('focusin', () => { entete.classList.remove('is-hidden'); racine.classList.remove('entete-cache'); });

  /* ── Menu mobile ── */
  const burger = $('#burger'), volet = $('#volet');
  const ailleurs = () => $$('.annonce, main, footer');
  volet.inert = true;
  const menu = ouvert => {
    document.body.classList.toggle('menu-ouvert', ouvert);
    burger.setAttribute('aria-expanded', ouvert);
    burger.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    volet.inert = !ouvert;
    ailleurs().forEach(e => { e.inert = ouvert; });
    if (ouvert) $('a', volet).focus({ preventScroll: true });
  };
  burger.addEventListener('click', () => menu(!document.body.classList.contains('menu-ouvert')));
  $$('a', volet).forEach(a => a.addEventListener('click', () => menu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-ouvert')) { menu(false); burger.focus(); } });
  matchMedia('(min-width: 1101px)').addEventListener('change', e => { if (e.matches) menu(false); });

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

  /* ── Révélations à l'entrée dans l'écran ── */
  if (reduit || !('IntersectionObserver' in window)) $$('.rv, .sp, .img-rv').forEach(el => el.classList.add('in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
    $$('.rv, .sp').forEach(el => io.observe(el));
    /* une image entièrement rognée n'est pas détectée : on observe son parent */
    const pio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { $$('.img-rv', e.target).forEach(i => i.classList.add('in')); pio.unobserve(e.target); } }), { threshold: .1 });
    new Set($$('.img-rv').map(i => i.parentElement)).forEach(p => pio.observe(p));
  }

  /* ── Hero : diapositives, flèches, glisser, clavier ; pause au survol et au focus ── */
  const hero = $('#hero');
  const slides = hero ? $$('.slide', hero) : [];
  if (hero && slides.length > 1) {
    let cur = 0, timer, anim = false, pause = false;
    const DUREE = 7000;
    const marquer = () => slides.forEach((s, i) => { s.inert = i !== cur; });
    const lancer = () => {
      clearTimeout(timer);
      if (reduit || pause) return;
      timer = setTimeout(() => aller(cur + 1, 1), DUREE);
    };
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
      cur = n; hero.dataset.s = n; marquer();
      setTimeout(() => { from.classList.remove('is-prev'); anim = false; }, 1100);
      lancer();
    };
    marquer();
    $('#suiv').addEventListener('click', () => aller(cur + 1, 1));
    $('#prec').addEventListener('click', () => aller(cur - 1, -1));
    hero.addEventListener('keydown', e => { if (e.key === 'ArrowRight') aller(cur + 1, 1); if (e.key === 'ArrowLeft') aller(cur - 1, -1); });
    hero.addEventListener('pointerenter', () => { pause = true; clearTimeout(timer); });
    hero.addEventListener('pointerleave', () => { pause = false; lancer(); });
    hero.addEventListener('focusin', () => { pause = true; clearTimeout(timer); });
    hero.addEventListener('focusout', () => { pause = false; lancer(); });
    let sx = null;
    hero.addEventListener('pointerdown', e => { if (e.target.closest('a,button')) return; sx = e.clientX; });
    addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) aller(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    lancer();
  }

  /* ── Rails horizontaux : glisser à la souris, flèches, région focalisable, barre de progression ── */
  $$('.rail').forEach(rail => {
    const prec = $(`[data-rail-prec="${rail.id}"]`), suiv = $(`[data-rail-suiv="${rail.id}"]`);
    const barre = rail.id === 'rail-histoire' ? $('#progres-histoire') : null;
    const pas = () => { const c = rail.firstElementChild; return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 16) : 300; };
    const maj = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      if (prec) prec.disabled = rail.scrollLeft <= 4;
      if (suiv) suiv.disabled = rail.scrollLeft >= max - 4;
      if (barre) barre.style.transform = `translateX(${(max > 0 ? rail.scrollLeft / max : 0) * 400}%)`;
    };
    const aller = d => rail.scrollBy({ left: d * pas(), behavior: reduit ? 'auto' : 'smooth' });
    if (prec) prec.addEventListener('click', () => aller(-1));
    if (suiv) suiv.addEventListener('click', () => aller(1));
    rail.addEventListener('scroll', () => requestAnimationFrame(maj), { passive: true });
    addEventListener('resize', maj);
    maj();

    let down = false, x0 = 0, s0 = 0, moved = 0;
    rail.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') return; down = true; moved = 0; x0 = e.clientX; s0 = rail.scrollLeft; });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - x0; moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) rail.classList.add('is-drag');
      rail.scrollLeft = s0 - dx;
    });
    addEventListener('pointerup', () => { if (!down) return; down = false; setTimeout(() => rail.classList.remove('is-drag'), 30); });
  });

  /* ── Curseur personnalisé : la boucle s'arrête dès qu'il a rejoint la souris ── */
  const pointeur = $('#curseur');
  if (pointeur && souris && !reduit) {
    let tx = 0, ty = 0, x = 0, y = 0, tourne = false;
    const boucle = () => {
      x += (tx - x) * .2; y += (ty - y) * .2;
      pointeur.style.transform = `translate(${x}px,${y}px)`;
      if (Math.abs(tx - x) + Math.abs(ty - y) > .3) requestAnimationFrame(boucle); else tourne = false;
    };
    addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      if (!pointeur.classList.contains('on')) { x = tx; y = ty; pointeur.classList.add('on'); }
      if (!tourne) { tourne = true; requestAnimationFrame(boucle); }
    }, { passive: true });
    const etiquette = pointeur.firstElementChild;
    document.addEventListener('pointerover', e => {
      const r = e.target.closest('[data-curseur]');
      const l = e.target.closest('a,button,label,select,summary');
      pointeur.classList.toggle('est-label', !!r && !l);
      pointeur.classList.toggle('est-lien', !!l && !r);
      etiquette.textContent = r ? r.dataset.curseur : '';
    });
    racine.addEventListener('pointerleave', () => pointeur.classList.remove('on'));
  }

  /* ── Image qui suit la souris sur les marchés : créée au premier survol, boucle arrêtée au repos ── */
  const survol = $('#survol');
  if (survol && souris && !reduit) {
    const images = new Map();
    let sx = 0, sy = 0, px = 0, py = 0, tourne = false;
    const suit = () => {
      px += (sx - px) * .14; py += (sy - py) * .14;
      survol.style.left = px + 'px'; survol.style.top = py + 'px';
      if (Math.abs(sx - px) + Math.abs(sy - py) > .3) requestAnimationFrame(suit); else tourne = false;
    };
    const lancer = () => { if (!tourne) { tourne = true; requestAnimationFrame(suit); } };
    addEventListener('pointermove', e => { sx = e.clientX; sy = e.clientY; if (survol.classList.contains('on')) lancer(); }, { passive: true });
    $$('.marche[data-img]').forEach(m => {
      m.addEventListener('mouseenter', e => {
        let im = images.get(m);
        if (!im) { im = new Image(); im.alt = ''; im.src = m.dataset.img; survol.append(im); images.set(m, im); }
        $$('img', survol).forEach(i => i.classList.toggle('on', i === im));
        sx = e.clientX; sy = e.clientY;
        if (!survol.classList.contains('on')) { px = sx; py = sy; survol.style.left = px + 'px'; survol.style.top = py + 'px'; }
        survol.classList.add('on'); lancer();
      });
      m.addEventListener('mouseleave', () => survol.classList.remove('on'));
    });
  }

  /* ── Hero : l'image suit doucement la souris ; boutons magnétiques (hors boutons d'achat) ── */
  if (souris && !reduit) {
    if (hero) hero.addEventListener('pointermove', e => {
      const x = (e.clientX / innerWidth - .5) * -26, y = (e.clientY / innerHeight - .5) * -16;
      $$('.slide__img', hero).forEach(i => { i.style.translate = `${x}px ${y}px`; });
    });
    $$('.btn:not(.btn--petit):not(.btn--large):not([data-ajouter]):not([data-acheter]):not([type=submit]), .fleche').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ── Parallaxe douce : seulement les éléments proches de l'écran ── */
  const par = $$('[data-par]');
  if (par.length && !reduit) {
    let attente = false;
    const tick = () => {
      attente = false;
      const vh = innerHeight;
      par.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.translate = `0 ${p * parseFloat(el.dataset.par)}px`;
      });
    };
    addEventListener('scroll', () => { if (!attente) { attente = true; requestAnimationFrame(tick); } }, { passive: true });
    tick();
  }

  /* ── Formulaires de la maquette : validés, mais rien n'est envoyé (branchement en phase WordPress) ── */
  $$('form[data-demo]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const statut = $('[data-statut]', f);
    if (f.elements.site && f.elements.site.value) return;          // champ piège rempli : robot
    if (!f.checkValidity()) { f.reportValidity(); return; }
    const m = f.elements.motif, reponse = m ? m.selectedOptions[0].dataset.reponse : '';
    if (statut) statut.textContent = `Merci ! ${reponse ? reponse + ' ' : ''}Version de démonstration : rien n’est envoyé pour le moment.`;
    f.reset();
  }));

  /* ── Tri des demandes du formulaire de contact : le motif affiche la règle applicable (réponse automatique), demande le numéro de commande et les photos quand ils servent, et renvoie la rétractation vers sa page ── */
  const motif = $('[data-motif]');
  if (motif) {
    const f = motif.form, info = $('[data-motif-info]', f), champCmd = $('[data-champ-commande]', f), champPhotos = $('[data-champ-photos]', f), envoi = $('button[type=submit]', f);
    const appliquer = () => {
      const o = motif.selectedOptions[0], retract = o.hasAttribute('data-retractation');
      info.textContent = o.dataset.reponse || '';
      info.hidden = !info.textContent;
      if (retract) info.append(' ', Object.assign(document.createElement('a'), { href: 'retractation.html', textContent: 'Me rétracter' }));
      champCmd.hidden = !o.hasAttribute('data-commande');
      $('input', champCmd).required = !champCmd.hidden;
      champPhotos.hidden = !o.hasAttribute('data-photos');
      envoi.disabled = retract;
    };
    motif.addEventListener('change', appliquer);
    f.addEventListener('reset', () => setTimeout(appliquer));
    const url = new URLSearchParams(location.search);
    if ([...motif.options].some(o => o.value && o.value === url.get('motif'))) { motif.value = url.get('motif'); if (url.get('cmd')) f.elements.commande.value = url.get('cmd'); }
    appliquer();
  }

  /* ── Invitation à s'inscrire : une seule fois, après 20 s ou 60 % de la page, jamais bloquante ── */
  const invite = $('#invite');
  if (invite && !['legal', 'compte', '404'].includes(document.body.dataset.page)) {
    const CLE = 'quillot-invite';
    let deja = true;
    try { deja = !!localStorage.getItem(CLE); } catch (e) { /* sans stockage, on n'insiste pas */ }
    const clore = () => { invite.hidden = true; try { localStorage.setItem(CLE, '1'); } catch (e) { /* ignoré */ } };
    if (!deja) {
      let prete = true;
      const surScroll = () => { if ((scrollY + innerHeight) / racine.scrollHeight > .6) montrer(); };
      const montrer = () => {
        if (!prete) return;
        prete = false; removeEventListener('scroll', surScroll);
        invite.hidden = false;
      };
      addEventListener('scroll', surScroll, { passive: true });
      setTimeout(montrer, 20000);
      $('[data-invite-fermer]', invite).addEventListener('click', clore);
      invite.addEventListener('keydown', e => { if (e.key === 'Escape') clore(); });
      invite.addEventListener('submit', () => { if ($('form', invite).checkValidity()) setTimeout(clore, 3500); });
    }
  }
})();
