const { sendEmail } = require('../services/sendgrid');

async function handleSendEmail(req, res) {
    const { to, techName, techEmail } = req.body;

    if (!req.file) return res.status(400).json({ error: 'Aucun fichier PDF reçu.' });
    if (!to)       return res.status(400).json({ error: 'Email destinataire manquant.' });

    try {
        await sendEmail({
            to,
            fromEmail: process.env.SENDGRID_SENDER_EMAIL,
            fromName:  techName || 'Feuille de Route',
            fileBuffer: req.file.buffer,
            fileName:   req.file.originalname || 'rapport.pdf',
            replyTo:    techEmail || null,
        });
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('Erreur SendGrid :', err.message);
        return res.status(500).json({ error: err.message });
    }
}

module.exports = { handleSendEmail };
