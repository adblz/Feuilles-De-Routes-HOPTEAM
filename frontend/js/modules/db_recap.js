// Chargement des données d'une période complète (mois) pour le PDF récapitulatif.
// Séparé de db.js : ce dernier sert au cycle de vie d'une feuille du jour.

import { getSession } from './auth.js';
import { SUPABASE_URL } from './config.js';
import { buildHeaders } from './db.js';

const COLS_FEUILLE = [
    'date', 'tech', 'company', 'contrat', 'heure_debut', 'heure_fin',
    'repas_min', 'heures_travail', 'astreinte', 'conge',
].join(',');

const COLS_INTERVENTION = [
    'order_index', 'kind', 'heure_arrivee', 'heure_depart', 'client', 'ville',
    'type_int', 'mo', 'mo_cafe', 'mo_bar', 'becs', 'groupes', 'details', 'pause_debut', 'pause_fin', 'astreinte',
].join(',');

// Toutes les feuilles du technicien connecté entre deux dates (incluses),
// avec le détail complet de leurs interventions, pauses et rappels.
// Les interventions sont triées dans l'ordre de saisie côté JS (pas de tri
// imbriqué côté serveur, pour rester compatible avec toutes les versions).
export async function chargerMoisDetail(debut, fin) {
    const user = getSession()?.user;
    if (!user) return [];

    const path = `feuilles_de_route?user_id=eq.${user.id}`
        + `&date=gte.${debut}&date=lte.${fin}`
        + `&select=${COLS_FEUILLE},interventions(${COLS_INTERVENTION})`
        + `&order=date.asc`;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: buildHeaders() });
    if (!res.ok) throw new Error(`Supabase GET [récap mois]: ${await res.text()}`);

    const feuilles = await res.json();
    for (const f of feuilles) {
        f.interventions = (f.interventions || [])
            .slice()
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    }
    return feuilles;
}
