import { normaliserTexte } from './clients_excel.js';

// ── Règles métier de l'import du planning clients (fonctions pures, sans DOM) ──

// Un client fait il y a moins de X jours et qui ressort dans le fichier est
// signalé au responsable comme anomalie (« déjà fait récemment »).
export const FENETRE_FAIT_RECENT_JOURS = 21;
// Si le fichier replanifie le client au moins X jours après la date où il a
// été fait, c'est la visite suivante : pas une anomalie.
export const MARGE_NOUVEAU_CYCLE_JOURS = 7;

const JOUR_MS = 86400000;

function ajouterJours(iso, n) {
    const d = new Date(iso + 'T00:00:00Z');
    return new Date(d.getTime() + n * JOUR_MS).toISOString().slice(0, 10);
}

// « HNE - Secteur Quentin ABRASSART » → ensemble de mots { quentin, abrassart }
export function motsNom(s) {
    const txt = normaliserTexte(s).replace(/^[a-z]+\s*-\s*secteur\s*/, '');
    return new Set(txt.split(/[^a-z0-9]+/).filter(Boolean));
}

function memesMots(a, b) {
    if (a.size === 0 || a.size !== b.size) return false;
    for (const m of a) if (!b.has(m)) return false;
    return true;
}

// Propose un technicien pour chaque secteur : d'abord la correspondance
// mémorisée, sinon le SEUL technicien dont le nom a exactement les mêmes mots.
export function proposerMapping(secteurs, techs, memo = []) {
    const memoParSecteur = new Map(memo.map(m => [m.secteur, m.user_id]));
    const mapping = {};
    for (const secteur of secteurs) {
        if (memoParSecteur.has(secteur)) {
            mapping[secteur] = memoParSecteur.get(secteur) || '';
            continue;
        }
        const mots = motsNom(secteur);
        const candidats = techs.filter(t => memesMots(mots, motsNom(t.nom)));
        mapping[secteur] = candidats.length === 1 ? candidats[0].id : '';
    }
    return mapping;
}

export function compterParSecteur(rows) {
    const compte = new Map();
    for (const r of rows) compte.set(r.secteur, (compte.get(r.secteur) || 0) + 1);
    return compte;
}

// Clients faits récemment (lignes de la base) qui ressortent dans le fichier
// sans être clairement replanifiés plus tard.
export function detecterDejaFaits(rows, faits) {
    const faitParCode = new Map(faits.map(f => [f.code_pdv, f]));
    const vus = new Set();
    const anomalies = [];
    for (const r of rows) {
        const fait = faitParCode.get(r.code_pdv);
        if (!fait || vus.has(r.code_pdv)) continue;
        const limite = ajouterJours(fait.fait_le, MARGE_NOUVEAU_CYCLE_JOURS);
        if (!r.date_prevue || r.date_prevue <= limite) {
            vus.add(r.code_pdv);
            anomalies.push({
                code_pdv: r.code_pdv, nom_pdv: r.nom_pdv,
                fait_le: fait.fait_le, user_id: fait.user_id,
                date_prevue_fichier: r.date_prevue,
            });
        }
    }
    return anomalies;
}

// Construit les lignes finales à écrire en base.
// Une ligne Excel = un poste (une installation) : un même client peut donc
// apparaître plusieurs fois, et toutes ses lignes sont conservées. C'est le
// listing du technicien qui les regroupe ensuite en une seule carte.
// choix = { masquer: Set<code>, reafficher: Set<code> }
export function construireLignes(rows, mapping, choix) {
    const lignes = [];
    const nonAffectees = new Map();
    const codesMasques = new Set();

    for (const r of rows) {
        if (choix.masquer.has(r.code_pdv)) { codesMasques.add(r.code_pdv); continue; }
        const userId = mapping[r.secteur] || '';
        if (!userId) {
            nonAffectees.set(r.secteur, (nonAffectees.get(r.secteur) || 0) + 1);
            continue;
        }
        lignes.push({ ...r, user_id: userId });
    }
    return { lignes, nonAffectees, masquees: codesMasques.size };
}
