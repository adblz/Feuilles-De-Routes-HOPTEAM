import { isoLocal } from '../utils/utils.js';
import { restaurerBrouillon, viderInterventions, cfg, getBrouillonsDates } from './fdr.js';
import { reinitialiserFeuille } from './ui.js';
import { initCalendrier, rendreCalendrierMois, resetCalOffset, initCalNav } from './dashboard_calendar.js';
import { rendreHeuresSupp } from './dashboard_stats.js';
import { majClientsCard, initClientsCard } from './dashboard_clients.js';
import { initOrdreDashboard } from './dashboard_ordre.js';

const aujourdhui = () => isoLocal(new Date());

function montrerFormulaire(scrollY = 0) {
    document.getElementById('vue-resume')?.classList.add('hidden');
    document.getElementById('vue-dashboard').classList.add('hidden');
    document.getElementById('vue-heures')?.classList.add('hidden');
    document.getElementById('vue-clients')?.classList.add('hidden');
    document.getElementById('vue-formulaire').classList.remove('hidden');
    window.scrollTo(0, scrollY);
    document.dispatchEvent(new CustomEvent('nav:formulaire'));
}

export function afficherDashboard() {
    resetCalOffset();

    document.getElementById('vue-formulaire').classList.add('hidden');
    document.getElementById('vue-resume')?.classList.add('hidden');
    document.getElementById('vue-heures')?.classList.add('hidden');
    document.getElementById('vue-clients')?.classList.add('hidden');
    document.getElementById('vue-dashboard').classList.remove('hidden');
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent('nav:dashboard'));
    rafraichirDashboard();
}

export function ouvrirNouvelleFeuille(dateISO) {
    const date = dateISO || aujourdhui();
    if (getBrouillonsDates().has(date) && !confirm('Un brouillon existe pour ce jour. L\'effacer et recommencer à zéro ?')) return;
    reinitialiserFeuille(date);
    montrerFormulaire();
}

export function finaliserBrouillon(dateISO) {
    viderInterventions();
    const scrollY = restaurerBrouillon(dateISO);
    montrerFormulaire(scrollY);
}

export async function rafraichirDashboard() {
    await Promise.all([rendreHeuresSupp(), rendreCalendrierMois(), majClientsCard()]);
}

export function initDashboard(nomTech) {
    initCalendrier(ouvrirNouvelleFeuille, finaliserBrouillon);
    initCalNav();
    initClientsCard();
    initOrdreDashboard();

    const greeting = document.getElementById('dash-greeting');
    if (greeting) greeting.textContent = nomTech || 'Mon espace';

    const subEl = document.getElementById('dash-hero-sub');
    if (subEl) {
        const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const company = cfg.company || '';
        subEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1) + (company ? ` · ${company}` : '');
    }

    document.getElementById('btn-retour-dashboard').addEventListener('click', afficherDashboard);

    document.addEventListener('feuille:enregistree', afficherDashboard);
    document.addEventListener('feuille:supprimee', rafraichirDashboard);
    document.addEventListener('dashboard:refresh', rafraichirDashboard);
}
