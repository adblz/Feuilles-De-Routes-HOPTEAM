import { getSession, isSessionValid, refreshSession } from './auth.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export function buildHeaders() {
    const token = getSession()?.access_token;
    return {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type':  'application/json',
    };
}

async function uploadPdf(blob, fileName) {
    const token = getSession()?.access_token;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/pdfs/${fileName}`, {
        method: 'POST',
        headers: {
            'apikey':        SUPABASE_KEY,
            'Authorization': `Bearer ${token || SUPABASE_KEY}`,
            'Content-Type':  'application/pdf',
            'x-upsert':      'true',
        },
        body: blob,
    });
    if (!res.ok) throw new Error(`Storage upload: ${await res.text()}`);
    return `${SUPABASE_URL}/storage/v1/object/public/pdfs/${fileName}`;
}

async function dbGet(path) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: buildHeaders() });
    if (!res.ok) throw new Error(`Supabase GET [${path}]: ${await res.text()}`);
    return res.json();
}

async function dbDelete(table, filter) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
        method:  'DELETE',
        headers: buildHeaders(),
    });
    if (!res.ok) throw new Error(`Supabase DELETE [${table}]: ${await res.text()}`);
}

async function dbPost(table, body, returnRow = false) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method:  'POST',
        headers: { ...buildHeaders(), 'Prefer': returnRow ? 'return=representation' : 'return=minimal' },
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Supabase [${table}]: ${await res.text()}`);
    return returnRow ? (await res.json())[0] : null;
}

export async function chargerHistorique() {
    const user = getSession()?.user;
    if (!user) return [];
    // On ne récupère PAS pdf_data ici (trop lourd) : seulement les infos de la liste.
    return dbGet(`feuilles_de_route?user_id=eq.${user.id}&select=id,date,tech,mode,created_at&order=date.desc`);
}

export async function chargerDetailFeuille(id) {
    const [feuilles, elements] = await Promise.all([
        dbGet(`feuilles_de_route?id=eq.${id}&select=id,date,tech,company,contrat,heure_debut,heure_fin,repas_min,heures_travail,heures_supp,mode,created_at`),
        dbGet(`interventions?feuille_id=eq.${id}&order=order_index.asc`),
    ]);
    return { feuille: feuilles[0], elements };
}

// Récupère l'URL du PDF d'une feuille dans Supabase Storage, à la demande.
export async function chargerPdfFeuille(id) {
    const rows = await dbGet(`feuilles_de_route?id=eq.${id}&select=pdf_data`);
    return rows[0]?.pdf_data || null;
}

export async function supprimerFeuille(id) {
    await dbDelete('feuilles_de_route', `id=eq.${id}`);
}

export async function chargerHeuresSupp(debut, fin) {
    const user = getSession()?.user;
    if (!user) return [];
    return dbGet(`feuilles_de_route?user_id=eq.${user.id}&date=gte.${debut}&date=lte.${fin}&select=date,tech,heures_supp,heure_debut,heure_fin&order=date.asc`);
}

function toTime(val) { return val || null; }
function toInt(val)  { return val ? parseInt(val, 10) : null; }

export async function chargerContratProfil() {
    const user = getSession()?.user;
    if (!user) return null;
    const rows = await dbGet(`profiles?id=eq.${user.id}&select=contrat,nom,role,company,email_responsable`);
    return rows[0] || null;
}

export async function sauvegarderContratProfil(contrat) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_mon_contrat`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ nouveau_contrat: contrat }),
    });
    if (!res.ok) throw new Error(`Erreur sauvegarde contrat : ${await res.text()}`);
}

// Enregistre une suggestion d'amélioration envoyée par un technicien.
export async function enregistrerSuggestion(categorie, message) {
    const user = getSession()?.user;
    if (!user) throw new Error('Non connecté');
    await dbPost('suggestions', {
        user_id:        user.id,
        technicien_nom: user.user_metadata?.nom || null,
        categorie,
        message,
        statut:         'nouveau',
    });
}

export async function sauvegarderEnBase({ date, tech, company, contrat, heureDebut, heureFin, repasMin, heuresTravail, heuresSupp, mode, pdfBlob, pdfFileName, elements }) {
    if (!isSessionValid()) await refreshSession();

    const user = getSession()?.user;
    if (!user) throw new Error('Non connecté');

    // Supprimer l'entrée existante pour ce jour/user avant réinsertion (anti-doublon).
    // ON DELETE CASCADE nettoie automatiquement les interventions liées.
    if (date) {
        await dbDelete('feuilles_de_route', `date=eq.${date}&user_id=eq.${user.id}`);
    }

    const pdfUrl = pdfBlob ? await uploadPdf(pdfBlob, pdfFileName) : null;

    // ?select=id : on ne se fait pas renvoyer le gros pdf_data inutilement.
    const feuille = await dbPost('feuilles_de_route?select=id', {
        date,
        user_id:        user.id,
        tech:           tech          || null,
        company:        company       || null,
        contrat:        contrat       || null,
        heure_debut:    toTime(heureDebut),
        heure_fin:      toTime(heureFin),
        repas_min:      toInt(repasMin),
        heures_travail: heuresTravail || null,
        heures_supp:    heuresSupp    || null,
        mode,
        pdf_data:       pdfUrl,
    }, true);

    if (!elements.length) return;

    const rows = elements.map((el, i) => ({
        feuille_id:    feuille.id,
        order_index:   i,
        kind:          el.kind,
        heure_arrivee: el.kind === 'intervention' ? toTime(el.arrivee)  : null,
        heure_depart:  el.kind === 'intervention' ? toTime(el.depart)   : null,
        client:        el.kind === 'intervention' ? (el.client  || null) : null,
        ville:         el.kind === 'intervention' ? (el.ville   || null) : null,
        type_int:      el.kind === 'intervention' ? (el.typeInt || null) : null,
        mo:            el.kind === 'intervention' ? (el.mo      || null) : null,
        becs:          el.kind === 'intervention' ? toInt(el.becs)       : null,
        details:       el.kind === 'intervention' ? (el.details || null) : null,
        pause_debut:   el.kind === 'pause' ? toTime(el.debut) : null,
        pause_fin:     el.kind === 'pause' ? toTime(el.fin)   : null,
    }));

    await dbPost('interventions', rows);
}
