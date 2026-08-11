// Rendu de la partie « détail jour par jour » du PDF récapitulatif mensuel :
// pour chaque journée, la liste de ses interventions, pauses et sorties suppl.

import { escHtml, hhmm, dureeCourte } from '../utils/utils.js';

function ligneIntervention(item, num) {
    const client  = escHtml(item.client || '—');
    const ville   = item.ville ? ` <span class="pdf-mois-ville">(${escHtml(item.ville)})</span>` : '';
    const horaire = `${hhmm(item.heure_arrivee) || '—'} → ${hhmm(item.heure_depart) || '—'}`;
    const duree   = dureeCourte(hhmm(item.heure_arrivee), hhmm(item.heure_depart));

    const extras = [
        item.type_int ? escHtml(item.type_int) : '',
        item.mo       ? `MO ${escHtml(item.mo)}` : '',
        item.becs     ? `${item.becs} bec${item.becs > 1 ? 's' : ''}` : '',
    ].filter(Boolean).join(' · ');

    return `
        <div class="pdf-mois-item">
            <div class="pdf-mois-item-h">${horaire}</div>
            <div class="pdf-mois-item-c">
                <span class="pdf-mois-num">#${num}</span>
                <strong>${client}</strong>${ville}
                ${duree ? `<span class="pdf-mois-duree">${duree}</span>` : ''}
                ${extras ? `<div class="pdf-mois-extras">${extras}</div>` : ''}
                ${item.details ? `<div class="pdf-mois-details">${escHtml(item.details)}</div>` : ''}
            </div>
        </div>`;
}

function lignePause(item, libelle) {
    const horaire = `${hhmm(item.pause_debut) || '—'} → ${hhmm(item.pause_fin) || '—'}`;
    const duree   = dureeCourte(hhmm(item.pause_debut), hhmm(item.pause_fin));
    return `
        <div class="pdf-mois-item pdf-mois-pause">
            <div class="pdf-mois-item-h">${horaire}</div>
            <div class="pdf-mois-item-c">
                <strong>${libelle}</strong>
                ${duree ? `<span class="pdf-mois-duree">${duree}</span>` : ''}
            </div>
        </div>`;
}

function corpsJour(interventions) {
    let num = 0;
    const lignes = interventions.map(item => {
        if (item.kind === 'intervention') return ligneIntervention(item, ++num);
        if (item.kind === 'rappel')       return lignePause(item, item.astreinte ? 'Sortie suppl. (astreinte)' : 'Sortie supplémentaire');
        return lignePause(item, 'Pause');
    }).join('');
    return lignes || '<div class="pdf-mois-vide">Aucune intervention saisie ce jour-là.</div>';
}

function enteteJour(f, dateAff) {
    const travail = f.heures_travail || '—';
    const supp    = f.heures_supp && f.heures_supp !== '0h00' ? ` · supp. ${f.heures_supp}` : '';
    const plage   = `${hhmm(f.heure_debut) || '—'} → ${hhmm(f.heure_fin) || '—'}`;
    return `
        <div class="pdf-mois-jour-head">
            <span class="pdf-mois-jour-date">${dateAff}${f.astreinte ? ' <span class="pdf-mois-astreinte">ASTREINTE</span>' : ''}</span>
            <span class="pdf-mois-jour-h">${plage} · ${travail}${supp}</span>
        </div>`;
}

// feuilles : lignes renvoyées par chargerMoisDetail(), triées par date.
export function renderDetailJours(feuilles) {
    return feuilles.map(f => {
        const dateAff = new Date(f.date + 'T12:00')
            .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        return `
        <div class="pdf-mois-jour">
            ${enteteJour(f, dateAff)}
            <div class="pdf-mois-jour-body">${corpsJour(f.interventions)}</div>
        </div>`;
    }).join('');
}
