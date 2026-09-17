// Contrôles de cohérence du formulaire technicien (lecture du DOM uniquement,
// aucun import pour rester utilisable depuis utils.js sans dépendance circulaire).

export const MSG_SORTIE_SUPP = 'La sortie supplémentaire doit commencer après la fin de journée';

// La sortie supplémentaire est une 2ᵉ plage APRÈS la journée : si elle démarre
// avant (ou à) la fin de journée, son temps serait compté deux fois.
// Retourne true si les deux heures sont saisies et incohérentes.
export function sortieSuppIncoherente() {
    const rDebut = document.getElementById('rappel-debut')?.value;
    const hFin   = document.getElementById('heure-fin')?.value;
    return !!(rDebut && hFin && rDebut <= hFin);
}
