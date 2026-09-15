// Vérification du jeton (token) Supabase pour protéger les routes du backend.
// Mutualise la logique utilisée aussi par adminController (verifierAdmin).
//
// Le site peut tourner sur deux bases Supabase différentes : la base RÉELLE (prod)
// et la base de TEST (utilisée en local). Le frontend indique dans l'en-tête
// "x-supabase-url" sur quelle base il travaille, et on choisit ici les bonnes
// clés en conséquence.

const SUPABASE_PROD_URL = process.env.SUPABASE_URL || 'https://zblggovelezxxrkbqbcv.supabase.co';
const SUPABASE_PROD_KEY = process.env.SUPABASE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibGdnb3ZlbGV6eHhya2JxYmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTE0NjcsImV4cCI6MjA5NzQ2NzQ2N30._KORySYHBmQ0aYp97r-6fLEX_4SF8NrbWYJ8fGFpzJM';
const SUPABASE_PROD_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SUPABASE_DEV_URL = process.env.SUPABASE_URL_DEV || 'https://tqlwndxjtqkdejbauehf.supabase.co';
const SUPABASE_DEV_KEY = process.env.SUPABASE_KEY_DEV ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbHduZHhqdHFrZGVqYmF1ZWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODIyNTcsImV4cCI6MjEwMDU1ODI1N30.cyAmTxQ4ooz1FHepoqgmV232Deky9XK8olCyyqcvSJ4';
const SUPABASE_DEV_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY_DEV;

// Renvoie les identifiants (url, clé publique, clé secrète) de la base visée.
// projectUrl vient de l'en-tête "x-supabase-url" envoyé par le frontend ;
// si absent ou inconnu, on retombe sur la base RÉELLE (comportement historique).
function resolveSupabase(projectUrl) {
    if (projectUrl === SUPABASE_DEV_URL) {
        return { url: SUPABASE_DEV_URL, anonKey: SUPABASE_DEV_KEY, serviceKey: SUPABASE_DEV_SERVICE_KEY };
    }
    return { url: SUPABASE_PROD_URL, anonKey: SUPABASE_PROD_KEY, serviceKey: SUPABASE_PROD_SERVICE_KEY };
}

// Renvoie l'utilisateur Supabase correspondant au token, ou null si invalide.
async function verifierUtilisateur(token, projectUrl) {
    if (!token) return null;
    const { url, anonKey } = resolveSupabase(projectUrl);
    try {
        const res = await fetch(`${url}/auth/v1/user`, {
            headers: { 'apikey': anonKey, 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

module.exports = { verifierUtilisateur, resolveSupabase };
