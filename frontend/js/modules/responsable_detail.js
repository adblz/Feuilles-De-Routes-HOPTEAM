// Vue numérique d'une feuille (modale #modal-detail) : chargement, rendu,
// bouton PDF, validation des heures supp.

import { chargerDetailFeuilleResponsable, chargerPdfResponsable } from './db_responsable.js';
import { enregistrerValidation, supprimerValidation } from './db_validations.js';
import * as validations from './responsable_validations.js';
import { renderDetail, formatDateLong } from './responsable_detail_render.js';
import { montrerInfoBloc } from './heures_tooltip.js';
import { afficherPdfUrl } from './pdfviewer.js';
import { marquerVue } from './responsable_vues.js';
import { showToast, normaliserDuree, parseDuree, escHtml } from '../utils/utils.js';
import { contratPour } from './responsable_liste.js';

let _onChange = null;      // appelé après toute validation (re-rendu des onglets)
let _feuille = null;
let _elements = [];

const modal = () => document.getElementById('modal-detail');
const body  = () => document.getElementById('detail-body');

function fermer() {
    modal().classList.remove('open');
    _feuille = null;
}

function rendre() {
    const v = validations.validationPour(_feuille);
    body().innerHTML = renderDetail(_feuille, _elements, v, validations.estObsolete(_feuille, v));
}

// Le responsable valide les HEURES TRAVAILLÉES du jour ; les heures supp de
// la semaine se recalculent ensuite sur ces valeurs (onglet Heures supp).
async function valider() {
    const saisie = normaliserDuree(document.getElementById('detail-supp-validees').value);
    if (!saisie.ok) { showToast('Format attendu : 8h30, 7h, 9h15…', 'warn'); return; }
    const commentaire = document.getElementById('detail-commentaire').value;
    try {
        const v = await enregistrerValidation({
            user_id: _feuille.user_id,
            date: _feuille.date,
            company: _feuille.company,
            heures_validees_min: parseDuree(saisie.value),
            commentaire,
        });
        validations.majValidation(v);
        showToast(`${saisie.value} travaillées validées pour le ${formatDateLong(_feuille.date)}`, 'success');
        rendre();
        _onChange?.();
    } catch (e) {
        showToast('Erreur : ' + e.message, 'error');
    }
}

async function annulerValidation() {
    if (!confirm('Retirer la validation de cette journée ?')) return;
    try {
        await supprimerValidation(_feuille.user_id, _feuille.date);
        validations.retirerValidation(_feuille.user_id, _feuille.date);
        showToast('Validation retirée', 'success');
        rendre();
        _onChange?.();
    } catch (e) {
        showToast('Erreur : ' + e.message, 'error');
    }
}

async function voirPdf() {
    try {
        const url = await chargerPdfResponsable(_feuille.id);
        if (!url) { showToast('PDF non disponible pour cette feuille', 'warn', 3500); return; }
        await afficherPdfUrl(url);
    } catch {
        showToast('Erreur lors du chargement du PDF', 'error');
    }
}

export async function ouvrirDetail(id) {
    body().innerHTML = '<div class="resp-loading">Chargement…</div>';
    document.getElementById('detail-titre').textContent = 'Feuille de route';
    modal().classList.add('open');
    try {
        const { feuille, elements } = await chargerDetailFeuilleResponsable(id);
        if (!feuille) { showToast('Feuille introuvable', 'warn'); fermer(); return; }
        _feuille = feuille;
        _feuille.contratProfil = contratPour(feuille);   // repli si la feuille n'a pas de contrat
        _elements = elements;
        document.getElementById('detail-titre').innerHTML = `${escHtml(feuille.tech || '')} <span class="detail-tag">${escHtml(feuille.company || '')}</span>`;
        rendre();
        marquerVue(id);
        _onChange?.();
    } catch (e) {
        body().innerHTML = `<div class="resp-loading">Erreur de chargement : ${escHtml(e.message)}</div>`;
    }
}

export function initDetail({ onChange }) {
    _onChange = onChange;
    document.getElementById('btn-close-detail').addEventListener('click', fermer);
    modal().addEventListener('click', e => { if (e.target === modal()) fermer(); });

    body().addEventListener('click', e => {
        const bloc = e.target.closest('.heures-bloc');
        if (bloc) { montrerInfoBloc(bloc, bloc.dataset.info || ''); return; }
        if (e.target.closest('#btn-detail-valider')) valider();
        else if (e.target.closest('#btn-detail-annuler-validation')) annulerValidation();
        else if (e.target.closest('#btn-detail-pdf')) voirPdf();
    });
    body().addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.id === 'detail-supp-validees') valider();
    });
}
