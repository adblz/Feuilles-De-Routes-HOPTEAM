// Modale « Changer mon mot de passe » du responsable (son propre compte).
// Ouverte en cliquant sur l'avatar du menu latéral.

import { getSession, changerMotDePasse } from './auth.js';
import { showToast, attachPasswordToggle } from '../utils/utils.js';
import { initiales } from './responsable_render.js';

function fermer() {
    document.getElementById('modal-password')?.classList.remove('open');
    document.getElementById('resp-new-password').value = '';
    document.getElementById('resp-confirm-password').value = '';
}

async function soumettre() {
    const newPass = document.getElementById('resp-new-password').value;
    const confirm = document.getElementById('resp-confirm-password').value;
    if (!newPass || newPass.length < 6) {
        showToast('Le mot de passe doit faire au moins 6 caractères', 'error');
        return;
    }
    if (newPass !== confirm) {
        showToast('Les deux mots de passe ne sont pas identiques', 'error');
        return;
    }
    try {
        await changerMotDePasse(newPass);
        fermer();
        showToast('Mot de passe changé avec succès', 'success', 3000);
    } catch (err) {
        showToast('Erreur : ' + err.message, 'error');
    }
}

export function initMonMotDePasse(profil) {
    const nom = profil.nom || getSession()?.user?.email?.split('@')[0] || '?';
    const avatarEl = document.getElementById('resp-user-avatar');
    avatarEl.textContent = initiales(nom);
    avatarEl.addEventListener('click', () => document.getElementById('modal-password').classList.add('open'));
    document.getElementById('resp-user-nom').textContent = nom;

    const modal = document.getElementById('modal-password');
    modal.addEventListener('click', e => { if (e.target === modal) fermer(); });
    document.getElementById('btn-close-password').addEventListener('click', fermer);
    attachPasswordToggle('resp-new-password', 'toggle-resp-new-password');
    attachPasswordToggle('resp-confirm-password', 'toggle-resp-confirm-password');
    document.getElementById('btn-resp-change-password').addEventListener('click', soumettre);
}
