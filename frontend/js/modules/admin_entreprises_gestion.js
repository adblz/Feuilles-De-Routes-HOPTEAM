// Onglet « Entreprises » : liste, ajout, renommage et suppression des entreprises.
// Le renommage met à jour les utilisateurs rattachés ; la suppression est bloquée
// tant qu'au moins un utilisateur y est rattaché.

import { chargerEntreprises, creerEntreprise, modifierEntreprise, modifierReglesEntreprise, supprimerEntreprise, renommerCompagnieProfils } from '../api/admin_entreprises_api.js';
import { usageEntreprises } from './admin_users_table.js';
import { showToast } from '../utils/utils.js';

let _onChange = null;

export function initEntreprisesGestion(onChange) {
    _onChange = onChange;
    document.getElementById('btn-ent-ajouter').addEventListener('click', ajouter);
    document.getElementById('ent-ajout-nom').addEventListener('keydown', e => {
        if (e.key === 'Enter') ajouter();
    });
    document.getElementById('ent-gestion-liste').addEventListener('click', onListeClick);
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
    const trajet = Number.isFinite(+e.trajet_minutes) ? +e.trajet_minutes : 60;
    return `
        <div class="ent-row" data-id="${e.id}" data-nom="${escHtml(e.nom)}">
            <input class="ent-row-input" value="${escHtml(e.nom)}" aria-label="Nom de l'entreprise">
            <span class="ent-row-count">${nb} utilisateur${nb > 1 ? 's' : ''}</span>
            <button class="ent-row-save" data-action="save">Renommer</button>
            <button class="ent-row-del" data-action="del">Supprimer</button>
            <div class="ent-row-regles">
                <label class="ent-row-trajet">Temps de trajet retiré&nbsp;:
                    <input type="number" min="0" step="15" class="ent-row-trajet-input" value="${trajet}" aria-label="Minutes de trajet retirées par jour"> min/jour
                </label>
                <button class="ent-row-save ent-row-save-trajet" data-action="save-trajet">Enregistrer le trajet</button>
            </div>
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
    } else if (action === 'save-trajet') {
        const val = parseInt(row.querySelector('.ent-row-trajet-input').value, 10);
        if (!Number.isFinite(val) || val < 0) { showToast('Minutes de trajet invalides.', 'warn'); return; }
        await agir(async () => {
            await modifierReglesEntreprise(id, { trajet_minutes: val });
            showToast('Temps de trajet enregistré', 'success');
        });
    } else {
        const nb = usageEntreprises().get(ancien) || 0;
        if (nb > 0) { showToast(`Impossible : ${nb} utilisateur(s) encore rattaché(s).`, 'warn'); return; }
        if (!confirm(`Supprimer l'entreprise « ${ancien} » ?`)) return;
        await agir(async () => {
            await supprimerEntreprise(id);
            showToast('Entreprise supprimée', 'success');
        });
    }
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
