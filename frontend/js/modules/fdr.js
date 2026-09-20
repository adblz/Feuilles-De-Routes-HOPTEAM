// Point d'entrée unique — réexporte tout pour que les imports existants continuent de fonctionner.
export { cfg, saveCfg, setTrajetMinutes, setReglesEntreprise, getLogoBase64, getLogoDefaut } from './fdr_config.js';
export { seuilJour, calcHeures, onTravailInput, resetTravailAuto, validerTravailInput, setTravailManuel } from './fdr_calculs.js';
export { ajouterIntervention, ajouterPause, viderInterventions, resetSuppState } from './fdr_form.js';
export { supprimerElement, apresReordonnancement }                            from './fdr_liste.js';
export { lireTousLesElements }                                                from './fdr_lecture.js';
export { afficherBlocRappel, viderRappel, remplirRappel }                     from './fdr_rappel.js';
export { sauvegarderBrouillon, restaurerBrouillon, effacerBrouillon, getBrouillonsDates } from './fdr_brouillon.js';
