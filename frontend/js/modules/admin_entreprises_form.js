// Champs « réglages » d'une entreprise dans le modal d'édition : règles de calcul
// d'heures (trajet, seuil hebdo, palier +25 %, plage de nuit) et mentions PDF.
// Séparé de admin_entreprises_modal.js pour respecter la limite de 150 lignes.

const H = 60;   // minutes par heure

function num(v, def) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def; }

function minToTime(min) {
    const m = ((min % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function timeToMin(t) {
    const [h, m] = String(t).split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

function champ(suffixe) { return document.getElementById('ent-edit-' + suffixe); }

// Remplit les champs du modal avec les réglages de l'entreprise `e` (heures affichées
// en heures, stockées en minutes ; plage de nuit affichée en heures:minutes).
export function remplirReglages(e) {
    champ('trajet').value   = num(e.trajet_minutes, 60);
    champ('seuil').value    = num(e.seuil_hebdo_minutes, 2100) / H;
    champ('palier').value   = num(e.palier_25_minutes, 480) / H;
    champ('nuit-d').value   = minToTime(num(e.nuit_debut, 1260));
    champ('nuit-f').value   = minToTime(num(e.nuit_fin, 360));
    champ('mentions').value = e.pdf_mentions || '';
}

// Lit et valide les réglages saisis dans le modal.
// -> { ok:true, regles } ou { ok:false, msg }
export function lireReglages() {
    const val = suffixe => champ(suffixe)?.value;
    const trajet  = num(val('trajet'), NaN);
    const seuilH  = parseFloat(val('seuil'));
    const palierH = parseFloat(val('palier'));
    const nuitD   = timeToMin(val('nuit-d'));
    const nuitF   = timeToMin(val('nuit-f'));
    if (!Number.isFinite(trajet) || trajet < 0)  return { ok: false, msg: 'Temps de trajet invalide.' };
    if (!Number.isFinite(seuilH) || seuilH < 0)  return { ok: false, msg: 'Seuil heures supp invalide.' };
    if (!Number.isFinite(palierH) || palierH < 0) return { ok: false, msg: 'Palier +25 % invalide.' };
    if (nuitD == null || nuitF == null)          return { ok: false, msg: 'Plage de nuit invalide.' };
    return { ok: true, regles: {
        trajet_minutes:      trajet,
        seuil_hebdo_minutes: Math.round(seuilH * H),
        palier_25_minutes:   Math.round(palierH * H),
        nuit_debut:          nuitD,
        nuit_fin:            nuitF,
        pdf_mentions:        (val('mentions') || '').trim() || null,
    }};
}

// Lit un fichier image et renvoie une promesse de dataURL base64.
export function lireLogoFichier(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload  = () => resolve(r.result);
        r.onerror = () => reject(new Error('Lecture du logo impossible'));
        r.readAsDataURL(file);
    });
}
