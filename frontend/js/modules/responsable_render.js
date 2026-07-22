import { escHtml } from '../utils/utils.js';
import { renderFeuilles } from './responsable_feuilles.js';

export function initiales(texte) {
    if (!texte) return '?';
    const p = texte.trim().split(/[\s.]+/);
    if (p.length === 1) return p[0][0].toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// Nombre de jours ouvrés (lun-ven) entre deux dates ISO, bornes incluses.
export function joursOuvres(dateDebut, dateFin) {
    if (!dateDebut || !dateFin) return 0;
    let n = 0;
    const d = new Date(dateDebut + 'T12:00');
    const fin = new Date(dateFin + 'T12:00');
    for (; d <= fin; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) n++;
    }
    return n;
}

export function grouperParTech(feuilles, profils = []) {
    const companyParUid = new Map(profils.map(p => [p.id, p.company || '—']));
    const map = new Map();
    feuilles.forEach(f => {
        if (!map.has(f.user_id)) {
            map.set(f.user_id, { nom: f.tech || '—', company: companyParUid.get(f.user_id) || '—', feuilles: [] });
        }
        map.get(f.user_id).feuilles.push(f);
    });
    return map;
}

function grouperParEntreprise(techMap) {
    const parEntreprise = new Map();
    for (const [uid, tech] of techMap) {
        if (!parEntreprise.has(tech.company)) parEntreprise.set(tech.company, new Map());
        parEntreprise.get(tech.company).set(uid, tech);
    }
    return parEntreprise;
}

function nonVues(feuilles, vues) {
    return feuilles.filter(f => !vues.has(f.id)).length;
}

function renderTechCard(uid, { nom, feuilles }, periode, ctx) {
    const rempli = feuilles.length;
    const dispo = joursOuvres(periode.date_debut, periode.date_fin) || rempli;
    const contrat = feuilles[0]?.contrat ? `${feuilles[0].contrat}h · ` : '';
    const nb = nonVues(feuilles, ctx.vues);
    const aJour = nb === 0;
    const sousTitre = `${contrat}${rempli} feuille${rempli > 1 ? 's' : ''} remplie${rempli > 1 ? 's' : ''} sur ${dispo} j.`;
    const badge = aJour
        ? '<span class="resp-badge-a-jour">✓ À jour</span>'
        : `<span class="resp-badge-nonvue">${nb} à lire</span>`;
    return `<div class="resp-tech-card${aJour ? ' resp-tech-a-jour' : ''}" data-uid="${uid}">
        <div class="resp-tech-header">
            <span class="resp-avatar">${escHtml(initiales(nom))}</span>
            <div class="resp-tech-info">
                <span class="resp-tech-nom">${escHtml(nom)}</span>
                <span class="resp-tech-sous-titre">${escHtml(sousTitre)}</span>
            </div>
            ${badge}
            <span class="resp-chevron">▼</span>
        </div>
        <div class="resp-tech-body hidden">${renderFeuilles(feuilles, ctx)}</div>
    </div>`;
}

function trierTechs(entries, vues) {
    return [...entries].sort(([, a], [, b]) => {
        const diff = nonVues(b.feuilles, vues) - nonVues(a.feuilles, vues);
        return diff !== 0 ? diff : a.nom.localeCompare(b.nom);
    });
}

function totalNonVues(techs, vues) {
    let total = 0;
    for (const [, tech] of techs) total += nonVues(tech.feuilles, vues);
    return total;
}

export function renderSquelette(n = 4) {
    return Array.from({ length: n }, () => '<div class="resp-skeleton-card"></div>').join('');
}

// periode = { date_debut, date_fin } (période sélectionnée ou mois calendaire de repli)
// ctx = { vues, selectionMode, estSelectionnee(id), statutSemaine(ids) }
export function renderTechs(techMap, periode, ctx) {
    if (!techMap.size) return '<p class="resp-empty">Aucune feuille pour cette période.</p>';

    const parEntreprise = grouperParEntreprise(techMap);
    if (parEntreprise.size < 2) {
        return trierTechs([...techMap], ctx.vues)
            .map(([uid, tech]) => renderTechCard(uid, tech, periode, ctx))
            .join('');
    }

    const groupes = [...parEntreprise.entries()].sort(([nomA, techsA], [nomB, techsB]) => {
        const diff = totalNonVues(techsB, ctx.vues) - totalNonVues(techsA, ctx.vues);
        return diff !== 0 ? diff : nomA.localeCompare(nomB);
    });

    return groupes.map(([entreprise, techs]) => {
        const n = techs.size;
        const nb = totalNonVues(techs, ctx.vues);
        const badge = nb ? `<span class="resp-badge-nonvue">${nb} non vue${nb > 1 ? 's' : ''}</span>` : '';
        const cartes = trierTechs([...techs], ctx.vues)
            .map(([uid, tech]) => renderTechCard(uid, tech, periode, ctx))
            .join('');
        return `<div class="resp-entreprise-groupe">
            <div class="resp-entreprise-header">
                <span>${escHtml(entreprise)} · ${n} technicien${n > 1 ? 's' : ''}</span>
                ${badge}
            </div>
            ${cartes}
        </div>`;
    }).join('');
}
