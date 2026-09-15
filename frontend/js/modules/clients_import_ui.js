import { escHtml } from '../utils/utils.js';

// ── HTML des 3 étapes de la fenêtre « Importer le planning » (page responsable) ──
//   1. correspondance secteurs Excel → techniciens
//   2. anomalies (clients déjà faits récemment) avec un choix par ligne
//   3. récapitulatif avant écriture

const fmtDate = (iso) => iso ? iso.split('-').reverse().join('/') : '—';
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

function renderResume(total, actives, ignorees) {
    return `<p class="imp-resume">
        <strong>${total}</strong> lignes lues ·
        <strong>${actives}</strong> à importer ·
        <span class="imp-muted">${ignorees} ignorées (terminées / clôturées)</span>
    </p>`;
}

function optionsTechs(techs, choisi) {
    return `<option value="">— ignorer —</option>` + techs.map(t =>
        `<option value="${t.id}"${t.id === choisi ? ' selected' : ''}>${escHtml(t.nom)}</option>`
    ).join('');
}

export function renderEtapeMapping({ total, actives, ignorees, secteurs, techs, mapping, companies, company }) {
    const selectCompany = companies.length > 1 ? `
        <div class="imp-company">
            <label for="clients-import-company">Entreprise</label>
            <select id="clients-import-company">
                ${companies.map(c => `<option value="${escHtml(c)}"${c === company ? ' selected' : ''}>${escHtml(c)}</option>`).join('')}
            </select>
        </div>` : '';
    const techsCompany = techs.filter(t => t.company === company);
    const lignes = [...secteurs.entries()].sort((a, b) => b[1] - a[1]).map(([secteur, nb]) => `
        <tr>
            <td class="imp-secteur">${escHtml(secteur || '(sans secteur)')}</td>
            <td class="imp-nb">${nb}</td>
            <td><select class="imp-select-tech" data-secteur="${escHtml(secteur)}">${optionsTechs(techsCompany, mapping[secteur])}</select></td>
        </tr>`).join('');
    return `
        ${renderResume(total, actives, ignorees)}
        ${selectCompany}
        <p class="imp-aide">Pour chaque secteur du fichier, choisissez le technicien qui verra ces clients. Un secteur « ignoré » n'est pas importé.</p>
        <table class="imp-table">
            <thead><tr><th>Secteur (fichier)</th><th>Lignes</th><th>Technicien</th></tr></thead>
            <tbody>${lignes}</tbody>
        </table>`;
}

function renderChoix(nom, valeurs, coche) {
    return `<div class="imp-choix">${valeurs.map(([val, lib]) => `
        <label><input type="radio" name="${nom}" value="${val}"${val === coche ? ' checked' : ''}> ${lib}</label>`).join('')}
    </div>`;
}

export function renderEtapeAnomalies({ dejaFaits, techsById }) {
    if (!dejaFaits.length) {
        return `<p class="imp-ok">Aucune anomalie détectée. Vous pouvez continuer.</p>`;
    }
    return `
        <h4 class="imp-section-titre">Déjà faits récemment (${dejaFaits.length})</h4>
        <p class="imp-aide">Ces clients ont été validés par un technicien il y a peu, mais figurent encore dans le fichier.</p>
        ${dejaFaits.map(a => `
        <div class="imp-anomalie">
            <div class="imp-anomalie-nom">${escHtml(a.nom_pdv)} <span class="imp-muted">${escHtml(a.code_pdv)}</span></div>
            <div class="imp-anomalie-meta">Fait le ${fmtDate(a.fait_le)} par ${escHtml(techsById[a.user_id] || '?')} · prévu le ${fmtDate(a.date_prevue_fichier)} dans le fichier</div>
            ${renderChoix(`af-${a.code_pdv}`, [['masquer', 'Garder masqué'], ['reafficher', 'Réafficher au technicien']], 'masquer')}
        </div>`).join('')}`;
}

export function renderEtapeRecap({ parTech, nonAffectees, masquees, total, ignorees, nbLignes }) {
    const lignesTech = parTech.map(t => `<li><strong>${escHtml(t.nom)}</strong> : ${pluriel(t.nb, 'client')}</li>`).join('');
    const lignesIgnorees = [...nonAffectees.entries()].map(([s, nb]) =>
        `<li>${escHtml(s || '(sans secteur)')} : ${pluriel(nb, 'ligne')}</li>`).join('');
    return `
        ${renderResume(total, nbLignes, ignorees)}
        <h4 class="imp-section-titre">Par technicien</h4>
        <ul class="imp-liste">${lignesTech || '<li class="imp-muted">Aucun client affecté</li>'}</ul>
        ${lignesIgnorees ? `<h4 class="imp-section-titre">Secteurs ignorés</h4><ul class="imp-liste">${lignesIgnorees}</ul>` : ''}
        <p class="imp-aide">${masquees} client${masquees > 1 ? 's' : ''} gardé${masquees > 1 ? 's' : ''} masqué${masquees > 1 ? 's' : ''}. Une ligne = un poste : un client avec plusieurs postes compte plusieurs lignes.</p>
        <p class="imp-attention">L'import remplace la liste actuelle des clients à faire de l'entreprise. Les clients déjà faits sont conservés.</p>`;
}

// ── Lecture des choix de l'utilisateur dans la fenêtre ─────────

export function lireMapping(body) {
    const mapping = {};
    body.querySelectorAll('.imp-select-tech').forEach(sel => { mapping[sel.dataset.secteur] = sel.value; });
    return mapping;
}

export function lireCompany(body) {
    return body.querySelector('#clients-import-company')?.value || '';
}

export function lireChoixAnomalies(body) {
    const masquer = new Set(), reafficher = new Set();
    body.querySelectorAll('input[type=radio]:checked').forEach(r => {
        if (!r.name.startsWith('af-')) return;
        (r.value === 'reafficher' ? reafficher : masquer).add(r.name.slice(3));
    });
    return { masquer, reafficher };
}

export function majFooter(etape) {
    const titres = { 1: 'Importer le planning — 1/3 Techniciens', 2: 'Importer le planning — 2/3 Anomalies', 3: 'Importer le planning — 3/3 Confirmation' };
    document.getElementById('clients-import-titre').textContent = titres[etape];
    document.getElementById('btn-clients-import-retour').classList.toggle('hidden', etape === 1);
    const suivant = document.getElementById('btn-clients-import-suivant');
    suivant.textContent = etape === 3 ? 'Importer maintenant' : 'Continuer';
    suivant.disabled = false;
}
