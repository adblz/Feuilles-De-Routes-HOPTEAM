// Le PDF est une grande image découpée en pages A4 : seule la page 1 porte
// l'en-tête (date, technicien). On réécrit donc un rappel discret en haut des
// pages suivantes, sinon les pages 2 de plusieurs feuilles imprimées ensemble
// deviennent impossibles à distinguer.

const MARGE_MM = 8;   // identique à PDF_MARGIN_MM (pdf_layout.js)
const BASE_Y   = 5.2; // ligne de texte dans la marge haute, au-dessus du contenu

// `prefixe` : titre rappelé en haut des pages suivantes. « Feuille de Route »
// pour une journée, « Récapitulatif » pour le PDF mensuel.
export function ajouterRappelPages(pdf, { dateAff, tech }, prefixe = 'Feuille de Route') {
    const total = pdf.internal.getNumberOfPages();
    if (total < 2) return;

    const largeur = pdf.internal.pageSize.getWidth();

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(120);

    for (let i = 2; i <= total; i++) {
        pdf.setPage(i);
        pdf.text(`${prefixe} — ${dateAff} — ${tech}`, MARGE_MM, BASE_Y);
        pdf.text(`Page ${i}/${total}`, largeur - MARGE_MM, BASE_Y, { align: 'right' });
    }

    pdf.setTextColor(0);
}
