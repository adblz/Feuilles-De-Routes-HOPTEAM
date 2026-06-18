import { showToast } from './utils.js';
import { genererPDF } from './pdf.js';
import { envoyerMail } from './api.js';

// ══════════════════════════════════════════════════════════════
//  1. CONSTANTES
// ══════════════════════════════════════════════════════════════

// Logo encodé en base64 — chargé une fois, réutilisé dans le header et le PDF
const LOGO_B64 = 'data:image/png;base64,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';

export function getLogoBase64() { return LOGO_B64; }

export const MAX_HISTO = 30;


// ══════════════════════════════════════════════════════════════
//  2. CONFIGURATION UTILISATEUR
//  Paramètres persistés en localStorage, lus au démarrage.
// ══════════════════════════════════════════════════════════════

export let cfg = {
    company:  localStorage.getItem('cfg_company')    || '',
    email:    localStorage.getItem('cfg_email')      || '',
    techEmail:localStorage.getItem('cfg_tech_email') || '',
    contrat:  localStorage.getItem('cfg_contrat')    || '39',
};

export function openSettings() {
    document.getElementById('s-company').value    = cfg.company;
    document.getElementById('s-email').value      = cfg.email;
    document.getElementById('s-tech-email').value = cfg.techEmail;
    document.getElementById('s-contrat').value    = cfg.contrat;
    document.getElementById('modal-settings').classList.add('open');
}

export function fermerModal(id) { document.getElementById(id).classList.remove('open'); }

export function sauvegarderParams() {
    cfg.company   = document.getElementById('s-company').value.trim();
    cfg.email     = document.getElementById('s-email').value.trim();
    cfg.techEmail = document.getElementById('s-tech-email').value.trim();
    cfg.contrat   = document.getElementById('s-contrat').value;
    localStorage.setItem('cfg_company',    cfg.company);
    localStorage.setItem('cfg_email',      cfg.email);
    localStorage.setItem('cfg_tech_email', cfg.techEmail);
    localStorage.setItem('cfg_contrat',    cfg.contrat);
    fermerModal('modal-settings');
    calcHeures();
    if (cfg.company && cfg.email) document.getElementById('setup-notice').style.display = 'none';
}


// ══════════════════════════════════════════════════════════════
//  3. INITIALISATION
//  Point d'entrée : s'exécute une fois la page chargée.
// ══════════════════════════════════════════════════════════════

window.addEventListener('load', () => {
    document.getElementById('header-logo').src = LOGO_B64;

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    if (cfg.company && cfg.email) document.getElementById('setup-notice').style.display = 'none';

    calcHeures();

    if (!restaurerBrouillon()) {
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        const savedName = localStorage.getItem('last_tech');
        if (savedName) document.getElementById('technicien').value = savedName;
        ajouterIntervention();
    }

    document.getElementById('technicien').addEventListener('blur', () => {
        localStorage.setItem('last_tech', document.getElementById('technicien').value);
        sauvegarderBrouillon();
    });
});


// ══════════════════════════════════════════════════════════════
//  4. CALCUL DES HEURES
//  Seuil journalier, heures travaillées, heures supplémentaires.
// ══════════════════════════════════════════════════════════════

let suppManuel = false;

export function seuilJour() {
    if (cfg.contrat === '35') return 7 * 60;
    const dateVal = document.getElementById('date').value;
    if (dateVal) {
        const jour = new Date(dateVal + 'T12:00').getDay();
        return jour === 5 ? 7 * 60 : 8 * 60;
    }
    return 8 * 60;
}

export function calcHeures() {
    const debut = document.getElementById('heure-debut').value;
    const fin   = document.getElementById('heure-fin').value;
    const repas = parseInt(document.getElementById('repas').value) || 0;

    const sMin   = seuilJour();
    const sLabel = document.getElementById('seuil-label');
    if (sLabel) {
        const jourEst39Ven = cfg.contrat === '39' && sMin === 7 * 60;
        sLabel.textContent = jourEst39Ven ? '(seuil 7h — vendredi 39h)' : `(seuil ${sMin / 60}h)`;
    }

    if (!debut || !fin) return;

    const [dH, dM] = debut.split(':').map(Number);
    const [fH, fM] = fin.split(':').map(Number);

    let totalMin = (fH * 60 + fM) - (dH * 60 + dM) - repas - 60;
    if (totalMin < 0) totalMin = 0;

    const affH = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;

    document.getElementById('heures-travail').value = affH(totalMin);
    if (!suppManuel) {
        document.getElementById('heures-supp').value = affH(Math.max(0, totalMin - sMin));
    }
}

