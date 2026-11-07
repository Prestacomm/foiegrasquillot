/* Page « Nos marchés » : carrousel de boîtes d'allumettes.
   Port en JavaScript pur du composant MatchboxCarousel (React) : aucune dépendance, 3D en CSS, sans canvas.
   Chaque point de vente est une boîte posée sur la table, son nom imprimé sur le fourreau. Le tiroir de la boîte ouverte
   glisse pour montrer la photo ; passer à la suivante referme le tiroir, les boîtes se décalent, le tiroir suivant s'ouvre.
   Source des données : les <article class="marche"> de #liste-marches (data-boite, data-lieu, data-img, data-alt, data-teinte).
   Le HTML reste la référence : sans JavaScript, la liste reste affichée. Pas de lecture automatique (on lit des horaires).
   Commandes : boutons, flèches du clavier, glisser, clic sur une boîte voisine. Mouvement réduit : la photo change sans glisser. */
(() => {
  'use strict';
  const liste = document.getElementById('liste-marches');
  const hote = document.getElementById('boites');
  if (!liste || !hote) return;
  const articles = [...liste.querySelectorAll('.marche')];
  const N = articles.length;
  if (N < 2) return;

  const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CLOSE = 380, SHIFT = 560, OPEN = 620;
  const EASE = 'cubic-bezier(.32,.08,.18,1)';
  const TEINTES = ['#822322', '#524920', '#fde37c'];     // bordeaux, olive, jaune de la planche de marque
  const PAPIER = '#fffaf5', INTERIEUR = '#d8ccaa';
  const ENCRE_CLAIRE = '#fffaf5', ENCRE_SOMBRE = '#524920';

  /* ───────── Utilitaires ───────── */
  const borne = (v, a, b) => Math.min(b, Math.max(a, v));
  const mod = (n, m) => ((n % m) + m) % m;
  const moitie = Math.floor((N - 1) / 2);
  /* Place signée de la boîte i par rapport à la boîte ouverte */
  const decalage = (i, at) => { const k = mod(i - at, N); return k > N - 1 - moitie ? k - N : k; };
  const el = (tag, cls, css) => { const n = document.createElement(tag); if (cls) n.className = cls; if (css) Object.assign(n.style, css); return n; };
  const rgb = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex); return m ? parseInt(m[1], 16) : null; };
  /* Éclaircit (k > 0) ou assombrit (k < 0) une couleur hexadécimale */
  const nuance = (hex, k) => {
    const n = rgb(hex); if (n === null) return hex;
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(borne(k >= 0 ? v + (255 - v) * k : v * (1 + k), 0, 255)));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  };
  /* Encre claire ou sombre, selon ce qui se lit sur le fourreau */
  const lisible = hex => {
    const n = rgb(hex); if (n === null) return ENCRE_CLAIRE;
    const l = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
    return l > 0.6 ? ENCRE_SOMBRE : ENCRE_CLAIRE;
  };

  /* ───────── Données ───────── */
  const items = articles.map((a, i) => ({
    src: a.dataset.img,
    alt: a.dataset.alt || '',
    titre: a.dataset.boite || a.querySelector('h3').firstChild.textContent.trim(),
    detail: a.dataset.lieu || '',
    teinte: a.dataset.teinte || TEINTES[i % TEINTES.length],
  }));

  /* ───────── Géométrie : taille des boîtes et espacement, selon le conteneur ─────────
     Large : boîtes couchées, le tiroir sort vers la droite. Étroit : boîtes debout, le tiroir sort vers soi. */
  const geometrie = (W, H) => {
    const tilt = 30;
    const debout = W / H < 0.9;
    const fore = Math.cos((tilt * Math.PI) / 180);
    let bw, bd;
    if (debout) { bd = Math.max(60, Math.min((H * 0.66) / (1.93 * fore), (W * 0.66) / 0.68)); bw = bd * 0.68; }
    else { bw = Math.max(60, Math.min(W * 0.4, (H * 0.6) / 0.68, (W * 0.86) / 1.93)); bd = bw * 0.68; }
    const m = Math.max(bw, bd), slide = m * 0.93;
    return { debout, bw, bd, m, t: m * 0.2, slide, P: bw * 1.16, x0: debout ? W / 2 : W / 2 - slide / 2, y0: debout ? -slide / 2 : 0, cy: H * (debout ? 0.45 : 0.46), tilt, persp: Math.max(W, H) * 2.2, e: Math.max(1.5, m * 0.012) };
  };

  /* ───────── Une boîte : ombre, tiroir (avec la photo), fourreau (avec le nom) ───────── */
  const construireTiroir = it => {
    const racine = el('div', 'mbx-tiroir', { position: 'absolute', transformStyle: 'preserve-3d' });
    const fond = el('div', null, { position: 'absolute', inset: '0', overflow: 'hidden', background: INTERIEUR });
    const img = new Image();
    img.src = it.src; img.alt = it.alt; img.draggable = false; img.decoding = 'async';
    Object.assign(img.style, { position: 'absolute', objectFit: 'cover' });
    const ombrage = el('div', null, { position: 'absolute', inset: '0', pointerEvents: 'none', background: 'linear-gradient(rgba(40,32,10,.28), transparent 16%), linear-gradient(90deg, rgba(40,32,10,.16), transparent 5%, transparent 95%, rgba(40,32,10,.16))' });
    fond.append(img, ombrage);
    const nord = el('div'), est = el('div'), ouest = el('div'), sud = el('div'), levre = el('div');
    [nord, est, ouest, sud, levre].forEach(n => { n.style.position = 'absolute'; n.style.backfaceVisibility = 'hidden'; });
    racine.append(fond, nord, est, ouest, sud, levre);
    const taille = g => {
      const e = g.e, tw = g.bw - e * 2, td = g.bd - e * 2, th = g.t * 0.62;
      Object.assign(racine.style, { left: e + 'px', top: e + 'px', width: tw + 'px', height: td + 'px' });
      fond.style.transform = `translateZ(${e}px)`;
      Object.assign(img.style, { inset: e * 0.6 + 'px', width: `calc(100% - ${e * 1.2}px)`, height: `calc(100% - ${e * 1.2}px)` });
      Object.assign(nord.style, { left: '0', top: '0', width: tw + 'px', height: th + 'px', transformOrigin: '50% 0', transform: 'rotateX(-90deg)', background: `linear-gradient(${nuance(INTERIEUR, -0.12)}, ${INTERIEUR})` });
      Object.assign(est.style, { left: tw + 'px', top: '0', width: th + 'px', height: td + 'px', transformOrigin: '0 50%', transform: 'rotateY(-90deg)', background: `linear-gradient(90deg, ${nuance(INTERIEUR, -0.22)}, ${nuance(INTERIEUR, -0.1)})` });
      Object.assign(ouest.style, { left: '0', top: '0', width: th + 'px', height: td + 'px', transformOrigin: '0 50%', transform: `translateZ(${th}px) rotateY(90deg)`, background: `linear-gradient(90deg, ${nuance(INTERIEUR, -0.1)}, ${nuance(INTERIEUR, -0.22)})` });
      Object.assign(sud.style, { left: '0', top: td + 'px', width: tw + 'px', height: th + 'px', transformOrigin: '50% 0', transform: `translateZ(${th}px) rotateX(-90deg)`, background: `linear-gradient(${PAPIER}, ${nuance(PAPIER, -0.06)})` });
      Object.assign(levre.style, { left: '0', top: td - e + 'px', width: tw + 'px', height: e + 'px', transform: `translateZ(${th}px)`, background: PAPIER });
    };
    return { racine, taille };
  };

  const construireFourreau = (it, rang) => {
    const encre = lisible(it.teinte);
    const flanc = nuance(it.teinte, -0.18);
    /* Face tournée vers nous : l'ouverture du fourreau (boîte debout) ou le grattoir (boîte couchée) */
    const devant = el('div', null, { position: 'absolute', transformOrigin: '50% 0', backfaceVisibility: 'hidden', boxSizing: 'border-box' });
    const grattoir = el('div', null, { position: 'absolute', borderRadius: '2px', backgroundImage: 'radial-gradient(rgba(255,255,255,.18) 0.6px, transparent 0.8px), radial-gradient(rgba(0,0,0,.35) 0.6px, transparent 0.8px)', backgroundSize: '3px 3px, 4px 4px', backgroundPosition: '0 0, 1px 2px', backgroundColor: nuance(it.teinte, -0.5) });
    devant.append(grattoir);
    const dessus = el('div', null, { position: 'absolute', inset: '0', boxSizing: 'border-box', overflow: 'hidden', color: encre, background: `linear-gradient(160deg, ${nuance(it.teinte, 0.08)}, ${it.teinte} 45%, ${nuance(it.teinte, -0.08)})` });
    const cadre = el('div', null, { position: 'absolute', border: `1px solid ${encre}`, opacity: '.38' });
    const contenu = el('div', null, { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' });
    const haut = el('div', null, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', letterSpacing: '.14em', textTransform: 'uppercase', opacity: '.85' });
    const numero = el('span'); numero.textContent = 'N° ' + String(rang).padStart(2, '0');
    const initiale = el('span', null, { borderRadius: '50%', border: `1px solid ${encre}`, display: 'grid', placeItems: 'center', letterSpacing: '0', opacity: '.9' });
    initiale.textContent = it.titre.slice(0, 1);
    haut.append(numero, initiale);
    const titre = el('div', null, { lineHeight: '.95', letterSpacing: '-.03em', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    titre.textContent = it.titre;
    const detail = el('div', null, { letterSpacing: '.04em', opacity: '.78', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
    detail.textContent = it.detail;
    contenu.append(haut, titre, detail);
    dessus.append(cadre, contenu);
    const taille = g => {
      const court = Math.min(g.bw, g.bd), pad = court * 0.09, petit = court * 0.062;
      Object.assign(devant.style, { left: '0', top: g.bd + 'px', width: g.bw + 'px', height: g.t + 'px', transform: `translateZ(${g.t}px) rotateX(-90deg)` });
      if (g.debout) Object.assign(devant.style, { background: 'none', border: `${g.e}px solid ${flanc}`, borderBottom: 'none' });
      else Object.assign(devant.style, { background: flanc, border: '0' });
      Object.assign(grattoir.style, { display: g.debout ? 'none' : 'block', left: g.bw * 0.03 + 'px', right: g.bw * 0.03 + 'px', top: '22%', bottom: '22%' });
      Object.assign(dessus.style, { transform: `translateZ(${g.t}px)`, borderRadius: g.m * 0.006 + 'px', padding: pad + 'px', boxShadow: `inset 0 ${Math.max(1, g.m * 0.003)}px 0 rgba(255,255,255,.18)` });
      Object.assign(cadre.style, { inset: pad * 0.55 + 'px', borderRadius: g.m * 0.004 + 'px' });
      haut.style.fontSize = petit * 0.96 + 'px';
      Object.assign(initiale.style, { width: court * 0.16 + 'px', height: court * 0.16 + 'px', fontSize: court * 0.075 + 'px' });
      titre.style.fontSize = Math.min(g.bd * 0.24, court * 0.3, (g.bw * 1.45) / Math.max(4, it.titre.length + 1)) + 'px';
      detail.style.fontSize = petit + 'px';
    };
    return { noeuds: [devant, dessus], taille };
  };

  const construireBoite = (it, i) => {
    const racine = el('div', 'mbx-boite', { position: 'absolute', left: '0', top: '0', transformStyle: 'preserve-3d' });
    racine.setAttribute('role', 'group');
    racine.setAttribute('aria-roledescription', 'diapositive');
    racine.setAttribute('aria-label', `${i + 1} sur ${N} : ${it.titre}`);
    const ombre = el('div', null, { position: 'absolute', background: 'rgba(60,50,15,.28)' });
    const tiroir = construireTiroir(it);
    const fourreau = construireFourreau(it, i + 1);
    racine.append(ombre, tiroir.racine, ...fourreau.noeuds);
    const taille = g => {
      Object.assign(racine.style, { width: g.bw + 'px', height: g.bd + 'px' });
      Object.assign(ombre.style, { left: -g.bw * 0.05 + 'px', top: -g.bd * 0.02 + 'px', borderRadius: g.m * 0.04 + 'px', filter: `blur(${g.m * 0.035}px)` });
      tiroir.taille(g); fourreau.taille(g);
    };
    return { racine, ombre, tiroir: tiroir.racine, taille };
  };

  /* ───────── Construction du carrousel ───────── */
  const section = hote.closest('.marches');
  const racine = el('div', 'mbx');
  racine.tabIndex = 0;
  racine.setAttribute('role', 'region');
  racine.setAttribute('aria-roledescription', 'carrousel');
  racine.setAttribute('aria-label', 'Nos points de vente, une boîte par marché');
  const voile = el('div', 'mbx__voile'); voile.setAttribute('aria-hidden', 'true');
  const scene = el('div', 'mbx__scene');
  const ancre = el('div', 'mbx__ancre');
  scene.append(ancre);
  const boites = items.map(construireBoite);
  ancre.append(...boites.map(b => b.racine));

  const compteur = el('span', 'mbx__compteur'); compteur.setAttribute('aria-hidden', 'true');
  const bouton = (sens, nom) => {
    const b = el('button', 'mbx__btn'); b.type = 'button'; b.setAttribute('aria-label', nom);
    b.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style="transform:${sens < 0 ? 'none' : 'scaleX(-1)'}"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return b;
  };
  const btnPrec = bouton(-1, 'Point de vente précédent'), btnSuiv = bouton(1, 'Point de vente suivant');
  const commandes = el('div', 'mbx__cmd');
  commandes.append(compteur, btnPrec, btnSuiv);
  racine.append(voile, scene, commandes);

  /* Fiche du point de vente ouvert : copie de l'article (nom, téléphone, horaires, lien Google) */
  const fiche = el('div', 'boites__fiche');
  fiche.setAttribute('aria-live', 'polite');
  const montrerFiche = n => {
    const a = articles[n].cloneNode(true);
    a.removeAttribute('data-img');
    fiche.replaceChildren(a);
  };

  /* ───────── État ───────── */
  let W = 1000, H = 620, G = geometrie(W, H);
  let index = 0;                       // boîte demandée
  let pos = { montree: 0, avant: 0 };  // ce que montre la table : elle suit l'index avec un temps de retard
  let ouvert = true, enMouvement = false, pret = false, occupeJusqua = 0, glisse = 0, aGlisse = false;

  const peindre = (net) => {
    const g = G, quantite = ouvert ? 1 : 0;
    boites.forEach((b, i) => {
      const k = decalage(i, pos.montree);
      const saut = Math.abs(decalage(i, pos.avant) - k) > 1;   // une boîte qui fait le tour saute au lieu de traverser
      const actif = k === 0;
      const x = g.x0 + k * g.P + (!g.debout && k > 0 ? g.slide * quantite : 0) + glisse;
      const loin = Math.abs(k) > 2;
      const sortie = actif ? g.slide * quantite : 0;
      const vitesse = actif && !ouvert ? CLOSE : OPEN;
      const sansTransition = net || !pret || saut || glisse !== 0;
      b.racine.classList.toggle('mbx-actif', actif);
      b.racine.setAttribute('aria-hidden', String(!actif));
      Object.assign(b.racine.style, {
        transform: `translate3d(${x - g.bw / 2}px, ${g.y0 - g.bd / 2}px, 0)`,
        transition: sansTransition ? 'none' : `transform ${enMouvement ? SHIFT : OPEN}ms ${EASE}, opacity .4s`,
        opacity: loin ? '0' : '1',
        cursor: actif ? 'default' : 'pointer',
        pointerEvents: loin ? 'none' : 'auto',
      });
      Object.assign(b.ombre.style, {
        width: g.bw * 1.1 + (g.debout ? 0 : sortie) + 'px',
        height: g.bd * 1.08 + (g.debout ? sortie : 0) + 'px',
        transform: `translateZ(0.5px) translate(${g.bw * 0.02}px, ${g.bd * 0.05}px)`,
        transition: sansTransition ? 'none' : `width ${vitesse}ms ${EASE}, height ${vitesse}ms ${EASE}`,
      });
      Object.assign(b.tiroir.style, {
        transform: g.debout ? `translate3d(0, ${sortie}px, 0)` : `translate3d(${sortie}px, 0, 0)`,
        transition: sansTransition ? 'none' : `transform ${vitesse}ms ${EASE}`,
      });
    });
  };

  const tailler = () => {
    G = geometrie(W, H);
    Object.assign(ancre.style, { top: G.cy + 'px', transform: `rotateX(${G.tilt}deg)` });
    scene.style.perspective = G.persp + 'px';
    boites.forEach(b => b.taille(G));
    peindre(true);
  };

  const mesurer = () => {
    const w = racine.clientWidth;
    if (!w) return;
    const rapport = w < 640 ? '3 / 4' : '16 / 10';
    if (racine.style.aspectRatio !== rapport) racine.style.aspectRatio = rapport;
    const h = racine.clientHeight;
    if (h && (w !== W || h !== H)) { W = w; H = h; tailler(); }
  };

  const majCompteur = () => { compteur.innerHTML = `${String(index + 1).padStart(2, '0')} <span>/ ${String(N).padStart(2, '0')}</span>`; };

  /* Aller à la boîte voisine (dir) ou à la boîte n : le tiroir se ferme, la rangée glisse, le nouveau tiroir s'ouvre */
  const aller = (dir, vers) => {
    const duree = calme ? 300 : CLOSE + SHIFT + OPEN * 0.6;
    const attente = Math.max(0, occupeJusqua - Date.now());   // un appui pendant un mouvement l'attend au lieu de le couper
    const lancer = () => {
      const n = mod(vers ?? index + dir, N);
      if (n === index) return;
      occupeJusqua = Date.now() + duree;
      index = n;
      majCompteur();
      const poser = () => { pos = { montree: n, avant: pos.montree }; montrerFiche(n); peindre(); };
      if (calme) { poser(); return; }
      ouvert = false; peindre();
      setTimeout(() => { enMouvement = true; poser(); }, CLOSE);
      setTimeout(() => { enMouvement = false; ouvert = true; peindre(); }, CLOSE + SHIFT);
    };
    if (attente > 0 && attente < duree) setTimeout(lancer, attente); else lancer();
  };

  btnPrec.addEventListener('click', () => aller(-1));
  btnSuiv.addEventListener('click', () => aller(1));
  boites.forEach((b, i) => b.racine.addEventListener('click', () => {
    const k = decalage(i, pos.montree);
    if (k !== 0 && !aGlisse) aller(k > 0 ? 1 : -1, i);
  }));
  racine.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); aller(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); aller(1); }
  });

  /* Glisser : la rangée suit le doigt ; au-delà d'un tiers d'écart de boîte, ou d'un geste vif, on change de point de vente.
     Seuls les glissements horizontaux sont pris, la page continue de défiler. */
  let debut = null;
  racine.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    debut = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId, verrou: null };
    aGlisse = false;
  });
  racine.addEventListener('pointermove', e => {
    if (!debut || debut.id !== e.pointerId) return;
    const dx = e.clientX - debut.x, dy = e.clientY - debut.y;
    if (debut.verrou === null && Math.hypot(dx, dy) > 6) {
      debut.verrou = Math.abs(dx) > Math.abs(dy);
      if (debut.verrou) { aGlisse = true; try { racine.setPointerCapture(e.pointerId); } catch (_) { /* sans effet */ } }
      else debut = null;
    }
    if (debut && debut.verrou) { glisse = dx; peindre(); }
  });
  const fin = e => {
    const s = debut; debut = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x, v = dx / Math.max(1, Date.now() - s.t);
    glisse = 0; peindre();
    if (!s.verrou) return;
    if (dx < -G.P / 3 || v < -0.5) aller(1); else if (dx > G.P / 3 || v > 0.5) aller(-1);
  };
  racine.addEventListener('pointerup', fin);
  racine.addEventListener('pointercancel', fin);

  /* ───────── Mise en route ───────── */
  hote.append(racine, fiche);
  hote.hidden = false;
  if (section) section.classList.add('a-boites');
  majCompteur();
  montrerFiche(0);
  mesurer();
  tailler();
  requestAnimationFrame(() => requestAnimationFrame(() => { pret = true; }));
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(mesurer).observe(racine);
  else addEventListener('resize', mesurer);
})();
