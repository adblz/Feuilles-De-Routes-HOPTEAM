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
import { envoyerMail } from './api/api.js';

window.addEventListener('load', () => {
    document.getElementById('header-logo').src = getLogoBase64();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    if (cfg.company && cfg.email) {
        document.getElementById('setup-notice').style.display = 'none';
    }

    calcHeures();

    if (!restaurerBrouillon()) {
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        const savedName = localStorage.getItem('last_tech');
        if (savedName) document.getElementById('technicien').value = savedName;
        ajouterIntervention();
    }

    // ── Événements formulaire principal ───────────────────────

    document.getElementById('btn-open-supp').addEventListener('click', ouvrirSuppRecap);
    document.getElementById('btn-open-historique').addEventListener('click', ouvrirHistorique);
    document.getElementById('btn-open-settings').addEventListener('click', openSettings);

    document.getElementById('date').addEventListener('input', () => {
        calcHeures();
        sauvegarderBrouillon();
    });

    const techEl = document.getElementById('technicien');
    techEl.addEventListener('input', () => {
        techEl.value = techEl.value.toUpperCase();
        sauvegarderBrouillon();
    });
    techEl.addEventListener('blur', () => {
        localStorage.setItem('last_tech', techEl.value);
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

    // ── Événements modal historique ────────────────────────────

    initHistoriqueEvents();
    document.getElementById('histo-filtre-annee').addEventListener('change', renderListeHistorique);
    document.getElementById('btn-close-historique').addEventListener('click', () => fermerModal('modal-historique'));

    // ── Événements modal heures supp ───────────────────────────

    document.getElementById('btn-close-supp').addEventListener('click', () => fermerModal('modal-supp'));
    document.getElementById('btn-supp-calc').addEventListener('click', calculerSuppRecap);

    // ── Événements modal paramètres ────────────────────────────

    document.getElementById('btn-settings-save').addEventListener('click', sauvegarderParams);
    document.getElementById('btn-settings-cancel').addEventListener('click', () => fermerModal('modal-settings'));
});
