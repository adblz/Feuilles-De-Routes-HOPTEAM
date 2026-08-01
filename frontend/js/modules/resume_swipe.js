// Détection d'un glissement horizontal du doigt sur un élément.
// Ne connaît rien au contenu affiché : il signale seulement « glissé vers la
// gauche » ou « vers la droite », et peut donc resservir ailleurs.

const SEUIL_PX  = 60;    // distance minimale pour valider le geste
const RATIO     = 1.5;   // l'horizontal doit nettement dominer le vertical
const DUREE_MAX = 800;   // au-delà c'est une hésitation, pas un glissement
const MARGE_AXE = 8;     // en dessous, la direction n'est pas encore décidée

export function activerSwipe(element, { onGauche, onDroite, onDeplacement, onAnnule } = {}) {
    if (!element) return;

    let x0 = 0, y0 = 0, t0 = 0, actif = false, axe = null;

    element.addEventListener('touchstart', e => {
        actif = false;
        // Un geste qui démarre sur un bouton ou un champ appartient à ce bouton.
        if (e.touches.length !== 1 || e.target.closest('button, a, input, select, textarea')) return;
        const t = e.touches[0];
        x0 = t.clientX;
        y0 = t.clientY;
        t0 = Date.now();
        actif = true;
        axe   = null;
    }, { passive: true });

    element.addEventListener('touchmove', e => {
        if (!actif) return;
        const dx = e.touches[0].clientX - x0;
        const dy = e.touches[0].clientY - y0;

        // La direction se fixe au premier mouvement franc et ne change plus :
        // si l'utilisateur fait défiler la page verticalement, on lâche le geste
        // pour de bon. C'est ce qui garantit que le défilement reste normal.
        if (!axe) {
            if (Math.abs(dx) < MARGE_AXE && Math.abs(dy) < MARGE_AXE) return;
            axe = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            if (axe === 'y') {
                actif = false;
                onAnnule?.();
                return;
            }
        }
        onDeplacement?.(dx);
    }, { passive: true });

    element.addEventListener('touchend', e => {
        if (!actif) return;
        actif = false;
        const t  = e.changedTouches?.[0];
        const dx = t ? t.clientX - x0 : 0;
        const dy = t ? t.clientY - y0 : 0;

        const valide = axe === 'x'
            && Math.abs(dx) > SEUIL_PX
            && Math.abs(dx) > Math.abs(dy) * RATIO
            && Date.now() - t0 < DUREE_MAX;

        if (!valide) { onAnnule?.(); return; }
        (dx < 0 ? onGauche : onDroite)?.();
    }, { passive: true });

    element.addEventListener('touchcancel', () => {
        actif = false;
        onAnnule?.();
    }, { passive: true });
}
