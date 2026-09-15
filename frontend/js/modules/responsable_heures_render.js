// HTML de l'onglet « Heures supp » : une carte par technicien avec les
// totaux (déclaré / validé) et un tableau dépliable jour par jour.

import { escHtml, affH, parseDuree } from '../utils/utils.js';
import { initiales } from './responsable_render.js';
import { badgeValidation } from './responsable_feuilles.js';

function dateCourte(iso) {
    return new Date(iso + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Totaux d'un technicien sur ses feuilles de la période. nbJours = jours
// « à traiter » : heures supp déclarées, ou déjà validés.
export function totauxTech(feuilles, ctx) {
    let declare = 0, valide = 0, nbValides = 0, nbJours = 0;
    for (const f of feuilles) {
        if (f.conge) continue;
        const d = parseDuree(f.heures_supp);
        const v = ctx.validationPour(f);
        declare += d;
        if (d > 0 || v) nbJours++;
        if (v) { valide += v.heures_validees_min || 0; nbValides++; }
    }
    return { declare, valide, nbValides, nbJours };
}

function ligneJour(f, ctx) {
    const v = ctx.validationPour(f);
    return `<tr>
        <td>${dateCourte(f.date)}</td>
        <td class="num">${f.conge ? 'Congé' : escHtml(f.heures_supp || '0h00')}</td>
        <td class="num${v ? ' valide' : ''}">${v ? affH(v.heures_validees_min) : '—'}</td>
        <td>${badgeValidation(f, ctx)}</td>
        <td class="commentaire">${escHtml(v?.commentaire || '')}</td>
        <td class="col-actions"><button type="button" class="btn-heures-ouvrir" data-id="${f.id}">Ouvrir</button></td>
    </tr>`;
}

function carteTech(uid, tech, ctx) {
    const t = totauxTech(tech.feuilles, ctx);
    const feuilles = [...tech.feuilles].sort((a, b) => a.date.localeCompare(b.date));
    const etat = t.nbJours === 0 ? 'Aucune journée'
        : t.nbValides === t.nbJours ? `${t.nbJours} jour${t.nbJours > 1 ? 's' : ''} validé${t.nbJours > 1 ? 's' : ''} ✓`
        : `${t.nbValides}/${t.nbJours} jours validés`;
    return `<div class="heures-tech-card" data-uid="${uid}">
        <div class="heures-tech-header">
            <span class="resp-avatar">${escHtml(initiales(tech.nom))}</span>
            <div class="resp-tech-info">
                <span class="resp-tech-nom">${escHtml(tech.nom)}</span>
                <span class="resp-tech-sous-titre">${escHtml(tech.company)} · ${etat}</span>
            </div>
            <div class="heures-tech-totaux">
                <div class="heures-tech-total"><span>Déclaré</span><strong>${affH(t.declare)}</strong></div>
                <div class="heures-tech-total valide"><span>Validé</span><strong>${affH(t.valide)}</strong></div>
            </div>
            <span class="resp-chevron">▼</span>
        </div>
        <div class="heures-tech-body hidden">
            <table class="heures-jour-table">
                <thead><tr><th>Jour</th><th class="num">Déclaré</th><th class="num">Validé</th><th>État</th><th>Commentaire</th><th></th></tr></thead>
                <tbody>${feuilles.map(f => ligneJour(f, ctx)).join('')}</tbody>
                <tfoot><tr><td>Total</td><td class="num">${affH(t.declare)}</td><td class="num valide">${affH(t.valide)}</td><td colspan="3"></td></tr></tfoot>
            </table>
        </div>
    </div>`;
}

// techMap : Map uid → { nom, company, feuilles } (grouperParTech)
// ctx = { validationPour(f), estObsolete(f, v) }
export function renderHeures(techMap, ctx) {
    if (!techMap.size) return '<p class="resp-empty">Aucune feuille pour cette période.</p>';
    const techs = [...techMap.entries()].sort(([, a], [, b]) =>
        a.company.localeCompare(b.company) || a.nom.localeCompare(b.nom));
    const entreprises = new Set(techs.map(([, t]) => t.company));
    if (entreprises.size < 2) return techs.map(([uid, t]) => carteTech(uid, t, ctx)).join('');

    let html = '', courante = null;
    for (const [uid, t] of techs) {
        if (t.company !== courante) {
            courante = t.company;
            html += `<div class="resp-entreprise-header"><span>${escHtml(courante)}</span></div>`;
        }
        html += carteTech(uid, t, ctx);
    }
    return html;
}
