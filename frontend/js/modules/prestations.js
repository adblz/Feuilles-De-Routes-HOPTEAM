// ── Métiers et prestations : seule source de vérité ────────────────────
// Une intervention = une visite chez un client, avec une ou plusieurs
// prestations, chacune rattachée à un métier. En base, `type_int` est la
// liste « Métier · Prestation » séparée par des virgules ; chaque valeur
// compte pour UNE prestation. Les anciennes valeurs sans métier
// (« Sanitation ») sont conservées telles quelles (metier = '').

export const METIERS = ['Bière', 'Café', 'Arrière-bar'];

const PRESTATIONS = {
    'Bière':       ['Sanitation', 'Dépannage', 'Installation', 'Devis'],
    'Café':        ['Joint-douchette', 'Dépannage', 'Installation', 'Devis'],
    'Arrière-bar': ['Dépannage', 'Installation', 'Devis'],
};

// Séparateur entre métier et prestation (espace · espace : aucun libellé ne le contient).
export const SEPARATEUR = ' · ';

export function prestationsPour(metier) {
    return PRESTATIONS[metier] || [];
}

// « Bière · Sanitation,Café · Joint-douchette » → [{ metier, presta }, …]
export function decouperTypeInt(typeInt) {
    return String(typeInt || '').split(',').map(s => s.trim()).filter(Boolean).map(valeur => {
        const i = valeur.indexOf(SEPARATEUR);
        if (i === -1) return { metier: '', presta: valeur };
        return { metier: valeur.slice(0, i), presta: valeur.slice(i + SEPARATEUR.length) };
    });
}

// Inverse de decouperTypeInt : [{ metier, presta }] → chaîne à enregistrer.
export function assemblerTypeInt(liste) {
    return liste.map(({ metier, presta }) => metier ? `${metier}${SEPARATEUR}${presta}` : presta).join(',');
}

// Valeur brute d'un élément, qu'il vienne de Supabase (type_int) ou du formulaire (typeInt).
const typeIntDe = el => (el && (el.type_int ?? el.typeInt)) || '';

// Libellés lisibles : ['Bière · Sanitation', 'Café · Joint-douchette'].
export function libellesPrestations(el) {
    return decouperTypeInt(typeIntDe(el)).map(p => p.metier ? `${p.metier}${SEPARATEUR}${p.presta}` : p.presta);
}

// Une ligne intervention compte au moins 1 prestation, même sans type saisi.
export function nbPrestations(el) {
    return Math.max(1, decouperTypeInt(typeIntDe(el)).length);
}

export function nbPrestationsFeuille(elements) {
    return (elements || []).filter(el => el.kind === 'intervention').reduce((n, el) => n + nbPrestations(el), 0);
}

export function texteNbPrestations(n) {
    return `${n} prestation${n > 1 ? 's' : ''}`;
}

// Champs conditionnels de la carte, à partir de la liste [{ metier, presta }].
const contient = (liste, metier, presta) => liste.some(p => p.presta === presta && p.metier === metier);

export const afficheBecs    = liste => contient(liste, 'Bière', 'Sanitation');
export const afficheGroupes = liste => contient(liste, 'Café', 'Joint-douchette');
// Une main d'œuvre par métier, affichée quand ce métier a un Dépannage.
export const afficheMo      = (liste, metier) => contient(liste, metier, 'Dépannage');

// Colonne (base) et clé (formulaire) de la main d'œuvre de chaque métier.
// `mo` reste celle de la bière : c'est l'ancienne colonne unique.
const COLONNE_MO = { 'Bière': 'mo', 'Café': 'mo_cafe', 'Arrière-bar': 'mo_bar' };
export const colonneMo = metier => COLONNE_MO[metier];

// Libellés des mains d'œuvre saisies : ['MO Bière : 1h00', 'MO Café : 0h30'].
// Ancienne ligne sans métier (« Sanitation,Dépannage ») : « MO : 1h00 » comme avant.
export function libellesMo(el) {
    if (!el) return [];
    const ancien = decouperTypeInt(typeIntDe(el)).every(p => !p.metier);
    return METIERS
        .filter(m => el[colonneMo(m)])
        .map(m => ancien ? `MO : ${el[colonneMo(m)]}` : `MO ${m} : ${el[colonneMo(m)]}`);
}
