// Rendu HTML des suggestions reçues côté admin.

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const LABEL_STATUT = { nouveau: 'Nouveau', lu: 'Lu', traite: 'Traité' };

export function majBadge(nbNouveau) {
    const badge = document.getElementById('sug-badge');
    if (!badge) return;
    if (nbNouveau > 0) {
        badge.textContent = nbNouveau;
        badge.classList.remove('hidden');
    } else {
        badge.textContent = '';
        badge.classList.add('hidden');
    }
}

export function renderSuggestions(list) {
    const box = document.getElementById('admin-suggestions-list');
    if (!box) return;

    if (!list.length) {
        box.innerHTML = '<div class="sug-vide">Aucune suggestion pour le moment.</div>';
        return;
    }

    box.innerHTML = list.map(s => `
        <div class="sug-item sug-${s.statut}">
            <div class="sug-item-head">
                <span class="sug-cat sug-cat-${escHtml(s.categorie || 'Autre')}">${escHtml(s.categorie || 'Autre')}</span>
                <span class="sug-statut sug-statut-${s.statut}">${LABEL_STATUT[s.statut] || s.statut}</span>
            </div>
            <p class="sug-message">${escHtml(s.message || '')}</p>
            <div class="sug-meta">
                <span class="sug-auteur">${escHtml(s.technicien_nom || 'Technicien')}</span>
                <span class="sug-date">${formatDate(s.created_at)}</span>
            </div>
            <div class="sug-actions">
                ${s.statut === 'nouveau' ? `<button class="sug-btn sug-btn-lu" data-action="lu" data-id="${s.id}">Marquer lu</button>` : ''}
                ${s.statut !== 'traite' ? `<button class="sug-btn sug-btn-traite" data-action="traite" data-id="${s.id}">Marquer traité</button>` : ''}
                <button class="sug-btn sug-btn-suppr" data-action="suppr" data-id="${s.id}">Supprimer</button>
            </div>
        </div>
    `).join('');
}
