import { validerFormulaire, setBusy, showToast } from '../utils/utils.js';
import { preparerPdfElement, nomFichierPdf, blobToBase64 } from '../modules/pdf.js';
import { cfg, lireTousLesElements } from '../modules/fdr.js';
import { openSettings } from '../modules/ui.js';
import { sauvegarderEnBase } from '../modules/db.js';
import { memoriserValeurs } from '../modules/autocomplete.js';
import { getUser } from '../modules/auth.js';

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

    setBusy(true, 'Connexion au serveur…');
    try {
        await fetch(`${API}/ping`, { signal: AbortSignal.timeout(35000) });
    } catch (e) {
        // On tente l'envoi même si le ping a échoué
    }

    setBusy(true, 'Génération du PDF…');
    const { el, opts, nettoyer } = preparerPdfElement();

    setTimeout(async () => {
        try {
            const blob = await html2pdf().set(opts).from(el).outputPdf('blob');
            nettoyer();

            setBusy(true, 'Envoi de l\'email…');
            const fname = nomFichierPdf();
            const tech  = document.getElementById('technicien').value || 'Technicien';

            const fd = new FormData();
            fd.append('file', blob, fname);
            fd.append('to', cfg.email);
            fd.append('techName', tech);
            const techEmail = getUser()?.email;
            if (techEmail) fd.append('techEmail', techEmail);

            const res = await fetch(`${API}/send-email`, { method: 'POST', body: fd });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || res.statusText);
            }

            const elements = lireTousLesElements();
            memoriserValeurs(elements);

            setBusy(true, 'Sauvegarde…');
            try {
                const pdfData = await blobToBase64(blob);
                await sauvegarderEnBase({
                    date:          document.getElementById('date').value,
                    tech,
                    company:       cfg.company,
                    contrat:       cfg.contrat,
                    heureDebut:    document.getElementById('heure-debut').value,
                    heureFin:      document.getElementById('heure-fin').value,
                    repasMin:      document.getElementById('repas').value,
                    heuresTravail: document.getElementById('heures-travail').value,
                    heuresSupp:    document.getElementById('heures-supp').value,
                    mode:          'email',
                    pdfData,
                    elements,
                });
            } catch (e) {
                console.warn('Supabase save failed:', e);
            }

            setBusy(false);
            showToast('Email envoyé à ' + cfg.email, 'success', 4000);
            // Prévient le tableau de bord pour qu'il se rafraîchisse.
            document.dispatchEvent(new CustomEvent('feuille:enregistree'));
        } catch (err) {
            nettoyer();
            setBusy(false);
            alert('Erreur lors de l\'envoi :\n' + (err?.message || err));
        }
    }, 250);
}
