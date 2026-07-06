// Point d'entrée unique — réexporte tout pour que les imports existants continuent de fonctionner.
export { cfg, saveCfg, getLogoBase64 }                                   from './fdr_config.js';
export { seuilJour, calcHeures, onSuppInput, resetSuppAuto }             from './fdr_calculs.js';
export {
    ajouterIntervention, ajouterPause, supprimerElement, deplacerElement,
    lireTousLesElements, viderInterventions, resetSuppState,
    afficherBlocRappel, viderRappel, remplirRappel,
}                                                                         from './fdr_form.js';
export { sauvegarderBrouillon, restaurerBrouillon, effacerBrouillon, getBrouillonsDates } from './fdr_brouillon.js';
