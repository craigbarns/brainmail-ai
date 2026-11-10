# Système de design BRAINMAIL — « le registre »

Le produit parle de papier et de preuves. L’interface s’en inspire : un fond papier chaud,
une encre verte, des lignes de registre plutôt que des boîtes, et un surlignage pour la phrase
qui justifie chaque échéance. Tout vit dans `src/app/globals.css`, organisé en onze sections
numérotées.

## Principes

1. **La preuve à côté de la date.** Une échéance n’est jamais montrée sans la citation du
   courrier. La citation est surlignée (`<mark>`), dans la fiche comme sur la page d’accueil.
2. **La couleur porte un sens, jamais seule.** Vert = confirmé ou prêt, ambre = à vérifier ou
   en cours, vermillon = en retard ou en échec. Chaque étiquette garde son mot.
3. **Des lignes plutôt que des cartes.** Les listes sont des registres réglés. Une carte ne
   sert qu’à regrouper un contenu réellement distinct.
4. **Titres fonctionnels.** Un titre de page dit où l’on est (« Vue d’ensemble »), pas un
   slogan. Les slogans restent sur la page d’accueil.
5. **Lisible à 60 ans.** Aucun texte sous 13 px (12 px pour quelques libellés en capitales),
   contraste d’au moins 4,5 pour tout texte, zones cliquables d’au moins 38 px.

## Typographie

| Rôle                           | Police                    | Usage                                                        |
| ------------------------------ | ------------------------- | ------------------------------------------------------------ |
| Titres, citations, résumés     | Newsreader (`--serif`)    | `h1`, `h2`, citations, « L’essentiel », brouillon de réponse |
| Interface, données             | Hanken Grotesk (`--sans`) | Tout le reste, chiffres tabulaires pour dates et montants    |

Les deux polices sont variables, sous licence SIL OFL, hébergées dans `src/app/fonts/` et
chargées par `next/font/local` dans `src/app/layout.tsx`. Aucun appel à un service tiers.

Échelle : `--fs-xs` 13 · `--fs-sm` 14 · `--fs-base` 15,5 · `--fs-md` 17 · `--fs-lg` 20 ·
`--fs-xl` 26 · `--fs-2xl` 34.

## Couleurs

| Jeton                          | Valeur                | Usage                                     |
| ------------------------------ | --------------------- | ----------------------------------------- |
| `--paper`, `--paper-2`         | `#f6f3ec`, `#eee9dd`  | Fond de page, zones en retrait            |
| `--sheet`                      | `#fffdf9`             | Surfaces (panneaux, registre, fiche)      |
| `--ink`, `--text`, `--muted`   | `#15231d`, `#2b3a33`, `#56635b` | Titres, texte, texte secondaire |
| `--green`, `--green-ink`       | `#1d5a44`, `#134434`  | Action principale, état confirmé          |
| `--green-soft`, `--green-tint` | `#e3eddc`, `#f1f5ea`  | Fonds d’état et de résumé                 |
| `--amber`, `--amber-soft`      | `#7a4f00`, `#fbefcf`  | À vérifier, en cours, échéance proche     |
| `--stamp`, `--stamp-soft`      | `#a8341b`, `#fbe6de`  | En retard, en échec, action destructrice  |
| `--mark`                       | `#fbe9a0`             | Surlignage des preuves                    |
| `--night`                      | `#12372b`             | Bande « confiance » de la page d’accueil  |

Toutes les paires texte/fond utilisées atteignent un contraste d’au moins 4,5.

## Composants

- **Boutons** : `.button` (principal), `.secondary`, `.ghost`, `.danger`, tailles `.small` et
  `.large`. Un seul bouton principal par écran. `.text-button` pour les actions secondaires,
  `.icon-button` pour une icône seule (toujours avec `aria-label`).
- **Étiquettes d’état** : `.status` (courrier), `.chip` (action), `.dchip` (dossier), avec les
  variantes `ready`/`ok`, `queued`/`processing`/`warn`, `failed`/`late`.
- **Dates** : `.date-block` (le « cachet », pour une échéance mise en avant) et `.due-chip`
  (dans une ligne de registre), avec `.soon` (dans les 7 jours) et `.late` (dépassée).
- **Registre** : `.document-list` > `.table-head` + `.document-row`. Sur téléphone, la ligne se
  replie et les colonnes secondaires disparaissent.
- **Fiche courrier** : `.document-drawer` en deux colonnes, `.doc-source` (le courrier, image
  ou texte lu avec surlignage) et `.doc-analysis` (essentiel, à faire, réponse, classement).
  Sur téléphone, l’analyse passe avant le courrier.
- **Action** : `.action-card`, bord gauche ambre tant qu’elle n’est pas confirmée, vert
  ensuite.
- **Messages** : `.alert`, `.alert.error`, `.alert.analysing`.

## Règles pour un nouvel écran

- Reprendre `page-heading` : surtitre (date · société), titre en serif, phrase d’aide.
- Ne pas créer de nouvelle couleur ni de nouvelle taille : utiliser les jetons.
- Pas d’icône décorative répétée sur chaque ligne d’une liste.
- Vérifier l’écran à 390 px de large et au clavier (focus visible partout).
- Respecter `prefers-reduced-motion` : les animations sont déjà neutralisées globalement.
