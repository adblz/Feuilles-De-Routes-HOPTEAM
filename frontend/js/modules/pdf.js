import { validerFormulaire, setBusy, showToast } from '../utils/utils.js';
import { cfg, lireTousLesElements, effacerBrouillon } from './fdr.js';
import { sauvegarderEnBase } from './db.js';
import { marquerClientsFaits } from './db_clients.js';
import { memoriserValeurs } from './autocomplete.js';
import { afficherResumeFeuille } from './resume.js';
import { preparerPdfElement, nomFichierPdf, infosEntete } from './pdf_layout.js';
import { ajouterRappelPages } from './pdf_pages.js';

// Re-exports pour api.js et tout autre fichier qui les importe depuis pdf.js
export { preparerPdfElement, nomFichierPdf } from './pdf_layout.js';

export function genererPDF() {
    if (typeof html2pdf === 'undefined') {
        showToast('La librairie PDF ne s\'est pas chargée. Vérifiez votre connexion ou désactivez uBlock, puis rechargez la page (F5).', 'error', 7000);
        return Promise.reject();
    }

    if (!validerFormulaire()) {
        return Promise.reject();
    }
    setBusy(true, 'Génération du PDF en cours…');
    const { el, opts, nettoyer } = preparerPdfElement();

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const worker = html2pdf().set(opts).from(el);

            worker
                // La hauteur de el peut changer une fois les sauts de page insérés
                // (une intervention poussée sur la page suivante) : on la remesure ici
                // pour que la capture ne coupe pas ce contenu supplémentaire.
                .toContainer()
                .then(() => {
                    const hReel = worker.prop.container.scrollHeight;
                    worker.opt.html2canvas.height       = hReel;
                    worker.opt.html2canvas.windowHeight = hReel;
                })
                .then(() => worker.toCanvas())
                .then(() => worker.toImg())
                .then(() => worker.toPdf())
                // Rappel date + technicien en haut des pages 2, 3… (lit le
                // formulaire, donc avant tout nettoyage).
                .then(() => ajouterRappelPages(worker.prop.pdf, infosEntete()))
                .then(() => worker.outputPdf('blob'))
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
                        // Clients venus du planning : marqués « faits » (ils sortent du listing).
                        // Un échec ici ne remet pas en cause l'enregistrement de la feuille.
                        // (planningId = ids des postes du client, séparés par des virgules)
                        const idsClients = elements.filter(e => e.kind === 'intervention' && e.planningId)
                            .flatMap(e => String(e.planningId).split(',').filter(Boolean));
                        if (idsClients.length) {
                            try { await marquerClientsFaits(idsClients, feuilleId, document.getElementById('date').value); }
                            catch (e) {
                                console.warn('Marquage clients échoué :', e);
                                showToast('Feuille enregistrée, mais les clients n\'ont pas pu être marqués comme faits', 'warn', 6000);
                            }
                        }
                        setBusy(false);
                        showToast('PDF enregistré dans l\'historique', 'success', 3000);
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
