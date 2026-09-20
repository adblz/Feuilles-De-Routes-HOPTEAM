// Tableau de synthèse du PDF récapitulatif : une ligne par jour, regroupées
// par semaine avec un sous-total. Les heures supp. retenues sont celles du
// calcul hebdomadaire (heures travaillées − contrat), comme sur l'écran
// Heures. La colonne « Écart jour » rappelle l'écart de chaque journée à son
// seuil (informatif, non totalisé) ; les jours ouvrés sans feuille sont
// listés en grisé car ils comptent 0h dans la semaine.

import { affH, affHSigne, hhmm } from '../utils/utils.js';
import { suppJour } from './heures_calculs.js';

const nbInterventions = f => (f.interventions || []).filter(i => i.kind === 'intervention').length;

const dateCourte = iso => new Date(iso + 'T12:00')
    .toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });

function ligneManquant(m) {
    return `
        <tr class="pdf-mois-tr-conge">
            <td>${dateCourte(m.date)}</td>
            <td class="c" colspan="3">Sans feuille</td>
            <td class="c b">0h00</td>
            <td class="c">${affHSigne(-m.seuilMin)}</td>
            <td class="c">—</td>
        </tr>`;
}

function ligneJour(f, contrat) {
    const dateAff = dateCourte(f.date);

    if (f.conge) {
        return `
        <tr class="pdf-mois-tr-conge">
            <td>${dateAff}</td>
            <td class="c" colspan="5">Congé</td>
            <td class="c">—</td>
        </tr>`;
    }

    const ecart = suppJour(f, contrat);
    const nb    = nbInterventions(f);

    // Sortie supplémentaire (rappel) : ses horaires viennent se placer sous
    // ceux de la journée, dans les mêmes colonnes Début / Fin.
    const rappel  = (f.interventions || []).find(i => i.kind === 'rappel');
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
            <td class="c${ecart > 0 ? ' s' : ''}">${affHSigne(ecart)}</td>
            <td class="c">${nb || '—'}</td>
        </tr>`;
}

// Sous-total d'une semaine : c'est ici qu'apparaissent les vraies heures supp.
function ligneSemaine(s) {
    const nb    = s.feuilles.reduce((t, f) => t + nbInterventions(f), 0);
    const notes = [];
    if (s.nbFeries > 0)    notes.push(`${s.nbFeries} jour${s.nbFeries > 1 ? 's' : ''} férié${s.nbFeries > 1 ? 's' : ''}`);
    if (s.nbConges > 0)    notes.push(`${s.nbConges} jour${s.nbConges > 1 ? 's' : ''} de congé`);
    if (s.nbManquants > 0) notes.push(`${s.nbManquants} jour${s.nbManquants > 1 ? 's' : ''} sans feuille`);
    const detail = ` <span class="pdf-mois-ferie">seuil ${affH(s.seuilMin)}${notes.length ? ' — ' + notes.join(', ') : ''}</span>`;
    const supp = s.totalSuppMin > 0 ? `+${affH(s.totalSuppMin)}` : (s.netMin < 0 ? affHSigne(s.netMin) : '—');
    const majo = s.totalSuppMin > 0 ? `<div class="pdf-mois-sortie">25% ${affH(s.supp25)} · 50% ${affH(s.supp50)}</div>` : '';
    return `
        <tr class="pdf-mois-tr-semaine">
            <td colspan="4">${s.label}${detail}</td>
            <td class="c">${affH(s.totalTravailMin)}</td>
            <td class="c">${supp}${majo}</td>
            <td class="c">${nb}</td>
        </tr>`;
}

// Lignes d'une semaine : feuilles et jours manquants mélangés, par date.
function lignesSemaine(s) {
    const lignes = [
        ...s.feuilles.map(f => ({ date: f.date, html: ligneJour(f, s.contrat) })),
        ...s.manquants.map(m => ({ date: m.date, html: ligneManquant(m) })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    return lignes.map(l => l.html).join('') + ligneSemaine(s);
}

// semaines : lignes de semainesPeriode() ; totaux : totauxSuppPeriode().
export function tableauSynthese(semaines, totaux) {
    const feuilles  = semaines.flatMap(s => s.feuilles);
    const totalInt  = feuilles.reduce((t, f) => t + nbInterventions(f), 0);
    const nbTravail = feuilles.filter(f => !f.conge).length;

    return `
        <table class="pdf-mois-table">
            <thead>
                <tr>
                    <th>Jour</th><th class="c">Début</th><th class="c">Fin</th><th class="c">Repas</th>
                    <th class="c">Travail</th><th class="c">Écart jour</th><th class="c">Interv.</th>
                </tr>
            </thead>
            <tbody>${semaines.map(lignesSemaine).join('')}</tbody>
            <tfoot>
                <tr>
                    <td colspan="4">TOTAL — ${nbTravail} jour${nbTravail > 1 ? 's' : ''}</td>
                    <td class="c">${affH(totaux.travail)}</td>
                    <td class="c">${affH(totaux.supp)}</td>
                    <td class="c">${totalInt}</td>
                </tr>
            </tfoot>
        </table>`;
}
