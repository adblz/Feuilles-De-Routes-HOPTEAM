// HTML de la vue numérique d'une feuille (modale #modal-detail, page
// responsable) : en-tête, frise de la journée, liste des interventions et
// bloc de validation des heures supp.

import { escHtml, hhmm, affH, parseDuree } from '../utils/utils.js';
import { timelineJour, trierChronologique } from './resume_timeline.js';

const plage = (a, b) => `${hhmm(a) || '—'} → ${hhmm(b) || '—'}`;

export function formatDateLong(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateHeure(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ligneElement(el) {
    if (el.kind === 'pause') {
        return `<div class="detail-interv pause"><span>⏸ Pause</span><span class="detail-interv-heures">${plage(el.pause_debut, el.pause_fin)}</span></div>`;
    }
    if (el.kind === 'rappel') {
        return `<div class="detail-interv rappel"><span>↩ Sortie supplémentaire${el.astreinte ? ' (astreinte)' : ''}</span><span class="detail-interv-heures">${plage(el.pause_debut, el.pause_fin)}</span></div>`;
    }
    const meta = [el.ville, el.type_int, el.mo ? `MO : ${el.mo}` : '', el.becs ? `${el.becs} bec(s)` : ''].filter(Boolean).join(' · ');
    return `<div class="detail-interv">
        <div>
            <div class="detail-interv-client">${escHtml(el.client) || '—'}</div>
            ${meta ? `<div class="detail-interv-meta">${escHtml(meta)}</div>` : ''}
            ${el.details ? `<div class="detail-interv-meta">${escHtml(el.details)}</div>` : ''}
        </div>
        <span class="detail-interv-heures">${plage(el.heure_arrivee, el.heure_depart)}</span>
    </div>`;
}

function enTete(feuille) {
    const tags = [
        feuille.conge ? '<span class="detail-tag conge">Congé</span>' : '',
        feuille.astreinte ? '<span class="detail-tag">Astreinte</span>' : '',
        feuille.contrat ? `<span class="detail-tag">${escHtml(feuille.contrat)}h</span>` : '',
    ].filter(Boolean).join(' ');
    if (feuille.conge) {
        return `<div class="detail-hero"><div class="detail-hero-date">${formatDateLong(feuille.date)}</div><div>${tags}</div></div>`;
    }
    return `<div class="detail-hero">
        <div class="detail-hero-date">${formatDateLong(feuille.date)}</div>
        <div class="detail-meta"><span>Journée</span><strong>${plage(feuille.heure_debut, feuille.heure_fin)}</strong></div>
        <div class="detail-meta"><span>Repas</span><strong>${feuille.repas_min ? feuille.repas_min + ' min' : '—'}</strong></div>
        <div class="detail-meta"><span>Travaillé</span><strong>${escHtml(feuille.heures_travail || '—')}</strong></div>
        <div class="detail-meta"><span>Supp déclarées</span><strong>${escHtml(feuille.heures_supp || '0h00')}</strong></div>
        <div>${tags}</div>
    </div>`;
}

function blocValidation(feuille, validation, obsolete) {
    const valeur = validation ? affH(validation.heures_validees_min) : affH(parseDuree(feuille.heures_supp));
    const info = validation
        ? `Validé le ${formatDateHeure(validation.validee_le)} : <strong>${affH(validation.heures_validees_min)}</strong>${validation.commentaire ? ` — ${escHtml(validation.commentaire)}` : ''}`
        : 'Aucune validation pour cette journée. Le champ est pré-rempli avec les heures déclarées par le technicien.';
    const alerte = obsolete
        ? '<p class="detail-validation-alerte">⚠ Le technicien a ré-enregistré cette feuille après votre validation. Vérifiez et validez à nouveau.</p>'
        : '';
    return `<div class="detail-validation">
        <h4 class="detail-section-titre">Validation des heures supp</h4>
        ${alerte}
        <div class="detail-validation-ligne">
            <div class="form-group">
                <label for="detail-supp-validees">Heures supp validées</label>
                <input type="text" id="detail-supp-validees" value="${valeur}" placeholder="ex. 1h30" inputmode="numeric">
            </div>
            <div class="form-group">
                <label for="detail-commentaire">Commentaire (facultatif)</label>
                <input type="text" id="detail-commentaire" value="${escHtml(validation?.commentaire || '')}" placeholder="ex. déplacement non compté">
            </div>
        </div>
        <p class="detail-validation-info">${info}</p>
        <div class="detail-actions">
            <button type="button" class="btn-admin-annuler" id="btn-detail-pdf">📄 Voir le PDF</button>
            <span>
                ${validation ? '<button type="button" class="btn-admin-annuler" id="btn-detail-annuler-validation">Retirer la validation</button> ' : ''}
                <button type="button" class="btn-admin-valider" id="btn-detail-valider">Valider</button>
            </span>
        </div>
    </div>`;
}

// feuille : ligne feuilles_de_route ; elements : lignes interventions ;
// validation : ligne validations_heures_supp ou null ; obsolete : bool.
export function renderDetail(feuille, elements, validation, obsolete) {
    if (feuille.conge) {
        return `${enTete(feuille)}<p class="resp-empty">Jour de congé : aucune intervention.</p>`;
    }
    const tries = trierChronologique(elements, feuille.heure_debut);
    const nbInts = tries.filter(e => e.kind === 'intervention').length;
    const frise = timelineJour(feuille, tries);
    return `${enTete(feuille)}
        ${frise ? `<div class="detail-frise"><h4 class="detail-section-titre">Frise de la journée</h4>${frise}</div>` : ''}
        <div>
            <h4 class="detail-section-titre">Interventions (${nbInts})</h4>
            ${tries.length ? tries.map(ligneElement).join('') : '<p class="resp-empty">Aucune intervention saisie.</p>'}
        </div>
        ${blocValidation(feuille, validation, obsolete)}`;
}
