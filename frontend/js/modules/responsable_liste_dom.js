// Manipulations du DOM de la liste des feuilles (page responsable) : état
// déplié/replié des fiches, barre de sélection, squelette de chargement.
// Séparé de responsable_liste.js (données) pour rester sous 150 lignes.

import { renderSquelette } from './responsable_render.js';
import * as selection from './responsable_selection.js';

// Conserve les fiches techniciens dépliées à travers un re-rendu.
export function capturerOuverts(container) {
    return new Set([...container.querySelectorAll('.resp-tech-card')]
        .filter(c => !c.querySelector('.resp-tech-body')?.classList.contains('hidden'))
        .map(c => c.dataset.uid));
}

export function restaurerOuverts(container, ouverts) {
    container.querySelectorAll('.resp-tech-card').forEach(c => {
        if (!ouverts.has(c.dataset.uid)) return;
        c.querySelector('.resp-tech-body')?.classList.remove('hidden');
        const chevron = c.querySelector('.resp-chevron');
        if (chevron) chevron.textContent = '▲';
    });
}

export function majBarreSelection() {
    const bar = document.getElementById('resp-selection-bar');
    const n = selection.nombreSelectionnes();
    bar.classList.toggle('hidden', !selection.estActif());
    document.getElementById('resp-selection-count').textContent =
        n === 0 ? 'Aucune feuille sélectionnée' : `${n} feuille${n > 1 ? 's' : ''} sélectionnée${n > 1 ? 's' : ''}`;
    document.getElementById('btn-resp-enregistrer').disabled = n === 0;
    document.getElementById('btn-resp-imprimer').disabled = n === 0;
    const toggle = document.getElementById('btn-resp-selection');
    if (toggle) toggle.textContent = selection.estActif() ? 'Fermer la sélection' : 'Sélectionner';
}

export function afficherChargement() {
    document.getElementById('resp-list').innerHTML = renderSquelette();
}

export function afficherErreurChargement() {
    document.getElementById('resp-list').innerHTML = '<div class="resp-loading">Erreur de connexion. Rechargez la page.</div>';
}
