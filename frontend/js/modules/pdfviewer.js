// Affiche un PDF à l'écran dans une fenêtre modale (lecture seule, aucun téléchargement).

let currentUrl = null;

// Convertit une chaîne base64 (avec ou sans préfixe « data:application/pdf;base64, ») en Blob PDF.
function base64ToBlob(b64, type = 'application/pdf') {
    const pur   = b64.includes(',') ? b64.split(',').pop() : b64;
    const bin   = atob(pur);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
}

export function afficherPdfBlob(blob) {
    const modal = document.getElementById('modal-pdf');
    const frame = document.getElementById('pdf-viewer-frame');
    const lien  = document.getElementById('pdf-viewer-open');

    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(blob);

    frame.src = currentUrl;
    lien.href = currentUrl;
    modal.classList.add('open');
}

export function afficherPdfBase64(b64) {
    afficherPdfBlob(base64ToBlob(b64));
}

export function fermerPdfViewer() {
    const modal = document.getElementById('modal-pdf');
    const frame = document.getElementById('pdf-viewer-frame');
    modal.classList.remove('open');
    frame.src = 'about:blank';
    if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
}
