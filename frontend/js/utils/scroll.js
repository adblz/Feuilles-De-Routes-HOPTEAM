// Défilement doux de la page vers une carte du formulaire.
// On anime nous-mêmes le défilement (au lieu de scrollIntoView) pour maîtriser
// la durée et la courbe : plus lent et plus régulier, surtout sur téléphone.

// La durée dépend de la distance : un petit déplacement est court, un grand écran
// entier prend plus de temps, pour que l'œil puisse suivre. Plafonnée pour ne pas traîner.
const DUREE_MIN_MS  = 500;
const DUREE_MAX_MS  = 1200;
const MS_PAR_PIXEL  = 0.8;
const MARGE         = 12;   // espace laissé entre la carte et les bords de la zone visible

let animId = 0;

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Anime le défilement de la fenêtre jusqu'à la position y (en pixels depuis le haut de la page).
// `onFin` est appelé une fois arrivé.
export function defilerVers(y, onFin) {
    cancelAnimationFrame(animId);
    const depart   = window.scrollY;
    const maxY     = document.documentElement.scrollHeight - window.innerHeight;
    const arrivee  = Math.max(0, Math.min(y, maxY));
    const distance = arrivee - depart;
    if (Math.abs(distance) < 1) { onFin?.(); return; }
    const duree = Math.min(DUREE_MAX_MS, DUREE_MIN_MS + Math.abs(distance) * MS_PAR_PIXEL);
    const t0 = performance.now();
    const etape = (now) => {
        const p = Math.min(1, (now - t0) / duree);
        window.scrollTo(0, depart + distance * easeInOutCubic(p));
        if (p < 1) animId = requestAnimationFrame(etape);
        else onFin?.();
    };
    animId = requestAnimationFrame(etape);
}

// Bords de la zone réellement visible : sous l'entête collant, au-dessus des barres fixées en bas.
function zoneVisible() {
    let haut = 0;
    const header = document.querySelector('header');
    if (header && ['sticky', 'fixed'].includes(getComputedStyle(header).position)) {
        haut = header.getBoundingClientRect().bottom;
    }
    let bas = window.innerHeight;
    document.querySelectorAll('.actions, .bottom-toolbar').forEach(el => {
        if (getComputedStyle(el).position === 'fixed') bas = Math.min(bas, el.getBoundingClientRect().top);
    });
    return { haut, bas };
}

// Fait défiler pour amener le haut de la carte juste sous l'entête. `onFin` est appelé une fois arrivé.
export function scrollVersCarte(el, onFin) {
    if (!el) return;
    requestAnimationFrame(() => {
        const { haut } = zoneVisible();
        defilerVers(window.scrollY + el.getBoundingClientRect().top - haut - MARGE, onFin);
    });
}

// Exécute une modification de la page (ex. replier des cartes au-dessus) sans que
// l'élément donné bouge à l'écran : on compense le décalage sur le défilement.
export function sansBougerAEcran(el, modification) {
    const avant = el.getBoundingClientRect().top;
    modification();
    window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - avant);
}

// Fait défiler juste ce qu'il faut (vers le haut ou le bas) pour voir la carte en entier.
// Si la carte est plus haute que l'écran, on cale son haut sous l'entête.
export function assurerCarteVisible(el) {
    if (!el) return;
    requestAnimationFrame(() => {
        const { haut, bas } = zoneVisible();
        const r = el.getBoundingClientRect();
        const tropHaute = r.height + 2 * MARGE > bas - haut;
        if (tropHaute || r.top < haut + MARGE) {
            defilerVers(window.scrollY + r.top - haut - MARGE);
        } else if (r.bottom > bas - MARGE) {
            defilerVers(window.scrollY + r.bottom - bas + MARGE);
        }
    });
}
