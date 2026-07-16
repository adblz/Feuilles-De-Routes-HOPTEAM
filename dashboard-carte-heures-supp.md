# Dashboard — carte « Heures supp. » (refonte, option A)

Brief pour Claude Code. Remplace la carte crème actuelle (« Juillet / 56h41 / HEURES SUPP. ») sur l'écran Accueil.

---

## 1. Intention

La carte actuelle affiche un **bilan mensuel** dans le seul élément clair de l'écran — donc dans l'espace le plus précieux. Or l'onglet Heures traite déjà le mois en détail.

La carte doit répondre à : **« où j'en suis cette semaine ? »**

- Chiffre héros = **delta d'heures supp. de la semaine en cours**, pas le total mensuel.
- Le mois reste présent, mais en **bandeau secondaire cliquable** sous la carte crème → navigue vers l'onglet Heures.
- Aucune donnée nouvelle n'est nécessaire : tout vient déjà du calcul hebdo de la page Heures.

---

## 2. Tokens

À aligner sur les tokens existants s'ils existent déjà ; sinon les créer.

| Rôle | Valeur | Usage |
|---|---|---|
| `surface/app` | `#131A26` | fond de l'écran (existant) |
| `surface/raised` | `#1B2434` | bandeau mois |
| `surface/cream` | `#F5EFE2` | carte héros (existant) |
| `cream/text-strong` | `#1C1B17` | chiffre héros |
| `cream/text-muted` | `#6B6455` | labels sur crème |
| `cream/text-faint` | `#8A8272` | dates, métadonnées |
| `cream/track` | `#DDD6C6` | fond de la barre |
| `bar/base` | `#B6AE9C` | segment heures de base |
| `accent/25` | `#E08A3C` | majoration 25 % (existant) |
| `accent/25-text` | `#A8641F` | libellé 25 % sur crème |
| `accent/50` | `#F2647A` | majoration 50 % (existant) |
| `accent/50-text` | `#B83950` | libellé 50 % sur crème |
| `accent/astreinte` | `#2E9E7E` | pastille astreinte |
| `dark/text-muted` | `#8B93A3` | labels sur fond sombre |

Rayons : carte crème `18px`, bandeau mois `14px`, barre `5px` (pleine hauteur).
Chiffres : police **mono** (comme déjà utilisé sur la page Heures) — cohérence des colonnes de chiffres dans toute l'app.
Casse : **sentence case** partout. Pas de `ALL CAPS` sauf l'eyebrow du bandeau mois.

---

## 3. Structure

```
┌─ Carte crème ────────────────────────────┐
│ Cette semaine              6 – 12 juil.  │  ← ligne meta (13px / 12px)
│                                          │
│ +22h43  supp.                            │  ← héros, mono 38px, weight 500
│ 57h43 travaillées · 5 jours              │  ← contexte, 13px muted
│                                          │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░▒▒▒▒▒▒▒                  │  ← barre segmentée, h=10px
│ Base 35h   25% · 8h00   50% · 14h43      │  ← légende, 11px
└──────────────────────────────────────────┘
┌─ Bandeau mois (fond sombre, tappable) ───┐
│ JUILLET                                › │
│ 56h41 supp.                              │
└──────────────────────────────────────────┘
```

Gouttière entre carte et bandeau : `10px`. Padding carte : `16px`. Padding bandeau : `12px 14px`.

### Barre segmentée

Largeur totale = `100%` = `heuresTravaillees` de la semaine (pas 35h — sinon les segments supp. sortent du cadre).

Trois segments contigus, dans l'ordre :
1. `base` (min(travaillées, 35h)) → `bar/base`
2. `majo25` → `accent/25`
3. `majo50` → `accent/50`

Le track `cream/track` reste visible si la semaine est en cours et qu'on veut projeter jusqu'à 35h — voir États.

L'astreinte **n'entre pas dans la barre** (ce n'est pas du temps travaillé) : elle apparaît en pastille verte à droite de la légende, **uniquement si > 0**.

---

## 4. Contrat de données

```ts
type WeekSummary = {
  weekStart: Date;          // lundi
  weekEnd: Date;            // dimanche
  minutesWorked: number;    // total travaillé
  minutesBase: number;      // plafonné à 35h
  minutesOvertime: number;  // minutesWorked - minutesBase
  minutes25: number;
  minutes50: number;
  minutesNight: number;     // pas affiché ici, réservé au détail
  minutesOnCall: number;    // astreinte, 0 si aucune
  daysWorked: number;
  isComplete: boolean;      // toutes les feuilles de la semaine sont remplies
};

type MonthSummary = {
  label: string;            // "Juillet"
  minutesOvertime: number;
};
```

Formatage : helper unique `formatHm(minutes) → "22h43"` (déjà présent probablement) ; le delta préfixe `+` **si > 0**, sinon affiche `0h00` sans signe.

---

## 5. États

| État | Rendu |
|---|---|
| **Semaine en cours, données partielles** | Normal, mais la ligne meta affiche `en cours` en plus des dates. Le track crème restant représente le chemin jusqu'à 35h. |
| **Semaine terminée et complète** | Barre à 100 %, pas de track visible. |
| **Feuilles manquantes dans la semaine** | Pastille orange `n jour(s) à saisir` sous la légende, tappable → Feuille du jour. Le chiffre héros reste affiché (il est juste provisoire). |
| **0 h supp.** | Héros = `0h00`, sous-titre `Sous les 35h`. Barre : base uniquement. Ne pas masquer la carte. |
| **Aucune donnée (nouvelle semaine, lundi matin)** | Héros = `—`, sous-titre `Aucune heure saisie cette semaine`, CTA `Remplir ma feuille` → Feuille du jour. Pas de barre. |
| **Astreinte = 0** | Masquer la pastille (pas de « 0h00 » mort). |

---

## 6. Interactions

- Tap sur la **carte crème** → onglet Heures, positionné sur la semaine en cours.
- Tap sur le **bandeau mois** → onglet Heures, vue mensuelle.
- Pas d'animation de compteur au chargement. Une seule transition tolérée : `width` de la barre, `240ms ease-out`, désactivée sous `prefers-reduced-motion`.

---

## 7. Accessibilité

- La barre est décorative : `aria-hidden`. L'information est déjà dans la légende textuelle.
- Ne jamais coder l'info uniquement par la couleur : les libellés `25%` / `50%` accompagnent toujours les segments.
- Carte et bandeau sont des boutons (`role="button"`, cible tactile ≥ 44px), focus visible.
- `aria-label` de la carte : `Cette semaine, 22 heures 43 supplémentaires sur 57 heures 43 travaillées. Voir le détail.`

---

## 8. Ce qu'il ne faut pas faire

- Ne pas remettre le total mensuel en chiffre héros (c'est le doublon qu'on supprime).
- Ne pas ajouter de dégradé, d'ombre portée ni de glow — la carte crème tient par le contraste, pas par l'effet.
- Ne pas afficher la ligne d'astreinte / nuit à vide.
- Ne pas empiler plus de 3 segments dans la barre.