export function onSuppInput() {
    if (!suppManuel) {
        suppManuel = true;
        const input = document.getElementById('heures-supp');
        input.classList.remove('auto-field');
        input.classList.add('auto-field-manual');
        document.getElementById('btn-supp-auto').style.display = 'block';
    }
}

export function resetSuppAuto() {
    suppManuel = false;
    const input = document.getElementById('heures-supp');
    input.classList.add('auto-field');
    input.classList.remove('auto-field-manual');
    document.getElementById('btn-supp-auto').style.display = 'none';
    calcHeures();
    sauvegarderBrouillon();
}


// ══════════════════════════════════════════════════════════════
//  5. INTERVENTIONS & PAUSES
//  Création, suppression et lecture des cartes du formulaire.
// ══════════════════════════════════════════════════════════════

let intCount   = 0;
let pauseCount = 0;

export function ajouterIntervention(data = {}) {
    intCount++;
    const n = intCount;
    const div = document.createElement('div');
    div.className    = 'intervention-card';
    div.id           = `int-card-${n}`;
    div.dataset.type = 'intervention';
    div.innerHTML = `
        <div class="int-header">
            <span class="int-number">Intervention #${n}</span>
            <button class="btn-remove" onclick="supprimerElement('int-card-${n}')">&#10005; Supprimer</button>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Heure d'arrivée</label>
                <input type="time" id="i${n}-arrivee">
            </div>
            <div class="form-group">
                <label>Heure de départ</label>
                <input type="time" id="i${n}-depart">
            </div>
            <div class="form-group">
                <label>Nom du client</label>
                <input type="text" id="i${n}-client" placeholder="Nom du client" oninput="this.value=this.value.toUpperCase()">
            </div>
            <div class="form-group">
                <label>Ville</label>
                <input type="text" id="i${n}-ville" placeholder="Ville" oninput="this.value=this.value.toUpperCase()">
            </div>
            <div class="form-group">
                <label>Type d'intervention</label>
                <select id="i${n}-type">
                    <option value="">-- Sélectionner --</option>
                    <option>Sanitation</option>
                    <option>Dépannage</option>
                    <option>Installation</option>
                    <option>Devis</option>
                </select>
            </div>
            <div class="form-group">
                <label>Main d'oeuvre</label>
                <input type="text" id="i${n}-mo" placeholder="ex: 2h technicien">
            </div>
            <div class="form-group" style="grid-column:1/-1">
                <label>Détails de l'intervention</label>
                <textarea id="i${n}-details" placeholder="Décrivez l'intervention effectuée…"></textarea>
            </div>
        </div>`;
    document.getElementById('interventions-list').appendChild(div);

    if (data.arrivee) document.getElementById(`i${n}-arrivee`).value = data.arrivee;
    if (data.depart)  document.getElementById(`i${n}-depart`).value  = data.depart;
    if (data.client)  document.getElementById(`i${n}-client`).value  = data.client;
    if (data.ville)   document.getElementById(`i${n}-ville`).value   = data.ville;
    if (data.typeInt) document.getElementById(`i${n}-type`).value    = data.typeInt;
    if (data.mo)      document.getElementById(`i${n}-mo`).value      = data.mo;
    if (data.details) document.getElementById(`i${n}-details`).value = data.details;

    div.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', sauvegarderBrouillon);
    });
}

export function ajouterPause(data = {}) {
    pauseCount++;
    const n = pauseCount;
    const div = document.createElement('div');
    div.className    = 'pause-card';
    div.id           = `pause-card-${n}`;
    div.dataset.type = 'pause';
    div.innerHTML = `
        <div class="int-header">
            <span class="pause-number">&#9208; Pause</span>
            <button class="btn-remove" onclick="supprimerElement('pause-card-${n}')">&#10005; Supprimer</button>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Heure de début</label>
                <input type="time" id="p${n}-debut">
            </div>
            <div class="form-group">
                <label>Heure de fin</label>
                <input type="time" id="p${n}-fin">
            </div>
        </div>`;
    document.getElementById('interventions-list').appendChild(div);

    if (data.debut) document.getElementById(`p${n}-debut`).value = data.debut;
    if (data.fin)   document.getElementById(`p${n}-fin`).value   = data.fin;

    div.querySelectorAll('input').forEach(el => {
        el.addEventListener('input', sauvegarderBrouillon);
    });
}

export function supprimerElement(id) {
    const el = document.getElementById(id);
    if (el) { el.remove(); sauvegarderBrouillon(); }
}

