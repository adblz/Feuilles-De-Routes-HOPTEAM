// Enregistrement / impression d'une sélection de feuilles (nouvelle
// fonctionnalité — un PDF déjà généré par technicien, un fichier ou une
// boîte d'impression par feuille, pas de fusion).

import { chargerPdfResponsable } from './db_responsable.js';
import { marquerVue } from './responsable_vues.js';
import { showToast } from '../utils/utils.js';

function nomFichier(f) {
    const tech = (f.tech || 'feuille').replace(/[^\w-]+/g, '_');
    return `${tech}_${f.date || 'sans-date'}.pdf`;
}

async function recupererBlob(id) {
    const url = await chargerPdfResponsable(id);
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.blob();
}

// Le PDF vient d'une autre adresse (stockage Supabase) : sans passer par un
// blob local, le navigateur ne le télécharge pas, il navigue directement
// dessus (c'est ce qui s'est produit). Le blob est donc nécessaire ici.
async function telechargerUnePdf(f) {
    const blob = await recupererBlob(f.id);
    if (!blob) return false;
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = nomFichier(f);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
    return true;
}

export async function enregistrerSelection(feuilles) {
    let ok = 0;
    for (const f of feuilles) {
        try {
            if (await telechargerUnePdf(f)) { marquerVue(f.id); ok++; }
        } catch { /* on continue avec les feuilles suivantes */ }
        await new Promise(r => setTimeout(r, 300)); // évite le blocage « téléchargements multiples » du navigateur
    }
    showToast(ok ? `${ok} PDF téléchargé${ok > 1 ? 's' : ''}` : 'Aucun PDF disponible', ok ? 'success' : 'warn', 3000);
}

// Ouvre chaque PDF dans un nouvel onglet : le responsable clique lui-même
// sur « Imprimer » dans la visionneuse du navigateur. Déclencher
// l'impression automatiquement (via un iframe caché) plantait sur Firefox :
// son lecteur PDF intégré est protégé et ne peut pas être piloté depuis la
// page, quelle que soit la présence d'une imprimante.
export async function imprimerSelection(feuilles) {
    // Toutes les adresses sont récupérées d'abord, puis les onglets sont
    // ouverts d'un coup juste après : plus proche du clic, ça évite que le
    // navigateur bloque les ouvertures suivantes comme des pop-up.
    const urls = await Promise.all(feuilles.map(f => chargerPdfResponsable(f.id).catch(() => null)));

    let ok = 0;
    feuilles.forEach((f, i) => {
        if (!urls[i]) return;
        window.open(urls[i], '_blank', 'noopener');
        marquerVue(f.id);
        ok++;
    });

    showToast(
        ok ? `${ok} PDF ouvert${ok > 1 ? 's' : ''} dans un nouvel onglet — imprimez depuis chaque onglet` : 'Aucun PDF disponible',
        ok ? 'success' : 'warn',
        4000
    );
}
