# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vue d'ensemble

GanttPro est une application de planification de projet (diagramme de Gantt interactif) livrée comme **un seul fichier HTML autonome** : `ganttPro.html` (CSS + markup + JS vanilla inline, aucune dépendance runtime, tout tourne dans le navigateur sans serveur).

**Depuis le point 3 du chantier workflow, ce fichier est GÉNÉRÉ — on n'édite jamais `ganttPro.html` à la main.** Les sources vivent dans `src/` et `scripts/build.mjs` les réinjecte dans un gabarit HTML pour produire le fichier autonome :

- `src/index.html` — gabarit : markup HTML + marqueurs `@@GANTT_STYLE@@` / `@@GANTT_SCRIPT@@`
- `src/style.css` — tout le CSS (était dans `<style>`)
- `src/app.js` — tout le JS vanilla (était dans `<script>`)
- `scripts/build.mjs` — inline `style.css` + `app.js` dans le gabarit → `ganttPro.html`
- `tests/` — tests unitaires de la logique pure (`node:test`), voir « Tests » ci-dessous
- `ganttPro.html` — **artefact généré**, versionné (pour rester ouvrable directement). Ne jamais l'éditer : lancer `npm run build` après toute modif de `src/`.
- `README.md` — documentation utilisateur (fonctionnalités, raccourcis, historique des versions)
- `spec_fonctionnelle_ganttPro_v3.docx` — spécification fonctionnelle détaillée
- `TODO.md` — liste de bugs/améliorations issus d'une revue de code passée (voir « Bugs connus » ci-dessous)
- `ROADMAP.md` — chantier d'amélioration du workflow de développement ; consulter pour l'état d'avancement avant de reprendre ce travail

Le projet est versionné avec git ; la branche `main` suit `origin/main` (`github.com/Romube/gantt-html`).

## Commandes

`package.json` sert **uniquement à l'outillage de dev** (check syntaxe, lint, tests, build de concaténation). Pas de bundler ni de dépendance runtime : le livrable reste le fichier unique `ganttPro.html`.

Prérequis outillage : `npm install` (installe ESLint en devDependencies ; `node_modules/` est gitignoré). Le `npm install` active aussi les hooks git versionnés via le script `prepare` (`core.hooksPath = scripts/hooks`).

Un **hook git pre-commit** (`scripts/hooks/pre-commit`) lance les tests, régénère `ganttPro.html` et **bloque le commit** si un test échoue ou si le fichier était périmé (désynchronisé de `src/`) — filet de sécurité contre l'oubli de `npm run build`. Si un nouveau clone n'a pas encore lancé `npm install`, activer les hooks manuellement : `git config core.hooksPath scripts/hooks`.

- **Éditer le code** : modifier `src/app.js` (JS), `src/style.css` (CSS) ou `src/index.html` (markup) — **jamais `ganttPro.html`**.
- **Vérifier la syntaxe JS** : `npm run check` (= `node --check src/app.js`). Zéro dépendance, ne détecte que la *syntaxe*.
- **Linter (bugs de logique)** : `npm run lint` (= `eslint src/app.js tests`). Attrape les globales implicites (`no-undef`), échappements inutiles (`no-useless-escape`), clés dupliquées, code injoignable, etc. `no-unused-vars` est désactivé sur `src/` car la plupart des fonctions sont appelées via `onclick=`/`oninput=` dans `src/index.html`.
- **Tests unitaires** : `npm test` (= `node --test "tests/**/*.test.js"`). Voir « Tests » ci-dessous.
- **Régénérer le livrable** : `npm run build` (= `node scripts/build.mjs`). Reconstruit `ganttPro.html` depuis `src/`. **À lancer après toute modif de `src/` et avant de committer.**
- **Tout enchaîner** : `npm run verify` (check → lint → test → build).
- **Ouvrir l'app** : ouvrir `ganttPro.html` dans un navigateur (double-clic, ou `start ganttPro.html`). Aucun serveur requis.

> Note : `npm run lint` et `npm test` doivent rester **verts**. Si l'un devient rouge, il a détecté un vrai problème — corriger, pas ignorer.
>
> Le build est conçu pour être fidèle : au moment du découpage, `ganttPro.html` régénéré était **byte-à-byte identique** à la version pré-découpage. Un `build` ne doit jamais introduire de diff autre que celui qui découle de tes modifs dans `src/`.

## Tests

