import { escHtml } from '../utils/utils.js';

// Frise horaire d'une semaine : une ligne par jour, sur un axe horaire commun.
// Chaque jour va du début à la fin de journée ; interventions et pauses sont
// posées en blocs (position calculée en % de la fenêtre commune de la semaine).

const hhmmToMin = s => {
    if (!s) return null;
    const [h, m] = String(s).split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
};

// Construit la liste des blocs (journée + interventions + pauses) d'une feuille.
// « base » = minute de début de journée : tout horaire inférieur est reporté au
// lendemain (+24h) pour gérer le passage de minuit de façon cohérente.
function joursDetail(f) {
    const dRaw = hhmmToMin(f.heure_debut);
    if (dRaw == null) return null;
    const norm = t => (t == null ? null : (t < dRaw ? t + 1440 : t));

    const label = new Date(f.date + 'T12:00')
        .toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });

    const spanFin = norm(hhmmToMin(f.heure_fin));
    const jour = { start: dRaw, end: spanFin != null && spanFin > dRaw ? spanFin : dRaw + 1 };

    const blocs = [];
    for (const i of (f.interventions || [])) {
        let a, b, type, title;
        if (i.kind === 'intervention') {
            a = norm(hhmmToMin(i.heure_arrivee)); b = norm(hhmmToMin(i.heure_depart));
            type = 'interv';
            const lieu = [i.client, i.ville].filter(Boolean).join(' — ') || 'Intervention';
            title = `${lieu} · ${i.heure_arrivee || '?'}–${i.heure_depart || '?'}`;
        } else if (i.kind === 'pause') {
            a = norm(hhmmToMin(i.pause_debut)); b = norm(hhmmToMin(i.pause_fin));
            type = 'pause'; title = `Pause · ${i.pause_debut || '?'}–${i.pause_fin || '?'}`;
        } else if (i.kind === 'rappel') {
            a = norm(hhmmToMin(i.pause_debut)); b = norm(hhmmToMin(i.pause_fin));
            type = 'rappel'; title = `Rappel · ${i.pause_debut || '?'}–${i.pause_fin || '?'}`;
        } else continue;
        if (a == null || b == null || b <= a) continue;
        blocs.push({ start: a, end: b, type, title });
    }
    return { label, jour, blocs };
}

const pct = (v, min, range) =>
    (Math.min(100, Math.max(0, (v - min) / range * 100))).toFixed(2);

function ligneJour(d, min, range) {
    const bloc = b =>
        `<span class="heures-bloc heures-bloc--${b.type}" title="${escHtml(b.title)}" data-info="${escHtml(b.title)}" ` +
        `style="left:${pct(b.start, min, range)}%;width:${(pct(b.end, min, range) - pct(b.start, min, range)).toFixed(2)}%"></span>`;

    return `
    <div class="heures-jour-ligne">
        <span class="heures-jour-label">${escHtml(d.label)}</span>
        <span class="heures-jour-track">
            <span class="heures-jour-bar" style="left:${pct(d.jour.start, min, range)}%;width:${(pct(d.jour.end, min, range) - pct(d.jour.start, min, range)).toFixed(2)}%"></span>
            ${d.blocs.map(bloc).join('')}
        </span>
    </div>`;
}

// Repères d'heures (toutes les 2h) alignés sur la piste des jours.
function axeHeures(min, max, range) {
    const ticks = [];
    for (let t = Math.ceil(min / 120) * 120; t <= max; t += 120) {
        ticks.push(`<span class="heures-axe-tick" style="left:${pct(t, min, range)}%">${Math.floor(t / 60) % 24}h</span>`);
    }
    return `<div class="heures-axe"><span class="heures-axe-track">${ticks.join('')}</span></div>`;
}

export function timelineSemaine(feuilles) {
    const jours = (feuilles || []).map(joursDetail).filter(Boolean);
    if (!jours.length) return '<p class="heures-timeline-vide">Horaires non renseignés.</p>';

    let min = Infinity, max = -Infinity;
    for (const d of jours) {
        min = Math.min(min, d.jour.start, ...d.blocs.map(b => b.start));
        max = Math.max(max, d.jour.end,   ...d.blocs.map(b => b.end));
    }
    min = Math.floor(min / 60) * 60;   // arrondi à l'heure pleine
    max = Math.ceil(max / 60) * 60;
    const range = Math.max(60, max - min);

    return `<div class="heures-timeline">
        ${axeHeures(min, max, range)}
        ${jours.map(d => ligneJour(d, min, range)).join('')}
    </div>`;
}
