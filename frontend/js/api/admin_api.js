import { getSession } from '../modules/auth.js';
import { SUPABASE_URL, SUPABASE_KEY } from '../modules/config.js';

const BACKEND       = 'https://feuilles-de-routes-hopteam.onrender.com';
const ERROR_API_KEY = 'fdr-hopteam-errors-k7x2m9p';

function buildHeaders() {
    const token = getSession()?.access_token;
    return {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type':  'application/json',
    };
}

export async function chargerTousLesProfils() {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id,email,nom,contrat,role,company,email_responsable,voit_toutes_entreprises&order=company.asc,role.asc,nom.asc`,
        { headers: buildHeaders() }
    );
    if (!res.ok) throw new Error(`Chargement utilisateurs : ${await res.text()}`);
    return res.json();
}

export async function modifierProfil(id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
        method:  'PATCH',
        headers: { ...buildHeaders(), Prefer: 'return=minimal' },
        body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Modification profil : ${await res.text()}`);
}

export async function chargerSuggestions() {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/suggestions?select=*&order=created_at.desc`,
        { headers: buildHeaders() }
    );
    if (!res.ok) throw new Error(`Chargement suggestions : ${await res.text()}`);
    return res.json();
}

export async function marquerSuggestion(id, statut) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/suggestions?id=eq.${id}`, {
        method:  'PATCH',
        headers: { ...buildHeaders(), Prefer: 'return=minimal' },
        body:    JSON.stringify({ statut }),
    });
    if (!res.ok) throw new Error(`Mise à jour suggestion : ${await res.text()}`);
}

export async function supprimerSuggestion(id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/suggestions?id=eq.${id}`, {
        method:  'DELETE',
        headers: buildHeaders(),
    });
    if (!res.ok) throw new Error(`Suppression suggestion : ${await res.text()}`);
}

export async function notifySuggestion(categorie, message) {
    const token = getSession()?.access_token;
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
    const token = getSession()?.access_token;
    const res = await fetch(`${BACKEND}/admin/delete-user/${id}`, {
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
    const token = getSession()?.access_token;
    const res = await fetch(`${BACKEND}/admin/create-user`, {
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
