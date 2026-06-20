import {
    cfg, getLogoBase64, calcHeures, onSuppInput, resetSuppAuto,
    ajouterIntervention, ajouterPause, sauvegarderBrouillon, restaurerBrouillon,
} from './modules/fdr.js';
import {
    openSettings, fermerModal, sauvegarderParams,
    ouvrirHistorique, renderListeHistorique, initHistoriqueEvents,
    ouvrirSuppRecap, calculerSuppRecap,
    nouvelleFeuille,
} from './modules/ui.js';
import { genererPDF } from './modules/pdf.js';
import { fermerPdfViewer } from './modules/pdfviewer.js';
import { envoyerMail } from './api/api.js';
import { getSession, isSessionValid, deconnexion, changerMotDePasse, refreshSession } from './modules/auth.js';
import { showToast } from './utils/utils.js';

// ── Initialisation de l'app après auth ────────────────────────

function initApp(user) {
    const nomTech = user.user_metadata?.nom || '';
    const techEl  = document.getElementById('technicien');
    techEl.readOnly = true;
    techEl.classList.add('locked-field');

    if (cfg.company && cfg.email) {
        document.getElementById('setup-notice').style.display = 'none';
    }

    calcHeures();

    if (!restaurerBrouillon()) {
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        ajouterIntervention();
    }
    techEl.value = nomTech;

    // ── Formulaire principal ───────────────────────────────────

    // ── Menu déroulant de l'entête (bouton 3 tirets) ──────────
    const burger = document.getElementById('btn-burger');
    const dropdown = document.getElementById('header-dropdown');
    const headerMenu = burger.closest('.header-menu');

    const fermerMenu = () => {
        dropdown.setAttribute('hidden', '');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
    };

    burger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdown.hasAttribute('hidden')) {
            dropdown.removeAttribute('hidden');
            burger.classList.add('open');
            burger.setAttribute('aria-expanded', 'true');
        } else {
            fermerMenu();
        }
    });

    document.addEventListener('click', (e) => {
        if (!headerMenu.contains(e.target)) fermerMenu();
    });

    document.getElementById('btn-open-supp').addEventListener('click', () => { fermerMenu(); ouvrirSuppRecap(); });
    document.getElementById('btn-open-historique').addEventListener('click', () => { fermerMenu(); ouvrirHistorique(); });
    document.getElementById('btn-open-settings').addEventListener('click', () => { fermerMenu(); openSettings(); });

    document.getElementById('date').addEventListener('input', () => {
        calcHeures();
        sauvegarderBrouillon();
    });
    document.getElementById('heure-debut').addEventListener('input', () => {
        calcHeures();
        sauvegarderBrouillon();
    });
    document.getElementById('heure-fin').addEventListener('input', () => {
        calcHeures();
        sauvegarderBrouillon();
    });
    document.getElementById('repas').addEventListener('change', () => {
        calcHeures();
        sauvegarderBrouillon();
    });
    document.getElementById('heures-supp').addEventListener('input', () => {
        onSuppInput();
        sauvegarderBrouillon();
    });
    document.getElementById('btn-supp-auto').addEventListener('click', resetSuppAuto);

    document.getElementById('btn-add-int').addEventListener('click', ajouterIntervention);
    document.getElementById('btn-add-pause').addEventListener('click', ajouterPause);
    document.getElementById('btn-pdf').addEventListener('click', genererPDF);
    document.getElementById('btn-email').addEventListener('click', envoyerMail);
    document.getElementById('btn-new-feuille').addEventListener('click', nouvelleFeuille);

    // ── Modal historique ───────────────────────────────────────

    initHistoriqueEvents();
    document.getElementById('histo-filtre-annee').addEventListener('change', renderListeHistorique);
    document.getElementById('btn-close-historique').addEventListener('click', () => fermerModal('modal-historique'));

    // ── Modal aperçu PDF ───────────────────────────────────────

    document.getElementById('btn-close-pdf').addEventListener('click', fermerPdfViewer);

    // ── Modal heures supp ──────────────────────────────────────

    document.getElementById('btn-close-supp').addEventListener('click', () => fermerModal('modal-supp'));
    document.getElementById('btn-supp-calc').addEventListener('click', calculerSuppRecap);

    // ── Modal paramètres ───────────────────────────────────────

    document.getElementById('btn-settings-save').addEventListener('click', sauvegarderParams);
    document.getElementById('btn-settings-cancel').addEventListener('click', () => fermerModal('modal-settings'));

    document.getElementById('btn-change-password').addEventListener('click', async () => {
        const newPass = document.getElementById('s-new-password').value;
        if (!newPass || newPass.length < 6) {
            showToast('Le mot de passe doit faire au moins 6 caractères', 'error');
            return;
        }
        try {
            await changerMotDePasse(newPass);
            document.getElementById('s-new-password').value = '';
            showToast('Mot de passe changé avec succès', 'success', 3000);
        } catch (err) {
            showToast('Erreur : ' + err.message, 'error');
        }
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
        if (!confirm('Se déconnecter ?')) return;
        await deconnexion();
        if (typeof caches !== 'undefined') {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
        window.location.href = '/pages/login.html';
    });
}

// ── Point d'entrée ─────────────────────────────────────────────

// Mesure la hauteur de l'entête pour que les panneaux (historique, heures supp)
// s'ouvrent pile en dessous sur téléphone.
function majHauteurHeader() {
    const header = document.querySelector('header');
    if (header) {
        document.documentElement.style.setProperty('--app-header-h', header.offsetHeight + 'px');
    }
}

window.addEventListener('resize', majHauteurHeader);

window.addEventListener('load', async () => {
    document.getElementById('header-logo').src = getLogoBase64();
    majHauteurHeader();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    let session = getSession();

    if (session && !isSessionValid()) {
        session = await refreshSession();
    }

    if (session?.user) {
        initApp(session.user);
    } else {
        window.location.href = '/pages/login.html';
    }
});
