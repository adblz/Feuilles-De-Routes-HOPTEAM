import { showToast, parseDuree } from '../utils/utils.js';
import {
    cfg, saveCfg, calcHeures,
    ajouterIntervention, ajouterPause,
    sauvegarderBrouillon, effacerBrouillon, sauvegarderHistorique,
    viderInterventions, resetSuppState,
} from './fdr.js';

// ── Paramètres ─────────────────────────────────────────────────

export function openSettings() {
    document.getElementById('s-company').value    = cfg.company;
    document.getElementById('s-email').value      = cfg.email;
    document.getElementById('s-tech-email').value = cfg.techEmail;
    document.getElementById('s-contrat').value    = cfg.contrat;
    document.getElementById('modal-settings').classList.add('open');
}

export function fermerModal(id) {
    document.getElementById(id).classList.remove('open');
}

export function sauvegarderParams() {
    saveCfg(
        document.getElementById('s-company').value.trim(),
        document.getElementById('s-email').value.trim(),
        document.getElementById('s-tech-email').value.trim(),
        document.getElementById('s-contrat').value
    );
    fermerModal('modal-settings');
    calcHeures();
    if (cfg.company && cfg.email) document.getElementById('setup-notice').style.display = 'none';
}

// ── Historique ─────────────────────────────────────────────────

export function ouvrirHistorique() {
    document.getElementById('modal-historique').classList.add('open');
    renderListeHistorique();
}

export function renderListeHistorique() {
    document.getElementById('histo-title').textContent = 'Historique';
    const body  = document.getElementById('histo-body');
    const histo = JSON.parse(localStorage.getItem('fdr_historique') || '[]');

    const sel = document.getElementById('histo-filtre-annee');
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
                const dateAff  = entry.date
                    ? new Date(entry.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                    : '—';
                const heureAff = new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const badgeClass = entry.mode === 'email' ? 'histo-badge-email' : 'histo-badge-pdf';
                const badgeLabel = entry.mode === 'email' ? '✉ Email' : '↓ PDF';
                const nbLabel    = `${entry.nbInterventions} intervention${entry.nbInterventions > 1 ? 's' : ''}`;
                return `
                <div class="histo-entry" data-entry-id="${entry.id}">
                    <div class="histo-entry-main">
                        <div class="histo-entry-date">${dateAff}</div>
                        <div class="histo-entry-tech">${entry.tech || '—'}</div>
                        <div class="histo-entry-meta">${nbLabel} &bull; enregistré à ${heureAff}</div>
                    </div>
                    <span class="histo-badge ${badgeClass}">${badgeLabel}</span>
                    <button class="btn-histo-del" data-del-id="${entry.id}" title="Supprimer">&#128465;</button>
                </div>`;
            }).join('');
    }).join('');
}

