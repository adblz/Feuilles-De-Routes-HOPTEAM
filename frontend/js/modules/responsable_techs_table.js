// Tableau des techniciens (onglet « Techniciens » de la page responsable).

import { escHtml, ICON_MODIFIER, ICON_SUPPRIMER } from '../utils/utils.js';

const ICON_CLE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">' +
    '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>';

function normaliser(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function ligne(t) {
    const nom = escHtml(t.nom || '—');
    return `<tr>
        <td>
            <div class="cell-user-nom">${nom}</div>
            <div class="cell-user-email">${escHtml(t.email || '')}</div>
        </td>
        <td>${t.contrat ? `${escHtml(t.contrat)}h` : '<span class="cell-muted">—</span>'}</td>
        <td class="col-actions">
            <button type="button" class="btn-admin-modifier" data-id="${t.id}" title="Modifier">${ICON_MODIFIER}</button>
            <button type="button" class="btn-tech-password" data-id="${t.id}" title="Réinitialiser le mot de passe">${ICON_CLE}</button>
            <button type="button" class="btn-admin-supprimer" data-id="${t.id}" data-nom="${nom}" title="Supprimer">${ICON_SUPPRIMER}</button>
        </td>
    </tr>`;
}

export function renderTechsTable(techs, filtre = '') {
    const tbody = document.getElementById('resp-techs-tbody');
    const q = normaliser(filtre.trim());
    const visibles = q
        ? techs.filter(t => normaliser(t.nom).includes(q) || normaliser(t.email).includes(q))
        : techs;
    if (!visibles.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="admin-table-vide">${techs.length ? 'Aucun technicien ne correspond.' : 'Aucun technicien dans votre entreprise.'}</td></tr>`;
        return;
    }
    tbody.innerHTML = visibles.map(ligne).join('');
}
