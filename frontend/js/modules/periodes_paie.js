// ── Helpers partagés pour le planning des périodes de paie ──
// Utilisés par le dashboard, l'onglet Heures et l'espace admin.

export const MOIS_FR = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

// Renvoie la période contenant la date donnée (date_debut <= date <= date_fin),
// ou null si aucune période ne la couvre.
export function trouverPeriodeCourante(periodes, dateISO) {
    if (!periodes) return null;
    return periodes.find(p => p.date_debut <= dateISO && dateISO <= p.date_fin) || null;
}

// Formate une date ISO (AAAA-MM-JJ) en « jj/mm ».
function jourMois(dateISO) {
    const [, mm, jj] = dateISO.split('-');
    return `${jj}/${mm}`;
}

// Nom du mois seul, ex. « juillet ».
export function nomMois(periode) {
    return MOIS_FR[periode.mois - 1] || `mois ${periode.mois}`;
}

// Plage de dates courte, ex. « du 22/06 au 19/07 ».
export function rangeLabel(debut, fin) {
    return `du ${jourMois(debut)} au ${jourMois(fin)}`;
}
