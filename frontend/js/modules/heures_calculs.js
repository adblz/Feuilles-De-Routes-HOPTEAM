import { parseDuree } from '../utils/utils.js';
import { feriesEnSemaine } from './jours_feries.js';
import { estExterne } from './fdr_config.js';

// ── Barème heures supplémentaires (défaut légal — à vérifier convention 3044) ──
const SEUIL_HEBDO_MIN = 35 * 60;   // au-delà de 35h/semaine = heures supplémentaires
const PALIER_25_MIN   = 8 * 60;    // 8 premières heures supp à +25% (36e→43e), puis +50%

// ── Heures de nuit (21h–6h) ────────────────────────────────────
// Gère le passage de minuit et retire le trajet (30 min matin + 30 min soir)
// pour ne compter que le temps de travail effectif.

// trajet=true : retire 30 min matin + 30 min soir (journée normale).
// trajet=false : compte toute la plage (ex. rappel / sortie de nuit).
export function calcHeuresNuit(heureDebut, heureFin, trajet = true) {
    if (!heureDebut || !heureFin) return 0;
    const toMin = h => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };
    let debut = toMin(heureDebut);
    let fin   = toMin(heureFin);
    if (fin <= debut) fin += 1440;   // passage de minuit → fin le lendemain
    const marge = trajet ? 30 : 0;
    debut += marge;                  // ½h trajet matin non comptée
    fin   -= marge;                  // ½h trajet soir non comptée

    // Nuit = 21h→6h. Deux fenêtres : minuit→6h (0–360) et 21h→6h du lendemain (1260–1800)
    const chevauche = (a, b, c, d) => Math.max(0, Math.min(b, d) - Math.max(a, c));
    return Math.max(0, chevauche(debut, fin, 0, 360) + chevauche(debut, fin, 1260, 1800));
}

// ── Calcul hebdomadaire ────────────────────────────────────────

function getLundiSemaine(dateStr) {
    const d = new Date(dateStr + 'T12:00');
    const day = d.getDay() || 7;
    const lundi = new Date(d);
    lundi.setDate(d.getDate() - day + 1);
    return lundi;
}

export function getSemaineISO(dateStr) {
    const d = new Date(dateStr + 'T12:00');
    const day = d.getDay() || 7;
    const jeudi = new Date(d);
    jeudi.setDate(d.getDate() + (4 - day));
    const debutAn = new Date(jeudi.getFullYear(), 0, 1);
    const num = Math.ceil(((jeudi - debutAn) / 86400000 + 1) / 7);
    return `${jeudi.getFullYear()}-S${String(num).padStart(2, '0')}`;
}

export function labelSemaine(dateStr) {
    const d = new Date(dateStr + 'T12:00');
    const day = d.getDay() || 7;
    const lundi = new Date(d);
    lundi.setDate(d.getDate() - day + 1);
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);
    const jour = dt => dt.toLocaleDateString('fr-FR', { day: 'numeric' });
    const full = dt => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    // Même mois → « 6 – 12 juil. » ; sinon « 30 juin – 6 juil. »
    return lundi.getMonth() === dimanche.getMonth()
        ? `${jour(lundi)} – ${full(dimanche)}`
        : `${full(lundi)} – ${full(dimanche)}`;
}

// feuilles : [{date, heures_travail, heure_debut, heure_fin}]
// Heures supp calculées sur le TOTAL HEBDOMADAIRE (au-delà de 35h), conforme
// au Code du travail — indépendant du contrat 35h/39h.
// Retourne un tableau trié par semaine avec les colonnes calculées.
export function calcHebdomadaire(feuilles) {
    const groupes = {};
    for (const f of feuilles) {
        const cle = getSemaineISO(f.date);
        if (!groupes[cle]) {
            groupes[cle] = { cle, label: labelSemaine(f.date), feuilles: [] };
        }
        groupes[cle].feuilles.push(f);
    }

    return Object.keys(groupes).sort().map(cle => {
        const { label, feuilles: fs } = groupes[cle];

        let totalTravailMin   = 0;
        let totalNuitMin      = 0;
        let totalAstreinteMin = 0;   // heures travaillées des jours cochés « astreinte » (récupérables)
        for (const f of fs) {
            const travailMin = parseDuree(f.heures_travail);
            totalTravailMin += travailMin;
            totalNuitMin    += calcHeuresNuit(f.heure_debut, f.heure_fin, !estExterne());
            const rappel = f.interventions?.find(i => i.kind === 'rappel');
            if (rappel) totalNuitMin += calcHeuresNuit(rappel.pause_debut, rappel.pause_fin, false);
            if (f.astreinte) totalAstreinteMin += travailMin;
        }

        // Seuil réduit de 7h par jour férié tombant lun→ven dans la semaine.
        const nbFeries = feriesEnSemaine(getLundiSemaine(fs[0].date));
        const seuilMin = Math.max(0, SEUIL_HEBDO_MIN - nbFeries * 7 * 60);

        const totalSuppMin = Math.max(0, totalTravailMin - seuilMin);
        const supp25 = Math.min(totalSuppMin, PALIER_25_MIN);      // premières 8h supp à +25%
        const supp50 = Math.max(0, totalSuppMin - PALIER_25_MIN);  // au-delà à +50%

        return { cle, label, nbJours: fs.length, totalTravailMin, totalSuppMin, totalNuitMin, supp25, supp50, totalAstreinteMin, nbFeries, seuilMin };
    });
}

// Totaux agrégés d'une période (dashboard, récap) — somme des semaines.
export function totauxSuppPeriode(feuilles) {
    return calcHebdomadaire(feuilles).reduce((a, s) => ({
        travail:   a.travail   + s.totalTravailMin,
        supp:      a.supp      + s.totalSuppMin,
        supp25:    a.supp25    + s.supp25,
        supp50:    a.supp50    + s.supp50,
        nuit:      a.nuit      + s.totalNuitMin,
        astreinte: a.astreinte + s.totalAstreinteMin,
    }), { travail: 0, supp: 0, supp25: 0, supp50: 0, nuit: 0, astreinte: 0 });
}
