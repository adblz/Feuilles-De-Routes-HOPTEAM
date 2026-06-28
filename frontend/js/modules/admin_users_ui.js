let _onModifier = null;
let _onCreer    = null;
let _profilMap  = {};

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
}

function fermerModal(id) {
    document.getElementById(id).classList.remove('open');
}

export function renderTableau(profils) {
    _profilMap = Object.fromEntries(profils.map(p => [p.id, p]));
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    if (!profils.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="admin-table-vide">Aucun utilisateur trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = profils.map(p => `
        <tr>
            <td>${escHtml(p.nom || '—')}</td>
            <td>${escHtml(p.email || '—')}</td>
            <td><span class="role-badge role-${p.role}">${labelRole(p.role)}</span></td>
            <td>${escHtml(p.contrat || '—')}h</td>
            <td><button class="btn-admin-modifier" data-id="${p.id}">Modifier</button></td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.btn-admin-modifier').forEach(btn => {
        btn.addEventListener('click', () => ouvrirModalModifier(_profilMap[btn.dataset.id]));
    });
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function labelRole(role) {
    return { admin: 'Admin', responsable: 'Responsable', technicien: 'Technicien' }[role] || role;
}

export function ouvrirModalCreer() {
    ['form-creer-email', 'form-creer-nom', 'form-creer-password', 'form-creer-company', 'form-creer-email-resp'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('form-creer-contrat').value = '39';
    document.getElementById('modal-creer').classList.add('open');
}

function ouvrirModalModifier(profil) {
    if (!profil) return;
    document.getElementById('modifier-id').value            = profil.id;
    document.getElementById('modifier-nom').value           = profil.nom || '';
    document.getElementById('modifier-contrat').value       = profil.contrat || '39';
    document.getElementById('modifier-role').value          = profil.role || 'technicien';
    document.getElementById('modifier-email').textContent   = profil.email || '—';
    document.getElementById('modifier-company').value       = profil.company || '';
    document.getElementById('modifier-email-resp').value    = profil.email_responsable || '';
    document.getElementById('modal-modifier').classList.add('open');
}

async function soumettreCreer() {
    const email     = document.getElementById('form-creer-email').value.trim();
    const nom       = document.getElementById('form-creer-nom').value.trim();
    const contrat   = document.getElementById('form-creer-contrat').value;
    const password  = document.getElementById('form-creer-password').value;
    const company   = document.getElementById('form-creer-company').value.trim();
    const emailResp = document.getElementById('form-creer-email-resp').value.trim();

    if (!email || !nom || !password) {
        alert('Veuillez remplir tous les champs obligatoires (*)');
        return;
    }
    fermerModal('modal-creer');
    if (_onCreer) await _onCreer(email, nom, contrat, password, company, emailResp);
}

async function soumettreModifier() {
    const id               = document.getElementById('modifier-id').value;
    const nom              = document.getElementById('modifier-nom').value.trim();
    const contrat          = document.getElementById('modifier-contrat').value;
    const role             = document.getElementById('modifier-role').value;
    const company          = document.getElementById('modifier-company').value.trim();
    const email_responsable = document.getElementById('modifier-email-resp').value.trim();

    if (!nom) { alert('Le nom est obligatoire'); return; }
    fermerModal('modal-modifier');
    if (_onModifier) await _onModifier(id, { nom, contrat, role, company, email_responsable });
}
