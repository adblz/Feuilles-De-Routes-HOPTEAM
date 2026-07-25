import { ICON_MODIFIER, ICON_SUPPRIMER } from '../utils/utils.js';
import { setKpi } from './admin_kpis.js';

let _profilMap   = {};
let _onModifier  = null;
let _onSupprimer = null;
let _tousProfils = [];
let _filtreTexte = '';
let _filtreEntreprise = '';
let _triColonne  = '';
let _triSens     = 1;

const RANG_ROLE = { admin: 0, responsable: 1, technicien: 2 };

function normaliser(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Attache le tri au clic sur les en-têtes marqués data-tri (une seule fois).
export function initTri() {
    document.querySelectorAll('#view-users th[data-tri]').forEach(th => {
        th.classList.add('th-triable');
        th.addEventListener('click', () => {
            const col = th.dataset.tri;
            if (_triColonne === col) _triSens = -_triSens;
            else { _triColonne = col; _triSens = 1; }
            afficher();
        });
    });
}

function valeurTri(p) {
    if (_triColonne === 'company')  return normaliser(p.company) || '￿';
    if (_triColonne === 'role')     return RANG_ROLE[p.role] ?? 9;
    if (_triColonne === 'contrat')  return p.contrat ? parseInt(p.contrat, 10) : 999;
    return 0;
}

function majIndicateursTri() {
    document.querySelectorAll('#view-users th[data-tri]').forEach(th => {
        th.classList.toggle('tri-asc',  _triColonne === th.dataset.tri && _triSens === 1);
        th.classList.toggle('tri-desc', _triColonne === th.dataset.tri && _triSens === -1);
    });
}

export function filtrerTableau({ texte, entreprise }) {
    if (texte !== undefined) _filtreTexte = texte;
    if (entreprise !== undefined) _filtreEntreprise = entreprise;
    afficher();
}

// Nombre d'utilisateurs rattachés à chaque entreprise (pour bloquer une suppression).
export function usageEntreprises() {
    const map = new Map();
    _tousProfils.forEach(p => {
        if (p.company) map.set(p.company, (map.get(p.company) || 0) + 1);
    });
    return map;
}

export function renderTableau(profils, callbacks) {
    _onModifier  = callbacks.onModifier;
    _onSupprimer = callbacks.onSupprimer;
    _tousProfils = profils;
    setKpi('kpi-utilisateurs', profils.length);
    remplirFiltreEntreprises(profils);
    afficher();
}

function remplirFiltreEntreprises(profils) {
    const select = document.getElementById('admin-users-filtre-entreprise');
    if (!select) return;
    const actuel = select.value;
    const entreprises = [...new Set(profils.map(p => p.company).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="">Toutes les entreprises</option>' +
        entreprises.map(e => `<option value="${escHtml(e)}">${escHtml(e)}</option>`).join('');
    select.value = actuel;
}

function afficher() {
    const filtre = normaliser(_filtreTexte);
    const profilsAffiches = _tousProfils.filter(p => {
        const matchTexte = !filtre || normaliser(p.nom).includes(filtre) || normaliser(p.email).includes(filtre);
        const matchEntreprise = !_filtreEntreprise || (p.company || '') === _filtreEntreprise;
        return matchTexte && matchEntreprise;
    });

    if (_triColonne) {
        profilsAffiches.sort((a, b) => {
            const va = valeurTri(a), vb = valeurTri(b);
            return va < vb ? -_triSens : va > vb ? _triSens : 0;
        });
    }
    majIndicateursTri();
    _profilMap = Object.fromEntries(profilsAffiches.map(p => [p.id, p]));

    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    if (!profilsAffiches.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="admin-table-vide">Aucun utilisateur trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = profilsAffiches.map(ligneUtilisateur).join('');

    tbody.querySelectorAll('.btn-admin-modifier').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            _onModifier(_profilMap[btn.dataset.id]);
        });
    });
    tbody.querySelectorAll('.btn-admin-supprimer').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            if (_onSupprimer) _onSupprimer(btn.dataset.id, btn.dataset.nom);
        });
    });
}

function ligneUtilisateur(p) {
    return `
        <tr>
            <td>
                <div class="cell-user-nom">${escHtml(p.nom || '—')}</div>
                <div class="cell-user-email">${escHtml(p.email || '—')}</div>
            </td>
            <td>${p.company ? `<span class="entreprise-badge">${escHtml(p.company)}</span>` : '<span class="cell-muted">—</span>'}</td>
            <td><span class="role-badge role-${p.role}"${p.voit_toutes_entreprises ? ' title="Voit les feuilles de toutes les entreprises"' : ''}>${labelRole(p.role)}${p.voit_toutes_entreprises ? ' ★' : ''}</span></td>
            <td>${p.contrat ? escHtml(p.contrat) + 'h' : '<span class="cell-muted">—</span>'}</td>
            <td class="col-actions">
                <button class="btn-admin-modifier" data-id="${p.id}" title="Modifier" aria-label="Modifier ${escHtml(p.nom || '')}">${ICON_MODIFIER}</button>
                <button class="btn-admin-supprimer" data-id="${p.id}" data-nom="${escHtml(p.nom || '')}" title="Supprimer" aria-label="Supprimer ${escHtml(p.nom || '')}">${ICON_SUPPRIMER}</button>
            </td>
        </tr>`;
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function labelRole(role) {
    return { admin: 'Admin', responsable: 'Responsable', technicien: 'Technicien' }[role] || role;
}