`tests/` contient des tests unitaires de la **logique pure** uniquement, avec le runner natif `node:test` (aucune dépendance ajoutée) : `tests/dates.test.js` (dates), `tests/escape.test.js` (échappements des exports), `tests/hierarchy.test.js` (hiérarchie + robustesse aux cycles `parentId`).

Fonctionnement du harnais (`tests/helpers/`) — important à comprendre avant d'ajouter un test :

- `src/app.js` est un script navigateur sans `export` (il finit inliné dans une balise `<script>`). **On ne l'instrumente pas pour les tests** : `loadApp()` l'exécute *tel quel* dans un `node:vm` muni d'un faux DOM minimal (`fake-dom.mjs`), puis expose ses fonctions et son état.
- Dans un test : `const app = loadApp();` puis `app.dateDiff(...)`, `app.getVisibleRows()`, et lecture/écriture de `app.tasks`, `app.searchQuery`, `app.nextId`.
- Les valeurs renvoyées viennent d'un autre *realm* : les passer par `plain()` (exporté par `load-app.mjs`) avant un `assert.deepEqual`, sinon l'assertion échoue sur les prototypes.
- Le faux DOM ne simule que ce que le script touche au chargement. Si un ajout dans `src/app.js` utilise une API DOM absente, le chargement lève — compléter `fake-dom.mjs`, jamais contourner en modifiant `src/app.js`.
- Pour un test de terminaison (cycles), envelopper `tasks` dans le `withCallBudget()` de `tests/hierarchy.test.js` : une boucle infinie lève au lieu de figer le runner.

**Hors périmètre des tests** : tout ce qui dépend du rendu réel (positions en pixels, en-tête SVG, drag-and-drop, exports de fichiers, localStorage) — vérification **manuelle dans le navigateur**.

## Architecture

> Les numéros de ligne cités ci-dessous réfèrent au fichier généré `ganttPro.html` (historiquement documenté ainsi). Correspondance vers les sources : le JS de `ganttPro.html` ligne *N* se trouve à `src/app.js` ligne *N − 1015* ; le CSS ligne *N* à `src/style.css` ligne *N − 9*. En pratique, chercher par **nom de fonction** est plus robuste que par numéro de ligne.

### Modèle de données

Une tâche est un objet plat dans le tableau global `tasks` (pas de structure imbriquée — la hiérarchie se fait via `parentId`) :

```js
{ id, name, description, startDate, endDate, type, parentId, order, collapsed }
```

- `type` : `'standard'` | `'milestone'` (jalon, ◆, `startDate === endDate`) | `'summary'` (récapitulative, 📁 — dates calculées automatiquement à partir des enfants, pas éditables directement)
- `parentId` : `null` pour une tâche racine, sinon l'`id` du parent → hiérarchie multi-niveaux illimitée
- `order` : position relative parmi les frères/sœurs (utilisée par le drag-and-drop de réordonnancement)
- Un parent devient automatiquement `type: 'summary'` dès qu'on lui ajoute un enfant (`saveTask()`) ; il peut être rétrogradé manuellement en tâche standard via la case « démoter » du modal si tous ses enfants sont retirés

