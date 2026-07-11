import { chargerDetailFeuille, chargerPdfFeuille } from './db.js';
import { remplirFormulaireDepuisFeuille } from './fdr_charger.js';
import { showToast, escHtml, hhmm } from '../utils/utils.js';

export function cacherResume() {
    document.getElementById('vue-resume')?.classList.add('hidden');
}

export async function afficherResumeFeuille(feuilleId) {
    try {
        const { feuille, elements } = await chargerDetailFeuille(feuilleId);
        document.getElementById('vue-dashboard').classList.add('hidden');
        document.getElementById('vue-formulaire').classList.add('hidden');
        document.getElementById('vue-heures')?.classList.add('hidden');
        document.getElementById('resume-content').innerHTML = buildResumeHTML(feuille, elements);
        document.getElementById('vue-resume').classList.remove('hidden');
        window.scrollTo(0, 0);
        document.dispatchEvent(new CustomEvent('nav:resume'));

        document.getElementById('btn-resume-pdf')?.addEventListener('click', async () => {
            const win = window.open('', '_blank');
            try {
                const url = await chargerPdfFeuille(feuilleId);
                if (!url) { win?.close(); showToast('Aucun PDF disponible', 'warn'); return; }
                if (win) win.location.href = url;
                else window.open(url, '_blank');
            } catch {
                win?.close();
                showToast('Impossible de charger le PDF', 'error');
            }
        });

        document.getElementById('btn-resume-modifier')?.addEventListener('click', () => {
            remplirFormulaireDepuisFeuille(feuille, elements);
            document.getElementById('vue-resume')?.classList.add('hidden');
            document.getElementById('vue-dashboard')?.classList.add('hidden');
            document.getElementById('vue-heures')?.classList.add('hidden');
            document.getElementById('vue-formulaire')?.classList.remove('hidden');
            window.scrollTo(0, 0);
            document.dispatchEvent(new CustomEvent('nav:formulaire'));
            showToast('Vous pouvez compléter la feuille, puis la renvoyer', 'success', 3500);
        });
    } catch {
        showToast('Erreur lors du chargement du résumé', 'error');
    }
}

function formatDateLong(iso) {
    const d = new Date(iso + 'T12:00:00');
    const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildResumeHTML(feuille, elements) {
    const interventions = elements.filter(e => e.kind === 'intervention');
    const pauses        = elements.filter(e => e.kind === 'pause');
    const rappels       = elements.filter(e => e.kind === 'rappel');

    const timeRange = (feuille.heure_debut && feuille.heure_fin)
        ? `${hhmm(feuille.heure_debut)} → ${hhmm(feuille.heure_fin)}` : '';
    const rappel      = rappels[0];
    const rappelRange = rappel ? `${hhmm(rappel.pause_debut) || '—'} → ${hhmm(rappel.pause_fin) || '—'}` : '';
    const astreinte   = !!feuille.astreinte || !!(rappel && rappel.astreinte);

    const totaux = [
        feuille.heures_travail ? `${feuille.heures_travail} travaillées` : '',
        feuille.heures_supp    ? `+${feuille.heures_supp} supp.` : '',
    ].filter(Boolean).join(' · ');

    let html = `
        <div class="resume-hero">
            <p class="resume-label">Feuille du jour</p>
            <h2 class="resume-date-titre">${formatDateLong(feuille.date)}</h2>
            ${astreinte ? `<p class="resume-astreinte"><span class="astreinte-badge">Astreinte</span></p>` : ''}
            ${timeRange   ? `<p class="resume-time-range">${timeRange}</p>` : ''}
            ${rappelRange ? `<p class="resume-time-range">↩ Sortie suppl. ${rappelRange}${rappel && rappel.astreinte ? ' (astreinte)' : ''}</p>` : ''}
            ${totaux      ? `<p class="resume-totaux">${totaux}</p>`        : ''}
            <div class="resume-actions">
                <button class="resume-btn-pdf" id="btn-resume-pdf">📄 Afficher le PDF</button>
                <button class="resume-btn-modifier" id="btn-resume-modifier">✏️ Modifier</button>
            </div>
        </div>
        <div class="card">
            <h3 class="resume-section-title">Interventions (${interventions.length})</h3>
    `;

    if (interventions.length === 0) {
        html += '<p class="resume-empty">Aucune intervention enregistrée.</p>';
    } else {
        interventions.forEach(el => {
            const details = [el.ville, el.type_int].filter(Boolean).join(' · ');
            html += `
                <div class="resume-item">
                    <div class="resume-item-left">
                        <span class="resume-item-client">${escHtml(el.client) || '—'}</span>
                        ${details ? `<span class="resume-item-details">${escHtml(details)}</span>` : ''}
                        ${el.mo   ? `<span class="resume-item-mo">MO : ${escHtml(el.mo)}</span>` : ''}
                    </div>
                    <span class="resume-item-heures">${hhmm(el.heure_arrivee) || '—'} → ${hhmm(el.heure_depart) || '—'}</span>
                </div>
            `;
        });
    }

    html += '</div>';

    if (pauses.length > 0) {
        html += '<div class="card"><h3 class="resume-section-title">Pauses</h3>';
        pauses.forEach(el => {
            html += `<div class="resume-item resume-item-pause">⏸ Pause ${hhmm(el.pause_debut) || '—'} → ${hhmm(el.pause_fin) || '—'}</div>`;
        });
        html += '</div>';
    }

    return html;
}
