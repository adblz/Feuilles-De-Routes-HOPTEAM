// Rappel / sortie supplémentaire : bloc unique du formulaire (horaires + astreinte).

export function afficherBlocRappel() {
    const bloc = document.getElementById('bloc-rappel');
    bloc?.classList.remove('hidden');
    document.getElementById('btn-rappel')?.classList.add('hidden');
    setTimeout(() => bloc?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

export function viderRappel() {
    const d = document.getElementById('rappel-debut');
    const f = document.getElementById('rappel-fin');
    const a = document.getElementById('rappel-astreinte');
    if (d) d.value = '';
    if (f) f.value = '';
    if (a) a.checked = false;
    document.getElementById('bloc-rappel')?.classList.add('hidden');
    document.getElementById('btn-rappel')?.classList.remove('hidden');
}

export function remplirRappel(data = {}) {
    const d = document.getElementById('rappel-debut');
    const f = document.getElementById('rappel-fin');
    const a = document.getElementById('rappel-astreinte');
    if (d) d.value = data.debut || '';
    if (f) f.value = data.fin   || '';
    if (a) a.checked = !!data.astreinte;
    if (data.debut || data.fin) afficherBlocRappel();
}
