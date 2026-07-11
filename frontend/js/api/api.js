import { validerFormulaire, setBusy, showToast } from '../utils/utils.js';
import { preparerPdfElement, nomFichierPdf } from '../modules/pdf.js';
import { cfg, lireTousLesElements, effacerBrouillon } from '../modules/fdr.js';
import { openSettings } from '../modules/ui.js';
import { sauvegarderEnBase } from '../modules/db.js';
import { memoriserValeurs } from '../modules/autocomplete.js';
import { getUser, getSession } from '../modules/auth.js';

const API = 'https://feuilles-de-routes-hopteam.onrender.com';

export async function envoyerMail() {
    if (!cfg.email) {
        showToast('Veuillez d\'abord configurer l\'email du responsable dans les Paramètres.', 'warn', 5000);
        openSettings();
        return;
    }
    if (typeof html2pdf === 'undefined') {
        showToast('La librairie PDF ne s\'est pas chargée. Vérifiez votre connexion ou désactivez uBlock.', 'error', 6000);
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

            const token = getSession()?.access_token;
            const res = await fetch(`${API}/send-email`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: fd,
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || res.statusText);
            }

            const elements = lireTousLesElements();
            memoriserValeurs(elements);

            setBusy(true, 'Sauvegarde…');
            let saveError = null;
            try {
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
                    astreinte:     document.getElementById('astreinte-jour')?.checked,
                    mode:          'email',
                    pdfBlob:     blob,
                    pdfFileName: nomFichierPdf(),
                    elements,
                });
            } catch (e) {
                console.warn('Supabase save failed:', e);
                saveError = e;
            }

            setBusy(false);
            if (saveError) {
                showToast('Email envoyé, mais enregistrement échoué : ' + (saveError?.message || saveError), 'warn', 9000);
            } else {
                showToast('Email envoyé à ' + cfg.email, 'success', 5000);
            }
            effacerBrouillon(document.getElementById('date').value);
            document.dispatchEvent(new CustomEvent('feuille:enregistree'));
        } catch (err) {
            nettoyer();
            setBusy(false);
            showToast('Erreur lors de l\'envoi : ' + (err?.message || err), 'error', 8000);
        }
    }, 250);
}
