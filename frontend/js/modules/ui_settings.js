import { showToast } from '../utils/utils.js';
import { cfg, saveCfg, calcHeures } from './fdr.js';
import { sauvegarderContratProfil } from './db.js';

export function fermerModal(id) {
    document.getElementById(id).classList.remove('open');
}

export function fermerTousLesModals() {
    document.querySelectorAll('.modal-overlay.open')
        .forEach(el => el.classList.remove('open'));
}

export function openSettings() {
    fermerTousLesModals();
    document.getElementById('s-company').value = cfg.company;
    document.getElementById('s-email').value   = cfg.email;
    document.getElementById('s-contrat').value = cfg.contrat;
    document.getElementById('modal-settings').classList.add('open');
}

export async function sauvegarderParams() {
    const contrat = document.getElementById('s-contrat').value;
    saveCfg(
        document.getElementById('s-company').value.trim(),
        document.getElementById('s-email').value.trim(),
        contrat
    );
    try {
        await sauvegarderContratProfil(contrat);
    } catch {
        showToast('Contrat sauvegardé localement (erreur réseau)', 'warn');
    }
    fermerModal('modal-settings');
    calcHeures();
    if (cfg.company && cfg.email) document.getElementById('setup-notice').style.display = 'none';
}
