// Écrit une valeur dans une carte de statistique (KPI) du dashboard admin.

export function setKpi(id, valeur) {
    const el = document.getElementById(id);
    if (el) el.textContent = valeur;
}
