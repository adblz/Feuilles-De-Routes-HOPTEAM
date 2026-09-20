// Métiers et prestations d'une carte d'intervention.
// La rangée Métier fonctionne comme des onglets : chaque bouton métier garde
// ses prestations cochées dans `data-coches` (séparées par des virgules), et
// seules les prestations du métier ouvert (classe `vu`) sont affichées.
// Un métier est `active` (bleu plein) dès qu'il a au moins une prestation.
import { METIERS, prestationsPour, decouperTypeInt, assemblerTypeInt } from './prestations.js';
import { majChampsExtra } from './fdr_champs_extra.js';
import { notifierChangement } from './fdr_liste.js';

const boutonsMetier = card => Array.from(card.querySelectorAll('.metier-btn'));
const boutonMetier  = (card, metier) => card.querySelector(`.metier-btn[data-value="${metier}"]`);
const cochesDe      = btn => (btn.dataset.coches || '').split(',').filter(Boolean);

// Toutes les prestations cochées de la carte, dans l'ordre des métiers : [{ metier, presta }].
export function lireListe(card) {
    return boutonsMetier(card).flatMap(btn => cochesDe(btn).map(presta => ({ metier: btn.dataset.value, presta })));
}

// Valeur à enregistrer dans `type_int` (ex. « Bière · Sanitation,Café · Joint-douchette »).
export function lirePrestations(card) {
    return assemblerTypeInt(lireListe(card));
}

function majMetierBoutons(card) {
    boutonsMetier(card).forEach(btn => {
        const n = cochesDe(btn).length;
        btn.classList.toggle('active', n > 0);
        const nb = btn.querySelector('.nb');
        if (nb) nb.textContent = n || '';
    });
}

function apresChangement(n, card) {
    majMetierBoutons(card);
    majChampsExtra(n, card, lireListe(card));
}

// Affiche les boutons de prestations du métier ouvert.
function rendrePrestations(n, card) {
    const groupe = document.getElementById(`i${n}-prestas-group`);
    const zone   = document.getElementById(`i${n}-prestas`);
    const ouvert = card.querySelector('.metier-btn.vu');
    if (!groupe || !zone) return;
    if (!ouvert) { groupe.classList.add('hidden'); return; }

    const metier = ouvert.dataset.value;
    const label  = document.getElementById(`i${n}-prestas-label`);
    if (label) label.textContent = `Prestations — ${metier}`;

    zone.innerHTML = '';
    prestationsPour(metier).forEach(presta => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'type-btn presta-btn' + (cochesDe(ouvert).includes(presta) ? ' active' : '');
        btn.textContent = presta;
        btn.addEventListener('click', () => {
            const coches = cochesDe(ouvert);
            ouvert.dataset.coches = (coches.includes(presta) ? coches.filter(p => p !== presta) : [...coches, presta]).join(',');
            btn.classList.toggle('active');
            apresChangement(n, card);
            notifierChangement();
        });
        zone.appendChild(btn);
    });
    groupe.classList.remove('hidden');
}

function ouvrirMetier(n, card, metier) {
    boutonsMetier(card).forEach(btn => btn.classList.toggle('vu', btn.dataset.value === metier));
    rendrePrestations(n, card);
}

// Coche des prestations d'un métier (ex. « Valider ce client » → Bière · Sanitation)
// et ouvre son onglet. Ne prévient pas le brouillon : à l'appelant de le faire.
export function selectionnerPrestations(n, card, metier, prestas) {
    const btn = boutonMetier(card, metier);
    if (!btn) return;
    btn.dataset.coches = [...new Set([...cochesDe(btn), ...prestas])].join(',');
    ouvrirMetier(n, card, metier);
    apresChangement(n, card);
}

// Branche les onglets et restaure les prestations depuis `typeInt`.
// Ancien format sans métier (« Sanitation,Dépannage ») : rattaché à Bière, le
// seul métier qui propose les quatre anciennes prestations.
export function initPrestations(n, card, typeInt) {
    boutonsMetier(card).forEach(btn => {
        btn.addEventListener('click', () => ouvrirMetier(n, card, btn.dataset.value));
    });

    decouperTypeInt(typeInt).forEach(({ metier, presta }) => {
        const m = metier || 'Bière';
        const btn = boutonMetier(card, m);
        if (!btn || !prestationsPour(m).includes(presta)) return;
        if (!cochesDe(btn).includes(presta)) btn.dataset.coches = [...cochesDe(btn), presta].join(',');
    });

    const premier = METIERS.find(m => cochesDe(boutonMetier(card, m)).length);
    if (premier) ouvrirMetier(n, card, premier);
    apresChangement(n, card);
}
