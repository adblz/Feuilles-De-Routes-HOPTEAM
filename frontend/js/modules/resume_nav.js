import { chargerHistorique } from './db.js';
import { remonterEnHaut } from './resume_scroll.js';
import { activerSwipe } from './resume_swipe.js';
import { afficherResumeFeuille } from './resume.js';
import { precharger, viderCacheFeuilles } from './resume_cache.js';
import {
    preparerCarrousel, bougerCarrousel, annulerCarrousel,
    validerCarrousel, nettoyerCarrousel,
} from './resume_carousel.js';

const CLE_AIDE = 'fdr_swipe_vu';   // lue aussi par resume_render.js

let _histo       = null;    // feuilles de la plus récente à la plus ancienne
let _courante    = null;    // id de la feuille actuellement affichée
let _occupe      = false;
let _dernierDrag = 0;
let _init        = false;

async function liste() {
    if (!_histo) _histo = await chargerHistorique();
    return _histo;
}

// L'historique va de la plus récente à la plus ancienne : la journée
// précédente est donc la case d'après dans le tableau, et inversement.
function voisines() {
    if (!_histo || !_courante) return {};
    const i = _histo.findIndex(f => f.id === _courante);
    if (i === -1) return {};
    return { prec: _histo[i + 1]?.id || null, suiv: _histo[i - 1]?.id || null };
}

// Dès qu'une journée est affichée, on va chercher discrètement celles d'avant
// et d'après : elles seront prêtes à être montrées au premier glissement.
async function preparerVoisines() {
    try { await liste(); } catch { return; }
    const { prec, suiv } = voisines();
    precharger(prec);
    precharger(suiv);
}

function debutGeste() {
    if (_occupe) return;
    if (!_histo) { liste().catch(() => {}); return; }
    const { prec, suiv } = voisines();
    preparerCarrousel(prec, suiv);
}

async function naviguer(cote, sens) {
    const cible = voisines()[cote];
    if (_occupe || !cible) { annulerCarrousel(); return; }

    _occupe = true;
    try {
        // Le geste est acquis : le repère d'aide ne doit plus réapparaître.
        try { localStorage.setItem(CLE_AIDE, '1'); } catch { /* navigation privée */ }

        await validerCarrousel(sens);       // la journée voisine occupe l'écran
        // Remonté avant le changement de contenu : la page est cachée derrière
        // le panneau, donc le saut ne se voit pas, et le navigateur n'a plus
        // de position à vouloir conserver quand le contenu est remplacé.
        remonterEnHaut();
        await afficherResumeFeuille(cible); // la vraie page se monte derrière
        remonterEnHaut();
        requestAnimationFrame(nettoyerCarrousel);
    } catch {
        nettoyerCarrousel();
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

    // Listes et feuilles gardées en mémoire : on oublie tout dès qu'une
    // feuille est ajoutée, modifiée ou supprimée.
    document.addEventListener('feuille:enregistree', () => { _histo = null; viderCacheFeuilles(); });
    document.addEventListener('feuille:supprimee',   () => {
        _histo = null; _courante = null; viderCacheFeuilles();
    });

    // resume.js annonce la feuille qu'il vient d'afficher via cet événement.
    document.addEventListener('nav:resume', e => {
        if (e.detail?.feuilleId) _courante = e.detail.feuilleId;
        preparerVoisines();
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
        onDebut:       debutGeste,
        onGauche:      () => naviguer('suiv', -1),   // vers la gauche = jour suivant
        onDroite:      () => naviguer('prec', 1),    // vers la droite = jour précédent
        onDeplacement: dx => { _dernierDrag = Date.now(); bougerCarrousel(dx); },
        onAnnule:      annulerCarrousel,
    });
}
