// Modification d'un compte (nom, contrat) et réinitialisation de mot de passe.
// Accessible à l'admin, et au responsable pour les techniciens de son entreprise
// (voir adminGuard.js).
const { chargerAppelant, verifierCible, headersService } = require('./adminGuard');

const CONTRATS_VALIDES = ['35', '37', '39'];

// PATCH /admin/update-user/:id  — body { nom, contrat }
exports.handleUpdateUser = async (req, res) => {
    const garde = await chargerAppelant(req);
    if (garde.error) return res.status(garde.status).json({ error: garde.error });
    const { ctx, appelant } = garde;

    const verif = await verifierCible(ctx, appelant, req.params.id);
    if (verif.error) return res.status(verif.status).json({ error: verif.error });

    // Seuls le nom et le contrat sont modifiables par cette route.
    const data = {};
    if (typeof req.body.nom === 'string' && req.body.nom.trim()) data.nom = req.body.nom.trim();
    if ('contrat' in req.body) {
        const c = req.body.contrat == null ? '' : String(req.body.contrat);
        data.contrat = CONTRATS_VALIDES.includes(c) ? c : null;
    }
    if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'Rien à modifier (nom ou contrat attendu)' });
    }

    const patchRes = await fetch(`${ctx.url}/rest/v1/profiles?id=eq.${req.params.id}`, {
        method:  'PATCH',
        headers: { ...headersService(ctx), 'Prefer': 'return=minimal' },
        body:    JSON.stringify(data),
    });
    if (!patchRes.ok) {
        const errText = await patchRes.text().catch(() => '');
        return res.status(400).json({ error: `Erreur modification du profil : ${errText}` });
    }

    return res.json({ ok: true });
};

// PUT /admin/reset-password/:id  — body { password }
exports.handleResetPassword = async (req, res) => {
    const garde = await chargerAppelant(req);
    if (garde.error) return res.status(garde.status).json({ error: garde.error });
    const { ctx, appelant } = garde;

    const password = String(req.body.password || '');
    if (password.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }

    const verif = await verifierCible(ctx, appelant, req.params.id);
    if (verif.error) return res.status(verif.status).json({ error: verif.error });

    const authRes = await fetch(`${ctx.url}/auth/v1/admin/users/${req.params.id}`, {
        method:  'PUT',
        headers: headersService(ctx),
        body:    JSON.stringify({ password }),
    });
    if (!authRes.ok) {
        const err = await authRes.json().catch(() => ({}));
        return res.status(400).json({ error: err.msg || err.message || 'Erreur changement du mot de passe' });
    }

    return res.json({ ok: true });
};
