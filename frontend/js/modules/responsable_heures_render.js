// HTML de l'onglet « Heures supp » : une carte par technicien avec les
// totaux de la période (heures supp déclarées / validées) et un tableau
// dépliable semaine par semaine.
//
// Heures supp = heures travaillées − contrat, par semaine entière (voir
// heures_calculs.js). « Validé » = même calcul, en remplaçant les heures
// travaillées de chaque jour validé par la valeur saisie par le responsable ;
// un jour non validé garde les heures déclarées.

import { escHtml, affH, isoLocal } from '../utils/utils.js';
import { semainesPeriode } from './heures_calculs.js';
import { initiales } from './responsable_render.js';
import { blocSemaine, ENTETE_TABLE } from './responsable_heures_semaine.js';

// Feuilles où les heures travaillées validées remplacent les déclarées.
function avecHeuresValidees(feuilles, ctx) {
    return feuilles.map(f => {
        const v = ctx.validationPour(f);
        return v ? { ...f, heures_travail: affH(v.heures_validees_min) } : f;
    });
}

// Semaines déclarées et validées d'un technicien, appariées par clé de semaine.
// sv = null tant qu'aucun jour de la semaine n'a été validé : on n'affiche
// pas un « validé » qui ne serait qu'une copie du déclaré.
export function semainesTech(tech, ctx, periode) {
    const opts = { contrat: tech.contrat, aujourdhui: isoLocal(new Date()) };
    const declarees = semainesPeriode(tech.feuilles, opts, periode.date_debut, periode.date_fin);
    const validees  = semainesPeriode(avecHeuresValidees(tech.feuilles, ctx), opts, periode.date_debut, periode.date_fin);
    const parCle    = new Map(validees.map(s => [s.cle, s]));
    return declarees.map(s => {
        const aValidation = s.feuilles.some(f => ctx.validationPour(f));
        return { s, sv: aValidation ? (parCle.get(s.cle) || null) : null };
    });
}

// Totaux d'un technicien sur la période : supp déclarées / validées, jours.
// « validé » ne compte que les semaines où au moins un jour est validé.
export function totauxTech(tech, ctx, periode) {
    const t = { declare: 0, valide: 0, supp25: 0, supp50: 0, nbValides: 0, nbJours: 0, nbSemainesValidees: 0, semaines: semainesTech(tech, ctx, periode) };
    for (const { s, sv } of t.semaines) {
        t.declare += s.totalSuppMin;
        if (sv) {
            t.valide += sv.totalSuppMin;
            t.supp25 += sv.supp25;
            t.supp50 += sv.supp50;
            t.nbSemainesValidees++;
        }
        for (const f of s.feuilles) {
            if (f.conge) continue;
            t.nbJours++;
            if (ctx.validationPour(f)) t.nbValides++;
        }
    }
    return t;
}

function carteTech(uid, tech, ctx, periode) {
    const t = totauxTech(tech, ctx, periode);
    const etat = t.nbJours === 0 ? 'Aucune journée'
        : t.nbValides === t.nbJours ? `${t.nbJours} jour${t.nbJours > 1 ? 's' : ''} validé${t.nbJours > 1 ? 's' : ''} ✓`
        : `${t.nbValides}/${t.nbJours} jours validés`;
    const contrat = tech.contrat ? ` · contrat ${escHtml(tech.contrat)}h` : '';
    const nbSem   = t.semaines.length;
    // Tant que rien n'est validé : « — ». Validation partielle : on le dit.
    const valide  = t.nbSemainesValidees === 0
        ? '<strong>—</strong><small>aucune validation</small>'
        : `<strong>${affH(t.valide)}</strong><small>25 % ${affH(t.supp25)} · 50 % ${affH(t.supp50)}${t.nbSemainesValidees < nbSem ? ` · ${t.nbSemainesValidees}/${nbSem} sem.` : ''}</small>`;
    return `<div class="heures-tech-card" data-uid="${uid}">
        <div class="heures-tech-header">
            <span class="resp-avatar">${escHtml(initiales(tech.nom))}</span>
            <div class="resp-tech-info">
                <span class="resp-tech-nom">${escHtml(tech.nom)}</span>
                <span class="resp-tech-sous-titre">${escHtml(tech.company)}${contrat} · ${etat}</span>
            </div>
            <div class="heures-tech-totaux">
                <div class="heures-tech-total"><span>Supp. déclarées</span><strong>${affH(t.declare)}</strong></div>
                <div class="heures-tech-total valide"><span>Supp. validées</span>${valide}</div>
            </div>
            <span class="resp-chevron">▼</span>
        </div>
        <div class="heures-tech-body hidden">
            <table class="heures-jour-table">
                ${ENTETE_TABLE}
                <tbody>${t.semaines.map(({ s, sv }) => blocSemaine(s, sv, ctx)).join('')}</tbody>
                <tfoot><tr><td>Total période</td><td colspan="3"></td><td colspan="3">Supp. déclarées <strong>${affH(t.declare)}</strong> — ${t.nbSemainesValidees === 0
                    ? '<span class="heures-muet">aucune semaine validée</span>'
                    : `validées <strong>${affH(t.valide)}</strong> (25 % ${affH(t.supp25)} · 50 % ${affH(t.supp50)}) sur ${t.nbSemainesValidees}/${nbSem} semaine${nbSem > 1 ? 's' : ''}`}</td></tr></tfoot>
            </table>
        </div>
    </div>`;
}

// techMap : Map uid → { nom, company, contrat, feuilles } (grouperParTech, sur
// les semaines entières de la période) ; periode = { date_debut, date_fin } ;
// ctx = { validationPour(f), estObsolete(f, v) }
export function renderHeures(techMap, ctx, periode) {
    if (!techMap.size) return '<p class="resp-empty">Aucune feuille pour cette période.</p>';
    const techs = [...techMap.entries()].sort(([, a], [, b]) =>
        a.company.localeCompare(b.company) || a.nom.localeCompare(b.nom));
    const entreprises = new Set(techs.map(([, t]) => t.company));
    if (entreprises.size < 2) return techs.map(([uid, t]) => carteTech(uid, t, ctx, periode)).join('');

    let html = '', courante = null;
    for (const [uid, t] of techs) {
        if (t.company !== courante) {
            courante = t.company;
            html += `<div class="resp-entreprise-header"><span>${escHtml(courante)}</span></div>`;
        }
        html += carteTech(uid, t, ctx, periode);
    }
    return html;
}
