/* Espace client et commande de la maquette : coordonnées, adresse, commandes, lettre, export et suppression des données.
   Tout reste dans le navigateur (localStorage). Aucun mot de passe n'est conservé : sur le site en ligne, WooCommerce
   enregistre les clients (comptes, adresses, commandes) dans la base du site. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CLIENT = 'quillot-client', CONNECTE = 'quillot-connecte', COMMANDES = 'quillot-commandes', RETRACTATIONS = 'quillot-retractations';
  const lire = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? def : v; } catch (e) { return def; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const retirer = k => { try { localStorage.removeItem(k); } catch (e) { /* ignoré */ } };
  const FORMAT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  const eur = c => FORMAT.format(c / 100).replace(/[  ]/g, ' ');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const date = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const client = () => lire(CLIENT, null);
  const connecte = () => !!client() && lire(CONNECTE, false) === true;
  const valeurs = f => Object.fromEntries(new FormData(f).entries());
  const dire = (f, msg) => { const s = $('[data-statut]', f); if (s) s.textContent = msg; };
  const piege = f => !!(f.elements.site && f.elements.site.value);
  const valide = f => { if (f.checkValidity()) return true; f.reportValidity(); return false; };

  /* ───────────── Page « Mon compte » ───────────── */
  const visiteur = $('[data-vue="visiteur"]'), espace = $('[data-vue="client"]');
  if (visiteur && espace) {
    const titre = $('[data-compte-titre]'), intro = $('[data-compte-intro]'), surtitre = $('[data-compte-surtitre]');
    const PANNEAUX = ['tableau', 'commandes', 'adresse', 'infos', 'lettre', 'donnees'];

    const rendreCommandes = () => {
      const cmds = lire(COMMANDES, []).slice().reverse();
      const zone = $('[data-liste-commandes]');
      zone.innerHTML = cmds.length ? cmds.map(c => `<details class="commande-ligne">
        <summary><span><b>${esc(c.numero)}</b> · ${esc(date(c.date))}</span><span>${eur(c.total)}</span></summary>
        <ul>${c.lignes.map(l => `<li><span>${l.q} × ${esc(l.nom)}${l.format ? ' (' + esc(l.format) + ')' : ''}</span><span>${eur(l.prix * l.q)}</span></li>`).join('')}</ul>
        <p class="commande-ligne__total">Sous-total ${eur(c.st)}${c.remise ? ' · Remise −' + eur(c.remise) : ''} · Livraison ${c.liv ? eur(c.liv) : 'offerte'} · <b>Total TTC ${eur(c.total)}</b></p>
        <p>Livraison : ${esc(c.adresse.prenom)} ${esc(c.adresse.nom)}, ${esc(c.adresse.rue)}${c.adresse.comp ? ', ' + esc(c.adresse.comp) : ''}, ${esc(c.adresse.cp)} ${esc(c.adresse.ville)}. <i>Statut : enregistrée (démonstration).</i></p>
        <p class="commande-ligne__actions"><a href="index.html?motif=abime&amp;cmd=${encodeURIComponent(c.numero)}#contact">Signaler un problème</a> · <a href="retractation.html?cmd=${encodeURIComponent(c.numero)}">Me rétracter</a></p>
      </details>`).join('') : '<p class="vide">Vous n’avez pas encore passé de commande.</p><a class="btn btn--plein" href="produits.html">Voir les produits</a>';
      return cmds;
    };

    const remplir = () => {
      const c = client(), cmds = rendreCommandes();
      $('[data-nb-commandes]').textContent = cmds.length;
      $('[data-derniere]').textContent = cmds.length ? date(cmds[0].date) : '—';
      $('[data-total-achats]').textContent = eur(cmds.reduce((t, x) => t + x.total, 0));
      const a = c.adresse || {};
      $('[data-resume-adresse]').innerHTML = a.rue ? `Livraison à : <b>${esc(a.rue)}, ${esc(a.cp)} ${esc(a.ville)}</b>. <a href="#adresse">Modifier</a>` : 'Aucune adresse enregistrée : <a href="#adresse">ajouter mon adresse de livraison</a>.';
      const f = n => $(`[data-client="${n}"]`);
      Object.entries({ rue: a.rue, comp: a.comp, cp: a.cp, ville: a.ville, tel: c.tel }).forEach(([k, v]) => { f('adresse').elements[k].value = v || ''; });
      Object.entries({ prenom: c.prenom, nom: c.nom, email: c.email }).forEach(([k, v]) => { f('infos').elements[k].value = v || ''; });
      f('lettre').elements.recettes.checked = !!(c.lettre && c.lettre.recettes);
      f('lettre').elements.nouveautes.checked = !!(c.lettre && c.lettre.nouveautes);
    };

    const afficher = () => {
      const co = connecte();
      visiteur.hidden = co; espace.hidden = !co;
      if (!co) { titre.textContent = 'Mon compte'; surtitre.textContent = 'Espace client'; return; }
      const c = client();
      surtitre.textContent = 'Espace client';
      titre.textContent = 'Bonjour ' + c.prenom;
      intro.textContent = 'Vos commandes, votre adresse de livraison et vos préférences, au même endroit.';
      remplir();
      const h = location.hash.slice(1);
      const actif = PANNEAUX.includes(h) ? h : 'tableau';
      $$('[data-panneau]').forEach(p => { p.hidden = p.dataset.panneau !== actif; });
      $$('[data-lien]').forEach(a => { if (a.dataset.lien === actif) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    };
    addEventListener('hashchange', afficher);

    $('[data-client="connexion"]').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target;
      if (!valide(f)) return;
      const c = client();
      if (c && c.email.toLowerCase() === f.elements.email.value.trim().toLowerCase()) { ecrire(CONNECTE, true); f.reset(); location.hash = '#tableau'; afficher(); }
      else dire(f, 'Aucun espace client avec cette adresse dans ce navigateur (démonstration). Créez votre espace ci-contre.');
    });
    $('[data-client="inscription"]').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target;
      if (piege(f) || !valide(f)) return;
      const v = valeurs(f);
      if (v.mdp !== v.mdp2) { dire(f, 'Les deux mots de passe ne sont pas identiques.'); return; }
      /* le mot de passe est vérifié puis abandonné : la démonstration ne le conserve pas */
      ecrire(CLIENT, { prenom: v.prenom.trim(), nom: v.nom.trim(), email: v.email.trim(), tel: (v.tel || '').trim(), adresse: {}, lettre: { recettes: !!v.recettes, nouveautes: !!v.recettes }, cree: new Date().toISOString() });
      ecrire(CONNECTE, true); f.reset(); location.hash = '#tableau'; afficher();
    });
    $('[data-client="adresse"]').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target; if (!valide(f)) return;
      const v = valeurs(f), c = client();
      c.adresse = { rue: v.rue.trim(), comp: v.comp.trim(), cp: v.cp.trim(), ville: v.ville.trim() }; c.tel = v.tel.trim();
      ecrire(CLIENT, c); dire(f, 'Adresse enregistrée.'); remplir();
    });
    $('[data-client="infos"]').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target; if (!valide(f)) return;
      const v = valeurs(f), c = client();
      Object.assign(c, { prenom: v.prenom.trim(), nom: v.nom.trim(), email: v.email.trim() });
      ecrire(CLIENT, c); dire(f, 'Informations enregistrées.'); titre.textContent = 'Bonjour ' + c.prenom;
    });
    $('[data-client="lettre"]').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target, c = client();
      c.lettre = { recettes: f.elements.recettes.checked, nouveautes: f.elements.nouveautes.checked };
      ecrire(CLIENT, c); dire(f, 'Vos choix sont enregistrés.');
    });
    $('[data-deconnexion]').addEventListener('click', () => { ecrire(CONNECTE, false); location.hash = ''; afficher(); });
    $('[data-export]').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({ client: client(), commandes: lire(COMMANDES, []), retractations: lire(RETRACTATIONS, []) }, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'mes-donnees-foie-gras-quillot.json' });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('[data-suppression]').addEventListener('click', () => { [CLIENT, CONNECTE, COMMANDES, RETRACTATIONS].forEach(retirer); location.hash = ''; location.reload(); });
    afficher();
  }

  /* ───────────── Page « Ma commande » ───────────── */
  const formCommande = $('[data-client="commande"]');
  if (formCommande && window.quillotPanier) {
    const P = window.quillotPanier;
    const recap = $('[data-recap]');
    const rendreRecap = () => {
      const lignes = P.lire();
      if (!lignes.length) {
        recap.innerHTML = '<p class="vide">Votre panier est vide.</p><a class="btn btn--plein" href="produits.html">Voir les produits</a>';
        $$('button[type=submit]', formCommande).forEach(b => { b.disabled = true; });
        return;
      }
      const t = P.totaux();
      recap.innerHTML = `<ul class="recap__lignes">${lignes.map(l => `<li><span>${l.q} × <a href="${l.url}">${esc(l.nom)}</a>${l.format ? `<small>${esc(l.format)}</small>` : ''}</span><b>${eur(l.prix * l.q)}</b></li>`).join('')}</ul>
        <dl class="panier__totaux"><div><dt>Sous-total</dt><dd>${eur(t.st)}</dd></div>
        ${t.remise ? `<div><dt>Remise</dt><dd>−${eur(t.remise)}</dd></div>` : ''}
        <div><dt>Livraison (France)</dt><dd>${t.liv ? eur(t.liv) : 'Offerte'}</dd></div>
        <div class="total"><dt>Total TTC</dt><dd>${eur(t.total)}</dd></div></dl>`;
    };
    rendreRecap();

    const c0 = client();
    if (c0) {
      const a = c0.adresse || {};
      Object.entries({ prenom: c0.prenom, nom: c0.nom, email: c0.email, tel: c0.tel, rue: a.rue, comp: a.comp, cp: a.cp, ville: a.ville }).forEach(([k, v]) => { if (v) formCommande.elements[k].value = v; });
      $('[data-bloc-creation]').hidden = true;
      formCommande.elements.creer.checked = false;
    }

    formCommande.addEventListener('submit', e => {
      e.preventDefault();
      if (piege(formCommande) || !valide(formCommande)) return;
      const lignes = P.lire();
      if (!lignes.length) { dire(formCommande, 'Votre panier est vide.'); return; }
      const v = valeurs(formCommande), t = P.totaux();
      const cmds = lire(COMMANDES, []);
      const maintenant = new Date();
      const numero = `Q-${maintenant.toISOString().slice(0, 10).replace(/-/g, '')}-${String(cmds.length + 1).padStart(3, '0')}`;
      const adresse = { prenom: v.prenom.trim(), nom: v.nom.trim(), rue: v.rue.trim(), comp: v.comp.trim(), cp: v.cp.trim(), ville: v.ville.trim() };
      cmds.push({ numero, date: maintenant.toISOString(), email: v.email.trim(), tel: v.tel.trim(), adresse, lignes: lignes.map(({ nom, format, q, prix }) => ({ nom, format, q, prix })), ...t });
      ecrire(COMMANDES, cmds);

      let message = '';
      let c = client();
      if (c) {
        c.adresse = { rue: adresse.rue, comp: adresse.comp, cp: adresse.cp, ville: adresse.ville }; c.tel = v.tel.trim(); ecrire(CLIENT, c);
        message = 'Votre adresse est enregistrée dans votre espace client pour la prochaine commande.';
      } else if (v.creer) {
        c = { prenom: adresse.prenom, nom: adresse.nom, email: v.email.trim(), tel: v.tel.trim(), adresse: { rue: adresse.rue, comp: adresse.comp, cp: adresse.cp, ville: adresse.ville }, lettre: { recettes: !!v.recettes, nouveautes: !!v.recettes }, cree: maintenant.toISOString() };
        ecrire(CLIENT, c); ecrire(CONNECTE, true);
        message = 'Votre espace client est créé : vos coordonnées et cette commande y sont conservées. Sur le site en ligne, un e-mail vous permettra de choisir votre mot de passe.';
      }
      P.vider();
      $('[data-merci-prenom]').textContent = adresse.prenom;
      $('[data-merci-numero]').textContent = numero;
      $('[data-merci-email]').textContent = v.email.trim();
      $('[data-merci-compte]').textContent = message;
      $('[data-vue="formulaire"]').hidden = true; $('.compte-demo').hidden = true; $('[data-vue="merci"]').hidden = false;
      scrollTo({ top: 0 });
    });
  }

  /* ───────────── Page « Me rétracter » : fonction de rétractation en deux étapes (saisie, puis confirmation), accusé de réception immédiat ───────────── */
  const formRetractation = $('[data-client="retractation"]');
  if (formRetractation) {
    const vues = Object.fromEntries($$('[data-vue]').map(v => [v.dataset.vue, v]));
    const montrer = (...noms) => { Object.entries(vues).forEach(([n, v]) => { v.hidden = !noms.includes(n); }); };
    const c0 = client(), url = new URLSearchParams(location.search);
    if (c0) Object.entries({ prenom: c0.prenom, nom: c0.nom, email: c0.email }).forEach(([k, v]) => { if (v) formRetractation.elements[k].value = v; });
    if (url.get('cmd')) formRetractation.elements.commande.value = url.get('cmd');
    let saisie = null;
    const LIBELLES = [['prenom', 'Prénom'], ['nom', 'Nom'], ['email', 'E-mail'], ['commande', 'Commande'], ['recue', 'Reçue le'], ['produits', 'Produits concernés']];
    formRetractation.addEventListener('submit', e => {
      e.preventDefault();
      if (piege(formRetractation) || !valide(formRetractation)) return;
      saisie = Object.fromEntries(LIBELLES.map(([k]) => [k, String(valeurs(formRetractation)[k] || '').trim()]));
      $('[data-resume]').innerHTML = LIBELLES.map(([k, l]) => `<div><dt>${l}</dt><dd>${k === 'recue' && saisie.recue ? esc(date(saisie.recue)) : esc(saisie[k] || (k === 'produits' ? 'Toute la commande' : '—'))}</dd></div>`).join('');
      montrer('confirmation'); scrollTo({ top: 0 });
    });
    $('[data-modifier]').addEventListener('click', () => { montrer('regles', 'formulaire'); scrollTo({ top: 0 }); });
    $('[data-confirmer]').addEventListener('click', () => {
      if (!saisie) return;
      const liste = lire(RETRACTATIONS, []), maintenant = new Date();
      const reference = `R-${maintenant.toISOString().slice(0, 10).replace(/-/g, '')}-${String(liste.length + 1).padStart(3, '0')}`;
      liste.push({ reference, date: maintenant.toISOString(), ...saisie });
      ecrire(RETRACTATIONS, liste);
      $('[data-accuse-date]').textContent = maintenant.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
      $('[data-accuse-reference]').textContent = reference;
      $('[data-accuse-email]').textContent = saisie.email;
      $('.compte-demo').hidden = true;
      montrer('accuse'); scrollTo({ top: 0 });
    });
  }
})();
