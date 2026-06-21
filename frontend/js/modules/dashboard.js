import { chargerHeuresSupp, chargerHistorique, chargerPdfFeuille } from './db.js';
import { parseDuree, showToast } from '../utils/utils.js';
import { restaurerBrouillon, viderInterventions, cfg, getBrouillonsDates } from './fdr.js';
import { reinitialiserFeuille } from './ui.js';
import { afficherPdfBase64 } from './pdfviewer.js';

// ── Petits utilitaires ─────────────────────────────────────────

// Formate des minutes en « 12h30 ».
const affH = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;

// Date du jour au format AAAA-MM-JJ (heure locale, sans décalage de fuseau).
function isoLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const aujourdhui = () => isoLocal(new Date());

// Période personnalisée pour les heures supp (null = valeur par défaut)
let suppDebut = null;
let suppFin   = null;

function formatPeriode(debut, fin, today) {
    const fmt = (d) => new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    return `${fmt(debut)} à ${fin === today ? 'aujourd\'hui' : fmt(fin)}`;
}


function brouillonExiste() {
    return getBrouillonsDates().size > 0;
}

// ── Bascule entre les deux vues ────────────────────────────────

function montrerFormulaire() {
    document.getElementById('vue-dashboard').classList.add('hidden');
    document.getElementById('vue-formulaire').classList.remove('hidden');
    window.scrollTo(0, 0);
}

export function afficherDashboard() {
    document.getElementById('vue-formulaire').classList.add('hidden');
    document.getElementById('vue-dashboard').classList.remove('hidden');
    window.scrollTo(0, 0);
    rafraichirDashboard();
}

// Ouvre un formulaire vierge pour une date donnée (aujourd'hui si non précisée).
function ouvrirNouvelleFeuille(dateISO) {
    const date = dateISO || aujourdhui();
    if (getBrouillonsDates().has(date) && !confirm('Un brouillon existe pour ce jour. L\'effacer et recommencer à zéro ?')) return;
    reinitialiserFeuille(date);
    montrerFormulaire();
}

// Charge le brouillon d'un jour spécifique et ouvre le formulaire.
function finaliserBrouillon(dateISO) {
    viderInterventions();
    restaurerBrouillon(dateISO);
    montrerFormulaire();
}

// Reprend un brouillon (bouton générique dash-brouillon — conservé pour compatibilité).
function reprendreBrouillon() {
    const dates = [...getBrouillonsDates()].sort().pop();
    if (dates) finaliserBrouillon(dates);
}

// ── Rendu du dashboard ─────────────────────────────────────────

export async function rafraichirDashboard() {
    majBrouillonCard();
    await Promise.all([rendreHeuresSupp(), rendreCalendrierMois()]);
}

function majBrouillonCard() {
    const nb  = getBrouillonsDates().size;
    const el  = document.getElementById('dash-brouillon');
    el.classList.toggle('hidden', nb === 0);
    if (nb > 0) {
        const txt = el.querySelector('.dash-brouillon-text');
        if (txt) txt.textContent = nb === 1
            ? '📝 1 brouillon non finalisé'
            : `📝 ${nb} brouillons non finalisés`;
    }
}

