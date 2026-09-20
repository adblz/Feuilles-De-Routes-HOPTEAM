// ── Calcul des heures supplémentaires ──────────────────────────
//
// UNE SEULE RÈGLE pour toute l'appli, basée sur les heures TRAVAILLÉES :
//
//   heures supp de la semaine = heures travaillées (lun → dim) − contrat
//
// Le contrat (35h / 37h / 39h, voir seuil_jour.js) est réduit du seuil de
// chaque jour férié et de chaque jour de congé tombant lundi → vendredi. Un
// jour de semaine sans feuille compte 0h travaillée : il « manque » donc
// naturellement 7h ou 8h. Majoration légale : palier25Pour(contrat) à +25 %,
// le reste à +50 %.
//
// Le contrat d'une semaine est celui inscrit sur ses feuilles (celui en
// vigueur quand elles ont été faites), sinon celui passé en option, sinon
// celui du technicien connecté.

import { parseDuree, isoLocal } from '../utils/utils.js';
import { estFerie } from './jours_feries.js';
import { cfg } from './fdr_config.js';
import { seuilJourPour, seuilJourEffectif, contratMinutes, palier25Pour } from './seuil_jour.js';
import { nuitFeuille } from './heures_nuit.js';
import { getSemaineISO, labelSemaine, labelSemaineCourt, lundiDe, joursDeSemaine, semaineDansPeriode } from './semaines.js';

const OUVRES = lundi => joursDeSemaine(lundi).slice(0, 5);   // lundi → vendredi

function contratDe(fs, opts) {
    return fs.find(f => f.contrat)?.contrat || opts.contrat || cfg.contrat;
}

// Seuil de la semaine : contrat moins le seuil de chaque jour ouvré férié ou
// en congé (un congé posé sur un férié n'est retiré qu'une fois).
function seuilSemaine(fs, lundi, contrat) {
    const conges = new Set(fs.filter(f => f.conge).map(f => f.date));
    let seuil = contratMinutes(contrat);
    for (const d of OUVRES(lundi)) {
        if (estFerie(d) || conges.has(d)) seuil -= seuilJourPour(d, contrat);
    }
    return Math.max(0, seuil);
}

// Jours ouvrés déjà passés (strictement avant aujourd'hui), non fériés, sans
// aucune feuille (ni travail ni congé). Informatif : ils comptent déjà 0h.
export function joursManquants(fs, lundi, contrat, aujourdhui = isoLocal(new Date())) {
    const presents = new Set(fs.map(f => f.date));
    return OUVRES(lundi)
        .filter(d => d < aujourdhui && !estFerie(d) && !presents.has(d))
        .map(d => ({ date: d, manquant: true, seuilMin: seuilJourPour(d, contrat) }));
}

// Écart au seuil d'une journée, signé : ce qu'affiche « Heures supp. du jour ».
// Congé → 0. Samedi, dimanche, férié → toutes les heures travaillées.
export function suppJour(f, contrat = null) {
    if (f.conge) return 0;
    return parseDuree(f.heures_travail) - seuilJourEffectif(f.date, f.contrat || contrat || cfg.contrat);
}

// feuilles : lignes feuilles_de_route (date, heures_travail, conge, astreinte,
// heure_debut, heure_fin, interventions…). Renvoie une ligne par semaine,
// triée, avec tous les totaux.
export function calcHebdomadaire(feuilles, opts = {}) {
    const groupes = {};
    for (const f of feuilles) {
        const cle = getSemaineISO(f.date);
        (groupes[cle] ||= []).push(f);
    }

    return Object.keys(groupes).sort().map(cle => {
        const fs      = groupes[cle].sort((a, b) => a.date.localeCompare(b.date));
        const lundi   = lundiDe(fs[0].date);
        const contrat = contratDe(fs, opts);

        let totalTravailMin = 0, totalNuitMin = 0, totalAstreinteMin = 0;
        for (const f of fs) {
            const travailMin = parseDuree(f.heures_travail);
            totalTravailMin += travailMin;
            totalNuitMin    += nuitFeuille(f);
            if (f.astreinte) totalAstreinteMin += travailMin;   // récupérables
        }

        const seuilMin     = seuilSemaine(fs, lundi, contrat);
        const netMin       = totalTravailMin - seuilMin;         // signé (affichage)
        const totalSuppMin = Math.max(0, netMin);
        const supp25       = Math.min(totalSuppMin, palier25Pour(contrat));
        const supp50       = totalSuppMin - supp25;
        const manquants    = joursManquants(fs, lundi, contrat, opts.aujourdhui);

        return {
            cle, contrat, lundi,
            label: labelSemaine(fs[0].date), labelCourt: labelSemaineCourt(fs[0].date),
            nbJours: fs.length, totalTravailMin, seuilMin, netMin, totalSuppMin, supp25, supp50,
            totalNuitMin, totalAstreinteMin,
            nbFeries: OUVRES(lundi).filter(estFerie).length,
            nbConges: fs.filter(f => f.conge).length,
            manquants, nbManquants: manquants.length,
            feuilles: fs,
        };
    });
}

// Carte d'accueil : heures supp de la semaine EN COURS, jour par jour.
// Σ travaillé − Σ seuil des jours attendus déjà passés (jours avec feuille,
// + jours ouvrés sans feuille avant aujourd'hui). En fin de semaine, c'est
// exactement le calcul hebdomadaire ci-dessus.
export function suppPartielle(feuilles, opts = {}) {
    if (!feuilles.length) return null;
    const contrat = contratDe(feuilles, opts);
    const lundi   = lundiDe(feuilles[0].date);
    let travailMin = 0, baseMin = 0;
    for (const f of feuilles) {
        if (f.conge) continue;
        travailMin += parseDuree(f.heures_travail);
        baseMin    += seuilJourEffectif(f.date, f.contrat || contrat);
    }
    const manquants = joursManquants(feuilles, lundi, contrat, opts.aujourdhui);
    for (const m of manquants) baseMin += m.seuilMin;
    return { contrat, travailMin, baseMin, netMin: travailMin - baseMin, nbJours: feuilles.length, nbManquants: manquants.length };
}

// Totaux d'une période (mois de paie, mois calendaire, dates libres).
// Si debut/fin sont donnés, seules les semaines dont le dimanche tombe dans
// la période sont comptées (une semaine = un seul mois).
export function totauxSuppPeriode(feuilles, opts = {}, debut = null, fin = null) {
    const semaines = calcHebdomadaire(feuilles, opts)
        .filter(s => !debut || !fin || semaineDansPeriode(s.feuilles[0].date, debut, fin));
    return semaines.reduce((a, s) => ({
        travail:   a.travail   + s.totalTravailMin,
        supp:      a.supp      + s.totalSuppMin,
        supp25:    a.supp25    + s.supp25,
        supp50:    a.supp50    + s.supp50,
        nuit:      a.nuit      + s.totalNuitMin,
        astreinte: a.astreinte + s.totalAstreinteMin,
        manquants: a.manquants + s.nbManquants,
        contrat:   s.contrat,
    }), { travail: 0, supp: 0, supp25: 0, supp50: 0, nuit: 0, astreinte: 0, manquants: 0, contrat: opts.contrat || cfg.contrat });
}

// Semaines d'une période, filtrées comme totauxSuppPeriode (pour l'affichage).
export function semainesPeriode(feuilles, opts, debut, fin) {
    return calcHebdomadaire(feuilles, opts)
        .filter(s => !debut || !fin || semaineDansPeriode(s.feuilles[0].date, debut, fin));
}
