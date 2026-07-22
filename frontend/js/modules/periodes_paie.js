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

// Renvoie la période dont le nom correspond au mois calendaire donné (par
// défaut aujourd'hui) — pas celle dont la plage de dates contient la date,
// qui peut chevaucher deux mois (ex. période « juillet » du 22/06 au 19/07).
// À défaut, renvoie la période la plus récente ; null si la liste est vide.
export function trouverPeriodeParMoisCourant(periodes, date = new Date()) {
    if (!periodes?.length) return null;
    const mois  = date.getMonth() + 1;
    const annee = date.getFullYear();
    return periodes.find(p => p.mois === mois && p.annee === annee) || periodes[0];
}

// Plage de dates courte, ex. « du 22/06 au 19/07 ».
export function rangeLabel(debut, fin) {
    return `du ${jourMois(debut)} au ${jourMois(fin)}`;
}
