// Choix de l'entreprise affichée sur la page responsable. Réservé aux comptes
// « voit toutes les entreprises » : un menu déroulant dans la barre latérale
// permet de se mettre dans la peau du responsable d'une seule entreprise.
// Pour un responsable classique, le menu reste caché et rien n'est filtré
// (Supabase ne lui envoie déjà que sa propre entreprise).

const CLE_STOCKAGE = 'fdr_resp_entreprise';
const TOUTES = '';   // valeur du choix « Toutes les entreprises »

let _actif = false;       // le compte voit toutes les entreprises
let _maCompany = '';      // entreprise du compte connecté
let _choisie = TOUTES;
let _onChange = null;

function lireChoixMemorise() {
    try { return localStorage.getItem(CLE_STOCKAGE) || TOUTES; } catch { return TOUTES; }
}

function memoriserChoix(company) {
    try {
        if (company) localStorage.setItem(CLE_STOCKAGE, company);
        else localStorage.removeItem(CLE_STOCKAGE);
    } catch { /* stockage indisponible : le choix vaut pour la session */ }
}

// Entreprise choisie, ou '' si « Toutes » (ou compte classique).
export function entrepriseChoisie() {
    return _actif ? _choisie : TOUTES;
}

// Le compte connecté a-t-il le droit de gérer (créer / modifier / supprimer)
// les techniciens de l'entreprise affichée ? Le backend applique la même règle.
export function peutGererEntrepriseAffichee() {
    const affichee = entrepriseChoisie() || _maCompany;
    return (affichee || '') === (_maCompany || '');
}

// Ne garde que les éléments de l'entreprise choisie (tout si « Toutes »).
export function filtrerParEntreprise(items, getCompany) {
    const choisie = entrepriseChoisie();
    if (!choisie) return items;
    return items.filter(item => (getCompany(item) || '') === choisie);
}

function remplirSelect(select, companies) {
    const options = [`<option value="${TOUTES}">Toutes les entreprises</option>`];
    companies.forEach(c => {
        const label = c === _maCompany ? `${c} (la mienne)` : c;
        options.push(`<option value="${escapeAttr(c)}">${escapeAttr(label)}</option>`);
    });
    select.innerHTML = options.join('');
    select.value = _choisie;
}

function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// À appeler une fois les techniciens chargés : liste des entreprises connues.
// Si le choix mémorisé n'existe plus, on revient à « Toutes ».
export function setEntreprisesDisponibles(companies) {
    if (!_actif) return;
    const liste = [...new Set([_maCompany, ...companies].filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const select = document.getElementById('resp-select-entreprise');
    if (_choisie && !liste.includes(_choisie)) {
        _choisie = TOUTES;
        memoriserChoix(TOUTES);
        _onChange?.();
    }
    remplirSelect(select, liste);
}

// onChange() : appelé après chaque changement d'entreprise (re-rendu des onglets).
export function initEntreprise(profil, { onChange } = {}) {
    _onChange = onChange;
    _maCompany = profil.company || '';
    _actif = !!profil.voit_toutes_entreprises;
    const bloc = document.getElementById('resp-entreprise');
    if (!_actif) { bloc.classList.add('hidden'); return; }

    _choisie = lireChoixMemorise();
    bloc.classList.remove('hidden');
    remplirSelect(document.getElementById('resp-select-entreprise'), _maCompany ? [_maCompany] : []);

    document.getElementById('resp-select-entreprise').addEventListener('change', e => {
        _choisie = e.target.value;
        memoriserChoix(_choisie);
        _onChange?.();
    });
}
