import { getSession } from './auth.js';
import { SUPABASE_URL } from './config.js';
import { buildHeaders } from './db.js';

async function dbGet(path) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: buildHeaders() });
    if (!res.ok) throw new Error(`Supabase GET [${path}]: ${await res.text()}`);
    return res.json();
}

export async function chargerMonProfil() {
    const user = getSession()?.user;
    if (!user) return null;
    const rows = await dbGet(`profiles?id=eq.${user.id}&select=id,role,nom,company,voit_toutes_entreprises`);
    return rows[0] || null;
}

export async function chargerToutesLesFeuilles() {
    return dbGet(
        `feuilles_de_route?select=id,date,tech,user_id,heures_travail,heures_supp,contrat,mode,conge,created_at,interventions(id,kind)&order=date.desc`
    );
}

// Techniciens visibles par le responsable (sa ou ses entreprises, selon les
// règles Supabase). email et contrat servent à l'onglet « Techniciens ».
export async function chargerProfilsTechniciens() {
    return dbGet(`profiles?select=id,nom,email,company,contrat&role=eq.technicien&order=nom.asc`);
}

export async function chargerPdfResponsable(id) {
    const rows = await dbGet(`feuilles_de_route?id=eq.${id}&select=pdf_data`);
    return rows[0]?.pdf_data || null;
}

// Vue numérique d'une feuille : en-tête complet + toutes ses lignes
// (interventions, pauses, sorties supplémentaires) dans l'ordre de saisie.
export async function chargerDetailFeuilleResponsable(id) {
    const [feuilles, elements] = await Promise.all([
        dbGet(`feuilles_de_route?id=eq.${id}&select=id,date,tech,user_id,company,contrat,heure_debut,heure_fin,repas_min,heures_travail,heures_supp,astreinte,conge,mode,created_at`),
        dbGet(`interventions?feuille_id=eq.${id}&order=order_index.asc`),
    ]);
    return { feuille: feuilles[0] || null, elements };
}
