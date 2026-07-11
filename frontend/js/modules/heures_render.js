import { affH } from '../utils/utils.js';

// Échelle fixe pour que les barres des semaines soient comparables entre elles.
const ECHELLE_MIN = 60 * 60;   // 60h = pleine largeur
const BASE_MIN    = 35 * 60;   // base contractuelle

const pct = min => (Math.max(0, min) / ECHELLE_MIN * 100).toFixed(1);

const badge = (cls, txt) => `<span class="heures-badge ${cls}">${txt}</span>`;

const stat = (cls, label, valeur) =>
    `<div class="heures-stat ${cls}"><span class="heures-stat-label">${label}</span>` +
    `<span class="heures-stat-val">${valeur}</span></div>`;

// ── Carte résumé du mois ───────────────────────────────────────
function carteResume(t, periodeLabel) {
    const stats = [
        stat('stat-25', 'Majo. 25%', affH(t.supp25)),
        stat('stat-50', 'Majo. 50%', affH(t.supp50)),
    ];
    if (t.nuit > 0)      stats.push(stat('stat-nuit', 'Nuit', affH(t.nuit)));
    if (t.astreinte > 0) stats.push(stat('stat-astreinte', 'Astreinte', affH(t.astreinte)));

    const range = periodeLabel ? `<span class="heures-periode-range">${periodeLabel}</span>` : '';

    return `
    <div class="heures-carte heures-resume">
        <div class="heures-resume-ligne">
            <div>
                <div class="heures-label">Heures supp. du mois ${range}</div>
                <div class="heures-hero">${affH(t.supp)}</div>
            </div>
            <div class="heures-align-droite">
                <div class="heures-label">Travaillé</div>
                <div class="heures-secondaire">${affH(t.travail)}</div>
            </div>
        </div>
        <div class="heures-stats">${stats.join('')}</div>
    </div>`;
}

const LEGENDE = `
    <div class="heures-legende">
        <span><i class="heures-puce puce-base"></i> Base 35h</span>
        <span><i class="heures-puce puce-25"></i> 25%</span>
        <span><i class="heures-puce puce-50"></i> 50%</span>
    </div>`;

// ── Carte d'une semaine ────────────────────────────────────────
function carteSemaine(s) {
    const partielle = s.totalSuppMin <= 0 ? ' est-partielle' : '';

    const barre = `
        <div class="heures-segment seg-base" style="width:${pct(Math.min(s.totalTravailMin, BASE_MIN))}%"></div>
        <div class="heures-segment seg-25" style="width:${pct(s.supp25)}%"></div>
        <div class="heures-segment seg-50" style="width:${pct(s.supp50)}%"></div>`;

    const pied = s.totalSuppMin > 0
        ? `<span class="heures-fort">+${affH(s.totalSuppMin)} supp.</span>`
        : `<span class="heures-muet">Aucune heure supp.</span>`;

    const badges = [];
    if (s.supp25 > 0)           badges.push(badge('badge-25', `25% · ${affH(s.supp25)}`));
    if (s.supp50 > 0)           badges.push(badge('badge-50', `50% · ${affH(s.supp50)}`));
    if (s.totalNuitMin > 0)     badges.push(badge('badge-nuit', `Nuit · ${affH(s.totalNuitMin)}`));
    if (s.totalAstreinteMin > 0) badges.push(badge('badge-astreinte', `Astreinte · ${affH(s.totalAstreinteMin)}`));
    const badgesHtml = badges.length ? `<div class="heures-badges">${badges.join('')}</div>` : '';

    return `
    <div class="heures-carte heures-semaine-carte${partielle}">
        <div class="heures-semaine-entete">
            <span class="heures-semaine-label">${s.label}</span>
            <span class="heures-semaine-jours">${s.nbJours} jour${s.nbJours > 1 ? 's' : ''}</span>
        </div>
        <div class="heures-barre">${barre}</div>
        <div class="heures-semaine-pied">
            <span>${affH(s.totalTravailMin)} travaillées</span>
            ${pied}
        </div>
        ${badgesHtml}
    </div>`;
}

// ── Point d'entrée ─────────────────────────────────────────────
export function renderHeures(semaines, totaux, periodeLabel) {
    if (!semaines.length) {
        return '<p class="heures-vide">Aucune feuille sur cette période.</p>';
    }
    return carteResume(totaux, periodeLabel) + LEGENDE + semaines.map(carteSemaine).join('');
}
