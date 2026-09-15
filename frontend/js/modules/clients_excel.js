import { isoLocal } from '../utils/utils.js';

// ── Lecture du fichier Excel du planning clients (librairie SheetJS / XLSX) ──
// On ne lit que le PREMIER onglet : les onglets par technicien du fichier
// sont de simples copies filtrées de celui-ci.
// Seules les lignes « actives » sont gardées : les statuts Terminée /
// Clôturée / vide correspondent à des visites déjà faites.

// Nom de colonne attendu (après normalisation : sans accents, minuscules).
const COLONNES = {
    date_prevue:    'date previsionnelle de cloture de l\'action',
    code_pdv:       'code pdv',
    nom_pdv:        'nom pdv',
    adresse:        'addresse',
    ville:          'ville pdv',
    code_postal:    'code postal pdv',
    telephone:      'numero de telephone',
    secteur:        'secteur technicien',
    entrepositaire: 'entrepositaire',
    statut:         'statut de l\'action',
    periodicite:    'periodicite (s)',
    tirage:         'nombre tirage',
};

const STATUTS_ACTIFS = ['confirmee', 'en attente de confirmation', 'en attente de planification'];

export function normaliserTexte(s) {
    return String(s ?? '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/\s+/g, ' ').trim();
}

// Retrouve, pour chaque colonne attendue, l'intitulé réel présent dans le fichier.
function resoudreEntetes(entetesFichier) {
    const parNorm = new Map(entetesFichier.map(h => [normaliserTexte(h), h]));
    const trouvees = {};
    const manquantes = [];
    for (const [cle, attendu] of Object.entries(COLONNES)) {
        const reel = parNorm.get(attendu);
        if (reel === undefined) manquantes.push(attendu);
        else trouvees[cle] = reel;
    }
    if (manquantes.length) {
        throw new Error(`Colonnes introuvables dans le fichier : ${manquantes.join(', ')}`);
    }
    return trouvees;
}

// Date Excel (nombre de jours) → 'AAAA-MM-JJ'. On passe par parse_date_code
// (et pas par des objets Date) pour éviter tout décalage de fuseau horaire.
function convertirDate(v) {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'number') {
        const d = XLSX.SSF.parse_date_code(v);
        if (!d) return null;
        return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
    if (v instanceof Date) return isoLocal(v);
    const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return null;
}

// Un numéro ou code postal saisi en nombre dans Excel perd son 0 initial.
function texteAvecZeros(v, longueur) {
    if (v === '' || v === null || v === undefined) return '';
    if (typeof v === 'number') return String(Math.round(v)).padStart(longueur, '0');
    return String(v).trim();
}

function entier(v) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
}

function normaliserLigne(brut, entetes) {
    const val = (cle) => brut[entetes[cle]];
    return {
        code_pdv:       String(val('code_pdv') ?? '').trim(),
        nom_pdv:        String(val('nom_pdv') ?? '').trim(),
        adresse:        String(val('adresse') ?? '').trim(),
        ville:          String(val('ville') ?? '').trim(),
        code_postal:    texteAvecZeros(val('code_postal'), 5),
        telephone:      texteAvecZeros(val('telephone'), 10),
        secteur:        String(val('secteur') ?? '').trim(),
        entrepositaire: String(val('entrepositaire') ?? '').trim(),
        statut:         String(val('statut') ?? '').trim(),
        date_prevue:    convertirDate(val('date_prevue')),
        periodicite:    entier(val('periodicite')),
        tirage:         entier(val('tirage')),
    };
}

// Lit le fichier et renvoie { rows, total, ignorees } :
//   rows     = lignes actives normalisées
//   total    = lignes lues (avec un code PDV)
//   ignorees = lignes écartées (statut terminé / clôturé / vide)
export async function lireFichierExcel(file) {
    if (typeof XLSX === 'undefined') {
        throw new Error('La librairie Excel ne s\'est pas chargée. Vérifiez votre connexion, puis rechargez la page (F5).');
    }
    let classeur;
    try {
        classeur = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    } catch {
        throw new Error('Fichier illisible : choisissez un fichier Excel (.xlsx).');
    }
    const feuille = classeur.Sheets[classeur.SheetNames[0]];
    if (!feuille) throw new Error('Le fichier ne contient aucun onglet.');

    const bruts = XLSX.utils.sheet_to_json(feuille, { defval: '', raw: true });
    if (!bruts.length) throw new Error('Le premier onglet du fichier est vide.');

    const entetes = resoudreEntetes(Object.keys(bruts[0]));
    const rows = [];
    let total = 0;
    let ignorees = 0;

    for (const brut of bruts) {
        const ligne = normaliserLigne(brut, entetes);
        if (!ligne.code_pdv) continue;
        total++;
        if (STATUTS_ACTIFS.includes(normaliserTexte(ligne.statut))) rows.push(ligne);
        else ignorees++;
    }
    return { rows, total, ignorees };
}
