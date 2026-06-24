const SUPABASE_URL         = process.env.SUPABASE_URL         || 'https://zblggovelezxxrkbqbcv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_KEY         = process.env.SUPABASE_KEY         || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibGdnb3ZlbGV6eHhya2JxYmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTE0NjcsImV4cCI6MjA5NzQ2NzQ2N30._KORySYHBmQ0aYp97r-6fLEX_4SF8NrbWYJ8fGFpzJM';

async function verifierAdmin(token) {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` },
    });
    if (!authRes.ok) return false;
    const user = await authRes.json();

    const profilRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`,
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    if (!profilRes.ok) return false;
    const profils = await profilRes.json();
    return profils[0]?.role === 'admin';
}

exports.handleCreateUser = async (req, res) => {
    if (!SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Variable SUPABASE_SERVICE_KEY manquante sur le serveur' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Non authentifié' });

    const isAdmin = await verifierAdmin(token).catch(() => false);
    if (!isAdmin) return res.status(403).json({ error: 'Accès refusé : rôle admin requis' });

    const { email, nom, contrat, password } = req.body;
    if (!email || !nom || !contrat || !password) {
        return res.status(400).json({ error: 'Données manquantes : email, nom, contrat, password' });
    }

    // Créer le compte dans Supabase Auth
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method:  'POST',
        headers: {
            'apikey':        SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({ email, password, email_confirm: true }),
    });

    if (!authRes.ok) {
        const err = await authRes.json().catch(() => ({}));
        return res.status(400).json({ error: err.msg || err.message || 'Erreur création du compte' });
    }

    const newUser = await authRes.json();

    // Créer le profil dans la table profiles
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method:  'POST',
        headers: {
            'apikey':        SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type':  'application/json',
            'Prefer':        'return=minimal',
        },
        body: JSON.stringify({ id: newUser.id, email, nom, contrat, role: 'technicien' }),
    });

    if (!profileRes.ok) {
        const errText = await profileRes.text().catch(() => '');
        return res.status(400).json({ error: `Compte créé mais erreur profil : ${errText}` });
    }

    return res.json({ ok: true, id: newUser.id });
};
