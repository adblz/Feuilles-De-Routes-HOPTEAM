// Appels Supabase pour la gestion des entreprises (liste, ajout, renommage, suppression).
// Réutilise buildHeaders() de admin_api.js pour l'authentification.

import { SUPABASE_URL } from '../modules/config.js';
import { buildHeaders } from './admin_api.js';

export async function chargerEntreprises() {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/entreprises?select=id,nom,trajet_minutes&order=nom.asc`,
        { headers: await buildHeaders() }
    );
    if (!res.ok) throw new Error(`Chargement entreprises : ${await res.text()}`);
    return res.json();
}

// Enregistre les règles de calcul d'une entreprise (ex. { trajet_minutes: 60 }).
export async function modifierReglesEntreprise(id, regles) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/entreprises?id=eq.${id}`, {
        method:  'PATCH',
        headers: { ...(await buildHeaders()), Prefer: 'return=minimal' },
        body:    JSON.stringify(regles),
    });
    if (!res.ok) throw new Error(`Enregistrement des règles : ${await res.text()}`);
}

export async function creerEntreprise(nom) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/entreprises`, {
        method:  'POST',
        headers: { ...(await buildHeaders()), Prefer: 'return=representation' },
        body:    JSON.stringify({ nom }),
    });
    if (!res.ok) throw new Error(`Création entreprise : ${await res.text()}`);
    return (await res.json())[0];
}

export async function modifierEntreprise(id, nom) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/entreprises?id=eq.${id}`, {
        method:  'PATCH',
        headers: { ...(await buildHeaders()), Prefer: 'return=minimal' },
        body:    JSON.stringify({ nom }),
    });
    if (!res.ok) throw new Error(`Modification entreprise : ${await res.text()}`);
}

export async function supprimerEntreprise(id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/entreprises?id=eq.${id}`, {
        method:  'DELETE',
        headers: await buildHeaders(),
    });
    if (!res.ok) throw new Error(`Suppression entreprise : ${await res.text()}`);
}

// Renomme l'entreprise sur tous les profils qui la portent (cohérence après renommage).
export async function renommerCompagnieProfils(ancien, nouveau) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?company=eq.${encodeURIComponent(ancien)}`, {
        method:  'PATCH',
        headers: { ...(await buildHeaders()), Prefer: 'return=minimal' },
        body:    JSON.stringify({ company: nouveau }),
    });
    if (!res.ok) throw new Error(`Mise à jour des utilisateurs : ${await res.text()}`);
}
