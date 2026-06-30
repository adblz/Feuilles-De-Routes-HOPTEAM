import { chargerDetailFeuille, chargerPdfFeuille } from './db.js';
import { afficherPdfUrl } from './pdfviewer.js';
import { showToast, escHtml } from '../utils/utils.js';

export function cacherResume() {
    document.getElementById('vue-resume')?.classList.add('hidden');
}

export async function afficherResumeFeuille(feuilleId) {
    try {
        const { feuille, elements } = await chargerDetailFeuille(feuilleId);
        document.getElementById('vue-dashboard').classList.add('hidden');
        document.getElementById('vue-formulaire').classList.add('hidden');
        document.getElementById('resume-content').innerHTML = buildResumeHTML(feuille, elements);
        document.getElementById('vue-resume').classList.remove('hidden');
        window.scrollTo(0, 0);
        document.dispatchEvent(new CustomEvent('nav:resume'));

        document.getElementById('btn-resume-pdf')?.addEventListener('click', async () => {
            try {
                const url = await chargerPdfFeuille(feuilleId);
                if (!url) { showToast('Aucun PDF disponible', 'warn'); return; }
                await afficherPdfUrl(url);
            } catch {
                showToast('Impossible de charger le PDF', 'error');
            }
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

    const timeRange = (feuille.heure_debut && feuille.heure_fin)
        ? `${feuille.heure_debut} → ${feuille.heure_fin}` : '';

    const totaux = [
        feuille.heures_travail ? `${feuille.heures_travail} travaillées` : '',
        feuille.heures_supp    ? `+${feuille.heures_supp} supp.` : '',
    ].filter(Boolean).join(' · ');

    let html = `
        <div class="resume-hero">
            <p class="resume-label">Feuille du jour</p>
            <h2 class="resume-date-titre">${formatDateLong(feuille.date)}</h2>
            ${timeRange ? `<p class="resume-time-range">${timeRange}</p>` : ''}
            ${totaux    ? `<p class="resume-totaux">${totaux}</p>`        : ''}
            <button class="resume-btn-pdf" id="btn-resume-pdf">📄 Afficher le PDF</button>
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
                    <span class="resume-item-heures">${el.heure_arrivee || '—'} → ${el.heure_depart || '—'}</span>
                </div>
            `;
        });
    }

    html += '</div>';

    if (pauses.length > 0) {
        html += '<div class="card"><h3 class="resume-section-title">Pauses</h3>';
        pauses.forEach(el => {
            html += `<div class="resume-item resume-item-pause">⏸ Pause ${el.pause_debut || '—'} → ${el.pause_fin || '—'}</div>`;
        });
        html += '</div>';
    }

    return html;
}
