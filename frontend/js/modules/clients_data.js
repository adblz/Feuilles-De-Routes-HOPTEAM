import { getBrouillonsDates } from './fdr_brouillon.js';

// ── Listing clients (technicien) : calculs purs, sans DOM ──

const CACHE_KEY = 'fdr_clients_cache';
const JOUR_MS   = 86400000;

// Une ligne importée = un poste (une installation). Un client peut en avoir
// plusieurs : on les regroupe en une seule carte, avec le total des tirages
// et la date prévue la plus ancienne (donc le retard le plus grand).
// `ids` garde les ids de tous les postes : ils sont marqués faits ensemble.
export function regrouperParClient(rows) {
    const parCode = new Map();
    for (const r of rows) {
        const cle = r.code_pdv || r.id;
        const c = parCode.get(cle);
        if (!c) {
            parCode.set(cle, { ...r, ids: [r.id], postes: 1, tirage: r.tirage || 0 });
            continue;
        }
        c.ids.push(r.id);
        c.postes++;
        c.tirage += r.tirage || 0;
        if (r.date_prevue && (!c.date_prevue || r.date_prevue < c.date_prevue)) c.date_prevue = r.date_prevue;
        if (!c.telephone && r.telephone) c.telephone = r.telephone;
    }
    return [...parCode.values()].map(c => ({ ...c, planningId: c.ids.join(',') }));
}

// Ids des postes déjà placés dans un brouillon (feuille pas encore
// enregistrée) : leur client ne doit plus apparaître dans le listing.
export function idsDansBrouillons() {
    const ids = new Set();
    for (const date of getBrouillonsDates()) {
        try {
            const d = JSON.parse(localStorage.getItem(`fdr_brouillon_${date}`) || '{}');
            (d.elements || []).forEach(e => {
                String(e.planningId || '').split(',').filter(Boolean).forEach(id => ids.add(id));
            });
        } catch {}
    }
    return ids;
}

// Clients dont aucun poste n'est déjà dans un brouillon.
export function clientsHorsBrouillons(clients) {
    const exclus = idsDansBrouillons();
    return clients.filter(c => !c.ids.some(id => exclus.has(id)));
}

// Nombre de jours de retard (> 0 = en retard, 0 = aujourd'hui, < 0 = à venir,
// null = pas de date). Les deux dates sont en 'AAAA-MM-JJ' → calcul exact.
export function retardJours(row, todayISO) {
    if (!row.date_prevue) return null;
    return Math.round((Date.parse(todayISO) - Date.parse(row.date_prevue)) / JOUR_MS);
}

// Retards les plus grands d'abord, puis par date, les sans-date à la fin.
export function trierClients(rows, todayISO) {
    return [...rows].sort((a, b) => {
        const ra = retardJours(a, todayISO), rb = retardJours(b, todayISO);
        if (ra === null && rb === null) return (a.nom_pdv || '').localeCompare(b.nom_pdv || '');
        if (ra === null) return 1;
        if (rb === null) return -1;
        return rb - ra || (a.nom_pdv || '').localeCompare(b.nom_pdv || '');
    });
}

export function filtrerClients(rows, filtre, todayISO) {
    if (filtre === 'retard') return rows.filter(r => retardJours(r, todayISO) > 0);
    if (filtre === 'avenir') return rows.filter(r => !(retardJours(r, todayISO) > 0));
    return rows;
}

export function compterRetards(rows, todayISO) {
    return rows.filter(r => retardJours(r, todayISO) > 0).length;
}

// Dernière liste reçue, gardée sur le téléphone pour un affichage hors ligne.
export function lireCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
}

export function ecrireCache(rows) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ maj: new Date().toISOString(), rows })); } catch {}
}
