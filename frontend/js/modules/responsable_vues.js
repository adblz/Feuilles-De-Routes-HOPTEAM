// Suivi « lu / non lu » côté responsable : stocké dans le navigateur (pas en
// base), propre à l'appareil utilisé — voir CLAUDE.md.

const VUES_KEY = 'fdr_resp_vues';

export function getVues() {
    return new Set(JSON.parse(localStorage.getItem(VUES_KEY) || '[]'));
}

export function marquerVue(id) {
    const vues = getVues();
    vues.add(id);
    localStorage.setItem(VUES_KEY, JSON.stringify([...vues]));
}
