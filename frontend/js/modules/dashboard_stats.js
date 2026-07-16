import { chargerHeuresSupp } from './db.js';
import { affH, isoLocal } from '../utils/utils.js';
import { calcHebdomadaire } from './heures_calculs.js';
import { getBrouillonsDates } from './fdr.js';

export async function rendreHeuresSupp() {
    const heroEl    = document.getElementById('dash-supp-hero');
    const datesEl   = document.getElementById('dash-supp-dates');
    const contextEl = document.getElementById('dash-supp-context');
    const barEl     = document.getElementById('dash-supp-bar');
    const legendEl  = document.getElementById('dash-supp-legend');

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
        if (barEl) barEl.hidden = true;
        if (legendEl) legendEl.textContent = '';
        return;
    }

    const { label, totalTravailMin, totalSuppMin, supp25, supp50, totalAstreinteMin, nbJours, seuilMin } = semaines[0];

    if (datesEl) datesEl.textContent = label;
    heroEl.textContent = totalSuppMin > 0 ? `+${affH(totalSuppMin)}` : '0h00';

    if (contextEl) {
        contextEl.textContent = `${affH(totalTravailMin)} travaillées · ${nbJours} jour${nbJours > 1 ? 's' : ''}`;
    }

    if (barEl && totalTravailMin > 0) {
        barEl.hidden = false;
        const base = Math.min(totalTravailMin, seuilMin);
        document.getElementById('dash-supp-seg-base').style.width = `${base / totalTravailMin * 100}%`;
        document.getElementById('dash-supp-seg-25').style.width   = `${supp25 / totalTravailMin * 100}%`;
        document.getElementById('dash-supp-seg-50').style.width   = `${supp50 / totalTravailMin * 100}%`;
    }

    if (legendEl && totalTravailMin > 0) {
        const base = Math.min(totalTravailMin, seuilMin);
        let html = `<span>Base ${affH(base)}</span>`;
        if (supp25 > 0) html += `<span class="dash-supp-lbl-25">25% · ${affH(supp25)}</span>`;
        if (supp50 > 0) html += `<span class="dash-supp-lbl-50">50% · ${affH(supp50)}</span>`;
        if (totalAstreinteMin > 0) html += `<span class="dash-supp-lbl-ast">● ${affH(totalAstreinteMin)} ast.</span>`;
        legendEl.innerHTML = html;
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

