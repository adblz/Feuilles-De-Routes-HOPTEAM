import { initAdmin } from './modules/admin_users.js';
import { attacherBoutonMiseAJour } from './utils/utils.js';

window.addEventListener('load', () => {
    try {
        attacherBoutonMiseAJour();
    } catch (err) {
        console.error('Erreur lors de l\'attachement du bouton de mise à jour', err);
    }
    initAdmin();
});
