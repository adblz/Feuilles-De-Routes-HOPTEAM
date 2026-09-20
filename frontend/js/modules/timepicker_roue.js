// timepicker_roue.js — une colonne de la molette d'heure : cylindre 3D bouclé (style iPhone).
// Gère le doigt (glisser, lâcher avec élan, tape sur un chiffre), la molette souris et les flèches.

const ITEM_H = 34;            // hauteur d'un cran, doit correspondre à --tp-item-h dans le CSS
const PAS_DEG = 20;           // angle entre deux crans sur le cylindre
const RAYON = ITEM_H / (2 * Math.sin(PAS_DEG / 2 * Math.PI / 180));   // ≈ 98 px
const VISIBLE_DEG = 88;       // au-delà, le chiffre est derrière le cylindre
const FROTTEMENT = 0.994;     // perte de vitesse par milliseconde après le lâcher
const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Roue {
    constructor(el, valeurs) {
        this.el = el;
        this.pos = 0; this.raf = 0; this.dernierIdx = -1;
        this.valeurs = valeurs; this.n = valeurs.length;
        this.items = valeurs.map((v, i) => {
            const d = document.createElement('div');
            d.className = 'tp-item'; d.textContent = v; d.dataset.i = i;
            el.appendChild(d); return d;
        });
        this.brancher();
        this.rendre();
    }

    get index() { return ((Math.round(this.pos) % this.n) + this.n) % this.n; }
    get valeur() { return this.valeurs[this.index]; }

    // Écart signé le plus court entre un cran i et la position courante (cylindre bouclé).
    ecart(i) {
        let d = (i - this.pos) % this.n;
        if (d > this.n / 2) d -= this.n;
        if (d < -this.n / 2) d += this.n;
        return d;
    }

    rendre() {
        for (let i = 0; i < this.n; i++) {
            const a = -this.ecart(i) * PAS_DEG;   // positif = le cran monte
            const it = this.items[i];
            if (Math.abs(a) > VISIBLE_DEG) { it.style.visibility = 'hidden'; continue; }
            it.style.visibility = 'visible';
            it.style.transform = `rotateX(${a.toFixed(2)}deg) translateZ(${RAYON.toFixed(1)}px)`;
            it.style.opacity = Math.pow(Math.max(0, Math.cos(a * Math.PI / 180)), 1.7).toFixed(3);
        }
        const idx = this.index;
        if (idx !== this.dernierIdx) {
            if (this.dernierIdx !== -1 && navigator.vibrate) navigator.vibrate(3);
            this.dernierIdx = idx;
            this.el.setAttribute('aria-valuetext', this.valeur);
        }
    }

    stop() { cancelAnimationFrame(this.raf); }

    // Place directement sur une valeur (à l'ouverture du panneau).
    aller(valeur) {
        this.stop();
        this.pos = Math.max(0, this.valeurs.indexOf(valeur));
        this.dernierIdx = -1;
        this.rendre();
    }

    // Glisse en douceur jusqu'à un cran entier.
    animerVers(cible, duree) {
        this.stop();
        const depart = this.pos, dist = cible - depart, t0 = performance.now();
        if (reduit || Math.abs(dist) < 0.001) { this.pos = cible; this.rendre(); return; }
        const pas = now => {
            const t = Math.min(1, (now - t0) / duree);
            this.pos = depart + dist * (1 - Math.pow(1 - t, 4));   // départ rapide, arrivée très douce
            this.rendre();
            if (t < 1) this.raf = requestAnimationFrame(pas);
        };
        this.raf = requestAnimationFrame(pas);
    }

    caler() { this.animerVers(Math.round(this.pos), 220); }

    // Lâcher avec vitesse (crans/ms) : on calcule où l'élan s'arrêterait et on y va d'une traite.
    lancer(v) {
        const cible = Math.round(this.pos + v / (1 - FROTTEMENT));
        this.animerVers(cible, Math.min(1400, 260 + Math.abs(cible - this.pos) * 70));
    }

    brancher() {
        const el = this.el;
        let actif = false, y0 = 0, t0 = 0, pos0 = 0, echantillons = [];

        el.addEventListener('pointerdown', e => {
            actif = true; this.stop();
            y0 = e.clientY; t0 = performance.now(); pos0 = this.pos; echantillons = [[y0, t0]];
            el.setPointerCapture(e.pointerId);
        });
        el.addEventListener('pointermove', e => {
            if (!actif) return;
            const now = performance.now();
            this.pos = pos0 - (e.clientY - y0) / ITEM_H; this.rendre();
            echantillons.push([e.clientY, now]);
            echantillons = echantillons.filter(s => now - s[1] < 120);
        });
        el.addEventListener('pointerup', e => {
            if (!actif) return; actif = false;
            const now = performance.now();
            // Tape brève sans mouvement : on va au cran touché.
            if (Math.abs(e.clientY - y0) < 5 && now - t0 < 300) {
                const it = e.target.closest('.tp-item');
                if (it) this.animerVers(Math.round(this.pos) + Math.round(this.ecart(+it.dataset.i)), 240);
                else this.caler();
                return;
            }
            const [yA, tA] = echantillons[0];
            const dt = now - tA;
            const v = dt > 0 ? -(e.clientY - yA) / dt / ITEM_H : 0;   // crans / ms
            if (Math.abs(v) > 0.0025) this.lancer(v); else this.caler();
        });
        el.addEventListener('pointercancel', () => { actif = false; this.caler(); });

        let minuteur;
        el.addEventListener('wheel', e => {
            e.preventDefault(); this.stop();
            this.pos += e.deltaY / ITEM_H * 0.35; this.rendre();
            clearTimeout(minuteur); minuteur = setTimeout(() => this.caler(), 90);
        }, { passive: false });

        el.addEventListener('keydown', e => {
            if (e.key === 'ArrowUp') { e.preventDefault(); this.animerVers(Math.round(this.pos) - 1, 180); }
            if (e.key === 'ArrowDown') { e.preventDefault(); this.animerVers(Math.round(this.pos) + 1, 180); }
        });
    }
}
