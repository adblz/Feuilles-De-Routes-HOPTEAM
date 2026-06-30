// Logique de la section "Suggestions" de la page admin :
// chargement, comptage des nouvelles, et actions (marquer lu/traité, supprimer).

import { chargerSuggestions, marquerSuggestion, supprimerSuggestion } from '../api/admin_api.js';
import { renderSuggestions, majBadge } from './admin_suggestions_ui.js';
import { showToast } from '../utils/utils.js';

let _eventsInit = false;

export async function initSuggestions() {
    if (!_eventsInit) {
        document.getElementById('admin-suggestions-list')
            .addEventListener('click', onActionClick);
        _eventsInit = true;
    }
    await chargerEtAfficher();
}

async function chargerEtAfficher() {
    const box = document.getElementById('admin-suggestions-list');
    try {
        const list = await chargerSuggestions();
        renderSuggestions(list);
        majBadge(list.filter(s => s.statut === 'nouveau').length);
    } catch (e) {
        if (box) box.innerHTML = '<div class="sug-vide">Erreur de chargement.</div>';
        showToast('Erreur suggestions : ' + e.message, 'warn');
    }
}

async function onActionClick(e) {
    const btn = e.target.closest('.sug-btn');
    if (!btn) return;
    const { action, id } = btn.dataset;

    try {
        if (action === 'suppr') {
            if (!confirm('Supprimer cette suggestion ?')) return;
            await supprimerSuggestion(id);
            showToast('Suggestion supprimée', 'success');
        } else {
            await marquerSuggestion(id, action);
            showToast(action === 'lu' ? 'Marquée comme lue' : 'Marquée comme traitée', 'success');
        }
        await chargerEtAfficher();
    } catch (err) {
        showToast('Erreur : ' + err.message, 'warn');
    }
}
