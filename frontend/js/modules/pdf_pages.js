// Le PDF est une grande image découpée en pages A4 : seule la page 1 porte
// l'en-tête (date, technicien). On réécrit donc un rappel discret en haut des
// pages suivantes, sinon les pages 2 de plusieurs feuilles imprimées ensemble
// deviennent impossibles à distinguer.

const MARGE_MM = 8;   // identique à PDF_MARGIN_MM (pdf_layout.js)
const BASE_Y   = 5.2; // ligne de texte dans la marge haute, au-dessus du contenu

export function ajouterRappelPages(pdf, { dateAff, tech }) {
    const total = pdf.internal.getNumberOfPages();
    if (total < 2) return;

    const largeur = pdf.internal.pageSize.getWidth();

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(120);

    for (let i = 2; i <= total; i++) {
        pdf.setPage(i);
        pdf.text(`Feuille de Route — ${dateAff} — ${tech}`, MARGE_MM, BASE_Y);
        pdf.text(`Page ${i}/${total}`, largeur - MARGE_MM, BASE_Y, { align: 'right' });
    }

    pdf.setTextColor(0);
}
