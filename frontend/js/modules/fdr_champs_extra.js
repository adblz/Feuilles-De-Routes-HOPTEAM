// Champs conditionnels d'une carte d'intervention, selon les prestations cochées :
//   Nombre de becs     → Bière · Sanitation
//   Nombre de groupes  → Café · Joint-douchette (boutons 1 à 4, un seul choix)
//   Main d'œuvre       → une par métier, quand ce métier a un Dépannage
// Un champ masqué est vidé, pour ne pas enregistrer une valeur invisible.
import { METIERS, colonneMo, afficheBecs, afficheGroupes, afficheMo } from './prestations.js';
import { notifierChangement } from './fdr_liste.js';

const boutonsGroupes = card => Array.from(card.querySelectorAll('.groupe-btn'));

export function lireGroupes(card) {
    return boutonsGroupes(card).find(b => b.classList.contains('active'))?.dataset.value || '';
}

export function poserGroupes(card, valeur) {
    boutonsGroupes(card).forEach(b => b.classList.toggle('active', b.dataset.value === String(valeur || '')));
}

// Un seul bouton actif ; re-cliquer le bouton actif le désélectionne.
export function brancherGroupes(card) {
    boutonsGroupes(card).forEach(btn => {
        btn.addEventListener('click', () => {
            const etaitActif = btn.classList.contains('active');
            poserGroupes(card, etaitActif ? '' : btn.dataset.value);
            notifierChangement();
        });
    });
}

// `liste` : prestations cochées de la carte, au format [{ metier, presta }].
// Affiche ou masque (et vide) un champ simple : #i{n}-{cle}-group / #i{n}-{cle}.
function basculerChamp(n, cle, visible) {
    document.getElementById(`i${n}-${cle}-group`)?.classList.toggle('hidden', !visible);
    if (!visible) {
        const el = document.getElementById(`i${n}-${cle}`);
        if (el) el.value = '';
    }
}

export function majChampsExtra(n, card, liste) {
    const becs    = afficheBecs(liste);
    const groupes = afficheGroupes(liste);
    const mos     = METIERS.map(m => afficheMo(liste, m));

    basculerChamp(n, 'becs', becs);
    METIERS.forEach((m, i) => basculerChamp(n, colonneMo(m), mos[i]));
    document.getElementById(`i${n}-groupes-group`)?.classList.toggle('hidden', !groupes);
    if (!groupes) poserGroupes(card, '');

    const unVisible = becs || groupes || mos.some(Boolean);
    document.getElementById(`i${n}-extra`)?.classList.toggle('hidden', !unVisible);
}
