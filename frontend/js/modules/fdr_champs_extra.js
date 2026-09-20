// Champs conditionnels d'une carte d'intervention, selon les prestations cochées :
//   Nombre de becs     → Bière · Sanitation
//   Nombre de groupes  → Café · Joint-douchette (boutons 1 à 4, un seul choix)
//   Main d'œuvre       → Dépannage (quel que soit le métier)
// Un champ masqué est vidé, pour ne pas enregistrer une valeur invisible.
import { afficheBecs, afficheGroupes, afficheMo } from './prestations.js';
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
export function majChampsExtra(n, card, liste) {
    const becs    = afficheBecs(liste);
    const groupes = afficheGroupes(liste);
    const mo      = afficheMo(liste);

    document.getElementById(`i${n}-becs-group`)?.classList.toggle('hidden', !becs);
    document.getElementById(`i${n}-groupes-group`)?.classList.toggle('hidden', !groupes);
    document.getElementById(`i${n}-mo-group`)?.classList.toggle('hidden', !mo);
    document.getElementById(`i${n}-extra`)?.classList.toggle('hidden', !(becs || groupes || mo));

    if (!becs) {
        const el = document.getElementById(`i${n}-becs`);
        if (el) el.value = '';
    }
    if (!groupes) poserGroupes(card, '');
    if (!mo) {
        const el = document.getElementById(`i${n}-mo`);
        if (el) el.value = '';
    }
}
