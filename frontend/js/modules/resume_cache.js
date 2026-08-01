import { chargerDetailFeuille } from './db.js';

// Les feuilles déjà consultées restent en mémoire. C'est ce qui permet de
// changer de jour sans attendre le serveur, et de préparer à l'avance les
// journées d'avant et d'après pour les montrer pendant le glissement.

const _cache   = new Map();   // id → { feuille, elements }
const _enCours = new Map();   // id → chargement déjà lancé (évite les doublons)

export function detailEnCache(id) {
    return _cache.get(id) || null;
}

export function detailFeuille(id) {
    const dejaLa = _cache.get(id);
    if (dejaLa) return Promise.resolve(dejaLa);

    let attente = _enCours.get(id);
    if (!attente) {
        attente = chargerDetailFeuille(id)
            .then(data => { _cache.set(id, data); return data; })
            .finally(() => _enCours.delete(id));
        _enCours.set(id, attente);
    }
    return attente;
}

// Chargement d'arrière-plan : une erreur ici ne doit rien casser à l'écran.
export function precharger(id) {
    if (!id || _cache.has(id)) return;
    detailFeuille(id).catch(() => {});
}

export function viderCacheFeuilles() {
    _cache.clear();
    _enCours.clear();
}
