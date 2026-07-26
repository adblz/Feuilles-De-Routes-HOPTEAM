// Bulle d'info ancrée sur un bloc de la frise, avec une flèche qui pointe dessus.
// Remplace le toast générique : la bulle apparaît juste au-dessus (ou en dessous)
// du bloc cliqué et reste visible jusqu'au prochain clic ailleurs.

let tip, texteEl, fleche;

function creerBulle() {
    tip = document.createElement('div');
    tip.className = 'heures-tip';
    tip.innerHTML = '<span class="heures-tip-texte"></span><span class="heures-tip-fleche"></span>';
    texteEl = tip.querySelector('.heures-tip-texte');
    fleche  = tip.querySelector('.heures-tip-fleche');
    document.body.appendChild(tip);

    // Fermeture : clic hors d'un bloc, défilement, redimensionnement, Échap.
    document.addEventListener('click', e => {
        if (!e.target.closest('.heures-bloc')) cacher();
    }, true);
    window.addEventListener('scroll', cacher, true);
    window.addEventListener('resize', cacher);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cacher(); });
}

// Retire la mise en avant : le bloc actif et la sourdine sur le reste de la frise.
function retirerFocus() {
    document.querySelectorAll('.heures-bloc.est-actif').forEach(b => b.classList.remove('est-actif'));
    document.querySelectorAll('.heures-timeline.a-focus').forEach(t => t.classList.remove('a-focus'));
}

export function cacher() {
    tip?.classList.remove('visible');
    retirerFocus();
}

export function montrerInfoBloc(bloc, txt) {
    if (!tip) creerBulle();
    texteEl.textContent = txt;
    tip.classList.add('visible');   // rendu visible pour pouvoir le mesurer

    // Met le bloc cliqué en avant et le reste de la frise en sourdine.
    retirerFocus();
    bloc.classList.add('est-actif');
    bloc.closest('.heures-timeline')?.classList.add('a-focus');

    const r     = bloc.getBoundingClientRect();
    const tr    = tip.getBoundingClientRect();
    const marge = 8;
    const centreX = r.left + r.width / 2;

    // Horizontal : centré sur le bloc, mais borné aux bords de l'écran.
    let left = centreX - tr.width / 2;
    left = Math.max(marge, Math.min(left, window.innerWidth - tr.width - marge));

    // Vertical : au-dessus du bloc si la place existe, sinon en dessous.
    const sous = r.top < tr.height + 14;
    const top  = sous ? r.bottom + 10 : r.top - tr.height - 10;

    tip.style.left = `${left}px`;
    tip.style.top  = `${top}px`;
    tip.classList.toggle('sous', sous);

    // La flèche pointe vers le centre du bloc, même si la bulle est décalée.
    const fx = Math.max(12, Math.min(centreX - left, tr.width - 12));
    fleche.style.left = `${fx}px`;
}
