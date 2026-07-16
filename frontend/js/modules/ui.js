// Point d'entrée unique — réexporte tout pour que les imports existants continuent de fonctionner.
export { openSettings, fermerModal, fermerTousLesModals, sauvegarderParams, ouvrirSuggestion, envoyerSuggestion } from './ui_settings.js';
export { ouvrirSuppRecap, calculerSuppRecap }                                from './ui_heures.js';
export { reinitialiserFeuille, nouvelleFeuille }                             from './ui_form.js';
