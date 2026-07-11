// Vérification du jeton (token) Supabase pour protéger les routes du backend.
// Mutualise la logique utilisée aussi par adminController (verifierAdmin).

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zblggovelezxxrkbqbcv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibGdnb3ZlbGV6eHhya2JxYmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTE0NjcsImV4cCI6MjA5NzQ2NzQ2N30._KORySYHBmQ0aYp97r-6fLEX_4SF8NrbWYJ8fGFpzJM';

// Renvoie l'utilisateur Supabase correspondant au token, ou null si invalide.
async function verifierUtilisateur(token) {
    if (!token) return null;
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// Middleware Express : exige un utilisateur connecté (n'importe quel rôle).
async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await verifierUtilisateur(token);
    if (!user) return res.status(401).json({ error: 'Non authentifié' });
    req.user = user;
    next();
}

module.exports = { verifierUtilisateur, requireAuth };
