// Onglet « Heures supp » de la page responsable : récap par technicien des
// heures supp déclarées et validées sur la période choisie.

import * as liste from './responsable_liste.js';
import * as validations from './responsable_validations.js';
import { grouperParTech } from './responsable_render.js';
import { renderHeures } from './responsable_heures_render.js';

let _onOuvrir = null;

function capturerOuverts(container) {
    return new Set([...container.querySelectorAll('.heures-tech-card')]
        .filter(c => !c.querySelector('.heures-tech-body')?.classList.contains('hidden'))
        .map(c => c.dataset.uid));
}

export function rendreHeures() {
    const container = document.getElementById('resp-heures-list');
    const ouverts = capturerOuverts(container);
    const ctx = {
        validationPour: validations.validationPour,
        estObsolete: validations.estObsolete,
        contratPour: liste.contratPour,
    };
    // Semaines entières de la période : chaque semaine est calculée en entier
    // et comptée dans la période où tombe son dimanche.
    const techMap = grouperParTech(liste.feuillesSemainesPeriode(), liste.profilsTechs());
    container.innerHTML = renderHeures(techMap, ctx, liste.periodeEffective());
    container.querySelectorAll('.heures-tech-card').forEach(c => {
        if (!ouverts.has(c.dataset.uid)) return;
        c.querySelector('.heures-tech-body').classList.remove('hidden');
        c.querySelector('.resp-chevron').textContent = '▲';
    });
}

// onOuvrir(id) : ouverture de la vue numérique d'une feuille.
export function initHeures({ onOuvrir }) {
    _onOuvrir = onOuvrir;
    document.getElementById('resp-heures-list').addEventListener('click', e => {
        const btn = e.target.closest('.btn-heures-ouvrir');
        if (btn) { _onOuvrir(btn.dataset.id); return; }
        const header = e.target.closest('.heures-tech-header');
        if (!header) return;
        const body = header.parentElement.querySelector('.heures-tech-body');
        body.classList.toggle('hidden');
        header.querySelector('.resp-chevron').textContent = body.classList.contains('hidden') ? '▼' : '▲';
    });
}