Autres variables d'état global en tête de script (l.1019 et suivantes) : `nextId` (compteur d'ID), `selectedTaskId`, `dragState`, `currentZoom` (`days`/`weeks`/`months`/`years`), `currentTheme` (`dark`/`light`), `searchQuery`, `editingTaskId`/`editingParentId`/`editingForcedType` (état du modal d'édition).

### Flux de rendu

Tout changement d'état passe par `render()` (l.1229), qui orchestre :
1. `renderTaskList()` — reconstruit la liste hiérarchique de gauche (indentation, icônes de type, cellules de date éditables inline via `makeInlineDateCell()`, boutons d'action)
2. `renderGantt()` + `renderGanttHeader()` + `renderGridLines()` — reconstruit le diagramme de droite (barres, jalons en losange, en-tête temporel adapté au zoom, grille de fond)
3. `updateStatusBar()`

`getVisibleRows()` (l.1148) calcule l'arbre visible en tenant compte des nœuds repliés (`collapsed`) et du filtre de recherche (`searchQuery`) — c'est la source de vérité pour l'ordre d'affichage des deux panneaux.

Les deux panneaux (liste de tâches à gauche, Gantt à droite) sont synchronisés :
- **verticalement** par scroll partagé (`syncGanttHeaderScroll` et handlers autour de l.1812)
- **en largeur** par un séparateur redimensionnable (`splitter`, l.1839)

Le Gantt est rendu en éléments DOM positionnés en absolu (pas de `<canvas>`), sauf l'en-tête temporel qui est du SVG (`gantt-header-svg`). Le calcul de position en pixels utilise toujours `dateDiff(range.start, date) * pxDay`, où `pxDay = ZOOM_CONFIG[currentZoom]` (l.1070-1072).

### Zoom et échelle de temps

4 niveaux de zoom (`ZOOM_CONFIG`, l.1070) avec largeur de pixel/jour différente. `renderGanttHeader()` (l.1589) a une branche par zoom pour dessiner les bandeaux mois/semaines/années/trimestres — c'est la fonction la plus complexe du fichier (~160 lignes), à traiter avec précaution lors de toute modification liée au temps.

### Drag-and-drop (deux systèmes distincts)

1. **Barres du Gantt** (`makeDraggable()`, l.1898) : déplacement/redimensionnement d'une tâche → modifie `startDate`/`endDate`, écrit en localStorage à chaque `mousemove` (point de perf connu, voir TODO)
2. **Lignes de la liste de tâches** (`startRowDrag`/`onRowDragMove`/`onRowDragEnd`/`applyRowReorder`, l.2175-2287) : réordonnancement (avant/après) ou nesting (déposer « dans » une autre tâche pour en faire un enfant, zone centrale de la ligne cible). Le nesting est aussi accessible via le bouton « Nester dans… » → `openNestModal()`/`applyNest()` (l.2288-2353).

### Thème clair/sombre

`THEMES` (l.1028) définit deux palettes de couleurs JS (pas seulement CSS) car elles sont réutilisées pour générer l'export SVG avec les bonnes couleurs (`renderGanttHeader`, `exportSVG`). `toggleTheme()` applique une classe sur `<html>` et persiste le choix pour la session.

### Exports (4 formats, tous générés côté client sans dépendance)

- **CSV** (`exportCSV`, l.2362) : tableau avec hiérarchie, BOM UTF-8, séparateur `;`
- **SVG** (`exportSVG`, l.2554, ~280 lignes) : redessine le diagramme en SVG pur fidèle au zoom/thème actif, pour import dans LibreOffice Impress
- **Markdown** (`exportMarkdown`, l.2394) : tableau + diagramme Mermaid `gantt` — attention, `escMD()` (l.2530) est actuellement un no-op buggé (voir TODO)
- **JSON** (`saveProject`/`loadProject`/`onFileLoad`, l.2845-2881) : sauvegarde/chargement complet du projet, rechargeable

### Persistance

`saveToLocalStorage()`/`loadFromLocalStorage()` (l.2882-2898) lisent/écrivent la clé `ganttPro_project` du `localStorage`. Au démarrage (`init()`, IIFE en fin de fichier), les données sont rechargées depuis le localStorage si présentes, sinon `loadDemoData()` (l.2936) génère un projet de démonstration à 3 phases.

## Bugs connus (voir TODO.md pour le détail complet)

À garder à l'esprit avant de toucher au code concerné — ne pas les « redécouvrir » sans les corriger si le fix est dans le scope de la tâche demandée :

- **XSS stockée** : `task.name`/`task.description` sont injectés bruts via `innerHTML` dans les barres Gantt et le tooltip (`buildTooltip`) sans passer par `escapeHtml()`. Toute nouvelle fonction qui injecte du texte de tâche en HTML doit utiliser `escapeHtml()`.
- **Import JSON non validé** : `onFileLoad()` ne vérifie que la présence de `data.tasks` — ni les types, ni les `parentId` orphelins ou cycliques. (Le *parcours* est désormais protégé : `getDescendants()` et la remontée d'ancêtres de `getVisibleRows()` ont un garde-fou anti-cycle, couvert par `tests/hierarchy.test.js`. Toute nouvelle fonction qui suit `parentId` doit faire de même.)
- **`escMD()` est un no-op** (regex mal échappées) — un `|` dans un nom de tâche casse le tableau Markdown exporté.
- Voir `TODO.md` pour les bugs de sévérité moyenne/faible (recherche + nœud replié, raccourci `n` qui écrase une édition en cours, Échap qui ne ferme pas le modal de nesting, variable globale implicite `curMonthYear`, tâche récapitulative orpheline jamais rétrogradée).
