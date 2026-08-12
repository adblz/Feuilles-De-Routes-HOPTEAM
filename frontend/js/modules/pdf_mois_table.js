// Tableau de synthèse du PDF récapitulatif : une ligne par jour, regroupées
// par semaine avec un sous-total. Les heures supp. retenues sont celles du
// calcul hebdomadaire (au-delà du seuil), comme sur l'écran Heures — la
// colonne « Supp. jour » ne fait que rappeler ce qui figure sur la feuille
// de route du jour, elle n'est jamais totalisée.

import { affH, parseDuree, hhmm } from '../utils/utils.js';
import { calcHebdomadaire, totauxSuppPeriode } from './heures_calculs.js';

const nbInterventions = f => f.interventions.filter(i => i.kind === 'intervention').length;

function ligneJour(f) {
    const dateAff = new Date(f.date + 'T12:00')
        .toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
    const supp = f.heures_supp || '0h00';
    const nb   = nbInterventions(f);

    // Sortie supplémentaire (rappel) : ses horaires viennent se placer sous
    // ceux de la journée, dans les mêmes colonnes Début / Fin.
    const rappel  = f.interventions.find(i => i.kind === 'rappel');
    const sortie  = (t, prefixe = '') => rappel
        ? `<div class="pdf-mois-sortie">${prefixe}${hhmm(t) || '—'}</div>`
        : '';

    return `
        <tr${f.astreinte ? ' class="pdf-mois-tr-astreinte"' : ''}>
            <td>${dateAff}${rappel ? '<div class="pdf-mois-sortie-lbl">+ sortie suppl.</div>' : ''}</td>
            <td class="c">${hhmm(f.heure_debut) || '—'}${sortie(rappel?.pause_debut, '+ ')}</td>
            <td class="c">${hhmm(f.heure_fin)   || '—'}${sortie(rappel?.pause_fin)}</td>
            <td class="c">${f.repas_min ? f.repas_min + ' min' : '—'}</td>
            <td class="c b">${f.heures_travail  || '—'}</td>
            <td class="c${parseDuree(supp) > 0 ? ' s' : ''}">${supp}</td>
            <td class="c">${nb || '—'}</td>
        </tr>`;
}

// Sous-total d'une semaine : c'est ici qu'apparaissent les vraies heures supp.
function ligneSemaine(s) {
    const nb    = s.feuilles.reduce((t, f) => t + nbInterventions(f), 0);
    const ferie = s.nbFeries > 0
        ? ` <span class="pdf-mois-ferie">seuil ${affH(s.seuilMin)} — ${s.nbFeries} jour${s.nbFeries > 1 ? 's' : ''} férié${s.nbFeries > 1 ? 's' : ''}</span>`
        : '';
    const supp = s.totalSuppMin > 0 ? `+${affH(s.totalSuppMin)}` : '—';
    return `
        <tr class="pdf-mois-tr-semaine">
            <td colspan="4">Semaine ${s.label}${ferie}</td>
            <td class="c">${affH(s.totalTravailMin)}</td>
            <td class="c">${supp}</td>
            <td class="c">${nb}</td>
        </tr>`;
}

export function tableauSynthese(feuilles) {
    const semaines = calcHebdomadaire(feuilles);
    const totaux   = totauxSuppPeriode(feuilles);
    const totalInt = feuilles.reduce((s, f) => s + nbInterventions(f), 0);

    const corps = semaines
        .map(s => s.feuilles.map(ligneJour).join('') + ligneSemaine(s))
        .join('');

    return `
        <table class="pdf-mois-table">
            <thead>
                <tr>
                    <th>Jour</th><th class="c">Début</th><th class="c">Fin</th><th class="c">Repas</th>
                    <th class="c">Travail</th><th class="c">Supp. jour</th><th class="c">Interv.</th>
                </tr>
            </thead>
            <tbody>${corps}</tbody>
            <tfoot>
                <tr>
                    <td colspan="4">TOTAL — ${feuilles.length} jour${feuilles.length > 1 ? 's' : ''}</td>
                    <td class="c">${affH(totaux.travail)}</td>
                    <td class="c">${affH(totaux.supp)}</td>
                    <td class="c">${totalInt}</td>
                </tr>
            </tfoot>
        </table>`;
}
