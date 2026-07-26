// Onglet « Entreprises » : liste, ajout, renommage et suppression des entreprises.
// Le renommage met à jour les utilisateurs rattachés ; la suppression est bloquée
// tant qu'au moins un utilisateur y est rattaché.

import { chargerEntreprises, creerEntreprise, modifierEntreprise, modifierReglesEntreprise, supprimerEntreprise, renommerCompagnieProfils } from '../api/admin_entreprises_api.js';
import { blocReglages, lireReglages, lireLogoFichier } from './admin_entreprises_form.js';
import { usageEntreprises } from './admin_users_table.js';
import { showToast } from '../utils/utils.js';

const LOGO_MAX_OCTETS = 300 * 1024;   // logo lu par chaque technicien : le garder léger

let _onChange = null;

export function initEntreprisesGestion(onChange) {
    _onChange = onChange;
    document.getElementById('btn-ent-ajouter').addEventListener('click', ajouter);
    document.getElementById('ent-ajout-nom').addEventListener('keydown', e => {
        if (e.key === 'Enter') ajouter();
    });
    const liste = document.getElementById('ent-gestion-liste');
    liste.addEventListener('click', onListeClick);
    liste.addEventListener('change', onListeChange);
}

export async function rafraichirEntreprises() {
    const box = document.getElementById('ent-gestion-liste');
    if (!box) return;
    try {
        const entreprises = await chargerEntreprises();
        const usage = usageEntreprises();
        box.innerHTML = entreprises.length
            ? entreprises.map(e => ligne(e, usage.get(e.nom) || 0)).join('')
            : '<div class="ent-vide">Aucune entreprise pour le moment.</div>';
    } catch (e) {
        box.innerHTML = '<div class="ent-vide">Erreur de chargement.</div>';
        showToast('Erreur : ' + e.message, 'warn');
    }
}

function ligne(e, nb) {
    return `
        <div class="ent-row" data-id="${e.id}" data-nom="${escHtml(e.nom)}">
            <input class="ent-row-input" value="${escHtml(e.nom)}" aria-label="Nom de l'entreprise">
            <span class="ent-row-count">${nb} utilisateur${nb > 1 ? 's' : ''}</span>
            <button class="ent-row-save" data-action="save">Renommer</button>
            <button class="ent-row-del" data-action="del">Supprimer</button>
            ${blocReglages(e)}
        </div>`;
}

async function onListeClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('.ent-row');
    const id = row.dataset.id, ancien = row.dataset.nom;
    const action = btn.dataset.action;

    if (action === 'save') {
        const nouveau = row.querySelector('.ent-row-input').value.trim();
        if (!nouveau) { showToast('Le nom ne peut pas être vide.', 'warn'); return; }
        if (nouveau === ancien) { showToast('Aucun changement.', 'warn'); return; }
        await agir(async () => {
            await modifierEntreprise(id, nouveau);
            await renommerCompagnieProfils(ancien, nouveau);
            showToast('Entreprise renommée', 'success');
        });
    } else if (action === 'save-reglages') {
        const res = lireReglages(row);
        if (!res.ok) { showToast(res.msg, 'warn'); return; }
        await agir(async () => {
            await modifierReglesEntreprise(id, res.regles);
            showToast('Réglages enregistrés', 'success');
        });
    } else if (action === 'logo-suppr') {
        await agir(async () => {
            await modifierReglesEntreprise(id, { logo_b64: null });
            showToast('Logo retiré', 'success');
        });
    } else if (action === 'del') {
        const nb = usageEntreprises().get(ancien) || 0;
        if (nb > 0) { showToast(`Impossible : ${nb} utilisateur(s) encore rattaché(s).`, 'warn'); return; }
        if (!confirm(`Supprimer l'entreprise « ${ancien} » ?`)) return;
        await agir(async () => {
            await supprimerEntreprise(id);
            showToast('Entreprise supprimée', 'success');
        });
    }
}

// Import d'un logo (input file) : lecture → base64 → enregistrement immédiat.
async function onListeChange(e) {
    const input = e.target.closest('.ent-logo-input');
    if (!input || !input.files?.[0]) return;
    const file = input.files[0];
    const row  = input.closest('.ent-row');
    if (file.size > LOGO_MAX_OCTETS) {
        showToast('Logo trop lourd (max 300 Ko). Choisis une image plus petite.', 'warn', 4000);
        input.value = '';
        return;
    }
    await agir(async () => {
        const dataUrl = await lireLogoFichier(file);
        await modifierReglesEntreprise(row.dataset.id, { logo_b64: dataUrl });
        showToast('Logo enregistré', 'success');
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
