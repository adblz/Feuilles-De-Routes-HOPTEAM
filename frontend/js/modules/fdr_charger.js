import { calcHeures } from './fdr_calculs.js';
import {
    ajouterIntervention, ajouterPause, remplirRappel,
    viderInterventions, resetSuppState,
} from './fdr_form.js';
import { sauvegarderBrouillon } from './fdr_brouillon.js';

// Remplit le formulaire à partir d'une feuille Supabase + ses éléments.
// Partagé par la restauration depuis l'historique et le bouton « Modifier » du résumé.
export function remplirFormulaireDepuisFeuille(feuille, elements) {
    viderInterventions();
    resetSuppState();

    document.getElementById('date').value        = feuille.date        || '';
    document.getElementById('heure-debut').value = feuille.heure_debut || '';
    document.getElementById('heure-fin').value   = feuille.heure_fin   || '';
    document.getElementById('repas').value        = feuille.repas_min ? String(feuille.repas_min) : '';

    (elements || []).forEach(el => {
        if (el.kind === 'intervention') {
            ajouterIntervention({
                arrivee: el.heure_arrivee || '',
                depart:  el.heure_depart  || '',
                client:  el.client        || '',
                ville:   el.ville         || '',
                typeInt: el.type_int      || '',
                mo:      el.mo            || '',
                becs:    el.becs != null ? String(el.becs) : '',
                details: el.details       || '',
            });
        } else if (el.kind === 'pause') {
            ajouterPause({ debut: el.pause_debut || '', fin: el.pause_fin || '' });
        } else if (el.kind === 'rappel') {
            remplirRappel({ debut: el.pause_debut || '', fin: el.pause_fin || '' });
        }
    });

    const interventionsEtPauses = (elements || []).filter(e => e.kind !== 'rappel');
    if (!interventionsEtPauses.length) ajouterIntervention();

    // Calcul après remplissage pour inclure l'éventuel rappel.
    if (feuille.heure_debut && feuille.heure_fin) calcHeures();

    sauvegarderBrouillon();
}
