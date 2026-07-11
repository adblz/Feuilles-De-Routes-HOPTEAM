import { validerFormulaire, setBusy, showToast } from '../utils/utils.js';
import { cfg, lireTousLesElements, effacerBrouillon } from './fdr.js';
import { sauvegarderEnBase } from './db.js';
import { memoriserValeurs } from './autocomplete.js';
import { afficherResumeFeuille } from './resume.js';
import { preparerPdfElement, nomFichierPdf } from './pdf_layout.js';

// Re-exports pour api.js et tout autre fichier qui les importe depuis pdf.js
export { preparerPdfElement, nomFichierPdf } from './pdf_layout.js';

export function genererPDF() {
    if (typeof html2pdf === 'undefined') {
        showToast('La librairie PDF ne s\'est pas chargée. Vérifiez votre connexion ou désactivez uBlock, puis rechargez la page (F5).', 'error', 7000);
        return Promise.reject();
    }

    validerFormulaire();
    setBusy(true, 'Génération du PDF en cours…');
    const { el, opts, nettoyer } = preparerPdfElement();

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            html2pdf()
                .set(opts)
                .from(el)
                .outputPdf('blob')
                .then(async (blob) => {
                    nettoyer();

                    const elements = lireTousLesElements();
                    memoriserValeurs(elements);

                    setBusy(true, 'Enregistrement sur le cloud…');
                    try {
                        const feuilleId = await sauvegarderEnBase({
                            date:          document.getElementById('date').value,
                            tech:          document.getElementById('technicien').value || '',
                            company:       cfg.company,
                            contrat:       cfg.contrat,
                            heureDebut:    document.getElementById('heure-debut').value,
                            heureFin:      document.getElementById('heure-fin').value,
                            repasMin:      document.getElementById('repas').value,
                            heuresTravail: document.getElementById('heures-travail').value,
                            heuresSupp:    document.getElementById('heures-supp').value,
                            astreinte:     document.getElementById('astreinte-jour')?.checked,
                            mode:          'pdf',
                            pdfBlob:       blob,
                            pdfFileName:   nomFichierPdf(),
                            elements,
                        });
                        setBusy(false);
                        effacerBrouillon(document.getElementById('date').value);
                        document.dispatchEvent(new CustomEvent('feuille:enregistree'));
                        await afficherResumeFeuille(feuilleId);
                    } catch (e) {
                        console.warn('Supabase save failed:', e);
                        setBusy(false);
                        showToast('L\'enregistrement a échoué : ' + (e?.message || e), 'warn', 9000);
                    }

                    resolve(nomFichierPdf());
                })
                .catch(err => {
                    nettoyer();
                    setBusy(false);
                    showToast('Erreur lors de la génération du PDF : ' + (err?.message || err), 'error', 8000);
                    reject(err);
                });
        }, 250);
    });
}
