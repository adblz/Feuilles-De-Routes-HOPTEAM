const express = require('express');
const cors    = require('cors');
const multer  = require('multer');
const { Resend } = require('resend');
const path    = require('path');

const app    = express();
const resend = new Resend(process.env.RESEND_API_KEY);
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/send-email', upload.single('file'), async (req, res) => {
  const { to, techName, techEmail } = req.body;

  if (!req.file) return res.status(400).json({ error: 'Aucun fichier PDF reçu.' });
  if (!to)       return res.status(400).json({ error: 'Email destinataire manquant.' });

  const payload = {
    from:    `${techName || 'Feuille de Route'} <onboarding@resend.dev>`,
    to:      [to],
    subject: `Rapport d'intervention — ${techName || 'Technicien'}`,
    html:    '<p>Veuillez trouver en pièce jointe le rapport d\'intervention.</p>',
    attachments: [{
      filename: req.file.originalname || 'rapport.pdf',
      content:  req.file.buffer,
    }],
  };

  if (techEmail) payload.replyTo = techEmail;

  const { data, error } = await resend.emails.send(payload);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true, id: data.id });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
