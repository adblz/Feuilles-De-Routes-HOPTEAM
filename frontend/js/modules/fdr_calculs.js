import { affH, normaliserSupp, showToast } from '../utils/utils.js';
import { cfg } from './fdr_config.js';
import { calcHeuresNuit } from './heures_calculs.js';
import { seuilJourPour } from './seuil_jour.js';

// ── État heures supplémentaires ────────────────────────────────

let suppManuel = false;
export function getSuppManuel() { return suppManuel; }
export function setSuppManuel(v) { suppManuel = v; }

// ── Calcul des heures ──────────────────────────────────────────

// Seuil du jour affiché dans le formulaire : la date vient du champ « date »,
// le calcul lui-même vit dans seuil_jour.js (partagé avec le tableau de bord).
export function seuilJour() {
    return seuilJourPour(document.getElementById('date')?.value, cfg.contrat);
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
    // Trajet retiré = réglage de l'entreprise (cfg.trajetMinutes, 60 par défaut ;
    // 0 pour une entreprise comme DAV). En astreinte : aucun trajet retiré.
    const trajetMin     = astreinteJour ? 0 : cfg.trajetMinutes;
    let totalMin = finMin - debutMin - repas - trajetMin;   // trajet = 30 min matin + 30 min soir par défaut
    if (totalMin < 0) totalMin = 0;

    // Rappel / sortie supplémentaire : on ajoute la 2ᵉ plage horaire.
    // Le « trou » entre la journée et le rappel n'est jamais saisi, donc jamais compté.
    totalMin += dureeRappel();

    document.getElementById('heures-travail').value = affH(totalMin);
    if (!suppManuel) {
        document.getElementById('heures-supp').value = affH(Math.max(0, totalMin - sMin));
    }

    // Nuit = journée principale + rappel éventuel (compté en entier).
    // Marge non comptée à chaque bout = moitié du trajet du jour (trajet 60 → 30
    // matin + 30 soir ; trajet 90 → 45 + 45). Rappel : aucune marge (0).
    const rDebut   = document.getElementById('rappel-debut')?.value;
    const rFin     = document.getElementById('rappel-fin')?.value;
    const nuitMin  = calcHeuresNuit(debut, fin, trajetMin / 2) + calcHeuresNuit(rDebut, rFin, 0);
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

// Vérifie la saisie manuelle à la sortie du champ : corrige ce qui est
// corrigeable, sinon revient au calcul automatique avec un message.
export function validerSuppInput() {
    if (!suppManuel) return;
    const input = document.getElementById('heures-supp');
    const res = normaliserSupp(input.value);
    if (res.ok) {
        input.value = res.value;
    } else {
        showToast('Heures supp. non valides — retour au calcul automatique (format : 3h00)', 'warn', 4000);
        resetSuppAuto();
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
