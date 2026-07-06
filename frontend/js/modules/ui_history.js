import { showToast } from '../utils/utils.js';
import { remplirFormulaireDepuisFeuille } from './fdr_charger.js';
import { chargerHistorique, chargerDetailFeuille, supprimerFeuille, chargerPdfFeuille } from './db.js';
import { afficherPdfUrl } from './pdfviewer.js';
import { fermerModal, fermerTousLesModals } from './ui_settings.js';

let _histoCache = null;

export function ouvrirHistorique() {
    fermerTousLesModals();
    _histoCache = null;
    document.getElementById('modal-historique').classList.add('open');
    renderListeHistorique();
}

export async function renderListeHistorique() {
    const body = document.getElementById('histo-body');
    document.getElementById('histo-title').textContent = 'Historique';

    if (!_histoCache) {
        body.innerHTML = '<div class="histo-empty">Chargement…</div>';
        try {
            _histoCache = await chargerHistorique();
        } catch {
            body.innerHTML = '<div class="histo-empty">Erreur de chargement. Vérifiez votre connexion.</div>';
            return;
        }
    }

    const histo = _histoCache;
    const sel   = document.getElementById('histo-filtre-annee');

    if (sel) {
        const anneeActive = sel.value;
        const annees = [...new Set(histo.map(e => e.date?.slice(0, 4)).filter(Boolean))].sort().reverse();
        sel.innerHTML = '<option value="">Toutes</option>' +
            annees.map(a => `<option value="${a}"${a === anneeActive ? ' selected' : ''}>${a}</option>`).join('');
    }

    const anneeFiltre = sel?.value || '';
    const filtered    = anneeFiltre ? histo.filter(e => e.date?.startsWith(anneeFiltre)) : histo;

    if (!filtered.length) {
        body.innerHTML = '<div class="histo-empty">Aucune feuille de route sauvegardée.<br>Téléchargez ou envoyez votre première feuille pour l\'y retrouver.</div>';
        return;
    }

    const groups = {};
    filtered.forEach(entry => {
        const key = entry.date ? entry.date.slice(0, 7) : '0000-00';
        if (!groups[key]) groups[key] = [];
        groups[key].push(entry);
    });

    body.innerHTML = Object.keys(groups).sort().reverse().map(key => {
        const [y, m] = key.split('-');
        const label  = key !== '0000-00'
            ? new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            : 'Date inconnue';
        return `<div class="histo-month-header">${label}</div>` +
            groups[key].map(entry => {
                const dateAff    = entry.date
                    ? new Date(entry.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                    : '—';
                const heureAff   = entry.created_at
                    ? new Date(entry.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : '—';
                const badgeClass = entry.mode === 'email' ? 'histo-badge-email' : 'histo-badge-pdf';
                const badgeLabel = entry.mode === 'email' ? '✉ Email' : '↓ PDF';
                return `
                <div class="histo-entry" data-entry-id="${entry.id}">
                    <div class="histo-entry-main">
                        <div class="histo-entry-date">${dateAff}</div>
                        <div class="histo-entry-tech">${entry.tech || '—'}</div>
                        <div class="histo-entry-meta">enregistré à ${heureAff}</div>
                    </div>
                    <span class="histo-badge ${badgeClass}">${badgeLabel}</span>
                    <button class="btn-histo-del" data-del-id="${entry.id}" title="Supprimer">&#128465;</button>
                </div>`;
            }).join('');
    }).join('');
}

export async function voirDetailHistorique(id) {
    const body = document.getElementById('histo-body');
    document.getElementById('histo-title').textContent = 'Détail';
    body.innerHTML = '<div class="histo-empty">Chargement…</div>';

    let feuille, elements;
    try {
        ({ feuille, elements } = await chargerDetailFeuille(id));
    } catch {
        body.innerHTML = '<div class="histo-empty">Erreur de chargement.</div>';
        return;
    }

    if (!feuille) {
        body.innerHTML = '<div class="histo-empty">Feuille introuvable.</div>';
        return;
    }

    const dateAff = feuille.date
        ? new Date(feuille.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '—';

    const ints   = elements.filter(e => e.kind === 'intervention');
    const pauses = elements.filter(e => e.kind === 'pause');

    let intNum = 0;
    const intsHtml = ints.length
        ? ints.map(i => {
            intNum++;
            return `
            <div class="histo-int-item">
                <div class="histo-int-item-title">#${intNum} — ${i.client || '—'}${i.ville ? ' (' + i.ville + ')' : ''}</div>
                <div class="histo-int-item-sub">${i.heure_arrivee || '—'} → ${i.heure_depart || '—'}${i.type_int ? ' &bull; ' + i.type_int : ''}${i.details ? ' &bull; ' + i.details.slice(0, 60) + (i.details.length > 60 ? '…' : '') : ''}</div>
            </div>`;
        }).join('')
        : '<div style="color:#a0aec0;font-size:13px;">Aucune intervention</div>';

    const pausesHtml = pauses.length
        ? pauses.map(p => `<div class="histo-int-item"><span style="color:#c05621;">⏸</span> ${p.pause_debut || '—'} → ${p.pause_fin || '—'}</div>`).join('')
        : '';

    body.innerHTML = `
        <button class="histo-detail-back">&#8592; Retour</button>

        <div class="histo-detail-section" style="margin-top:12px;">
            <div class="lbl">Informations générales</div>
            <div class="histo-detail-row"><span>Date</span><span><strong>${dateAff}</strong></span></div>
            <div class="histo-detail-row"><span>Technicien</span><span>${feuille.tech || '—'}</span></div>
            <div class="histo-detail-row"><span>Début journée</span><span>${feuille.heure_debut || '—'}</span></div>
            <div class="histo-detail-row"><span>Fin journée</span><span>${feuille.heure_fin || '—'}</span></div>
            <div class="histo-detail-row"><span>Pause repas</span><span>${feuille.repas_min ? feuille.repas_min + ' min' : '—'}</span></div>
            <div class="histo-detail-row"><span>Heures travaillées</span><span><strong>${feuille.heures_travail || '—'}</strong></span></div>
            ${feuille.heures_supp && feuille.heures_supp !== '0h00' ? `<div class="histo-detail-row"><span>Heures supp.</span><span style="color:#276749;font-weight:700;">${feuille.heures_supp}</span></div>` : ''}
        </div>

        <div class="histo-detail-section">
            <div class="lbl">Interventions (${ints.length})</div>
            ${intsHtml}
            ${pausesHtml}
        </div>

        <button class="btn-voir-pdf" data-pdf-id="${id}">
            &#128196; Afficher le PDF
        </button>

        <button class="btn-restaurer" data-restaurer-id="${id}">
            &#8635; Restaurer cette feuille
        </button>`;
}

async function afficherPdfHistorique(id) {
    let pdf;
    try {
        pdf = await chargerPdfFeuille(id);
    } catch {
        showToast('Erreur lors du chargement du PDF', 'error');
        return;
    }
    if (!pdf) {
        showToast('PDF non disponible pour cette feuille (créée avant la mise à jour)', 'warn', 4500);
        return;
    }
    await afficherPdfUrl(pdf);
}

async function supprimerHistorique(id) {
    if (!confirm('Supprimer cette entrée de l\'historique ?')) return;
    try {
        await supprimerFeuille(id);
        if (_histoCache) _histoCache = _histoCache.filter(e => e.id !== id);
        renderListeHistorique();
        document.dispatchEvent(new CustomEvent('feuille:supprimee'));
    } catch {
        showToast('Erreur lors de la suppression', 'error');
    }
}

async function restaurerDepuisHistorique(id) {
    if (!confirm('Restaurer cette feuille ? Le formulaire en cours sera remplacé.')) return;

    let feuille, elements;
    try {
        ({ feuille, elements } = await chargerDetailFeuille(id));
    } catch {
        showToast('Erreur lors du chargement', 'error');
        return;
    }

    if (!feuille) {
        showToast('Feuille introuvable', 'error');
        return;
    }

    fermerModal('modal-historique');
    remplirFormulaireDepuisFeuille(feuille, elements);
    showToast('Feuille restaurée depuis l\'historique', 'success', 3000);
}

export function initHistoriqueEvents() {
    document.getElementById('histo-body').addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-histo-del');
        if (delBtn) { e.stopPropagation(); supprimerHistorique(delBtn.dataset.delId); return; }
        const backBtn = e.target.closest('.histo-detail-back');
        if (backBtn) { renderListeHistorique(); return; }
        const pdfBtn = e.target.closest('.btn-voir-pdf');
        if (pdfBtn) { afficherPdfHistorique(pdfBtn.dataset.pdfId); return; }
        const restaurerBtn = e.target.closest('.btn-restaurer');
        if (restaurerBtn) { restaurerDepuisHistorique(restaurerBtn.dataset.restaurerId); return; }
        const entry = e.target.closest('.histo-entry');
        if (entry) voirDetailHistorique(entry.dataset.entryId);
    });
}
