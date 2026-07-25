// Navigation par onglets de la page admin (menu latéral).
// Bascule la section visible, l'onglet actif, le titre et les boutons d'action.

const ONGLETS = ['users', 'suggestions', 'planning', 'entreprises'];

const TITRES = {
    users:       { titre: 'Gestion des utilisateurs', desc: 'Gérez les comptes, accès et rôles.' },
    suggestions: { titre: 'Boîte à suggestions',      desc: 'Les retours envoyés par les techniciens.' },
    planning:    { titre: 'Planning heures supp.',    desc: 'Périodes de calcul de la paie, mois par mois.' },
    entreprises: { titre: 'Entreprises',              desc: 'Ajoutez, renommez ou supprimez les entreprises.' },
};

let _onShow = null;

export function initNav(onShow) {
    _onShow = onShow;
    ONGLETS.forEach(o => {
        document.getElementById('nav-' + o).addEventListener('click', () => showTab(o));
    });
    showTab('users');
}

export function showTab(onglet) {
    ONGLETS.forEach(o => {
        document.getElementById('view-' + o).classList.toggle('hidden', o !== onglet);
        document.getElementById('nav-' + o).classList.toggle('actif', o === onglet);
    });

    document.getElementById('page-title').textContent = TITRES[onglet].titre;
    document.getElementById('page-desc').textContent  = TITRES[onglet].desc;

    document.getElementById('btn-nouvel-utilisateur').classList.toggle('hidden', onglet !== 'users');
    document.getElementById('btn-planning-nouveau').classList.toggle('hidden', onglet !== 'planning');

    if (_onShow) _onShow(onglet);
}
