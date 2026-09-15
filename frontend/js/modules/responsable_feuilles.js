// Rendu de la liste des feuilles d'un technicien : semaine → ligne.
// Pas de regroupement par mois calendaire : la période est déjà choisie via
// le filtre en haut de page, et une semaine peut chevaucher deux mois (ex.
// 29 juin – 5 juillet) — la grouper d'abord par mois la coupait en deux.

import { escHtml, affH, parseDuree } from '../utils/utils.js';
import { getSemaineISO, labelSemaine } from './heures_calculs.js';

// Badge d'état de la validation des heures supp du jour. Un jour sans heures
// supp déclarées et sans validation n'affiche rien (pas de bruit inutile).
export function badgeValidation(f, ctx) {
    if (f.conge) return '';
    const v = ctx.validationPour ? ctx.validationPour(f) : null;
    if (!v) return parseDuree(f.heures_supp) > 0 ? '<span class="resp-badge-attente">à valider</span>' : '';
    if (ctx.estObsolete && ctx.estObsolete(f, v)) {
        return `<span class="resp-badge-obsolete" title="La feuille a été modifiée après votre validation">⚠ ${affH(v.heures_validees_min)}</span>`;
    }
    return `<span class="resp-badge-valide" title="Heures supp validées">✓ ${affH(v.heures_validees_min)}</span>`;
}

function ligneFeuille(f, ctx) {
    const dateAff = f.date
        ? new Date(f.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
        : '—';
    const nbInts = (f.interventions || []).filter(i => i.kind === 'intervention').length;
    const vue = ctx.vues.has(f.id);
    const checkHtml = ctx.selectionMode
        ? `<input type="checkbox" class="resp-check resp-check-feuille" data-id="${f.id}"${ctx.estSelectionnee(f.id) ? ' checked' : ''} aria-label="Sélectionner la feuille du ${escHtml(dateAff)}">`
        : '';
    const supp = f.conge ? 'Congé' : (f.heures_supp || '0h00');
    return `<div class="resp-feuille-row${vue ? '' : ' nonvue'}" data-pdf-id="${f.id}" role="button" tabindex="0">
        ${checkHtml}
        <span class="resp-pastille-ligne"></span>
        <span class="resp-feuille-date">${dateAff}</span>
        <span class="resp-feuille-heures">${f.conge ? '—' : (f.heures_travail || '—')}</span>
        <span class="resp-feuille-supp" title="Heures supp déclarées">${escHtml(supp)} ${badgeValidation(f, ctx)}</span>
        <span class="resp-feuille-ints">${nbInts} int.</span>
        <span class="resp-feuille-action">Ouvrir</span>
    </div>`;
}

function grouperParSemaine(feuilles) {
    const map = new Map();
    feuilles.forEach(f => {
        const cle = f.date ? getSemaineISO(f.date) : '0000-S00';
        if (!map.has(cle)) map.set(cle, { label: f.date ? labelSemaine(f.date) : 'Date inconnue', feuilles: [] });
        map.get(cle).feuilles.push(f);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function renderSemaine([, groupe], ctx) {
    const ids = groupe.feuilles.map(f => f.id);
    const statut = ctx.selectionMode ? ctx.statutSemaine(ids) : 'aucune';
    const checkHtml = ctx.selectionMode
        ? `<input type="checkbox" class="resp-check resp-check-semaine" data-ids="${ids.join(',')}"${statut === 'toutes' ? ' checked' : ''} data-indetermine="${statut === 'partielle'}" aria-label="Sélectionner ${escHtml(groupe.label)}">`
        : '';
    const lignes = groupe.feuilles.map(f => ligneFeuille(f, ctx)).join('');
    return `<div class="resp-semaine">
        <div class="resp-semaine-header">${checkHtml}<span>${escHtml(groupe.label)}</span></div>
        ${lignes}
    </div>`;
}

// ctx = { vues: Set, selectionMode: bool, estSelectionnee(id), statutSemaine(ids),
//         validationPour(f), estObsolete(f, v) }
export function renderFeuilles(feuilles, ctx) {
    return grouperParSemaine(feuilles).map(entree => renderSemaine(entree, ctx)).join('');
}

// Les cases « semaine » partiellement cochées doivent être marquées après
// insertion dans le DOM : `indeterminate` n'existe pas comme attribut HTML.
export function appliquerIndetermines(container) {
    container.querySelectorAll('.resp-check-semaine').forEach(cb => {
        cb.indeterminate = cb.dataset.indetermine === 'true';
    });
}