async function rendreHeuresSupp() {
    const totalEl   = document.getElementById('dash-supp-total');
    const subEl     = document.getElementById('dash-supp-sub');
    const moisTitre = document.getElementById('dash-supp-mois-titre');
    const periodeEl = document.getElementById('dash-supp-periode-txt');

    const today        = aujourdhui();
    const firstOfMonth = today.slice(0, 8) + '01';
    const debut = suppDebut || firstOfMonth;
    const fin   = suppFin   || today;

    // Titre en gros : mois de la date de fin
    if (moisTitre) {
        const moisNom = new Date(fin + 'T12:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        moisTitre.textContent = moisNom.charAt(0).toUpperCase() + moisNom.slice(1);
    }
    if (periodeEl) periodeEl.textContent = formatPeriode(debut, fin, today);

    totalEl.textContent = '…';
    subEl.textContent   = '';

    let histo;
    try {
        histo = await chargerHeuresSupp(debut, fin);
    } catch (err) {
        totalEl.textContent = '—';
        subEl.textContent   = 'Connexion indisponible';
        return;
    }

    let totalMin = 0;
    histo.forEach(e => { totalMin += parseDuree(e.heures_supp); });

    totalEl.textContent = affH(totalMin);
    subEl.textContent   = `${histo.length} feuille${histo.length > 1 ? 's' : ''} enregistrée${histo.length > 1 ? 's' : ''} sur la période`;
}

async function rendreCalendrierMois() {
    const grid          = document.getElementById('dash-cal-grid');
    const titreEl       = document.getElementById('dash-cal-titre');
    const selectedPanel = document.getElementById('dash-cal-selected');

    grid.innerHTML = '<div class="dash-loading" style="grid-column:1/-1">Chargement…</div>';
    if (selectedPanel) selectedPanel.classList.add('hidden');

    const today    = new Date();
    const todayISO = isoLocal(today);
    const year     = today.getFullYear();
    const month    = today.getMonth();

    const moisNom = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (titreEl) titreEl.textContent = moisNom.charAt(0).toUpperCase() + moisNom.slice(1);

    let histo;
    try {
        histo = await chargerHistorique();
    } catch (err) {
        grid.innerHTML = '<div class="dash-loading" style="grid-column:1/-1">Connexion indisponible.</div>';
        return;
    }

    const datesEnregistrees = new Set(histo.map(e => e.date));
    const dateToId = {};
    histo.forEach(e => { dateToId[e.date] = e.id; });

    const brouillonDates = getBrouillonsDates();

    const firstDay    = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading     = (firstDay.getDay() + 6) % 7; // lundi = 0
    const trailing    = (7 - ((leading + daysInMonth) % 7)) % 7;

    grid.innerHTML = '';

    // Cellules vides avant le 1er
    for (let i = 0; i < leading; i++) {
        const cell = document.createElement('div');
        cell.className = 'dash-day dash-day-outside';
        grid.appendChild(cell);
    }

    const manquants = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj   = new Date(year, month, d);
        const key       = isoLocal(dateObj);
        const dow       = dateObj.getDay();
        const isWeekend    = dow === 0 || dow === 6;
        const isFuture     = key > todayISO;
        const isToday      = key === todayISO;
        const isFilled     = datesEnregistrees.has(key);
        const hasBrouillon = !isFilled && brouillonDates.has(key);

        const cell = document.createElement('div');
        let cls = 'dash-day';

        if (isWeekend) {
            cls += ' dash-day-off';
        } else if (isFuture) {
            cls += ' dash-day-future';
        } else if (isFilled) {
            cls += ' dash-day-filled';
            if (isToday) cls += ' dash-day-today';
        } else if (hasBrouillon) {
            cls += ' dash-day-pending';
            manquants.push({ key, type: 'brouillon' });
        } else {
            cls += ' dash-day-missing';
            manquants.push({ key, type: 'missing' });
        }

        let dotClass = '';
        if (isWeekend)        dotClass = 'ldot ldot-off';
        else if (isFilled)    dotClass = 'ldot ldot-filled';
        else if (hasBrouillon) dotClass = 'ldot ldot-pending';
        else if (!isFuture)   dotClass = 'ldot ldot-missing';

        cell.className = cls;
        cell.innerHTML = `<span class="dash-day-num">${d}</span>${dotClass ? `<i class="${dotClass}"></i>` : ''}`;

        // Tous les jours non-futurs sont cliquables (y compris week-ends)
        if (!isFuture) {
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', () => selectionnerJour(dateObj, key, isFilled, dateToId[key] || null, hasBrouillon));
        }

        grid.appendChild(cell);
    }

    // Cellules vides après le dernier jour
    for (let i = 0; i < trailing; i++) {
        const cell = document.createElement('div');
        cell.className = 'dash-day dash-day-outside';
        grid.appendChild(cell);
    }

    _rendreActionList(manquants);
}

function selectionnerJour(dateObj, key, isFilled, feuilleId, hasBrouillon) {
    const panel   = document.getElementById('dash-cal-selected');
    const labelEl = document.getElementById('dash-cal-selected-label');
    const oldBtn  = document.getElementById('dash-cal-selected-btn');
    if (!panel || !labelEl || !oldBtn) return;

    const labelText = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    labelEl.textContent = labelText.charAt(0).toUpperCase() + labelText.slice(1);

    // Clone le bouton pour supprimer les anciens listeners
    const btn = oldBtn.cloneNode(false);
    oldBtn.replaceWith(btn);
    btn.id = 'dash-cal-selected-btn';

    if (isFilled) {
        btn.textContent = 'Visionner le PDF';
        btn.className = 'dash-cal-selected-btn dash-cal-btn-pdf';
        btn.addEventListener('click', () => visionnerPdfJour(feuilleId));
    } else if (hasBrouillon) {
        btn.textContent = 'Finaliser le brouillon';
        btn.className = 'dash-cal-selected-btn dash-cal-btn-remplir';
        btn.addEventListener('click', () => finaliserBrouillon(key));
    } else {
        btn.textContent = 'Remplir';
        btn.className = 'dash-cal-selected-btn dash-cal-btn-remplir';
        btn.addEventListener('click', () => ouvrirNouvelleFeuille(key));
    }

    panel.classList.remove('hidden');
}

async function visionnerPdfJour(id) {
    if (!id) { showToast('PDF non disponible', 'warn'); return; }
    try {
        const pdf = await chargerPdfFeuille(id);
        if (!pdf) { showToast('PDF non disponible pour cette feuille', 'warn', 4500); return; }
        afficherPdfBase64(pdf);
    } catch {
        showToast('Erreur lors du chargement du PDF', 'error');
    }
}

