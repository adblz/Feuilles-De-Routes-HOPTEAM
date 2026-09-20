import { affH, affHSigne, normaliserDuree, parseDuree, showToast } from '../utils/utils.js';
import { cfg } from './fdr_config.js';
import { calcHeuresNuit } from './heures_nuit.js';
import { seuilJourEffectif } from './seuil_jour.js';
import { estFerie } from './jours_feries.js';

// ── État « heures travaillées corrigées à la main » ────────────
//
// Le technicien peut corriger ses heures travaillées (ex. 30 min passées à
// discuter avec un client, non comptées comme pause). C'est cette valeur qui
// est enregistrée et qui sert à TOUS les calculs d'heures supp. Les heures
// supp du jour ne sont qu'un affichage : travaillé − seuil du jour.

let travailManuel = false;
export function getTravailManuel() { return travailManuel; }
export function setTravailManuel(v) { travailManuel = v; }

// ── Calcul des heures ──────────────────────────────────────────

// Seuil du jour affiché dans le formulaire (0 le week-end et les fériés).
export function seuilJour() {
    return seuilJourEffectif(document.getElementById('date')?.value, cfg.contrat);
}

function labelSeuil(dateStr, sMin) {
    if (!dateStr) return `(seuil ${sMin / 60}h)`;
    const jour = new Date(dateStr + 'T12:00').getDay();
    if (jour === 0 || jour === 6) return '(week-end : tout compte)';
    if (estFerie(dateStr))         return '(férié : tout compte)';
    if (cfg.contrat === '39' && jour === 5) return '(seuil 7h — vendredi 39h)';
    return `(seuil ${sMin / 60}h)`;
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

// Heures supp. du jour = heures travaillées (corrigées ou non) − seuil du jour.
function majSuppJour() {
    const travailMin = parseDuree(document.getElementById('heures-travail').value);
    document.getElementById('heures-supp').value = affHSigne(travailMin - seuilJour());
}

export function calcHeures() {
    const debut = document.getElementById('heure-debut').value;
    const fin   = document.getElementById('heure-fin').value;
    const repas = parseInt(document.getElementById('repas').value) || 0;

    const sMin   = seuilJour();
    const sLabel = document.getElementById('seuil-label');
    if (sLabel) sLabel.textContent = labelSeuil(document.getElementById('date')?.value, sMin);

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

    if (!travailManuel) document.getElementById('heures-travail').value = affH(totalMin);
    majSuppJour();

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

// ── Correction manuelle des heures travaillées ─────────────────

function afficherModeManuel(manuel) {
    const input = document.getElementById('heures-travail');
    input.classList.toggle('auto-field', !manuel);
    input.classList.toggle('auto-field-manual', manuel);
    document.getElementById('btn-travail-auto').style.display = manuel ? 'block' : 'none';
}

export function onTravailInput() {
    if (travailManuel) return;
    travailManuel = true;
    afficherModeManuel(true);
}

// Vérifie la saisie à la sortie du champ : corrige ce qui est corrigeable,
// sinon revient au calcul automatique avec un message.
export function validerTravailInput() {
    if (!travailManuel) return;
    const input = document.getElementById('heures-travail');
    const res = normaliserDuree(input.value);
    if (res.ok) {
        input.value = res.value;
        majSuppJour();
    } else {
        showToast('Heures travaillées non valides — retour au calcul automatique (format : 7h30)', 'warn', 4000);
        resetTravailAuto();
    }
}

// Restaure une valeur corrigée (feuille rechargée, brouillon) sans repasser
// par le calcul automatique.
export function restaurerTravailManuel(valeur) {
    travailManuel = true;
    afficherModeManuel(true);
    document.getElementById('heures-travail').value = valeur;
    majSuppJour();
}

export function resetTravailAuto() {
    travailManuel = false;
    afficherModeManuel(false);
    document.getElementById('heures-travail').value = '';
    document.getElementById('heures-supp').value    = '';
    calcHeures();
    document.dispatchEvent(new CustomEvent('form:changed'));
}
