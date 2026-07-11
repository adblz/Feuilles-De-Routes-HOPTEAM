import { MOIS_FR } from './periodes_paie.js';
import { showToast } from '../utils/utils.js';

let _onCreer     = null;
let _onModifier  = null;
let _onSupprimer = null;
let _periodeMap  = {};

export function initPlanningUI(callbacks) {
    _onCreer     = callbacks.onCreer;
    _onModifier  = callbacks.onModifier;
    _onSupprimer = callbacks.onSupprimer;

    document.getElementById('btn-close-planning').addEventListener('click', () => fermerModal());
    document.getElementById('btn-annuler-planning').addEventListener('click', () => fermerModal());
    document.getElementById('btn-submit-planning').addEventListener('click', soumettre);
    document.getElementById('modal-planning').addEventListener('click', e => {
        if (e.target === e.currentTarget) fermerModal();
    });
}

function fermerModal() {
    document.getElementById('modal-planning').classList.remove('open');
}

function fmtDate(iso) {
    const [aa, mm, jj] = iso.split('-');
    return `${jj}/${mm}/${aa}`;
}

export function renderTableauPlanning(periodes) {
    _periodeMap = Object.fromEntries(periodes.map(p => [p.id, p]));
    const tbody = document.getElementById('admin-planning-tbody');
    if (!tbody) return;

    if (!periodes.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="admin-table-vide">Aucune période enregistrée</td></tr>';
        return;
    }

    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    tbody.innerHTML = periodes.map(p => `
        <tr>
            <td>${cap(MOIS_FR[p.mois - 1] || '—')} ${p.annee}</td>
            <td>${fmtDate(p.date_debut)}</td>
            <td>${fmtDate(p.date_fin)}</td>
            <td>
                <button class="btn-admin-modifier" data-id="${p.id}">Modifier</button>
                <button class="btn-admin-supprimer" data-id="${p.id}">Supprimer</button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.btn-admin-modifier').forEach(btn => {
        btn.addEventListener('click', () => ouvrirModalModifier(_periodeMap[btn.dataset.id]));
    });
    tbody.querySelectorAll('.btn-admin-supprimer').forEach(btn => {
        btn.addEventListener('click', () => supprimer(_periodeMap[btn.dataset.id]));
    });
}

export function ouvrirModalCreer() {
    document.getElementById('planning-id').value         = '';
    document.getElementById('planning-mois').value       = '';
    document.getElementById('planning-date-debut').value = '';
    document.getElementById('planning-date-fin').value   = '';
    document.getElementById('planning-modal-titre').textContent = 'Ajouter une période';
    document.getElementById('modal-planning').classList.add('open');
}

function ouvrirModalModifier(p) {
    if (!p) return;
    document.getElementById('planning-id').value         = p.id;
    document.getElementById('planning-mois').value       = p.mois;
    document.getElementById('planning-date-debut').value = p.date_debut;
    document.getElementById('planning-date-fin').value   = p.date_fin;
    document.getElementById('planning-modal-titre').textContent = 'Modifier la période';
    document.getElementById('modal-planning').classList.add('open');
}

async function soumettre() {
    const id         = document.getElementById('planning-id').value;
    const mois       = parseInt(document.getElementById('planning-mois').value, 10);
    const date_debut = document.getElementById('planning-date-debut').value;
    const date_fin   = document.getElementById('planning-date-fin').value;

    if (!mois || !date_debut || !date_fin) {
        showToast('Veuillez remplir le mois et les deux dates.', 'warn');
        return;
    }
    if (date_fin < date_debut) {
        showToast('La date de fin doit être après la date de début.', 'warn');
        return;
    }

    // L'année est déduite de la date de fin (mois de paie nommé par sa fin de période).
    const annee = parseInt(date_fin.slice(0, 4), 10);
    const data  = { annee, mois, date_debut, date_fin };

    fermerModal();
    if (id) { if (_onModifier) await _onModifier(id, data); }
    else    { if (_onCreer)    await _onCreer(data); }
}

async function supprimer(p) {
    if (!p || !confirm('Supprimer cette période du planning ?')) return;
    if (_onSupprimer) await _onSupprimer(p.id);
}
