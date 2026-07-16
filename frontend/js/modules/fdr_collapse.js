function buildSummaryText(card) {
    const type = card.dataset.type;
    if (type === 'intervention') {
        const rawId  = card.id.replace('int-card-', '');
        const arrivee = document.getElementById(`i${rawId}-arrivee`)?.value || '';
        const depart  = document.getElementById(`i${rawId}-depart`)?.value  || '';
        const client  = document.getElementById(`i${rawId}-client`)?.value  || '';
        const ville   = document.getElementById(`i${rawId}-ville`)?.value   || '';
        const types   = Array.from(card.querySelectorAll('.type-btn.active'))
                             .map(b => b.dataset.value).join(', ');
        const parts = [];
        if (arrivee && depart) parts.push(`${arrivee} – ${depart}`);
        else if (arrivee)      parts.push(arrivee);
        if (client) parts.push(client);
        if (ville)  parts.push(ville);
        if (types)  parts.push(types);
        return parts.join(' · ') || 'Intervention';
    }
    if (type === 'pause') {
        const rawId = card.id.replace('pause-card-', '');
        const debut = document.getElementById(`p${rawId}-debut`)?.value || '';
        const fin   = document.getElementById(`p${rawId}-fin`)?.value   || '';
        if (debut && fin) return `${debut} – ${fin}`;
        if (debut)        return debut;
        return 'Pause';
    }
    return '';
}

export function collapserCarte(card) {
    if (!card) return;
    const summary = card.querySelector('.card-summary');
    if (summary) summary.textContent = buildSummaryText(card);
    card.classList.add('card-collapsed');
}

export function expanderCarte(card) {
    if (!card) return;
    card.classList.remove('card-collapsed');
    const summary = card.querySelector('.card-summary');
    if (summary) summary.textContent = '';
}

export function collapserToutesSauf(exceptCard) {
    document.querySelectorAll('#interventions-list > [data-type]').forEach(card => {
        if (card !== exceptCard) collapserCarte(card);
    });
}

export function collapserApresRestauration() {
    const cards = Array.from(document.querySelectorAll('#interventions-list > [data-type]'));
    if (cards.length <= 1) return;
    cards.forEach((card, i) => {
        if (i < cards.length - 1) collapserCarte(card);
    });
}
