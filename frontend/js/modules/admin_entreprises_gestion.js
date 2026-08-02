// Onglet « Entreprises » : grille de logos cliquables et ajout d'une entreprise.
// L'édition (nom, logo, réglages, suppression) se fait dans admin_entreprises_modal.js.
// Le renommage met à jour les utilisateurs rattachés ; la suppression est bloquée
// tant qu'au moins un utilisateur y est rattaché (vérifié dans le modal).

import { chargerEntreprises, creerEntreprise, modifierEntreprise, modifierReglesEntreprise, supprimerEntreprise, renommerCompagnieProfils } from '../api/admin_entreprises_api.js';
import { initEntrepriseEditModal, ouvrirModalEntrepriseEdit } from './admin_entreprises_modal.js';
import { usageEntreprises } from './admin_users_table.js';
import { showToast } from '../utils/utils.js';

let _onChange = null;
let _parId = new Map();   // id -> entreprise, pour retrouver l'objet au clic sur sa tuile

export function initEntreprisesGestion(onChange) {
    _onChange = onChange;
    document.getElementById('btn-ent-ajouter').addEventListener('click', ajouter);
    document.getElementById('ent-ajout-nom').addEventListener('keydown', e => {
        if (e.key === 'Enter') ajouter();
    });
    document.getElementById('ent-gestion-liste').addEventListener('click', onTuileClick);
    initEntrepriseEditModal({ onEnregistrer, onSupprimer });
}

export async function rafraichirEntreprises() {
    const box = document.getElementById('ent-gestion-liste');
    if (!box) return;
    try {
        const entreprises = await chargerEntreprises();
        _parId = new Map(entreprises.map(e => [String(e.id), e]));
        box.innerHTML = entreprises.length
            ? entreprises.map(tuile).join('')
            : '<div class="ent-vide">Aucune entreprise pour le moment.</div>';
    } catch (e) {
        box.innerHTML = '<div class="ent-vide">Erreur de chargement.</div>';
        showToast('Erreur : ' + e.message, 'warn');
    }
}

// Une tuile = le logo seul (nom en infobulle) ; le nom en texte s'il n'y a pas de logo.
function tuile(e) {
    const nom = escHtml(e.nom);
    const contenu = e.logo_b64
        ? `<img class="ent-tuile-logo" src="${e.logo_b64}" alt="${nom}">`
        : `<span class="ent-tuile-nom">${nom}</span>`;
    return `<button class="ent-tuile" type="button" data-id="${e.id}" title="${nom}">${contenu}</button>`;
}

function onTuileClick(e) {
    const tuileEl = e.target.closest('.ent-tuile');
    if (!tuileEl) return;
    const entreprise = _parId.get(tuileEl.dataset.id);
    if (!entreprise) return;
    ouvrirModalEntrepriseEdit(entreprise, usageEntreprises().get(entreprise.nom) || 0);
}

// Enregistre les modifications du modal : réglages, logo (si touché), nom (si changé).
async function onEnregistrer({ id, ancien, nom, regles, logo }) {
    await agir(async () => {
        const champs = { ...regles };
        if (logo !== undefined) champs.logo_b64 = logo;
        await modifierReglesEntreprise(id, champs);
        if (nom !== ancien) {
            await modifierEntreprise(id, nom);
            await renommerCompagnieProfils(ancien, nom);
        }
        showToast('Entreprise enregistrée', 'success');
    });
}

async function onSupprimer(id) {
    await agir(async () => {
        await supprimerEntreprise(id);
        showToast('Entreprise supprimée', 'success');
    });
}

async function ajouter() {
    const input = document.getElementById('ent-ajout-nom');
    const nom = input.value.trim();
    if (!nom) { showToast('Le nom de l\'entreprise est obligatoire.', 'warn'); return; }
    await agir(async () => {
        await creerEntreprise(nom);
        input.value = '';
        showToast('Entreprise ajoutée', 'success');
    });
}

async function agir(action) {
    try {
        await action();
        if (_onChange) await _onChange();
        await rafraichirEntreprises();
    } catch (e) {
        showToast('Erreur : ' + e.message, 'warn');
    }
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
