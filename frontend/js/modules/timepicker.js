// timepicker.js — molette de sélection d'heure (style iPhone) pour Android et ordinateur.
// Sur iPhone/iPad, on ne fait rien : la molette native d'iOS suffit.
// Se branche sur tous les champs <input type="time" class="heure-molette">.

const PAS_MINUTES = 5;   // pas des minutes (mettre 1 pour proposer chaque minute)
const ITEM_H = 44;       // hauteur d'un chiffre (doit correspondre au CSS)

const estIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const pad2 = n => String(n).padStart(2, '0');
const HEURES  = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES = Array.from({ length: Math.ceil(60 / PAS_MINUTES) }, (_, i) => pad2(i * PAS_MINUTES));

let overlay, colH, colM, titreEl, cibleInput, minuteau;

function remplir(el, valeurs) {
    const pad = `<div style="height:88px"></div>`;
    el.innerHTML = pad + valeurs.map(v => `<div class="tp-item" data-val="${v}">${v}</div>`).join('') + pad;
}

function indexActif(el) { return Math.round(el.scrollTop / ITEM_H); }

function vibrer() { if (navigator.vibrate) navigator.vibrate(8); }

function majActif(el) {
    const idx = indexActif(el);
    if (el.dataset.dernierIdx !== undefined && el.dataset.dernierIdx !== String(idx)) vibrer();
    el.dataset.dernierIdx = idx;
    el.querySelectorAll('.tp-item').forEach((it, i) => it.classList.toggle('actif', i === idx));
}

function surScroll(el) {
    majActif(el);
    clearTimeout(minuteau);
    minuteau = setTimeout(() => el.scrollTo({ top: indexActif(el) * ITEM_H, behavior: 'smooth' }), 90);
}

function scrollVers(el, valeurs, valeur) {
    const i = valeurs.indexOf(valeur);
    el.scrollTop = (i < 0 ? 0 : i) * ITEM_H;
    majActif(el);
}

function valeurColonne(el, valeurs) {
    return valeurs[Math.min(valeurs.length - 1, Math.max(0, indexActif(el)))];
}

function construire() {
    overlay = document.createElement('div');
    overlay.className = 'tp-overlay';
    overlay.innerHTML = `
        <div class="tp-panneau">
            <div class="tp-barre">
                <button type="button" class="tp-annuler">Annuler</button>
                <span class="tp-titre"></span>
                <button type="button" class="tp-ok">OK</button>
            </div>
            <div class="tp-roues">
                <div class="tp-selection"></div>
                <div class="tp-colonne" data-col="h"></div>
                <div class="tp-sep">:</div>
                <div class="tp-colonne" data-col="m"></div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    colH = overlay.querySelector('[data-col="h"]');
    colM = overlay.querySelector('[data-col="m"]');
    titreEl = overlay.querySelector('.tp-titre');
    remplir(colH, HEURES);
    remplir(colM, MINUTES);

    colH.addEventListener('scroll', () => surScroll(colH));
    colM.addEventListener('scroll', () => surScroll(colM));
    [colH, colM].forEach(col => col.addEventListener('click', e => {
        const it = e.target.closest('.tp-item');
        if (it) col.scrollTo({ top: [...col.querySelectorAll('.tp-item')].indexOf(it) * ITEM_H, behavior: 'smooth' });
    }));

    overlay.querySelector('.tp-annuler').addEventListener('click', fermer);
    overlay.querySelector('.tp-ok').addEventListener('click', valider);
    overlay.addEventListener('click', e => { if (e.target === overlay) fermer(); });
}

function libelle(input) {
    const lab = input.closest('.form-group')?.querySelector('label');
    return lab ? lab.textContent.trim() : 'Choisir une heure';
}

function ouvrir(input) {
    cibleInput = input;
    titreEl.textContent = libelle(input);
    let [h, m] = (input.value || '08:00').split(':');
    overlay.classList.add('ouvert');
    requestAnimationFrame(() => {
        scrollVers(colH, HEURES, HEURES.includes(h) ? h : '08');
        const mm = pad2(Math.round(parseInt(m || '0', 10) / PAS_MINUTES) * PAS_MINUTES % 60);
        scrollVers(colM, MINUTES, MINUTES.includes(mm) ? mm : MINUTES[0]);
    });
}

function fermer() { overlay.classList.remove('ouvert'); }

function valider() {
    const val = valeurColonne(colH, HEURES) + ':' + valeurColonne(colM, MINUTES);
    cibleInput.value = val;
    cibleInput.dispatchEvent(new Event('input', { bubbles: true }));
    cibleInput.dispatchEvent(new Event('change', { bubbles: true }));
    fermer();
}

// « lecture seule » = pas de clavier ni de sélecteur natif ; on ouvre notre molette au clic.
const prep = root => root.querySelectorAll?.('input.heure-molette').forEach(i => { i.readOnly = true; });

export function initTimePicker() {
    if (estIOS) return;   // iPhone/iPad : on garde la molette native
    construire();
    prep(document);
    // Les interventions sont créées à la volée : on les prépare dès leur ajout.
    const liste = document.getElementById('interventions-list');
    if (liste) new MutationObserver(muts =>
        muts.forEach(m => m.addedNodes.forEach(prep))).observe(liste, { childList: true, subtree: true });
    document.addEventListener('click', e => {
        const inp = e.target.closest('input.heure-molette');
        if (inp) ouvrir(inp);
    });
}
