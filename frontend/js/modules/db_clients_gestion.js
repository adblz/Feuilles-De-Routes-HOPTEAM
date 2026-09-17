import { SUPABASE_URL } from './config.js';
import { buildHeaders } from './db.js';

// ── Gestion du planning clients côté responsable (onglet Import planning) ──
// Lecture du planning en cours et de l'historique des imports, retrait ou
// réaffectation d'un client, annulation du dernier import. Les droits sont
// gérés par Supabase (RLS) : le responsable ne touche que son entreprise.
// Les DELETE / PATCH portent toujours le garde « fait_le=is.null » : un poste
// validé entre-temps par le technicien n'est jamais modifié.

async function appel(method, path, body) {
    const headers = body ? { ...buildHeaders(), Prefer: 'return=minimal' } : buildHeaders();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method, headers, body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Supabase ${method} [${path}]: ${await res.text()}`);
    return method === 'GET' ? res.json() : null;
}

const enc  = (s) => encodeURIComponent(s);
const dans = (ids) => `in.(${ids.map(enc).join(',')})`;

// Toutes les lignes (à faire et faites) de l'entreprise.
export async function chargerPlanningEntreprise(company) {
    return appel('GET',
        `clients_planning?company=eq.${enc(company)}`
        + `&select=id,import_id,user_id,secteur,code_pdv,nom_pdv,ville,code_postal,date_prevue,tirage,fait_le`
        + `&order=nom_pdv.asc`);
}

// Journal des imports de l'entreprise, le plus récent en premier.
export async function chargerImports(company) {
    return appel('GET',
        `clients_imports?company=eq.${enc(company)}`
        + `&select=id,importe_par,importe_le,fichier,nb_total,nb_importees,nb_ignorees`
        + `&order=importe_le.desc`);
}

// Noms des comptes ayant importé (importe_par pointe sur auth.users, pas sur
// profiles : impossible de joindre directement, on lit les profils à part).
export async function chargerNomsProfils(ids) {
    if (!ids.length) return [];
    return appel('GET', `profiles?id=${dans(ids)}&select=id,nom`);
}

// Retire un client (tous ses postes) de la liste d'un technicien.
export async function supprimerLignesPlanning(ids) {
    if (!ids.length) return;
    return appel('DELETE', `clients_planning?id=${dans(ids)}&fait_le=is.null`);
}

// Donne un client (tous ses postes) à un autre technicien.
export async function reaffecterLignesPlanning(ids, userId) {
    if (!ids.length) return;
    return appel('PATCH', `clients_planning?id=${dans(ids)}&fait_le=is.null`, { user_id: userId || null });
}

// Annule un import : ses clients encore à faire sont retirés, puis la trace
// de l'import est supprimée. Les clients déjà faits sont conservés (leur
// import_id passe à null). Deux appels : si le second échoue, l'import reste
// visible et un nouvel essai termine le travail.
export async function annulerImport(importId) {
    await appel('DELETE', `clients_planning?import_id=eq.${enc(importId)}&fait_le=is.null`);
    await appel('DELETE', `clients_imports?id=eq.${enc(importId)}`);
}
