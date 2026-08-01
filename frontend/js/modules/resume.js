import { chargerPdfFeuille, supprimerFeuille } from './db.js';
import { detailFeuille } from './resume_cache.js';
import { remplirFormulaireDepuisFeuille } from './fdr_charger.js';
import { showToast } from '../utils/utils.js';
import { afficherDashboard } from './dashboard.js';
import { partagerPdfFeuille } from './pdf_partage.js';
import { nomFichierPdf } from './pdf_layout.js';
import { buildResumeHTML } from './resume_render.js';
import { montrerInfoBloc } from './heures_tooltip.js';

let friseInit = false;

export function cacherResume() {
    document.getElementById('vue-resume')?.classList.add('hidden');
}

// Sur téléphone l'infobulle « title » ne s'affiche pas : un appui sur un bloc de
// la frise ouvre une bulle ancrée dessus. Posé une seule fois sur le conteneur,
// qui lui n'est jamais recréé.
function activerFrise() {
    if (friseInit) return;
    friseInit = true;
    document.getElementById('resume-content')?.addEventListener('click', e => {
        const bloc = e.target.closest('.heures-bloc');
        if (bloc?.dataset.info) montrerInfoBloc(bloc, bloc.dataset.info);
    });
}

export async function afficherResumeFeuille(feuilleId) {
    try {
        const { feuille, elements } = await detailFeuille(feuilleId);
        document.getElementById('vue-dashboard').classList.add('hidden');
        document.getElementById('vue-formulaire').classList.add('hidden');
        document.getElementById('vue-heures')?.classList.add('hidden');
        document.getElementById('resume-content').innerHTML = buildResumeHTML(feuille, elements);
        document.getElementById('vue-resume').classList.remove('hidden');
        activerFrise();
        window.scrollTo(0, 0);
        // Le detail sert à resume_nav.js pour savoir d'où partir au glissement
        document.dispatchEvent(new CustomEvent('nav:resume', { detail: { feuilleId } }));

        document.getElementById('btn-resume-envoyer')?.addEventListener('click', () => {
            partagerPdfFeuille(feuilleId, nomFichierPdf(feuille.tech, feuille.date));
        });

        document.getElementById('btn-resume-pdf')?.addEventListener('click', async () => {
            const win = window.open('', '_blank');
            try {
                const url = await chargerPdfFeuille(feuilleId);
                if (!url) { win?.close(); showToast('Aucun PDF disponible', 'warn'); return; }
                if (win) win.location.href = url;
                else window.open(url, '_blank');
            } catch {
                win?.close();
                showToast('Impossible de charger le PDF', 'error');
            }
        });

        document.getElementById('btn-resume-modifier')?.addEventListener('click', () => {
            remplirFormulaireDepuisFeuille(feuille, elements);
            document.getElementById('vue-resume')?.classList.add('hidden');
            document.getElementById('vue-dashboard')?.classList.add('hidden');
            document.getElementById('vue-heures')?.classList.add('hidden');
            document.getElementById('vue-formulaire')?.classList.remove('hidden');
            window.scrollTo(0, 0);
            document.dispatchEvent(new CustomEvent('nav:formulaire'));
            showToast('Vous pouvez compléter la feuille, puis la renvoyer', 'success', 3500);
        });

        document.getElementById('btn-resume-supprimer')?.addEventListener('click', async () => {
            if (!confirm('Supprimer définitivement cette feuille de route ?')) return;
            try {
                await supprimerFeuille(feuilleId);
                showToast('Feuille supprimée', 'success', 3000);
                document.dispatchEvent(new CustomEvent('feuille:supprimee'));
                afficherDashboard();
            } catch {
                showToast('Erreur lors de la suppression', 'error');
            }
        });
    } catch {
        showToast('Erreur lors du chargement du résumé', 'error');
    }
}
