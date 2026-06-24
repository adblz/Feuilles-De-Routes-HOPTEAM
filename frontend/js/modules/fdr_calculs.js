import { affH } from '../utils/utils.js';
import { cfg } from './fdr_config.js';

// ── État heures supplémentaires ────────────────────────────────

let suppManuel = false;
export function getSuppManuel() { return suppManuel; }
export function setSuppManuel(v) { suppManuel = v; }

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
    document.dispatchEvent(new CustomEvent('form:changed'));
}
