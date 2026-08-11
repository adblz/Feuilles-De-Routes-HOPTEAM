// Bouton « Télécharger le PDF du mois » de l'écran Heures : reprend la période
// affichée à l'écran (mois du planning ou dates personnalisées), va chercher
// les feuilles correspondantes et déclenche le téléchargement.
// Ce PDF n'est PAS enregistré en base : c'est un export à la demande.

import { showToast, setBusy } from '../utils/utils.js';
import { chargerMoisDetail } from './db_recap.js';
import { periodeAffichee } from './heures_history.js';
import { construireRecapMois, nomFichierRecap, titrePeriode } from './pdf_mois.js';
import { ajouterRappelPages } from './pdf_pages.js';

const MARGIN_MM   = 8;
const CONTENT_PX  = Math.floor((210 - 2 * MARGIN_MM) * 96 / 25.4);   // A4 portrait à 96 dpi

function preparerElement(html) {
    const el = document.createElement('div');
    el.className     = 'pdf-wrap';
    el.style.cssText = `position:absolute;top:0;left:0;width:${CONTENT_PX}px;background:white;`;
    el.innerHTML     = html;
    document.body.appendChild(el);
    return el;
}

function optionsPdf(largeur, filename) {
    return {
        margin:      [MARGIN_MM, MARGIN_MM, MARGIN_MM, MARGIN_MM],
        filename,
        image:       { type: 'jpeg', quality: 0.97 },
        html2canvas: {
            scale: 2, useCORS: true, logging: false,
            backgroundColor: '#ffffff',
            width: largeur, windowWidth: largeur,
            scrollX: 0, scrollY: 0, x: 0, y: 0,
            onclone(doc) {
                const overlay = doc.getElementById('loading-overlay');
                if (overlay) overlay.style.display = 'none';
                // Le récap est généré alors que la fenêtre « Heures supp. » est
                // ouverte : on la masque dans la copie pour qu'elle ne puisse
                // pas se retrouver dessinée sur le document.
                doc.querySelectorAll('.modal-overlay').forEach(m => { m.style.display = 'none'; });
            },
        },
        jsPDF:     { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-mois-jour', '.pdf-mois-item', 'tr'] },
    };
}

async function fabriquerPdf(el, opts, entete) {
    const worker = html2pdf().set(opts).from(el);
    await worker.toContainer();
    // La hauteur réelle change une fois les sauts de page insérés : on la
    // remesure pour que la capture ne coupe pas le bas du document.
    const hReel = worker.prop.container.scrollHeight;
    worker.opt.html2canvas.height       = hReel;
    worker.opt.html2canvas.windowHeight = hReel;
    await worker.toCanvas();
    await worker.toImg();
    await worker.toPdf();
    ajouterRappelPages(worker.prop.pdf, entete, 'Récapitulatif');
    return worker.outputPdf('blob');
}

// Téléchargement via un lien : fonctionne sur ordinateur comme sur iPhone
// (le fichier part dans « Fichiers » / la feuille de partage).
function telecharger(blob, filename) {
    const url  = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href     = url;
    lien.download = filename;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function telechargerRecapPdf() {
    if (typeof html2pdf === 'undefined') {
        showToast('La librairie PDF ne s\'est pas chargée. Rechargez la page (F5).', 'error', 7000);
        return;
    }

    const { debut, fin, titre } = periodeAffichee();
    if (!debut || !fin) { showToast('Choisissez d\'abord une période.', 'warn'); return; }
    if (debut > fin)    { showToast('La date de début est après la date de fin.', 'warn'); return; }

    setBusy(true, 'Préparation du récapitulatif…');
    let el = null;
    try {
        const feuilles = await chargerMoisDetail(debut, fin);
        if (!feuilles.length) {
            setBusy(false);
            showToast('Aucune feuille de route sur cette période.', 'warn', 4000);
            return;
        }

        setBusy(true, 'Génération du PDF en cours…');
        const tech = feuilles.find(f => f.tech)?.tech || '';
        const filename = nomFichierRecap(debut, fin, tech);
        el = preparerElement(construireRecapMois(feuilles, debut, fin, titre));
        const opts = optionsPdf(el.offsetWidth || CONTENT_PX, filename);

        const blob = await fabriquerPdf(el, opts, { dateAff: titre || titrePeriode(debut, fin), tech });
        telecharger(blob, filename);

        setBusy(false);
        showToast('Récapitulatif téléchargé', 'success', 3000);
    } catch (e) {
        setBusy(false);
        showToast('Erreur lors de la génération : ' + (e?.message || e), 'error', 8000);
    } finally {
        if (el && document.body.contains(el)) document.body.removeChild(el);
    }
}
