let toastTimer = null;

export function showToast(msg, type = '', duration = 3000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className   = 'show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = ''; }, duration);
}

export function validerFormulaire() {
    const manquants = [];
    if (!document.getElementById('technicien').value.trim()) manquants.push('nom du technicien');
    if (!document.getElementById('heure-debut').value)       manquants.push('heure de début');
    if (!document.getElementById('heure-fin').value)         manquants.push('heure de fin');
    if (manquants.length) {
        showToast('Champs incomplets : ' + manquants.join(', '), 'warn', 4000);
    }
}

export function setBusy(busy, msg = 'Génération du PDF en cours…') {
    document.getElementById('loading-overlay').classList.toggle('visible', busy);
    document.getElementById('loading-msg').textContent = msg;
    document.getElementById('btn-pdf').disabled   = busy;
    document.getElementById('btn-email').disabled = busy;
}

export function parseDuree(str) {
    if (!str) return 0;
    const parts = str.split('h');
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
}

export function affH(m) {
    return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
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

// Fait défiler l'écran en douceur vers le haut d'un élément (ex. nouvelle carte).
// Le décalage sous l'entête fixe est géré en CSS via `scroll-margin-top`.
export function scrollVersCarte(el) {
    if (!el) return;
    requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}
