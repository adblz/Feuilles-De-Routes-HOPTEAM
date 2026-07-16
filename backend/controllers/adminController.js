const { verifierUtilisateur } = require('../middleware/auth');

const SUPABASE_URL         = process.env.SUPABASE_URL         || 'https://zblggovelezxxrkbqbcv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function verifierAdmin(token) {
    const user = await verifierUtilisateur(token);
    if (!user) return false;

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

    const { email, nom, role, contrat, password, company, email_responsable, voit_toutes_entreprises } = req.body;
    if (!email || !nom || !password) {
        return res.status(400).json({ error: 'Données manquantes : email, nom, password' });
    }
    const rolesValides = ['technicien', 'responsable', 'admin'];
    const roleChoisi = rolesValides.includes(role) ? role : 'technicien';

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
        body: JSON.stringify({ id: newUser.id, email, nom, contrat: contrat || null, role: roleChoisi, company: company || '', email_responsable: email_responsable || '', voit_toutes_entreprises: !!voit_toutes_entreprises }),
    });

    if (!profileRes.ok) {
        const errText = await profileRes.text().catch(() => '');
        return res.status(400).json({ error: `Compte créé mais erreur profil : ${errText}` });
    }

    return res.json({ ok: true, id: newUser.id });
};

exports.handleDeleteUser = async (req, res) => {
    if (!SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Variable SUPABASE_SERVICE_KEY manquante sur le serveur' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Non authentifié' });

    const isAdmin = await verifierAdmin(token).catch(() => false);
    if (!isAdmin) return res.status(403).json({ error: 'Accès refusé : rôle admin requis' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID utilisateur manquant' });

    // Supprimer le compte dans Supabase Auth (inclut souvent un CASCADE sur profiles)
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
        method:  'DELETE',
        headers: {
            'apikey':        SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
    });

    if (!authRes.ok) {
        const err = await authRes.json().catch(() => ({}));
        return res.status(400).json({ error: err.msg || err.message || 'Erreur suppression du compte' });
    }

    // Supprimer le profil au cas où il n'y aurait pas de CASCADE
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
        method:  'DELETE',
        headers: {
            'apikey':        SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
    }).catch(() => {});

    return res.json({ ok: true });
};
