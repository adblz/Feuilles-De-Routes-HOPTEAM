// Repères de semaine (lundi → dimanche) partagés par le tableau de bord,
// l'onglet Heures, les PDF et la page responsable.
//
// Toutes les dates sont des chaînes ISO « AAAA-MM-JJ ». On construit les
// objets Date à midi pour qu'un décalage horaire ne change jamais de jour.

import { isoLocal } from '../utils/utils.js';

function aMidi(dateStr) {
    return new Date(dateStr + 'T12:00');
}

function addJours(dt, n) {
    const r = new Date(dt);
    r.setDate(r.getDate() + n);
    return r;
}

// Lundi (Date) de la semaine contenant la date.
export function getLundiSemaine(dateStr) {
    const d = aMidi(dateStr);
    const day = d.getDay() || 7;
    return addJours(d, 1 - day);
}

export function lundiDe(dateStr)    { return isoLocal(getLundiSemaine(dateStr)); }
export function dimancheDe(dateStr) { return isoLocal(addJours(getLundiSemaine(dateStr), 6)); }

// Les 7 dates ISO de la semaine dont le lundi (Date ou ISO) est donné.
export function joursDeSemaine(lundi) {
    const base = typeof lundi === 'string' ? aMidi(lundi) : lundi;
    return Array.from({ length: 7 }, (_, i) => isoLocal(addJours(base, i)));
}

// Clé de semaine ISO, ex. « 2026-S35 » — sert à grouper et trier.
export function getSemaineISO(dateStr) {
    const d = aMidi(dateStr);
    const day = d.getDay() || 7;
    const jeudi = addJours(d, 4 - day);
    const debutAn = new Date(jeudi.getFullYear(), 0, 1);
    const num = Math.ceil(((jeudi - debutAn) / 86400000 + 1) / 7);
    return `${jeudi.getFullYear()}-S${String(num).padStart(2, '0')}`;
}

export function bornesSemaine(dateStr) {
    const lundi = getLundiSemaine(dateStr);
    const dimanche = addJours(lundi, 6);
    const numSemaine = Number(getSemaineISO(dateStr).split('-S')[1]);
    return { lundi, dimanche, numSemaine };
}

export function labelSemaine(dateStr) {
    const { lundi, dimanche, numSemaine } = bornesSemaine(dateStr);
    const full = dt => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    // Ex. « Semaine 35 - 24 août au 30 août »
    return `Semaine ${numSemaine} - ${full(lundi)} au ${full(dimanche)}`;
}

export function labelSemaineCourt(dateStr) {
    const { lundi, dimanche, numSemaine } = bornesSemaine(dateStr);
    const court = dt => dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    // Ex. « Semaine 35 - 24/08/2026 au 30/08/2026 »
    return `Semaine ${numSemaine} - ${court(lundi)} au ${court(dimanche)}`;
}

// Une période (mois de paie, mois calendaire, dates libres) élargie aux
// semaines entières : du lundi de la première semaine au dimanche de la
// dernière. On charge toujours des semaines complètes pour que les heures
// supp d'une semaine à cheval sur deux périodes soient calculées en entier.
export function bornesEtendues(debut, fin) {
    return { debut: lundiDe(debut), fin: dimancheDe(fin) };
}

// Une semaine « appartient » à la période qui contient son dimanche : elle
// est ainsi comptée une seule fois, dans le mois où elle se termine. Sans
// effet quand les périodes vont du lundi au dimanche (cas du planning de paie).
export function semaineDansPeriode(dateStr, debut, fin) {
    const dim = dimancheDe(dateStr);
    return dim >= debut && dim <= fin;
}
