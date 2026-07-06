import { isoLocal } from '../utils/utils.js';
import { restaurerBrouillon, viderInterventions, cfg, getBrouillonsDates } from './fdr.js';
import { reinitialiserFeuille } from './ui.js';
import { initCalendrier, rendreCalendrierMois, resetCalOffset, initCalNav } from './dashboard_calendar.js';
import { effacerBrouillon } from './fdr.js';
import {
    rendreHeuresSupp, majBrouillonCard,
    toggleBrouillonList, toggleActionList, _rendreActionList,
    getSuppDebut, getSuppFin, setSuppDebut, setSuppFin,
    getLastManquants, getActionListExpanded, setActionListExpanded,
} from './dashboard_stats.js';

const aujourdhui = () => isoLocal(new Date());

function montrerFormulaire() {
    document.getElementById('vue-resume')?.classList.add('hidden');
    document.getElementById('vue-dashboard').classList.add('hidden');
    document.getElementById('vue-heures')?.classList.add('hidden');
    document.getElementById('vue-formulaire').classList.remove('hidden');
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent('nav:formulaire'));
}

export function afficherDashboard() {
    setActionListExpanded(false);
    resetCalOffset();
    const bl = document.getElementById('dash-brouillon-list');
    if (bl) bl.classList.add('hidden');
    const chev = document.getElementById('dash-brouillon-chevron');
    if (chev) chev.textContent = '▼';

    document.getElementById('vue-formulaire').classList.add('hidden');
    document.getElementById('vue-resume')?.classList.add('hidden');
    document.getElementById('vue-heures')?.classList.add('hidden');
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
    restaurerBrouillon(dateISO);
    montrerFormulaire();
}

export async function rafraichirDashboard() {
    majBrouillonCard();
    const results   = await Promise.all([rendreHeuresSupp(), rendreCalendrierMois()]);
    const manquants = results[1];
    if (Array.isArray(manquants)) _rendreActionList(manquants);
}

export function initDashboard(nomTech) {
    initCalendrier(ouvrirNouvelleFeuille, finaliserBrouillon);
    initCalNav();

    const greeting = document.getElementById('dash-greeting');
    if (greeting) greeting.textContent = nomTech || 'Mon espace';

    const subEl = document.getElementById('dash-hero-sub');
    if (subEl) {
        const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const company = cfg.company || '';
        subEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1) + (company ? ` · ${company}` : '');
    }

    document.getElementById('btn-dash-supp-edit').addEventListener('click', () => {
        const panel  = document.getElementById('dash-supp-edit');
        const btn    = document.getElementById('btn-dash-supp-edit');
        const isOpen = !panel.classList.contains('hidden');
        panel.classList.toggle('hidden');
        btn.textContent = isOpen ? '✎ Modifier la période' : '✕ Annuler';
        if (!isOpen) {
            const today = aujourdhui();
            document.getElementById('supp-inline-debut').value = getSuppDebut() || today.slice(0, 8) + '01';
            document.getElementById('supp-inline-fin').value   = getSuppFin()   || today;
        }
    });

    document.getElementById('btn-supp-inline-calc').addEventListener('click', () => {
        const debut = document.getElementById('supp-inline-debut').value;
        const fin   = document.getElementById('supp-inline-fin').value;
        if (!debut || !fin || debut > fin) return;
        setSuppDebut(debut);
        setSuppFin(fin);
        document.getElementById('dash-supp-edit').classList.add('hidden');
        document.getElementById('btn-dash-supp-edit').textContent = '✎ Modifier la période';
        rendreHeuresSupp();
    });

    document.getElementById('btn-dash-supp-reset').addEventListener('click', () => {
        setSuppDebut(null);
        setSuppFin(null);
        document.getElementById('dash-supp-edit').classList.add('hidden');
        document.getElementById('btn-dash-supp-edit').textContent = '✎ Modifier la période';
        rendreHeuresSupp();
    });

    document.getElementById('dash-brouillon-header').addEventListener('click', () => {
        const dates = [...getBrouillonsDates()];
        if (dates.length === 1) { finaliserBrouillon(dates[0]); return; }
        toggleBrouillonList();
    });

    document.getElementById('dash-brouillon-list').addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-brouillon-item-del');
        if (delBtn) {
            e.stopPropagation();
            if (!confirm('Supprimer ce brouillon ?')) return;
            effacerBrouillon(delBtn.dataset.delDate);
            majBrouillonCard();
            return;
        }
        const item = e.target.closest('.dash-brouillon-item');
        if (!item) return;
        finaliserBrouillon(item.dataset.date);
    });

    document.getElementById('btn-retour-dashboard').addEventListener('click', afficherDashboard);

    document.getElementById('dash-action-titre').addEventListener('click', (e) => {
        if (getLastManquants().length > 2) { e.stopPropagation(); toggleActionList(); }
    });

    document.getElementById('dash-action-list').addEventListener('click', (e) => {
        if (e.target.closest('#dash-action-toggle')) { e.stopPropagation(); toggleActionList(); return; }
        const btn = e.target.closest('.dash-action-btn');
        if (!btn) return;
        if (btn.dataset.action === 'finaliser') finaliserBrouillon(btn.dataset.date);
        else ouvrirNouvelleFeuille(btn.dataset.date);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#dash-brouillon')) {
            const bl = document.getElementById('dash-brouillon-list');
            if (bl && !bl.classList.contains('hidden')) {
                bl.classList.add('hidden');
                const chev = document.getElementById('dash-brouillon-chevron');
                if (chev) chev.textContent = '▼';
            }
        }
        if (!e.target.closest('#dash-action-card') && !e.target.closest('#dash-action-titre')) {
            if (getActionListExpanded()) toggleActionList();
        }
    });

    document.addEventListener('feuille:enregistree', afficherDashboard);
    document.addEventListener('feuille:supprimee', rafraichirDashboard);
}
