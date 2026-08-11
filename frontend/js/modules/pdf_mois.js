// Mise en page du PDF récapitulatif d'une période (un mois en général) :
// en-tête, totaux, tableau de synthèse jour par jour, puis le détail complet.

import { cfg, getLogoBase64 } from './fdr_config.js';
import { affH, parseDuree, escHtml, hhmm } from '../utils/utils.js';
import { totauxSuppPeriode } from './heures_calculs.js';
import { rangeLabel } from './periodes_paie.js';
import { renderDetailJours } from './pdf_mois_detail.js';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// « JUILLET 2026 » si la période couvre exactement un mois entier,
// sinon « du 3 juillet au 18 juillet 2026 ».
export function titrePeriode(debut, fin) {
    const d = new Date(debut + 'T12:00'), f = new Date(fin + 'T12:00');
    const dernierJour = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate();
    const moisEntier = d.getDate() === 1 && f.getDate() === dernierJour
        && d.getMonth() === f.getMonth() && d.getFullYear() === f.getFullYear();
    if (moisEntier) return `${MOIS[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
    const court = dt => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    return `Du ${court(d)} au ${court(f)} ${f.getFullYear()}`;
}

function ligneSynthese(f) {
    const dateAff = new Date(f.date + 'T12:00')
        .toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
    const nbInt = f.interventions.filter(i => i.kind === 'intervention').length;
    const supp  = f.heures_supp || '0h00';
    return `
        <tr${f.astreinte ? ' class="pdf-mois-tr-astreinte"' : ''}>
            <td>${dateAff}</td>
            <td class="c">${hhmm(f.heure_debut) || '—'}</td>
            <td class="c">${hhmm(f.heure_fin)   || '—'}</td>
            <td class="c">${f.repas_min ? f.repas_min + ' min' : '—'}</td>
            <td class="c b">${f.heures_travail  || '—'}</td>
            <td class="c${parseDuree(supp) > 0 ? ' s' : ''}">${supp}</td>
            <td class="c">${nbInt || '—'}</td>
        </tr>`;
}

function tableauSynthese(feuilles) {
    const totalTravail = feuilles.reduce((s, f) => s + parseDuree(f.heures_travail), 0);
    const totalSuppJ   = feuilles.reduce((s, f) => s + parseDuree(f.heures_supp), 0);
    const totalInt     = feuilles.reduce((s, f) => s + f.interventions.filter(i => i.kind === 'intervention').length, 0);
    return `
        <table class="pdf-mois-table">
            <thead>
                <tr>
                    <th>Jour</th><th class="c">Début</th><th class="c">Fin</th><th class="c">Repas</th>
                    <th class="c">Travail</th><th class="c">Supp.</th><th class="c">Interv.</th>
                </tr>
            </thead>
            <tbody>${feuilles.map(ligneSynthese).join('')}</tbody>
            <tfoot>
                <tr>
                    <td colspan="4">TOTAL — ${feuilles.length} jour${feuilles.length > 1 ? 's' : ''}</td>
                    <td class="c">${affH(totalTravail)}</td>
                    <td class="c">${affH(totalSuppJ)}</td>
                    <td class="c">${totalInt}</td>
                </tr>
            </tfoot>
        </table>`;
}

function caseTotal(label, valeur, accent = '') {
    return `<div class="pdf-mois-box${accent}"><div class="lbl">${label}</div><div class="val">${valeur}</div></div>`;
}

function blocTotaux(feuilles) {
    const t = totauxSuppPeriode(feuilles);
    return `
        <div class="pdf-mois-totaux">
            ${caseTotal('Jours travaillés', feuilles.length)}
            ${caseTotal('Heures travaillées', affH(t.travail))}
            ${caseTotal('Heures supp. (hebdo)', affH(t.supp), ' supp')}
            ${caseTotal('dont +25% / +50%', `${affH(t.supp25)} / ${affH(t.supp50)}`)}
        </div>
        ${(t.nuit || t.astreinte) ? `
        <div class="pdf-mois-totaux">
            ${t.nuit ? caseTotal('Heures de nuit', affH(t.nuit)) : ''}
            ${t.astreinte ? caseTotal('Heures d\'astreinte', affH(t.astreinte)) : ''}
        </div>` : ''}`;
}

function entete(titre, sousTitre, tech) {
    const logo = getLogoBase64();
    return `
        <div class="pdf-top">
            <div>
                <div class="pdf-title">Récapitulatif</div>
                <div class="pdf-date-line">${escHtml(titre)}${sousTitre ? ` <span style="color:#888;">(${escHtml(sousTitre)})</span>` : ''}</div>
            </div>
            <div class="pdf-company-block">
                ${logo ? `<img src="${logo}" style="height:44px;width:auto;display:block;margin-bottom:6px;margin-left:auto;">` : ''}
                ${cfg.company ? `<strong>${escHtml(cfg.company)}</strong><br>` : ''}
                <span style="color:#888;">Généré le ${new Date().toLocaleDateString('fr-FR')}</span>
            </div>
        </div>
        <div class="pdf-technicien-row" style="display:flex;justify-content:space-between;align-items:center;">
            <span>Technicien : ${escHtml(tech || '—')}</span>
            <span style="font-size:11px;font-weight:400;color:#4a5568;">Contrat ${escHtml(cfg.contrat)}h</span>
        </div>`;
}

// feuilles : lignes de chargerMoisDetail() (triées par date, non vide).
// titrePlanning : intitulé de la période du planning (« Juillet 2026 ») quand
// l'écran Heures en affiche une ; sinon on déduit le titre des deux dates.
export function construireRecapMois(feuilles, debut, fin, titrePlanning = null) {
    const titre     = titrePlanning || titrePeriode(debut, fin);
    const sousTitre = rangeLabel(debut, fin);
    const tech      = feuilles.find(f => f.tech)?.tech || '';
    return `
        ${entete(titre, sousTitre, tech)}
        ${blocTotaux(feuilles)}
        <div class="pdf-section-title">Synthèse par jour</div>
        ${tableauSynthese(feuilles)}
        <div class="pdf-mois-note">
            Heures supplémentaires calculées par semaine (au-delà de ${cfg.seuilHebdoMinutes / 60}h),
            sur les seules journées comprises dans la période.
        </div>
        <div class="pdf-section-title pdf-mois-break">Détail jour par jour</div>
        ${renderDetailJours(feuilles)}`;
}

export function nomFichierRecap(debut, fin, tech) {
    const slug = (tech || 'technicien').normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').toLowerCase();
    return `recapitulatif_${slug}_${debut}_${fin}.pdf`;
}
