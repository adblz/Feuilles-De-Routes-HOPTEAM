import { isSessionValid, refreshSession } from './auth.js';
import { chargerMonProfil } from './db_responsable.js';
import { chargerTousLesProfils, modifierProfil, creerUtilisateur } from '../api/admin_api.js';
import { initAdminUI, renderTableau, ouvrirModalCreer } from './admin_users_ui.js';
import { initSuggestions } from './admin_suggestions.js';
import { initPlanning } from './admin_planning.js';
import { showToast } from '../utils/utils.js';

export async function initAdmin() {
    if (!isSessionValid()) {
        const refreshed = await refreshSession();
        if (!refreshed) {
            window.location.href = '/pages/login.html';
            return;
        }
    }

    const profil = await chargerMonProfil();
    if (!profil || profil.role !== 'admin') {
        document.querySelector('.admin-main').innerHTML = `
            <div class="admin-acces-refuse">
                <h2>Accès refusé</h2>
                <p>Vous n'avez pas les droits nécessaires pour cette page.</p>
                <a href="/index.html">Retour à l'accueil</a>
            </div>`;
        return;
    }

    document.getElementById('admin-user-nom').textContent = profil.nom || '';
    document.getElementById('btn-admin-logout').addEventListener('click', deconnecter);
    document.getElementById('btn-nouvel-utilisateur').addEventListener('click', ouvrirModalCreer);

    initAdminUI({ onModifier, onCreer });
    await chargerEtAfficher();
    await initSuggestions();
    await initPlanning();
}

async function deconnecter() {
    const { deconnexion } = await import('./auth.js');
    await deconnexion();
    window.location.href = '/pages/login.html';
}

async function chargerEtAfficher() {
    try {
        const profils = await chargerTousLesProfils();
        renderTableau(profils);
    } catch (e) {
        showToast('Erreur de chargement : ' + e.message, 'warn');
    }
}

async function onModifier(id, data) {
    try {
        await modifierProfil(id, data);
        showToast('Profil modifié', 'success');
        await chargerEtAfficher();
    } catch (e) {
        showToast('Erreur : ' + e.message, 'warn');
    }
}

async function onCreer(email, nom, contrat, password, company, emailResp) {
    try {
        await creerUtilisateur(email, nom, contrat, password, company, emailResp);
        showToast('Compte créé avec succès', 'success');
        await chargerEtAfficher();
    } catch (e) {
        showToast('Erreur : ' + e.message, 'warn');
    }
}
