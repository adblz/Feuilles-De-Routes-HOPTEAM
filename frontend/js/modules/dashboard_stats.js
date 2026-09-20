import { chargerHeuresSupp } from './db.js';
import { affH, affHSigne, isoLocal } from '../utils/utils.js';
import { cfg } from './fdr_config.js';
import { suppPartielle } from './heures_calculs.js';
import { lundiDe, dimancheDe } from './semaines.js';

// Carte « Heures supp. de la semaine » : heures travaillées depuis lundi
// moins le seuil des jours déjà passés (7h en 35h, 8h — 7h le vendredi — en
// 39h, 0 le week-end et les fériés). Un jour ouvré passé sans feuille compte
// 0h travaillée. Une semaine en retard s'affiche en négatif. En fin de
// semaine, c'est exactement le chiffre de l'onglet Heures.
export async function rendreHeuresSupp() {
    const heroEl    = document.getElementById('dash-supp-hero');
    const datesEl   = document.getElementById('dash-supp-dates');
    const contextEl = document.getElementById('dash-supp-context');

    if (!heroEl) return;
    heroEl.textContent = '…';

    const aujourdhui = isoLocal(new Date());
    let histo;
    try {
        histo = await chargerHeuresSupp(lundiDe(aujourdhui), dimancheDe(aujourdhui));
    } catch {
        heroEl.textContent = '—';
        return;
    }

    const s = suppPartielle(histo, { contrat: cfg.contrat, aujourdhui });

    if (!s) {
        heroEl.textContent = '—';
        heroEl.classList.remove('est-negatif');
        if (contextEl) contextEl.textContent = 'Aucune heure saisie cette semaine';
        return;
    }

    if (datesEl) datesEl.textContent = '';
    heroEl.textContent = affHSigne(s.netMin);
    heroEl.classList.toggle('est-negatif', s.netMin < 0);

    if (contextEl) {
        const jours = `${s.nbJours} jour${s.nbJours > 1 ? 's' : ''}`;
        const sansFeuille = s.nbManquants ? ` · ${s.nbManquants} sans feuille` : '';
        contextEl.textContent = `${affH(s.travailMin)} travaillées · base ${affH(s.baseMin)} · ${jours}${sansFeuille}`;
    }
}
