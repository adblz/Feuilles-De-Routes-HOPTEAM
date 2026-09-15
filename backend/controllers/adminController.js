// Création et suppression de comptes (admin, ou responsable pour ses techniciens).
// Les droits sont vérifiés dans adminGuard.js.
const { chargerAppelant, verifierCible, headersService } = require('./adminGuard');

const ROLES_VALIDES    = ['technicien', 'responsable', 'admin'];
const CONTRATS_VALIDES = ['35', '37', '39'];

exports.handleCreateUser = async (req, res) => {
    const garde = await chargerAppelant(req);
    if (garde.error) return res.status(garde.status).json({ error: garde.error });
    const { ctx, appelant } = garde;

    const { email, nom, password } = req.body;
    if (!email || !nom || !password) {
        return res.status(400).json({ error: 'Données manquantes : email, nom, password' });
    }
    if (String(password).length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }

    let { role, contrat, company, email_responsable, voit_toutes_entreprises } = req.body;
    if (appelant.role === 'responsable') {
        // Un responsable ne crée que des techniciens, dans sa propre entreprise.
        role = 'technicien';
        company = appelant.company || '';
        voit_toutes_entreprises = false;
        if (!email_responsable) email_responsable = appelant.email;
    }
    const roleChoisi    = ROLES_VALIDES.includes(role) ? role : 'technicien';
    const contratChoisi = CONTRATS_VALIDES.includes(String(contrat)) ? String(contrat) : null;

    // Créer le compte dans Supabase Auth
    const authRes = await fetch(`${ctx.url}/auth/v1/admin/users`, {
        method:  'POST',
        headers: headersService(ctx),
        body:    JSON.stringify({ email, password, email_confirm: true }),
    });
    if (!authRes.ok) {
        const err = await authRes.json().catch(() => ({}));
        return res.status(400).json({ error: err.msg || err.message || 'Erreur création du compte' });
    }
    const newUser = await authRes.json();

    // Créer le profil dans la table profiles
    const profileRes = await fetch(`${ctx.url}/rest/v1/profiles`, {
        method:  'POST',
        headers: { ...headersService(ctx), 'Prefer': 'return=minimal' },
        body: JSON.stringify({
            id: newUser.id, email, nom,
            contrat: contratChoisi,
            role: roleChoisi,
            company: company || '',
            email_responsable: email_responsable || '',
            voit_toutes_entreprises: !!voit_toutes_entreprises,
        }),
    });
    if (!profileRes.ok) {
        const errText = await profileRes.text().catch(() => '');
        return res.status(400).json({ error: `Compte créé mais erreur profil : ${errText}` });
    }

    return res.json({ ok: true, id: newUser.id });
};

exports.handleDeleteUser = async (req, res) => {
    const garde = await chargerAppelant(req);
    if (garde.error) return res.status(garde.status).json({ error: garde.error });
    const { ctx, appelant } = garde;

    const { id } = req.params;
    if (id === appelant.id) {
        return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    const verif = await verifierCible(ctx, appelant, id);
    if (verif.error) return res.status(verif.status).json({ error: verif.error });

    // Supprimer le compte dans Supabase Auth (inclut souvent un CASCADE sur profiles)
    const authRes = await fetch(`${ctx.url}/auth/v1/admin/users/${id}`, {
        method:  'DELETE',
        headers: headersService(ctx),
    });
    if (!authRes.ok) {
        const err = await authRes.json().catch(() => ({}));
        return res.status(400).json({ error: err.msg || err.message || 'Erreur suppression du compte' });
    }

    // Supprimer le profil au cas où il n'y aurait pas de CASCADE
    await fetch(`${ctx.url}/rest/v1/profiles?id=eq.${id}`, {
        method:  'DELETE',
        headers: headersService(ctx),
    }).catch(() => {});

    return res.json({ ok: true });
};
