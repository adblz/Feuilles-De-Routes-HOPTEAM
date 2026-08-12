// Mise en page du PDF récapitulatif d'une période (un mois en général) :
// en-tête, totaux, tableau de synthèse jour par jour, puis le détail complet.

import { cfg, getLogoBase64 } from './fdr_config.js';
import { affH, escHtml } from '../utils/utils.js';
import { totauxSuppPeriode } from './heures_calculs.js';
import { rangeLabel } from './periodes_paie.js';
import { tableauSynthese } from './pdf_mois_table.js';
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

function caseTotal(label, valeur, accent = '') {
    return `<div class="pdf-mois-box${accent}"><div class="lbl">${label}</div><div class="val">${valeur}</div></div>`;
}

// Nuit et astreinte tiennent sur une simple bande d'une ligne plutôt que sur
// une seconde rangée de cases : le tableau de synthèse gagne d'autant de
// hauteur et déborde moins souvent sur une deuxième page.
function bandeExtras(t) {
    const items = [];
    if (t.nuit)      items.push(`<span><em>Heures de nuit</em>${affH(t.nuit)}</span>`);
    if (t.astreinte) items.push(`<span><em>Heures d'astreinte</em>${affH(t.astreinte)}</span>`);
    return items.length ? `<div class="pdf-mois-bande">${items.join('')}</div>` : '';
}

function blocTotaux(feuilles) {
    const t = totauxSuppPeriode(feuilles);
    return `
        <div class="pdf-mois-totaux">
            ${caseTotal('Jours travaillés', feuilles.length)}
            ${caseTotal('Heures travaillées', affH(t.travail))}
            ${caseTotal('Heures supp. (hebdo)', affH(t.supp), ' supp')}
            ${caseTotal('dont +25% / +50%', `${affH(t.supp25)} / ${affH(t.supp50)}`, ' large')}
        </div>
        ${bandeExtras(t)}`;
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
        <div class="pdf-section-title pdf-mois-titre">Synthèse par jour</div>
        ${tableauSynthese(feuilles)}
        <div class="pdf-mois-note">
            Les heures supplémentaires retenues sont calculées <strong>par semaine</strong>
            (au-delà de ${cfg.seuilHebdoMinutes / 60}h), sur les seules journées comprises dans la période :
            ce sont les sous-totaux de semaine et le TOTAL ci-dessus.
            La colonne « Supp. jour » rappelle seulement ce qui figure sur la feuille de route de la journée ;
            elle n'est pas totalisée, car une journée courte n'y génère aucune heure supplémentaire
            alors qu'elle compte entièrement dans le total de la semaine.
        </div>
        <div class="pdf-section-title pdf-mois-break">Détail jour par jour</div>
        ${renderDetailJours(feuilles)}`;
}

export function nomFichierRecap(debut, fin, tech) {
    const slug = (tech || 'technicien').normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').toLowerCase();
    return `recapitulatif_${slug}_${debut}_${fin}.pdf`;
}
