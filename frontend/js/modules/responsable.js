import { chargerMonProfil } from './db_responsable.js';
import { getSession, deconnexion, isSessionValid, refreshSession, startAutoRefresh, changerMotDePasse } from './auth.js';
import { fermerPdfViewer } from './pdfviewer.js';
import { showToast, attachPasswordToggle } from '../utils/utils.js';
import { getLogoBase64 } from './fdr.js';
import { initiales } from './responsable_render.js';
import * as liste from './responsable_liste.js';
import { peuplerSelectPeriode, cablerFiltreEtSelection, cablerListe } from './responsable_evenements.js';

function fermerModalPassword() {
    document.getElementById('modal-password')?.classList.remove('open');
    document.getElementById('resp-new-password').value = '';
    document.getElementById('resp-confirm-password').value = '';
}

function initMotDePasse(profil) {
    const avatarEl = document.getElementById('resp-user-avatar');
    if (avatarEl) {
        avatarEl.textContent = initiales(profil.nom || getSession()?.user?.email?.split('@')[0] || '?');
        avatarEl.addEventListener('click', () => document.getElementById('modal-password').classList.add('open'));
    }
    document.getElementById('btn-close-password')?.addEventListener('click', fermerModalPassword);
    attachPasswordToggle('resp-new-password', 'toggle-resp-new-password');
    attachPasswordToggle('resp-confirm-password', 'toggle-resp-confirm-password');

    document.getElementById('btn-resp-change-password')?.addEventListener('click', async () => {
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
            fermerModalPassword();
            showToast('Mot de passe changé avec succès', 'success', 3000);
        } catch (err) {
            showToast('Erreur : ' + err.message, 'error');
        }
    });
}

export async function initResponsable() {
    document.getElementById('header-logo').src = getLogoBase64();
    document.getElementById('btn-close-pdf')?.addEventListener('click', fermerPdfViewer);

    if (!isSessionValid()) {
        const refreshed = await refreshSession();
        if (!refreshed) { window.location.href = '/pages/login.html'; return; }
    }
    startAutoRefresh();

    const profil = await chargerMonProfil();
    if (!profil || profil.role !== 'responsable') {
        window.location.href = '/index.html';
        return;
    }

    initMotDePasse(profil);

    const container = document.getElementById('resp-list');
    liste.afficherChargement();

    try {
        await liste.chargerDonnees();
    } catch {
        liste.afficherErreurChargement();
        return;
    }

    peuplerSelectPeriode();
    liste.rendreListe();
    cablerListe(container);
    cablerFiltreEtSelection();

    document.getElementById('btn-resp-logout')?.addEventListener('click', async () => {
        await deconnexion();
        window.location.href = '/pages/login.html';
    });
}
