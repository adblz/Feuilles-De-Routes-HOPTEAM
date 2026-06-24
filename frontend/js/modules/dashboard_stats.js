import { chargerHeuresSupp } from './db.js';
import { parseDuree, affH, isoLocal } from '../utils/utils.js';
import { getBrouillonsDates } from './fdr.js';

let suppDebut          = null;
let suppFin            = null;
let actionListExpanded = false;
let _lastManquants     = [];

export function getSuppDebut()           { return suppDebut; }
export function getSuppFin()             { return suppFin; }
export function setSuppDebut(v)          { suppDebut = v; }
export function setSuppFin(v)            { suppFin   = v; }
export function getLastManquants()       { return _lastManquants; }
export function getActionListExpanded()  { return actionListExpanded; }
export function setActionListExpanded(v) { actionListExpanded = v; }

function formatPeriode(debut, fin, today) {
    const fmt = (d) => new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    return `${fmt(debut)} à ${fin === today ? 'aujourd\'hui' : fmt(fin)}`;
}

export async function rendreHeuresSupp() {
    const totalEl   = document.getElementById('dash-supp-total');
    const subEl     = document.getElementById('dash-supp-sub');
    const periodeEl = document.getElementById('dash-supp-periode-txt');

    const today        = isoLocal(new Date());
    const firstOfMonth = today.slice(0, 8) + '01';
    const debut        = suppDebut || firstOfMonth;
    const fin          = suppFin   || today;

    if (periodeEl) periodeEl.textContent = formatPeriode(debut, fin, today);
    totalEl.textContent = '…';
    subEl.textContent   = '';

    let histo;
    try {
        histo = await chargerHeuresSupp(debut, fin);
    } catch {
        totalEl.textContent = '—';
        subEl.textContent   = 'Connexion indisponible';
        return;
    }

    let totalMin = 0;
    histo.forEach(e => { totalMin += parseDuree(e.heures_supp); });
    totalEl.textContent = affH(totalMin);
    subEl.textContent   = `${histo.length} feuille${histo.length > 1 ? 's' : ''} enregistrée${histo.length > 1 ? 's' : ''} sur la période`;
}

export function majBrouillonCard() {
    const nb  = getBrouillonsDates().size;
    const el  = document.getElementById('dash-brouillon');
    el.classList.toggle('hidden', nb === 0);
    if (nb <= 0) return;

    const sub = document.getElementById('dash-brouillon-sub');
    if (sub) sub.textContent = nb === 1
        ? '1 feuille non envoyée — appuie pour continuer'
        : `${nb} feuilles non envoyées — appuie pour choisir`;

    const listEl = document.getElementById('dash-brouillon-list');
    if (!listEl) return;
    const dates = [...getBrouillonsDates()].sort().reverse();
    listEl.innerHTML = dates.map(dateISO => {
        const d     = new Date(dateISO + 'T12:00');
        const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        return `<li class="dash-brouillon-item" data-date="${dateISO}">
            <span>${label.charAt(0).toUpperCase() + label.slice(1)}</span>
            <span class="dash-brouillon-item-btn">Continuer →</span>
        </li>`;
    }).join('');
}

export function toggleBrouillonList() {
    const listEl = document.getElementById('dash-brouillon-list');
    if (!listEl) return;
    const isHidden = listEl.classList.toggle('hidden');
    const chev = document.getElementById('dash-brouillon-chevron');
    if (chev) chev.textContent = isHidden ? '▼' : '▲';
}

export function toggleActionList() {
    actionListExpanded = !actionListExpanded;
    _rendreActionList(_lastManquants);
}

export function _rendreActionList(items) {
    _lastManquants = items;
    const list  = document.getElementById('dash-action-list');
    const titre = document.getElementById('dash-action-titre');
    if (!list || !titre) return;

    if (!items.length) {
        titre.textContent  = 'Tout est à jour';
        titre.style.cursor = '';
        list.innerHTML = '<li class="dash-action-empty">Aucune feuille en attente. Bon travail.</li>';
        return;
    }

    const total    = items.length;
    const LIMIT    = 2;
    const hasMore  = total > LIMIT;
    const visibles = (hasMore && !actionListExpanded) ? items.slice(0, LIMIT) : items;

    titre.textContent  = total === 1 ? '1 feuille en attente' : `${total} feuilles en attente`;
    titre.style.cursor = hasMore ? 'pointer' : '';

    const ICON_PENDING = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.5 2"/></svg>`;
    const ICON_MISSING = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 21 19H3Z"/><line x1="12" y1="9.5" x2="12" y2="14"/></svg>`;

    let html = visibles.map(({ key, type }) => {
        const dateObj     = new Date(key + 'T12:00');
        const label       = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const labelCap    = label.charAt(0).toUpperCase() + label.slice(1);
        const isBrouillon = type === 'brouillon';
        return `
            <li class="dash-action-row ${isBrouillon ? 'is-pending' : 'is-missing'}">
                <span class="dash-action-ico">${isBrouillon ? ICON_PENDING : ICON_MISSING}</span>
                <span class="dash-action-info">
                    <strong>${labelCap}</strong>
                    <span>${isBrouillon ? 'Brouillon non finalisé' : 'Non rempli'}</span>
                </span>
                <button class="dash-action-btn" data-date="${key}" data-action="${isBrouillon ? 'finaliser' : 'remplir'}">
                    ${isBrouillon ? 'Finaliser' : 'Remplir'}
                </button>
            </li>`;
    }).join('');

    if (hasMore) {
        const restant = total - LIMIT;
        html += actionListExpanded
            ? `<li class="dash-action-toggle" id="dash-action-toggle">▲ Réduire</li>`
            : `<li class="dash-action-toggle" id="dash-action-toggle">▼ Afficher ${restant} de plus</li>`;
    }

    list.innerHTML = html;
}
