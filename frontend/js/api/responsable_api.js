// Appels backend (Render) de la page responsable : gestion des techniciens.
// Le backend vérifie lui-même que l'appelant est responsable et n'agit que
// sur des techniciens de sa propre entreprise (backend/controllers/adminGuard.js).
// La suppression réutilise la fonction de admin_api.js.

import { getSession, isSessionValid, refreshSession } from '../modules/auth.js';
import { SUPABASE_URL } from '../modules/config.js';
import { fetchBackend } from './backend_retry.js';

export { supprimerUtilisateur } from './admin_api.js';

const BACKEND = 'https://feuilles-de-routes-hopteam.onrender.com';

async function appelBackend(method, path, body) {
    if (!isSessionValid()) await refreshSession();
    const token = getSession()?.access_token;
    const res = await fetchBackend(`${BACKEND}${path}`, {
        method,
        headers: {
            'Content-Type':   'application/json',
            'Authorization':  `Bearer ${token}`,
            'x-supabase-url': SUPABASE_URL,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur serveur (${res.status})`);
    }
    return res.json();
}

// Crée un technicien : le backend force le rôle et l'entreprise du responsable.
export async function creerTechnicien(email, nom, contrat, password) {
    return appelBackend('POST', '/admin/create-user', { email, nom, contrat, password, role: 'technicien' });
}

export async function modifierTechnicien(id, { nom, contrat }) {
    return appelBackend('PATCH', `/admin/update-user/${id}`, { nom, contrat });
}

export async function reinitialiserMotDePasse(id, password) {
    return appelBackend('PUT', `/admin/reset-password/${id}`, { password });
}
