import { escHtml } from '../utils/utils.js';

export function initiales(texte) {
    if (!texte) return '?';
    const p = texte.trim().split(/[\s.]+/);
    if (p.length === 1) return p[0][0].toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export function joursOuvresMois() {
    const d = new Date();
    const [y, m] = [d.getFullYear(), d.getMonth()];
    let n = 0;
    for (let i = 1; i <= new Date(y, m + 1, 0).getDate(); i++) {
        const dow = new Date(y, m, i).getDay();
        if (dow !== 0 && dow !== 6) n++;
    }
    return n;
}

export function moisCourant() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function grouperParTech(feuilles) {
    const map = new Map();
    feuilles.forEach(f => {
        if (!map.has(f.user_id)) map.set(f.user_id, { nom: f.tech || '—', feuilles: [] });
        map.get(f.user_id).feuilles.push(f);
    });
    return map;
}

function renderFeuilles(feuilles, vues) {
    const parMois = new Map();
    feuilles.forEach(f => {
        const k = f.date?.slice(0, 7) || '0000-00';
        if (!parMois.has(k)) parMois.set(k, []);
        parMois.get(k).push(f);
    });

    return [...parMois.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([mois, items]) => {
            const [y, m] = mois.split('-');
            const label = mois !== '0000-00'
                ? new Date(+y, +m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                : 'Date inconnue';
            const lignes = items.map(f => {
                const dateAff = f.date
                    ? new Date(f.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                    : '—';
                const nbInts = (f.interventions || []).filter(i => i.kind === 'intervention').length;
                const vue = vues.has(f.id);
                return `<div class="resp-feuille-row">
                    <span class="resp-feuille-date">${dateAff}</span>
                    <span class="resp-feuille-heures">${f.heures_travail || '—'}</span>
                    <span class="resp-feuille-ints">${nbInts} int.</span>
                    <button class="btn-voir-pdf-resp${vue ? '' : ' nonvue'}" data-pdf-id="${f.id}">
                        ${vue ? 'Voir PDF' : '● Voir PDF'}
                    </button>
                </div>`;
            }).join('');
            const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
            return `<div class="resp-mois-header">${labelCap}</div>${lignes}`;
        }).join('');
}

export function renderTechs(techMap, vues) {
    const mois = moisCourant();
    const joursOuvres = joursOuvresMois();
    let html = '';
    for (const [uid, { nom, feuilles }] of techMap) {
        const remplisMois = feuilles.filter(f => f.date?.startsWith(mois)).length;
        const ratio = joursOuvres ? remplisMois / joursOuvres : 1;
        const couleur = ratio >= 1 ? 'vert' : ratio >= 0.5 ? 'orange' : 'rouge';
        const nonVues = feuilles.filter(f => !vues.has(f.id)).length;
        const contrat = feuilles[0]?.contrat ? `${feuilles[0].contrat}h` : '';
        html += `<div class="resp-tech-card" data-uid="${uid}">
            <div class="resp-tech-header">
                <span class="resp-avatar">${escHtml(initiales(nom))}</span>
                <div class="resp-tech-info">
                    <span class="resp-tech-nom">${escHtml(nom)}</span>
                    ${contrat ? `<span class="resp-tech-contrat">${contrat}</span>` : ''}
                </div>
                <span class="resp-pastille resp-pastille-${couleur}">${remplisMois}/${joursOuvres} j.</span>
                ${nonVues ? `<span class="resp-badge-nonvue">${nonVues}</span>` : ''}
                <span class="resp-chevron">▼</span>
            </div>
            <div class="resp-tech-body hidden">${renderFeuilles(feuilles, vues)}</div>
        </div>`;
    }
    return html || '<p class="resp-empty">Aucune feuille enregistrée.</p>';
}
