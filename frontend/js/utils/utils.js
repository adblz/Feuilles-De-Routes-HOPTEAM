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
