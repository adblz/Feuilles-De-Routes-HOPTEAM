import { calcHeures, setSuppManuel } from './fdr_calculs.js';
import {
    ajouterIntervention, ajouterPause, remplirRappel,
    viderInterventions, resetSuppState,
} from './fdr_form.js';
import { sauvegarderBrouillon } from './fdr_brouillon.js';
import { hhmm } from '../utils/utils.js';
import { collapserApresRestauration } from './fdr_collapse.js';

// Remplit le formulaire à partir d'une feuille Supabase + ses éléments.
// Partagé par la restauration depuis l'historique et le bouton « Modifier » du résumé.
export function remplirFormulaireDepuisFeuille(feuille, elements) {
    viderInterventions();
    resetSuppState();

    document.getElementById('date').value        = feuille.date        || '';
    document.getElementById('heure-debut').value = hhmm(feuille.heure_debut) || '';
    document.getElementById('heure-fin').value   = hhmm(feuille.heure_fin)   || '';
    document.getElementById('repas').value        = feuille.repas_min ? String(feuille.repas_min) : '';
    document.getElementById('astreinte-jour').checked = !!feuille.astreinte;

    (elements || []).forEach(el => {
        if (el.kind === 'intervention') {
            ajouterIntervention({
                arrivee: hhmm(el.heure_arrivee) || '',
                depart:  hhmm(el.heure_depart)  || '',
                client:  el.client        || '',
                ville:   el.ville         || '',
                typeInt: el.type_int      || '',
                mo:      el.mo            || '',
                becs:    el.becs != null ? String(el.becs) : '',
                details: el.details       || '',
            });
        } else if (el.kind === 'pause') {
            ajouterPause({ debut: hhmm(el.pause_debut) || '', fin: hhmm(el.pause_fin) || '' });
        } else if (el.kind === 'rappel') {
            remplirRappel({ debut: hhmm(el.pause_debut) || '', fin: hhmm(el.pause_fin) || '', astreinte: el.astreinte });
        }
    });

    const interventionsEtPauses = (elements || []).filter(e => e.kind !== 'rappel');
    if (!interventionsEtPauses.length) ajouterIntervention();
    collapserApresRestauration();

    // Calcul après remplissage pour inclure l'éventuel rappel.
    if (feuille.heure_debut && feuille.heure_fin) calcHeures();

    // Restaure une éventuelle correction manuelle des heures supp
    // (sinon le calcul auto ci-dessus écraserait la valeur enregistrée).
    const inputSupp = document.getElementById('heures-supp');
    const stocke = feuille.heures_supp || '';
    if (stocke && stocke !== inputSupp.value) {
        inputSupp.value = stocke;
        setSuppManuel(true);
        inputSupp.classList.remove('auto-field');
        inputSupp.classList.add('auto-field-manual');
        document.getElementById('btn-supp-auto').style.display = 'block';
    }

    sauvegarderBrouillon();
}
