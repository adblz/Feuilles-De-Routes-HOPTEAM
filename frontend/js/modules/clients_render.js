import { escHtml } from '../utils/utils.js';
import { retardJours } from './clients_data.js';

// ── HTML du listing clients (vue technicien) ──

const ICON_TEL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
</svg>`;

const fmtDate = (iso) => iso ? iso.split('-').slice(1).reverse().join('/') : '';

// Un lien « tel: » par numéro (le fichier peut en contenir deux, séparés par « / »).
function renderTelephones(tel) {
    const numeros = String(tel || '').split('/').map(t => t.trim()).filter(Boolean);
    if (!numeros.length) return '';
    return `<div class="client-tels">${numeros.map(n =>
        `<a class="client-tel" href="tel:${escHtml(n.replace(/[^\d+]/g, ''))}">${ICON_TEL}<span>${escHtml(n)}</span></a>`
    ).join('')}</div>`;
}

function badgeDate(retard, dateISO) {
    if (retard === null) return `<span class="client-badge badge-sans-date">Sans date</span>`;
    if (retard > 0)      return `<span class="client-badge badge-retard">Retard ${retard} j</span>`;
    if (retard === 0)    return `<span class="client-badge badge-aujourdhui">Aujourd'hui</span>`;
    return `<span class="client-badge badge-prevu">Prévu le ${fmtDate(dateISO)}</span>`;
}

function renderCarte(row, todayISO) {
    const retard = retardJours(row, todayISO);
    const lieu = [row.ville, row.code_postal].filter(Boolean).join(' ');
    return `
    <div class="client-card${retard > 0 ? ' est-retard' : ''}" data-id="${row.id}">
        <div class="client-head">
            <div class="client-nom">${escHtml(row.nom_pdv || row.code_pdv)}</div>
            ${badgeDate(retard, row.date_prevue)}
        </div>
        <div class="client-ville">${escHtml(lieu)}</div>
        ${row.adresse ? `<div class="client-adresse">${escHtml(row.adresse)}</div>` : ''}
        ${renderTelephones(row.telephone)}
        <div class="client-badges">
            ${row.postes > 1 ? `<span class="client-badge badge-tirage">${row.postes} postes</span>` : ''}
            ${row.tirage ? `<span class="client-badge badge-tirage">${row.tirage} tirage${row.tirage > 1 ? 's' : ''}</span>` : ''}
            ${row.statut ? `<span class="client-badge badge-statut">${escHtml(row.statut)}</span>` : ''}
        </div>
        <button type="button" class="btn-client-valider" data-id="${row.id}">Valider ce client</button>
    </div>`;
}

export function renderClients(rows, todayISO) {
    return rows.map(r => renderCarte(r, todayISO)).join('');
}

export function renderVide(filtre, aucunClient) {
    if (aucunClient) {
        return `<p class="clients-vide">Aucun client à faire pour le moment.<br>
            Si tu attends un planning, demande à ton responsable de l'importer.</p>`;
    }
    const lib = filtre === 'retard' ? 'Aucun client en retard 👍' : 'Aucun client à venir';
    return `<p class="clients-vide">${lib}</p>`;
}

export function renderErreur(msg) {
    return `<p class="clients-vide clients-erreur">Erreur : ${escHtml(msg)}</p>`;
}
