// État de la sélection multiple sur la page responsable (mode « Sélectionner »).

let _actif = false;
const _ids = new Set();

export function estActif() {
    return _actif;
}

export function activer() {
    _actif = true;
    _ids.clear();
}

export function desactiver() {
    _actif = false;
    _ids.clear();
}

export function toggleFeuille(id) {
    if (_ids.has(id)) _ids.delete(id);
    else _ids.add(id);
}

export function estSelectionnee(id) {
    return _ids.has(id);
}

export function toggleSemaine(ids) {
    const toutesDeja = statutSemaine(ids) === 'toutes';
    ids.forEach(id => (toutesDeja ? _ids.delete(id) : _ids.add(id)));
}

// 'aucune' | 'partielle' | 'toutes'
export function statutSemaine(ids) {
    const n = ids.filter(id => _ids.has(id)).length;
    if (n === 0) return 'aucune';
    return n === ids.length ? 'toutes' : 'partielle';
}

export function nombreSelectionnes() {
    return _ids.size;
}

export function listeSelectionnee() {
    return [..._ids];
}
