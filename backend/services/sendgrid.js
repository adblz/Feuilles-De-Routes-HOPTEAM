async function sendEmail({ to, fromEmail, fromName, fileBuffer, fileName, replyTo }) {
    const body = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: fromName },
        subject: `Rapport d'intervention — ${fromName}`,
        content: [{ type: 'text/html', value: '<p>Veuillez trouver en pièce jointe le rapport d\'intervention.</p>' }],
        attachments: [{
            content:     fileBuffer.toString('base64'),
            filename:    fileName || 'rapport.pdf',
            type:        'application/pdf',
            disposition: 'attachment',
        }],
    };
    if (replyTo) body.reply_to = { email: replyTo };

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
        throw new Error(data.errors?.[0]?.message || 'Erreur SendGrid');
    }
}

module.exports = { sendEmail };
