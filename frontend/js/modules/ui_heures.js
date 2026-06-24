import { parseDuree, affH } from '../utils/utils.js';
import { chargerHeuresSupp } from './db.js';
import { fermerTousLesModals } from './ui_settings.js';

export function ouvrirSuppRecap() {
    fermerTousLesModals();
    const today        = new Date().toISOString().split('T')[0];
    const firstOfMonth = today.slice(0, 8) + '01';
    document.getElementById('supp-date-debut').value = firstOfMonth;
    document.getElementById('supp-date-fin').value   = today;
    document.getElementById('supp-result').innerHTML = '';
    document.getElementById('modal-supp').classList.add('open');
}

export async function calculerSuppRecap() {
    const debut  = document.getElementById('supp-date-debut').value;
    const fin    = document.getElementById('supp-date-fin').value;
    const result = document.getElementById('supp-result');
    result.innerHTML = '<div>Calcul en cours…</div>';

    let histo;
    try {
        histo = await chargerHeuresSupp(debut, fin);
    } catch {
        result.innerHTML = '<div class="supp-empty">Erreur de chargement. Vérifiez votre connexion.</div>';
        return;
    }

    if (!histo.length) {
        result.innerHTML = '<div class="supp-empty">Aucune feuille de route sur cette période.</div>';
        return;
    }

    let totalMin = 0;
    histo.forEach(e => { totalMin += parseDuree(e.heures_supp); });

    const avecSupp  = histo.filter(e => parseDuree(e.heures_supp) > 0);
    const tableHtml = avecSupp.length ? `
        <table class="supp-table">
            <thead><tr><th>Date</th><th>Technicien</th><th>Supp.</th></tr></thead>
            <tbody>${avecSupp.map(e => {
                const dateAff = new Date(e.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                return `<tr><td>${dateAff}</td><td>${e.tech || '—'}</td><td class="supp-td-val">${affH(parseDuree(e.heures_supp))}</td></tr>`;
            }).join('')}</tbody>
        </table>` : '<p class="supp-no-supp">Aucune heure supplémentaire sur cette période.</p>';

    result.innerHTML = `
        <div class="supp-total-block">
            <div class="supp-total-label">Total heures supp.</div>
            <div class="supp-total">${affH(totalMin)}</div>
            <div class="supp-total-sub">${histo.length} feuille${histo.length > 1 ? 's' : ''} sur la période</div>
        </div>
        ${tableHtml}`;
}
