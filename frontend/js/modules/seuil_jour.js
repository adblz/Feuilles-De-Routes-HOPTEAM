// Seuils de travail selon le contrat, en minutes.
//
// Une seule règle pour toute l'appli (formulaire, carte d'accueil, onglet
// Heures, PDF, page responsable) :
//
//   contrat 35h → 7h par jour ouvré
//   contrat 37h → 7h par jour ouvré (l'étiquette change, le seuil du jour non)
//   contrat 39h → 8h par jour ouvré, sauf le vendredi (7h)
//   samedi, dimanche, jour férié → 0h : toutes les heures faites sont en plus
//
// Heures supp de la semaine = heures travaillées − durée du contrat (35h,
// 37h ou 39h), le contrat étant lui-même réduit des fériés et congés.

import { estFerie } from './jours_feries.js';

const SEUIL_35  = 7 * 60;
const SEUIL_39  = 8 * 60;
const VENDREDI  = 5;

// Durée hebdomadaire du contrat. Contrat inconnu → 39h (valeur historique).
export function contratMinutes(contrat) {
    const h = parseInt(contrat, 10);
    return Number.isFinite(h) && h > 0 ? h * 60 : 39 * 60;
}

// Barème légal : les 8 premières heures supp de la semaine (36ᵉ → 43ᵉ) sont
// majorées de 25 %, les suivantes de 50 %. Un contrat 39h en a déjà 4 dans
// son salaire de base : il ne lui en reste que 4 à 25 % (35h → 8h, 37h → 6h).
export function palier25Pour(contrat) {
    return Math.max(0, 8 * 60 - (contratMinutes(contrat) - 35 * 60));
}

// Seuil d'un jour ouvré (lundi → vendredi), sans tenir compte des fériés.
// dateStr : « AAAA-MM-JJ ». Si absente ou invalide, on retombe sur le seuil
// le plus courant du contrat (comportement historique du formulaire).
export function seuilJourPour(dateStr, contrat) {
    if (contratMinutes(contrat) <= 37 * 60) return SEUIL_35;
    if (!dateStr) return SEUIL_39;
    // Midi : évite qu'un décalage horaire ne fasse changer de jour.
    const jour = new Date(dateStr + 'T12:00').getDay();
    if (Number.isNaN(jour)) return SEUIL_39;
    return jour === VENDREDI ? SEUIL_35 : SEUIL_39;
}

// Seuil réellement attendu ce jour-là : 0 le week-end et les jours fériés.
export function seuilJourEffectif(dateStr, contrat) {
    if (!dateStr) return seuilJourPour(dateStr, contrat);
    const jour = new Date(dateStr + 'T12:00').getDay();
    if (jour === 0 || jour === 6 || estFerie(dateStr)) return 0;
    return seuilJourPour(dateStr, contrat);
}
