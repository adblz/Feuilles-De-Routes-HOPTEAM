// Calculs de l'onglet « Planning en cours » (page responsable) : regroupement
// des postes par client, filtres, tri, groupes par technicien. Aucun accès au
// DOM ni à Supabase. Ne pas importer clients_data.js (il tire le brouillon
// de la page technicien).

export const NON_AFFECTE = '__non_affecte__';

export function normaliser(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Une ligne Excel = un poste. Le responsable voit un client par (technicien,
// code PDV, date de fait) : les postes d'un même client sont regroupés et
// toute action (retirer, réaffecter) porte sur tous leurs ids.
export function regrouperPlanning(rows) {
    const map = new Map();
    for (const r of rows) {
        const cle = `${r.user_id || ''}|${r.code_pdv}|${r.fait_le || ''}`;
        const c = map.get(cle);
        if (!c) {
            map.set(cle, { ...r, ids: [r.id], postes: 1, tirage: r.tirage || 0 });
            continue;
        }
        c.ids.push(r.id);
        c.postes++;
        c.tirage += r.tirage || 0;
        if (r.date_prevue && (!c.date_prevue || r.date_prevue < c.date_prevue)) c.date_prevue = r.date_prevue;
    }
    return [...map.values()];
}

export function estEnRetard(c, todayISO) {
    return !c.fait_le && !!c.date_prevue && c.date_prevue < todayISO;
}

export function retardJours(c, todayISO) {
    return Math.round((new Date(todayISO + 'T12:00') - new Date(c.date_prevue + 'T12:00')) / 86400000);
}

// statut : 'afaire' | 'faits' | 'tous' — recherche sur nom, ville, code PDV, code postal.
export function filtrerPlanning(clients, { statut = 'afaire', recherche = '' } = {}) {
    const q = normaliser(recherche.trim());
    return clients.filter(c => {
        if (statut === 'afaire' && c.fait_le) return false;
        if (statut === 'faits' && !c.fait_le) return false;
        if (!q) return true;
        return [c.nom_pdv, c.ville, c.code_pdv, c.code_postal].some(v => normaliser(v).includes(q));
    });
}

// À faire d'abord (date prévue croissante, sans date à la fin, puis nom) ;
// faits ensuite (les plus récents en premier).
export function trierClients(clients) {
    return [...clients].sort((a, b) => {
        if (!!a.fait_le !== !!b.fait_le) return a.fait_le ? 1 : -1;
        if (a.fait_le) return b.fait_le.localeCompare(a.fait_le) || (a.nom_pdv || '').localeCompare(b.nom_pdv || '');
        if (!!a.date_prevue !== !!b.date_prevue) return a.date_prevue ? -1 : 1;
        return (a.date_prevue || '').localeCompare(b.date_prevue || '') || (a.nom_pdv || '').localeCompare(b.nom_pdv || '');
    });
}

// Un groupe par technicien de l'entreprise (+ « Non affecté » si besoin).
// Les compteurs sont calculés sur TOUS les clients (indépendants des filtres),
// les lignes affichées viennent des clients filtrés.
export function grouperParTechnicien(filtres, tous, techs, todayISO) {
    const groupes = new Map();
    const creer = (id, nom) => ({ id, nom, clients: [], nbAFaire: 0, nbFaits: 0, nbRetard: 0 });
    [...techs].sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
        .forEach(t => groupes.set(t.id, creer(t.id, t.nom || '—')));
    const cleDe = c => (c.user_id && groupes.has(c.user_id)) ? c.user_id : NON_AFFECTE;

    for (const c of tous) {
        const cle = cleDe(c);
        if (!groupes.has(cle)) groupes.set(cle, creer(NON_AFFECTE, 'Non affecté'));
        const g = groupes.get(cle);
        if (c.fait_le) g.nbFaits++;
        else { g.nbAFaire++; if (estEnRetard(c, todayISO)) g.nbRetard++; }
    }
    for (const c of trierClients(filtres)) groupes.get(cleDe(c))?.clients.push(c);
    return [...groupes.values()];
}

export function resumerPlanning(tous, todayISO) {
    let nbAFaire = 0, nbFaits = 0, nbRetard = 0;
    for (const c of tous) {
        if (c.fait_le) nbFaits++;
        else { nbAFaire++; if (estEnRetard(c, todayISO)) nbRetard++; }
    }
    return { nbAFaire, nbFaits, nbRetard };
}
