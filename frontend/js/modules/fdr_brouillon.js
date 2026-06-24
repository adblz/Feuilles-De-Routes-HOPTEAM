import { showToast } from '../utils/utils.js';
import { getSuppManuel, setSuppManuel, calcHeures } from './fdr_calculs.js';
import { ajouterIntervention, ajouterPause, lireTousLesElements } from './fdr_form.js';

// Auto-sauvegarde à chaque modification du formulaire
document.addEventListener('form:changed', () => sauvegarderBrouillon());

// ── Brouillons ─────────────────────────────────────────────────

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

export function sauvegarderBrouillon() {
    try {
        const date = document.getElementById('date').value;
        if (!date) return;
        const brouillon = {
            date,
            debut:      document.getElementById('heure-debut').value,
            fin:        document.getElementById('heure-fin').value,
            repas:      document.getElementById('repas').value,
            suppManuel: getSuppManuel(),
            suppVal:    getSuppManuel() ? document.getElementById('heures-supp').value : null,
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
        document.getElementById('heure-debut').value = d.debut || '';
        document.getElementById('heure-fin').value   = d.fin   || '';
        document.getElementById('repas').value        = d.repas || '';

        if (d.debut && d.fin) calcHeures();

        if (d.suppManuel && d.suppVal) {
            setSuppManuel(true);
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
