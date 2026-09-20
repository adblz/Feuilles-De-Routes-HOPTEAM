import { escHtml, hhmm, affHSigne } from '../utils/utils.js';
import { timelineJour, trierChronologique } from './resume_timeline.js';
import { suppJour } from './heures_calculs.js';
import { libellesPrestations, nbPrestationsFeuille } from './prestations.js';

// Le repère « glissez pour changer de jour » disparaît dès que l'utilisateur a
// glissé une fois. C'est resume_nav.js qui pose ce drapeau (même clé).
const CLE_AIDE_SWIPE = 'fdr_swipe_vu';
function aideSwipeDejaVue() {
    try { return localStorage.getItem(CLE_AIDE_SWIPE) === '1'; } catch { return true; }
}

function formatDateLong(iso) {
    const d = new Date(iso + 'T12:00:00');
    const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
}

const plage = (a, b) => `${hhmm(a) || '—'} → ${hhmm(b) || '—'}`;

function ligneIntervention(el) {
    const details = [el.ville, ...libellesPrestations(el)].filter(Boolean).join(' · ');
    const groupes = el.groupes ? `${el.groupes} groupe${el.groupes > 1 ? 's' : ''}` : '';
    return `
        <div class="resume-item">
            <div class="resume-item-left">
                <span class="resume-item-client">${escHtml(el.client) || '—'}</span>
                ${details ? `<span class="resume-item-details">${escHtml(details)}</span>` : ''}
                ${el.mo   ? `<span class="resume-item-mo">MO : ${escHtml(el.mo)}</span>` : ''}
                ${groupes ? `<span class="resume-item-mo">${groupes}</span>` : ''}
            </div>
            <span class="resume-item-heures">${plage(el.heure_arrivee, el.heure_depart)}</span>
        </div>`;
}

// La pause est posée au milieu des interventions, à sa vraie place dans la
// journée ; le pictogramme et la couleur orange servent à la repérer.
function lignePause(el) {
    return `
        <div class="resume-item resume-item-pause">
            <div class="resume-item-left">
                <span class="resume-item-pause-txt">⏸ Pause</span>
            </div>
            <span class="resume-item-heures">${plage(el.pause_debut, el.pause_fin)}</span>
        </div>`;
}

function enTete(feuille, rappel) {
    const timeRange = (feuille.heure_debut && feuille.heure_fin)
        ? `${hhmm(feuille.heure_debut)} → ${hhmm(feuille.heure_fin)}` : '';
    const rappelRange = rappel ? plage(rappel.pause_debut, rappel.pause_fin) : '';
    const astreinte   = !!feuille.astreinte || !!(rappel && rappel.astreinte);

    // Écart au seuil du jour, recalculé depuis les heures travaillées (règle
    // unique, voir heures_calculs.js) ; affiché seulement s'il est non nul.
    const ecart  = feuille.heures_travail ? suppJour(feuille) : 0;
    const totaux = [
        feuille.heures_travail ? `${feuille.heures_travail} travaillées` : '',
        ecart ? `${affHSigne(ecart)} vs seuil du jour` : '',
    ].filter(Boolean).join(' · ');

    return `
        <div class="resume-hero">
            <p class="resume-label">Feuille du jour</p>
            <h2 class="resume-date-titre">${formatDateLong(feuille.date)}</h2>
            ${aideSwipeDejaVue() ? '' : '<p class="resume-aide-swipe">‹ glissez pour changer de jour ›</p>'}
            ${astreinte ? `<p class="resume-astreinte"><span class="astreinte-badge">Astreinte</span></p>` : ''}
            ${timeRange   ? `<p class="resume-time-range">${timeRange}</p>` : ''}
            ${rappelRange ? `<p class="resume-time-range">↩ Sortie suppl. ${rappelRange}${rappel && rappel.astreinte ? ' (astreinte)' : ''}</p>` : ''}
            ${totaux      ? `<p class="resume-totaux">${totaux}</p>`        : ''}
            <div class="resume-actions">
                <button class="resume-btn-envoyer" id="btn-resume-envoyer">📤 Envoyer</button>
                <button class="resume-btn-pdf" id="btn-resume-pdf">📄 PDF</button>
                <button class="resume-btn-modifier" id="btn-resume-modifier">✏️ Modifier</button>
                <button class="resume-btn-supprimer" id="btn-resume-supprimer" title="Supprimer">🗑️</button>
            </div>
        </div>`;
}

export function buildResumeHTML(feuille, elements) {
    const nbPresta = nbPrestationsFeuille(elements);
    const rappel   = elements.find(e => e.kind === 'rappel');

    // Interventions et pauses mélangées puis remises dans l'ordre des horaires.
    const deroule = trierChronologique(
        elements.filter(e => e.kind === 'intervention' || e.kind === 'pause'),
        feuille.heure_debut,
    );

    const lignes = deroule.length
        ? deroule.map(el => (el.kind === 'pause' ? lignePause(el) : ligneIntervention(el))).join('')
        : '<p class="resume-empty">Aucune intervention enregistrée.</p>';

    return enTete(feuille, rappel) + `
        <div class="card">
            <h3 class="resume-section-title">Prestations (${nbPresta})</h3>
            ${lignes}
        </div>`
        + timelineJour(feuille, elements);
}
