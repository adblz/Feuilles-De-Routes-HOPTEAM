// Câblage des événements DOM de la liste : filtre par période, mode
// sélection (cases à cocher), ouverture des PDF.

import { nomMois } from './periodes_paie.js';
import * as liste from './responsable_liste.js';
import * as selection from './responsable_selection.js';
import { enregistrerSelection, imprimerSelection } from './responsable_export.js';

export function peuplerSelectPeriode() {
    const periodes = liste.periodes();
    const wrapper  = document.getElementById('resp-filtre-periode');
    const select   = document.getElementById('resp-select-periode');
    if (!periodes.length) { wrapper.classList.add('hidden'); return; }
    wrapper.classList.remove('hidden');
    select.innerHTML = periodes.map(p => {
        const nom = nomMois(p);
        return `<option value="${p.id}">${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${p.annee}</option>`;
    }).join('');
    select.value = liste.periodeChoisie()?.id ?? '';
}

function actualiserSemaineDepuisLigne(row) {
    const cbSemaine = row?.closest('.resp-semaine')?.querySelector('.resp-check-semaine');
    if (!cbSemaine) return;
    const statut = selection.statutSemaine(cbSemaine.dataset.ids.split(','));
    cbSemaine.checked = statut === 'toutes';
    cbSemaine.indeterminate = statut === 'partielle';
}

export function cablerFiltreEtSelection() {
    document.getElementById('resp-select-periode')?.addEventListener('change', e => {
        liste.choisirPeriode(e.target.value);
        liste.rendreListe();
    });

    document.getElementById('btn-resp-selection')?.addEventListener('click', () => {
        selection.estActif() ? selection.desactiver() : selection.activer();
        liste.rendreListe();
    });
    document.getElementById('btn-resp-annuler-selection')?.addEventListener('click', () => {
        selection.desactiver();
        liste.rendreListe();
    });
    document.getElementById('btn-resp-enregistrer')?.addEventListener('click', async () => {
        const items = liste.feuillesSelectionnees();
        if (items.length) await enregistrerSelection(items);
        liste.rendreListe();
    });
    document.getElementById('btn-resp-imprimer')?.addEventListener('click', async () => {
        const items = liste.feuillesSelectionnees();
        if (items.length) await imprimerSelection(items);
        liste.rendreListe();
    });
}

export function cablerListe(container) {
    container.addEventListener('change', e => {
        if (e.target.matches('.resp-check-feuille')) {
            selection.toggleFeuille(e.target.dataset.id);
            actualiserSemaineDepuisLigne(e.target.closest('.resp-feuille-row'));
            liste.majBarreSelection();
        } else if (e.target.matches('.resp-check-semaine')) {
            selection.toggleSemaine(e.target.dataset.ids.split(','));
            e.target.closest('.resp-semaine')?.querySelectorAll('.resp-check-feuille').forEach(cb => {
                cb.checked = selection.estSelectionnee(cb.dataset.id);
            });
            liste.majBarreSelection();
        }
    });

    container.addEventListener('click', e => {
        if (e.target.closest('.resp-check-feuille, .resp-check-semaine')) return;
        const header = e.target.closest('.resp-tech-header');
        if (header) {
            const body = header.parentElement.querySelector('.resp-tech-body');
            const chevron = header.querySelector('.resp-chevron');
            body.classList.toggle('hidden');
            chevron.textContent = body.classList.contains('hidden') ? '▼' : '▲';
            return;
        }
        const row = e.target.closest('.resp-feuille-row');
        if (row) liste.ouvrirPdf(row.dataset.pdfId);
    });

    container.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.closest('.resp-check-feuille, .resp-check-semaine')) return;
        const row = e.target.closest('.resp-feuille-row');
        if (!row) return;
        e.preventDefault();
        liste.ouvrirPdf(row.dataset.pdfId);
    });
}
