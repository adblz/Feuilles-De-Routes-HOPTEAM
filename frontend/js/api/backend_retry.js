import { showToast } from '../utils/utils.js';

// Le backend (Render, offre gratuite) se met en veille après 15 min d'inactivité :
// la première requête peut échouer ou expirer pendant son réveil (jusqu'à ~1 min).
// On réessaie automatiquement au lieu de faire échouer l'action en cours.
export async function fetchBackend(url, options) {
    const TENTATIVES = 6;
    const DELAI_MS    = 8000;
    let derniereErreur;
    for (let i = 0; i < TENTATIVES; i++) {
        if (i === 1) showToast('Le serveur démarre, patientez (jusqu\'à une minute)…', '', 50000);
        try {
            const res = await fetch(url, options);
            if ([502, 503, 504].includes(res.status)) {
                derniereErreur = new Error(`Serveur indisponible (${res.status})`);
            } else {
                return res;
            }
        } catch (e) {
            derniereErreur = e;
        }
        if (i < TENTATIVES - 1) await new Promise(r => setTimeout(r, DELAI_MS));
    }
    throw derniereErreur;
}
