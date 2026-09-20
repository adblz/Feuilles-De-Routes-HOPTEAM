// Point d'entrée unique — réexporte tout pour que les imports existants continuent de fonctionner.
export { cfg, saveCfg, setTrajetMinutes, setReglesEntreprise, getLogoBase64, getLogoDefaut } from './fdr_config.js';
export { seuilJour, calcHeures, onTravailInput, resetTravailAuto, validerTravailInput, setTravailManuel } from './fdr_calculs.js';
export {
    ajouterIntervention, ajouterPause, supprimerElement, apresReordonnancement,
    lireTousLesElements, viderInterventions, resetSuppState,
    afficherBlocRappel, viderRappel, remplirRappel,
}                                                                         from './fdr_form.js';
export { sauvegarderBrouillon, restaurerBrouillon, effacerBrouillon, getBrouillonsDates } from './fdr_brouillon.js';
