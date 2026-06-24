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
    const rows = await dbGet(`profiles?id=eq.${user.id}&select=id,role,nom`);
    return rows[0] || null;
}

export async function chargerToutesLesFeuilles() {
    return dbGet(
        `feuilles_de_route?select=id,date,tech,user_id,heures_travail,heures_supp,contrat,mode,created_at,interventions(id,kind)&order=date.desc`
    );
}

export async function chargerPdfResponsable(id) {
    const rows = await dbGet(`feuilles_de_route?id=eq.${id}&select=pdf_data`);
    return rows[0]?.pdf_data || null;
}
