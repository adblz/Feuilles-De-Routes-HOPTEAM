// Onglet « Import planning », partie hors modale : info « Dernier import »,
// planning en cours par technicien (voir / réaffecter / retirer) et historique
// des imports (annuler le dernier). Chargement paresseux à l'ouverture de
// l'onglet ; après chaque action, tout est relu depuis la base (elle fait foi).

import { showToast, isoLocal } from '../utils/utils.js';
import { chargerProfilsTechniciens } from './db_responsable.js';
import { chargerDernierImport } from './db_clients.js';
import { chargerPlanningEntreprise, chargerImports, chargerNomsProfils } from './db_clients_gestion.js';
import { regrouperPlanning, filtrerPlanning, grouperParTechnicien, resumerPlanning } from './responsable_planning_data.js';
import { renderPlanning, renderPlanningVide } from './responsable_planning_render.js';
import { renderImportsTable, renderImportsChargement } from './responsable_imports_render.js';
import { retirerClient, reaffecterClient, annulerDernierImport } from './responsable_planning_actions.js';
import { entrepriseChoisie, peutGererEntrepriseAffichee } from './responsable_entreprise.js';

let _maCompany = '';
let _techsTous = [];          // tous les techniciens visibles (toutes entreprises)
let _rows = [], _imports = [], _noms = {};
let _filtre = { statut: 'afaire', recherche: '' };
let _chargePour = null;       // entreprise des données en mémoire
let _perime = true;           // quelque chose a changé → recharger à l'affichage
let _fermes = new Set();      // cartes repliées

const $ = id => document.getElementById(id);
const ongletVisible = () => !$('view-import')?.classList.contains('hidden');

// Même repli que l'import : entreprise choisie dans la barre latérale, sinon la
// sienne, sinon la première connue (compte « toutes les entreprises »).
function companyAffichee() {
    return entrepriseChoisie() || _maCompany || _techsTous.find(t => t.company)?.company || '';
}

function techsEntreprise() {
    return _techsTous.filter(t => (t.company || '') === companyAffichee());
}

function rendre() {
    const todayISO = isoLocal(new Date());
    const tous = regrouperPlanning(_rows);
    const filtres = filtrerPlanning(tous, _filtre);
    const techs = techsEntreprise();
    const groupes = grouperParTechnicien(filtres, tous, techs, todayISO);
    $('resp-planning-list').innerHTML = renderPlanning(groupes, { techs, lectureSeule: !peutGererEntrepriseAffichee(), todayISO, fermes: _fermes });
    const r = resumerPlanning(tous, todayISO);
    $('resp-planning-resume').textContent = `${r.nbAFaire} à faire · ${r.nbFaits} faits · ${r.nbRetard} en retard`;
    renderImportsTable(_imports, _noms, { lectureSeule: !peutGererEntrepriseAffichee() });
}

async function rechargerPlanning() {
    const company = companyAffichee();
    if (!company) {
        $('resp-planning-list').innerHTML = renderPlanningVide('Choisissez une entreprise dans la barre latérale.');
        renderImportsChargement('Choisissez une entreprise.');
        return;
    }
    $('resp-planning-list').innerHTML = renderPlanningVide('Chargement…');
    renderImportsChargement();
    try {
        [_rows, _techsTous, _imports] = await Promise.all([
            chargerPlanningEntreprise(company), chargerProfilsTechniciens(), chargerImports(company),
        ]);
        const noms = await chargerNomsProfils([...new Set(_imports.map(i => i.importe_par).filter(Boolean))]);
        _noms = Object.fromEntries(noms.map(p => [p.id, p.nom]));
        _chargePour = company;
        _perime = false;
        rendre();
    } catch (e) {
        showToast('Chargement du planning impossible : ' + e.message, 'error');
        $('resp-planning-list').innerHTML = renderPlanningVide('Impossible de charger le planning.');
        renderImportsChargement('Impossible de charger l\'historique.');
    }
}

// Ouverture de l'onglet : ne recharge que si nécessaire.
export function afficherPlanning() {
    if (_perime || _chargePour !== companyAffichee()) rechargerPlanning();
}

// Après un import, un changement d'entreprise ou de techniciens : met à jour
// l'info « Dernier import » et recharge le planning s'il est affiché.
export async function rafraichirOngletImport() {
    _perime = true;
    const info = $('clients-import-info');
    if (info) {
        try {
            if (!_techsTous.length) _techsTous = await chargerProfilsTechniciens();
            const dernier = await chargerDernierImport(companyAffichee());
            info.textContent = dernier ? `Dernier import : ${new Date(dernier.importe_le).toLocaleDateString('fr-FR')} · ${dernier.nb_importees} clients` : 'Aucun planning importé';
        } catch { info.textContent = ''; }
    }
    if (ongletVisible()) rechargerPlanning();
}

async function onListeClick(e) {
    const header = e.target.closest('.heures-tech-header');
    if (header) {
        const uid = header.closest('.plan-tech-card').dataset.uid;
        _fermes.has(uid) ? _fermes.delete(uid) : _fermes.add(uid);
        rendre();
        return;
    }
    const btn = e.target.closest('.plan-btn-retirer');
    if (!btn) return;
    const { ids, nom, tech, postes } = btn.dataset;
    if (await retirerClient({ ids: ids.split(','), nom, tech, postes: Number(postes) })) rechargerPlanning();
}

async function onListeChange(e) {
    const select = e.target.closest('.plan-select-tech');
    if (!select) return;
    const userId = select.value;
    const nomTech = select.selectedOptions[0]?.textContent || '';
    await reaffecterClient({ ids: select.dataset.ids.split(','), userId, nom: select.dataset.nom, nomTech });
    rechargerPlanning();   // succès : le client change de carte ; erreur : le menu revient à l'état réel
}

async function onImportsClick(e) {
    const btn = e.target.closest('.btn-annuler-import');
    if (!btn) return;
    const imp = _imports.find(i => i.id === btn.dataset.id);
    if (!imp) return;
    const nbAFaire = _rows.filter(r => r.import_id === imp.id && !r.fait_le).length;
    if (await annulerDernierImport(imp, nbAFaire)) rafraichirOngletImport();
}

export function initPlanning(profil) {
    _maCompany = profil.company || '';
    $('resp-planning-recherche').addEventListener('input', e => { _filtre.recherche = e.target.value; rendre(); });
    $('resp-planning-statut').addEventListener('change', e => { _filtre.statut = e.target.value; rendre(); });
    $('resp-planning-list').addEventListener('click', onListeClick);
    $('resp-planning-list').addEventListener('change', onListeChange);
    $('resp-imports-tbody').addEventListener('click', onImportsClick);
}
