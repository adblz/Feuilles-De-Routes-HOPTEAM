import { validerFormulaire, setBusy, showToast } from '../utils/utils.js';
import { cfg, seuilJour, lireTousLesElements, getLogoBase64 } from './fdr.js';
import { sauvegarderEnBase } from './db.js';
import { memoriserValeurs } from './autocomplete.js';
import { afficherPdfBlob } from './pdfviewer.js';

// Convertit un Blob PDF en chaîne base64 (data URL), pour stockage en base.
export function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

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

    const itemsHTML = items.map(item => {
        if (item.kind === 'intervention') {
            return `
            <div class="pdf-int">
                <div class="pdf-int-head">
                    <span>Intervention #${item.num} &mdash; ${item.client || '—'}${item.ville ? ' (' + item.ville + ')' : ''}</span>
                    ${item.typeInt ? `<span class="pdf-int-badge">${item.typeInt}</span>` : ''}
                </div>
                <div class="pdf-int-body">
                    <div class="pdf-field"><div class="lbl">Arrivée</div><div class="val">${item.arrivee || '—'}</div></div>
                    <div class="pdf-field"><div class="lbl">Départ</div><div class="val">${item.depart || '—'}</div></div>
                    <div class="pdf-field"><div class="lbl">Type</div><div class="val">${item.typeInt || '—'}</div></div>
                    <div class="pdf-field"><div class="lbl">Main d'oeuvre</div><div class="val">${item.mo || '—'}</div></div>
                    ${item.details ? `<div class="pdf-details-row"><div class="lbl">Détails</div>${item.details}</div>` : ''}
                </div>
            </div>`;
        } else {
            return `
            <div class="pdf-pause">
                <div class="pdf-pause-head">
                    <span>Pause</span>
                    <span>${item.debut || '—'} &rarr; ${item.fin || '—'}</span>
                </div>
                <div class="pdf-pause-body">
                    <div class="pdf-field"><div class="lbl">Début</div><div class="val">${item.debut || '—'}</div></div>
                    <div class="pdf-field"><div class="lbl">Fin</div><div class="val">${item.fin || '—'}</div></div>
                </div>
            </div>`;
        }
    }).join('');

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
            <div class="pdf-hour-box">
                <div class="lbl">Début journée</div>
                <div class="val">${debut}</div>
            </div>
            <div class="pdf-hour-box">
                <div class="lbl">Fin journée</div>
                <div class="val">${fin}</div>
            </div>
            <div class="pdf-hour-box">
                <div class="lbl">Pause repas</div>
                <div class="val">${repas}</div>
            </div>
            <div class="pdf-hour-box supp">
                <div class="lbl">Heures trav. (−1h trajet)</div>
                <div class="val">${travail}</div>
            </div>
        </div>

        ${suppBanner}

        <div class="pdf-section-title">Interventions &amp; Pauses (${nbInts} intervention${nbInts > 1 ? 's' : ''})</div>
        ${itemsHTML}

        <div class="pdf-footer">
            ${cfg.company ? cfg.company + ' &mdash; ' : ''}Feuille de route du ${dateAff} &mdash; ${tech}
        </div>`;
}

export function nomFichierPdf() {
    const tech = document.getElementById('technicien').value || 'technicien';
    const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];
    return `feuille-route_${tech.replace(/\s+/g, '-').toLowerCase()}_${date}.pdf`;
}

export function preparerPdfElement() {
    const scrollPrev = { x: window.scrollX, y: window.scrollY };
    window.scrollTo(0, 0);

    const el = document.createElement('div');
    el.className = 'pdf-wrap';
    el.style.cssText = 'position:absolute;top:0;left:0;width:794px;background:white;';
    el.innerHTML = construirePDF();
    document.body.appendChild(el);

    const w = el.offsetWidth  || 794;
    const h = el.offsetHeight;

    const nettoyer = () => {
        if (document.body.contains(el)) document.body.removeChild(el);
        window.scrollTo(scrollPrev.x, scrollPrev.y);
    };

    const opts = {
        margin:      [8, 8, 8, 8],
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
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-int', '.pdf-pause'] }
    };

    return { el, opts, nettoyer };
}

export function genererPDF() {
    if (typeof html2pdf === 'undefined') {
        alert('La librairie html2pdf ne s\'est pas chargée.\n\n'
            + 'Vérifiez votre connexion ou désactivez uBlock, puis rechargez la page (F5).');
        return Promise.reject();
    }

    validerFormulaire();

    setBusy(true, 'Génération du PDF en cours…');
    const { el, opts, nettoyer } = preparerPdfElement();

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            html2pdf()
                .set(opts)
                .from(el)
                .outputPdf('blob')
                .then(async (blob) => {
                    nettoyer();

                    // Affichage immédiat à l'écran (aucun téléchargement sur l'appareil).
                    afficherPdfBlob(blob);

                    const elements = lireTousLesElements();
                    memoriserValeurs(elements);

                    setBusy(true, 'Enregistrement sur le cloud…');
                    try {
                        const pdfData = await blobToBase64(blob);
                        await sauvegarderEnBase({
                            date:          document.getElementById('date').value,
                            tech:          document.getElementById('technicien').value || '',
                            company:       cfg.company,
                            contrat:       cfg.contrat,
                            heureDebut:    document.getElementById('heure-debut').value,
                            heureFin:      document.getElementById('heure-fin').value,
                            repasMin:      document.getElementById('repas').value,
                            heuresTravail: document.getElementById('heures-travail').value,
                            heuresSupp:    document.getElementById('heures-supp').value,
                            mode:          'pdf',
                            pdfData,
                            elements,
                        });
                        setBusy(false);
                        showToast('PDF enregistré dans l\'historique', 'success', 3000);
                    } catch (e) {
                        console.warn('Supabase save failed:', e);
                        setBusy(false);
                        showToast('PDF affiché, mais l\'enregistrement a échoué', 'warn', 4000);
                    }

                    resolve(nomFichierPdf());
                })
                .catch(err => {
                    nettoyer();
                    setBusy(false);
                    alert('Erreur lors de la génération du PDF :\n\n' + (err?.message || err));
                    reject(err);
                });
        }, 250);
    });
}
