import { chargerHistorique } from './db.js';
import { activerSwipe } from './resume_swipe.js';
import { afficherResumeFeuille } from './resume.js';

const MAX_DECALAGE = 80;    // le contenu ne suit le doigt que sur 80 px
const CLE_AIDE     = 'fdr_swipe_vu';   // lue aussi par resume_render.js

let _histo       = null;    // feuilles de la plus récente à la plus ancienne
let _courante    = null;    // id de la feuille actuellement affichée
let _occupe      = false;
let _dernierDrag = 0;
let _init        = false;

const contenu = () => document.getElementById('resume-content');

function suivreDoigt(dx) {
    const el = contenu();
    if (!el) return;
    _dernierDrag = Date.now();
    // Le contenu accroche le doigt sans le suivre complètement : on sent que
    // quelque chose se passe, sans décoller la page.
    const decalage = Math.max(-MAX_DECALAGE, Math.min(MAX_DECALAGE, dx * 0.4));
    el.classList.add('resume-swiping');
    el.style.transform = `translateX(${decalage}px)`;
}

function replacer() {
    const el = contenu();
    if (!el) return;
    el.classList.remove('resume-swiping');
    el.style.transform = '';
}

// Un glissement laisse souvent un reste d'élan vertical (le navigateur fait
// défiler la page de son côté pendant le geste) : cet élan reprend la main
// juste après notre remontée. On insiste donc sur trois instants successifs.
function remonter() {
    const haut = () => window.scrollTo(0, 0);
    haut();
    requestAnimationFrame(haut);
    setTimeout(haut, 140);
}

async function liste() {
    if (!_histo) _histo = await chargerHistorique();
    return _histo;
}

// L'historique est trié de la plus récente à la plus ancienne : passer au
// jour suivant revient donc à reculer d'un cran dans le tableau.
async function naviguer(pas, sens) {
    replacer();
    if (_occupe || !_courante) return;
    _occupe = true;
    try {
        const histo = await liste();
        const i = histo.findIndex(f => f.id === _courante);
        const cible = i === -1 ? null : histo[i + pas];
        if (!cible) return;                 // plus rien avant / après : on ne bouge pas
        // Posé avant le rendu : le geste est acquis, le repère d'aide ne
        // doit plus apparaître dès cette page-ci.
        try { localStorage.setItem(CLE_AIDE, '1'); } catch { /* navigation privée */ }
        await afficherResumeFeuille(cible.id);
        remonter();
        const el = contenu();
        if (el) {
            // Retirer la classe puis forcer un recalcul relance l'animation
            // même quand on enchaîne deux glissements coup sur coup.
            el.classList.remove('resume-entre');
            void el.offsetWidth;
            el.style.setProperty('--sens', sens);
            el.classList.add('resume-entre');
        }
    } catch {
        // Liste indisponible (réseau) : on reste simplement sur la feuille affichée
    } finally {
        _occupe = false;
    }
}

export function initResumeNav() {
    const vue = document.getElementById('vue-resume');
    // Le garde-fou évite de brancher deux fois les mêmes écouteurs si le
    // démarrage de l'app repasse par ici (un glissement compterait double).
    if (!vue || _init) return;
    _init = true;

    // La liste est gardée en mémoire pour ne pas rappeler le serveur à chaque
    // glissement ; on l'oublie dès qu'une feuille est ajoutée ou supprimée.
    document.addEventListener('feuille:enregistree', () => { _histo = null; });
    document.addEventListener('feuille:supprimee',   () => { _histo = null; _courante = null; });

    // resume.js annonce la feuille qu'il vient d'afficher via cet événement.
    document.addEventListener('nav:resume', e => {
        if (e.detail?.feuilleId) _courante = e.detail.feuilleId;
        replacer();
    });

    // Un glissement se termine par un « clic » qui ouvrirait la bulle d'info
    // d'un bloc de la frise : on l'intercepte avant qu'il ne descende.
    vue.addEventListener('click', e => {
        if (Date.now() - _dernierDrag < 300) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);

    activerSwipe(vue, {
        onGauche:      () => naviguer(-1, '1'),   // vers la gauche = jour suivant
        onDroite:      () => naviguer(1, '-1'),   // vers la droite = jour précédent
        onDeplacement: suivreDoigt,
        onAnnule:      replacer,
    });
}
