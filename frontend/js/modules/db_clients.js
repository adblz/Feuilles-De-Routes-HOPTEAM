import { getSession } from './auth.js';
import { SUPABASE_URL } from './config.js';
import { buildHeaders } from './db.js';

// ── Accès aux tables du planning clients (import Excel « sanitation ») ──
// clients_planning : une ligne = un client (PDV) à visiter, affecté à un technicien.
// clients_secteurs : correspondance « Secteur technicien » (Excel) → compte technicien.
// clients_imports  : journal des imports (« Dernier import : … »).
// Les droits sont gérés par Supabase (RLS) : le technicien ne lit que ses
// lignes, le responsable ne gère que son entreprise.

const CLIENTS_SELECT = 'id,code_pdv,nom_pdv,adresse,ville,code_postal,telephone,statut,date_prevue,periodicite,tirage,secteur';

async function dbGet(path) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: buildHeaders() });
    if (!res.ok) throw new Error(`Supabase GET [${path}]: ${await res.text()}`);
    return res.json();
}

async function dbPost(path, body, prefer = 'return=minimal') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method:  'POST',
        headers: { ...buildHeaders(), Prefer: prefer },
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Supabase POST [${path}]: ${await res.text()}`);
    // Avec « return=minimal », Supabase répond sans contenu : rien à lire.
    return prefer.includes('return=minimal') ? null : res.json();
}

async function dbRpc(fonction, params) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fonction}`, {
        method:  'POST',
        headers: buildHeaders(),
        body:    JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Supabase RPC [${fonction}]: ${await res.text()}`);
    return res.json();
}

const enc = (s) => encodeURIComponent(s);

// ── Côté technicien ────────────────────────────────────────────

// Mes clients encore à faire, les dates prévues les plus anciennes en premier
// (donc les retards d'abord), les lignes sans date à la fin.
export async function chargerMesClients() {
    const user = getSession()?.user;
    if (!user) return [];
    return dbGet(
        `clients_planning?user_id=eq.${user.id}&fait_le=is.null&select=${CLIENTS_SELECT}`
        + `&order=date_prevue.asc.nullslast,nom_pdv.asc`
    );
}

// Marque mes clients comme faits (appelé après l'enregistrement d'une feuille).
export async function marquerClientsFaits(ids, feuilleId, dateISO) {
    return dbRpc('marquer_clients_faits', { p_ids: ids, p_feuille: feuilleId, p_date: dateISO });
}

// ── Côté responsable ───────────────────────────────────────────

export async function chargerMappingSecteurs(company) {
    return dbGet(`clients_secteurs?company=eq.${enc(company)}&select=secteur,user_id`);
}

// rows = [{ company, secteur, user_id }] — écrase la correspondance existante
// pour le même couple (company, secteur).
export async function sauvegarderMappingSecteurs(rows) {
    if (!rows.length) return;
    return dbPost('clients_secteurs', rows, 'resolution=merge-duplicates,return=minimal');
}

// Clients faits récemment dans l'entreprise (pour détecter à l'import ceux
// qui ressortent alors qu'ils viennent d'être faits).
export async function chargerClientsFaitsRecents(company, depuisISO) {
    return dbGet(
        `clients_planning?company=eq.${enc(company)}&fait_le=gte.${depuisISO}`
        + `&select=code_pdv,nom_pdv,fait_le,date_prevue,user_id`
    );
}

// Import tout-ou-rien (fonction SQL). Renvoie l'id du journal d'import.
export async function importerClientsPlanning({ company, lignes, codesReafficher, fichier, nbTotal, nbIgnorees }) {
    return dbRpc('importer_clients_planning', {
        p_company:          company,
        p_lignes:           lignes,
        p_codes_reafficher: codesReafficher || [],
        p_fichier:          fichier || '',
        p_nb_total:         nbTotal || 0,
        p_nb_ignorees:      nbIgnorees || 0,
    });
}

export async function chargerDernierImport(company) {
    const rows = await dbGet(
        `clients_imports?company=eq.${enc(company)}&select=importe_le,nb_importees,fichier`
        + `&order=importe_le.desc&limit=1`
    );
    return rows[0] || null;
}
