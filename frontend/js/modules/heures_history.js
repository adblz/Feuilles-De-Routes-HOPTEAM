import { chargerHeuresSupp } from './db.js';
import { calcHebdomadaire } from './heures_calculs.js';
import { affH, isoLocal } from '../utils/utils.js';
import { cfg } from './fdr_config.js';

let initialized = false;

function debutMois() {
    const n = new Date();
    return isoLocal(new Date(n.getFullYear(), n.getMonth(), 1));
}

export function afficherHeures() {
    ['vue-dashboard', 'vue-formulaire', 'vue-resume'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
    document.getElementById('vue-heures').classList.remove('hidden');
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent('nav:heures'));

    if (!initialized) {
        initialized = true;
        document.getElementById('heures-date-debut').value = debutMois();
        document.getElementById('heures-date-fin').value   = isoLocal(new Date());
        document.getElementById('btn-heures-calc').addEventListener('click', chargerEtRendre);
    }
    chargerEtRendre();
}

export async function chargerEtRendre() {
    const debut = document.getElementById('heures-date-debut').value;
    const fin   = document.getElementById('heures-date-fin').value;
    if (!debut || !fin) return;

    const zone = document.getElementById('heures-tableau');
    zone.innerHTML = '<p class="heures-loading">Chargement…</p>';

    try {
        const feuilles = await chargerHeuresSupp(debut, fin);
        const semaines = calcHebdomadaire(feuilles, cfg.contrat);
        zone.innerHTML = renderTableau(semaines);
    } catch (e) {
        zone.innerHTML = `<p class="heures-error">Erreur : ${e.message}</p>`;
    }
}

function renderTableau(semaines) {
    if (!semaines.length) {
        return '<p class="heures-vide">Aucune feuille sur cette période.</p>';
    }

    const hasNuit = semaines.some(s => s.totalNuitMin > 0);

    let html = '<table class="heures-table"><thead><tr>';
    html += '<th>Semaine</th><th>Jours</th><th>Supp.</th>';
    if (hasNuit) html += '<th>Nuit</th>';
    html += '<th>25%</th><th>50%</th>';
    html += '</tr></thead><tbody>';

    for (const s of semaines) {
        html += '<tr>';
        html += `<td class="heures-semaine">${s.label}</td>`;
        html += `<td>${s.nbJours}j</td>`;
        html += `<td class="heures-mono">${s.totalSuppMin > 0 ? affH(s.totalSuppMin) : '—'}</td>`;
        if (hasNuit) html += `<td class="heures-mono">${s.totalNuitMin > 0 ? affH(s.totalNuitMin) : '—'}</td>`;
        html += `<td class="heures-mono${s.supp25 > 0 ? ' heures-25' : ''}">${s.supp25 > 0 ? affH(s.supp25) : '—'}</td>`;
        html += `<td class="heures-mono${s.supp50 > 0 ? ' heures-50' : ''}">${s.supp50 > 0 ? affH(s.supp50) : '—'}</td>`;
        html += '</tr>';
    }

    // Ligne totaux
    const totSupp = semaines.reduce((a, s) => a + s.totalSuppMin, 0);
    const totNuit = semaines.reduce((a, s) => a + s.totalNuitMin, 0);
    const tot25   = semaines.reduce((a, s) => a + s.supp25, 0);
    const tot50   = semaines.reduce((a, s) => a + s.supp50, 0);

    html += '<tr class="heures-total">';
    html += '<td colspan="2">Total</td>';
    html += `<td class="heures-mono">${affH(totSupp)}</td>`;
    if (hasNuit) html += `<td class="heures-mono">${affH(totNuit)}</td>`;
    html += `<td class="heures-mono">${affH(tot25)}</td>`;
    html += `<td class="heures-mono">${affH(tot50)}</td>`;
    html += '</tr>';

    html += '</tbody></table>';
    return html;
}
