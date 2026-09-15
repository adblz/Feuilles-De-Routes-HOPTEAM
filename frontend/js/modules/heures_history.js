import { chargerHeuresSupp } from './db.js';
import { chargerPeriodesPaie } from './db_planning.js';
import { trouverPeriodeCourante, nomMois, rangeLabel, periodesMoisCalendaire } from './periodes_paie.js';
import { cfg } from './fdr_config.js';
import { calcHebdomadaire, totauxSuppPeriode } from './heures_calculs.js';
import { renderHeures } from './heures_render.js';
import { isoLocal, escHtml } from '../utils/utils.js';
import { montrerInfoBloc } from './heures_tooltip.js';

let initialized = false;
let periodes    = [];

function debutMois() {
    const n = new Date();
    return isoLocal(new Date(n.getFullYear(), n.getMonth(), 1));
}

export function afficherHeures() {
    ['vue-dashboard', 'vue-formulaire', 'vue-resume', 'vue-clients'].forEach(id => {
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
        // Sur téléphone, l'infobulle « title » ne s'affiche pas : un appui sur un
        // bloc de la frise ouvre une bulle ancrée dessus (client, horaires).
        document.getElementById('heures-tableau').addEventListener('click', e => {
            const bloc = e.target.closest('.heures-bloc');
            if (bloc?.dataset.info) montrerInfoBloc(bloc, bloc.dataset.info);
        });
    }
    peuplerPeriodes();
}

// Remplit le menu déroulant des périodes et affiche la période courante.
// Entreprise en « mois calendaire » (réglage admin, ex. DAV) : on ignore le
// planning des heures supp et on propose les 12 derniers mois du 1er au 31.
async function peuplerPeriodes() {
    const sel      = document.getElementById('heures-periode');
    const row      = document.getElementById('heures-periode-row');
    const datesRow = document.getElementById('heures-dates-row');

    if (cfg.moisCalendaire) {
        periodes = periodesMoisCalendaire();
    } else {
        try { periodes = await chargerPeriodesPaie(); }
        catch { periodes = []; }
    }

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

// Période actuellement affichée à l'écran : les deux dates + son intitulé
// (« Juillet 2026 ») quand elle vient du planning. Le PDF récapitulatif s'en
// sert pour porter exactement sur ce que l'utilisateur voit.
export function periodeAffichee() {
    const debut = document.getElementById('heures-date-debut').value;
    const fin   = document.getElementById('heures-date-fin').value;
    const sel   = document.getElementById('heures-periode');
    const p     = (sel && sel.value !== 'custom') ? periodes[parseInt(sel.value, 10)] : null;
    const cap   = s => s.charAt(0).toUpperCase() + s.slice(1);
    return { debut, fin, titre: p ? `${cap(nomMois(p))} ${p.annee}` : null };
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
