// HTML de l'onglet « Planning en cours » : une carte dépliable par technicien
// (même look que l'onglet Heures supp) avec ses compteurs et le tableau de
// ses clients. Les actions (réaffecter / retirer) n'existent que pour un
// client à faire, et jamais en lecture seule.

import { escHtml, ICON_SUPPRIMER } from '../utils/utils.js';
import { initiales } from './responsable_render.js';
import { estEnRetard, retardJours, NON_AFFECTE } from './responsable_planning_data.js';

const fmtDate = iso => iso ? iso.split('-').reverse().join('/') : '';

function badgeDate(c, todayISO) {
    if (c.fait_le) return `<span class="plan-badge plan-fait">Fait le ${fmtDate(c.fait_le)}</span>`;
    if (!c.date_prevue) return '<span class="plan-badge plan-sans-date">Sans date</span>';
    if (estEnRetard(c, todayISO)) {
        const j = retardJours(c, todayISO);
        return `<span class="plan-badge plan-retard">Retard ${j} j</span>`;
    }
    return `<span class="plan-badge plan-prevu">${fmtDate(c.date_prevue)}</span>`;
}

function selectTech(c, techs) {
    const ids = c.ids.join(',');
    const options = [`<option value=""${c.user_id ? '' : ' selected'}>— Non affecté —</option>`]
        .concat(techs.map(t =>
            `<option value="${t.id}"${t.id === c.user_id ? ' selected' : ''}>${escHtml(t.nom || '—')}</option>`));
    return `<select class="plan-select-tech" data-ids="${ids}" data-nom="${escHtml(c.nom_pdv)}" title="Réaffecter à un autre technicien">${options.join('')}</select>`;
}

function actions(c, groupe, { techs, lectureSeule }) {
    if (c.fait_le) return '<span class="cell-muted">—</span>';
    if (lectureSeule) return '<span class="cell-muted" title="Lecture seule : ce n\'est pas votre entreprise">Lecture seule</span>';
    return `${selectTech(c, techs)}
        <button type="button" class="btn-admin-supprimer plan-btn-retirer" data-ids="${c.ids.join(',')}"
            data-nom="${escHtml(c.nom_pdv)}" data-tech="${escHtml(groupe.nom)}" data-postes="${c.postes}" title="Retirer de la liste">${ICON_SUPPRIMER}</button>`;
}

function ligneClient(c, groupe, opts) {
    const postes = c.postes > 1 ? `<span class="plan-postes"> · ${c.postes} postes</span>` : '';
    return `<tr>
        <td>
            <div class="cell-user-nom">${escHtml(c.nom_pdv || '—')}</div>
            <div class="cell-user-email">${escHtml(c.code_pdv)}${postes}</div>
        </td>
        <td class="plan-col-sec">${escHtml(c.ville || '')}${c.code_postal ? ` <span class="cell-muted">${escHtml(c.code_postal)}</span>` : ''}</td>
        <td class="plan-col-sec">${escHtml(c.secteur || '')}</td>
        <td>${badgeDate(c, opts.todayISO)}</td>
        <td class="col-actions plan-actions">${actions(c, groupe, opts)}</td>
    </tr>`;
}

function tableau(groupe, opts) {
    const lignes = groupe.clients.length
        ? groupe.clients.map(c => ligneClient(c, groupe, opts)).join('')
        : '<tr><td colspan="5" class="admin-table-vide">Aucun client ne correspond.</td></tr>';
    return `<table class="admin-table plan-table">
        <thead><tr><th>Client</th><th class="plan-col-sec">Ville</th><th class="plan-col-sec">Secteur</th><th>Date prévue</th><th class="col-actions">Actions</th></tr></thead>
        <tbody>${lignes}</tbody>
    </table>`;
}

function carteTech(g, opts) {
    const ferme = opts.fermes.has(g.id);
    const nonAffecte = g.id === NON_AFFECTE;
    return `<div class="heures-tech-card plan-tech-card${nonAffecte ? ' plan-non-affecte' : ''}" data-uid="${g.id}">
        <div class="heures-tech-header">
            <span class="resp-avatar">${nonAffecte ? '?' : escHtml(initiales(g.nom))}</span>
            <div class="resp-tech-info">
                <span class="resp-tech-nom">${escHtml(g.nom)}</span>
                <span class="resp-tech-sous-titre">${g.clients.length} client${g.clients.length > 1 ? 's' : ''} affiché${g.clients.length > 1 ? 's' : ''}</span>
            </div>
            <div class="heures-tech-totaux">
                <div class="heures-tech-total"><span>À faire</span><strong>${g.nbAFaire}</strong></div>
                <div class="heures-tech-total valide"><span>Faits</span><strong>${g.nbFaits}</strong></div>
                <div class="heures-tech-total${g.nbRetard ? ' plan-total-retard' : ''}"><span>En retard</span><strong>${g.nbRetard}</strong></div>
            </div>
            <span class="resp-chevron">${ferme ? '▶' : '▼'}</span>
        </div>
        <div class="heures-tech-body${ferme ? ' hidden' : ''}">${tableau(g, opts)}</div>
    </div>`;
}

// groupes : grouperParTechnicien() ; opts = { techs, lectureSeule, todayISO, fermes:Set }
export function renderPlanning(groupes, opts) {
    if (!groupes.length) return renderPlanningVide('Aucun technicien dans cette entreprise.');
    return groupes.map(g => carteTech(g, opts)).join('');
}

export function renderPlanningVide(msg) {
    return `<p class="resp-empty">${escHtml(msg)}</p>`;
}
