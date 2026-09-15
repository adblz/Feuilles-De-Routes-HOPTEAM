// Requêtes Supabase de la table validations_heures_supp : heures supp
// validées par le responsable, une ligne par (technicien, date).
// Les règles de sécurité Supabase limitent chaque responsable à son entreprise.

import { getSession } from './auth.js';
import { SUPABASE_URL } from './config.js';
import { buildHeaders } from './db.js';

const TABLE = 'validations_heures_supp';
const COLS  = 'id,user_id,date,company,heures_validees_min,commentaire,validee_par,validee_le';

export async function chargerValidations(dateDebut, dateFin) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/${TABLE}?select=${COLS}&date=gte.${dateDebut}&date=lte.${dateFin}&order=date.asc`,
        { headers: buildHeaders() }
    );
    if (!res.ok) throw new Error(`Chargement validations : ${await res.text()}`);
    return res.json();
}

// Crée la validation, ou remplace celle qui existe déjà pour ce jour-là.
export async function enregistrerValidation({ user_id, date, company, heures_validees_min, commentaire }) {
    const body = {
        user_id, date,
        company: company || null,
        heures_validees_min: Math.max(0, Math.round(heures_validees_min || 0)),
        commentaire: (commentaire || '').trim() || null,
        validee_par: getSession()?.user?.id || null,
        validee_le: new Date().toISOString(),
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=user_id,date`, {
        method:  'POST',
        headers: { ...buildHeaders(), Prefer: 'resolution=merge-duplicates,return=representation' },
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Enregistrement validation : ${await res.text()}`);
    const rows = await res.json();
    return rows[0] || body;
}

export async function supprimerValidation(user_id, date) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?user_id=eq.${user_id}&date=eq.${date}`, {
        method:  'DELETE',
        headers: buildHeaders(),
    });
    if (!res.ok) throw new Error(`Suppression validation : ${await res.text()}`);
}
