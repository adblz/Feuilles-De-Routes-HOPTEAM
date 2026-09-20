// HTML d'une semaine de l'onglet « Heures supp » (page responsable) : une
// ligne par jour (heures travaillées déclarées / validées, écart au seuil),
// les jours ouvrés sans feuille en grisé, puis le sous-total de la semaine
// avec les heures supp calculées sur les heures validées.

import { escHtml, affH, affHSigne } from '../utils/utils.js';
import { suppJour } from './heures_calculs.js';
import { badgeValidation } from './responsable_feuilles.js';

function dateCourte(iso) {
    return new Date(iso + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function ligneJour(f, ctx, contrat) {
    const v = ctx.validationPour(f);
    if (f.conge) {
        return `<tr class="heures-jour-conge">
            <td>${dateCourte(f.date)}</td>
            <td class="num" colspan="3">Congé</td>
            <td colspan="2"></td>
            <td class="col-actions"><button type="button" class="btn-heures-ouvrir" data-id="${f.id}">Ouvrir</button></td>
        </tr>`;
    }
    return `<tr>
        <td>${dateCourte(f.date)}${f.astreinte ? ' <span class="resp-badge-astreinte">astreinte</span>' : ''}</td>
        <td class="num">${escHtml(f.heures_travail || '0h00')}</td>
        <td class="num${v ? ' valide' : ''}">${v ? affH(v.heures_validees_min) : '—'}</td>
        <td class="num ecart">${affHSigne(suppJour(f, contrat))}</td>
        <td>${badgeValidation(f, ctx)}</td>
        <td class="commentaire">${escHtml(v?.commentaire || '')}</td>
        <td class="col-actions"><button type="button" class="btn-heures-ouvrir" data-id="${f.id}">Ouvrir</button></td>
    </tr>`;
}

function ligneManquant(m) {
    return `<tr class="heures-jour-manquant">
        <td>${dateCourte(m.date)}</td>
        <td class="num">0h00</td>
        <td class="num">—</td>
        <td class="num ecart">${affHSigne(-m.seuilMin)}</td>
        <td colspan="3">Sans feuille ni congé : compte 0h dans la semaine</td>
    </tr>`;
}

// s : semaine déclarée ; sv : la même semaine calculée sur les heures validées.
function ligneSemaine(s, sv) {
    const notes = [];
    if (s.nbFeries > 0)    notes.push(`${s.nbFeries} férié${s.nbFeries > 1 ? 's' : ''}`);
    if (s.nbConges > 0)    notes.push(`${s.nbConges} congé${s.nbConges > 1 ? 's' : ''}`);
    if (s.nbManquants > 0) notes.push(`${s.nbManquants} sans feuille`);
    const seuil = `seuil ${affH(s.seuilMin)}${notes.length ? ' (' + notes.join(', ') + ')' : ''}`;
    const supp  = x => x.totalSuppMin > 0
        ? `+${affH(x.totalSuppMin)} <span class="heures-majo">25 % ${affH(x.supp25)} · 50 % ${affH(x.supp50)}</span>`
        : `<span class="heures-muet">${x.netMin < 0 ? affHSigne(x.netMin) : '0h00'}</span>`;
    return `<tr class="heures-semaine-total">
        <td>${escHtml(s.labelCourt)} <span class="heures-seuil">${seuil}</span></td>
        <td class="num">${affH(s.totalTravailMin)}</td>
        <td class="num valide">${affH(sv.totalTravailMin)}</td>
        <td class="num"></td>
        <td colspan="3">Supp. déclarées ${supp(s)} — <strong>validées ${supp(sv)}</strong></td>
    </tr>`;
}

// Lignes d'une semaine : jours (feuilles + manquants) par date, puis sous-total.
export function blocSemaine(s, sv, ctx) {
    const lignes = [
        ...s.feuilles.map(f => ({ date: f.date, html: ligneJour(f, ctx, s.contrat) })),
        ...s.manquants.map(m => ({ date: m.date, html: ligneManquant(m) })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    return lignes.map(l => l.html).join('') + ligneSemaine(s, sv);
}

export const ENTETE_TABLE = `<thead><tr>
    <th>Jour</th><th class="num">Travaillé déclaré</th><th class="num">Travaillé validé</th>
    <th class="num">Écart jour</th><th>État</th><th>Commentaire</th><th></th>
</tr></thead>`;
