// Seuil d'une journée de travail, en minutes.
//
// Extrait de fdr_calculs.js pour être utilisable ailleurs que dans le
// formulaire : la version d'origine lisait la date directement dans le DOM,
// donc inutilisable depuis le tableau de bord.
//
//   contrat 35h → 7h tous les jours
//   contrat 39h → 8h, sauf le vendredi (7h)

const SEUIL_35  = 7 * 60;
const SEUIL_39  = 8 * 60;
const VENDREDI  = 5;

// dateStr : date ISO « AAAA-MM-JJ ». Si absente ou invalide, on retombe sur le
// seuil le plus courant du contrat (comportement historique du formulaire).
export function seuilJourPour(dateStr, contrat) {
    if (contrat === '35') return SEUIL_35;
    if (!dateStr) return SEUIL_39;
    // Midi : évite qu'un décalage horaire ne fasse changer de jour.
    const jour = new Date(dateStr + 'T12:00').getDay();
    if (Number.isNaN(jour)) return SEUIL_39;
    return jour === VENDREDI ? SEUIL_35 : SEUIL_39;
}
