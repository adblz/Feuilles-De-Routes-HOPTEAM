const express   = require('express');
const rateLimit = require('express-rate-limit');
const { verifierUtilisateur }          = require('../middleware/auth');
const { sendTelegram, formatSuggestion, formatErreur } = require('../utils/telegram');

// ── Routes montées sous /admin ──────────────────────────────────

const adminRouter = express.Router();

const suggestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { error: 'Trop de requêtes.' },
});

adminRouter.post('/notify-suggestion', suggestLimiter, async (req, res) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const user  = await verifierUtilisateur(token);
    if (!user) return res.status(401).json({ error: 'Non authentifié.' });

    const { categorie, message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message manquant.' });

    const nom = user.user_metadata?.nom || user.email || 'Inconnu';
    await sendTelegram(formatSuggestion({ categorie: categorie || 'Autre', message: message.trim(), nom }));
    res.json({ ok: true });
});

// ── Routes montées à la racine ──────────────────────────────────

const publicRouter = express.Router();

const errorLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { error: 'Trop de requêtes.' },
});

publicRouter.post('/report-error', errorLimiter, async (req, res) => {
    const KEY = process.env.ERROR_API_KEY;
    if (!KEY) return res.status(503).json({ error: 'Service non configuré.' });
    if (req.headers['x-api-key'] !== KEY) return res.status(401).json({ error: 'Clé invalide.' });

    const { message, source, userEmail, userRole, page } = req.body;
    await sendTelegram(formatErreur({ message, source, userEmail, userRole, page }));
    res.json({ ok: true });
});

module.exports = { adminRouter, publicRouter };
