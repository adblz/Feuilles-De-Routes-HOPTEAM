import { showToast } from '../utils/utils.js';
import { attachAutocomplete, memoriserValeurs, VILLES_KEY, CLIENTS_KEY } from './autocomplete.js';

// Migration unique : l'ancienne clé "fdr_brouillon" (un seul brouillon) devient "fdr_brouillon_AAAA-MM-JJ".
(function() {
    const ancien = localStorage.getItem('fdr_brouillon');
    if (!ancien) return;
    try {
        const d = JSON.parse(ancien);
        if (d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
            const newKey = `fdr_brouillon_${d.date}`;
            if (!localStorage.getItem(newKey)) localStorage.setItem(newKey, ancien);
        }
    } catch (e) {}
    localStorage.removeItem('fdr_brouillon');
})();

// ── Constantes ─────────────────────────────────────────────────

const LOGO_B64 = 'data:image/png;base64,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';

export function getLogoBase64() { return LOGO_B64; }

// ── Configuration ──────────────────────────────────────────────

export let cfg = {
    company:   localStorage.getItem('cfg_company')    || '',
    email:     localStorage.getItem('cfg_email')      || '',
    contrat:   localStorage.getItem('cfg_contrat')    || '39',
};

export function saveCfg(company, email, contrat) {
    cfg.company   = company;
    cfg.email     = email;
    cfg.contrat   = contrat;
    localStorage.setItem('cfg_company',    cfg.company);
    localStorage.setItem('cfg_email',      cfg.email);
    localStorage.setItem('cfg_contrat',    cfg.contrat);
}

// ── État interne ───────────────────────────────────────────────

let suppManuel = false;
let intCount   = 0;
let pauseCount = 0;

// ── Calcul des heures ──────────────────────────────────────────

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

// ── Interventions & Pauses ─────────────────────────────────────

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
            <div class="int-actions">
                <button class="btn-move btn-move-up" title="Monter">&#9650;</button>
                <button class="btn-move btn-move-down" title="Descendre">&#9660;</button>
                <button class="btn-remove">&#10005; Supprimer</button>
            </div>
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
                <input type="text" id="i${n}-client" placeholder="Nom du client" class="uppercase-input">
            </div>
            <div class="form-group">
                <label>Ville</label>
                <input type="text" id="i${n}-ville" placeholder="Ville" class="uppercase-input">
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
                <select id="i${n}-mo">
                    <option value="">-- Durée --</option>
                    <option value="0h30">0h30</option>
                    <option value="1h00">1h00</option>
                    <option value="1h30">1h30</option>
                    <option value="2h00">2h00</option>
                    <option value="2h30">2h30</option>
                    <option value="3h00">3h00</option>
                    <option value="3h30">3h30</option>
                    <option value="4h00">4h00</option>
                    <option value="4h30">4h30</option>
                    <option value="5h00">5h00</option>
                    <option value="5h30">5h30</option>
                    <option value="6h00">6h00</option>
                    <option value="6h30">6h30</option>
                    <option value="7h00">7h00</option>
                    <option value="7h30">7h30</option>
                    <option value="8h00">8h00</option>
                </select>
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

    div.querySelector('.btn-remove').addEventListener('click', () => supprimerElement(`int-card-${n}`));
    div.querySelector('.btn-move-up').addEventListener('click', () => deplacerElement(div, -1));
    div.querySelector('.btn-move-down').addEventListener('click', () => deplacerElement(div, 1));

    div.querySelectorAll('.uppercase-input').forEach(el => {
        el.addEventListener('input', () => { el.value = el.value.toUpperCase(); });
    });

    attachAutocomplete(document.getElementById(`i${n}-client`), CLIENTS_KEY);
    attachAutocomplete(document.getElementById(`i${n}-ville`),  VILLES_KEY);

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
            <div class="int-actions">
                <button class="btn-move btn-move-up" title="Monter">&#9650;</button>
                <button class="btn-move btn-move-down" title="Descendre">&#9660;</button>
                <button class="btn-remove">&#10005; Supprimer</button>
            </div>
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

    div.querySelector('.btn-remove').addEventListener('click', () => supprimerElement(`pause-card-${n}`));
    div.querySelector('.btn-move-up').addEventListener('click', () => deplacerElement(div, -1));
    div.querySelector('.btn-move-down').addEventListener('click', () => deplacerElement(div, 1));

    div.querySelectorAll('input').forEach(el => {
        el.addEventListener('input', sauvegarderBrouillon);
    });
}

export function supprimerElement(id) {
    const el = document.getElementById(id);
    if (el) { el.remove(); renumeroterInterventions(); sauvegarderBrouillon(); }
}

// Déplace une carte (intervention ou pause) d'un cran vers le haut (-1) ou le bas (1).
export function deplacerElement(card, direction) {
    const list = document.getElementById('interventions-list');
    if (direction < 0) {
        const prev = card.previousElementSibling;
        if (prev) list.insertBefore(card, prev);
    } else {
        const next = card.nextElementSibling;
        if (next) list.insertBefore(next, card);
    }
    renumeroterInterventions();
    sauvegarderBrouillon();
}

// Remet à jour les numéros « Intervention #N » selon l'ordre affiché.
function renumeroterInterventions() {
    let n = 0;
    document.querySelectorAll('#interventions-list > div').forEach(card => {
        if (card.dataset.type === 'intervention') {
            n++;
            const lbl = card.querySelector('.int-number');
            if (lbl) lbl.textContent = `Intervention #${n}`;
        }
    });
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

// ── Brouillon ──────────────────────────────────────────────────

export function sauvegarderBrouillon() {
    try {
        const date = document.getElementById('date').value;
        if (!date) return;
        const brouillon = {
            date,
            tech:       document.getElementById('technicien').value,
            debut:      document.getElementById('heure-debut').value,
            fin:        document.getElementById('heure-fin').value,
            repas:      document.getElementById('repas').value,
            suppManuel,
            suppVal:    suppManuel ? document.getElementById('heures-supp').value : null,
            elements:   lireTousLesElements(),
        };
        localStorage.setItem(`fdr_brouillon_${date}`, JSON.stringify(brouillon));
    } catch (e) {}
}

export function restaurerBrouillon(dateISO) {
    try {
        const raw = localStorage.getItem(`fdr_brouillon_${dateISO}`);
        if (!raw) return false;
        const d = JSON.parse(raw);

        document.getElementById('date').value        = dateISO;
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

export function effacerBrouillon(dateISO) {
    if (dateISO) localStorage.removeItem(`fdr_brouillon_${dateISO}`);
}

export function getBrouillonsDates() {
    const dates = new Set();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fdr_brouillon_')) {
            const date = key.slice('fdr_brouillon_'.length);
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
        }
    }
    return dates;
}

// ── Helpers de réinitialisation (utilisés par ui.js) ──────────

export function viderInterventions() {
    document.getElementById('interventions-list').innerHTML = '';
    intCount   = 0;
    pauseCount = 0;
}

export function resetSuppState() {
    suppManuel = false;
    const input = document.getElementById('heures-supp');
    input.classList.add('auto-field');
    input.classList.remove('auto-field-manual');
    document.getElementById('btn-supp-auto').style.display = 'none';
}
