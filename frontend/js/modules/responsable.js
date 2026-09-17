// Point d'entrée de la page responsable : session, profil, puis mise en
// place des quatre onglets (feuilles, heures supp, techniciens, import).

import { chargerMonProfil } from './db_responsable.js';
import { deconnexion, isSessionValid, refreshSession, startAutoRefresh } from './auth.js';
import { fermerPdfViewer } from './pdfviewer.js';
import * as liste from './responsable_liste.js';
import { peuplerSelectPeriode, cablerFiltreEtSelection, cablerListe } from './responsable_evenements.js';
import { initNav, setPeriodesDisponibles, showTab } from './responsable_nav.js';
import { initMonMotDePasse } from './responsable_password.js';
import { initDetail, ouvrirDetail } from './responsable_detail.js';
import { initHeures, rendreHeures } from './responsable_heures.js';
import { initTechs, rechargerTechs } from './responsable_techs.js';
import { initImportClients } from './clients_import.js';
import { initPlanning, afficherPlanning, rafraichirOngletImport } from './responsable_planning.js';
import { initEntreprise, setEntreprisesDisponibles } from './responsable_entreprise.js';

// Après une validation ou un changement de période : les deux onglets qui
// affichent les feuilles sont re-rendus.
function rendreOnglets() {
    liste.rendreListe();
    rendreHeures();
}

// Changement d'entreprise affichée (compte multi-entreprises) : les quatre
// onglets suivent. Les erreurs des onglets secondaires ne bloquent pas les feuilles.
function onEntrepriseChange() {
    rendreOnglets();
    rechargerTechs().catch(e => console.warn('Rechargement des techniciens impossible :', e));
    rafraichirOngletImport();
}

// Après création / suppression d'un technicien : la liste des feuilles et le
// planning clients doivent connaître le nouveau compte (nom, entreprise).
async function onTechsChanges() {
    rafraichirOngletImport();
    try {
        await liste.rechargerFeuilles();
        setEntreprisesDisponibles(liste.entreprisesConnues());
        rendreOnglets();
    } catch (e) {
        console.warn('Rechargement des feuilles impossible :', e);
    }
}

export async function initResponsable() {
    document.getElementById('btn-close-pdf').addEventListener('click', fermerPdfViewer);

    if (!isSessionValid()) {
        const refreshed = await refreshSession();
        if (!refreshed) { window.location.href = '/pages/login.html'; return; }
    }
    startAutoRefresh();

    const profil = await chargerMonProfil();
    if (!profil || profil.role !== 'responsable') {
        window.location.href = '/index.html';
        return;
    }

    initMonMotDePasse(profil);
    initEntreprise(profil, { onChange: onEntrepriseChange });
    initNav(onglet => {
        if (onglet === 'heures') rendreHeures();
        else if (onglet === 'import') afficherPlanning();
    });
    initDetail({ onChange: rendreOnglets });
    initHeures({ onOuvrir: ouvrirDetail });
    cablerListe(document.getElementById('resp-list'), { onOuvrir: ouvrirDetail });
    cablerFiltreEtSelection({ onPeriodeChange: rendreOnglets });

    document.getElementById('btn-resp-logout').addEventListener('click', async () => {
        await deconnexion();
        window.location.href = '/pages/login.html';
    });

    // Techniciens et import : indépendants des feuilles, ne doivent jamais bloquer l'affichage.
    initTechs(profil, { onChange: onTechsChanges }).catch(e => console.warn('Onglet techniciens indisponible :', e));
    initPlanning(profil);
    initImportClients(profil).catch(e => console.warn('Import clients indisponible :', e));

    liste.afficherChargement();
    try {
        await liste.chargerDonnees();
    } catch {
        liste.afficherErreurChargement();
        return;
    }

    setPeriodesDisponibles(peuplerSelectPeriode());
    setEntreprisesDisponibles(liste.entreprisesConnues());
    showTab('feuilles');
    rendreOnglets();
}
