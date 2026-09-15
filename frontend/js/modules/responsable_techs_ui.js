// Modales de l'onglet « Techniciens » : créer, modifier, réinitialiser le
// mot de passe. Ouverture / fermeture / lecture des champs uniquement ; les
// appels serveur sont faits par responsable_techs.js via les callbacks.

import { showToast } from '../utils/utils.js';

let _cb = {};

const $ = id => document.getElementById(id);
const ouvrir = id => $(id).classList.add('open');
const fermer = id => $(id).classList.remove('open');

function cabler(suffixe, onSubmit) {
    const modalId = `modal-tech-${suffixe}`;
    $(`btn-close-tech-${suffixe}`).addEventListener('click', () => fermer(modalId));
    $(`btn-annuler-tech-${suffixe}`).addEventListener('click', () => fermer(modalId));
    $(modalId).addEventListener('click', e => { if (e.target === e.currentTarget) fermer(modalId); });
    $(`btn-submit-tech-${suffixe}`).addEventListener('click', onSubmit);
}

export function ouvrirModalCreer() {
    $('tech-creer-email').value = '';
    $('tech-creer-nom').value = '';
    $('tech-creer-contrat').value = '39';
    $('tech-creer-password').value = '';
    ouvrir('modal-tech-creer');
    $('tech-creer-email').focus();
}

export function ouvrirModalModifier(tech) {
    $('tech-modifier-id').value = tech.id;
    $('tech-modifier-email').textContent = tech.email || '—';
    $('tech-modifier-nom').value = tech.nom || '';
    $('tech-modifier-contrat').value = tech.contrat || '';
    ouvrir('modal-tech-modifier');
}

export function ouvrirModalPassword(tech) {
    $('tech-password-id').value = tech.id;
    $('tech-password-nom').textContent = `${tech.nom || ''} — ${tech.email || ''}`;
    $('tech-password-new').value = '';
    ouvrir('modal-tech-password');
    $('tech-password-new').focus();
}

async function soumettreCreer() {
    const email = $('tech-creer-email').value.trim();
    const nom = $('tech-creer-nom').value.trim();
    const contrat = $('tech-creer-contrat').value;
    const password = $('tech-creer-password').value;
    if (!email || !nom || !password) { showToast('Email, nom et mot de passe sont obligatoires', 'warn'); return; }
    if (password.length < 6) { showToast('Le mot de passe doit faire au moins 6 caractères', 'warn'); return; }
    if (await _cb.onCreer(email, nom, contrat, password)) fermer('modal-tech-creer');
}

async function soumettreModifier() {
    const id = $('tech-modifier-id').value;
    const nom = $('tech-modifier-nom').value.trim();
    const contrat = $('tech-modifier-contrat').value || null;
    if (!nom) { showToast('Le nom est obligatoire', 'warn'); return; }
    if (await _cb.onModifier(id, { nom, contrat })) fermer('modal-tech-modifier');
}

async function soumettrePassword() {
    const id = $('tech-password-id').value;
    const password = $('tech-password-new').value;
    if (password.length < 6) { showToast('Le mot de passe doit faire au moins 6 caractères', 'warn'); return; }
    if (await _cb.onResetPassword(id, password)) fermer('modal-tech-password');
}

// Chaque callback renvoie true en cas de succès (la modale se ferme alors).
export function initTechsUI({ onCreer, onModifier, onResetPassword }) {
    _cb = { onCreer, onModifier, onResetPassword };
    cabler('creer', soumettreCreer);
    cabler('modifier', soumettreModifier);
    cabler('password', soumettrePassword);
}
