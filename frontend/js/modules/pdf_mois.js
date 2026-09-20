// Mise en page du PDF récapitulatif d'une période (un mois en général) :
// en-tête, totaux, tableau de synthèse jour par jour, puis le détail complet.

import { cfg, getLogoBase64 } from './fdr_config.js';
import { affH, escHtml, isoLocal } from '../utils/utils.js';
import { semainesPeriode, totauxSuppPeriode } from './heures_calculs.js';
import { palier25Pour } from './seuil_jour.js';
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

function blocTotaux(t, feuilles) {
    const nbJoursTravailles = feuilles.filter(f => !f.conge).length;
    return `
        <div class="pdf-mois-totaux">
            ${caseTotal('Jours travaillés', nbJoursTravailles)}
            ${caseTotal('Heures travaillées', affH(t.travail))}
            ${caseTotal('Heures supp. (hebdo)', affH(t.supp), ' supp')}
            ${caseTotal('dont +25% / +50%', `${affH(t.supp25)} / ${affH(t.supp50)}`, ' large')}
        </div>
        ${bandeExtras(t)}`;
}

function entete(titre, sousTitre, tech, contrat) {
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
            <span style="font-size:11px;font-weight:400;color:#4a5568;">Contrat ${escHtml(contrat)}h · seuil ${escHtml(contrat)}h/semaine · 25 % jusqu'à ${affH(palier25Pour(contrat))}</span>
        </div>`;
}

// feuilles : lignes de chargerMoisDetail() sur des semaines ENTIÈRES
// (bornesEtendues), triées par date. Seules les semaines dont le dimanche
// tombe dans [debut, fin] sont retenues, en entier.
// titrePlanning : intitulé de la période du planning (« Juillet 2026 ») quand
// l'écran Heures en affiche une ; sinon on déduit le titre des deux dates.
export function construireRecapMois(feuilles, debut, fin, titrePlanning = null) {
    const opts      = { contrat: cfg.contrat, aujourdhui: isoLocal(new Date()) };
    const semaines  = semainesPeriode(feuilles, opts, debut, fin);
    const totaux    = totauxSuppPeriode(feuilles, opts, debut, fin);
    const retenues  = semaines.flatMap(s => s.feuilles);
    const titre     = titrePlanning || titrePeriode(debut, fin);
    const sousTitre = rangeLabel(debut, fin);
    const tech      = retenues.find(f => f.tech)?.tech || feuilles.find(f => f.tech)?.tech || '';
    return `
        ${entete(titre, sousTitre, tech, totaux.contrat)}
        ${blocTotaux(totaux, retenues)}
        <div class="pdf-section-title pdf-mois-titre">Synthèse par jour</div>
        ${tableauSynthese(semaines, totaux)}
        <div class="pdf-mois-note">
            Les heures supplémentaires sont calculées <strong>par semaine</strong> (lundi → dimanche) :
            heures travaillées moins la durée du contrat (${escHtml(totaux.contrat)}h), elle-même réduite des jours
            fériés et des congés. Un jour ouvré sans feuille compte 0h travaillée.
            Majoration légale : ${affH(palier25Pour(totaux.contrat))} à +25 %, le reste à +50 %.
            La colonne « Écart jour » rappelle l'écart de chaque journée à son seuil (7h ou 8h, 0h le week-end
            et les fériés) ; elle n'est pas totalisée. Les heures travaillées sont celles déclarées par le
            technicien, qui peut les corriger sur sa feuille.
        </div>
        <div class="pdf-section-title pdf-mois-break">Détail jour par jour</div>
        ${renderDetailJours(retenues, totaux.contrat)}`;
}

export function nomFichierRecap(debut, fin, tech) {
    const slug = (tech || 'technicien').normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').toLowerCase();
    return `recapitulatif_${slug}_${debut}_${fin}.pdf`;
}
