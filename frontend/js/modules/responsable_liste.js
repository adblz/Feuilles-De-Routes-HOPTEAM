// Chargement des données et rendu de la liste des feuilles (page responsable).

import { chargerToutesLesFeuilles, chargerProfilsTechniciens, chargerPdfResponsable } from './db_responsable.js';
import { chargerPeriodesPaie } from './db_planning.js';
import { trouverPeriodeParMoisCourant } from './periodes_paie.js';
import { showToast, isoLocal } from '../utils/utils.js';
import { afficherPdfUrl } from './pdfviewer.js';
import { grouperParTech, renderTechs } from './responsable_render.js';
import { appliquerIndetermines } from './responsable_feuilles.js';
import { getVues, marquerVue } from './responsable_vues.js';
import * as selection from './responsable_selection.js';
import * as validations from './responsable_validations.js';
import { filtrerParEntreprise } from './responsable_entreprise.js';
import { bornesEtendues } from './semaines.js';
import { capturerOuverts, restaurerOuverts, majBarreSelection } from './responsable_liste_dom.js';

// Les appelants (responsable.js, responsable_evenements.js) passent par ce module.
export { majBarreSelection, afficherChargement, afficherErreurChargement } from './responsable_liste_dom.js';

let _feuilles = [];
let _profilsTechs = [];
let _periodes = [];
let _periodeChoisie = null;

export function periodes() { return _periodes; }
export function periodeChoisie() { return _periodeChoisie; }

// Techniciens de l'entreprise affichée (tous si aucune entreprise choisie).
export function profilsTechs() { return filtrerParEntreprise(_profilsTechs, p => p.company); }

// Contrat (35/37/39) du technicien d'une feuille, d'après son profil : repli
// pour les calculs d'heures quand la feuille elle-même n'en porte pas.
export function contratPour(feuille) {
    return _profilsTechs.find(t => t.id === feuille.user_id)?.contrat || null;
}

// Toutes les entreprises connues (pour le menu « Entreprise affichée »).
export function entreprisesConnues() { return [...new Set(_profilsTechs.map(p => p.company).filter(Boolean))]; }

export function choisirPeriode(id) {
    _periodeChoisie = _periodes.find(p => String(p.id) === String(id)) || null;
}

// Période active pour le filtrage/affichage : la période choisie, ou à
// défaut le mois calendaire en cours (comportement de repli).
export function periodeEffective() {
    if (_periodeChoisie) return _periodeChoisie;
    const d = new Date();
    const premier = new Date(d.getFullYear(), d.getMonth(), 1);
    const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { date_debut: isoLocal(premier), date_fin: isoLocal(dernier) };
}

function feuillesEntre(debut, fin) {
    const companyParUid = new Map(_profilsTechs.map(t => [t.id, t.company]));
    const dansPeriode = _feuilles.filter(f => f.date >= debut && f.date <= fin);
    return filtrerParEntreprise(dansPeriode, f => companyParUid.get(f.user_id));
}

// Feuilles de la période, limitées à l'entreprise affichée (via le profil du technicien).
export function feuillesFiltrees() {
    const p = periodeEffective();
    return feuillesEntre(p.date_debut, p.date_fin);
}

// Feuilles des SEMAINES ENTIÈRES (lundi → dimanche) qui touchent la période :
// l'onglet Heures supp calcule chaque semaine en entier (voir heures_calculs.js).
export function feuillesSemainesPeriode() {
    const p = periodeEffective();
    const b = bornesEtendues(p.date_debut, p.date_fin);
    return feuillesEntre(b.debut, b.fin);
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
    await chargerValidationsPeriode();
}

// Validations de la période affichée (badges « validé » et onglet Heures supp).
// Une erreur ici ne doit pas empêcher d'afficher les feuilles.
export async function chargerValidationsPeriode() {
    try {
        // Semaines entières, comme l'onglet Heures supp.
        const p = periodeEffective();
        const b = bornesEtendues(p.date_debut, p.date_fin);
        await validations.chargerValidationsPeriode({ date_debut: b.debut, date_fin: b.fin });
    } catch (e) {
        console.warn('Validations indisponibles :', e);
    }
}

// Recharge feuilles + techniciens (après création/suppression d'un compte).
export async function rechargerFeuilles() {
    [_feuilles, _profilsTechs] = await Promise.all([chargerToutesLesFeuilles(), chargerProfilsTechniciens()]);
}

export function rendreListe() {
    const container = document.getElementById('resp-list');
    const ouverts = capturerOuverts(container);
    const scrollEl = document.querySelector('.admin-content');
    const scrollY = scrollEl ? scrollEl.scrollTop : 0;
    const ctx = {
        vues: getVues(),
        selectionMode: selection.estActif(),
        estSelectionnee: selection.estSelectionnee,
        statutSemaine: selection.statutSemaine,
        validationPour: validations.validationPour,
        estObsolete: validations.estObsolete,
        contratPour: contratPour,
    };
    container.innerHTML = renderTechs(grouperParTech(feuillesFiltrees(), _profilsTechs), periodeEffective(), ctx);
    appliquerIndetermines(container);
    restaurerOuverts(container, ouverts);
    majBarreSelection();
    if (scrollEl) scrollEl.scrollTop = scrollY;
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
