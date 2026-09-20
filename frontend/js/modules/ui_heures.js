import { affH, affHSigne, escHtml, isoLocal } from '../utils/utils.js';
import { chargerHeuresSupp } from './db.js';
import { cfg } from './fdr_config.js';
import { totauxSuppPeriode, semainesPeriode } from './heures_calculs.js';
import { bornesEtendues } from './semaines.js';
import { fermerTousLesModals } from './ui_settings.js';

export function ouvrirSuppRecap() {
    fermerTousLesModals();
    const today        = isoLocal(new Date());
    const firstOfMonth = today.slice(0, 8) + '01';
    document.getElementById('supp-date-debut').value = firstOfMonth;
    document.getElementById('supp-date-fin').value   = today;
    document.getElementById('supp-result').innerHTML = '';
    document.getElementById('modal-supp').classList.add('open');
}

// Récap rapide : même calcul que l'onglet Heures (semaines entières,
// heures travaillées − contrat), présenté semaine par semaine.
export async function calculerSuppRecap() {
    const debut  = document.getElementById('supp-date-debut').value;
    const fin    = document.getElementById('supp-date-fin').value;
    const result = document.getElementById('supp-result');
    result.innerHTML = '<div>Calcul en cours…</div>';

    let histo;
    try {
        const bornes = bornesEtendues(debut, fin);
        histo = await chargerHeuresSupp(bornes.debut, bornes.fin);
    } catch {
        result.innerHTML = '<div class="supp-empty">Erreur de chargement. Vérifiez votre connexion.</div>';
        return;
    }

    const opts     = { contrat: cfg.contrat, aujourdhui: isoLocal(new Date()) };
    const semaines = semainesPeriode(histo, opts, debut, fin);
    if (!semaines.length) {
        result.innerHTML = '<div class="supp-empty">Aucune feuille de route sur cette période.</div>';
        return;
    }

    const totaux    = totauxSuppPeriode(histo, opts, debut, fin);
    const tableHtml = `
        <table class="supp-table">
            <thead><tr><th>Semaine</th><th>Travaillé</th><th>Supp.</th></tr></thead>
            <tbody>${semaines.map(s => `
                <tr>
                    <td>${escHtml(s.labelCourt)}</td>
                    <td>${affH(s.totalTravailMin)} <span class="supp-no-supp">/ ${affH(s.seuilMin)}</span></td>
                    <td class="supp-td-val">${s.totalSuppMin > 0 ? '+' + affH(s.totalSuppMin) : affHSigne(s.netMin)}</td>
                </tr>`).join('')}</tbody>
        </table>`;

    const nbFeuilles = semaines.reduce((t, s) => t + s.nbJours, 0);
    result.innerHTML = `
        <div class="supp-total-block">
            <div class="supp-total-label">Total heures supp.</div>
            <div class="supp-total">${affH(totaux.supp)}</div>
            <div class="supp-total-sub">${nbFeuilles} feuille${nbFeuilles > 1 ? 's' : ''} · 25 % : ${affH(totaux.supp25)} · 50 % : ${affH(totaux.supp50)}</div>
        </div>
        ${tableHtml}`;
}
