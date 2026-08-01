// Après un changement de jour, la page est bien remise en haut — les mesures
// le confirment — mais iPhone garde parfois à l'écran le dessin d'avant le
// glissement : le contenu paraît décalé alors qu'il ne l'est pas. C'est un
// retard d'affichage, pas un problème de position.
//
// Le déplacement horizontal du contenu pendant le glissement fait passer la
// page en rendu accéléré, et l'en-tête collant reste dessiné à son ancienne
// place. On force donc iOS à tout redessiner une fois le changement terminé.

function auHaut() {
    // Selon les navigateurs ce n'est pas le même élément qui commande.
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

// Un vrai déplacement d'un pixel, puis retour : ça oblige le rendu à se
// resynchroniser, ce qu'une simple remise à zéro ne provoque pas.
function secouerAffichage() {
    window.scrollTo(0, 1);
    requestAnimationFrame(() => {
        auHaut();
        // L'en-tête collant est le plus souvent en retard : on le fait
        // repasser par une couche de rendu neuve pour qu'il se replace.
        const entete = document.querySelector('header');
        if (!entete) return;
        entete.style.transform = 'translateZ(0)';
        requestAnimationFrame(() => { entete.style.transform = ''; });
    });
}

export function remonterEnHaut() {
    auHaut();
    requestAnimationFrame(secouerAffichage);
}
