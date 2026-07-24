import {
    cfg, getLogoBase64, calcHeures, onSuppInput, resetSuppAuto, validerSuppInput,
    ajouterIntervention, ajouterPause, sauvegarderBrouillon,
    afficherBlocRappel, viderRappel,
} from './modules/fdr.js';
import {
    openSettings, fermerModal, sauvegarderParams,
    ouvrirSuppRecap, calculerSuppRecap,
    ouvrirSuggestion, envoyerSuggestion,
} from './modules/ui.js';
import { genererPDF } from './modules/pdf.js';
import { initDashboard, afficherDashboard } from './modules/dashboard.js';
import { initToolbar } from './modules/toolbar.js';
import { afficherHeures } from './modules/heures_history.js';
import { fermerPdfViewer } from './modules/pdfviewer.js';
import { getSession, isSessionValid, deconnexion, changerMotDePasse, refreshSession, startAutoRefresh } from './modules/auth.js';
import { chargerContratProfil, sauvegarderContratProfil } from './modules/db.js';
import { showToast, scrollVersCarte, attachPasswordToggle, attacherBoutonMiseAJour } from './utils/utils.js';
import { collapserToutesSauf } from './modules/fdr_collapse.js';
import { initTimePicker } from './modules/timepicker.js';

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
    initTimePicker();
    document.getElementById('dash-supp-card')?.addEventListener('click', afficherHeures);

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
    document.getElementById('astreinte-jour').addEventListener('change', () => {
        calcHeures();
        sauvegarderBrouillon();
    });
    document.getElementById('heures-supp').addEventListener('input', () => {
        onSuppInput();
        sauvegarderBrouillon();
    });
    document.getElementById('heures-supp').addEventListener('blur', () => {
        validerSuppInput();
        sauvegarderBrouillon();
    });
    document.getElementById('btn-supp-auto').addEventListener('click', resetSuppAuto);

    document.getElementById('btn-add-int').addEventListener('click', () => {
        collapserToutesSauf(null);
        scrollVersCarte(ajouterIntervention());
    });
    document.getElementById('btn-add-pause').addEventListener('click', () => {
        collapserToutesSauf(null);
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
        // Un retour « plus petit » que le départ = passage de minuit (ex. 21h → 00h45), c'est valide.
        // On ne bloque que si les deux heures sont identiques (durée nulle).
        if (rDebut && rFin && rFin === rDebut) {
            showToast('Le retour ne peut pas être identique au départ', 'warn', 3500);
            document.getElementById('rappel-fin').value = '';
            return;
        }
        calcHeures();
        sauvegarderBrouillon();
    });
    document.getElementById('rappel-astreinte').addEventListener('change', () => {
        calcHeures();
        sauvegarderBrouillon();
    });

    document.getElementById('btn-pdf').addEventListener('click', genererPDF);

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

    attachPasswordToggle('s-new-password', 'toggle-new-password');
    attachPasswordToggle('s-confirm-password', 'toggle-confirm-password');

    document.getElementById('btn-change-password').addEventListener('click', async () => {
        const newPass = document.getElementById('s-new-password').value;
        const confirm = document.getElementById('s-confirm-password').value;
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
            document.getElementById('s-new-password').value = '';
            document.getElementById('s-confirm-password').value = '';
            showToast('Mot de passe changé avec succès', 'success', 3000);
        } catch (err) {
            showToast('Erreur : ' + err.message, 'error');
        }
    });

}

// ── Point d'entrée ─────────────────────────────────────────────

// Mesure la hauteur de l'entête pour que le panneau heures supp
// s'ouvre pile en dessous sur téléphone.
function majHauteurHeader() {
    const header = document.querySelector('header');
    if (header) {
        document.documentElement.style.setProperty('--app-header-h', header.offsetHeight + 'px');
    }
}

window.addEventListener('resize', majHauteurHeader);

// Boutons de secours ("Mettre à jour", "Déconnexion") : branchés tout au
// début du chargement, isolés dans leur propre try/catch, pour qu'ils
// fonctionnent toujours même si une erreur survient ailleurs dans l'appli
// (par ex. un mélange de fichiers en cache d'anciennes/nouvelles versions).
function attacherBoutonsSecours() {
    try {
        attacherBoutonMiseAJour();

        document.getElementById('btn-logout')?.addEventListener('click', async () => {
            if (!confirm('Se déconnecter ?')) return;
            await deconnexion();
            if (typeof caches !== 'undefined') {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
            window.location.href = document.body.dataset.loginPage || '/pages/login.html';
        });
    } catch (err) {
        console.error('Erreur lors de l\'attachement des boutons de secours', err);
    }
}

window.addEventListener('load', async () => {
    attacherBoutonsSecours();

    const logo = getLogoBase64();
    const logoEl = document.getElementById('header-logo');
    if (logo) logoEl.src = logo; else logoEl.classList.add('hidden');
    majHauteurHeader();

    if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            // Le navigateur ne revérifie pas toujours de lui-même s'il existe
            // une nouvelle version du service worker (surtout en usage PWA sur
            // téléphone, onglet resté ouvert plusieurs jours). On force cette
            // vérification à chaque fois que l'appli revient au premier plan.
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') reg.update();
            });
        }).catch(() => {});

        // Dès qu'une nouvelle version du service worker prend le contrôle de
        // la page, on recharge automatiquement une seule fois (le garde-fou
        // ci-dessous évite toute boucle de rechargement infinie).
        let dejaRecharge = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (dejaRecharge) return;
            dejaRecharge = true;
            window.location.reload();
        });
    }

    let session = getSession();

    if (session && !isSessionValid()) {
        session = await refreshSession();
    }

    if (!session?.user) {
        window.location.href = document.body.dataset.loginPage || '/pages/login.html';
        return;
    }
    startAutoRefresh();

    try {
        const profil = await chargerContratProfil();
        if (profil?.role === 'responsable') {
            window.location.href = '/pages/responsable.html';
            return;
        }
        const estExterne = document.body.dataset.branding === 'externe';
        const estDav = profil?.company === 'DAV';
        if (estExterne !== estDav) {
            window.location.href = estDav ? '/index-externe.html' : '/index.html';
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
