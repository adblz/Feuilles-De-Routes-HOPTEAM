// Bascule AUTOMATIQUE entre la base REELLE (prod) et la base de TEST (dev).
//   - Ouvert en local (ton PC, ou ton telephone via Tailscale)  -> base de TEST
//   - Ouvert en ligne (site Vercel)                             -> base REELLE
// Aucune manipulation a faire : le choix se fait selon l'adresse d'ou l'app est
// ouverte. La cle "anon" est publique par nature (elle est livree dans le site
// visible par tous), donc avoir les deux ici ne pose aucun probleme de securite.

const PROD = {
    url: 'https://zblggovelezxxrkbqbcv.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibGdnb3ZlbGV6eHhya2JxYmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTE0NjcsImV4cCI6MjA5NzQ2NzQ2N30._KORySYHBmQ0aYp97r-6fLEX_4SF8NrbWYJ8fGFpzJM',
};

const DEV = {
    url: 'https://tqlwndxjtqkdejbauehf.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbHduZHhqdHFrZGVqYmF1ZWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODIyNTcsImV4cCI6MjEwMDU1ODI1N30.cyAmTxQ4ooz1FHepoqgmV232Deky9XK8olCyyqcvSJ4',
};

// Adresses considerees comme "locales" (donc base de TEST) :
//   localhost / 127.0.0.1, un nom .local, l'IP Tailscale (100.x),
//   ou une IP de reseau local (192.168.x / 10.x).
const h = location.hostname;
const estLocal =
    h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') ||
    h.startsWith('100.') || h.startsWith('192.168.') || h.startsWith('10.');

const CIBLE = estLocal ? DEV : PROD;

export const SUPABASE_URL = CIBLE.url;
export const SUPABASE_KEY = CIBLE.key;

// Repere visible dans la console du navigateur (F12) pour verifier quelle base
// est active a tout moment.
console.log(`[config] Base active : ${estLocal ? 'DE TEST (dev)' : 'REELLE (prod)'} -> ${SUPABASE_URL}`);
