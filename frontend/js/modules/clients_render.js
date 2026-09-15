import { escHtml } from '../utils/utils.js';
import { retardJours } from './clients_data.js';

// ── HTML du listing clients (vue technicien) ──
// Carte volontairement compacte (3 lignes) : nom + retard, infos, actions.

const SVG = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON_TEL   = SVG('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>');
const ICON_LOUPE = SVG('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>');
const ICON_PIN   = SVG('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>');
const ICON_NAV   = SVG('<polygon points="3 11 22 2 13 21 11 13 3 11"/>');

const fmtDate = (iso) => iso ? iso.split('-').slice(1).reverse().join('/') : '';

// Petit bouton rond : icône + libellé sous l'icône.
function action(href, icone, libelle, title = libelle) {
    return `<a class="client-action" href="${href}" target="_blank" rel="noopener" title="${escHtml(title)}" aria-label="${escHtml(title)}">${icone}<span>${escHtml(libelle)}</span></a>`;
}

// Un bouton d'appel par numéro (le fichier peut en contenir deux, séparés par « / »).
function renderAppels(tel) {
    const numeros = String(tel || '').split('/').map(t => t.trim()).filter(Boolean);
    return numeros.map((n, i) =>
        `<a class="client-action client-action-tel" href="tel:${escHtml(n.replace(/[^\d+]/g, ''))}" title="Appeler ${escHtml(n)}" aria-label="Appeler ${escHtml(n)}">${ICON_TEL}<span>${numeros.length > 1 ? `Appel ${i + 1}` : 'Appeler'}</span></a>`
    ).join('');
}

// Google / Waze / Maps reçoivent « nom du commerce + ville » plutôt que
// l'adresse du fichier (souvent fausse) : ils retrouvent eux-mêmes
// l'établissement dans leur base, à jour.
function renderLiensExternes(row) {
    const requete = encodeURIComponent([row.nom_pdv, row.ville].filter(Boolean).join(' '));
    if (!requete) return '';
    return action(`https://www.google.com/search?q=${requete}`, ICON_LOUPE, 'Google', 'Chercher sur Google')
         + action(`https://waze.com/ul?q=${requete}&navigate=yes`, ICON_NAV, 'Waze', 'Y aller avec Waze')
         + action(`https://www.google.com/maps/search/?api=1&query=${requete}`, ICON_PIN, 'Maps', 'Voir sur Google Maps');
}

function badgeDate(retard, dateISO) {
    if (retard === null) return `<span class="client-badge badge-sans-date">Sans date</span>`;
    if (retard > 0)      return `<span class="client-badge badge-retard">Retard ${retard} j</span>`;
    if (retard === 0)    return `<span class="client-badge badge-aujourdhui">Aujourd'hui</span>`;
    return `<span class="client-badge badge-prevu">Prévu le ${fmtDate(dateISO)}</span>`;
}

function renderCarte(row, todayISO) {
    const retard = retardJours(row, todayISO);
    const infos = [
        row.ville,
        row.postes > 1 ? `${row.postes} postes` : '',
        row.tirage ? `${row.tirage} tirage${row.tirage > 1 ? 's' : ''}` : '',
        row.statut,
    ].filter(Boolean).map(escHtml).join(' · ');
    return `
    <div class="client-card${retard > 0 ? ' est-retard' : ''}" data-id="${row.id}">
        <div class="client-head">
            <div class="client-nom">${escHtml(row.nom_pdv || row.code_pdv)}</div>
            ${badgeDate(retard, row.date_prevue)}
        </div>
        <div class="client-infos">${infos}</div>
        <div class="client-actions">
            ${renderAppels(row.telephone)}
            ${renderLiensExternes(row)}
            <button type="button" class="btn-client-valider" data-id="${row.id}">Valider</button>
        </div>
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
