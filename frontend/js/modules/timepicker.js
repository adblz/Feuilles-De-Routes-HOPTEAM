// timepicker.js — panneau de sélection d'heure (molette style iPhone) pour Android et ordinateur.
// Sur iPhone/iPad, on ne fait rien : la molette native d'iOS suffit.
// Se branche sur tous les champs <input type="time" class="heure-molette">.
// La roue elle-même (cylindre 3D, élan, calage) est dans timepicker_roue.js.

import { Roue } from './timepicker_roue.js';

const PAS_MINUTES = 5;   // pas des minutes (mettre 1 pour proposer chaque minute)

const estIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const pad2 = n => String(n).padStart(2, '0');
const HEURES  = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES = Array.from({ length: 60 / PAS_MINUTES }, (_, i) => pad2(i * PAS_MINUTES));

let overlay, roueH, roueM, titreEl, cibleInput;

function construire() {
    overlay = document.createElement('div');
    overlay.className = 'tp-overlay';
    overlay.innerHTML = `
        <div class="tp-panneau" role="dialog" aria-modal="true">
            <div class="tp-poignee"></div>
            <div class="tp-barre">
                <button type="button" class="tp-annuler">Annuler</button>
                <span class="tp-titre"></span>
                <button type="button" class="tp-ok">OK</button>
            </div>
            <div class="tp-roues">
                <div class="tp-bande"></div>
                <div class="tp-colonne" data-col="h" data-align="right" tabindex="0" role="spinbutton" aria-label="Heures"></div>
                <div class="tp-colonne" data-col="m" data-align="left"  tabindex="0" role="spinbutton" aria-label="Minutes"></div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    titreEl = overlay.querySelector('.tp-titre');
    roueH = new Roue(overlay.querySelector('[data-col="h"]'), HEURES);
    roueM = new Roue(overlay.querySelector('[data-col="m"]'), MINUTES);

    overlay.querySelector('.tp-annuler').addEventListener('click', fermer);
    overlay.querySelector('.tp-ok').addEventListener('click', valider);
    overlay.addEventListener('click', e => { if (e.target === overlay) fermer(); });
    document.addEventListener('keydown', e => {
        if (!overlay.classList.contains('ouvert')) return;
        if (e.key === 'Escape') fermer();
        if (e.key === 'Enter') valider();
    });
}

function libelle(input) {
    const lab = input.closest('.form-group')?.querySelector('label');
    return lab ? lab.textContent.trim() : 'Choisir une heure';
}

// Champ vide → heure actuelle (comme sur iPhone), sinon la valeur déjà saisie.
function valeurDepart(input) {
    if (input.value) return input.value.split(':');
    const now = new Date();
    return [pad2(now.getHours()), pad2(now.getMinutes())];
}

function ouvrir(input) {
    cibleInput = input;
    titreEl.textContent = libelle(input);
    const [h, m] = valeurDepart(input);
    const mm = pad2(Math.round(parseInt(m, 10) / PAS_MINUTES) * PAS_MINUTES % 60);
    overlay.classList.add('ouvert');
    roueH.aller(HEURES.includes(h) ? h : '08');
    roueM.aller(MINUTES.includes(mm) ? mm : MINUTES[0]);
}

function fermer() { overlay.classList.remove('ouvert'); }

function valider() {
    cibleInput.value = roueH.valeur + ':' + roueM.valeur;
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
