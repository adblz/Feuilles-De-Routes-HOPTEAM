import { affH, affHSigne } from '../utils/utils.js';
import { timelineSemaine } from './heures_timeline.js';
import { palier25Pour } from './seuil_jour.js';

// Échelle fixe pour que les barres des semaines soient comparables entre elles.
const ECHELLE_MIN = 60 * 60;   // 60h = pleine largeur

const pct = min => (Math.max(0, min) / ECHELLE_MIN * 100).toFixed(1);

const badge = (cls, txt) => `<span class="heures-badge ${cls}">${txt}</span>`;

const stat = (cls, label, valeur) =>
    `<div class="heures-stat ${cls}"><span class="heures-stat-label">${label}</span>` +
    `<span class="heures-stat-val">${valeur}</span></div>`;

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

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

// Légende : la base est celle du contrat (35h, 37h ou 39h), la part à 25 %
// est ce qu'il reste des 8h légales une fois le contrat déduit (39h → 4h).
function legende(contrat) {
    return `
    <div class="heures-legende">
        <span><i class="heures-puce puce-base"></i> Contrat ${contrat}h</span>
        <span><i class="heures-puce puce-25"></i> 25% (${affH(palier25Pour(contrat))} max)</span>
        <span><i class="heures-puce puce-50"></i> 50%</span>
    </div>`;
}

// ── Carte d'une semaine ────────────────────────────────────────
function carteSemaine(s) {
    const partielle = s.totalSuppMin <= 0 ? ' est-partielle' : '';

    const barre = `
        <div class="heures-segment seg-base" style="width:${pct(Math.min(s.totalTravailMin, s.seuilMin))}%"></div>
        <div class="heures-segment seg-25" style="width:${pct(s.supp25)}%"></div>
        <div class="heures-segment seg-50" style="width:${pct(s.supp50)}%"></div>`;

    const pied = s.totalSuppMin > 0
        ? `<span class="heures-fort">+${affH(s.totalSuppMin)} supp.</span>`
        : s.netMin < 0
            ? `<span class="heures-muet">${affHSigne(s.netMin)} sous le seuil</span>`
            : `<span class="heures-muet">Aucune heure supp.</span>`;

    const badges = [];
    if (s.nbFeries > 0)          badges.push(badge('badge-ferie', `Seuil ${affH(s.seuilMin)} — ${pluriel(s.nbFeries, 'jour')} férié${s.nbFeries > 1 ? 's' : ''}`));
    if (s.nbConges > 0)          badges.push(badge('badge-conge', `${pluriel(s.nbConges, 'jour')} de congé`));
    if (s.nbManquants > 0)       badges.push(badge('badge-manquant', `${pluriel(s.nbManquants, 'jour')} sans feuille`));
    if (s.supp25 > 0)            badges.push(badge('badge-25', `25% · ${affH(s.supp25)}`));
    if (s.supp50 > 0)            badges.push(badge('badge-50', `50% · ${affH(s.supp50)}`));
    if (s.totalNuitMin > 0)      badges.push(badge('badge-nuit', `Nuit · ${affH(s.totalNuitMin)}`));
    if (s.totalAstreinteMin > 0) badges.push(badge('badge-astreinte', `Astreinte · ${affH(s.totalAstreinteMin)}`));
    const badgesHtml = badges.length ? `<div class="heures-badges">${badges.join('')}</div>` : '';

    return `
    <details name="heures-semaine" class="heures-carte heures-semaine-carte${partielle}">
        <summary class="heures-semaine-resume">
            <div class="heures-semaine-entete">
                <span class="heures-semaine-label">${s.labelCourt}</span>
                <span class="heures-semaine-jours">${pluriel(s.nbJours, 'jour')}</span>
            </div>
            <div class="heures-barre">${barre}</div>
            <div class="heures-semaine-pied">
                <span>${affH(s.totalTravailMin)} travaillées · seuil ${affH(s.seuilMin)}</span>
                ${pied}
            </div>
            ${badgesHtml}
        </summary>
        <div class="heures-detail">${timelineSemaine(s.feuilles)}</div>
    </details>`;
}

// ── Point d'entrée ─────────────────────────────────────────────
export function renderHeures(semaines, totaux, periodeLabel) {
    if (!semaines.length) {
        return '<p class="heures-vide">Aucune feuille sur cette période.</p>';
    }
    return carteResume(totaux, periodeLabel) + legende(totaux.contrat) + semaines.map(carteSemaine).join('');
}
