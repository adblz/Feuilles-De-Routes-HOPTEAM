# Brief — Refonte de l'écran « Heures par semaine »

## Contexte

Écran actuel : un tableau à 7 colonnes (Semaine / Jours / Travaillé / Supp. / Nuit / 25% / 50%) affiché sur mobile (~380px de large). Le tableau est illisible : la typo est écrasée, les cellules vides sont remplies de tirets, et le chiffre qui compte vraiment (le total d'heures supp du mois) est relégué en bas en petit.

**Objectif : refaire cet écran en gardant strictement le thème sombre existant de l'appli.** La maquette ci-dessous est une référence de *structure et de hiérarchie*, pas de couleurs — les couleurs doivent être reprises du design system de l'appli.

---

## Principes à respecter

1. **Le total d'abord.** Le total d'heures supp du mois devient le héros de l'écran, en gros, tout en haut sous le sélecteur de période. Le total « travaillé » l'accompagne, mais en secondaire (plus petit, à droite).

2. **Une carte par semaine, plus de tableau.** 7 colonnes ne rentrent pas dans 380px. Chaque semaine devient une carte autonome. Avantage : quand une donnée n'existe pas, on ne l'affiche pas du tout au lieu d'afficher un `—`.

3. **Une barre de progression par semaine.** Barre horizontale empilée : base (35h) + tranche 25% + tranche 50%. Permet de voir instantanément quelle semaine a débordé et de combien, sans comparer mentalement « 49h21 » et « 57h43 ».

4. **Les majorations en pastilles (badges), pas en texte coloré.** Fond teinté + texte de la même famille de couleur, plus foncé/plus clair selon le mode. Ça les identifie comme des étiquettes de catégorie et pas comme des alertes.

5. **Semaines incomplètes en retrait.** Une semaine partielle (ex. 3 jours) est affichée avec une opacité réduite (~0.85) et le libellé « Aucune heure supp. » au lieu d'une rangée de tirets.

6. **Pas de scroll horizontal, jamais.** Tout doit tenir dans la largeur.

---

## Structure de l'écran (de haut en bas)

```
[ Titre : Heures par semaine ]        [ icône calendrier ]
[ <select> période — pleine largeur ]

┌─ Carte résumé du mois ────────────────────┐
│  Heures supp. du mois        Travaillé    │
│  37h04  (gros, ~28px)        137h36       │
│                                           │
│  [Majo. 25%]  [Majo. 50%]  [Nuit]         │
│   16h00        21h04        1h55          │
└───────────────────────────────────────────┘

[ légende : ▪ Base 35h  ▪ 25%  ▪ 50% ]

┌─ Carte semaine (état : pas de supp) ──────┐
│  22 – 28 juin                    3 jours  │
│  ▰▰▰▰▰▰░░░░░░  (barre, base seule)        │
│  30h32 travaillées      Aucune heure supp.│
└───────────────────────────────────────────┘

┌─ Carte semaine (état : avec supp) ────────┐
│  29 juin – 5 juil.               5 jours  │
│  ▰▰▰▰▰▰▰▰▰▨▨▧▧  (base + 25% + 50%)        │
│  49h21 travaillées          +14h21 supp.  │
│  [25% · 8h00]  [50% · 6h21]               │
└───────────────────────────────────────────┘
```

---

## Modèle de données

Chaque semaine expose :

| Champ | Exemple | Note |
|---|---|---|
| `label` | `6 – 12 juil.` | libellé raccourci, pas « 6 juil. – 12 juil. » |
| `jours` | `5` | affiché « 5 jours » |
| `travaille` | `57h43` | minutes en interne |
| `supp` | `22h43` | = `travaille - 35h`, jamais négatif |
| `nuit` | `1h55` | optionnel, badge seulement si > 0 |
| `maj25` | `8h00` | optionnel |
| `maj50` | `14h43` | optionnel |

**Base contractuelle = 35h.** Les largeurs de la barre se calculent sur une échelle fixe (max 60h) pour que les semaines soient comparables entre elles :

```
largeur_base = min(travaille, 35h) / 60h
largeur_25   = maj25 / 60h
largeur_50   = maj50 / 60h
```

---

## Mapping des couleurs (à adapter au thème)

La maquette de référence utilise des couleurs neutres. **À remplacer par les tokens du thème sombre de l'appli** :

| Rôle dans la maquette | À remplacer par |
|---|---|
| Fond de carte | surface élevée du thème (le gris-bleu foncé des cartes existantes) |
| Bordure de carte | bordure subtile existante, ~0.5px |
| Texte principal / secondaire / tertiaire | tokens de texte existants |
| Segment « base » de la barre | gris neutre / couleur de surface plus claire |
| Segment 25% + badge 25% | **l'orange déjà utilisé** dans la colonne 25% actuelle |
| Segment 50% + badge 50% | **le rouge/corail déjà utilisé** dans la colonne 50% actuelle |
| Badge « Nuit » | une teinte froide distincte (violet/bleu), pas encore utilisée |
| Accent de la nav / logo | inchangé (orange de marque) |

Pour les badges : fond = version très désaturée / basse opacité de la couleur, texte = version claire de la même couleur. En thème sombre, typiquement `background: rgba(couleur, 0.15)` + `color: couleur-claire`. Ne pas mettre de texte noir ou gris sur un fond coloré.

---

## Maquette de référence (structure HTML)

À reprendre pour la structure et les espacements, **pas pour les couleurs**. Les valeurs `var(--color-*)` sont des placeholders à remplacer par les tokens de l'appli.

```html
<div class="ecran">
  <div class="entete">
    <span class="titre">Heures par semaine</span>
    <i class="icone-calendrier"></i>
  </div>

  <select class="selecteur-periode">
    <option>Mois de juillet (22/06 → 19/07)</option>
  </select>

  <!-- Carte résumé -->
  <div class="carte carte-resume">
    <div class="resume-ligne">
      <div>
        <div class="label">Heures supp. du mois</div>
        <div class="chiffre-hero">37h04</div>
      </div>
      <div class="align-droite">
        <div class="label">Travaillé</div>
        <div class="chiffre-secondaire">137h36</div>
      </div>
    </div>
    <div class="stats-majorations">
      <div class="stat stat-25"><span class="label">Majo. 25%</span><span class="valeur">16h00</span></div>
      <div class="stat stat-50"><span class="label">Majo. 50%</span><span class="valeur">21h04</span></div>
      <div class="stat stat-nuit"><span class="label">Nuit</span><span class="valeur">1h55</span></div>
    </div>
  </div>

  <div class="legende">
    <span><i class="puce puce-base"></i> Base 35h</span>
    <span><i class="puce puce-25"></i> 25%</span>
    <span><i class="puce puce-50"></i> 50%</span>
  </div>

  <!-- Carte semaine sans heures supp -->
  <div class="carte carte-semaine est-partielle">
    <div class="semaine-entete">
      <span class="semaine-label">22 – 28 juin</span>
      <span class="semaine-jours">3 jours</span>
    </div>
    <div class="barre">
      <div class="segment segment-base" style="width: 51%"></div>
    </div>
    <div class="semaine-pied">
      <span>30h32 travaillées</span>
      <span class="muet">Aucune heure supp.</span>
    </div>
  </div>

  <!-- Carte semaine avec heures supp -->
  <div class="carte carte-semaine">
    <div class="semaine-entete">
      <span class="semaine-label">6 – 12 juil.</span>
      <span class="semaine-jours">5 jours</span>
    </div>
    <div class="barre">
      <div class="segment segment-base" style="width: 58%"></div>
      <div class="segment segment-25"   style="width: 13%"></div>
      <div class="segment segment-50"   style="width: 24%"></div>
    </div>
    <div class="semaine-pied">
      <span>57h43 travaillées</span>
      <span class="fort">+22h43 supp.</span>
    </div>
    <div class="badges">
      <span class="badge badge-25">25% · 8h00</span>
      <span class="badge badge-50">50% · 14h43</span>
      <span class="badge badge-nuit">Nuit · 1h55</span>
    </div>
  </div>
</div>
```

### Repères de style

- Rayon des cartes : ~12px. Rayon des badges et des stats : ~8px. Barre : hauteur 10px, `border-radius: 5px`, `overflow: hidden`.
- Padding des cartes : `14px 16px`. Espacement entre cartes : `10px`.
- Tailles : chiffre hero `28px/500`, chiffre secondaire `16px/500`, libellé de semaine `14px/500`, corps `13px`, labels et badges `12px`.
- Deux graisses maximum (400 / 500). Pas de gras lourd.
- Pas de dégradé, pas d'ombre portée, pas de glow.

---

## Contraintes

- Ne pas toucher à la barre de navigation basse ni au header (logo + « FEUILLES DE ROUTES ») : ils restent tels quels.
- Le `<select>` de période garde son comportement actuel (liste des mois + « Période personnalisée… »).
- Réutiliser les composants et tokens existants du projet dès que possible plutôt que d'introduire de nouvelles valeurs en dur.

## Évolutions possibles (à ne pas faire tout de suite)

- Rendre chaque carte semaine cliquable pour dérouler le détail jour par jour.
- Afficher la barre uniquement à partir d'un certain seuil pour alléger les semaines calmes.
