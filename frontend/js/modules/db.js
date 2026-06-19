const SUPABASE_URL = 'https://zblggovelezxxrkbqbcv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibGdnb3ZlbGV6eHhya2JxYmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTE0NjcsImV4cCI6MjA5NzQ2NzQ2N30._KORySYHBmQ0aYp97r-6fLEX_4SF8NrbWYJ8fGFpzJM';

const HEADERS = {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type':  'application/json',
};

async function dbDelete(table, filter) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
        method:  'DELETE',
        headers: HEADERS,
    });
    if (!res.ok) throw new Error(`Supabase DELETE [${table}]: ${await res.text()}`);
}

async function dbPost(table, body, returnRow = false) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method:  'POST',
        headers: { ...HEADERS, 'Prefer': returnRow ? 'return=representation' : 'return=minimal' },
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Supabase [${table}]: ${await res.text()}`);
    return returnRow ? (await res.json())[0] : null;
}

function toTime(val) { return val || null; }
function toInt(val)  { return val ? parseInt(val, 10) : null; }

export async function sauvegarderEnBase({ date, tech, company, contrat, heureDebut, heureFin, repasMin, heuresTravail, heuresSupp, mode, elements }) {
    // Supprimer l'entrée existante pour ce jour/technicien avant réinsertion.
    // La FK avec ON DELETE CASCADE nettoie automatiquement les interventions liées.
    if (date && tech) {
        await dbDelete('feuilles_de_route', `date=eq.${date}&tech=eq.${encodeURIComponent(tech)}`);
    }

    const feuille = await dbPost('feuilles_de_route', {
        date,
        tech:           tech          || null,
        company:        company       || null,
        contrat:        contrat       || null,
        heure_debut:    toTime(heureDebut),
        heure_fin:      toTime(heureFin),
        repas_min:      toInt(repasMin),
        heures_travail: heuresTravail || null,
        heures_supp:    heuresSupp    || null,
        mode,
    }, true);

    if (!elements.length) return;

    const rows = elements.map((el, i) => ({
        feuille_id:    feuille.id,
        order_index:   i,
        kind:          el.kind,
        heure_arrivee: el.kind === 'intervention' ? toTime(el.arrivee) : null,
        heure_depart:  el.kind === 'intervention' ? toTime(el.depart)  : null,
        client:        el.kind === 'intervention' ? (el.client  || null) : null,
        ville:         el.kind === 'intervention' ? (el.ville   || null) : null,
        type_int:      el.kind === 'intervention' ? (el.typeInt || null) : null,
        mo:            el.kind === 'intervention' ? (el.mo      || null) : null,
        details:       el.kind === 'intervention' ? (el.details || null) : null,
        pause_debut:   el.kind === 'pause' ? toTime(el.debut) : null,
        pause_fin:     el.kind === 'pause' ? toTime(el.fin)   : null,
    }));

    await dbPost('interventions', rows);
}