function _rendreActionList(items) {
    const list  = document.getElementById('dash-action-list');
    const titre = document.getElementById('dash-action-titre');
    if (!list || !titre) return;

    if (!items.length) {
        titre.textContent = 'Tout est à jour';
        list.innerHTML = '<li class="dash-action-empty">Aucune feuille en attente. Bon travail.</li>';
        return;
    }

    titre.textContent = items.length === 1 ? '1 feuille en attente' : `${items.length} feuilles en attente`;

    const ICON_PENDING = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.5 2"/></svg>`;
    const ICON_MISSING = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 21 19H3Z"/><line x1="12" y1="9.5" x2="12" y2="14"/></svg>`;

    list.innerHTML = items.map(({ key, type }) => {
        const dateObj      = new Date(key + 'T12:00');
        const label        = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const labelCap     = label.charAt(0).toUpperCase() + label.slice(1);
        const isBrouillon  = type === 'brouillon';
        return `
            <li class="dash-action-row ${isBrouillon ? 'is-pending' : 'is-missing'}">
                <span class="dash-action-ico">${isBrouillon ? ICON_PENDING : ICON_MISSING}</span>
                <span class="dash-action-info">
                    <strong>${labelCap}</strong>
                    <span>${isBrouillon ? 'Brouillon non finalisé' : 'Non rempli'}</span>
                </span>
                <button class="dash-action-btn" data-date="${key}" data-action="${isBrouillon ? 'finaliser' : 'remplir'}">
                    ${isBrouillon ? 'Finaliser' : 'Remplir'}
                </button>
            </li>`;
    }).join('');
}

// ── Initialisation (appelée une fois depuis main.js) ───────────

export function initDashboard(nomTech) {
    const greeting = document.getElementById('dash-greeting');
    if (greeting) greeting.textContent = nomTech ? `Bonjour, ${nomTech}` : 'Tableau de bord';

    // Sous-titre : date du jour + nom de l'entreprise
    const subEl = document.getElementById('dash-hero-sub');
    if (subEl) {
        const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const company = cfg.company || '';
        subEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1) + (company ? ` · ${company}` : '');
    }


    document.getElementById('btn-dash-nouvelle').addEventListener('click', () => ouvrirNouvelleFeuille());

    // Modifier la période — affiche/masque le panneau inline
    document.getElementById('btn-dash-supp-edit').addEventListener('click', () => {
        const panel  = document.getElementById('dash-supp-edit');
        const btn    = document.getElementById('btn-dash-supp-edit');
        const isOpen = !panel.classList.contains('hidden');
        panel.classList.toggle('hidden');
        btn.textContent = isOpen ? '✎ Modifier la période' : '✕ Annuler';
        if (!isOpen) {
            const today = aujourdhui();
            document.getElementById('supp-inline-debut').value = suppDebut || today.slice(0, 8) + '01';
            document.getElementById('supp-inline-fin').value   = suppFin   || today;
        }
    });

    // Calculer avec la nouvelle période
    document.getElementById('btn-supp-inline-calc').addEventListener('click', () => {
        const debut = document.getElementById('supp-inline-debut').value;
        const fin   = document.getElementById('supp-inline-fin').value;
        if (!debut || !fin || debut > fin) return;
        suppDebut = debut;
        suppFin   = fin;
        document.getElementById('dash-supp-edit').classList.add('hidden');
        document.getElementById('btn-dash-supp-edit').textContent = '✎ Modifier la période';
        rendreHeuresSupp();
    });

    // Réinitialiser : 1er du mois → aujourd'hui
    document.getElementById('btn-dash-supp-reset').addEventListener('click', () => {
        suppDebut = null;
        suppFin   = null;
        document.getElementById('dash-supp-edit').classList.add('hidden');
        document.getElementById('btn-dash-supp-edit').textContent = '✎ Modifier la période';
        rendreHeuresSupp();
    });
    document.getElementById('dash-brouillon').addEventListener('click', reprendreBrouillon);
    document.getElementById('btn-retour-dashboard').addEventListener('click', afficherDashboard);

    // Boutons « Remplir » / « Finaliser » de la liste À régulariser (générés dynamiquement).
    document.getElementById('dash-action-list').addEventListener('click', (e) => {
        const btn = e.target.closest('.dash-action-btn');
        if (!btn) return;
        if (btn.dataset.action === 'finaliser') {
            finaliserBrouillon(btn.dataset.date);
        } else {
            ouvrirNouvelleFeuille(btn.dataset.date);
        }
    });

    // Après un enregistrement réussi (PDF ou email), revenir au dashboard à jour.
    document.addEventListener('feuille:enregistree', afficherDashboard);

    // Après une suppression dans l'historique, rafraîchir les données du dashboard
    // en arrière-plan (sans changer de vue : l'historique reste ouvert par-dessus).
    document.addEventListener('feuille:supprimee', rafraichirDashboard);
}
