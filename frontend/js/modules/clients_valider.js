import { showToast, isoLocal } from '../utils/utils.js';
import { scrollVersCarte, sansBougerAEcran } from '../utils/scroll.js';
import { chargerHistorique } from './db.js';
import { getBrouillonsDates, ajouterIntervention } from './fdr.js';
import { finaliserBrouillon, ouvrirNouvelleFeuille } from './dashboard.js';
import { collapserToutesSauf, expanderCarte } from './fdr_collapse.js';

// ── « Valider ce client » : ajoute le client à la feuille de route du jour ──
// Le client arrive pré-rempli (nom, ville, type Sanitation, nombre de becs =
// total de ses postes) ; le technicien n'a plus qu'à saisir les heures,
// corriger les becs et commenter. Les ids de ses postes (planningId, séparés
// par des virgules) suivent la carte jusqu'à l'enregistrement, où ils
// servent à les marquer « faits » ensemble.

// Numéro interne de la carte (« int-card-7 » → « 7 »).
const numCarte = (card) => card.id.replace('int-card-', '');

// Une feuille neuve contient une intervention vide : on la remplit plutôt
// que d'en ajouter une deuxième.
function derniereCarteVide() {
    const cartes = document.querySelectorAll('#interventions-list > .intervention-card');
    const card = cartes[cartes.length - 1];
    if (!card) return null;
    const n = numCarte(card);
    const vide = ['arrivee', 'depart', 'client', 'ville', 'details']
        .every(champ => !(document.getElementById(`i${n}-${champ}`)?.value));
    const sansType = !card.querySelector('.type-btn.active');
    return (vide && sansType && !card.dataset.planningId) ? card : null;
}

function remplirCarte(card, row) {
    const n = numCarte(card);
    document.getElementById(`i${n}-client`).value = (row.nom_pdv || '').toUpperCase();
    document.getElementById(`i${n}-ville`).value  = (row.ville || '').toUpperCase();
    // Le clic active « Sanitation », affiche le champ becs et prévient le brouillon.
    const btnSanitation = card.querySelector('.type-btn[data-value="Sanitation"]');
    if (btnSanitation && !btnSanitation.classList.contains('active')) btnSanitation.click();
    document.getElementById(`i${n}-becs`).value = row.tirage || '';
    card.dataset.planningId = row.planningId;
}

function prefill(row) {
    return {
        client:     (row.nom_pdv || '').toUpperCase(),
        ville:      (row.ville || '').toUpperCase(),
        typeInt:    'Sanitation',
        becs:       row.tirage || '',
        planningId: row.planningId,
    };
}

// La feuille d'aujourd'hui est-elle déjà enregistrée dans l'historique ?
async function feuilleDuJourEnregistree(today) {
    try {
        const historique = await chargerHistorique();
        return historique.some(f => f.date === today);
    } catch {
        return false; // hors ligne : on laisse faire, le brouillon reste local
    }
}

export async function validerClient(row) {
    if (!row) return;
    const today = isoLocal(new Date());

    if (await feuilleDuJourEnregistree(today)) {
        showToast('La feuille d\'aujourd\'hui est déjà enregistrée : modifie-la depuis le résumé', 'warn', 5000);
        return;
    }

    // Ouvre la feuille du jour : brouillon existant, sinon feuille neuve
    // (pas de confirmation possible ici : aucun brouillon pour cette date).
    if (getBrouillonsDates().has(today)) finaliserBrouillon(today);
    else ouvrirNouvelleFeuille(today);

    let card = derniereCarteVide();
    if (card) remplirCarte(card, row);
    else card = ajouterIntervention(prefill(row));

    // Même enchaînement que « + Ajouter une intervention » : on défile jusqu'à
    // la carte, puis on replie les autres une fois arrivé (sans saut visible).
    expanderCarte(card);
    scrollVersCarte(card, () => sansBougerAEcran(card, () => collapserToutesSauf(card)));
    // Sauvegarde immédiate du brouillon : le client sort aussitôt du listing.
    document.dispatchEvent(new CustomEvent('form:changed'));

    showToast('Client ajouté à la feuille du jour', 'success', 3000);
}
