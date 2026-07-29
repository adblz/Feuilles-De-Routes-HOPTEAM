import { escHtml, hhmm } from '../utils/utils.js';

// Frise horaire d'une seule journée : une piste unique sur laquelle on pose les
// interventions, les pauses et les sorties supplémentaires. Même principe que la
// frise de la semaine (heures_timeline.js), mais sur un seul jour et fond clair.
// On réutilise volontairement les classes « heures-* » pour profiter de la même
// infobulle au clic ; les couleurs sont ajustées en CSS via « resume-frise ».

const hhmmToMin = s => {
    if (!s) return null;
    const [h, m] = String(s).split(':').map(Number);
    return (Number.isNaN(h) || Number.isNaN(m)) ? null : h * 60 + m;
};

const debutBrut = el => hhmmToMin(el.kind === 'intervention' ? el.heure_arrivee : el.pause_debut);
const finBrut   = el => hhmmToMin(el.kind === 'intervention' ? el.heure_depart  : el.pause_fin);

const TYPE = { intervention: 'interv', pause: 'pause', rappel: 'rappel' };

// Range les éléments dans l'ordre réel de la journée. Un horaire antérieur au
// début de journée est compté comme le lendemain (nuit à cheval sur minuit).
export function trierChronologique(elements, heureDebutJournee) {
    const base = hhmmToMin(heureDebutJournee) ?? 0;
    return (elements || [])
        .map((el, i) => {
            const d = debutBrut(el);
            return { el, i, cle: d == null ? Infinity : (d < base ? d + 1440 : d) };
        })
        .sort((a, b) => (a.cle === b.cle ? a.i - b.i : a.cle - b.cle))
        .map(x => x.el);
}

function texteInfo(el) {
    const dep = el.kind === 'intervention' ? el.heure_arrivee : el.pause_debut;
    const fin = el.kind === 'intervention' ? el.heure_depart  : el.pause_fin;
    const h   = `${hhmm(dep) || '?'}–${hhmm(fin) || '?'}`;
    if (el.kind === 'pause')  return `Pause · ${h}`;
    if (el.kind === 'rappel') return `Sortie suppl. · ${h}`;
    return `${[el.client, el.ville].filter(Boolean).join(' — ') || 'Intervention'} · ${h}`;
}

const pct = (v, min, range) =>
    Math.min(100, Math.max(0, (v - min) / range * 100));

const style = (a, b, min, range) =>
    `left:${pct(a, min, range).toFixed(2)}%;width:${(pct(b, min, range) - pct(a, min, range)).toFixed(2)}%`;

// Repères d'heures : toutes les heures sur une courte journée, sinon toutes les 2h.
function axeHeures(min, max, range) {
    const pas = range <= 8 * 60 ? 60 : 120;
    const ticks = [];
    for (let t = Math.ceil(min / pas) * pas; t <= max; t += pas) {
        ticks.push(`<span class="heures-axe-tick" style="left:${pct(t, min, range).toFixed(2)}%">${Math.floor(t / 60) % 24}h</span>`);
    }
    return `<div class="heures-axe"><span class="heures-axe-track">${ticks.join('')}</span></div>`;
}

function legende(blocs) {
    const items = [
        blocs.some(b => b.type === 'interv') ? '<span><i class="heures-puce puce-interv"></i> Intervention</span>' : '',
        blocs.some(b => b.type === 'pause')  ? '<span><i class="heures-puce puce-pause"></i> Pause</span>'         : '',
        blocs.some(b => b.type === 'rappel') ? '<span><i class="heures-puce puce-rappel"></i> Sortie suppl.</span>' : '',
    ].filter(Boolean);
    return items.length ? `<div class="resume-frise-legende">${items.join('')}</div>` : '';
}

export function timelineJour(feuille, elements) {
    const base = hhmmToMin(feuille.heure_debut);
    const norm = t => (t == null ? null : (base != null && t < base ? t + 1440 : t));

    const blocs = [];
    for (const el of elements || []) {
        if (!TYPE[el.kind]) continue;
        const a = norm(debutBrut(el)), b = norm(finBrut(el));
        if (a == null || b == null || b <= a) continue;
        blocs.push({ start: a, end: b, type: TYPE[el.kind], info: texteInfo(el) });
    }

    const finJour = norm(hhmmToMin(feuille.heure_fin));
    const jour = base == null ? null
        : { start: base, end: finJour != null && finJour > base ? finJour : base + 1 };

    let min = Infinity, max = -Infinity;
    for (const b of jour ? [jour, ...blocs] : blocs) {
        min = Math.min(min, b.start);
        max = Math.max(max, b.end);
    }
    if (!Number.isFinite(min)) return '';

    min = Math.floor(min / 60) * 60;   // arrondi à l'heure pleine
    max = Math.ceil(max / 60) * 60;
    const range = Math.max(60, max - min);

    const barre = jour
        ? `<span class="heures-jour-bar" style="${style(jour.start, jour.end, min, range)}"></span>` : '';

    const blocsHtml = blocs.map(b =>
        `<span class="heures-bloc heures-bloc--${b.type}" title="${escHtml(b.info)}" ` +
        `data-info="${escHtml(b.info)}" style="${style(b.start, b.end, min, range)}"></span>`).join('');

    return `
        <div class="card">
            <h3 class="resume-section-title">Frise de la journée</h3>
            <div class="heures-timeline resume-frise">
                ${axeHeures(min, max, range)}
                <div class="heures-jour-ligne">
                    <span class="heures-jour-track">${barre}${blocsHtml}</span>
                </div>
            </div>
            ${legende(blocs)}
            <p class="resume-frise-aide">Touchez un bloc pour voir le détail.</p>
        </div>`;
}
