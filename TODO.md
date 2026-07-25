# TODO — ganttPro.html

Issu de la revue de code du 2026-07-22 (agent code-reviewer). Triés du plus au moins sévère.

## Sévérité haute

- [ ] **XSS stockée via `innerHTML` non échappé** — `task.name`/`task.description` sont injectés bruts dans les barres Gantt (l.1555, 1558) et le tooltip (l.1868-1895) sans passer par `escapeHtml()`. Un nom de tâche contenant du HTML/JS s'exécute au rendu et se propage via l'export/import JSON.
- [~] **Aucune détection de cycle `parentId` + aucune validation à l'import** — *partiellement corrigé (2026-07-25)* : `getDescendants()` et la remontée d'ancêtres de `getVisibleRows()` ont désormais un garde-fou (`Set` des nœuds déjà vus) et terminent sur un cycle ; couvert par `tests/hierarchy.test.js`. **Reste à faire** : `onFileLoad()` ne valide toujours pas le JSON importé (il ne vérifie que la présence de `data.tasks`) — ni les types, ni les `parentId` orphelins, ni les cycles.

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