export function lireTousLesElements() {
    const items = [];
    let intNum = 0;
    document.querySelectorAll('#interventions-list > div').forEach(card => {
        const rawId = card.id.replace('int-card-', '').replace('pause-card-', '');
        if (card.dataset.type === 'intervention') {
            intNum++;
            items.push({
                kind:    'intervention',
                num:     intNum,
                arrivee: document.getElementById(`i${rawId}-arrivee`)?.value  || '',
                depart:  document.getElementById(`i${rawId}-depart`)?.value   || '',
                client:  document.getElementById(`i${rawId}-client`)?.value   || '',
                ville:   document.getElementById(`i${rawId}-ville`)?.value    || '',
                typeInt: document.getElementById(`i${rawId}-type`)?.value     || '',
                mo:      document.getElementById(`i${rawId}-mo`)?.value       || '',
                details: document.getElementById(`i${rawId}-details`)?.value  || '',
            });
        } else if (card.dataset.type === 'pause') {
            items.push({
                kind:  'pause',
                debut: document.getElementById(`p${rawId}-debut`)?.value || '',
                fin:   document.getElementById(`p${rawId}-fin`)?.value   || '',
            });
        }
    });
    return items;
}


// ══════════════════════════════════════════════════════════════
//  6. BROUILLON (AUTO-SAUVEGARDE)
//  Sauvegarde continue dans localStorage ; restaurée au rechargement.
// ══════════════════════════════════════════════════════════════

export function sauvegarderBrouillon() {
    try {
        const brouillon = {
            date:       document.getElementById('date').value,
            tech:       document.getElementById('technicien').value,
            debut:      document.getElementById('heure-debut').value,
            fin:        document.getElementById('heure-fin').value,
            repas:      document.getElementById('repas').value,
            suppManuel: suppManuel,
            suppVal:    suppManuel ? document.getElementById('heures-supp').value : null,
            elements:   lireTousLesElements(),
        };
        localStorage.setItem('fdr_brouillon', JSON.stringify(brouillon));
    } catch (e) { /* quota dépassé, on ignore */ }
}

export function restaurerBrouillon() {
    try {
        const raw = localStorage.getItem('fdr_brouillon');
        if (!raw) return false;
        const d = JSON.parse(raw);

        document.getElementById('date').value        = d.date  || new Date().toISOString().split('T')[0];
        document.getElementById('technicien').value  = d.tech  || '';
        document.getElementById('heure-debut').value = d.debut || '';
        document.getElementById('heure-fin').value   = d.fin   || '';
        document.getElementById('repas').value        = d.repas || '';

        if (d.debut && d.fin) calcHeures();

        if (d.suppManuel && d.suppVal) {
            suppManuel = true;
            const input = document.getElementById('heures-supp');
            input.value = d.suppVal;
            input.classList.remove('auto-field');
            input.classList.add('auto-field-manual');
            document.getElementById('btn-supp-auto').style.display = 'block';
        }

        (d.elements || []).forEach(item => {
            if (item.kind === 'intervention') ajouterIntervention(item);
            else if (item.kind === 'pause')   ajouterPause(item);
        });

        if (!d.elements || d.elements.length === 0) ajouterIntervention();

        showToast('Brouillon restauré', 'success', 2500);
        return true;
    } catch (e) {
        return false;
    }
}

export function effacerBrouillon() {
    localStorage.removeItem('fdr_brouillon');
}


// ══════════════════════════════════════════════════════════════
//  7. HISTORIQUE
//  Sauvegarde, affichage et restauration des feuilles passées.
// ══════════════════════════════════════════════════════════════

export function sauvegarderHistorique(mode) {
    try {
        const histo = JSON.parse(localStorage.getItem('fdr_historique') || '[]');
        const data = {
            date:     document.getElementById('date').value,
            tech:     document.getElementById('technicien').value,
            debut:    document.getElementById('heure-debut').value,
            fin:      document.getElementById('heure-fin').value,
            repas:    document.getElementById('repas').value,
            travail:  document.getElementById('heures-travail').value,
            supp:     document.getElementById('heures-supp').value,
            elements: lireTousLesElements(),
        };
        histo.unshift({
            id:              Date.now(),
            date:            data.date,
            tech:            data.tech,
            nbInterventions: data.elements.filter(e => e.kind === 'intervention').length,
            mode,
            timestamp:       Date.now(),
            data,
        });
        if (histo.length > MAX_HISTO) histo.splice(MAX_HISTO);
        localStorage.setItem('fdr_historique', JSON.stringify(histo));
    } catch (e) { /* quota, on ignore */ }
}

export function ouvrirHistorique() {
    document.getElementById('modal-historique').classList.add('open');
    renderListeHistorique();
}

