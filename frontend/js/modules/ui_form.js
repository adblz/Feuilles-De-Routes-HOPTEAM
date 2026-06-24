import { effacerBrouillon, viderInterventions, resetSuppState, calcHeures, ajouterIntervention } from './fdr.js';

export function reinitialiserFeuille(dateISO) {
    const targetDate = dateISO || new Date().toISOString().split('T')[0];
    effacerBrouillon(targetDate);
    viderInterventions();
    resetSuppState();

    document.getElementById('date').value           = targetDate;
    document.getElementById('heure-debut').value    = '';
    document.getElementById('heure-fin').value      = '';
    document.getElementById('repas').value          = '';
    document.getElementById('heures-travail').value = '';
    document.getElementById('heures-supp').value    = '';

    ajouterIntervention();
    calcHeures();
}

export function nouvelleFeuille() {
    if (!confirm('Effacer la feuille de route en cours et recommencer à zéro ?')) return;
    reinitialiserFeuille(document.getElementById('date').value || undefined);
}
