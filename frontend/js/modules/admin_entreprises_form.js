// Champs « réglages » d'une entreprise dans le modal d'édition : règles de calcul
// d'heures (trajet, plage de nuit) et mentions PDF. Le seuil d'heures supp et
// le palier +25 % ne se règlent plus ici : ils découlent du contrat de chaque
// technicien (voir seuil_jour.js).
// Séparé de admin_entreprises_modal.js pour respecter la limite de 150 lignes.

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

// Remplit les champs du modal avec les réglages de l'entreprise `e`
// (plage de nuit affichée en heures:minutes, stockée en minutes).
export function remplirReglages(e) {
    champ('trajet').value   = num(e.trajet_minutes, 60);
    champ('nuit-d').value   = minToTime(num(e.nuit_debut, 1260));
    champ('nuit-f').value   = minToTime(num(e.nuit_fin, 360));
    champ('mentions').value = e.pdf_mentions || '';
    champ('mois-cal').checked = !!e.mois_calendaire;
}

// Lit et valide les réglages saisis dans le modal.
// -> { ok:true, regles } ou { ok:false, msg }
export function lireReglages() {
    const val = suffixe => champ(suffixe)?.value;
    const trajet  = num(val('trajet'), NaN);
    const nuitD   = timeToMin(val('nuit-d'));
    const nuitF   = timeToMin(val('nuit-f'));
    if (!Number.isFinite(trajet) || trajet < 0)  return { ok: false, msg: 'Temps de trajet invalide.' };
    if (nuitD == null || nuitF == null)          return { ok: false, msg: 'Plage de nuit invalide.' };
    return { ok: true, regles: {
        trajet_minutes:      trajet,
        nuit_debut:          nuitD,
        nuit_fin:            nuitF,
        pdf_mentions:        (val('mentions') || '').trim() || null,
        mois_calendaire:     !!champ('mois-cal')?.checked,   // onglet Heures : mois calendaire au lieu du planning
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
