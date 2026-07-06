import { attachAutocomplete, VILLES_KEY, CLIENTS_KEY } from './autocomplete.js';
import { setSuppManuel } from './fdr_calculs.js';

let intCount   = 0;
let pauseCount = 0;

function notifierChangement() {
    document.dispatchEvent(new CustomEvent('form:changed'));
}

// ── Interventions & Pauses ─────────────────────────────────────

export function ajouterIntervention(data = {}) {
    intCount++;
    const n = intCount;
    const div = document.createElement('div');
    div.className    = 'intervention-card';
    div.id           = `int-card-${n}`;
    div.dataset.type = 'intervention';
    div.innerHTML = `
        <div class="int-header">
            <span class="int-number">Intervention #${n}</span>
            <div class="int-actions">
                <button class="btn-move btn-move-up" title="Monter">&#9650;</button>
                <button class="btn-move btn-move-down" title="Descendre">&#9660;</button>
                <button class="btn-remove">&#10005; Supprimer</button>
            </div>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Heure d'arrivée</label>
                <input type="time" id="i${n}-arrivee">
            </div>
            <div class="form-group">
                <label>Heure de départ</label>
                <input type="time" id="i${n}-depart">
            </div>
            <div class="form-group">
                <label>Nom du client</label>
                <input type="text" id="i${n}-client" placeholder="Nom du client" class="uppercase-input">
            </div>
            <div class="form-group">
                <label>Ville</label>
                <input type="text" id="i${n}-ville" placeholder="Ville" class="uppercase-input">
            </div>
            <div class="form-group" style="grid-column:1/-1">
                <label>Type d'intervention</label>
                <div class="type-btn-group">
                    <button type="button" class="type-btn" data-value="Sanitation">Sanitation</button>
                    <button type="button" class="type-btn" data-value="Dépannage">Dépannage</button>
                    <button type="button" class="type-btn" data-value="Installation">Installation</button>
                    <button type="button" class="type-btn" data-value="Devis">Devis</button>
                </div>
            </div>
            <div class="type-extra-row" id="i${n}-extra" style="display:none">
                <div class="form-group" id="i${n}-becs-group">
                    <label>Nombre de becs</label>
                    <input type="number" id="i${n}-becs" min="0" max="30" step="1" placeholder="0">
                </div>
                <div class="form-group" id="i${n}-mo-group">
                    <label>Main d'oeuvre</label>
                    <select id="i${n}-mo">
                        <option value="">-- Durée --</option>
                        <option value="0h30">0h30</option>
                        <option value="1h00">1h00</option>
                        <option value="1h30">1h30</option>
                        <option value="2h00">2h00</option>
                        <option value="2h30">2h30</option>
                        <option value="3h00">3h00</option>
                        <option value="3h30">3h30</option>
                        <option value="4h00">4h00</option>
                        <option value="4h30">4h30</option>
                        <option value="5h00">5h00</option>
                        <option value="5h30">5h30</option>
                        <option value="6h00">6h00</option>
                        <option value="6h30">6h30</option>
                        <option value="7h00">7h00</option>
                        <option value="7h30">7h30</option>
                        <option value="8h00">8h00</option>
                    </select>
                </div>
            </div>
            <div class="form-group" style="grid-column:1/-1">
                <label>Détails de l'intervention</label>
                <textarea id="i${n}-details" placeholder="Décrivez l'intervention effectuée…"></textarea>
            </div>
        </div>`;

    document.getElementById('interventions-list').appendChild(div);

    if (data.arrivee) document.getElementById(`i${n}-arrivee`).value = data.arrivee;
    if (data.depart)  document.getElementById(`i${n}-depart`).value  = data.depart;
    if (data.client)  document.getElementById(`i${n}-client`).value  = data.client;
    if (data.ville)   document.getElementById(`i${n}-ville`).value   = data.ville;
    if (data.details) document.getElementById(`i${n}-details`).value = data.details;

    if (data.typeInt) {
        const types = data.typeInt.split(',').map(t => t.trim()).filter(Boolean);
        div.querySelectorAll('.type-btn').forEach(btn => {
            if (types.includes(btn.dataset.value)) btn.classList.add('active');
        });
        majChampsConditionnels(n, div);
    }
    if (data.mo)   document.getElementById(`i${n}-mo`).value   = data.mo;
    if (data.becs) document.getElementById(`i${n}-becs`).value = data.becs;

    div.querySelector('.btn-remove').addEventListener('click', () => supprimerElement(`int-card-${n}`));
    div.querySelector('.btn-move-up').addEventListener('click', () => deplacerElement(div, -1));
    div.querySelector('.btn-move-down').addEventListener('click', () => deplacerElement(div, 1));

    div.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            majChampsConditionnels(n, div);
            notifierChangement();
        });
    });

    div.querySelectorAll('.uppercase-input').forEach(el => {
        el.addEventListener('input', () => { el.value = el.value.toUpperCase(); });
    });

    attachAutocomplete(document.getElementById(`i${n}-client`), CLIENTS_KEY);
    attachAutocomplete(document.getElementById(`i${n}-ville`),  VILLES_KEY,
        () => { const el = document.getElementById(`i${n}-client`); return el ? el.value : ''; });

    div.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', notifierChangement);
    });

    return div;
}

