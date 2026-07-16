// Calcul des 11 jours fériés légaux français.
// Les 3 dates variables (Lundi de Pâques, Ascension, Pentecôte) sont calculées
// via l'algorithme de Meeus/Jones/Butcher — valide pour toutes les années.
// Aucune mise à jour manuelle nécessaire d'une année sur l'autre.

function calculerPaques(annee) {
    const a = annee % 19;
    const b = Math.floor(annee / 100);
    const c = annee % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day   = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(annee, month - 1, day);
}

function isoDate(dt) {
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${m}-${d}`;
}

function addJours(dt, n) {
    const r = new Date(dt);
    r.setDate(r.getDate() + n);
    return r;
}

const _cache = {};

function getFeries(annee) {
    if (_cache[annee]) return _cache[annee];
    const paques = calculerPaques(annee);
    _cache[annee] = new Set([
        `${annee}-01-01`,                       // Jour de l'An
        isoDate(addJours(paques, 1)),            // Lundi de Pâques
        `${annee}-05-01`,                        // Fête du Travail
        `${annee}-05-08`,                        // Victoire 1945
        isoDate(addJours(paques, 39)),           // Ascension
        isoDate(addJours(paques, 50)),           // Lundi de Pentecôte
        `${annee}-07-14`,                        // Fête Nationale
        `${annee}-08-15`,                        // Assomption
        `${annee}-11-01`,                        // Toussaint
        `${annee}-11-11`,                        // Armistice
        `${annee}-12-25`,                        // Noël
    ]);
    return _cache[annee];
}

// Retourne true si la date ISO donnée est un jour férié légal.
export function estFerie(dateStr) {
    return getFeries(parseInt(dateStr.slice(0, 4), 10)).has(dateStr);
}

// Compte les jours fériés tombant lundi→vendredi dans la semaine
// dont le lundi (Date) est passé en paramètre.
export function feriesEnSemaine(lundi) {
    let count = 0;
    for (let i = 0; i < 5; i++) {
        const dt = addJours(lundi, i);
        if (getFeries(dt.getFullYear()).has(isoDate(dt))) count++;
    }
    return count;
}
