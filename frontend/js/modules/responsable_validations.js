// Cache mémoire des validations d'heures supp de la période affichée.
// Partagé par la liste des feuilles (badges), la vue détail et l'onglet
// Heures supp, pour ne pas recharger Supabase à chaque rendu.

import { chargerValidations } from './db_validations.js';

let _validations = new Map();   // clé "user_id|date" → ligne validations_heures_supp
let _periodeChargee = '';

const cle = (userId, date) => `${userId}|${date}`;

export async function chargerValidationsPeriode(periode) {
    const signature = `${periode.date_debut}..${periode.date_fin}`;
    const rows = await chargerValidations(periode.date_debut, periode.date_fin);
    _validations = new Map(rows.map(v => [cle(v.user_id, v.date), v]));
    _periodeChargee = signature;
}

export function periodeChargee() { return _periodeChargee; }

export function validationPour(feuille) {
    if (!feuille) return null;
    return _validations.get(cle(feuille.user_id, feuille.date)) || null;
}

// Après enregistrement : on garde la ligne renvoyée par Supabase dans le cache.
export function majValidation(v) {
    if (v?.user_id && v?.date) _validations.set(cle(v.user_id, v.date), v);
}

export function retirerValidation(userId, date) {
    _validations.delete(cle(userId, date));
}

// La feuille a-t-elle été ré-enregistrée par le technicien APRÈS la validation ?
// (created_at change à chaque enregistrement : la feuille est recréée.)
export function estObsolete(feuille, validation) {
    if (!feuille?.created_at || !validation?.validee_le) return false;
    return new Date(feuille.created_at).getTime() > new Date(validation.validee_le).getTime();
}
