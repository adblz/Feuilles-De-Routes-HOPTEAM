import { ICON_MODIFIER, ICON_SUPPRIMER } from '../utils/utils.js';

let _profilMap   = {};
let _onModifier  = null;
let _onSupprimer = null;
const _entreprisesFermees = new Set();

export function renderTableau(profils, callbacks) {
    _onModifier  = callbacks.onModifier;
    _onSupprimer = callbacks.onSupprimer;
    _profilMap   = Object.fromEntries(profils.map(p => [p.id, p]));

    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    if (!profils.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="admin-table-vide">Aucun utilisateur trouvé</td></tr>';
        return;
    }

    const groupes = new Map();
    profils.forEach(p => {
        const cle = p.company || 'Aucune';
        if (!groupes.has(cle)) groupes.set(cle, []);
        groupes.get(cle).push(p);
    });
    const cles = [...groupes.keys()].sort((a, b) => {
        if (a === 'Aucune') return -1;
        if (b === 'Aucune') return 1;
        return a.localeCompare(b);
    });

    tbody.innerHTML = cles.map(cle => {
        const membres   = groupes.get(cle);
        const estAucune = cle === 'Aucune';
        const fermee    = !estAucune && _entreprisesFermees.has(cle);
        const entete    = estAucune ? '' : `
            <tr class="admin-groupe-header" data-company="${escHtml(cle)}">
                <td colspan="6"><span class="admin-groupe-fleche">${fermee ? '▸' : '▾'}</span> ${escHtml(cle)} <span class="admin-groupe-count">(${membres.length})</span></td>
            </tr>`;
        return entete + (fermee ? '' : membres.map(ligneUtilisateur).join(''));
    }).join('');

    tbody.querySelectorAll('.admin-groupe-header').forEach(tr => {
        tr.addEventListener('click', () => {
            const cle = tr.dataset.company;
            if (_entreprisesFermees.has(cle)) _entreprisesFermees.delete(cle);
            else _entreprisesFermees.add(cle);
            renderTableau(profils, { onModifier: _onModifier, onSupprimer: _onSupprimer });
        });
    });
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
            <td>${escHtml(p.nom || '—')}</td>
            <td>${escHtml(p.email || '—')}</td>
            <td><span class="role-badge role-${p.role}"${p.voit_toutes_entreprises ? ' title="Voit les feuilles de toutes les entreprises"' : ''}>${labelRole(p.role)}${p.voit_toutes_entreprises ? ' ★' : ''}</span></td>
            <td>${p.contrat ? escHtml(p.contrat) + 'h' : '—'}</td>
            <td>${escHtml(p.company || '—')}</td>
            <td>
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
