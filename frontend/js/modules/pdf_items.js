// Rendu HTML des interventions, rappels et pauses pour le PDF.
import { libellesPrestations } from './prestations.js';

// Le rappel / sortie supplémentaire n'est PAS rendu ici : il est affiché en haut
// du PDF avec les heures (voir pdf_layout.js). On le filtre donc de la liste.
export function renderItems(items) {
    return items.filter(item => item.kind !== 'rappel').map(item => {
        if (item.kind === 'intervention') {
            // Un badge par prestation (« Bière · Sanitation », « Café · Joint-douchette »).
            const prestas = libellesPrestations(item);
            const badges  = prestas.map(p => `<span class="pdf-int-badge">${p}</span>`).join('');
            return `
            <div class="pdf-int">
                <div class="pdf-int-head">
                    <span>Intervention #${item.num} &mdash; ${item.client || '—'}${item.ville ? ' (' + item.ville + ')' : ''}</span>
                    ${badges ? `<span class="pdf-int-badges">${badges}</span>` : ''}
                </div>
                <div class="pdf-int-body">
                    <div class="pdf-field"><div class="lbl">Arrivée</div><div class="val">${item.arrivee || '—'}</div></div>
                    <div class="pdf-field"><div class="lbl">Départ</div><div class="val">${item.depart || '—'}</div></div>
                    <div class="pdf-field"><div class="lbl">Prestations</div><div class="val">${prestas.join(', ') || '—'}</div></div>
                    ${item.mo ? `<div class="pdf-field"><div class="lbl">Main d'oeuvre</div><div class="val">${item.mo}</div></div>` : ''}
                    ${item.becs ? `<div class="pdf-field"><div class="lbl">Nb. becs</div><div class="val">${item.becs}</div></div>` : ''}
                    ${item.groupes ? `<div class="pdf-field"><div class="lbl">Nb. groupes</div><div class="val">${item.groupes}</div></div>` : ''}
                    ${item.details ? `<div class="pdf-details-row"><div class="lbl">Détails</div>${item.details}</div>` : ''}
                </div>
            </div>`;
        } else {
            return `
            <div class="pdf-pause">
                <div class="pdf-pause-head">
                    <span>Pause</span>
                    <span>${item.debut || '—'} &rarr; ${item.fin || '—'}</span>
                </div>
                <div class="pdf-pause-body">
                    <div class="pdf-field"><div class="lbl">Début</div><div class="val">${item.debut || '—'}</div></div>
                    <div class="pdf-field"><div class="lbl">Fin</div><div class="val">${item.fin || '—'}</div></div>
                </div>
            </div>`;
        }
    }).join('');
}
