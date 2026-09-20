// Lecture du formulaire : transforme les cartes du DOM en liste d'éléments
// { kind: 'intervention' | 'pause' | 'rappel', … } utilisée par le brouillon,
// l'enregistrement en base et le PDF.
import { lirePrestations } from './fdr_prestations.js';
import { lireGroupes } from './fdr_champs_extra.js';

export function lireTousLesElements() {
    const items = [];
    let intNum = 0;
    document.querySelectorAll('#interventions-list > div').forEach(card => {
        const rawId = card.id.replace('int-card-', '').replace('pause-card-', '');
        if (card.dataset.type === 'intervention') {
            const item = {
                kind:    'intervention',
                arrivee: document.getElementById(`i${rawId}-arrivee`)?.value  || '',
                depart:  document.getElementById(`i${rawId}-depart`)?.value   || '',
                client:  document.getElementById(`i${rawId}-client`)?.value   || '',
                ville:   document.getElementById(`i${rawId}-ville`)?.value    || '',
                typeInt: lirePrestations(card),
                mo:      document.getElementById(`i${rawId}-mo`)?.value       || '',   // main d'œuvre bière
                mo_cafe: document.getElementById(`i${rawId}-mo_cafe`)?.value  || '',
                mo_bar:  document.getElementById(`i${rawId}-mo_bar`)?.value   || '',
                becs:    document.getElementById(`i${rawId}-becs`)?.value     || '',
                groupes: lireGroupes(card),
                details: document.getElementById(`i${rawId}-details`)?.value  || '',
                planningId: card.dataset.planningId || '',
            };
            // Carte ajoutée mais jamais remplie : on l'ignore (n'apparaît ni dans
            // l'enregistrement final, ni dans le PDF). Un métier simplement
            // ouvert, sans prestation cochée, ne compte pas comme rempli.
            const estVide = !item.arrivee && !item.depart && !item.client && !item.ville
                && !item.typeInt && !item.mo && !item.mo_cafe && !item.mo_bar
                && !item.becs && !item.groupes && !item.details;
            if (estVide) return;
            intNum++;
            item.num = intNum;
            items.push(item);
        } else if (card.dataset.type === 'pause') {
            items.push({
                kind:  'pause',
                debut: document.getElementById(`p${rawId}-debut`)?.value || '',
                fin:   document.getElementById(`p${rawId}-fin`)?.value   || '',
            });
        }
    });

    // Rappel / sortie supplémentaire (bloc unique, horaires seuls)
    const rDebut = document.getElementById('rappel-debut')?.value || '';
    const rFin   = document.getElementById('rappel-fin')?.value   || '';
    const rAstr  = document.getElementById('rappel-astreinte')?.checked || false;
    if (rDebut || rFin) items.push({ kind: 'rappel', debut: rDebut, fin: rFin, astreinte: rAstr });

    return items;
}
