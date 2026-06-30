import { showToast } from '../utils/utils.js';
import { cfg, saveCfg, calcHeures } from './fdr.js';
import { sauvegarderContratProfil, enregistrerSuggestion } from './db.js';

export function fermerModal(id) {
    document.getElementById(id).classList.remove('open');
}

export function fermerTousLesModals() {
    document.querySelectorAll('.modal-overlay.open')
        .forEach(el => el.classList.remove('open'));
}

export function openSettings() {
    fermerTousLesModals();
    document.getElementById('s-email-display').textContent = cfg.email || '—';
    document.getElementById('s-contrat').value = cfg.contrat;
    document.getElementById('modal-settings').classList.add('open');
}

export async function sauvegarderParams() {
    const contrat = document.getElementById('s-contrat').value;
    saveCfg(cfg.company, cfg.email, contrat);
    try {
        await sauvegarderContratProfil(contrat);
    } catch {
        showToast('Contrat sauvegardé localement (erreur réseau)', 'warn');
    }
    fermerModal('modal-settings');
    calcHeures();
}

// ── Boîte à suggestions (technicien) ───────────────────────────

export function ouvrirSuggestion() {
    fermerTousLesModals();
    document.getElementById('sug-categorie').value = 'Amélioration';
    document.getElementById('sug-message').value = '';
    document.getElementById('modal-suggestion').classList.add('open');
}

export async function envoyerSuggestion() {
    const categorie = document.getElementById('sug-categorie').value;
    const message   = document.getElementById('sug-message').value.trim();
    if (!message) {
        showToast('Écris ta suggestion avant d\'envoyer', 'warn');
        return;
    }
    const btn = document.getElementById('btn-suggestion-envoyer');
    btn.disabled = true;
    try {
        await enregistrerSuggestion(categorie, message);
        showToast('Merci, suggestion envoyée !', 'success');
        fermerModal('modal-suggestion');
    } catch {
        showToast('Erreur réseau, réessaie plus tard', 'warn');
    } finally {
        btn.disabled = false;
    }
}
