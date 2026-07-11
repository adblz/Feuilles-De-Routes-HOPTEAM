import { chargerHeuresSupp } from './db.js';
import { chargerPeriodesPaie } from './db_planning.js';
import { trouverPeriodeCourante, nomMois, rangeLabel } from './periodes_paie.js';
import { calcHebdomadaire, totauxSuppPeriode } from './heures_calculs.js';
import { renderHeures } from './heures_render.js';
import { isoLocal, escHtml } from '../utils/utils.js';

let initialized = false;
let periodes    = [];

function debutMois() {
    const n = new Date();
    return isoLocal(new Date(n.getFullYear(), n.getMonth(), 1));
}

export function afficherHeures() {
    ['vue-dashboard', 'vue-formulaire', 'vue-resume'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
    document.getElementById('vue-heures').classList.remove('hidden');
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent('nav:heures'));

    if (!initialized) {
        initialized = true;
        document.getElementById('heures-date-debut').value = debutMois();
        document.getElementById('heures-date-fin').value   = isoLocal(new Date());
        // « Calculer » = période personnalisée à partir des deux champs date.
        document.getElementById('btn-heures-calc').addEventListener('click', () => {
            document.getElementById('heures-periode').value = 'custom';
            chargerEtRendre();
        });
        document.getElementById('heures-periode').addEventListener('change', appliquerSelection);
    }
    peuplerPeriodes();
}

// Remplit le menu déroulant des périodes du planning et affiche la période courante.
async function peuplerPeriodes() {
    const sel      = document.getElementById('heures-periode');
    const row      = document.getElementById('heures-periode-row');
    const datesRow = document.getElementById('heures-dates-row');

    try { periodes = await chargerPeriodesPaie(); }
    catch { periodes = []; }

    // Sans planning : on garde l'ancien comportement (mois calendaire + champs date).
    if (!periodes.length) {
        row.classList.add('hidden');
        datesRow.classList.remove('hidden');
        chargerEtRendre();
        return;
    }

    row.classList.remove('hidden');
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    sel.innerHTML = periodes.map((p, i) => `<option value="${i}">${cap(nomMois(p))}</option>`).join('')
        + '<option value="custom">Période personnalisée…</option>';

    const courante = trouverPeriodeCourante(periodes, isoLocal(new Date()));
    sel.value = String(courante ? periodes.indexOf(courante) : 0);
    appliquerSelection();
}

function appliquerSelection() {
    const sel      = document.getElementById('heures-periode');
    const datesRow = document.getElementById('heures-dates-row');

    if (sel.value === 'custom') {
        datesRow.classList.remove('hidden');   // on laisse l'utilisateur saisir ses dates
        return;
    }
    const p = periodes[parseInt(sel.value, 10)];
    if (!p) return;
    document.getElementById('heures-date-debut').value = p.date_debut;
    document.getElementById('heures-date-fin').value   = p.date_fin;
    datesRow.classList.add('hidden');
    chargerEtRendre();
}

export async function chargerEtRendre() {
    const debut = document.getElementById('heures-date-debut').value;
    const fin   = document.getElementById('heures-date-fin').value;
    if (!debut || !fin) return;

    const zone = document.getElementById('heures-tableau');
    zone.innerHTML = '<p class="heures-loading">Chargement…</p>';

    try {
        const feuilles = await chargerHeuresSupp(debut, fin);
        const semaines = calcHebdomadaire(feuilles);
        const totaux   = totauxSuppPeriode(feuilles);
        zone.innerHTML = renderHeures(semaines, totaux, rangeLabel(debut, fin));
    } catch (e) {
        zone.innerHTML = `<p class="heures-error">Erreur : ${escHtml(e.message)}</p>`;
    }
}
