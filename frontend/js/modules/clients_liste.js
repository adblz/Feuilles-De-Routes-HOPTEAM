import { isoLocal } from '../utils/utils.js';
import { chargerMesClients } from './db_clients.js';
import { regrouperParClient, clientsHorsBrouillons, trierClients, filtrerClients, compterRetards, lireCache, ecrireCache } from './clients_data.js';
import { renderClients, renderVide, renderErreur } from './clients_render.js';
import { validerClient } from './clients_valider.js';

// ── Vue « Mes clients » (technicien) : chargement, filtres, validation ──

let _rows    = [];      // postes à faire reçus de la base (ou du cache), une ligne par poste
let _clients = [];      // les mêmes, regroupés par client
let _filtre  = 'tous';  // tous | retard | avenir
let _init    = false;
let _charge  = false;   // liste déjà chargée depuis la base ?

const aujourdhui = () => isoLocal(new Date());

function rendre() {
    const today    = aujourdhui();
    _clients = regrouperParClient(_rows);
    const visibles = trierClients(clientsHorsBrouillons(_clients), today);
    const nbRetard = compterRetards(visibles, today);

    const total = document.getElementById('clients-nb-total');
    total.textContent = `${visibles.length} à faire`;
    const retard = document.getElementById('clients-nb-retard');
    retard.textContent = `${nbRetard} en retard`;
    retard.classList.toggle('hidden', nbRetard === 0);

    const filtres = filtrerClients(visibles, _filtre, today);
    document.getElementById('clients-liste').innerHTML = filtres.length
        ? renderClients(filtres, today)
        : renderVide(_filtre, visibles.length === 0);
}

export async function chargerEtRendreClients() {
    const info = document.getElementById('clients-info');
    const zone = document.getElementById('clients-liste');
    if (!_charge) zone.innerHTML = '<p class="clients-vide">Chargement…</p>';
    try {
        _rows = await chargerMesClients();
        _charge = true;
        ecrireCache(_rows);
        info.classList.add('hidden');
    } catch (e) {
        const cache = lireCache();
        if (cache?.rows) {
            _rows = cache.rows;
            const maj = new Date(cache.maj);
            info.textContent = `Hors ligne · liste du ${maj.toLocaleDateString('fr-FR')} à ${maj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            info.classList.remove('hidden');
        } else {
            zone.innerHTML = renderErreur(e?.message || 'chargement impossible');
            return;
        }
    }
    rendre();
}

function cabler() {
    document.getElementById('clients-filtres').addEventListener('click', (e) => {
        const chip = e.target.closest('.clients-chip');
        if (!chip) return;
        _filtre = chip.dataset.filtre;
        document.querySelectorAll('.clients-chip').forEach(c => c.classList.toggle('active', c === chip));
        rendre();
    });

    document.getElementById('clients-liste').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-client-valider');
        if (!btn) return;
        btn.disabled = true;
        validerClient(_clients.find(c => c.id === btn.dataset.id)).finally(() => { btn.disabled = false; });
    });

    // Après un enregistrement, la liste est rechargée au prochain affichage.
    document.addEventListener('feuille:enregistree', () => { _charge = false; });
}

export function afficherClients() {
    ['vue-dashboard', 'vue-formulaire', 'vue-resume', 'vue-heures'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
    document.getElementById('vue-clients').classList.remove('hidden');
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent('nav:clients'));

    if (!_init) { _init = true; cabler(); }
    chargerEtRendreClients();
}
