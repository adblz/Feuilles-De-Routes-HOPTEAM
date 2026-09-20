// Heures de nuit (plage réglée par entreprise, défaut 21h–6h).
// Gère le passage de minuit et retire le trajet (30 min matin + 30 min soir)
// pour ne compter que le temps de travail effectif.

import { cfg } from './fdr_config.js';

// margeMin : minutes de trajet retirées à CHAQUE extrémité (matin et soir),
// soit la moitié du trajet du jour (trajet 60 → marge 30 ; trajet 90 → marge 45).
// margeMin = 0 → on compte toute la plage (ex. rappel / sortie de nuit).
export function calcHeuresNuit(heureDebut, heureFin, margeMin = 0) {
    if (!heureDebut || !heureFin) return 0;
    const toMin = h => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };
    let debut = toMin(heureDebut);
    let fin   = toMin(heureFin);
    if (fin <= debut) fin += 1440;   // passage de minuit → fin le lendemain
    debut += margeMin;               // trajet matin non compté
    fin   -= margeMin;               // trajet soir non compté

    // Nuit = plage réglée par l'entreprise (défaut 21h→6h). Deux fenêtres :
    // minuit→fin (0 → nuitFin) et début→fin du lendemain (nuitDebut → nuitFin+1440).
    const chevauche = (a, b, c, d) => Math.max(0, Math.min(b, d) - Math.max(a, c));
    return Math.max(0, chevauche(debut, fin, 0, cfg.nuitFin) + chevauche(debut, fin, cfg.nuitDebut, cfg.nuitFin + 1440));
}

// Nuit d'une feuille complète : journée principale (avec marge de trajet)
// + éventuelle sortie supplémentaire (comptée en entier, marge 0).
export function nuitFeuille(f) {
    const margeNuit = cfg.trajetMinutes / 2;
    let min = calcHeuresNuit(f.heure_debut, f.heure_fin, margeNuit);
    const rappel = f.interventions?.find(i => i.kind === 'rappel');
    if (rappel) min += calcHeuresNuit(rappel.pause_debut, rappel.pause_fin, 0);
    return min;
}
