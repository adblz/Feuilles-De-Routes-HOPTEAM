import { showToast } from '../utils/utils.js';
import { getSuppManuel, setSuppManuel, calcHeures } from './fdr_calculs.js';
import { ajouterIntervention, ajouterPause, lireTousLesElements, remplirRappel } from './fdr_form.js';
import { collapserApresRestauration } from './fdr_collapse.js';

// Auto-sauvegarde à chaque modification du formulaire
document.addEventListener('form:changed', () => sauvegarderBrouillon());

// Sauvegarde immédiate (avec la position de scroll exacte) quand l'utilisateur
// quitte l'appli (verrouille le téléphone, ferme l'onglet...), mais uniquement
// si le formulaire est bien la vue affichée à ce moment-là.
function formulaireEstVisible() {
    const vue = document.getElementById('vue-formulaire');
    return !!vue && !vue.classList.contains('hidden');
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && formulaireEstVisible()) sauvegarderBrouillon();
});
window.addEventListener('pagehide', () => {
    if (formulaireEstVisible()) sauvegarderBrouillon();
});

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
            astreinteJour: document.getElementById('astreinte-jour')?.checked || false,
            suppManuel: getSuppManuel(),
            suppVal:    getSuppManuel() ? document.getElementById('heures-supp').value : null,
            elements:   lireTousLesElements(),
            scrollY:    window.scrollY,
        };
        localStorage.setItem(`fdr_brouillon_${date}`, JSON.stringify(brouillon));
    } catch (e) {}
}

export function restaurerBrouillon(dateISO) {
    try {
        const raw = localStorage.getItem(`fdr_brouillon_${dateISO}`);
        if (!raw) return 0;
        const d = JSON.parse(raw);

        document.getElementById('date').value        = dateISO;
        document.getElementById('heure-debut').value = d.debut || '';
        document.getElementById('heure-fin').value   = d.fin   || '';
        document.getElementById('repas').value        = d.repas || '';
        document.getElementById('astreinte-jour').checked = !!d.astreinteJour;

        if (d.debut && d.fin) calcHeures();

        if (d.suppManuel && d.suppVal) {
            setSuppManuel(true);
            const input = document.getElementById('heures-supp');
            input.value = d.suppVal;
            input.classList.remove('auto-field');
            input.classList.add('auto-field-manual');
            document.getElementById('btn-supp-auto').style.display = 'block';
        }

        let aRappel = false;
        (d.elements || []).forEach(item => {
            if (item.kind === 'intervention') ajouterIntervention(item);
            else if (item.kind === 'pause')   ajouterPause(item);
            else if (item.kind === 'rappel')  { remplirRappel(item); aRappel = true; }
        });

        const interventionsEtPauses = (d.elements || []).filter(e => e.kind !== 'rappel');
        if (interventionsEtPauses.length === 0) ajouterIntervention();
        collapserApresRestauration();

        // Le rappel est rempli après le 1er calcHeures : on recalcule pour l'inclure.
        if (aRappel && d.debut && d.fin) calcHeures();

        showToast('Brouillon restauré', 'success', 2500);
        return typeof d.scrollY === 'number' ? d.scrollY : 0;
    } catch (e) {
        return 0;
    }
}

export function effacerBrouillon(dateISO) {
    if (dateISO) localStorage.removeItem(`fdr_brouillon_${dateISO}`);
}
