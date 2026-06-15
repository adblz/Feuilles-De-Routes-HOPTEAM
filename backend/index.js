const express = require('express');
const cors    = require('cors');
const multer  = require('multer');
const path    = require('path');

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/send-email', upload.single('file'), async (req, res) => {
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
