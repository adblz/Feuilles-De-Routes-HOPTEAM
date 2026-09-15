import { initResponsable } from './modules/responsable.js';
import { attacherBoutonMiseAJour } from './utils/utils.js';

window.addEventListener('load', () => {
    try { attacherBoutonMiseAJour(); } catch (err) { console.error('Bouton mise à jour :', err); }
    initResponsable();
});
