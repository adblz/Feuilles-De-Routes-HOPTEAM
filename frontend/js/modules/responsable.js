import { chargerMonProfil, chargerToutesLesFeuilles, chargerProfilsTechniciens, chargerPdfResponsable } from './db_responsable.js';
import { getSession, deconnexion, isSessionValid, refreshSession, startAutoRefresh, changerMotDePasse } from './auth.js';
import { afficherPdfUrl, fermerPdfViewer } from './pdfviewer.js';
import { showToast, attachPasswordToggle } from '../utils/utils.js';
import { getLogoBase64 } from './fdr.js';
import { initiales, moisCourant, grouperParTech, renderTechs } from './responsable_render.js';

const VUES_KEY = 'fdr_resp_vues';
let _feuilles = [];

function getVues() { return new Set(JSON.parse(localStorage.getItem(VUES_KEY) || '[]')); }

function marquerVue(id) {
    const vues = getVues();
    vues.add(id);
    localStorage.setItem(VUES_KEY, JSON.stringify([...vues]));
}

function majCompteur() {
    const vues = getVues();
    const mois = moisCourant();
    const nb = _feuilles.filter(f => f.date?.startsWith(mois) && !vues.has(f.id)).length;
    const nbEl = document.getElementById('resp-compteur-nb');
    const txtEl = document.getElementById('resp-compteur-texte');
    if (nbEl) nbEl.textContent = nb;
    if (txtEl) txtEl.textContent = nb === 0
        ? 'Tout est à jour pour ce mois ✓'
        : `feuille${nb > 1 ? 's' : ''} non vue${nb > 1 ? 's' : ''} ce mois`;
}

function fermerModalPassword() {
    document.getElementById('modal-password')?.classList.remove('open');
    document.getElementById('resp-new-password').value = '';
    document.getElementById('resp-confirm-password').value = '';
}

async function ouvrirPdf(id) {
    try {
        const url = await chargerPdfResponsable(id);
        if (!url) { showToast('PDF non disponible pour cette feuille', 'warn', 3500); return; }
        marquerVue(id);
        majCompteur();
        const btn = document.querySelector(`[data-pdf-id="${id}"]`);
        if (btn) { btn.classList.remove('nonvue'); btn.textContent = 'Voir PDF'; }
        await afficherPdfUrl(url);
    } catch {
        showToast('Erreur lors du chargement du PDF', 'error');
    }
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

    const container = document.getElementById('resp-list');
    container.innerHTML = '<div class="resp-loading">Chargement…</div>';

    let profilsTechs = [];
    try {
        [_feuilles, profilsTechs] = await Promise.all([chargerToutesLesFeuilles(), chargerProfilsTechniciens()]);
    } catch {
        container.innerHTML = '<div class="resp-loading">Erreur de connexion. Rechargez la page.</div>';
        return;
    }

    majCompteur();
    container.innerHTML = renderTechs(grouperParTech(_feuilles, profilsTechs), getVues());

    container.addEventListener('click', e => {
        const header = e.target.closest('.resp-tech-header');
        if (header) {
            const body = header.parentElement.querySelector('.resp-tech-body');
            const chevron = header.querySelector('.resp-chevron');
            body.classList.toggle('hidden');
            chevron.textContent = body.classList.contains('hidden') ? '▼' : '▲';
            return;
        }
        const pdfBtn = e.target.closest('.btn-voir-pdf-resp');
        if (pdfBtn) ouvrirPdf(pdfBtn.dataset.pdfId);
    });

    document.getElementById('btn-resp-logout')?.addEventListener('click', async () => {
        await deconnexion();
        window.location.href = '/pages/login.html';
    });
}
