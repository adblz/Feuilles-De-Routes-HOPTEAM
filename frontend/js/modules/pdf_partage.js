import { chargerPdfFeuille } from './db.js';
import { showToast } from '../utils/utils.js';
import { nomFichierPdf } from './pdf_layout.js';

export async function partagerPdfFeuille(feuilleId, nomFichier) {
    if (!navigator.share) {
        showToast('Le partage n\'est pas disponible sur cet appareil', 'warn', 4000);
        return;
    }

    try {
        const url = await chargerPdfFeuille(feuilleId);
        if (!url) {
            showToast('Aucun PDF disponible', 'warn');
            return;
        }

        const reponse = await fetch(url);
        const blob = await reponse.blob();
        const fichier = new File([blob], nomFichier || nomFichierPdf(), { type: 'application/pdf' });

        if (!navigator.canShare?.({ files: [fichier] })) {
            showToast('Le partage de fichier n\'est pas disponible sur cet appareil', 'warn', 4000);
            return;
        }

        await navigator.share({ files: [fichier], title: 'Feuille de route' });
    } catch (e) {
        if (e?.name === 'AbortError') return;
        showToast('Impossible de partager le PDF', 'error');
    }
}
