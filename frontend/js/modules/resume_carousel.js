import { buildResumeHTML } from './resume_render.js';
import { detailEnCache } from './resume_cache.js';

// Les journées voisines sont dessinées dans deux panneaux posés hors écran,
// à gauche et à droite. Pendant le glissement les trois bougent ensemble :
// on voit arriver le jour d'à côté comme dans une galerie photo.

const DUREE_ANIM = 220;   // ms — doit rester en accord avec le CSS
const RESISTANCE = 0.28;  // freinage quand il n'y a rien de ce côté-là

let _prec = null, _suiv = null, _largeur = 0, _actif = false;

const contenu = () => document.getElementById('resume-content');

// Le panneau est collé au viewport : son contenu doit donc démarrer à la
// hauteur qu'occupe le résumé quand la page est en haut (sous l'en-tête).
// offsetTop plutôt qu'un calcul à partir du défilement : la mesure reste
// juste même si le geste démarre au milieu de la page.
function decalageHaut() {
    const vue = document.getElementById('vue-resume');
    return vue ? vue.offsetTop : 0;
}

function creerPanneau(detail, haut) {
    const panneau = document.createElement('div');
    panneau.className = 'resume-panneau';

    const inner = document.createElement('div');
    inner.className = 'container resume-panneau-inner';
    inner.style.top = haut + 'px';
    inner.innerHTML = detail
        ? buildResumeHTML(detail.feuille, detail.elements)
        : '<p class="resume-empty">Chargement…</p>';

    // Sans ça les identifiants seraient en double dans la page et l'aperçu
    // volerait les clics des vrais boutons du résumé affiché.
    inner.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));

    panneau.appendChild(inner);
    document.body.appendChild(panneau);
    return panneau;
}

export function preparerCarrousel(idPrec, idSuiv) {
    nettoyerCarrousel();
    _actif   = true;
    _largeur = window.innerWidth;
    const haut = decalageHaut();
    if (idPrec) _prec = creerPanneau(detailEnCache(idPrec), haut);
    if (idSuiv) _suiv = creerPanneau(detailEnCache(idSuiv), haut);
    bougerCarrousel(0);
}

// dx > 0 : le doigt va vers la droite, on découvre la journée précédente.
export function bougerCarrousel(dx) {
    // Même sans panneaux voisins (liste pas encore chargée) le contenu bouge :
    // il faudra donc le remettre en place, on marque le carrousel comme actif.
    _actif = true;
    let d = dx;
    if ((d > 0 && !_prec) || (d < 0 && !_suiv)) d *= RESISTANCE;

    const el = contenu();
    if (el) {
        el.classList.add('resume-swiping');
        el.style.transform = `translateX(${d}px)`;
    }
    if (_prec) _prec.style.transform = `translateX(${d - _largeur}px)`;
    if (_suiv) _suiv.style.transform = `translateX(${d + _largeur}px)`;
    return d;
}

function animer(vers) {
    const el = contenu();
    if (el) {
        el.classList.remove('resume-swiping');
        el.style.transform = vers ? `translateX(${vers * _largeur}px)` : '';
    }
    if (_prec) { _prec.classList.add('resume-panneau-anim'); _prec.style.transform = `translateX(${(vers - 1) * _largeur}px)`; }
    if (_suiv) { _suiv.classList.add('resume-panneau-anim'); _suiv.style.transform = `translateX(${(vers + 1) * _largeur}px)`; }
}

// Appelée aussi à chaque geste vertical abandonné : sans carrousel en cours
// il n'y a rien à défaire, on ressort tout de suite.
export function annulerCarrousel() {
    if (!_actif) return;
    animer(0);
    setTimeout(nettoyerCarrousel, DUREE_ANIM);
}

// Fait glisser jusqu'au bout, puis rend la main pour installer la vraie page.
export function validerCarrousel(sens) {
    animer(sens);
    return new Promise(resolve => setTimeout(resolve, DUREE_ANIM));
}

export function nettoyerCarrousel() {
    if (!_actif) return;
    _actif = false;

    // Le contenu est remis en place AVANT de retirer les panneaux : dans
    // l'autre sens, l'espace vide laissé par le panneau serait visible le
    // temps d'une image. Sans animation non plus, car après un changement de
    // jour la page est déjà à la bonne place et ne doit pas re-glisser.
    const el = contenu();
    if (el) {
        el.classList.add('resume-swiping');
        el.style.transform = '';
        void el.offsetWidth;
        el.classList.remove('resume-swiping');
    }

    _prec?.remove();
    _suiv?.remove();
    _prec = _suiv = null;
}
