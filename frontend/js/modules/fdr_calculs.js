import { affH } from '../utils/utils.js';
import { cfg } from './fdr_config.js';
import { calcHeuresNuit } from './heures_calculs.js';

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

// Durée du rappel en minutes (lu directement dans le DOM pour éviter
// un import circulaire avec fdr_form.js). 0 si non rempli ou incohérent.
function dureeRappel() {
    const rd = document.getElementById('rappel-debut')?.value;
    const rf = document.getElementById('rappel-fin')?.value;
    if (!rd || !rf) return 0;
    const [rdH, rdM] = rd.split(':').map(Number);
    const [rfH, rfM] = rf.split(':').map(Number);
    let min = (rfH * 60 + rfM) - (rdH * 60 + rdM);
    if (min < 0) min += 1440;   // passage de minuit (ex. 23h→1h)
    return min > 0 ? min : 0;
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

    const debutMin = dH * 60 + dM;
    let   finMin   = fH * 60 + fM;
    if (finMin <= debutMin) finMin += 1440;   // passage de minuit (retour après 00h)

    const astreinteJour = document.getElementById('astreinte-jour')?.checked;
    const trajetMin     = astreinteJour ? 0 : 60;   // astreinte : aucun trajet retiré
    let totalMin = finMin - debutMin - repas - trajetMin;   // −60 = 30 min matin + 30 min soir
    if (totalMin < 0) totalMin = 0;

    // Rappel / sortie supplémentaire : on ajoute la 2ᵉ plage horaire.
    // Le « trou » entre la journée et le rappel n'est jamais saisi, donc jamais compté.
    totalMin += dureeRappel();

    document.getElementById('heures-travail').value = affH(totalMin);
    if (!suppManuel) {
        document.getElementById('heures-supp').value = affH(Math.max(0, totalMin - sMin));
    }

    // Nuit = journée principale (avec trajet) + rappel éventuel (compté en entier)
    const rDebut   = document.getElementById('rappel-debut')?.value;
    const rFin     = document.getElementById('rappel-fin')?.value;
    const nuitMin  = calcHeuresNuit(debut, fin, !astreinteJour) + calcHeuresNuit(rDebut, rFin, false);
    const nuitEl   = document.getElementById('heures-nuit');
    const nuitGrp  = document.getElementById('heures-nuit-group');
    if (nuitEl && nuitGrp) {
        nuitEl.value = nuitMin > 0 ? affH(nuitMin) : '';
        nuitGrp.style.display = nuitMin > 0 ? '' : 'none';
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
