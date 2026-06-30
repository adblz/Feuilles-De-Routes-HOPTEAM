import { isoLocal } from '../utils/utils.js';
import { chargerHistorique } from './db.js';
import { getBrouillonsDates } from './fdr.js';
import { afficherDashboard, ouvrirNouvelleFeuille, finaliserBrouillon } from './dashboard.js';
import { afficherResumeFeuille } from './resume.js';
import { openSettings } from './ui.js';
import { afficherHeures } from './heures_history.js';

const aujourdhui = () => isoLocal(new Date());

export function setToolbarActive(id) {
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(id);
    if (btn) btn.classList.add('active');
}

async function ouvrirFeuilleduJour() {
    const today = aujourdhui();

    try {
        const historique = await chargerHistorique();
        const feuilleAujourd = historique.find(f => f.date === today);
        if (feuilleAujourd) {
            await afficherResumeFeuille(feuilleAujourd.id);
            return;
        }
    } catch {
        // En cas d'erreur réseau on continue vers le brouillon ou le formulaire vide
    }

    if (getBrouillonsDates().has(today)) {
        finaliserBrouillon(today);
        return;
    }

    ouvrirNouvelleFeuille(today);
}

export function initToolbar() {
    // Synchronise l'onglet actif quand la navigation change
    document.addEventListener('nav:dashboard',  () => setToolbarActive('btn-toolbar-accueil'));
    document.addEventListener('nav:formulaire', () => setToolbarActive('btn-toolbar-feuille'));
    document.addEventListener('nav:resume',     () => setToolbarActive('btn-toolbar-feuille'));
    document.addEventListener('nav:heures',     () => setToolbarActive('btn-toolbar-extra'));

    document.getElementById('btn-toolbar-accueil').addEventListener('click', afficherDashboard);
    document.getElementById('btn-toolbar-feuille').addEventListener('click', ouvrirFeuilleduJour);
    document.getElementById('btn-toolbar-extra').addEventListener('click', afficherHeures);
    document.getElementById('btn-toolbar-profil').addEventListener('click', openSettings);

    document.addEventListener('focusin', (e) => {
        if (e.target.matches('input, textarea, select')) {
            document.body.classList.add('clavier-ouvert');
        }
    });
    document.addEventListener('focusout', () => {
        setTimeout(() => {
            if (!document.activeElement?.matches('input, textarea, select')) {
                document.body.classList.remove('clavier-ouvert');
            }
        }, 150);
    });
}
