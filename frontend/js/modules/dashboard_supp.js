import { parseDuree } from '../utils/utils.js';
import { cfg } from './fdr_config.js';
import { seuilJourPour } from './seuil_jour.js';
import { estFerie } from './jours_feries.js';

// ── Heures supp. de la carte d'accueil ─────────────────────────
//
// Règle : chaque journée est comparée à son propre seuil (7h en contrat 35h,
// 8h — 7h le vendredi — en 39h). Une journée PLUS COURTE que ce seuil compte
// en NÉGATIF, elle vient en déduction des journées longues.
//
// Ex. 9h10 + 9h24 + 11h30 + 5h25 (seuil 7h) :
//     +2h10 +2h24 +4h30 −1h35 = +7h29   (et non +9h04)
//
// On repart des heures supp. déjà enregistrées sur la feuille pour la partie
// positive : ça préserve les corrections manuelles faites par le technicien.
// Seul le « manque » des journées courtes est calculé ici.

// Une journée « de base » est une journée ordinaire, qui peut donc être trop
// courte. Le week-end, l'astreinte et les jours fériés sont du travail en plus :
// une petite journée n'y est pas un manque, elle vaut zéro.
function estJourDeBase(f) {
    if (f.astreinte) return false;
    if (estFerie(f.date)) return false;
    const jour = new Date(f.date + 'T12:00').getDay();
    return jour !== 0 && jour !== 6;
}

function manqueDuJour(f) {
    if (!estJourDeBase(f)) return 0;
    const seuil = seuilJourPour(f.date, cfg.contrat);
    return Math.max(0, seuil - parseDuree(f.heures_travail));
}

// Somme signée des heures supp. de la semaine, en minutes. Peut être négative.
export function totalSuppNet(feuilles) {
    return feuilles.reduce((t, f) => t + parseDuree(f.heures_supp) - manqueDuJour(f), 0);
}

// Total des seuils des journées de base — le « à quoi ça se compare » affiché
// sous le chiffre. Les journées hors base (week-end, astreinte, férié) n'ont
// pas de base à atteindre et ne sont donc pas comptées ici.
export function baseSemaine(feuilles) {
    return feuilles.reduce((t, f) => t + (estJourDeBase(f) ? seuilJourPour(f.date, cfg.contrat) : 0), 0);
}

// affH() ne sait pas formater un négatif (−95 → « -2h-35 ») : version signée.
export function affHSigne(min) {
    if (!min) return '0h00';
    const abs = Math.abs(min);
    return `${min < 0 ? '-' : '+'}${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, '0')}`;
}