function majChampsConditionnels(n, card) {
    const actifs = Array.from(card.querySelectorAll('.type-btn.active')).map(b => b.dataset.value);
    const hasDepannage  = actifs.includes('Dépannage');
    const hasSanitation = actifs.includes('Sanitation');

    const extraRow  = document.getElementById(`i${n}-extra`);
    const moGroup   = document.getElementById(`i${n}-mo-group`);
    const becsGroup = document.getElementById(`i${n}-becs-group`);

    if (moGroup)   moGroup.style.display   = hasDepannage  ? '' : 'none';
    if (becsGroup) becsGroup.style.display = hasSanitation ? '' : 'none';
    if (extraRow)  extraRow.style.display  = (hasDepannage || hasSanitation) ? 'flex' : 'none';

    if (!hasDepannage) {
        const mo = document.getElementById(`i${n}-mo`);
        if (mo) mo.value = '';
    }
    if (!hasSanitation) {
        const becs = document.getElementById(`i${n}-becs`);
        if (becs) becs.value = '';
    }
}

export function ajouterPause(data = {}) {
    pauseCount++;
    const n = pauseCount;
    const div = document.createElement('div');
    div.className    = 'pause-card';
    div.id           = `pause-card-${n}`;
    div.dataset.type = 'pause';
    div.innerHTML = `
        <div class="int-header">
            <span class="pause-number">&#9208; Pause</span>
            <div class="int-actions">
                <button class="btn-move btn-move-up" title="Monter">&#9650;</button>
                <button class="btn-move btn-move-down" title="Descendre">&#9660;</button>
                <button class="btn-remove">&#10005; Supprimer</button>
            </div>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Heure de début</label>
                <input type="time" id="p${n}-debut">
            </div>
            <div class="form-group">
                <label>Heure de fin</label>
                <input type="time" id="p${n}-fin">
            </div>
        </div>`;

    document.getElementById('interventions-list').appendChild(div);

    if (data.debut) document.getElementById(`p${n}-debut`).value = data.debut;
    if (data.fin)   document.getElementById(`p${n}-fin`).value   = data.fin;

    div.querySelector('.btn-remove').addEventListener('click', () => supprimerElement(`pause-card-${n}`));
    div.querySelector('.btn-move-up').addEventListener('click', () => deplacerElement(div, -1));
    div.querySelector('.btn-move-down').addEventListener('click', () => deplacerElement(div, 1));

    div.querySelectorAll('input').forEach(el => {
        el.addEventListener('input', notifierChangement);
    });

    return div;
}

