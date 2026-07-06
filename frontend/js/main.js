import {
    cfg, getLogoBase64, calcHeures, onSuppInput, resetSuppAuto,
    ajouterIntervention, ajouterPause, sauvegarderBrouillon,
    afficherBlocRappel, viderRappel,
} from './modules/fdr.js';
import {
    openSettings, fermerModal, sauvegarderParams,
    ouvrirHistorique, renderListeHistorique, initHistoriqueEvents,
    ouvrirSuppRecap, calculerSuppRecap,
    ouvrirSuggestion, envoyerSuggestion,
} from './modules/ui.js';
import { genererPDF } from './modules/pdf.js';
import { initDashboard, afficherDashboard } from './modules/dashboard.js';
import { initToolbar } from './modules/toolbar.js';
import { fermerPdfViewer } from './modules/pdfviewer.js';
import { envoyerMail } from './api/api.js';
import { getSession, isSessionValid, deconnexion, changerMotDePasse, refreshSession } from './modules/auth.js';
import { chargerContratProfil, sauvegarderContratProfil } from './modules/db.js';
import { showToast, scrollVersCarte } from './utils/utils.js';

// ── Initialisation de l'app après auth ────────────────────────

function initApp(user, nomProfil) {
    const nomTech = nomProfil || user.user_metadata?.nom || '';
    const techEl  = document.getElementById('technicien');
    techEl.readOnly = true;
    techEl.classList.add('locked-field');

    techEl.value = nomTech;
    calcHeures();

    // Au démarrage, on affiche le tableau de bord (pas le formulaire).
    // Le formulaire est rempli à la demande : « Nouvelle feuille », « Créer »
    // pour un jour manquant, ou « Reprendre » un brouillon existant.
    initDashboard(nomTech);
    afficherDashboard();
    initToolbar();

    // ── Formulaire principal ───────────────────────────────────

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

    document.getElementById('btn-add-int').addEventListener('click', () => {
        scrollVersCarte(ajouterIntervention());
    });
    document.getElementById('btn-add-pause').addEventListener('click', () => {
        scrollVersCarte(ajouterPause());
    });

    // ── Rappel / sortie supplémentaire ─────────────────────────
    document.getElementById('btn-rappel').addEventListener('click', () => {
        afficherBlocRappel();
        sauvegarderBrouillon();
    });
    document.getElementById('btn-rappel-remove').addEventListener('click', () => {
        viderRappel();
        calcHeures();
        sauvegarderBrouillon();
    });
    document.getElementById('rappel-debut').addEventListener('input', () => {
        const rDebut = document.getElementById('rappel-debut').value;
        const hFin   = document.getElementById('heure-fin').value;
        if (rDebut && hFin && rDebut <= hFin) {
            showToast('Le départ de la sortie supplémentaire doit être après la fin de journée', 'warn', 4000);
            document.getElementById('rappel-debut').value = '';
            return;
        }
        calcHeures();
        sauvegarderBrouillon();
    });
    document.getElementById('rappel-fin').addEventListener('input', () => {
        const rDebut = document.getElementById('rappel-debut').value;
        const rFin   = document.getElementById('rappel-fin').value;
        if (rDebut && rFin && rFin <= rDebut) {
            showToast('L\'heure de retour doit être après l\'heure de départ', 'warn', 3500);
            document.getElementById('rappel-fin').value = '';
            return;
        }
        calcHeures();
        sauvegarderBrouillon();
    });

    document.getElementById('btn-pdf').addEventListener('click', genererPDF);
    document.getElementById('btn-email').addEventListener('click', envoyerMail);

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

    // ── Modal suggestion ───────────────────────────────────────

    document.getElementById('btn-ouvrir-suggestion').addEventListener('click', ouvrirSuggestion);
    document.getElementById('btn-suggestion-envoyer').addEventListener('click', envoyerSuggestion);
    document.getElementById('btn-suggestion-annuler').addEventListener('click', () => fermerModal('modal-suggestion'));

    document.getElementById('btn-refresh-app').addEventListener('click', async () => {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) await reg.unregister();
        }
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
        location.reload(true);
    });

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

    if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    let session = getSession();

    if (session && !isSessionValid()) {
        session = await refreshSession();
    }

    if (!session?.user) {
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        const profil = await chargerContratProfil();
        if (profil?.role === 'responsable') {
            window.location.href = '/pages/responsable.html';
            return;
        }
        if (profil?.contrat) {
            cfg.contrat = profil.contrat;
            cfg.company = profil.company || '';
            cfg.email   = profil.email_responsable || '';
            localStorage.setItem('cfg_contrat', profil.contrat);
            localStorage.setItem('cfg_company', cfg.company);
            localStorage.setItem('cfg_email',   cfg.email);
            initApp(session.user, profil.nom || '');
        } else {
            afficherModalPremierContrat(session.user, profil?.nom || '');
        }
    } catch {
        initApp(session.user, '');
    }
});

function afficherModalPremierContrat(user, nomProfil) {
    document.getElementById('modal-first-contrat').classList.add('open');
    document.getElementById('btn-contrat-35').addEventListener('click', () => choisirContrat('35', user, nomProfil));
    document.getElementById('btn-contrat-39').addEventListener('click', () => choisirContrat('39', user, nomProfil));
}

async function choisirContrat(valeur, user, nomProfil) {
    try {
        await sauvegarderContratProfil(valeur);
    } catch (err) {
        showToast('Impossible de sauvegarder le contrat : ' + err.message, 'error');
        return;
    }
    cfg.contrat = valeur;
    localStorage.setItem('cfg_contrat', valeur);
    document.getElementById('modal-first-contrat').classList.remove('open');
    initApp(user, nomProfil);
}
