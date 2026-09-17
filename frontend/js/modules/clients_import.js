import { showToast, isoLocal } from '../utils/utils.js';
import { chargerProfilsTechniciens } from './db_responsable.js';
import { chargerMappingSecteurs, sauvegarderMappingSecteurs, chargerClientsFaitsRecents,
         importerClientsPlanning } from './db_clients.js';
import { lireFichierExcel } from './clients_excel.js';
import { proposerMapping, compterParSecteur, detecterDejaFaits,
         construireLignes, FENETRE_FAIT_RECENT_JOURS } from './clients_regles.js';
import { renderEtapeMapping, renderEtapeAnomalies, renderEtapeRecap,
         lireMapping, lireCompany, lireChoixAnomalies, majFooter } from './clients_import_ui.js';
import { entrepriseChoisie } from './responsable_entreprise.js';
import { rafraichirOngletImport } from './responsable_planning.js';

// ── Import du planning clients (page responsable) : enchaînement des étapes ──
// Rien n'est écrit en base avant le clic « Importer maintenant » de l'étape 3.

const etat = { company: '', maCompany: '', companies: [], techs: [], fichier: '', rows: [], total: 0, ignorees: 0,
               mapping: {}, anomalies: null, choix: null, resultat: null, etape: 1 };

// Entreprise proposée par défaut : celle choisie dans la barre latérale (compte multi-entreprises), sinon la sienne.
const companyParDefaut = () => entrepriseChoisie() || etat.maCompany || etat.companies[0] || '';
const body  = () => document.getElementById('clients-import-body');
const modal = () => document.getElementById('modal-clients-import');
const techsById = () => Object.fromEntries(etat.techs.map(t => [t.id, t.nom]));

function fermer() {
    modal().classList.remove('open');
    document.getElementById('clients-import-file').value = '';
}

async function rendreEtape1() {
    etat.etape = 1;
    const secteurs = compterParSecteur(etat.rows);
    const memo = await chargerMappingSecteurs(etat.company).catch(() => []);
    etat.mapping = proposerMapping([...secteurs.keys()], etat.techs.filter(t => t.company === etat.company), memo);
    body().innerHTML = renderEtapeMapping({
        total: etat.total, actives: etat.rows.length, ignorees: etat.ignorees,
        secteurs, techs: etat.techs, mapping: etat.mapping, companies: etat.companies, company: etat.company,
    });
    majFooter(1);
    body().querySelector('#clients-import-company')?.addEventListener('change', (e) => {
        etat.company = e.target.value;
        rendreEtape1();
    });
}

async function rendreEtape2() {
    etat.mapping = lireMapping(body());
    etat.company = lireCompany(body()) || etat.company;
    const depuis = new Date(Date.now() - FENETRE_FAIT_RECENT_JOURS * 86400000);
    const faits = await chargerClientsFaitsRecents(etat.company, isoLocal(depuis));
    etat.anomalies = { dejaFaits: detecterDejaFaits(etat.rows, faits) };
    afficherAnomalies();
}

function rendreEtape3() {
    etat.choix    = lireChoixAnomalies(body());
    etat.resultat = construireLignes(etat.rows, etat.mapping, etat.choix);
    const noms = techsById();
    const parTechMap = new Map();
    for (const l of etat.resultat.lignes) parTechMap.set(l.user_id, (parTechMap.get(l.user_id) || 0) + 1);
    const parTech = [...parTechMap.entries()].map(([id, nb]) => ({ nom: noms[id] || '?', nb })).sort((a, b) => b.nb - a.nb);
    etat.etape = 3;
    body().innerHTML = renderEtapeRecap({
        parTech, nonAffectees: etat.resultat.nonAffectees, masquees: etat.resultat.masquees,
        total: etat.total, ignorees: etat.ignorees, nbLignes: etat.resultat.lignes.length,
    });
    majFooter(3);
}

async function ecrire() {
    const btn = document.getElementById('btn-clients-import-suivant');
    btn.disabled = true;
    btn.textContent = 'Import en cours…';
    try {
        await sauvegarderMappingSecteurs(Object.entries(etat.mapping).map(([secteur, user_id]) =>
            ({ company: etat.company, secteur, user_id: user_id || null })));
        await importerClientsPlanning({
            company: etat.company, lignes: etat.resultat.lignes,
            codesReafficher: [...etat.choix.reafficher], fichier: etat.fichier,
            nbTotal: etat.total, nbIgnorees: etat.ignorees,
        });
        showToast(`Planning importé : ${etat.resultat.lignes.length} clients`, 'success', 4000);
        fermer();
        rafraichirOngletImport();
    } catch (e) {
        showToast('L\'import a échoué : ' + (e?.message || e), 'error', 8000);
        majFooter(3);
    }
}

async function etapeSuivante() {
    const btn = document.getElementById('btn-clients-import-suivant');
    btn.disabled = true;
    try {
        if (etat.etape === 1)      await rendreEtape2();
        else if (etat.etape === 2) rendreEtape3();
        else                       await ecrire();
    } catch (e) {
        showToast('Erreur : ' + (e?.message || e), 'error', 6000);
        btn.disabled = false;
    }
}

function afficherAnomalies() {
    etat.etape = 2;
    body().innerHTML = renderEtapeAnomalies({ ...etat.anomalies, techsById: techsById() });
    majFooter(2);
}

function etapePrecedente() {
    if (etat.etape === 2) rendreEtape1();
    else if (etat.etape === 3) afficherAnomalies();
}

async function demarrer(file) {
    if (!file) return;
    showToast('Lecture du fichier…', '', 2000);
    try {
        const { rows, total, ignorees } = await lireFichierExcel(file);
        Object.assign(etat, { rows, total, ignorees, fichier: file.name, company: companyParDefaut() });
        modal().classList.add('open');
        await rendreEtape1();
    } catch (e) {
        showToast(e?.message || 'Fichier illisible', 'error', 8000);
        document.getElementById('clients-import-file').value = '';
    }
}

// L'info « Dernier import » et le planning en cours vivent dans responsable_planning.js.
export async function initImportClients(profil) {
    etat.techs     = await chargerProfilsTechniciens();
    etat.companies = [...new Set(etat.techs.map(t => t.company).filter(Boolean))];
    etat.maCompany = profil.company || '';
    etat.company   = companyParDefaut();

    document.getElementById('btn-clients-import').addEventListener('click', () =>
        document.getElementById('clients-import-file').click());
    document.getElementById('clients-import-file').addEventListener('change', (e) => demarrer(e.target.files[0]));
    document.getElementById('btn-close-clients-import').addEventListener('click', fermer);
    document.getElementById('btn-clients-import-retour').addEventListener('click', etapePrecedente);
    document.getElementById('btn-clients-import-suivant').addEventListener('click', etapeSuivante);
    rafraichirOngletImport();
}
