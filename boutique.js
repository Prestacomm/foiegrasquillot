/* Boutique de la maquette : panier (localStorage), filtres, achat depuis les produits et les recettes.
   Les données viennent de donnees.js (généré, montants en centimes). Rien ne part vers un serveur : la vraie boutique sera WooCommerce. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const Q = window.QUILLOT;
  if (!Q) return;
  const L = Q.livraison;
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FORMAT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  const eur = c => FORMAT.format(c / 100).replace(/[  ]/g, ' ');
  const KEY = 'quillot-panier';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const borne = n => Math.max(1, Math.min(99, parseInt(n, 10) || 1));

  /* ── État du panier ── */
  let lignes = [];
  try {
    lignes = JSON.parse(localStorage.getItem(KEY) || '[]').filter(l => Q.produits[l.id] && l.q > 0);
  } catch (e) { lignes = []; }
  const sauver = () => { try { localStorage.setItem(KEY, JSON.stringify(lignes)); } catch (e) { /* stockage indisponible : le panier vit le temps de la page */ } };
  const infos = l => {
    const p = Q.produits[l.id];
    const v = p.variantes ? p.variantes.find(x => x.id === l.v) || p.variantes[0] : null;
    return { p, v, prix: v ? v.prix : p.prix };
  };
  const sousTotal = () => lignes.reduce((t, l) => t + infos(l).prix * l.q, 0);

  /* Totaux du panier (livraison offerte dès un seuil, remise au-delà) : lus par le panier et par la page de commande */
  const totaux = () => {
    const st = sousTotal();
    const remise = st >= L.remiseDes ? Math.round(st * L.remisePct / 100) : 0;
    const liv = lignes.length === 0 || st >= L.gratuiteDes ? 0 : L.fixe;
    return { st, remise, liv, total: st - remise + liv };
  };

  const ajouter = ({ id, v, q }) => {
    const p = Q.produits[id];
    if (!p || !p.stock) return false;
    const vid = p.variantes ? (p.variantes.find(x => x.id === v) || p.variantes[0]).id : '';
    const ex = lignes.find(l => l.id === id && l.v === vid);
    if (ex) ex.q = Math.min(99, ex.q + q); else lignes.push({ id, v: vid, q: Math.min(99, q) });
    sauver(); rendre();
    return true;
  };

  let toast, toastT;

  /* ── Tiroir du panier : le reste de la page devient inerte tant qu'il est ouvert ── */
  const panier = $('#panier'), corps = $('#panier-corps'), pied = $('#panier-pied');
  const fond = () => $$('.annonce, header.entete, main, footer.contact');
  let retour = null;
  const ouvrir = () => {
    if (!panier) return;
    retour = document.activeElement;
    if (toast) toast.classList.remove('on');
    panier.inert = false;
    panier.classList.add('is-open');
    document.body.classList.add('panier-ouvert');
    fond().forEach(e => { e.inert = true; });
    $('.fermer', panier).focus({ preventScroll: true });
  };
  const fermer = () => {
    if (!panier) return;
    panier.classList.remove('is-open');
    panier.inert = true;
    document.body.classList.remove('panier-ouvert');
    fond().forEach(e => { e.inert = false; });
    if (retour && retour.focus) retour.focus({ preventScroll: true });
  };

  function rendre() {
    const n = lignes.reduce((t, l) => t + l.q, 0);
    $$('[data-panier-n]').forEach(e => { e.textContent = n; });
    if (!corps) return;
    if (!lignes.length) {
      corps.innerHTML = '<div class="panier__vide"><p>Votre panier est vide.</p><a class="btn btn--ghost" href="produits.html">Voir les produits</a><a class="lien-fleche" href="recettes.html">Nos recettes</a></div>';
      pied.innerHTML = '';
      return;
    }
    corps.innerHTML = '<ul class="panier__lignes">' + lignes.map((l, i) => {
      const { p, v, prix } = infos(l);
      return `<li class="ligne-panier" data-i="${i}">
        <div class="photo${p.img ? '' : ' photo--vide'}">${p.img ? `<img src="${p.img}" alt="" width="78" height="78">` : ''}</div>
        <div class="ligne-panier__info"><a href="${p.url}"><b>${esc(p.nom)}</b></a>${v ? `<small>${esc(v.label)}</small>` : ''}
          <div class="qte qte--petit" role="group" aria-label="Quantité de ${esc(p.nom)}"><button type="button" data-lq="-1" aria-label="Une de moins">−</button><span>${l.q}</span><button type="button" data-lq="1" aria-label="Une de plus">+</button></div>
        </div>
        <div class="ligne-panier__prix"><span>${eur(prix * l.q)}</span><button type="button" data-retirer aria-label="Retirer ${esc(p.nom)} du panier">Retirer</button></div>
      </li>`;
    }).join('') + '</ul>';

    const { st, remise, liv, total } = totaux();
    const reste = L.gratuiteDes - st;
    pied.innerHTML = `<div class="panier__jauge"><p>${reste > 0 ? `Plus que <b>${eur(reste)}</b> pour la livraison offerte.` : 'Livraison offerte.'}</p><div class="jauge" aria-hidden="true"><i style="width:${Math.min(100, (st / L.gratuiteDes) * 100)}%"></i></div></div>
      <dl class="panier__totaux">
        <div><dt>Sous-total</dt><dd>${eur(st)}</dd></div>
        ${remise ? `<div><dt>Remise ${L.remisePct} %</dt><dd>−${eur(remise)}</dd></div>` : ''}
        <div><dt>Livraison (France)</dt><dd>${liv ? eur(liv) : 'Offerte'}</dd></div>
        <div class="total"><dt>Total TTC</dt><dd>${eur(total)}</dd></div>
      </dl>
      <a class="btn btn--plein btn--large" href="commande.html">Commander</a>
      <button class="lien-fleche" type="button" data-panier-fermer>Continuer mes achats</button>`;
  }
  rendre();

  /* Interface lue par client.js (page de commande) */
  window.quillotPanier = {
    lire: () => lignes.map(l => { const { p, v, prix } = infos(l); return { id: l.id, nom: p.nom, format: v ? v.label : '', q: l.q, prix, img: p.img, url: p.url }; }),
    totaux,
    vider: () => { lignes = []; sauver(); rendre(); },
  };

  /* Le bouton « Mon compte » dit bonjour au client connecté (profil conservé dans ce navigateur en démonstration) */
  try {
    const cl = JSON.parse(localStorage.getItem('quillot-client') || 'null');
    if (cl && JSON.parse(localStorage.getItem('quillot-connecte') || 'false') === true && cl.prenom) {
      $$('.pill--compte, .volet__bas a[href="compte.html"]').forEach(a => { a.textContent = 'Bonjour ' + cl.prenom; });
    }
  } catch (e) { /* stockage indisponible : le libellé reste « Mon compte » */ }

  /* ── Confirmation d'ajout ── */
  const avertir = msg => {
    if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); document.body.append(toast); }
    toast.innerHTML = `<span>${esc(msg)}</span><button type="button" data-panier-ouvrir>Voir le panier</button>`;
    toast.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 3600);
    $$('.pill--panier').forEach(b => { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); });
  };

  /* ── Zones d'achat : lecture du format et de la quantité ── */
  const lire = box => {
    const r = $('input[type=radio]:checked', box), s = $('select[data-variante]', box), qi = $('.qte input', box);
    return {
      id: box.dataset.achat,
      v: r ? r.value : s ? s.value : '',
      q: qi ? borne(qi.value) : parseInt(box.dataset.qteDefaut, 10) || 1,
    };
  };
  /* Dans une recette : le produit principal, puis les lignes cochées (les ingrédients « en option » ne le sont pas) */
  const retenus = aside => $$('[data-achat]', aside).filter(b => {
    if ('epuise' in b.dataset) return false;
    const li = b.closest('.rc-extra'), c = li && $('[data-inclure]', li);
    return !c || c.checked;
  });
  const majTotal = aside => {
    const sortie = $('[data-total]', aside);
    if (sortie) sortie.textContent = eur(retenus(aside).reduce((s, b) => s + parseInt($('[data-prix-aff]', b).dataset.val, 10) * lire(b).q, 0));
  };
  const majPrix = box => {
    const r = $('input[type=radio]:checked', box), s = $('select[data-variante]', box);
    const prix = r ? parseInt(r.dataset.prix, 10) : s ? parseInt(s.selectedOptions[0].dataset.prix, 10) : null;
    const cible = $('[data-prix-aff]', box);
    if (prix !== null && cible) { cible.dataset.val = prix; cible.textContent = eur(prix); }
    const aside = box.closest('[data-achat-recette]'); if (aside) majTotal(aside);
  };
  $$('[data-achat-recette]').forEach(majTotal);

  const confirmer = (btn, texte) => {
    if (!btn) return;
    if (!btn.dataset.html) btn.dataset.html = btn.innerHTML;
    btn.textContent = texte; btn.classList.add('is-fait');
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.innerHTML = btn.dataset.html; btn.classList.remove('is-fait'); }, 1600);
  };

  /* ── Clics ── */
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-panier-ouvrir]')) { e.preventDefault(); ouvrir(); return; }
    if (t.closest('[data-panier-fermer]')) { fermer(); return; }

    const qb = t.closest('.qte button[data-qte]');
    if (qb) {
      const i = $('input', qb.parentElement);
      i.value = borne((parseInt(i.value, 10) || 1) + parseInt(qb.dataset.qte, 10));
      const aside = qb.closest('[data-achat-recette]'); if (aside) majTotal(aside);
      return;
    }

    const lq = t.closest('[data-lq]');
    if (lq) {
      const i = +lq.closest('.ligne-panier').dataset.i, d = lq.dataset.lq;
      lignes[i].q = borne(lignes[i].q + parseInt(d, 10));
      sauver(); rendre();
      $(`[data-i="${i}"] [data-lq="${d}"]`, corps)?.focus();
      return;
    }
    const ret = t.closest('[data-retirer]');
    if (ret) {
      lignes.splice(+ret.closest('.ligne-panier').dataset.i, 1); sauver(); rendre();
      ($('[data-retirer]', corps) || $('a, button', corps) || $('.fermer', panier)).focus();
      return;
    }

    const direct = t.closest('[data-ajouter-direct]');
    if (direct) {
      const id = direct.dataset.ajouterDirect;
      if (ajouter({ id, v: '', q: 1 })) { confirmer(direct, 'Ajouté ✓'); avertir(`${Q.produits[id].nom} ajouté au panier`); }
      return;
    }

    const tout = t.closest('[data-tout-ajouter]');
    if (tout) {
      const boxes = retenus(tout.closest('[data-achat-recette]'));
      boxes.forEach(b => ajouter(lire(b)));
      confirmer(tout, 'Ajoutés ✓'); avertir(`${boxes.length} produit${boxes.length > 1 ? 's' : ''} ajouté${boxes.length > 1 ? 's' : ''} au panier`);
      return;
    }

    const aj = t.closest('[data-ajouter], [data-acheter]');
    if (aj) {
      const box = aj.closest('[data-achat]'); if (!box) return;
      const ligne = lire(box);
      if (!ajouter(ligne)) return;
      if (aj.hasAttribute('data-acheter')) { ouvrir(); return; }
      confirmer(aj, 'Ajouté ✓'); avertir(`${Q.produits[ligne.id].nom} ajouté au panier`);
    }
  });

  document.addEventListener('change', e => {
    const box = e.target.closest('[data-achat]');
    if (box && (e.target.matches('input[type=radio]') || e.target.matches('select[data-variante]'))) majPrix(box);
    if (e.target.matches('.qte input')) {
      e.target.value = borne(e.target.value);
      const aside = e.target.closest('[data-achat-recette]'); if (aside) majTotal(aside);
    }
    if (e.target.matches('[data-inclure]')) majTotal(e.target.closest('[data-achat-recette]'));
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && panier && panier.classList.contains('is-open')) fermer(); });

  /* ── Filtres (produits, recettes) : tout est dans la page, on masque ce qui ne correspond pas ── */
  $$('[data-filtres]').forEach(barre => {
    const cible = $(barre.dataset.filtres);
    const items = $$('[data-cats]', cible);
    const compte = $('[data-compte]');
    const unite = barre.dataset.unite || 'résultat';
    const cats = $$('.filtre', barre).map(b => b.dataset.cat);
    const appliquer = cat => {
      let n = 0;
      items.forEach(i => { const ok = cat === 'tout' || i.dataset.cats.split(' ').includes(cat); i.hidden = !ok; if (ok) n++; });
      $$('.filtre', barre).forEach(b => { const a = b.dataset.cat === cat; b.classList.toggle('is-actif', a); b.setAttribute('aria-pressed', a); });
      if (compte) compte.textContent = `${n} ${unite}${n > 1 ? 's' : ''}`;
    };
    barre.addEventListener('click', e => {
      const b = e.target.closest('.filtre'); if (!b) return;
      appliquer(b.dataset.cat);
      history.replaceState(null, '', b.dataset.cat === 'tout' ? location.pathname + location.search : '#' + b.dataset.cat);
    });
    const depuisHash = () => { const h = location.hash.slice(1); appliquer(cats.includes(h) ? h : 'tout'); };
    depuisHash();
    addEventListener('hashchange', depuisHash);
    const h0 = location.hash.slice(1);
    if (cats.includes(h0) && h0 !== 'tout') requestAnimationFrame(() => scrollTo({ top: barre.offsetTop - 70, behavior: reduit ? 'auto' : 'smooth' }));
  });
})();
