# TODO — ganttPro.html

Issu de la revue de code du 2026-07-22 (agent code-reviewer). Triés du plus au moins sévère.

## Sévérité haute

- [x] **XSS stockée via `innerHTML` non échappé** — corrigé (2026-07-25) : `escapeHtml()` appliqué aux trois points d'injection restants — barres du Gantt (`renderGantt`), tooltip (`buildTooltip`, nom **et** description) et option courante du modal de nesting (`makeNestOption`). `escapeHtml()` tolère désormais `null`/nombre. Couvert par `tests/tooltip.test.js` (seul des trois à être une fonction pure) ; les deux autres vérifiés à la main.
- [x] **Aucune détection de cycle `parentId` + aucune validation à l'import** — corrigé (2026-07-25) en deux temps : garde-fou anti-boucle (`Set` des nœuds déjà vus) dans `getDescendants()` et la remontée d'ancêtres de `getVisibleRows()` ; puis `sanitizeProject()`, qui répare le projet chargé (entrées inexploitables écartées, dates/types/champs normalisés, `parentId` orphelins remis à la racine, cycles rompus) et résume les corrections à l'utilisateur. Branchée sur `onFileLoad()` **et** `loadFromLocalStorage()`. Couvert par `tests/import.test.js` et `tests/hierarchy.test.js`.

## Sévérité moyenne à moyenne-haute

- [ ] **Recherche + nœud replié masque le résultat trouvé** — `getVisibleRows()` (l.1169) : le compteur de résultats est correct mais une sous-tâche correspondante reste invisible si son ancêtre récapitulatif est replié.
- [ ] **Le raccourci clavier « n » écrase une édition en cours** — l.2926, aucune vérification qu'un modal d'édition est déjà ouvert avant de rappeler `openModal('standard')`.
- [x] **`escMD()` est un no-op** — corrigé (2026-07-24) : chaînes de remplacement passées à `'\\|'`/`'\\*'`/`'\\_'`. Bug détecté par ESLint (`no-useless-escape`).

## Sévérité faible à faible-moyenne

- [ ] **Échap ne ferme pas le modal « Nester la tâche dans… »** — l.2925, `closeNestModal()` oubliée dans le handler Échap.
- [x] **Variable globale implicite `curMonthYear`** — corrigé (2026-07-24) : ajoutée à la déclaration `let` de la branche `days` de `renderGanttHeader()` (l.1615), comme dans les autres branches. Bug détecté par ESLint (`no-undef`).
- [ ] **Tâche récapitulative orpheline jamais rétrogradée** — `recalcSummary()` (l.1125-1132) ne réagit pas quand la dernière sous-tâche est supprimée/déplacée ; la tâche garde son type `summary` et ses dates figées.

## Qualité / performance

- [ ] **`render()` complet + écriture `localStorage` à chaque `mousemove` pendant un glisser-déposer** — `makeDraggable()` / `onMove` (~l.1928), peut saccader sur un gros projet.
