import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const SESSION_KEY = 'fdr_session';

export function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

export function getUser() {
    return getSession()?.user ?? null;
}

export function isSessionValid() {
    const s = getSession();
    if (!s?.access_token) return false;
    if (s.expires_at && Date.now() / 1000 > s.expires_at - 60) return false;
    return true;
}

function saveSession(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

export async function connexion(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method:  'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error_description || err.message || 'Email ou mot de passe incorrect');
    }
    const data = await res.json();
    saveSession(data);
    return data;
}

export async function deconnexion() {
    const s = getSession();
    if (s?.access_token) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method:  'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${s.access_token}` },
        }).catch(() => {});
    }
    clearSession();
}

export async function changerMotDePasse(newPassword) {
    const s = getSession();
    if (!s?.access_token) throw new Error('Non connecté');
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method:  'PUT',
        headers: {
            'apikey':        SUPABASE_KEY,
            'Authorization': `Bearer ${s.access_token}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erreur lors du changement de mot de passe');
    }
}

export async function refreshSession() {
    const s = getSession();
    if (!s?.refresh_token) return null;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method:  'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!res.ok) { clearSession(); return null; }
    const data = await res.json();
    saveSession(data);
    return data;
}
