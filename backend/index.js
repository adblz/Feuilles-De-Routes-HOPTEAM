const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const adminRoutes  = require('./routes/admin');

const app = express();

// Origines autorisées. En production, définir CORS_ORIGINS (liste séparée par des
// virgules) sur le serveur pour verrouiller au domaine exact. Par défaut on accepte
// les sous-domaines Vercel (frontend) + le développement local.
const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

const allowedOrigins = [
    ...envOrigins,
    /\.vercel\.app$/,
    'http://localhost:3000',
    'http://localhost:5500',
];

app.use(cors({
    origin(origin, cb) {
        if (!origin) return cb(null, true);
        const ok = allowedOrigins.some(o =>
            typeof o === 'string' ? o === origin : o.test(origin)
        );
        cb(ok ? null : new Error('CORS refusé'), ok);
    },
}));

// En-têtes de sécurité de base (équivalent minimal à helmet, sans dépendance).
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Le backend sert uniquement à la création de comptes (page Admin).
app.use('/admin', adminRoutes);

// Gestion propre des erreurs.
app.use((err, req, res, next) => {
    if (err && err.message === 'CORS refusé') {
        return res.status(403).json({ error: 'Origine non autorisée.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur.' });
});

// Avertissement si la variable essentielle à la création de comptes manque.
if (!process.env.SUPABASE_SERVICE_KEY) {
    console.warn("⚠️  Variable d'environnement manquante : SUPABASE_SERVICE_KEY");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
