// Navigation entre les onglets de la page responsable (même principe que
// admin_nav.js) : bouton #nav-X ↔ section #view-X, titre et description en
// haut de page, et boutons d'action affichés selon l'onglet.

const ONGLETS = ['feuilles', 'heures', 'techs', 'import'];

const TITRES = {
    feuilles: { titre: 'Feuilles de route', desc: 'Consultez les journées de vos techniciens et validez leurs heures supp.' },
    heures:   { titre: 'Heures supp',       desc: 'Récapitulatif de la période : heures déclarées et heures validées.' },
    techs:    { titre: 'Techniciens',       desc: 'Ajoutez, modifiez ou supprimez les techniciens de votre entreprise.' },
    import:   { titre: 'Import du planning', desc: 'Importez le fichier Excel des clients à visiter.' },
};

// Éléments de la barre du haut visibles uniquement sur certains onglets.
const ACTIONS = {
    'resp-filtre-periode': ['feuilles', 'heures'],
    'btn-resp-selection':  ['feuilles'],
    'btn-nouveau-tech':    ['techs'],
};

let _onShow = null;
let _periodesDispo = false;

export function initNav(onShow) {
    _onShow = onShow;
    ONGLETS.forEach(o => {
        document.getElementById('nav-' + o).addEventListener('click', () => showTab(o));
    });
    showTab('feuilles');
}

// Le filtre de période n'a de sens que s'il existe des périodes de paie.
export function setPeriodesDisponibles(dispo) {
    _periodesDispo = dispo;
}

export function showTab(onglet) {
    ONGLETS.forEach(o => {
        document.getElementById('view-' + o).classList.toggle('hidden', o !== onglet);
        document.getElementById('nav-' + o).classList.toggle('actif', o === onglet);
    });
    document.getElementById('page-title').textContent = TITRES[onglet].titre;
    document.getElementById('page-desc').textContent  = TITRES[onglet].desc;

    Object.entries(ACTIONS).forEach(([id, onglets]) => {
        let visible = onglets.includes(onglet);
        if (id === 'resp-filtre-periode' && !_periodesDispo) visible = false;
        document.getElementById(id).classList.toggle('hidden', !visible);
    });

    if (_onShow) _onShow(onglet);
}
