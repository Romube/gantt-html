# TODO — ganttPro.html

Issu de la revue de code du 2026-07-22 (agent code-reviewer). Triés du plus au moins sévère.

> **Liste soldée le 2026-07-25** — les 7 points sont traités, en 4 lots (sécurité, interactions, récapitulative vide, performance). Les règles à maintenir pour ne pas les réintroduire sont résumées dans `CLAUDE.md`, section « Règles à ne pas casser ».

## Sévérité haute

- [x] **XSS stockée via `innerHTML` non échappé** — corrigé (2026-07-25) : `escapeHtml()` appliqué aux trois points d'injection restants — barres du Gantt (`renderGantt`), tooltip (`buildTooltip`, nom **et** description) et option courante du modal de nesting (`makeNestOption`). `escapeHtml()` tolère désormais `null`/nombre. Couvert par `tests/tooltip.test.js` (seul des trois à être une fonction pure) ; les deux autres vérifiés à la main.
- [x] **Aucune détection de cycle `parentId` + aucune validation à l'import** — corrigé (2026-07-25) en deux temps : garde-fou anti-boucle (`Set` des nœuds déjà vus) dans `getDescendants()` et la remontée d'ancêtres de `getVisibleRows()` ; puis `sanitizeProject()`, qui répare le projet chargé (entrées inexploitables écartées, dates/types/champs normalisés, `parentId` orphelins remis à la racine, cycles rompus) et résume les corrections à l'utilisateur. Branchée sur `onFileLoad()` **et** `loadFromLocalStorage()`. Couvert par `tests/import.test.js` et `tests/hierarchy.test.js`.

## Sévérité moyenne à moyenne-haute

- [x] **Recherche + nœud replié masque le résultat trouvé** — corrigé (2026-07-25) : en mode recherche, `getVisibleRows()` descend dans les nœuds récapitulatifs sans tenir compte de `collapsed` (seuls les nœuds pertinents sont affichés de toute façon). Le chevron de repli reflète l'affichage réel pendant la recherche. Le repli reprend ses droits dès que la recherche est vidée. Couvert par `tests/hierarchy.test.js`.
- [x] **Le raccourci clavier « n » écrase une édition en cours** — corrigé (2026-07-25) : `isAnyModalOpen()` garde le raccourci (les overlays s'ouvrent de deux façons — classe `open` pour l'édition et la confirmation, `style.display` pour l'export et le nesting).
- [x] **`escMD()` est un no-op** — corrigé (2026-07-24) : chaînes de remplacement passées à `'\\|'`/`'\\*'`/`'\\_'`. Bug détecté par ESLint (`no-useless-escape`).

## Sévérité faible à faible-moyenne

- [x] **Échap ne ferme pas le modal « Nester la tâche dans… »** — corrigé (2026-07-25) : `closeNestModal()` ajoutée au handler `Escape`.
- [x] **Variable globale implicite `curMonthYear`** — corrigé (2026-07-24) : ajoutée à la déclaration `let` de la branche `days` de `renderGanttHeader()` (l.1615), comme dans les autres branches. Bug détecté par ESLint (`no-undef`).
- [x] **Tâche récapitulative orpheline jamais rétrogradée** — traité (2026-07-25), avec un choix produit différent : elle **reste récapitulative** (une phase préparée à l'avance est légitime, et la case « démoter » du modal permet déjà de la reclasser). Le diagnostic du TODO était par ailleurs trop pessimiste — `recalcSummary()` sort dès qu'il n'y a plus d'enfant, donc les dates n'étaient pas figées mais bien éditables (saisie inline et modal). Seul reliquat réel corrigé : sa barre du Gantt n'était pas déplaçable ; elle l'est maintenant tant que la tâche n'a aucun enfant, avec une bordure pointillée pour la distinguer. Non-régression couverte par `tests/hierarchy.test.js` (`recalcSummary`).

## Qualité / performance

- [x] **`render()` complet + écriture `localStorage` à chaque `mousemove` pendant un glisser-déposer** — corrigé (2026-07-25) : `render(persist = true)` permet un rendu sans sauvegarde ; `makeDraggable()` n'appelle plus qu'un `render(false)` par frame (`requestAnimationFrame`) et fait un unique `render()` persisté au relâchement. Le `mousemove` du splitter ne rend pas, il n'était pas concerné.
