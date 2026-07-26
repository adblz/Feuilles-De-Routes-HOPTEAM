// Migration unique : l'ancienne clé "fdr_brouillon" devient "fdr_brouillon_AAAA-MM-JJ".
(function() {
    const ancien = localStorage.getItem('fdr_brouillon');
    if (!ancien) return;
    try {
        const d = JSON.parse(ancien);
        if (d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
            const newKey = `fdr_brouillon_${d.date}`;
            if (!localStorage.getItem(newKey)) localStorage.setItem(newKey, ancien);
        }
    } catch (e) {}
    localStorage.removeItem('fdr_brouillon');
})();

// ── Logo ───────────────────────────────────────────────────────

const LOGO_B64 = 'data:image/png;base64,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';

// Logo affiché dans l'app et sur le PDF : celui de l'entreprise du technicien
// (chargé depuis Supabase à la connexion). À défaut, logo HopTeam par défaut.
export function getLogoBase64() {
    return cfg.logoB64 || LOGO_B64;
}

// Logo HopTeam par défaut, affiché sur l'écran de connexion pour tout le monde
// (avant connexion, on ne connaît pas encore l'entreprise de l'utilisateur).
export function getLogoDefaut() {
    return LOGO_B64;
}

// ── Configuration ──────────────────────────────────────────────

function normInt(val, def) {
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : def;
}

export let cfg = {
    company: localStorage.getItem('cfg_company') || '',
    email:   localStorage.getItem('cfg_email')   || '',
    contrat: localStorage.getItem('cfg_contrat') || '39',
    // ── Config de l'entreprise (lue à la connexion depuis Supabase, mémorisée
    //    en localStorage pour fonctionner hors-ligne / au rechargement) ──
    logoB64:           localStorage.getItem('cfg_logo_b64') || '',      // logo entreprise (base64) ; vide = logo HopTeam
    trajetMinutes:     normInt(localStorage.getItem('cfg_trajet_minutes'), 60),   // trajet retiré/jour
    seuilHebdoMinutes: normInt(localStorage.getItem('cfg_seuil_hebdo'), 2100),    // seuil heures supp/semaine (35 h)
    palier25Minutes:   normInt(localStorage.getItem('cfg_palier_25'), 480),       // 8 premières h supp à +25 %
    nuitDebut:         normInt(localStorage.getItem('cfg_nuit_debut'), 1260),     // début plage nuit (21 h en min)
    nuitFin:           normInt(localStorage.getItem('cfg_nuit_fin'), 360),        // fin plage nuit (6 h en min)
    pdfMentions:       localStorage.getItem('cfg_pdf_mentions') || '',            // mentions pied de PDF
};

// Mémorise le temps de trajet de l'entreprise (lu à la connexion depuis Supabase).
export function setTrajetMinutes(min) {
    cfg.trajetMinutes = normInt(min, 60);
    localStorage.setItem('cfg_trajet_minutes', String(cfg.trajetMinutes));
}

// Mémorise TOUTE la config de l'entreprise (ligne de la table `entreprises`).
// `regles` peut être null (entreprise inconnue) : on garde alors les défauts.
export function setReglesEntreprise(regles) {
    if (!regles) return;
    setTrajetMinutes(regles.trajet_minutes);
    cfg.logoB64           = regles.logo_b64 || '';
    cfg.seuilHebdoMinutes = normInt(regles.seuil_hebdo_minutes, 2100);
    cfg.palier25Minutes   = normInt(regles.palier_25_minutes, 480);
    cfg.nuitDebut         = normInt(regles.nuit_debut, 1260);
    cfg.nuitFin           = normInt(regles.nuit_fin, 360);
    cfg.pdfMentions       = regles.pdf_mentions || '';
    localStorage.setItem('cfg_logo_b64',    cfg.logoB64);
    localStorage.setItem('cfg_seuil_hebdo', String(cfg.seuilHebdoMinutes));
    localStorage.setItem('cfg_palier_25',   String(cfg.palier25Minutes));
    localStorage.setItem('cfg_nuit_debut',  String(cfg.nuitDebut));
    localStorage.setItem('cfg_nuit_fin',    String(cfg.nuitFin));
    localStorage.setItem('cfg_pdf_mentions', cfg.pdfMentions);
}

export function saveCfg(company, email, contrat) {
    cfg.company = company;
    cfg.email   = email;
    cfg.contrat = contrat;
    localStorage.setItem('cfg_company', cfg.company);
    localStorage.setItem('cfg_email',   cfg.email);
    localStorage.setItem('cfg_contrat', cfg.contrat);
}
