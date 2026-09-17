// Tableau « Historique des imports » (onglet Import planning). Seul le
// dernier import est annulable : un import remplace toute la liste « à faire »
// de l'entreprise, annuler un plus ancien n'aurait aucun sens.

import { escHtml } from '../utils/utils.js';

function fmtDateHeure(iso) {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function actions(imp, estDernier, lectureSeule) {
    if (!estDernier) return '<span class="cell-muted">—</span>';
    const badge = '<span class="plan-badge plan-dernier">Dernier</span>';
    if (lectureSeule) return badge;
    return `${badge} <button type="button" class="btn-annuler-import" data-id="${imp.id}" title="Retire les clients encore à faire de cet import">Annuler cet import</button>`;
}

function ligne(imp, nomsParId, estDernier, lectureSeule) {
    return `<tr${estDernier ? ' class="plan-import-dernier"' : ''}>
        <td>${fmtDateHeure(imp.importe_le)}</td>
        <td>${escHtml(imp.fichier || '—')}</td>
        <td>${escHtml(nomsParId[imp.importe_par] || '—')}</td>
        <td class="plan-nb">${imp.nb_total ?? '—'}</td>
        <td class="plan-nb">${imp.nb_importees ?? '—'}</td>
        <td class="plan-nb">${imp.nb_ignorees ?? '—'}</td>
        <td class="col-actions">${actions(imp, estDernier, lectureSeule)}</td>
    </tr>`;
}

// imports : du plus récent au plus ancien ; nomsParId : { uuid → nom }.
export function renderImportsTable(imports, nomsParId, { lectureSeule = false } = {}) {
    const tbody = document.getElementById('resp-imports-tbody');
    if (!tbody) return;
    if (!imports.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="admin-table-vide">Aucun import pour cette entreprise.</td></tr>';
        return;
    }
    tbody.innerHTML = imports.map((imp, i) => ligne(imp, nomsParId, i === 0, lectureSeule)).join('');
}

export function renderImportsChargement(msg = 'Chargement…') {
    const tbody = document.getElementById('resp-imports-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="admin-table-vide">${escHtml(msg)}</td></tr>`;
}
