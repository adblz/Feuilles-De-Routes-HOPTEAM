import { chargerHeuresSupp, chargerHistorique } from './db.js';
import { parseDuree } from '../utils/utils.js';
import { restaurerBrouillon, viderInterventions } from './fdr.js';
import { reinitialiserFeuille, ouvrirSuppRecap } from './ui.js';

// ── Petits utilitaires ─────────────────────────────────────────

// Formate des minutes en « 12h30 ».
const affH = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;

// Date du jour au format AAAA-MM-JJ (heure locale, sans décalage de fuseau).
function isoLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const aujourdhui = () => isoLocal(new Date());

// Renvoie le lundi de la semaine contenant la date donnée.
function lundiDeLaSemaine(date) {
    const d    = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const jour = d.getDay(); // 0 = dimanche, 1 = lundi, … 6 = samedi
    const delta = jour === 0 ? -6 : 1 - jour;
    d.setDate(d.getDate() + delta);
    return d;
}

function brouillonExiste() {
    return !!localStorage.getItem('fdr_brouillon');
}

// ── Bascule entre les deux vues ────────────────────────────────

function montrerFormulaire() {
    document.getElementById('vue-dashboard').classList.add('hidden');
    document.getElementById('vue-formulaire').classList.remove('hidden');
    window.scrollTo(0, 0);
}

export function afficherDashboard() {
    document.getElementById('vue-formulaire').classList.add('hidden');
    document.getElementById('vue-dashboard').classList.remove('hidden');
    window.scrollTo(0, 0);
    rafraichirDashboard();
}

// Ouvre un formulaire vierge pour une date donnée (aujourd'hui si non précisée).
function ouvrirNouvelleFeuille(dateISO) {
    if (brouillonExiste() && !confirm('Une feuille est en cours (brouillon). La remplacer ?')) return;
    reinitialiserFeuille(dateISO);
    montrerFormulaire();
}

// Reprend le brouillon en cours dans le formulaire.
function reprendreBrouillon() {
    viderInterventions();
    restaurerBrouillon();
    montrerFormulaire();
}

// ── Rendu du dashboard ─────────────────────────────────────────

export async function rafraichirDashboard() {
    majBrouillonCard();
    await Promise.all([rendreHeuresSupp(), rendreSemaine()]);
}

function majBrouillonCard() {
    document.getElementById('dash-brouillon').classList.toggle('hidden', !brouillonExiste());
}

async function rendreHeuresSupp() {
    const totalEl = document.getElementById('dash-supp-total');
    const subEl   = document.getElementById('dash-supp-sub');
    const moisEl  = document.getElementById('dash-supp-mois');

    const today        = aujourdhui();
    const firstOfMonth = today.slice(0, 8) + '01';
    moisEl.textContent = new Date(today + 'T12:00').toLocaleDateString('fr-FR', { month: 'long' });

    totalEl.textContent = '…';
    subEl.textContent   = '';

    let histo;
    try {
        histo = await chargerHeuresSupp(firstOfMonth, today);
    } catch (err) {
        totalEl.textContent = '—';
        subEl.textContent   = 'Connexion indisponible';
        return;
    }

    let totalMin = 0;
    histo.forEach(e => { totalMin += parseDuree(e.heures_supp); });

    totalEl.textContent = affH(totalMin);
    subEl.textContent   = `${histo.length} feuille${histo.length > 1 ? 's' : ''} ce mois-ci`;
}

async function rendreSemaine() {
    const chipsEl     = document.getElementById('dash-semaine-chips');
    const manquantsEl = document.getElementById('dash-manquantes');

    chipsEl.innerHTML     = '<div class="dash-loading">Chargement…</div>';
    manquantsEl.innerHTML = '';

    // Construit les 5 jours ouvrés (lundi → vendredi) de la semaine courante.
    const lundi = lundiDeLaSemaine(new Date());
    const jours = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + i);
        jours.push({
            iso:   isoLocal(d),
            court: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
            long:  d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
            num:   d.getDate(),
        });
    }

    let histo;
    try {
        histo = await chargerHistorique();
    } catch (err) {
        chipsEl.innerHTML = '<div class="dash-loading">Connexion indisponible.</div>';
        return;
    }

    const datesEnregistrees = new Set(histo.map(e => e.date));
    const today = aujourdhui();

    chipsEl.innerHTML = jours.map(j => {
        const fait    = datesEnregistrees.has(j.iso);
        const passe   = j.iso <= today;
        let etat = 'avenir';
        if (fait) etat = 'fait';
        else if (passe) etat = 'manquant';
        const icone = etat === 'fait' ? '✓' : etat === 'manquant' ? '⚠' : '·';
        return `
            <div class="dash-jour dash-jour-${etat}">
                <span class="dash-jour-nom">${j.court}</span>
                <span class="dash-jour-num">${j.num}</span>
                <span class="dash-jour-icone">${icone}</span>
            </div>`;
    }).join('');

    // Liste des jours passés (ou aujourd'hui) sans feuille enregistrée.
    const manquants = jours.filter(j => !datesEnregistrees.has(j.iso) && j.iso <= today);

    if (!manquants.length) {
        manquantsEl.innerHTML = '<div class="dash-tout-ok">✓ Toutes les feuilles de la semaine sont enregistrées.</div>';
        return;
    }

    manquantsEl.innerHTML = manquants.map(j => `
        <div class="dash-manquant-ligne">
            <span class="dash-manquant-label">⚠ ${j.long} — feuille manquante</span>
            <button type="button" class="dash-jour-creer" data-date="${j.iso}">Créer</button>
        </div>`).join('');
}

// ── Initialisation (appelée une fois depuis main.js) ───────────

export function initDashboard(nomTech) {
    const greeting = document.getElementById('dash-greeting');
    if (greeting) greeting.textContent = nomTech ? `Bonjour, ${nomTech}` : 'Tableau de bord';

    document.getElementById('btn-dash-supp').addEventListener('click', ouvrirSuppRecap);
    document.getElementById('btn-dash-nouvelle').addEventListener('click', () => ouvrirNouvelleFeuille());
    document.getElementById('dash-brouillon').addEventListener('click', reprendreBrouillon);
    document.getElementById('btn-retour-dashboard').addEventListener('click', afficherDashboard);

    // Boutons « Créer » des jours manquants (générés dynamiquement).
    document.getElementById('dash-manquantes').addEventListener('click', (e) => {
        const btn = e.target.closest('.dash-jour-creer');
        if (btn) ouvrirNouvelleFeuille(btn.dataset.date);
    });

    // Après un enregistrement réussi (PDF ou email), revenir au dashboard à jour.
    document.addEventListener('feuille:enregistree', afficherDashboard);

    // Après une suppression dans l'historique, rafraîchir les données du dashboard
    // en arrière-plan (sans changer de vue : l'historique reste ouvert par-dessus).
    document.addEventListener('feuille:supprimee', rafraichirDashboard);
}
