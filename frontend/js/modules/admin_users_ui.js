import { showToast } from '../utils/utils.js';

let _onModifier = null;
let _onCreer    = null;

export function initAdminUI(callbacks) {
    _onModifier = callbacks.onModifier;
    _onCreer    = callbacks.onCreer;

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

export function ouvrirModalCreer() {
    ['form-creer-email', 'form-creer-nom', 'form-creer-password', 'form-creer-email-resp'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('form-creer-role').value   = 'technicien';
    document.getElementById('form-creer-contrat').value = '39';
    document.getElementById('form-creer-company').value = '';
    document.getElementById('form-creer-voit-tout').checked = false;
    toggleVoitTout('form-creer-voit-tout-group', 'technicien');
    document.getElementById('modal-creer').classList.add('open');
}

export function ouvrirModalModifier(profil) {
    if (!profil) return;
    document.getElementById('modifier-id').value            = profil.id;
    document.getElementById('modifier-nom').value           = profil.nom || '';
    document.getElementById('modifier-contrat').value       = profil.contrat || '';
    document.getElementById('modifier-role').value          = profil.role || 'technicien';
    document.getElementById('modifier-email').textContent   = profil.email || '—';
    document.getElementById('modifier-company').value       = profil.company || '';
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
