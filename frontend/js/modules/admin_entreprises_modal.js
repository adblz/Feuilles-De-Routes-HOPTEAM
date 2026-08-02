// Modal « Modifier l'entreprise », ouvert en cliquant sur le logo d'une entreprise.
// Regroupe tout ce qui est modifiable : nom, logo, règles de calcul, mentions PDF,
// et la suppression. Rien n'est envoyé au serveur avant le clic sur « Enregistrer ».

import { remplirReglages, lireReglages, lireLogoFichier } from './admin_entreprises_form.js';
import { showToast } from '../utils/utils.js';

const LOGO_MAX_OCTETS = 300 * 1024;   // logo lu par chaque technicien : le garder léger

let _onEnregistrer = null;
let _onSupprimer   = null;
let _entreprise    = null;   // entreprise en cours d'édition
let _nbUtilisateurs = 0;
let _logoEnCours   = undefined;   // undefined = inchangé, null = retiré, string = nouveau

const el = id => document.getElementById(id);

export function initEntrepriseEditModal({ onEnregistrer, onSupprimer }) {
    _onEnregistrer = onEnregistrer;
    _onSupprimer   = onSupprimer;

    el('btn-close-ent-edit').addEventListener('click', fermerModal);
    el('btn-annuler-ent-edit').addEventListener('click', fermerModal);
    el('modal-ent-edit').addEventListener('click', e => {
        if (e.target === e.currentTarget) fermerModal();
    });
    el('btn-submit-ent-edit').addEventListener('click', enregistrer);
    el('btn-ent-edit-suppr').addEventListener('click', supprimer);
    el('btn-ent-edit-logo-suppr').addEventListener('click', retirerLogo);
    el('ent-edit-logo-input').addEventListener('change', choisirLogo);
}

export function ouvrirModalEntrepriseEdit(entreprise, nbUtilisateurs) {
    _entreprise     = entreprise;
    _nbUtilisateurs = nbUtilisateurs;
    _logoEnCours    = undefined;

    el('ent-edit-id').value  = entreprise.id;
    el('ent-edit-nom').value = entreprise.nom || '';
    el('ent-edit-count').textContent = `${nbUtilisateurs} utilisateur${nbUtilisateurs > 1 ? 's' : ''}`;
    afficherLogo(entreprise.logo_b64 || '');
    remplirReglages(entreprise);
    el('ent-edit-logo-input').value = '';
    el('modal-ent-edit').classList.add('open');
}

function fermerModal() {
    el('modal-ent-edit').classList.remove('open');
}

// Affiche l'aperçu du logo, ou masque aperçu et bouton « Retirer » si aucun logo.
function afficherLogo(dataUrl) {
    const apercu = el('ent-edit-logo-apercu');
    const suppr  = el('btn-ent-edit-logo-suppr');
    if (dataUrl) {
        apercu.src = dataUrl;
        apercu.classList.remove('hidden');
        suppr.classList.remove('hidden');
    } else {
        apercu.removeAttribute('src');
        apercu.classList.add('hidden');
        suppr.classList.add('hidden');
    }
}

async function choisirLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > LOGO_MAX_OCTETS) {
        showToast('Logo trop lourd (max 300 Ko). Choisis une image plus petite.', 'warn', 4000);
        e.target.value = '';
        return;
    }
    try {
        _logoEnCours = await lireLogoFichier(file);
        afficherLogo(_logoEnCours);
    } catch (err) {
        showToast('Erreur : ' + err.message, 'warn');
    }
    e.target.value = '';
}

function retirerLogo() {
    _logoEnCours = null;
    afficherLogo('');
}

async function enregistrer() {
    const nom = el('ent-edit-nom').value.trim();
    if (!nom) { showToast('Le nom de l\'entreprise est obligatoire.', 'warn'); return; }
    const res = lireReglages();
    if (!res.ok) { showToast(res.msg, 'warn'); return; }

    const modif = {
        id:      _entreprise.id,
        ancien:  _entreprise.nom,
        nom,
        regles:  res.regles,
        logo:    _logoEnCours,
    };
    fermerModal();
    if (_onEnregistrer) await _onEnregistrer(modif);
}

async function supprimer() {
    if (_nbUtilisateurs > 0) {
        showToast(`Impossible : ${_nbUtilisateurs} utilisateur(s) encore rattaché(s).`, 'warn');
        return;
    }
    if (!confirm(`Supprimer l'entreprise « ${_entreprise.nom} » ?`)) return;
    fermerModal();
    if (_onSupprimer) await _onSupprimer(_entreprise.id);
}
