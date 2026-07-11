import { chargerPeriodesPaie, creerPeriodePaie, modifierPeriodePaie, supprimerPeriodePaie } from './db_planning.js';
import { initPlanningUI, renderTableauPlanning, ouvrirModalCreer } from './admin_planning_ui.js';
import { showToast } from '../utils/utils.js';

export async function initPlanning() {
    document.getElementById('btn-planning-nouveau').addEventListener('click', ouvrirModalCreer);
    initPlanningUI({ onCreer, onModifier, onSupprimer });
    await chargerEtAfficher();
}

async function chargerEtAfficher() {
    try {
        const periodes = await chargerPeriodesPaie();
        renderTableauPlanning(periodes);
    } catch (e) {
        showToast('Erreur de chargement du planning : ' + e.message, 'warn');
    }
}

async function onCreer(data) {
    try {
        await creerPeriodePaie(data);
        showToast('Période ajoutée', 'success');
        await chargerEtAfficher();
    } catch (e) {
        showToast('Erreur : ' + e.message, 'warn');
    }
}

async function onModifier(id, data) {
    try {
        await modifierPeriodePaie(id, data);
        showToast('Période modifiée', 'success');
        await chargerEtAfficher();
    } catch (e) {
        showToast('Erreur : ' + e.message, 'warn');
    }
}

async function onSupprimer(id) {
    try {
        await supprimerPeriodePaie(id);
        showToast('Période supprimée', 'success');
        await chargerEtAfficher();
    } catch (e) {
        showToast('Erreur : ' + e.message, 'warn');
    }
}
