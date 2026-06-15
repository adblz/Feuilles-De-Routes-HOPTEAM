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
    sender: {
      name:  techName || 'Feuille de Route',
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: [{ email: to }],
    subject:     `Rapport d'intervention — ${techName || 'Technicien'}`,
    htmlContent: '<p>Veuillez trouver en pièce jointe le rapport d\'intervention.</p>',
    attachment: [{
      name:    req.file.originalname || 'rapport.pdf',
      content: req.file.buffer.toString('base64'),
    }],
  };

  if (techEmail) body.replyTo = { email: techEmail };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept':       'application/json',
        'api-key':      process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) return res.status(500).json({ error: data.message || 'Erreur Brevo' });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur Brevo :', err.message);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
