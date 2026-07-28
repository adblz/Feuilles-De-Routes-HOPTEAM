const cron = require('node-cron');
const { sendTelegram, formatResume } = require('./telegram');

const SUPABASE_URL         = process.env.SUPABASE_URL         || 'https://zblggovelezxxrkbqbcv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Envoie sur Telegram le nombre de feuilles de route reçues aujourd'hui.
async function envoyerResumeDuJour() {
    if (!SUPABASE_SERVICE_KEY) return;
    const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/feuilles_de_route?date=eq.${aujourdhui}&select=tech`,
            { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
        );
        if (!res.ok) return;
        const feuilles = await res.json();
        const techniciens = [...new Set(feuilles.map(f => f.tech).filter(Boolean))];
        await sendTelegram(formatResume({ nbFeuilles: feuilles.length, techniciens }));
    } catch (err) {
        console.warn(`[resume] Erreur : ${err.message}`);
    }
}

// Tous les jours à 20h (heure de Paris).
function demarrerResumeQuotidien() {
    cron.schedule('0 20 * * *', envoyerResumeDuJour, { timezone: 'Europe/Paris' });
}

module.exports = { demarrerResumeQuotidien };
