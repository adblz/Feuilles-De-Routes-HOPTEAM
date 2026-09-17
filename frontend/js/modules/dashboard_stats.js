import { chargerHeuresSupp } from './db.js';
import { affH, isoLocal } from '../utils/utils.js';
import { calcHebdomadaire } from './heures_calculs.js';
import { totalSuppNet, baseSemaine, affHSigne } from './dashboard_supp.js';

export async function rendreHeuresSupp() {
    const heroEl    = document.getElementById('dash-supp-hero');
    const datesEl   = document.getElementById('dash-supp-dates');
    const contextEl = document.getElementById('dash-supp-context');

    if (!heroEl) return;
    heroEl.textContent = '…';

    // Lundi et dimanche de la semaine en cours
    const today = new Date();
    const dow = today.getDay() || 7;
    const lundi = new Date(today);
    lundi.setDate(today.getDate() - dow + 1);
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);

    let histo;
    try {
        histo = await chargerHeuresSupp(isoLocal(lundi), isoLocal(dimanche));
    } catch {
        heroEl.textContent = '—';
        return;
    }

    const semaines = calcHebdomadaire(histo);

    if (!semaines.length) {
        heroEl.textContent = '—';
        if (contextEl) contextEl.textContent = 'Aucune heure saisie cette semaine';
        return;
    }

    const { totalTravailMin, nbJours } = semaines[0];

    // Choix produit : sur cette carte les heures supp. se comptent JOUR PAR JOUR,
    // chaque journée étant comparée à son propre seuil (7h en contrat 35h, 8h —
    // 7h le vendredi — en 39h), et non au seuil hebdomadaire de 35h. Une journée
    // plus courte que son seuil compte en négatif : voir dashboard_supp.js.
    // La page détail « Heures » garde, elle, le calcul hebdomadaire légal.
    const totalSuppMin = totalSuppNet(histo);
    const baseMin      = baseSemaine(histo);

    if (datesEl) datesEl.textContent = '';
    heroEl.textContent = affHSigne(totalSuppMin);
    heroEl.classList.toggle('est-negatif', totalSuppMin < 0);

    if (contextEl) {
        const jours = `${nbJours} jour${nbJours > 1 ? 's' : ''}`;
        contextEl.textContent = baseMin > 0
            ? `${affH(totalTravailMin)} travaillées · base ${affH(baseMin)} · ${jours}`
            : `${affH(totalTravailMin)} travaillées · ${jours}`;
    }
}

