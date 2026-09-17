// Ordre des cartes de l'accueil (heures supp, clients, carnet de route).
// Chaque carte de #dash-cartes porte un data-bloc et une poignée « ≡ » :
// on la glisse pour la déplacer, et l'ordre choisi est mémorisé sur l'appareil.
import { activerDragCarte } from './fdr_dragdrop.js';

const CLE_ORDRE = 'fdr_dash_ordre';

function lireOrdre() {
    try {
        const v = JSON.parse(localStorage.getItem(CLE_ORDRE) || '[]');
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

function sauverOrdre(liste) {
    const ordre = Array.from(liste.children).map(c => c.dataset.bloc).filter(Boolean);
    try { localStorage.setItem(CLE_ORDRE, JSON.stringify(ordre)); } catch { /* stockage indisponible */ }
}

// Replace les cartes selon l'ordre mémorisé ; les cartes inconnues (nouvelles)
// restent à leur place par défaut, à la fin.
function appliquerOrdre(liste) {
    const ordre = lireOrdre();
    if (!ordre.length) return;
    const cartes = Array.from(liste.children);
    const connues = ordre.map(b => cartes.find(c => c.dataset.bloc === b)).filter(Boolean);
    const autres  = cartes.filter(c => !connues.includes(c));
    [...connues, ...autres].forEach(c => liste.appendChild(c));
}

export function initOrdreDashboard() {
    const liste = document.getElementById('dash-cartes');
    if (!liste) return;

    appliquerOrdre(liste);

    for (const carte of liste.children) {
        const poignee = carte.querySelector('.dash-drag');
        if (!poignee) continue;
        // La poignée est dans une carte cliquable : un clic dessus ne doit pas ouvrir la carte.
        poignee.addEventListener('click', e => e.stopPropagation());
        activerDragCarte(carte, poignee, () => sauverOrdre(liste));
    }
}