export function renderListeHistorique() {
    document.getElementById('histo-title').textContent = 'Historique';
    const body = document.getElementById('histo-body');
    const histo = JSON.parse(localStorage.getItem('fdr_historique') || '[]');

    if (!histo.length) {
        body.innerHTML = '<div class="histo-empty">Aucune feuille de route sauvegardée.<br>Téléchargez ou envoyez votre première feuille pour l\'y retrouver.</div>';
        return;
    }

    body.innerHTML = histo.map(entry => {
        const dateAff = entry.date
            ? new Date(entry.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
            : '—';
        const heureAff = new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const badgeClass = entry.mode === 'email' ? 'histo-badge-email' : 'histo-badge-pdf';
        const badgeLabel = entry.mode === 'email' ? '✉ Email' : '↓ PDF';
        const nbLabel = `${entry.nbInterventions} intervention${entry.nbInterventions > 1 ? 's' : ''}`;
        return `
        <div class="histo-entry" onclick="voirDetailHistorique(${entry.id})">
            <div class="histo-entry-main">
                <div class="histo-entry-date">${dateAff}</div>
                <div class="histo-entry-tech">${entry.tech || '—'}</div>
                <div class="histo-entry-meta">${nbLabel} &bull; enregistré à ${heureAff}</div>
            </div>
            <span class="histo-badge ${badgeClass}">${badgeLabel}</span>
            <button class="btn-histo-del" title="Supprimer" onclick="supprimerHistorique(event, ${entry.id})">&#128465;</button>
        </div>`;
    }).join('');
}

export function voirDetailHistorique(id) {
    const histo = JSON.parse(localStorage.getItem('fdr_historique') || '[]');
    const entry = histo.find(e => e.id === id);
    if (!entry) return;

    const d = entry.data;
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
        <button class="histo-detail-back" onclick="renderListeHistorique()">&#8592; Retour</button>

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

        <button class="btn-restaurer" onclick="restaurerDepuisHistorique(${id})">
            &#8635; Restaurer cette feuille
        </button>`;
}

export function supprimerHistorique(event, id) {
    event.stopPropagation();
    if (!confirm('Supprimer cette entrée de l\'historique ?')) return;
    const histo = JSON.parse(localStorage.getItem('fdr_historique') || '[]');
    localStorage.setItem('fdr_historique', JSON.stringify(histo.filter(e => e.id !== id)));
    renderListeHistorique();
}

export function restaurerDepuisHistorique(id) {
    const histo = JSON.parse(localStorage.getItem('fdr_historique') || '[]');
    const entry = histo.find(e => e.id === id);
    if (!entry) return;
    if (!confirm('Restaurer cette feuille ? Le formulaire en cours sera remplacé.')) return;

    fermerModal('modal-historique');

    document.getElementById('interventions-list').innerHTML = '';
    intCount   = 0;
    pauseCount = 0;

    const d = entry.data;
    suppManuel = false;
    const suppInput = document.getElementById('heures-supp');
    suppInput.classList.add('auto-field');
    suppInput.classList.remove('auto-field-manual');
    document.getElementById('btn-supp-auto').style.display = 'none';
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


// ══════════════════════════════════════════════════════════════
//  8. NOUVELLE FEUILLE
//  Réinitialise complètement le formulaire.
// ══════════════════════════════════════════════════════════════

export function nouvelleFeuille() {
    if (!confirm('Effacer la feuille de route en cours et recommencer à zéro ?')) return;
    effacerBrouillon();
    suppManuel = false;
    const suppInput = document.getElementById('heures-supp');
    suppInput.classList.add('auto-field');
    suppInput.classList.remove('auto-field-manual');
    document.getElementById('btn-supp-auto').style.display = 'none';
    document.getElementById('date').value           = new Date().toISOString().split('T')[0];
    document.getElementById('heure-debut').value    = '';
    document.getElementById('heure-fin').value      = '';
    document.getElementById('repas').value          = '';
    document.getElementById('heures-travail').value = '';
    document.getElementById('heures-supp').value    = '';
    document.getElementById('interventions-list').innerHTML = '';
    intCount   = 0;
    pauseCount = 0;
    ajouterIntervention();
}


// ══════════════════════════════════════════════════════════════
//  EXPOSITION GLOBALE
//  Les onclick= dans le HTML statique et généré dynamiquement
//  nécessitent que ces fonctions soient accessibles sur window.
// ══════════════════════════════════════════════════════════════

Object.assign(window, {
    openSettings, fermerModal, sauvegarderParams,
    calcHeures, onSuppInput, resetSuppAuto, sauvegarderBrouillon,
    ajouterIntervention, ajouterPause, supprimerElement,
    genererPDF, envoyerMail, nouvelleFeuille,
    ouvrirHistorique, renderListeHistorique,
    voirDetailHistorique, supprimerHistorique, restaurerDepuisHistorique,
});
