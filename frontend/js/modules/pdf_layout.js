import { cfg, seuilJour, lireTousLesElements, getLogoBase64 } from './fdr.js';
import { renderItems } from './pdf_items.js';
import { dureeCourte } from '../utils/utils.js';

export function construirePDF() {
    const dateVal = document.getElementById('date').value;
    const tech    = document.getElementById('technicien').value || '—';
    const debut   = document.getElementById('heure-debut').value || '—';
    const fin     = document.getElementById('heure-fin').value   || '—';
    const repas   = document.getElementById('repas').value ? document.getElementById('repas').value + ' min' : '—';
    const travail = document.getElementById('heures-travail').value || '—';
    const supp    = document.getElementById('heures-supp').value   || '0h00';
    const items   = lireTousLesElements();
    const nbInts  = items.filter(i => i.kind === 'intervention').length;

    const dateAff = dateVal
        ? new Date(dateVal + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '—';

    const rappel    = items.find(i => i.kind === 'rappel');
    const itemsHTML = renderItems(items);
    const astreinteJour = document.getElementById('astreinte-jour')?.checked;
    const astreinte     = astreinteJour || !!(rappel && rappel.astreinte);

    const suppBanner = (supp && supp !== '0h00')
        ? `<div class="pdf-supp-banner">Heures supplémentaires : ${supp}</div>`
        : '';

    const logoB64  = getLogoBase64();
    const logoHtml = logoB64
        ? `<img src="${logoB64}" style="height:44px;width:auto;display:block;margin-bottom:6px;">`
        : '';

    return `
        <div class="pdf-top">
            <div>
                <div class="pdf-title">Feuille de Route</div>
                <div class="pdf-date-line">${dateAff}</div>
                ${astreinte ? `<div style="display:inline-block;margin-top:4px;background:#dcfce7;color:#15803d;font-weight:700;font-size:11px;padding:2px 8px;border-radius:6px;letter-spacing:0.04em;">ASTREINTE</div>` : ''}
            </div>
            <div class="pdf-company-block">
                ${logoHtml}
                ${cfg.company ? `<strong>${cfg.company}</strong><br>` : ''}
                <span style="color:#888;">Généré le ${new Date().toLocaleDateString('fr-FR')}</span>
            </div>
        </div>

        <div class="pdf-technicien-row" style="display:flex;justify-content:space-between;align-items:center;">
            <span>Technicien : ${tech}</span>
            <span style="font-size:11px;font-weight:400;color:#4a5568;">Contrat ${cfg.contrat}h &mdash; seuil ${seuilJour() / 60}h ce jour</span>
        </div>

        <div class="pdf-hours-row">
            <div class="pdf-hour-box"><div class="lbl">Début journée</div><div class="val">${debut}</div></div>
            <div class="pdf-hour-box"><div class="lbl">Fin journée</div><div class="val">${fin}</div></div>
            <div class="pdf-hour-box repas"><div class="lbl">Pause repas</div><div class="val">${repas}</div></div>
            <div class="pdf-hour-box supp"><div class="lbl">${astreinteJour ? 'Heures travaillées (astreinte)' : 'Heures trav. (−1h trajet)'}</div><div class="val">${travail}</div></div>
        </div>
${rappel ? `
        <div class="pdf-hours-row">
            <div class="pdf-hour-box"><div class="lbl">Sortie suppl.${rappel.astreinte ? ' (astreinte)' : ''} — départ</div><div class="val">${rappel.debut || '—'}</div></div>
            <div class="pdf-hour-box"><div class="lbl">Sortie suppl. — retour</div><div class="val">${rappel.fin || '—'}</div></div>
            ${dureeCourte(rappel.debut, rappel.fin) ? `<div class="pdf-hour-box supp"><div class="lbl">Durée sortie</div><div class="val">${dureeCourte(rappel.debut, rappel.fin)}</div></div>` : ''}
        </div>` : ''}

        ${suppBanner}

        <div class="pdf-section-title">Interventions &amp; Pauses (${nbInts} intervention${nbInts > 1 ? 's' : ''})</div>
        ${itemsHTML}`;
}

export function nomFichierPdf() {
    const tech     = document.getElementById('technicien').value || 'technicien';
    const date     = document.getElementById('date').value || new Date().toISOString().split('T')[0];
    const techSlug = tech.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').toLowerCase();
    return `feuille-route_${techSlug}_${date}.pdf`;
}

// Largeur utile A4 portrait (210mm − marges) convertie en pixels à 96 dpi.
const PDF_MARGIN_MM        = 8;
const PDF_CONTENT_WIDTH_PX = Math.floor((210 - 2 * PDF_MARGIN_MM) * 96 / 25.4);

export function preparerPdfElement() {
    const scrollPrev = { x: window.scrollX, y: window.scrollY };
    window.scrollTo(0, 0);

    const el = document.createElement('div');
    el.className  = 'pdf-wrap';
    el.style.cssText = `position:absolute;top:0;left:0;width:${PDF_CONTENT_WIDTH_PX}px;background:white;`;
    el.innerHTML  = construirePDF();
    document.body.appendChild(el);

    const w = el.offsetWidth  || PDF_CONTENT_WIDTH_PX;
    const h = el.offsetHeight;

    const nettoyer = () => {
        if (document.body.contains(el)) document.body.removeChild(el);
        window.scrollTo(scrollPrev.x, scrollPrev.y);
    };

    const opts = {
        margin:      [PDF_MARGIN_MM, PDF_MARGIN_MM, PDF_MARGIN_MM, PDF_MARGIN_MM],
        filename:    nomFichierPdf(),
        image:       { type: 'jpeg', quality: 0.97 },
        html2canvas: {
            scale: 2, useCORS: true, logging: false,
            backgroundColor: '#ffffff',
            width: w, height: h,
            windowWidth: w, windowHeight: h,
            scrollX: 0, scrollY: 0, x: 0, y: 0,
            onclone(clonedDoc) {
                clonedDoc.getElementById('loading-overlay').style.display = 'none';
            }
        },
        jsPDF:     { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-int', '.pdf-pause'] }
    };

    return { el, opts, nettoyer };
}