export function voirDetailHistorique(id) {
    const histo = JSON.parse(localStorage.getItem('fdr_historique') || '[]');
    const entry = histo.find(e => e.id === id);
    if (!entry) return;

    const d       = entry.data;
    const dateAff = d.date
        ? new Date(d.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '—';

    document.getElementById('histo-title').textContent = 'Détail';

    const ints   = (d.elements || []).filter(e => e.kind === 'intervention');
    const pauses = (d.elements || []).filter(e => e.kind === 'pause');

    const intsHtml = ints.length
        ? ints.map(i => `
            <div class="histo-int-item">
                <div class="histo-int-item-title">#${i.num} — ${i.client || '—'}${i.ville ? ' (' + i.ville + ')' : ''}</div>
                <div class="histo-int-item-sub">${i.arrivee || '—'} → ${i.depart || '—'}${i.typeInt ? ' &bull; ' + i.typeInt : ''}${i.details ? ' &bull; ' + i.details.slice(0, 60) + (i.details.length > 60 ? '…' : '') : ''}</div>
            </div>`).join('')
        : '<div style="color:#a0aec0;font-size:13px;">Aucune intervention</div>';

    const pausesHtml = pauses.length
        ? pauses.map(p => `<div class="histo-int-item"><span style="color:#c05621;">⏸</span> ${p.debut || '—'} → ${p.fin || '—'}</div>`).join('')
        : '';

    document.getElementById('histo-body').innerHTML = `
        <button class="histo-detail-back">&#8592; Retour</button>

        <div class="histo-detail-section" style="margin-top:12px;">
            <div class="lbl">Informations générales</div>
            <div class="histo-detail-row"><span>Date</span><span><strong>${dateAff}</strong></span></div>
            <div class="histo-detail-row"><span>Technicien</span><span>${d.tech || '—'}</span></div>
            <div class="histo-detail-row"><span>Début journée</span><span>${d.debut || '—'}</span></div>
            <div class="histo-detail-row"><span>Fin journée</span><span>${d.fin || '—'}</span></div>
            <div class="histo-detail-row"><span>Pause repas</span><span>${d.repas ? d.repas + ' min' : '—'}</span></div>
            <div class="histo-detail-row"><span>Heures travaillées</span><span><strong>${d.travail || '—'}</strong></span></div>
            ${d.supp && d.supp !== '0h00' ? `<div class="histo-detail-row"><span>Heures supp.</span><span style="color:#276749;font-weight:700;">${d.supp}</span></div>` : ''}
        </div>

        <div class="histo-detail-section">
            <div class="lbl">Interventions (${ints.length})</div>
            ${intsHtml}
            ${pausesHtml}
        </div>

        <button class="btn-restaurer" data-restaurer-id="${id}">
            &#8635; Restaurer cette feuille
        </button>`;
}

function supprimerHistorique(id) {
    if (!confirm('Supprimer cette entrée de l\'historique ?')) return;
    const histo = JSON.parse(localStorage.getItem('fdr_historique') || '[]');
    localStorage.setItem('fdr_historique', JSON.stringify(histo.filter(e => e.id !== id)));
    renderListeHistorique();
}

function restaurerDepuisHistorique(id) {
    const histo = JSON.parse(localStorage.getItem('fdr_historique') || '[]');
    const entry = histo.find(e => e.id === id);
    if (!entry) return;
    if (!confirm('Restaurer cette feuille ? Le formulaire en cours sera remplacé.')) return;

    fermerModal('modal-historique');

    viderInterventions();
    resetSuppState();

    const d = entry.data;
    document.getElementById('date').value        = d.date  || '';
    document.getElementById('technicien').value  = d.tech  || '';
    document.getElementById('heure-debut').value = d.debut || '';
    document.getElementById('heure-fin').value   = d.fin   || '';
    document.getElementById('repas').value        = d.repas || '';
    if (d.debut && d.fin) calcHeures();

    (d.elements || []).forEach(item => {
        if (item.kind === 'intervention') ajouterIntervention(item);
        else if (item.kind === 'pause')   ajouterPause(item);
    });
    if (!d.elements || d.elements.length === 0) ajouterIntervention();

    sauvegarderBrouillon();
    showToast('Feuille restaurée depuis l\'historique', 'success', 3000);
}

// Délégation d'événements pour le corps du modal historique.
// Appelé une seule fois à l'initialisation.
export function initHistoriqueEvents() {
    document.getElementById('histo-body').addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-histo-del');
        if (delBtn) {
            e.stopPropagation();
            supprimerHistorique(parseInt(delBtn.dataset.delId));
            return;
        }
        const backBtn = e.target.closest('.histo-detail-back');
        if (backBtn) {
            renderListeHistorique();
            return;
        }
        const restaurerBtn = e.target.closest('.btn-restaurer');
        if (restaurerBtn) {
            restaurerDepuisHistorique(parseInt(restaurerBtn.dataset.restaurerId));
            return;
        }
        const entry = e.target.closest('.histo-entry');
        if (entry) {
            voirDetailHistorique(parseInt(entry.dataset.entryId));
        }
    });
}

// ── Récap heures supplémentaires ───────────────────────────────

export function ouvrirSuppRecap() {
    const today        = new Date().toISOString().split('T')[0];
    const firstOfMonth = today.slice(0, 8) + '01';
    document.getElementById('supp-date-debut').value = firstOfMonth;
    document.getElementById('supp-date-fin').value   = today;
    document.getElementById('supp-result').innerHTML = '';
    document.getElementById('modal-supp').classList.add('open');
}

export function calculerSuppRecap() {
    const debut   = document.getElementById('supp-date-debut').value;
    const fin     = document.getElementById('supp-date-fin').value;
    const histo   = JSON.parse(localStorage.getItem('fdr_historique') || '[]');
    const affH    = m => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
    const result  = document.getElementById('supp-result');

    const filtered = histo.filter(e => e.date && e.date >= debut && e.date <= fin);

    if (!filtered.length) {
        result.innerHTML = '<div class="supp-empty">Aucune feuille de route sur cette période.</div>';
        return;
    }

    let totalMin = 0;
    filtered.forEach(e => { totalMin += parseDuree(e.data?.supp); });

    const avecSupp   = filtered.filter(e => parseDuree(e.data?.supp) > 0);
    const tableHtml  = avecSupp.length ? `
        <table class="supp-table">
            <thead><tr><th>Date</th><th>Technicien</th><th>Supp.</th></tr></thead>
            <tbody>${avecSupp.map(e => {
                const dateAff = new Date(e.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                return `<tr><td>${dateAff}</td><td>${e.tech || '—'}</td><td class="supp-td-val">${affH(parseDuree(e.data?.supp))}</td></tr>`;
            }).join('')}</tbody>
        </table>` : '<p class="supp-no-supp">Aucune heure supplémentaire sur cette période.</p>';

    result.innerHTML = `
        <div class="supp-total-block">
            <div class="supp-total-label">Total heures supp.</div>
            <div class="supp-total">${affH(totalMin)}</div>
            <div class="supp-total-sub">${filtered.length} feuille${filtered.length > 1 ? 's' : ''} sur la période</div>
        </div>
        ${tableHtml}`;
}

// ── Nouvelle feuille ───────────────────────────────────────────

export function nouvelleFeuille() {
    if (!confirm('Effacer la feuille de route en cours et recommencer à zéro ?')) return;

    effacerBrouillon();
    viderInterventions();
    resetSuppState();

    document.getElementById('date').value           = new Date().toISOString().split('T')[0];
    document.getElementById('heure-debut').value    = '';
    document.getElementById('heure-fin').value      = '';
    document.getElementById('repas').value          = '';
    document.getElementById('heures-travail').value = '';
    document.getElementById('heures-supp').value    = '';

    ajouterIntervention();
}
