let toastTimer = null;

export function showToast(msg, type = '', duration = 3000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className   = 'show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = ''; }, duration);
}

export function validerFormulaire() {
    const manquants     = [];
    const champsMauvais = [];

    const technicien = document.getElementById('technicien');
    if (!technicien.value.trim()) { manquants.push('nom du technicien'); champsMauvais.push(technicien); }

    const debut = document.getElementById('heure-debut');
    if (!debut.value) { manquants.push('heure de début'); champsMauvais.push(debut); }

    const fin = document.getElementById('heure-fin');
    if (!fin.value) { manquants.push('heure de fin'); champsMauvais.push(fin); }

    const repas = document.getElementById('repas');
    if (!repas.value) { manquants.push('pause repas'); champsMauvais.push(repas); }

    if (champsMauvais.length) {
        showToast('Champs incomplets : ' + manquants.join(', '), 'warn', 4000);
        signalerChampsManquants(champsMauvais);
        return false;
    }
    return true;
}

// Surligne les champs en erreur et fait défiler l'écran vers le premier d'entre eux.
// Le surlignage disparaît dès que l'utilisateur corrige le champ concerné.
function signalerChampsManquants(elements) {
    elements.forEach(el => {
        el.classList.add('champ-erreur');
        const retirer = () => el.classList.remove('champ-erreur');
        el.addEventListener('input',  retirer, { once: true });
        el.addEventListener('change', retirer, { once: true });
    });
    const premier = elements[0];
    premier.scrollIntoView({ behavior: 'smooth', block: 'center' });
    premier.focus({ preventScroll: true });
}

export function setBusy(busy, msg = 'Génération du PDF en cours…') {
    document.getElementById('loading-overlay').classList.toggle('visible', busy);
    document.getElementById('loading-msg').textContent = msg;
    const btnPdf = document.getElementById('btn-pdf');
    if (btnPdf) btnPdf.disabled = busy;
}

export function parseDuree(str) {
    if (!str) return 0;
    const parts = str.split('h');
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
}

// Durée « XhMM » entre deux heures « HH:MM », gère le passage de minuit. '' si vide/nul.
export function dureeCourte(debut, fin) {
    if (!debut || !fin) return '';
    const [dh, dm] = debut.split(':').map(Number);
    const [fh, fm] = fin.split(':').map(Number);
    let min = (fh * 60 + fm) - (dh * 60 + dm);
    if (min < 0) min += 1440;   // passage de minuit
    return min > 0 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : '';
}

// Retire les secondes d'une heure « HH:MM:SS » (venant de la base) → « HH:MM ».
// Laisse la valeur telle quelle si vide/nulle.
export function hhmm(t) {
    return t ? t.slice(0, 5) : t;
}

export function affH(m) {
    return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

// Normalise une saisie d'heures supp au format « XhMM ».
// Accepte « 3 », « 3h », « 3h5 », « 03h00 », « 3:00 ». Renvoie { ok, value }.
export function normaliserSupp(str) {
    const s = (str || '').trim().toLowerCase();
    if (!s) return { ok: true, value: '0h00' };
    const m = s.match(/^(\d{1,2})(?:\s*[h:]\s*(\d{1,2}))?$/);
    if (!m) return { ok: false };
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (min > 59) return { ok: false };
    return { ok: true, value: affH(parseInt(m[1], 10) * 60 + min) };
}

// Neutralise les caractères spéciaux avant insertion dans du HTML (anti-XSS).
export function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function isoLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Icônes œil (afficher / masquer le mot de passe).
const EYE_OPEN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.16 2.9M6.6 6.6A13.2 13.2 0 0 0 2 11s3.5 7 10 7a9.1 9.1 0 0 0 4.4-1.1"/>' +
    '<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M2 2l20 20"/></svg>';

// Icônes crayon (modifier) / corbeille (supprimer), réutilisées dans les tableaux admin.
export const ICON_MODIFIER =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">' +
    '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
export const ICON_SUPPRIMER =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">' +
    '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
    '<line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

// Branche un bouton « œil » sur un champ mot de passe : bascule affiché/masqué.
export function attachPasswordToggle(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn   = document.getElementById(btnId);
    if (!input || !btn) return;
    btn.innerHTML = EYE_OPEN;
    btn.setAttribute('aria-label', 'Afficher le mot de passe');
    btn.addEventListener('click', () => {
        const masque = input.type === 'password';
        input.type = masque ? 'text' : 'password';
        btn.innerHTML = masque ? EYE_OFF : EYE_OPEN;
        btn.setAttribute('aria-label', masque ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    });
}

// Fait défiler l'écran en douceur vers le haut d'un élément (ex. nouvelle carte).
// Le décalage sous l'entête fixe est géré en CSS via `scroll-margin-top`.
export function scrollVersCarte(el) {
    if (!el) return;
    requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

// Branche le bouton « ↻ Mettre à jour » : désinscrit le service worker et vide
// les caches pour repartir sur une version propre du site (utile si un ancien
// fichier reste bloqué en cache après une mise à jour).
export function attacherBoutonMiseAJour(btnId = 'btn-refresh-app') {
    document.getElementById(btnId)?.addEventListener('click', async () => {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) await reg.unregister();
        }
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
        location.reload(true);
    });
}
