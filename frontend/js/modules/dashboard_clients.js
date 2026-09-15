import { isoLocal } from '../utils/utils.js';
import { chargerMesClients } from './db_clients.js';
import { regrouperParClient, clientsHorsBrouillons, compterRetards, lireCache, ecrireCache } from './clients_data.js';
import { afficherClients } from './clients_liste.js';

// ── Carte « Clients à faire » du tableau de bord ──
// Masquée tant que le technicien n'a aucun client dans le planning.

export async function majClientsCard() {
    const card = document.getElementById('dash-clients-card');
    if (!card) return;

    let rows;
    try {
        rows = await chargerMesClients();
        ecrireCache(rows);
    } catch {
        rows = lireCache()?.rows || [];
    }

    const visibles = clientsHorsBrouillons(regrouperParClient(rows));
    const nb       = visibles.length;
    const nbRetard = compterRetards(visibles, isoLocal(new Date()));

    card.classList.toggle('hidden', nb === 0);
    if (nb === 0) return;

    document.getElementById('dash-clients-hero').textContent = `${nb} client${nb > 1 ? 's' : ''}`;
    const sub = document.getElementById('dash-clients-sub');
    sub.textContent = nbRetard
        ? `${nbRetard} en retard`
        : 'Tout est dans les temps';
    sub.classList.toggle('est-retard', nbRetard > 0);
}

export function initClientsCard() {
    document.getElementById('dash-clients-card')?.addEventListener('click', afficherClients);
}
