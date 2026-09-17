// Actions de l'onglet « Planning en cours » : confirmation, appel Supabase,
// message. Chaque fonction renvoie true si quelque chose a changé en base.

import { showToast } from '../utils/utils.js';
import { supprimerLignesPlanning, reaffecterLignesPlanning, annulerImport } from './db_clients_gestion.js';

const fmtDate = iso => new Date(iso).toLocaleDateString('fr-FR');

// Retire un client (tous ses postes) de la liste de son technicien.
export async function retirerClient({ ids, nom, tech, postes }) {
    const detail = postes > 1 ? `Ses ${postes} postes seront retirés du planning.` : 'Il sera retiré du planning.';
    const ok = confirm(`Retirer « ${nom} » de la liste de ${tech} ?\n\n${detail}\nLe client reviendra au prochain import s'il figure encore dans le fichier.`);
    if (!ok) return false;
    try {
        await supprimerLignesPlanning(ids);
        showToast(`${nom} retiré de la liste de ${tech}`, 'success');
        return true;
    } catch (e) {
        showToast('Erreur : ' + e.message, 'error');
        return false;
    }
}

// Donne un client à un autre technicien. Pas de confirmation : l'action est
// réversible avec le même menu déroulant.
export async function reaffecterClient({ ids, userId, nom, nomTech }) {
    try {
        await reaffecterLignesPlanning(ids, userId);
        showToast(userId ? `${nom} affecté à ${nomTech}` : `${nom} n'est plus affecté`, 'success');
        return true;
    } catch (e) {
        showToast('Erreur : ' + e.message, 'error');
        return false;
    }
}

// Annule le dernier import : les clients encore à faire de cet import sont
// retirés (donc les listes des techniciens se vident), les faits sont conservés.
export async function annulerDernierImport(imp, nbAFaire) {
    const titre = `Annuler l'import du ${fmtDate(imp.importe_le)}${imp.fichier ? ` (${imp.fichier})` : ''} ?`;
    const corps = nbAFaire === 0
        ? 'Aucun client à faire n\'est lié à cet import : seule la trace de l\'import sera supprimée.'
        : `Les ${nbAFaire} client${nbAFaire > 1 ? 's' : ''} encore à faire seront retirés des listes de vos techniciens (leurs listes seront vidées).\nLes clients déjà faits sont conservés. Vous pourrez réimporter un fichier ensuite.`;
    if (!confirm(`${titre}\n\n${corps}`)) return false;
    try {
        await annulerImport(imp.id);
        showToast('Import annulé', 'success');
        return true;
    } catch (e) {
        showToast('Erreur : ' + e.message, 'error');
        return false;
    }
}
