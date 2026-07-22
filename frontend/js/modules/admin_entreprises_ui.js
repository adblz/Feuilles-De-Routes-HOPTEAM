import { showToast } from '../utils/utils.js';

const AJOUTER  = '__ajouter__';
const SELECTS  = ['form-creer-company', 'modifier-company'];
let _onCreerEntreprise = null;
let _selectDeclencheur = null;

export function initEntreprisesUI(onCreerEntreprise) {
    _onCreerEntreprise = onCreerEntreprise;

    SELECTS.forEach(id => {
        const select = document.getElementById(id);
        select.dataset.precedent = '';
        select.addEventListener('change', () => {
            if (select.value !== AJOUTER) {
                select.dataset.precedent = select.value;
                return;
            }
            _selectDeclencheur = select;
            select.value = select.dataset.precedent;
            ouvrirModalEntreprise();
        });
    });

    document.getElementById('btn-close-entreprise').addEventListener('click', fermerModal);
    document.getElementById('btn-annuler-entreprise').addEventListener('click', fermerModal);
    document.getElementById('btn-submit-entreprise').addEventListener('click', soumettreEntreprise);
    document.getElementById('modal-entreprise').addEventListener('click', e => {
        if (e.target === e.currentTarget) fermerModal();
    });
}

export function remplirEntreprises(entreprises) {
    SELECTS.forEach(id => {
        const select = document.getElementById(id);
        const valeurActuelle = select.value;
        select.innerHTML = '<option value="">Aucune (voit tout)</option>' +
            entreprises.map(e => `<option value="${escHtml(e.nom)}">${escHtml(e.nom)}</option>`).join('') +
            `<option value="${AJOUTER}">+ Ajouter une entreprise…</option>`;
        select.value = valeurActuelle;
        select.dataset.precedent = select.value;
    });
}

function ouvrirModalEntreprise() {
    document.getElementById('form-entreprise-nom').value = '';
    document.getElementById('modal-entreprise').classList.add('open');
}

function fermerModal() {
    document.getElementById('modal-entreprise').classList.remove('open');
}

async function soumettreEntreprise() {
    const nom = document.getElementById('form-entreprise-nom').value.trim();
    if (!nom) { showToast('Le nom de l\'entreprise est obligatoire.', 'warn'); return; }
    fermerModal();
    if (_onCreerEntreprise) await _onCreerEntreprise(nom);
    if (_selectDeclencheur) {
        _selectDeclencheur.value = nom;
        _selectDeclencheur.dataset.precedent = nom;
        _selectDeclencheur = null;
    }
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
