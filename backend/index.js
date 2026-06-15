const express    = require('express');
const cors       = require('cors');
const multer     = require('multer');
const nodemailer = require('nodemailer');
const path       = require('path');

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

app.post('/send-email', upload.single('file'), async (req, res) => {
  const { to, techName, techEmail } = req.body;

  if (!req.file) return res.status(400).json({ error: 'Aucun fichier PDF reçu.' });
  if (!to)       return res.status(400).json({ error: 'Email destinataire manquant.' });

  try {
    await transporter.sendMail({
      from:     `"${techName || 'Feuille de Route'}" <${process.env.GMAIL_USER}>`,
      replyTo:  techEmail || undefined,
      to,
      subject:  `Rapport d'intervention — ${techName || 'Technicien'}`,
      html:     '<p>Veuillez trouver en pièce jointe le rapport d\'intervention.</p>',
      attachments: [{
        filename: req.file.originalname || 'rapport.pdf',
        content:  req.file.buffer,
      }],
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur envoi email :', err.message);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
