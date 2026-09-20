// Opérations sur la liste des cartes (interventions et pauses) :
// suppression, renumérotation, notification de changement (brouillon).

export function notifierChangement() {
    document.dispatchEvent(new CustomEvent('form:changed'));
}

export function supprimerElement(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const libelle = el.dataset.type === 'pause'
        ? 'cette pause'
        : (el.querySelector('.int-number')?.textContent || 'cette intervention').toLowerCase();
    if (!confirm(`Supprimer ${libelle} ?`)) return;
    el.remove();
    renumeroterInterventions();
    notifierChangement();
}

// Appelé par le glisser-déposer une fois la carte posée à sa nouvelle place.
export function apresReordonnancement() {
    renumeroterInterventions();
    notifierChangement();
}

function renumeroterInterventions() {
    let n = 0;
    document.querySelectorAll('#interventions-list > div').forEach(card => {
        if (card.dataset.type === 'intervention') {
            n++;
            const lbl = card.querySelector('.int-number');
            if (lbl) lbl.textContent = `Intervention #${n}`;
        }
    });
}
