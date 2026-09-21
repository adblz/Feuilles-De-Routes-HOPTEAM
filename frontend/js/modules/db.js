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
    return dbGet(`feuilles_de_route?user_id=eq.${user.id}&select=id,date,tech,mode,conge,created_at&order=date.desc`);
}

export async function chargerDetailFeuille(id) {
    const [feuilles, elements] = await Promise.all([
        dbGet(`feuilles_de_route?id=eq.${id}&select=id,date,tech,company,contrat,heure_debut,heure_fin,repas_min,heures_travail,heures_supp,astreinte,mode,created_at`),
        dbGet(`interventions?feuille_id=eq.${id}&order=order_index.asc`),
    ]);
    return { feuille: feuilles[0], elements };
}

// Récupère l'URL du PDF d'une feuille dans Supabase Storage, à la demande.
export async function chargerPdfFeuille(id) {
    const rows = await dbGet(`feuilles_de_route?id=eq.${id}&select=pdf_data`);
    return rows[0]?.pdf_data || null;
}

async function supprimerPdfStorage(pdfUrl) {
    const fileName = pdfUrl.split('/pdfs/').pop();
    const token = getSession()?.access_token;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/pdfs/${fileName}`, {
        method:  'DELETE',
        headers: {
            'apikey':        SUPABASE_KEY,
            'Authorization': `Bearer ${token || SUPABASE_KEY}`,
        },
    });
    if (!res.ok) throw new Error(`Storage delete: ${await res.text()}`);
}

export async function supprimerFeuille(id) {
    const rows  = await dbGet(`feuilles_de_route?id=eq.${id}&select=pdf_data`);
    const pdfUrl = rows[0]?.pdf_data;
    if (pdfUrl) {
        try {
            await supprimerPdfStorage(pdfUrl);
        } catch (e) {
            console.warn('Suppression PDF storage échouée:', e);
        }
    }
    await dbDelete('feuilles_de_route', `id=eq.${id}`);
}

export async function chargerHeuresSupp(debut, fin) {
    const user = getSession()?.user;
    if (!user) return [];
    return dbGet(`feuilles_de_route?user_id=eq.${user.id}&date=gte.${debut}&date=lte.${fin}&select=date,tech,contrat,heures_travail,heure_debut,heure_fin,astreinte,conge,interventions(kind,heure_arrivee,heure_depart,client,ville,pause_debut,pause_fin)&order=date.asc`);
}

// Marque une journée comme congé (case rouge du calendrier) : remplace toute
// feuille existante à cette date par une ligne vide avec conge = true.
export async function marquerConge(date) {
    if (!isSessionValid()) await refreshSession();
    const user = getSession()?.user;
    if (!user) throw new Error('Non connecté');
    const nomChamp = document.getElementById('technicien')?.value.trim();

    await dbDelete('feuilles_de_route', `date=eq.${date}&user_id=eq.${user.id}`);
    await dbPost('feuilles_de_route', {
        date,
        user_id:        user.id,
        tech:           nomChamp || null,
        heures_travail: '0h00',
        heures_supp:    '0h00',
        astreinte:      false,
        mode:           'conge',
        conge:          true,
    });
}

// Annule un jour de congé : supprime la ligne vide posée par marquerConge().
export async function annulerConge(date) {
    const user = getSession()?.user;
    if (!user) throw new Error('Non connecté');
    await dbDelete('feuilles_de_route', `date=eq.${date}&user_id=eq.${user.id}&conge=eq.true`);
}

function toTime(val) { return val || null; }
function toInt(val)  { return val ? parseInt(val, 10) : null; }

export async function chargerContratProfil() {
    const user = getSession()?.user;
    if (!user) return null;
    const rows = await dbGet(`profiles?id=eq.${user.id}&select=contrat,nom,role,company,email_responsable`);
    return rows[0] || null;
}

// Config complète de l'entreprise du technicien : logo, règles de calcul
// d'heures (trajet, seuil hebdo, palier 25/50, plage de nuit), mentions PDF,
// mois calendaire. On lit toutes les colonnes (`*`) : une colonne ajoutée
// plus tard mais dont la migration n'est pas encore passée ne casse rien.
// Renvoie null si l'entreprise est inconnue ou introuvable.
export async function chargerReglesEntreprise(company) {
    if (!company) return null;
    try {
        const rows = await dbGet(`entreprises?nom=eq.${encodeURIComponent(company)}&select=*`);
        return rows[0] || null;
    } catch {
        // Colonnes de config pas encore ajoutées (migration 2026-07-26 non
        // exécutée) : on retombe sur le seul temps de trajet, comportement
        // historique. Les autres règles gardent alors leurs valeurs par défaut.
        const rows = await dbGet(`entreprises?nom=eq.${encodeURIComponent(company)}&select=trajet_minutes`);
        return rows[0] || null;
    }
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
    // Le nom du technicien vit dans la table profiles, pas dans user_metadata.
    // On le récupère depuis le champ verrouillé du formulaire (rempli au démarrage).
    const nomChamp = document.getElementById('technicien')?.value.trim();
    await dbPost('suggestions', {
        user_id:        user.id,
        technicien_nom: nomChamp || user.user_metadata?.nom || null,
        categorie,
        message,
        statut:         'nouveau',
    });
}

export async function sauvegarderEnBase({ date, tech, company, contrat, heureDebut, heureFin, repasMin, heuresTravail, heuresSupp, astreinte, mode, pdfBlob, pdfFileName, elements }) {
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
        astreinte:      !!astreinte,
        mode,
        pdf_data:       pdfUrl,
    }, true);

    if (!elements.length) return feuille.id;

    const rows = elements.map((el, i) => ({
        feuille_id:    feuille.id,
        order_index:   i,
        kind:          el.kind,
        heure_arrivee: el.kind === 'intervention' ? toTime(el.arrivee)  : null,
        heure_depart:  el.kind === 'intervention' ? toTime(el.depart)   : null,
        client:        el.kind === 'intervention' ? (el.client  || null) : null,
        ville:         el.kind === 'intervention' ? (el.ville   || null) : null,
        type_int:      el.kind === 'intervention' ? (el.typeInt || null) : null,
        mo:            el.kind === 'intervention' ? (el.mo      || null) : null,   // main d'œuvre bière
        mo_cafe:       el.kind === 'intervention' ? (el.mo_cafe || null) : null,
        mo_bar:        el.kind === 'intervention' ? (el.mo_bar  || null) : null,
        becs:          el.kind === 'intervention' ? toInt(el.becs)       : null,
        groupes:       el.kind === 'intervention' ? toInt(el.groupes)    : null,
        details:       el.kind === 'intervention' ? (el.details || null) : null,
        // 'rappel' réutilise les colonnes pause_debut/pause_fin (pas de nouvelle colonne).
        pause_debut:   (el.kind === 'pause' || el.kind === 'rappel') ? toTime(el.debut) : null,
        pause_fin:     (el.kind === 'pause' || el.kind === 'rappel') ? toTime(el.fin)   : null,
        astreinte:     el.kind === 'rappel' ? !!el.astreinte : false,
    }));

    // Si les interventions sont refusées, on retire l'en-tête qu'on vient de
    // créer : sinon la journée apparaît « enregistrée » sans aucune intervention,
    // le calendrier ne propose plus le brouillon, et « Modifier » depuis le
    // résumé écrase ce brouillon avec une feuille vide (vécu le 2026-09-21).
    try {
        await dbPost('interventions', rows);
    } catch (e) {
        try { await dbDelete('feuilles_de_route', `id=eq.${feuille.id}`); }
        catch (e2) { console.warn('Annulation de l\'en-tête impossible :', e2); }
        throw e;
    }
    return feuille.id;
}
