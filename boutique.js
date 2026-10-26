/* Boutique de la maquette : panier (localStorage), fiches produit, filtres, achat depuis les recettes.
   Les données viennent de donnees.js (généré). Rien ne part vers un serveur : la vraie boutique sera WooCommerce. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const Q = window.QUILLOT;
  if (!Q) return;
  const L = Q.livraison;
  const eur = n => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')) + ' €';
  const KEY = 'quillot-panier';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

  const ajouter = ({ id, v, q }) => {
    const p = Q.produits[id];
    if (!p || !p.stock) return false;
    const vid = p.variantes ? (p.variantes.find(x => x.id === v) || p.variantes[0]).id : '';
    const ex = lignes.find(l => l.id === id && l.v === vid);
    if (ex) ex.q = Math.min(99, ex.q + q); else lignes.push({ id, v: vid, q: Math.min(99, q) });
    sauver(); rendre();
    return true;
  };

  /* ── Tiroir panier ── */
  const panier = $('#panier'), corps = $('#panier-corps'), pied = $('#panier-pied');
  let retour = null;
  const ouvrir = () => {
    if (!panier) return;
    if (dialogue && dialogue.open) dialogue.close();
    retour = document.activeElement;
    panier.classList.add('is-open'); panier.setAttribute('aria-hidden', 'false');
    document.body.classList.add('panier-ouvert');
    const f = $('.fermer', panier); if (f) f.focus({ preventScroll: true });
  };
  const fermer = () => {
    if (!panier) return;
    panier.classList.remove('is-open'); panier.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('panier-ouvert');
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
        <div class="photo${p.img ? '' : ' photo--vide'}">${p.img ? `<img src="${p.img}" alt="">` : ''}</div>
        <div class="ligne-panier__info"><b>${esc(p.nom)}</b>${v ? `<small>${esc(v.label)}</small>` : ''}
          <div class="qte qte--petit" role="group" aria-label="Quantité"><button type="button" data-lq="-1" aria-label="Une de moins">−</button><span>${l.q}</span><button type="button" data-lq="1" aria-label="Une de plus">+</button></div>
        </div>
        <div class="ligne-panier__prix"><span>${eur(prix * l.q)}</span><button type="button" data-retirer>Retirer</button></div>
      </li>`;
    }).join('') + '</ul>';

    const st = sousTotal();
    const remise = st >= L.remiseDes ? st * L.remise : 0;
    const liv = st >= L.gratuiteDes ? 0 : L.fixe;
    const total = st - remise + liv;
    const reste = L.gratuiteDes - st;
    const info = reste > 0
      ? `Plus que <b>${eur(reste)}</b> pour la livraison offerte.`
      : st < L.remiseDes ? `Livraison offerte. Plus que <b>${eur(L.remiseDes - st)}</b> pour 5 % de remise.` : 'Livraison offerte et 5 % de remise.';
    pied.innerHTML = `<div class="panier__jauge"><p>${info}</p><div class="jauge"><i style="width:${Math.min(100, (st / L.gratuiteDes) * 100)}%"></i></div></div>
      <dl class="panier__totaux">
        <div><dt>Sous-total</dt><dd>${eur(st)}</dd></div>
        ${remise ? `<div><dt>Remise 5 %</dt><dd>−${eur(remise)}</dd></div>` : ''}
        <div><dt>Livraison (France)</dt><dd>${liv ? eur(liv) : 'Offerte'}</dd></div>
        <div class="total"><dt>Total</dt><dd>${eur(total)}</dd></div>
      </dl>
      <button class="btn btn--plein btn--large" type="button" data-commander>Commander</button>
      <p class="panier__note" hidden>Le paiement en ligne sera activé à la mise en ligne du site.</p>
      <button class="lien-fleche" type="button" data-panier-fermer>Continuer mes achats</button>`;
  }
  rendre();

  /* ── Message de confirmation ── */
  let toast, toastT;
  const avertir = msg => {
    if (!toast) {
      toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status');
    }
    (dialogue && dialogue.open ? dialogue : document.body).append(toast);
    toast.innerHTML = `<span>${esc(msg)}</span><button type="button" data-panier-ouvrir>Voir le panier</button>`;
    toast.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 3600);
    $$('.pill--panier').forEach(b => { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); });
  };

  /* ── Fiches d'achat : lecture du format et de la quantité ── */
  const lire = box => {
    const r = $('input[type=radio]:checked', box), s = $('select[data-variante]', box), qi = $('.qte input', box);
    return {
      id: box.dataset.achat,
      v: r ? r.value : s ? s.value : '',
      q: qi ? Math.max(1, Math.min(99, parseInt(qi.value, 10) || 1)) : parseInt(box.dataset.qteDefaut, 10) || 1,
    };
  };
  const majTotal = aside => {
    const sortie = $('[data-total]', aside);
    if (!sortie) return;
    const t = $$('[data-achat]', aside).filter(b => !('epuise' in b.dataset)).reduce((s, b) => s + parseFloat($('[data-prix-aff]', b).dataset.val) * lire(b).q, 0);
    sortie.textContent = eur(t);
  };
  const majPrix = box => {
    const r = $('input[type=radio]:checked', box), s = $('select[data-variante]', box);
    const prix = r ? parseFloat(r.dataset.prix) : s ? parseFloat(s.selectedOptions[0].dataset.prix) : null;
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
      i.value = Math.max(1, Math.min(99, (parseInt(i.value, 10) || 1) + parseInt(qb.dataset.qte, 10)));
      const aside = qb.closest('[data-achat-recette]'); if (aside) majTotal(aside);
      return;
    }

    const lq = t.closest('[data-lq]');
    if (lq) {
      const l = lignes[+lq.closest('.ligne-panier').dataset.i];
      l.q = Math.max(1, Math.min(99, l.q + parseInt(lq.dataset.lq, 10)));
      sauver(); rendre(); return;
    }
    const ret = t.closest('[data-retirer]');
    if (ret) { lignes.splice(+ret.closest('.ligne-panier').dataset.i, 1); sauver(); rendre(); return; }

    if (t.closest('[data-commander]')) { const n = $('.panier__note', panier); if (n) n.hidden = false; return; }

    const direct = t.closest('[data-ajouter-direct]');
    if (direct) {
      const id = direct.dataset.ajouterDirect;
      if (ajouter({ id, v: '', q: 1 })) { confirmer(direct, 'Ajouté ✓'); avertir(`${Q.produits[id].nom} ajouté au panier`); }
      return;
    }

    const tout = t.closest('[data-tout-ajouter]');
    if (tout) {
      const boxes = $$('[data-achat]', tout.closest('[data-achat-recette]')).filter(b => !('epuise' in b.dataset));
      boxes.forEach(b => ajouter(lire(b)));
      confirmer(tout, 'Ajoutés ✓'); avertir(`${boxes.length} produits ajoutés au panier`);
      return;
    }

    const aj = t.closest('[data-ajouter], [data-acheter]');
    if (aj) {
      const box = aj.closest('[data-achat]'); if (!box) return;
      const ligne = lire(box);
      if (!ajouter(ligne)) return;
      if (aj.hasAttribute('data-acheter')) { ouvrir(); return; }
      confirmer(aj, 'Ajouté ✓'); avertir(`${Q.produits[ligne.id].nom} ajouté au panier`);
      return;
    }

    const vue = t.closest('[data-vue]');
    if (vue) { ouvrirVue(vue.dataset.vue); return; }
    if (t.closest('[data-vue-fermer]') || t === dialogue) { dialogue.close(); }
  });

  document.addEventListener('change', e => {
    const box = e.target.closest('[data-achat]');
    if (box && (e.target.matches('input[type=radio]') || e.target.matches('select[data-variante]'))) majPrix(box);
    if (e.target.matches('.qte input')) {
      e.target.value = Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1));
      const aside = e.target.closest('[data-achat-recette]'); if (aside) majTotal(aside);
    }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && panier && panier.classList.contains('is-open')) fermer(); });

  /* ── Fiche produit (fenêtre) ── */
  const dialogue = $('#vue-rapide');
  let hashAvant = '';
  function ouvrirVue(id) {
    const modele = $('#fiche-' + id);
    if (!dialogue || !modele) return;
    $('#vue-rapide-corps').replaceChildren(modele.content.cloneNode(true));
    if (!dialogue.open) { hashAvant = location.hash.startsWith('#voir-') ? '' : location.hash; dialogue.showModal(); }
    history.replaceState(null, '', '#voir-' + id);
  }
  if (dialogue) {
    dialogue.addEventListener('close', () => { history.replaceState(null, '', location.pathname + location.search + hashAvant); });
  }

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
    const depuisHash = () => {
      const h = location.hash.slice(1);
      if (h.startsWith('voir-')) { ouvrirVue(h.slice(5)); return; }
      appliquer(cats.includes(h) ? h : 'tout');
    };
    appliquer('tout');
    depuisHash();
    addEventListener('hashchange', depuisHash);
    const h0 = location.hash.slice(1);
    if (cats.includes(h0) && h0 !== 'tout') requestAnimationFrame(() => scrollTo({ top: barre.offsetTop - 70, behavior: 'smooth' }));
  });
})();
