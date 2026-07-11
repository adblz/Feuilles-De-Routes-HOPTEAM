import { SUPABASE_URL } from './config.js';
import { buildHeaders } from './db.js';

// ── Accès à la table `periodes_paie` (planning annuel des heures supp) ──
// Une ligne = une période mensuelle (annee, mois, date_debut, date_fin).
// Lecture ouverte à tout utilisateur connecté ; écriture réservée aux admins (RLS Supabase).

const TABLE = 'periodes_paie';

// Charge toutes les périodes, les plus récentes en premier.
export async function chargerPeriodesPaie() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?order=date_debut.desc`, {
        headers: buildHeaders(),
    });
    if (!res.ok) throw new Error(`Chargement planning : ${await res.text()}`);
    return res.json();
}

export async function creerPeriodePaie(periode) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
        method:  'POST',
        headers: { ...buildHeaders(), Prefer: 'return=minimal' },
        body:    JSON.stringify(periode),
    });
    if (!res.ok) throw new Error(`Création période : ${await res.text()}`);
}

export async function modifierPeriodePaie(id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
        method:  'PATCH',
        headers: { ...buildHeaders(), Prefer: 'return=minimal' },
        body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Modification période : ${await res.text()}`);
}

export async function supprimerPeriodePaie(id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
        method:  'DELETE',
        headers: buildHeaders(),
    });
    if (!res.ok) throw new Error(`Suppression période : ${await res.text()}`);
}
