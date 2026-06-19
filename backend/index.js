const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const emailRoutes  = require('./routes/email');

const app = express();

const allowedOrigins = [
    'https://gorgeous-rugelach-d822f4.netlify.app',
    /\.netlify\.app$/,
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
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/', emailRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
