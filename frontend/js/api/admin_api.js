import { getSession, isSessionValid, refreshSession } from '../modules/auth.js';
import { SUPABASE_URL, SUPABASE_KEY } from '../modules/config.js';
import { fetchBackend } from './backend_retry.js';

const BACKEND       = 'https://feuilles-de-routes-hopteam.onrender.com';
const ERROR_API_KEY = 'fdr-hopteam-errors-k7x2m9p';

// Renouvelle le jeton d'accès s'il est expiré, pour éviter les erreurs 401
// quand la page admin est restée ouverte plus d'1 h.
async function getFreshToken() {
    if (!isSessionValid()) await refreshSession();
    return getSession()?.access_token;
}

async function buildHeaders() {
    const token = await getFreshToken();
    return {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type':  'application/json',
    };
}

export async function chargerTousLesProfils() {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id,email,nom,contrat,role,company,email_responsable,voit_toutes_entreprises&order=company.asc,role.asc,nom.asc`,
        { headers: await buildHeaders() }
    );
    if (!res.ok) throw new Error(`Chargement utilisateurs : ${await res.text()}`);
    return res.json();
}

export async function chargerEntreprises() {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/entreprises?select=id,nom&order=nom.asc`,
        { headers: await buildHeaders() }
    );
    if (!res.ok) throw new Error(`Chargement entreprises : ${await res.text()}`);
    return res.json();
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

export async function modifierProfil(id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
        method:  'PATCH',
        headers: { ...(await buildHeaders()), Prefer: 'return=minimal' },
        body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Modification profil : ${await res.text()}`);
}

export async function chargerSuggestions() {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/suggestions?select=*&order=created_at.desc`,
        { headers: await buildHeaders() }
    );
    if (!res.ok) throw new Error(`Chargement suggestions : ${await res.text()}`);
    return res.json();
}

export async function marquerSuggestion(id, statut) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/suggestions?id=eq.${id}`, {
        method:  'PATCH',
        headers: { ...(await buildHeaders()), Prefer: 'return=minimal' },
        body:    JSON.stringify({ statut }),
    });
    if (!res.ok) throw new Error(`Mise à jour suggestion : ${await res.text()}`);
}

export async function supprimerSuggestion(id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/suggestions?id=eq.${id}`, {
        method:  'DELETE',
        headers: await buildHeaders(),
    });
    if (!res.ok) throw new Error(`Suppression suggestion : ${await res.text()}`);
}

export async function notifySuggestion(categorie, message) {
    const token = await getFreshToken();
    if (!token) return;
    try {
        await fetch(`${BACKEND}/admin/notify-suggestion`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body:    JSON.stringify({ categorie, message }),
            keepalive: true,
        });
    } catch { /* notification silencieuse */ }
}

export async function reportError({ message, source, userEmail, userRole, page }) {
    try {
        await fetch(`${BACKEND}/report-error`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': ERROR_API_KEY },
            body:    JSON.stringify({ message, source, userEmail, userRole, page }),
            keepalive: true,
        });
    } catch { /* notification silencieuse */ }
}

export async function supprimerUtilisateur(id) {
    const token = await getFreshToken();
    const res = await fetchBackend(`${BACKEND}/admin/delete-user/${id}`, {
        method:  'DELETE',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la suppression');
    }
    return res.json();
}

export async function creerUtilisateur(email, nom, role, contrat, password, company, emailResp, voitToutesEntreprises) {
    const token = await getFreshToken();
    const res = await fetchBackend(`${BACKEND}/admin/create-user`, {
        method:  'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email, nom, role: role || 'technicien', contrat, password, company: company || '', email_responsable: emailResp || '', voit_toutes_entreprises: !!voitToutesEntreprises }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la création');
    }
    return res.json();
}
