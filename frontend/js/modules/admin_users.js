import { isSessionValid, refreshSession, startAutoRefresh } from './auth.js';
import { chargerMonProfil } from './db_responsable.js';
import { chargerTousLesProfils, modifierProfil, creerUtilisateur, supprimerUtilisateur } from '../api/admin_api.js';
import { chargerEntreprises, creerEntreprise } from '../api/admin_entreprises_api.js';
import { initAdminUI, ouvrirModalCreer, ouvrirModalModifier } from './admin_users_ui.js';
import { renderTableau, filtrerTableau, initTri } from './admin_users_table.js';
import { initEntreprisesUI, remplirEntreprises } from './admin_entreprises_ui.js';
import { initEntreprisesGestion, rafraichirEntreprises } from './admin_entreprises_gestion.js';
import { initSuggestions } from './admin_suggestions.js';
import { initPlanning } from './admin_planning.js';
import { initNav, showTab } from './admin_nav.js';
import { setKpi } from './admin_kpis.js';
import { showToast } from '../utils/utils.js';

let _monId = null;

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
    _monId = profil.id;

    document.getElementById('admin-user-nom').textContent = profil.nom || '';
    document.getElementById('admin-avatar').textContent = initiales(profil.nom);
    document.getElementById('btn-admin-logout').addEventListener('click', deconnecter);
    document.getElementById('btn-nouvel-utilisateur').addEventListener('click', ouvrirModalCreer);

    document.getElementById('admin-users-recherche').addEventListener('input', e => filtrerTableau({ texte: e.target.value }));
    document.getElementById('admin-users-filtre-entreprise').addEventListener('change', e => filtrerTableau({ entreprise: e.target.value }));

    document.getElementById('kpi-card-utilisateurs').addEventListener('click', () => showTab('users'));
    document.getElementById('kpi-card-suggestions').addEventListener('click', () => showTab('suggestions'));
    document.getElementById('kpi-card-entreprises').addEventListener('click', () => showTab('entreprises'));

    initTri();
    initAdminUI({ onModifier, onCreer });
    initEntreprisesUI(onCreerEntreprise);
    initEntreprisesGestion(chargerEtAfficher);
    initNav(onOngletAffiche);
    startAutoRefresh();
    await chargerEtAfficher();
    await initSuggestions();
    await initPlanning();
}

function onOngletAffiche(onglet) {
    if (onglet === 'entreprises') rafraichirEntreprises();
}

function initiales(nom) {
    return String(nom || '')
        .trim()
        .split(/\s+/)
        .map(m => m.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('') || 'AD';
}

async function deconnecter() {
    const { deconnexion } = await import('./auth.js');
    await deconnexion();
    window.location.href = '/pages/login.html';
}

async function chargerEtAfficher() {
    try {
        const [profils, entreprises] = await Promise.all([chargerTousLesProfils(), chargerEntreprises()]);
        renderTableau(profils, { onModifier: ouvrirModalModifier, onSupprimer: (id, nom) => onSupprimer(id, nom, _monId) });
        remplirEntreprises(entreprises);
        setKpi('kpi-entreprises', entreprises.length);
    } catch (e) {
        showToast('Erreur de chargement : ' + e.message, 'warn');
    }
}

async function onCreerEntreprise(nom) {
    try {
        await creerEntreprise(nom);
        remplirEntreprises(await chargerEntreprises());
        showToast('Entreprise ajoutée', 'success');
    } catch (e) {
        showToast('Erreur : ' + e.message, 'warn');
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

async function onCreer(email, nom, role, contrat, password, company, emailResp, voitTout) {
    try {
        await creerUtilisateur(email, nom, role, contrat, password, company, emailResp, voitTout);
        showToast('Compte créé avec succès', 'success');
        await chargerEtAfficher();
    } catch (e) {
        showToast('Erreur : ' + e.message, 'warn');
    }
}

async function onSupprimer(id, nom, currentId) {
    if (id === currentId) {
        showToast('Vous ne pouvez pas supprimer votre propre compte.', 'warn');
        return;
    }
    if (!confirm(`Supprimer ${nom} ? Cette action est irréversible.`)) return;
    try {
        await supprimerUtilisateur(id);
        showToast(`${nom} a été supprimé.`, 'success');
        await chargerEtAfficher();
    } catch (e) {
        showToast('Erreur : ' + e.message, 'warn');
    }
}
