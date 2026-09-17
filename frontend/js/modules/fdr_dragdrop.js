// Glisser-déposer vertical de cartes dans une liste (interventions / pauses du
// formulaire, cartes de l'accueil). On attrape la poignée « ≡ » : la carte suit
// le doigt (ou la souris), les autres cartes s'écartent en douceur pour laisser
// la place, puis la carte se pose. La liste = le parent direct de la carte.
const DUREE_POSE   = 220;  // ms — doit correspondre à la transition CSS de .card-dropping
const ZONE_SCROLL  = 90;   // px — près du bord de l'écran, la page défile toute seule
const HAUT_ENTETE  = 64;   // px — entête fixe de l'app

let drag = null;

// onFin : appelé une fois la carte réellement déplacée.
// avantDrag (facultatif) : appelé juste avant de commencer à glisser (ex. replier les cartes).
export function activerDragCarte(card, poignee, onFin, avantDrag) {
    poignee.addEventListener('pointerdown', (e) => demarrer(e, card, poignee, onFin, avantDrag));
}

function demarrer(e, card, poignee, onFin, avantDrag) {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    const liste = card.parentElement;
    if (avantDrag) avantDrag();

    // Espace entre deux cartes (margin-bottom, voir styles.css)
    const gap = parseFloat(getComputedStyle(card).marginBottom) || 0;

    // Positions de départ (en coordonnées de page, stables même si on défile).
    // Les cartes masquées (display:none) sont ignorées : elles n'occupent pas de place.
    const visibles = Array.from(liste.children).filter(c => c.offsetParent !== null);
    const autres = visibles.filter(c => c !== card).map(c => ({
        el: c, top: c.getBoundingClientRect().top + window.scrollY, h: c.offsetHeight,
    }));
    const origIndex = visibles.indexOf(card);

    drag = {
        card, poignee, onFin, autres, origIndex, liste, gap,
        cible:       origIndex,
        origTop:     card.getBoundingClientRect().top + window.scrollY,
        hauteur:     card.offsetHeight + gap,   // place que la carte occupe dans la liste
        startY:      e.clientY + window.scrollY,
        lastClientY: e.clientY,
        rafId:       0,
    };

    poignee.setPointerCapture(e.pointerId);
    poignee.addEventListener('pointermove',   bouger);
    poignee.addEventListener('pointerup',     lacher);
    poignee.addEventListener('pointercancel', lacher);

    card.classList.add('card-dragging');
    autres.forEach(a => a.el.classList.add('card-shifting'));
    drag.rafId = requestAnimationFrame(autoScroll);
}

function bouger(e) {
    if (!drag) return;
    drag.lastClientY = e.clientY;
    majPosition();
}

// Fait suivre la carte au doigt et écarte les voisines selon l'emplacement visé.
function majPosition() {
    const dy = drag.lastClientY + window.scrollY - drag.startY;
    drag.card.style.transform = `translateY(${dy}px) scale(1.02)`;

    // L'emplacement visé = nombre de cartes dont le milieu est au-dessus du milieu de la carte glissée
    const centre = drag.origTop + drag.card.offsetHeight / 2 + dy;
    const cible  = drag.autres.filter(a => a.top + a.h / 2 < centre).length;
    if (cible === drag.cible) return;
    drag.cible = cible;

    drag.autres.forEach((a, j) => {
        let t = '';
        if (j >= drag.origIndex && j < cible) t = `translateY(${-drag.hauteur}px)`;   // remonte
        else if (j < drag.origIndex && j >= cible) t = `translateY(${drag.hauteur}px)`; // descend
        a.el.style.transform = t;
    });
}

// Quand le doigt approche du haut ou du bas de l'écran, la page défile toute seule.
function autoScroll() {
    if (!drag) return;
    let delta = 0;
    if (drag.lastClientY < HAUT_ENTETE + ZONE_SCROLL)         delta = -10;
    else if (drag.lastClientY > window.innerHeight - ZONE_SCROLL) delta = 10;
    if (delta) { window.scrollBy(0, delta); majPosition(); }
    drag.rafId = requestAnimationFrame(autoScroll);
}

function lacher() {
    if (!drag) return;
    const d = drag;
    drag = null;
    cancelAnimationFrame(d.rafId);
    d.poignee.removeEventListener('pointermove',   bouger);
    d.poignee.removeEventListener('pointerup',     lacher);
    d.poignee.removeEventListener('pointercancel', lacher);

    // La carte glisse en douceur jusqu'à son nouvel emplacement avant d'être réellement déplacée.
    let dyFinal = 0;
    if (d.cible > d.origIndex) {
        for (let j = d.origIndex; j < d.cible; j++) dyFinal += d.autres[j].h + d.gap;
    } else if (d.cible < d.origIndex) {
        dyFinal = d.autres[d.cible].top - d.origTop;
    }
    d.card.classList.add('card-dropping');
    d.card.style.transform = `translateY(${dyFinal}px)`;
    setTimeout(() => finaliser(d), DUREE_POSE);
}

// Retire les effets visuels et déplace vraiment la carte dans la liste (sans saut à l'écran :
// la position réelle correspond exactement à celle affichée pendant l'animation).
function finaliser(d) {
    d.card.classList.remove('card-dragging', 'card-dropping');
    d.card.style.transform = '';
    d.autres.forEach(a => { a.el.classList.remove('card-shifting'); a.el.style.transform = ''; });

    if (d.cible !== d.origIndex) {
        const ref = d.autres[d.cible]?.el || null;
        d.liste.insertBefore(d.card, ref);
        d.onFin();
    }
}
