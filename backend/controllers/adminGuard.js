// Garde commun des routes /admin : identifie l'appelant (admin ou responsable)
// et décide s'il a le droit d'agir sur un compte cible.
//
// Règles :
//   - admin       → peut tout faire.
//   - responsable → uniquement des TECHNICIENS de SA propre entreprise
//                   (même avec voit_toutes_entreprises : lecture partout,
//                   gestion seulement chez lui).
//   - technicien  → rien.
const { verifierUtilisateur, resolveSupabase } = require('../middleware/auth');

function headersService(ctx) {
    return {
        'apikey':        ctx.serviceKey,
        'Authorization': `Bearer ${ctx.serviceKey}`,
        'Content-Type':  'application/json',
    };
}

// Lit le jeton de la requête et renvoie { ctx, appelant } ou { status, error }.
async function chargerAppelant(req) {
    const projectUrl = req.headers['x-supabase-url'];
    const { url, serviceKey } = resolveSupabase(projectUrl);
    if (!serviceKey) {
        return { status: 500, error: 'Variable SUPABASE_SERVICE_KEY manquante sur le serveur pour cette base' };
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return { status: 401, error: 'Non authentifié' };

    const user = await verifierUtilisateur(token, projectUrl).catch(() => null);
    if (!user) return { status: 401, error: 'Session invalide' };

    const ctx = { url, serviceKey };
    const profil = await chargerProfil(ctx, user.id);
    if (!profil) return { status: 403, error: 'Profil introuvable' };
    if (profil.role !== 'admin' && profil.role !== 'responsable') {
        return { status: 403, error: 'Accès refusé : rôle admin ou responsable requis' };
    }

    return { ctx, appelant: { ...profil, email: user.email || '' } };
}

// Lit un profil (id, role, company, voit_toutes_entreprises) avec la clé service.
async function chargerProfil(ctx, id) {
    const res = await fetch(
        `${ctx.url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,role,company,voit_toutes_entreprises`,
        { headers: headersService(ctx) }
    ).catch(() => null);
    if (!res || !res.ok) return null;
    const rows = await res.json().catch(() => []);
    return rows[0] || null;
}

// L'appelant a-t-il le droit d'agir (modifier / supprimer / mot de passe) sur cible ?
function peutGererCible(appelant, cible) {
    if (!cible) return false;
    if (appelant.role === 'admin') return true;
    if (appelant.role !== 'responsable') return false;
    return cible.role === 'technicien' && (cible.company || '') === (appelant.company || '');
}

// Charge la cible et vérifie le droit en une fois. Renvoie { cible } ou { status, error }.
async function verifierCible(ctx, appelant, id) {
    if (!id) return { status: 400, error: 'ID utilisateur manquant' };
    const cible = await chargerProfil(ctx, id);
    if (!cible) return { status: 404, error: 'Utilisateur introuvable' };
    if (!peutGererCible(appelant, cible)) {
        return { status: 403, error: 'Accès refusé : vous ne pouvez gérer que les techniciens de votre entreprise' };
    }
    return { cible };
}

module.exports = { chargerAppelant, chargerProfil, peutGererCible, verifierCible, headersService };
