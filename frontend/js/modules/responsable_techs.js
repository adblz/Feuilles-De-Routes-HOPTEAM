// Onglet « Techniciens » de la page responsable : liste des techniciens de
// SON entreprise, création, modification (nom, contrat), réinitialisation du
// mot de passe et suppression. Les droits réels sont vérifiés par le backend.

import { chargerProfilsTechniciens } from './db_responsable.js';
import { creerTechnicien, modifierTechnicien, reinitialiserMotDePasse, supprimerUtilisateur } from '../api/responsable_api.js';
import { renderTechsTable } from './responsable_techs_table.js';
import { initTechsUI, ouvrirModalCreer, ouvrirModalModifier, ouvrirModalPassword } from './responsable_techs_ui.js';
import { showToast } from '../utils/utils.js';
import { entrepriseChoisie, peutGererEntrepriseAffichee } from './responsable_entreprise.js';

let _company = '';
let _techs = [];
let _filtre = '';
let _onChange = null;   // appelé après création / suppression (recharge les autres onglets)

function techParId(id) {
    return _techs.find(t => t.id === id) || null;
}

function rendre() {
    renderTechsTable(_techs, _filtre, { lectureSeule: !peutGererEntrepriseAffichee() });
}

// Bouton « Nouveau technicien » : uniquement pour sa propre entreprise.
function majBoutonNouveau() {
    const btn = document.getElementById('btn-nouveau-tech');
    btn.disabled = !peutGererEntrepriseAffichee();
    btn.title = btn.disabled ? 'Vous ne pouvez créer des techniciens que dans votre entreprise' : '';
}

export async function rechargerTechs() {
    try {
        const tous = await chargerProfilsTechniciens();
        // Un responsable classique ne gère que sa propre entreprise (règle
        // identique côté backend). Un compte multi-entreprises peut afficher
        // celle de son choix, en lecture seule si ce n'est pas la sienne.
        const affichee = entrepriseChoisie() || _company || '';
        _techs = tous.filter(t => (t.company || '') === affichee);
        majBoutonNouveau();
        rendre();
    } catch (e) {
        showToast('Erreur de chargement des techniciens : ' + e.message, 'warn');
    }
}

async function onCreer(email, nom, contrat, password) {
    try {
        await creerTechnicien(email, nom, contrat, password);
        showToast(`Compte créé pour ${nom}`, 'success');
        await rechargerTechs();
        _onChange?.();
        return true;
    } catch (e) {
        showToast('Erreur : ' + e.message, 'error');
        return false;
    }
}

async function onModifier(id, data) {
    try {
        await modifierTechnicien(id, data);
        showToast('Technicien modifié', 'success');
        await rechargerTechs();
        _onChange?.();
        return true;
    } catch (e) {
        showToast('Erreur : ' + e.message, 'error');
        return false;
    }
}

async function onResetPassword(id, password) {
    try {
        await reinitialiserMotDePasse(id, password);
        showToast('Mot de passe réinitialisé', 'success');
        return true;
    } catch (e) {
        showToast('Erreur : ' + e.message, 'error');
        return false;
    }
}

async function onSupprimer(id, nom) {
    if (!confirm(`Supprimer le compte de ${nom} ?\n\nSes feuilles de route seront perdues. Cette action est irréversible.`)) return;
    try {
        await supprimerUtilisateur(id);
        showToast(`${nom} a été supprimé`, 'success');
        await rechargerTechs();
        _onChange?.();
    } catch (e) {
        showToast('Erreur : ' + e.message, 'error');
    }
}

export async function initTechs(profil, { onChange } = {}) {
    _company = profil.company || '';
    _onChange = onChange;
    initTechsUI({ onCreer, onModifier, onResetPassword });

    document.getElementById('btn-nouveau-tech').addEventListener('click', ouvrirModalCreer);
    document.getElementById('resp-techs-recherche').addEventListener('input', e => {
        _filtre = e.target.value;
        rendre();
    });

    document.getElementById('resp-techs-tbody').addEventListener('click', e => {
        const btn = e.target.closest('button[data-id]');
        if (!btn) return;
        const tech = techParId(btn.dataset.id);
        if (!tech) return;
        if (btn.classList.contains('btn-admin-modifier')) ouvrirModalModifier(tech);
        else if (btn.classList.contains('btn-tech-password')) ouvrirModalPassword(tech);
        else if (btn.classList.contains('btn-admin-supprimer')) onSupprimer(tech.id, tech.nom || tech.email);
    });

    await rechargerTechs();
}
