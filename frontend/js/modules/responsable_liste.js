// Chargement des données et rendu de la liste des feuilles (page responsable).

import { chargerToutesLesFeuilles, chargerProfilsTechniciens, chargerPdfResponsable } from './db_responsable.js';
import { chargerPeriodesPaie } from './db_planning.js';
import { trouverPeriodeParMoisCourant } from './periodes_paie.js';
import { showToast, isoLocal } from '../utils/utils.js';
import { afficherPdfUrl } from './pdfviewer.js';
import { grouperParTech, renderTechs, renderSquelette } from './responsable_render.js';
import { appliquerIndetermines } from './responsable_feuilles.js';
import { getVues, marquerVue } from './responsable_vues.js';
import * as selection from './responsable_selection.js';

let _feuilles = [];
let _profilsTechs = [];
let _periodes = [];
let _periodeChoisie = null;

export function periodes() { return _periodes; }
export function periodeChoisie() { return _periodeChoisie; }

export function choisirPeriode(id) {
    _periodeChoisie = _periodes.find(p => String(p.id) === String(id)) || null;
}

// Période active pour le filtrage/affichage : la période choisie, ou à
// défaut le mois calendaire en cours (comportement de repli).
function periodeEffective() {
    if (_periodeChoisie) return _periodeChoisie;
    const d = new Date();
    const premier = new Date(d.getFullYear(), d.getMonth(), 1);
    const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { date_debut: isoLocal(premier), date_fin: isoLocal(dernier) };
}

export function feuillesFiltrees() {
    const p = periodeEffective();
    return _feuilles.filter(f => f.date >= p.date_debut && f.date <= p.date_fin);
}

export function feuillesSelectionnees() {
    const ids = new Set(selection.listeSelectionnee());
    return feuillesFiltrees().filter(f => ids.has(f.id));
}

export async function chargerDonnees() {
    [_feuilles, _profilsTechs] = await Promise.all([chargerToutesLesFeuilles(), chargerProfilsTechniciens()]);
    try {
        _periodes = await chargerPeriodesPaie();
    } catch {
        _periodes = []; // le filtre par période reste optionnel : repli sur le mois calendaire
    }
    _periodeChoisie = trouverPeriodeParMoisCourant(_periodes);
}

// Conserve les fiches techniciens dépliées et la position de scroll à travers un re-rendu.
function capturerOuverts(container) {
    return new Set([...container.querySelectorAll('.resp-tech-card')]
        .filter(c => !c.querySelector('.resp-tech-body')?.classList.contains('hidden'))
        .map(c => c.dataset.uid));
}

function restaurerOuverts(container, ouverts) {
    container.querySelectorAll('.resp-tech-card').forEach(c => {
        if (!ouverts.has(c.dataset.uid)) return;
        c.querySelector('.resp-tech-body')?.classList.remove('hidden');
        const chevron = c.querySelector('.resp-chevron');
        if (chevron) chevron.textContent = '▲';
    });
}

export function majBarreSelection() {
    const bar = document.getElementById('resp-selection-bar');
    const n = selection.nombreSelectionnes();
    bar.classList.toggle('hidden', !selection.estActif());
    document.getElementById('resp-selection-count').textContent =
        n === 0 ? 'Aucune feuille sélectionnée' : `${n} feuille${n > 1 ? 's' : ''} sélectionnée${n > 1 ? 's' : ''}`;
    document.getElementById('btn-resp-enregistrer').disabled = n === 0;
    document.getElementById('btn-resp-imprimer').disabled = n === 0;
    const toggle = document.getElementById('btn-resp-selection');
    if (toggle) toggle.textContent = selection.estActif() ? 'Fermer la sélection' : 'Sélectionner';
}

export function rendreListe() {
    const container = document.getElementById('resp-list');
    const ouverts = capturerOuverts(container);
    const scrollY = window.scrollY;
    const ctx = {
        vues: getVues(),
        selectionMode: selection.estActif(),
        estSelectionnee: selection.estSelectionnee,
        statutSemaine: selection.statutSemaine,
    };
    container.innerHTML = renderTechs(grouperParTech(feuillesFiltrees(), _profilsTechs), periodeEffective(), ctx);
    appliquerIndetermines(container);
    restaurerOuverts(container, ouverts);
    majBarreSelection();
    window.scrollTo(0, scrollY);
}

export function afficherChargement() {
    document.getElementById('resp-list').innerHTML = renderSquelette();
}

export function afficherErreurChargement() {
    document.getElementById('resp-list').innerHTML = '<div class="resp-loading">Erreur de connexion. Rechargez la page.</div>';
}

export async function ouvrirPdf(id) {
    try {
        const url = await chargerPdfResponsable(id);
        if (!url) { showToast('PDF non disponible pour cette feuille', 'warn', 3500); return; }
        marquerVue(id);
        rendreListe();
        await afficherPdfUrl(url);
    } catch {
        showToast('Erreur lors du chargement du PDF', 'error');
    }
}
