# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vue d'ensemble

GanttPro est une application de planification de projet (diagramme de Gantt interactif) entièrement contenue dans **un seul fichier HTML** : `ganttPro.html` (~3000 lignes : CSS inline dans `<style>`, markup, puis tout le JS vanilla dans un unique `<script>` en bas de fichier). Pas de build, pas de dépendances npm, pas de framework — tout tourne dans le navigateur sans serveur.

- `ganttPro.html` — l'application complète (seul fichier à éditer pour toute fonctionnalité)
- `README.md` — documentation utilisateur (fonctionnalités, raccourcis, historique des versions)
- `spec_fonctionnelle_ganttPro_v3.docx` — spécification fonctionnelle détaillée
- `TODO.md` — liste de bugs/améliorations issus d'une revue de code passée (voir « Bugs connus » ci-dessous)
- `ROADMAP.md` — chantier en cours d'amélioration du workflow de développement (git, check JS, découpage du fichier, tests) ; consulter ce fichier pour l'état d'avancement avant de reprendre ce travail

Ce n'est pas un dépôt git initialisé actuellement.

## Commandes

Il n'y a ni `package.json`, ni build, ni linter, ni suite de tests automatisée. Le workflow de développement consiste à éditer `ganttPro.html` directement puis à valider manuellement dans le navigateur.

- **Ouvrir l'app** : ouvrir `ganttPro.html` directement dans un navigateur (double-clic, ou `start ganttPro.html` sous Windows/PowerShell). Aucun serveur requis.
- **Vérifier la syntaxe JS après édition** : le fichier n'a pas de build step, donc les erreurs JS ne se révèlent qu'à l'exécution dans le navigateur. Pour un check rapide sans navigateur, extraire le contenu du `<script>` (entre les balises `<script>`/`</script>` en fin de fichier) dans un `.js` temporaire et lancer `node --check fichier.js`.
- **Pas de tests automatisés** : toute vérification de comportement se fait manuellement dans le navigateur (charger l'app, interagir avec les tâches/le Gantt, vérifier le rendu, les exports, le localStorage).

## Architecture

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
- **Pas de détection de cycle sur `parentId`** : `getDescendants()` et la remontée d'ancêtres dans `getVisibleRows()` peuvent boucler à l'infini sur un cycle, y compris via un import JSON non validé (`onFileLoad()` ne vérifie que la présence de `data.tasks`).
- **`escMD()` est un no-op** (regex mal échappées) — un `|` dans un nom de tâche casse le tableau Markdown exporté.
- Voir `TODO.md` pour les bugs de sévérité moyenne/faible (recherche + nœud replié, raccourci `n` qui écrase une édition en cours, Échap qui ne ferme pas le modal de nesting, variable globale implicite `curMonthYear`, tâche récapitulative orpheline jamais rétrogradée).
