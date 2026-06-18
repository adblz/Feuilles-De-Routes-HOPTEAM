// ══════════════════════════════════════════════════════════════
//  API — Envoi par email via le serveur backend (Render.com)
// ══════════════════════════════════════════════════════════════

import { validerFormulaire, setBusy, showToast } from './utils.js';
import { preparerPdfElement, nomFichierPdf } from './pdf.js';
import { cfg, openSettings, sauvegarderHistorique } from './app.js';

const API = 'https://feuilles-de-routes-hopteam.onrender.com';

export async function envoyerMail() {
    if (!cfg.email) {
        alert('Veuillez d\'abord configurer l\'email du responsable dans les Paramètres.');
        openSettings();
        return;
    }
    if (typeof html2pdf === 'undefined') {
        alert('La librairie html2pdf ne s\'est pas chargée. Vérifiez votre connexion ou désactivez uBlock.');
        return;
    }

    validerFormulaire();

    // Étape 1 : réveil du serveur Render
    setBusy(true, 'Connexion au serveur…');
    try {
        await fetch(`${API}/ping`, { signal: AbortSignal.timeout(35000) });
    } catch (e) {
        // On tente quand même l'envoi même si le ping a échoué
    }

    // Étape 2 : génération du blob PDF
    setBusy(true, 'Génération du PDF…');
    const { el, opts, nettoyer } = preparerPdfElement();

    setTimeout(async () => {
        try {
            const blob = await html2pdf().set(opts).from(el).outputPdf('blob');
            nettoyer();

            // Étape 3 : envoi
            setBusy(true, 'Envoi de l\'email…');
            const fname = nomFichierPdf();
            const tech  = document.getElementById('technicien').value || 'Technicien';

            const fd = new FormData();
            fd.append('file', blob, fname);
            fd.append('to', cfg.email);
            fd.append('techName', tech);
            if (cfg.techEmail) fd.append('techEmail', cfg.techEmail);

            const res = await fetch(`${API}/send-email`, { method: 'POST', body: fd });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || res.statusText);
            }

            setBusy(false);
            sauvegarderHistorique('email');
            showToast('Email envoyé à ' + cfg.email, 'success', 4000);
        } catch (err) {
            nettoyer();
            setBusy(false);
            alert('Erreur lors de l\'envoi :\n' + (err?.message || err));
        }
    }, 250);
}
