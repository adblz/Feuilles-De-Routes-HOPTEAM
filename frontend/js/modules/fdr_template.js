// HTML des cartes du formulaire (intervention, pause). Aucune logique ici :
// le comportement est branché par fdr_form.js, fdr_prestations.js et fdr_champs_extra.js.
import { ICON_SUPPRIMER } from '../utils/utils.js';
import { METIERS } from './prestations.js';

// Poignée « ≡ » (glisser pour déplacer) + corbeille, communes aux interventions et aux pauses.
const ACTIONS_HTML = `
    <button type="button" class="btn-drag" title="Glisser pour déplacer" aria-label="Déplacer">&#8801;</button>
    <button type="button" class="btn-remove" title="Supprimer" aria-label="Supprimer">${ICON_SUPPRIMER}</button>`;

// Durées de main d'œuvre proposées : 0h30, 1h00, … 8h00.
const OPTIONS_MO = Array.from({ length: 16 }, (_, i) => {
    const min = (i + 1) * 30;
    const v = `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
    return `<option value="${v}">${v}</option>`;
}).join('');

const BOUTONS_METIER = METIERS.map(m =>
    `<button type="button" class="type-btn metier-btn" data-value="${m}" data-coches="">${m}<span class="nb"></span></button>`
).join('');

const BOUTONS_GROUPES = [1, 2, 3, 4].map(g =>
    `<button type="button" class="type-btn groupe-btn" data-value="${g}">${g}</button>`
).join('');

export function templateIntervention(n) {
    return `
        <div class="int-header">
            <span class="int-number">Intervention #${n}</span>
            <div class="int-actions">${ACTIONS_HTML}</div>
        </div>
        <div class="card-summary"></div>
        <div class="form-grid form-grid-carte">
            <div class="form-group">
                <label>Heure d'arrivée</label>
                <input type="time" id="i${n}-arrivee" class="heure-molette">
            </div>
            <div class="form-group">
                <label>Heure de départ</label>
                <input type="time" id="i${n}-depart" class="heure-molette">
            </div>
            <div class="form-group form-group-full">
                <label>Nom du client</label>
                <input type="text" id="i${n}-client" placeholder="Nom du client" class="uppercase-input" autocomplete="off">
            </div>
            <div class="form-group form-group-full">
                <label>Ville</label>
                <input type="text" id="i${n}-ville" placeholder="Ville" class="uppercase-input" autocomplete="off">
            </div>
            <div class="form-group form-group-full">
                <label>Métier</label>
                <div class="type-btn-group metier-btn-group" id="i${n}-metiers">${BOUTONS_METIER}</div>
            </div>
            <div class="form-group form-group-full hidden" id="i${n}-prestas-group">
                <label id="i${n}-prestas-label">Prestations</label>
                <div class="type-btn-group presta-btn-group" id="i${n}-prestas"></div>
            </div>
            <div class="type-extra-row hidden" id="i${n}-extra">
                <div class="form-group hidden" id="i${n}-becs-group">
                    <label>Nombre de becs</label>
                    <input type="number" id="i${n}-becs" min="0" max="30" step="1" placeholder="0">
                </div>
                <div class="form-group hidden" id="i${n}-groupes-group">
                    <label>Nombre de groupes</label>
                    <div class="type-btn-group groupes-btn-group" id="i${n}-groupes">${BOUTONS_GROUPES}</div>
                </div>
                <div class="form-group hidden" id="i${n}-mo-group">
                    <label>Main d'oeuvre</label>
                    <select id="i${n}-mo">
                        <option value="">-- Durée --</option>
                        ${OPTIONS_MO}
                    </select>
                </div>
            </div>
            <div class="form-group form-group-full">
                <label>Détails de l'intervention</label>
                <textarea id="i${n}-details" placeholder="Décrivez l'intervention effectuée…"></textarea>
            </div>
        </div>`;
}

export function templatePause(n) {
    return `
        <div class="int-header">
            <span class="pause-number">&#9208; Pause</span>
            <div class="int-actions">${ACTIONS_HTML}</div>
        </div>
        <div class="card-summary"></div>
        <div class="form-grid form-grid-carte">
            <div class="form-group">
                <label>Heure de début</label>
                <input type="time" id="p${n}-debut" class="heure-molette">
            </div>
            <div class="form-group">
                <label>Heure de fin</label>
                <input type="time" id="p${n}-fin" class="heure-molette">
            </div>
        </div>`;
}
