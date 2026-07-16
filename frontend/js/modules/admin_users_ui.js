import { showToast } from '../utils/utils.js';

const ICON_MODIFIER =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">' +
    '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const ICON_SUPPRIMER =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">' +
    '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
    '<line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

let _onModifier  = null;
let _onCreer     = null;
let _onSupprimer = null;
let _profilMap   = {};

export function initAdminUI(callbacks) {
    _onModifier  = callbacks.onModifier;
    _onCreer     = callbacks.onCreer;
    _onSupprimer = callbacks.onSupprimer;

    document.getElementById('btn-close-creer').addEventListener('click', () => fermerModal('modal-creer'));
    document.getElementById('btn-annuler-creer').addEventListener('click', () => fermerModal('modal-creer'));
    document.getElementById('btn-close-modifier').addEventListener('click', () => fermerModal('modal-modifier'));
    document.getElementById('btn-annuler-modifier').addEventListener('click', () => fermerModal('modal-modifier'));
    document.getElementById('btn-submit-creer').addEventListener('click', soumettreCreer);
    document.getElementById('btn-submit-modifier').addEventListener('click', soumettreModifier);

    document.getElementById('modal-creer').addEventListener('click', e => {
        if (e.target === e.currentTarget) fermerModal('modal-creer');
    });
    document.getElementById('modal-modifier').addEventListener('click', e => {
        if (e.target === e.currentTarget) fermerModal('modal-modifier');
    });

    document.getElementById('form-creer-role').addEventListener('change', e => {
        toggleVoitTout('form-creer-voit-tout-group', e.target.value);
    });
    document.getElementById('modifier-role').addEventListener('change', e => {
        toggleVoitTout('modifier-voit-tout-group', e.target.value);
    });
}

function toggleVoitTout(groupId, role) {
    document.getElementById(groupId).classList.toggle('hidden', role !== 'responsable');
}

function fermerModal(id) {
    document.getElementById(id).classList.remove('open');
}

export function renderTableau(profils) {
    _profilMap = Object.fromEntries(profils.map(p => [p.id, p]));
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    if (!profils.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="admin-table-vide">Aucun utilisateur trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = profils.map(p => `
        <tr>
            <td>${escHtml(p.nom || '—')}</td>
            <td>${escHtml(p.email || '—')}</td>
            <td><span class="role-badge role-${p.role}"${p.voit_toutes_entreprises ? ' title="Voit les feuilles de toutes les entreprises"' : ''}>${labelRole(p.role)}${p.voit_toutes_entreprises ? ' ★' : ''}</span></td>
            <td>${p.contrat ? escHtml(p.contrat) + 'h' : '—'}</td>
            <td>${escHtml(p.company || '—')}</td>
            <td>
                <button class="btn-admin-modifier" data-id="${p.id}" title="Modifier" aria-label="Modifier ${escHtml(p.nom || '')}">${ICON_MODIFIER}</button>
                <button class="btn-admin-supprimer" data-id="${p.id}" data-nom="${escHtml(p.nom || '')}" title="Supprimer" aria-label="Supprimer ${escHtml(p.nom || '')}">${ICON_SUPPRIMER}</button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.btn-admin-modifier').forEach(btn => {
        btn.addEventListener('click', () => ouvrirModalModifier(_profilMap[btn.dataset.id]));
    });
    tbody.querySelectorAll('.btn-admin-supprimer').forEach(btn => {
        btn.addEventListener('click', () => {
            if (_onSupprimer) _onSupprimer(btn.dataset.id, btn.dataset.nom);
        });
    });
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function labelRole(role) {
    return { admin: 'Admin', responsable: 'Responsable', technicien: 'Technicien' }[role] || role;
}

export function ouvrirModalCreer() {
    ['form-creer-email', 'form-creer-nom', 'form-creer-password', 'form-creer-email-resp'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('form-creer-role').value   = 'technicien';
    document.getElementById('form-creer-contrat').value = '39';
    document.getElementById('form-creer-company').value = 'HopTeam';
    document.getElementById('form-creer-voit-tout').checked = false;
    toggleVoitTout('form-creer-voit-tout-group', 'technicien');
    document.getElementById('modal-creer').classList.add('open');
}

function ouvrirModalModifier(profil) {
    if (!profil) return;
    document.getElementById('modifier-id').value            = profil.id;
    document.getElementById('modifier-nom').value           = profil.nom || '';
    document.getElementById('modifier-contrat').value       = profil.contrat || '';
    document.getElementById('modifier-role').value          = profil.role || 'technicien';
    document.getElementById('modifier-email').textContent   = profil.email || '—';
    document.getElementById('modifier-company').value       = profil.company || 'HopTeam';
    document.getElementById('modifier-email-resp').value    = profil.email_responsable || '';
    document.getElementById('modifier-voit-tout').checked   = !!profil.voit_toutes_entreprises;
    toggleVoitTout('modifier-voit-tout-group', profil.role || 'technicien');
    document.getElementById('modal-modifier').classList.add('open');
}

async function soumettreCreer() {
    const email      = document.getElementById('form-creer-email').value.trim();
    const nom        = document.getElementById('form-creer-nom').value.trim();
    const role       = document.getElementById('form-creer-role').value;
    const contrat    = document.getElementById('form-creer-contrat').value;
    const password   = document.getElementById('form-creer-password').value;
    const company    = document.getElementById('form-creer-company').value.trim();
    const emailResp  = document.getElementById('form-creer-email-resp').value.trim();
    const voitTout   = role === 'responsable' && document.getElementById('form-creer-voit-tout').checked;

    if (!email || !nom || !password) {
        showToast('Veuillez remplir tous les champs obligatoires (*).', 'warn');
        return;
    }
    fermerModal('modal-creer');
    if (_onCreer) await _onCreer(email, nom, role, contrat, password, company, emailResp, voitTout);
}

async function soumettreModifier() {
    const id                       = document.getElementById('modifier-id').value;
    const nom                      = document.getElementById('modifier-nom').value.trim();
    const contrat                  = document.getElementById('modifier-contrat').value;
    const role                     = document.getElementById('modifier-role').value;
    const company                  = document.getElementById('modifier-company').value.trim();
    const email_responsable        = document.getElementById('modifier-email-resp').value.trim();
    const voit_toutes_entreprises  = role === 'responsable' && document.getElementById('modifier-voit-tout').checked;

    if (!nom) { showToast('Le nom est obligatoire.', 'warn'); return; }
    fermerModal('modal-modifier');
    if (_onModifier) await _onModifier(id, { nom, contrat: contrat || null, role, company, email_responsable, voit_toutes_entreprises });
}
