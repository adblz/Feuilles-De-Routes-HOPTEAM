// Création des cartes du formulaire (interventions, pauses) et réinitialisation.
// Le HTML vient de fdr_template.js ; les métiers / prestations de fdr_prestations.js ;
// les champs conditionnels de fdr_champs_extra.js ; la lecture de fdr_lecture.js.
import { attachAutocomplete, VILLES_KEY, CLIENTS_KEY } from './autocomplete.js';
import { setTravailManuel } from './fdr_calculs.js';
import { expanderCarte, collapserCarte, collapserToutesSauf } from './fdr_collapse.js';
import { activerDragCarte } from './fdr_dragdrop.js';
import { templateIntervention, templatePause } from './fdr_template.js';
import { initPrestations } from './fdr_prestations.js';
import { brancherGroupes, poserGroupes } from './fdr_champs_extra.js';
import { notifierChangement, supprimerElement, apresReordonnancement } from './fdr_liste.js';
import { viderRappel } from './fdr_rappel.js';
import { assurerCarteVisible } from '../utils/scroll.js';

let intCount   = 0;
let pauseCount = 0;

// Clic sur l'en-tête : plie/déplie la carte. Une seule carte ouverte à la fois,
// et on défile pour la voir en entier.
function brancherPliage(div) {
    div.querySelector('.int-header').addEventListener('click', (e) => {
        if (e.target.closest('.int-actions')) return;
        if (div.classList.contains('card-collapsed')) {
            collapserToutesSauf(div);
            expanderCarte(div);
            assurerCarteVisible(div);
        } else {
            collapserCarte(div);
        }
    });
}

// Commun aux interventions et aux pauses : corbeille, glisser-déposer, pliage, brouillon.
function brancherCarte(div, id) {
    div.querySelector('.btn-remove').addEventListener('click', () => supprimerElement(id));
    activerDragCarte(div, div.querySelector('.btn-drag'), apresReordonnancement, () => collapserToutesSauf(null));
    brancherPliage(div);
    div.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', notifierChangement);
    });
}

// ── Interventions & Pauses ─────────────────────────────────────

export function ajouterIntervention(data = {}) {
    intCount++;
    const n = intCount;
    const div = document.createElement('div');
    div.className    = 'intervention-card';
    div.id           = `int-card-${n}`;
    div.dataset.type = 'intervention';
    div.innerHTML    = templateIntervention(n);

    document.getElementById('interventions-list').appendChild(div);

    if (data.arrivee) document.getElementById(`i${n}-arrivee`).value = data.arrivee;
    if (data.depart)  document.getElementById(`i${n}-depart`).value  = data.depart;
    if (data.client)  document.getElementById(`i${n}-client`).value  = data.client;
    if (data.ville)   document.getElementById(`i${n}-ville`).value   = data.ville;
    if (data.details) document.getElementById(`i${n}-details`).value = data.details;

    // Les prestations d'abord : elles décident quels champs extra sont visibles
    // (un champ masqué est vidé, d'où la restauration de mo / becs / groupes après).
    initPrestations(n, div, data.typeInt || '');
    brancherGroupes(div);
    if (data.mo)      document.getElementById(`i${n}-mo`).value      = data.mo;
    if (data.mo_cafe) document.getElementById(`i${n}-mo_cafe`).value = data.mo_cafe;
    if (data.mo_bar)  document.getElementById(`i${n}-mo_bar`).value  = data.mo_bar;
    if (data.becs)    document.getElementById(`i${n}-becs`).value    = data.becs;
    if (data.groupes) poserGroupes(div, data.groupes);
    // Client venu du planning importé : son id suit la carte jusqu'à l'enregistrement.
    if (data.planningId) div.dataset.planningId = data.planningId;

    brancherCarte(div, `int-card-${n}`);

    div.querySelectorAll('.uppercase-input').forEach(el => {
        // On n'écrit PAS en majuscules pendant la saisie : ça casse la dictée
        // vocale du téléphone et fait sauter le curseur. L'affichage en
        // majuscules est géré visuellement par le CSS (text-transform).
        // On met la vraie valeur en majuscules une seule fois, à la sortie du champ.
        el.addEventListener('blur', () => {
            const majuscules = el.value.toUpperCase();
            if (majuscules !== el.value) el.value = majuscules;
        });
    });

    attachAutocomplete(document.getElementById(`i${n}-client`), CLIENTS_KEY);
    attachAutocomplete(document.getElementById(`i${n}-ville`),  VILLES_KEY,
        () => { const el = document.getElementById(`i${n}-client`); return el ? el.value : ''; });

    return div;
}

export function ajouterPause(data = {}) {
    pauseCount++;
    const n = pauseCount;
    const div = document.createElement('div');
    div.className    = 'pause-card';
    div.id           = `pause-card-${n}`;
    div.dataset.type = 'pause';
    div.innerHTML    = templatePause(n);

    document.getElementById('interventions-list').appendChild(div);

    if (data.debut) document.getElementById(`p${n}-debut`).value = data.debut;
    if (data.fin)   document.getElementById(`p${n}-fin`).value   = data.fin;

    brancherCarte(div, `pause-card-${n}`);

    return div;
}

// ── Réinitialisation ───────────────────────────────────────────

export function viderInterventions() {
    document.getElementById('interventions-list').innerHTML = '';
    intCount   = 0;
    pauseCount = 0;
    viderRappel();
}

export function resetSuppState() {
    setTravailManuel(false);
    const input = document.getElementById('heures-travail');
    input.classList.add('auto-field');
    input.classList.remove('auto-field-manual');
    document.getElementById('btn-travail-auto').style.display = 'none';
}
