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
import { initTechs } from './responsable_techs.js';
import { initImportClients } from './clients_import.js';

// Après une validation ou un changement de période : les deux onglets qui
// affichent les feuilles sont re-rendus.
function rendreOnglets() {
    liste.rendreListe();
    rendreHeures();
}

// Après création / suppression d'un technicien : la liste des feuilles doit
// connaître le nouveau compte (nom, entreprise).
async function onTechsChanges() {
    try {
        await liste.rechargerFeuilles();
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
    initNav(onglet => { if (onglet === 'heures') rendreHeures(); });
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
    initImportClients(profil).catch(e => console.warn('Import clients indisponible :', e));

    liste.afficherChargement();
    try {
        await liste.chargerDonnees();
    } catch {
        liste.afficherErreurChargement();
        return;
    }

    setPeriodesDisponibles(peuplerSelectPeriode());
    showTab('feuilles');
    rendreOnglets();
}