export function supprimerElement(id) {
    const el = document.getElementById(id);
    if (el) { el.remove(); renumeroterInterventions(); notifierChangement(); }
}

export function deplacerElement(card, direction) {
    const list = document.getElementById('interventions-list');
    if (direction < 0) {
        const prev = card.previousElementSibling;
        if (prev) list.insertBefore(card, prev);
    } else {
        const next = card.nextElementSibling;
        if (next) list.insertBefore(next, card);
    }
    renumeroterInterventions();
    notifierChangement();
}

function renumeroterInterventions() {
    let n = 0;
    document.querySelectorAll('#interventions-list > div').forEach(card => {
        if (card.dataset.type === 'intervention') {
            n++;
            const lbl = card.querySelector('.int-number');
            if (lbl) lbl.textContent = `Intervention #${n}`;
        }
    });
}

export function lireTousLesElements() {
    const items = [];
    let intNum = 0;
    document.querySelectorAll('#interventions-list > div').forEach(card => {
        const rawId = card.id.replace('int-card-', '').replace('pause-card-', '');
        if (card.dataset.type === 'intervention') {
            intNum++;
            items.push({
                kind:    'intervention',
                num:     intNum,
                arrivee: document.getElementById(`i${rawId}-arrivee`)?.value  || '',
                depart:  document.getElementById(`i${rawId}-depart`)?.value   || '',
                client:  document.getElementById(`i${rawId}-client`)?.value   || '',
                ville:   document.getElementById(`i${rawId}-ville`)?.value    || '',
                typeInt: Array.from(card.querySelectorAll('.type-btn.active')).map(b => b.dataset.value).join(','),
                mo:      document.getElementById(`i${rawId}-mo`)?.value       || '',
                becs:    document.getElementById(`i${rawId}-becs`)?.value     || '',
                details: document.getElementById(`i${rawId}-details`)?.value  || '',
            });
        } else if (card.dataset.type === 'pause') {
            items.push({
                kind:  'pause',
                debut: document.getElementById(`p${rawId}-debut`)?.value || '',
                fin:   document.getElementById(`p${rawId}-fin`)?.value   || '',
            });
        }
    });

    // Rappel / sortie supplémentaire (bloc unique, horaires seuls)
    const rDebut = document.getElementById('rappel-debut')?.value || '';
    const rFin   = document.getElementById('rappel-fin')?.value   || '';
    if (rDebut || rFin) items.push({ kind: 'rappel', debut: rDebut, fin: rFin });

    return items;
}

// ── Rappel / sortie supplémentaire ─────────────────────────────

export function afficherBlocRappel() {
    const bloc = document.getElementById('bloc-rappel');
    bloc?.classList.remove('hidden');
    document.getElementById('btn-rappel')?.classList.add('hidden');
    setTimeout(() => bloc?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

export function viderRappel() {
    const d = document.getElementById('rappel-debut');
    const f = document.getElementById('rappel-fin');
    if (d) d.value = '';
    if (f) f.value = '';
    document.getElementById('bloc-rappel')?.classList.add('hidden');
    document.getElementById('btn-rappel')?.classList.remove('hidden');
}

export function remplirRappel(data = {}) {
    const d = document.getElementById('rappel-debut');
    const f = document.getElementById('rappel-fin');
    if (d) d.value = data.debut || '';
    if (f) f.value = data.fin   || '';
    if (data.debut || data.fin) afficherBlocRappel();
}

// ── Réinitialisation ───────────────────────────────────────────

export function viderInterventions() {
    document.getElementById('interventions-list').innerHTML = '';
    intCount   = 0;
    pauseCount = 0;
    viderRappel();
}

export function resetSuppState() {
    setSuppManuel(false);
    const input = document.getElementById('heures-supp');
    input.classList.add('auto-field');
    input.classList.remove('auto-field-manual');
    document.getElementById('btn-supp-auto').style.display = 'none';
}
