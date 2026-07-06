import { chargerHistorique } from './db.js';
import { showToast, isoLocal } from '../utils/utils.js';
import { getBrouillonsDates } from './fdr.js';
import { afficherResumeFeuille } from './resume.js';

let _onNouveau   = null;
let _onFinaliser = null;
let calOffset    = 0;

export function initCalendrier(onNouveau, onFinaliser) {
    _onNouveau   = onNouveau;
    _onFinaliser = onFinaliser;
}

export function resetCalOffset() {
    calOffset = 0;
    _majBoutonsNav();
}

export function initCalNav() {
    document.getElementById('btn-cal-prev').addEventListener('click', () => {
        calOffset--;
        _majBoutonsNav();
        rendreCalendrierMois();
    });
    document.getElementById('btn-cal-next').addEventListener('click', () => {
        if (calOffset >= 0) return;
        calOffset++;
        _majBoutonsNav();
        rendreCalendrierMois();
    });
}

function _majBoutonsNav() {
    const nextBtn = document.getElementById('btn-cal-next');
    if (nextBtn) nextBtn.disabled = calOffset >= 0;
}

export async function rendreCalendrierMois() {
    const grid          = document.getElementById('dash-cal-grid');
    const titreEl       = document.getElementById('dash-cal-titre');
    const selectedPanel = document.getElementById('dash-cal-selected');

    grid.innerHTML = '<div class="dash-loading" style="grid-column:1/-1">Chargement…</div>';
    if (selectedPanel) selectedPanel.classList.add('hidden');

    const today    = new Date();
    const todayISO = isoLocal(today);

    const viewDate = new Date(today.getFullYear(), today.getMonth() + calOffset, 1);
    const year     = viewDate.getFullYear();
    const month    = viewDate.getMonth();

    const moisNom = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (titreEl) titreEl.textContent = moisNom.charAt(0).toUpperCase() + moisNom.slice(1);

    let histo;
    try {
        histo = await chargerHistorique();
    } catch {
        grid.innerHTML = '<div class="dash-loading" style="grid-column:1/-1">Connexion indisponible.</div>';
        return null;
    }

    const datesEnregistrees = new Set(histo.map(e => e.date));
    const dateToId = {};
    histo.forEach(e => { dateToId[e.date] = e.id; });

    const brouillonDates = getBrouillonsDates();
    const firstDay       = new Date(year, month, 1);
    const daysInMonth    = new Date(year, month + 1, 0).getDate();
    const leading        = (firstDay.getDay() + 6) % 7;
    const trailing       = (7 - ((leading + daysInMonth) % 7)) % 7;

    grid.innerHTML = '';

    for (let i = 0; i < leading; i++) {
        const cell = document.createElement('div');
        cell.className = 'dash-day dash-day-outside';
        grid.appendChild(cell);
    }

    const manquants = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj      = new Date(year, month, d);
        const key          = isoLocal(dateObj);
        const dow          = dateObj.getDay();
        const isWeekend    = dow === 0 || dow === 6;
        const isFuture     = key > todayISO;
        const isToday      = key === todayISO;
        const isFilled     = datesEnregistrees.has(key);
        const hasBrouillon = !isFilled && brouillonDates.has(key);

        const cell = document.createElement('div');
        let cls = 'dash-day';

        if (isWeekend)        { cls += ' dash-day-off'; }
        else if (isFuture)    { cls += ' dash-day-future'; }
        else if (isFilled)    { cls += ' dash-day-filled'; if (isToday) cls += ' dash-day-today'; }
        else if (hasBrouillon){ cls += ' dash-day-pending'; manquants.push({ key, type: 'brouillon' }); }
        else                  { cls += ' dash-day-missing'; manquants.push({ key, type: 'missing' }); }

        let dotClass = '';
        if (isWeekend)         dotClass = 'ldot ldot-off';
        else if (isFilled)     dotClass = 'ldot ldot-filled';
        else if (hasBrouillon) dotClass = 'ldot ldot-pending';
        else if (!isFuture)    dotClass = 'ldot ldot-missing';

        cell.className = cls;
        cell.innerHTML = `<span class="dash-day-num">${d}</span>${dotClass ? `<i class="${dotClass}"></i>` : ''}`;

        if (!isFuture) {
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', () => selectionnerJour(dateObj, key, isFilled, dateToId[key] || null, hasBrouillon));
        }

        grid.appendChild(cell);
    }

    for (let i = 0; i < trailing; i++) {
        const cell = document.createElement('div');
        cell.className = 'dash-day dash-day-outside';
        grid.appendChild(cell);
    }

    return manquants;
}

function selectionnerJour(dateObj, key, isFilled, feuilleId, hasBrouillon) {
    const panel   = document.getElementById('dash-cal-selected');
    const labelEl = document.getElementById('dash-cal-selected-label');
    const oldBtn  = document.getElementById('dash-cal-selected-btn');
    if (!panel || !labelEl || !oldBtn) return;

    const labelText = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    labelEl.textContent = labelText.charAt(0).toUpperCase() + labelText.slice(1);

    const btn = oldBtn.cloneNode(false);
    oldBtn.replaceWith(btn);
    btn.id = 'dash-cal-selected-btn';

    if (isFilled) {
        btn.textContent = 'Afficher résumé';
        btn.className   = 'dash-cal-selected-btn dash-cal-btn-pdf';
        btn.addEventListener('click', () => afficherResumeFeuille(feuilleId));
    } else if (hasBrouillon) {
        btn.textContent = 'Finaliser le brouillon';
        btn.className   = 'dash-cal-selected-btn dash-cal-btn-remplir';
        btn.addEventListener('click', () => _onFinaliser && _onFinaliser(key));
    } else {
        btn.textContent = 'Remplir';
        btn.className   = 'dash-cal-selected-btn dash-cal-btn-remplir';
        btn.addEventListener('click', () => _onNouveau && _onNouveau(key));
    }

    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
