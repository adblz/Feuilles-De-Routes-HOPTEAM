const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let _warned = false;

function heure() {
    return new Date().toLocaleString('fr-FR', {
        timeZone: 'Europe/Paris',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendTelegram(text) {
    if (!TOKEN || !CHAT_ID) {
        if (!_warned) {
            console.warn('[telegram] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant — notifications désactivées');
            _warned = true;
        }
        return;
    }
    try {
        const res = await fetch(
            `https://api.telegram.org/bot${TOKEN}/sendMessage`,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
            }
        );
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.warn(`[telegram] Échec envoi : ${res.status} ${body}`);
        }
    } catch (err) {
        console.warn(`[telegram] Erreur réseau : ${err.message}`);
    }
}

function formatSuggestion({ categorie, message, nom }) {
    return `🔔 <b>Nouvelle suggestion</b>\n\n👤 <b>Technicien :</b> ${esc(nom)}\n📂 <b>Catégorie :</b> ${esc(categorie)}\n💬 <b>Message :</b>\n${esc(message)}\n\n🕐 ${heure()}`;
}

// Motifs d'erreurs déjà rencontrées, avec leur explication en français.
// Le premier motif qui correspond est utilisé (les plus précis sont placés en premier).
const ERREURS_CONNUES = [
    {
        motif: /script.*load failed/i,
        explication: "Échec ponctuel du chargement d'un fichier (souvent le service worker sw.js) au démarrage de l'appli — généralement une coupure réseau très brève (changement Wi-Fi/4G). Sans gravité, l'appli continue de fonctionner normalement.",
    },
    {
        motif: /failed to fetch|networkerror|load failed/i,
        explication: "Une requête réseau a échoué — connexion internet coupée ou instable au moment de l'action.",
    },
    {
        motif: /cors/i,
        explication: "Le navigateur a bloqué une requête vers un autre site pour des raisons de sécurité (CORS). Peut venir d'une mauvaise configuration ou d'un service externe temporairement indisponible.",
    },
    {
        motif: /quotaexceedederror/i,
        explication: "Le stockage local du navigateur est plein (souvent après une longue utilisation sans le vider).",
    },
];

function expliquerErreur(message) {
    const regle = ERREURS_CONNUES.find(r => r.motif.test(String(message || '')));
    return regle ? regle.explication : null;
}

function formatErreur({ userEmail, userRole, page, message, source }) {
    const user = userEmail
        ? `${esc(userEmail)}${userRole ? ` (${esc(userRole)})` : ''}`
        : 'Non connecté';
    const explication = expliquerErreur(message);
    const ligneExplication = explication ? `\n💡 <b>Explication :</b> ${esc(explication)}` : '';
    return `🚨 <b>Erreur frontend</b>\n\n👤 <b>Utilisateur :</b> ${user}\n📄 <b>Page :</b> ${esc(page || '?')}\n💥 <b>Erreur :</b> ${esc((message || '').slice(0, 300))}\n📍 <b>Source :</b> ${esc((source || '').slice(0, 150))}${ligneExplication}\n\n🕐 ${heure()}`;
}

module.exports = { sendTelegram, formatSuggestion, formatErreur };
