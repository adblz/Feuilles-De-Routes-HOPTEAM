import { parseDuree, affH } from '../utils/utils.js';

// ── Heures de nuit (21h–6h) ────────────────────────────────────

export function calcHeuresNuit(heureDebut, heureFin) {
    if (!heureDebut || !heureFin) return 0;
    const toMin = h => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };
    const debut = toMin(heureDebut);
    const fin   = toMin(heureFin);

    let nuit = 0;
    // Segment après 21h00 (1260 min)
    if (fin > 1260) nuit += fin - Math.max(debut, 1260);
    // Segment avant 6h00 (360 min)
    if (debut < 360) nuit += Math.min(fin, 360) - debut;

    return Math.max(0, nuit);
}

// ── Calcul hebdomadaire ────────────────────────────────────────

function getSemaineISO(dateStr) {
    const d = new Date(dateStr + 'T12:00');
    const day = d.getDay() || 7;
    const jeudi = new Date(d);
    jeudi.setDate(d.getDate() + (4 - day));
    const debutAn = new Date(jeudi.getFullYear(), 0, 1);
    const num = Math.ceil(((jeudi - debutAn) / 86400000 + 1) / 7);
    return `${jeudi.getFullYear()}-S${String(num).padStart(2, '0')}`;
}

function labelSemaine(dateStr) {
    const d = new Date(dateStr + 'T12:00');
    const day = d.getDay() || 7;
    const lundi = new Date(d);
    lundi.setDate(d.getDate() - day + 1);
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);
    const fmt = dt => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${fmt(lundi)} – ${fmt(dimanche)}`;
}

// feuilles : [{date, heures_supp, heure_debut, heure_fin}]
// contrat  : '35' ou '39'
// Retourne un tableau trié par semaine avec les colonnes calculées.
export function calcHebdomadaire(feuilles, contrat) {
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

        let totalSuppMin = 0;
        let totalNuitMin = 0;
        for (const f of fs) {
            totalSuppMin += parseDuree(f.heures_supp);
            totalNuitMin += calcHeuresNuit(f.heure_debut, f.heure_fin);
        }

        // 35h → 8h à 25% (heures 36→43), reste à 50%
        // 39h → 4h à 25% (heures 40→43), reste à 50%
        const max25  = contrat === '35' ? 8 * 60 : 4 * 60;
        const supp25 = Math.min(totalSuppMin, max25);
        const supp50 = Math.max(0, totalSuppMin - max25);

        return { cle, label, nbJours: fs.length, totalSuppMin, totalNuitMin, supp25, supp50 };
    });
}
