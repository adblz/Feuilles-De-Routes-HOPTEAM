import { chargerHeuresSupp } from './db.js';
import { affH, isoLocal, parseDuree } from '../utils/utils.js';
import { calcHebdomadaire } from './heures_calculs.js';
import { getBrouillonsDates } from './fdr.js';

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

    const { label, totalTravailMin, nbJours } = semaines[0];

    // Choix produit : sur cette carte les heures supp. sont la SOMME des heures
    // supp. de chaque journée (heures faites au-delà du seuil du jour : 7h en
    // contrat 35h, 8h — 7h le vendredi — en 39h), et non le dépassement du seuil
    // hebdomadaire de 35h. Ex. 8h lundi + 10h mardi en 35h → 1h + 3h = 4h.
    // La page détail « Heures » garde, elle, le calcul hebdomadaire légal.
    const totalSuppMin = histo.reduce((t, f) => t + parseDuree(f.heures_supp), 0);

    if (datesEl) datesEl.textContent = label;
    heroEl.textContent = totalSuppMin > 0 ? `+${affH(totalSuppMin)}` : '0h00';

    if (contextEl) {
        contextEl.textContent = `${affH(totalTravailMin)} travaillées · ${nbJours} jour${nbJours > 1 ? 's' : ''}`;
    }
}

export function majBrouillonCard() {
    const nb  = getBrouillonsDates().size;
    const el  = document.getElementById('dash-brouillon');
    el.classList.toggle('hidden', nb === 0);
    if (nb <= 0) return;

    const sub = document.getElementById('dash-brouillon-sub');
    if (sub) sub.textContent = nb === 1
        ? '1 feuille non envoyée — appuie pour continuer'
        : `${nb} feuilles non envoyées — appuie pour choisir`;

    const listEl = document.getElementById('dash-brouillon-list');
    if (!listEl) return;
    const dates = [...getBrouillonsDates()].sort().reverse();
    listEl.innerHTML = dates.map(dateISO => {
        const d     = new Date(dateISO + 'T12:00');
        const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        return `<li class="dash-brouillon-item" data-date="${dateISO}">
            <span>${label.charAt(0).toUpperCase() + label.slice(1)}</span>
            <span class="dash-brouillon-item-actions">
                <span class="dash-brouillon-item-btn">Continuer →</span>
                <button type="button" class="btn-brouillon-item-del" data-del-date="${dateISO}" title="Supprimer">&#10005;</button>
            </span>
        </li>`;
    }).join('');
}

export function toggleBrouillonList() {
    const listEl = document.getElementById('dash-brouillon-list');
    if (!listEl) return;
    const isHidden = listEl.classList.toggle('hidden');
    const chev = document.getElementById('dash-brouillon-chevron');
    if (chev) chev.textContent = isHidden ? '▼' : '▲';
}

