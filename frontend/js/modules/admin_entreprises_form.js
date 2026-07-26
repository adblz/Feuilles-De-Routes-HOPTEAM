// Bloc « réglages » d'une entreprise dans l'admin : logo, règles de calcul
// d'heures (trajet, seuil hebdo, palier +25 %, plage de nuit) et mentions PDF.
// Séparé de admin_entreprises_gestion.js pour respecter la limite de 150 lignes.

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

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// HTML du bloc réglages pour une entreprise `e` (heures affichées en heures,
// stockées en minutes ; plage de nuit affichée en heures, stockée en minutes).
export function blocReglages(e) {
    const trajet   = num(e.trajet_minutes, 60);
    const seuilH   = num(e.seuil_hebdo_minutes, 2100) / H;
    const palierH  = num(e.palier_25_minutes, 480) / H;
    const nuitD    = minToTime(num(e.nuit_debut, 1260));
    const nuitF    = minToTime(num(e.nuit_fin, 360));
    const logo     = e.logo_b64 || '';
    const mentions = e.pdf_mentions || '';
    return `
        <div class="ent-row-regles">
            <div class="ent-logo">
                <img class="ent-logo-apercu" src="${logo}" alt=""${logo ? '' : ' style="display:none"'}>
                <label class="ent-logo-btn">Choisir un logo…<input type="file" accept="image/*" class="ent-logo-input" hidden></label>
                ${logo ? '<button class="ent-logo-suppr" data-action="logo-suppr" type="button">Retirer</button>' : ''}
            </div>
            <label class="ent-champ">Trajet retiré <input type="number" min="0" step="15" class="ent-inp ent-f-trajet" value="${trajet}"> min/j</label>
            <label class="ent-champ">Seuil supp/sem <input type="number" min="0" step="0.5" class="ent-inp ent-f-seuil" value="${seuilH}"> h</label>
            <label class="ent-champ">Palier +25 % <input type="number" min="0" step="0.5" class="ent-inp ent-f-palier" value="${palierH}"> h</label>
            <label class="ent-champ">Nuit de <input type="time" class="ent-inp-time ent-f-nuit-d" value="${nuitD}"> à <input type="time" class="ent-inp-time ent-f-nuit-f" value="${nuitF}"></label>
            <label class="ent-champ ent-champ-mentions">Mentions PDF
                <textarea class="ent-inp-mentions ent-f-mentions" rows="2" placeholder="Texte affiché en bas du PDF (optionnel)">${esc(mentions)}</textarea>
            </label>
            <button class="ent-row-save" data-action="save-reglages" type="button">Enregistrer les réglages</button>
        </div>`;
}

// Lit et valide les réglages saisis dans une ligne.
// -> { ok:true, regles } ou { ok:false, msg }
export function lireReglages(row) {
    const val = sel => row.querySelector(sel)?.value;
    const trajet  = num(val('.ent-f-trajet'), NaN);
    const seuilH  = parseFloat(val('.ent-f-seuil'));
    const palierH = parseFloat(val('.ent-f-palier'));
    const nuitD   = timeToMin(val('.ent-f-nuit-d'));
    const nuitF   = timeToMin(val('.ent-f-nuit-f'));
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
        pdf_mentions:        (val('.ent-f-mentions') || '').trim() || null,
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
