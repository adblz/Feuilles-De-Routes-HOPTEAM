const express   = require('express');
const cors      = require('cors');
const multer    = require('multer');
const path      = require('path');
const rateLimit = require('express-rate-limit');

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

const allowedOrigins = [
    'https://gorgeous-rugelach-d822f4.netlify.app',
    /\.netlify\.app$/,
    'http://localhost:3000',
    'http://localhost:5500',
];
app.use(cors({
    origin(origin, cb) {
        if (!origin) return cb(null, true); // appels directs / curl
        const ok = allowedOrigins.some(o =>
            typeof o === 'string' ? o === origin : o.test(origin)
        );
        cb(ok ? null : new Error('CORS refusé'), ok);
    },
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Réveil Render : répondre immédiatement pour sortir du cold start
app.get('/ping', (req, res) => res.json({ ok: true }));

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
});

app.post('/send-email', emailLimiter, upload.single('file'), async (req, res) => {
  const { to, techName, techEmail } = req.body;

  if (!req.file) return res.status(400).json({ error: 'Aucun fichier PDF reçu.' });
  if (!to)       return res.status(400).json({ error: 'Email destinataire manquant.' });

  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: {
      email: process.env.SENDGRID_SENDER_EMAIL,
      name:  techName || 'Feuille de Route',
    },
    subject:  `Rapport d'intervention — ${techName || 'Technicien'}`,
    content:  [{ type: 'text/html', value: '<p>Veuillez trouver en pièce jointe le rapport d\'intervention.</p>' }],
    attachments: [{
      content:     req.file.buffer.toString('base64'),
      filename:    req.file.originalname || 'rapport.pdf',
      type:        'application/pdf',
      disposition: 'attachment',
    }],
  };

  if (techEmail) body.reply_to = { email: techEmail };

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = await response.json();
      const msg = data.errors?.[0]?.message || 'Erreur SendGrid';
      return res.status(500).json({ error: msg });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur SendGrid :', err.message);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
