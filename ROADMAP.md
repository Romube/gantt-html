# ROADMAP — Outillage, qualité et documentation

Chantier ouvert le 2026-07-24. Objectif initial : rendre le développement de `ganttPro.html` plus sûr et reproductible, **sans perdre l'atout « fichier HTML unique et autonome »** du produit livré. Élargi ensuite à la correction des bugs connus (§5) et à la spécification (§6).

Statut : `[ ]` à faire · `[~]` en cours · `[x]` fait. Mettre à jour ce fichier à chaque avancée pour qu'une autre session puisse reprendre sans contexte perdu.

> **État au 2026-07-27 : les 6 chantiers sont terminés, rien n'est en cours.** Version 3.2, 39 tests verts, `main` synchronisé avec `origin/main`. Pour reprendre : lire « Pistes ouvertes » et « Notes de reprise » en bas de ce fichier.

---

## 1. Initialiser git — `[x]`

Le manque le plus urgent : aucune historisation aujourd'hui, chaque édition d'un fichier de ~3000 lignes est irréversible.

- [x] `git init` à la racine (branche `master`)
- [x] Premier commit de l'existant (`0a81ff5`, 2026-07-24) — `ganttPro.html`, `README.md`, `CLAUDE.md`, `TODO.md`, `ROADMAP.md`, `.gitignore`, `.docx`
- [x] `.docx` versionné en binaire ; `.claude/settings.local.json` exclu via `.gitignore`
- [x] Poussé vers `github.com/Romube/gantt-html` (2026-07-24). Le dépôt distant avait déjà l'historique réel (6 commits) + le fichier `ganttPro.html` ; le travail local a été replanté sur `origin/main` (pas de `git init` orphelin conservé) et poussé en fast-forward via deux commits : `2efd20f` (code) et `b94b2cf` (docs). Branche `main` suit `origin/main`.

## 2. Check de syntaxe JS reproductible — `[x]`

Une erreur JS ne se voyait qu'à l'ouverture dans le navigateur ; désormais deux garde-fous en ligne de commande.

- [x] `scripts/check.mjs` (`npm run check`) : extrait les blocs `<script>` inline, les passe à `node --check`, recale les numéros de ligne sur `ganttPro.html`, sort en code ≠ 0 sur erreur. Zéro dépendance. Testé OK sur fichier sain et sur erreur injectée.
- [x] ESLint minimal (`npm run lint`) : `package.json` + `eslint.config.js` (flat config, globales navigateur) + `eslint-plugin-html` pour linter le `<script>` inline avec numéros de ligne recalés. `node_modules/` gitignoré. Dès sa mise en place, a attrapé les deux bugs connus : globale implicite `curMonthYear` (l.1623/1626) et `escMD()` cassé (`no-useless-escape`, l.2531).
- [x] Documenté dans `CLAUDE.md` (section Commandes)

> `npm run lint` est passé au **vert** le 2026-07-24 après correction des deux bugs qu'il avait révélés (`curMonthYear`, `escMD` — voir TODO.md).

## 3. Découpage du fichier — `[x]` — **option B retenue**

Choix structurant. Options envisagées : A (fichier unique), B (fichiers séparés + build de concaténation), C (bundler). **Option B retenue** (2026-07-25).

- [x] Découpage en `src/index.html` (gabarit + marqueurs) + `src/style.css` + `src/app.js`
- [x] `scripts/build.mjs` (`npm run build`) réinjecte CSS + JS dans le gabarit → `ganttPro.html`. Lecture/écriture en `latin1` (octet-à-octet) pour une fidélité parfaite.
- [x] **Vérifié byte-à-byte** : `ganttPro.html` régénéré = version pré-découpage, aucune différence d'octet (`cmp`). Comportement runtime prouvé inchangé.
- [x] Outillage repointé sur les sources : `npm run check` → `node --check src/app.js`, `npm run lint` → `eslint src/app.js`. `scripts/check.mjs` (extraction HTML) et `eslint-plugin-html` supprimés (devenus inutiles). `npm run verify` enchaîne check → lint → build.
- [x] Doc mise à jour : `CLAUDE.md` (structure + « ne jamais éditer ganttPro.html » + correspondance des numéros de ligne), `README.md` (structure + workflow dev).
- [x] Garde-fou anti-dérive : hook git `pre-commit` (`scripts/hooks/pre-commit`) qui régénère `ganttPro.html` et bloque le commit s'il est périmé. Versionné via `core.hooksPath`, activé automatiquement au `npm install` (script `prepare` → `scripts/setup-hooks.mjs`). Testé : bloque bien un commit périmé.

## 4. Tests ciblés sur la logique pure — `[x]`

Fait le 2026-07-25. **21 tests, tous verts** (`npm test`).

- [x] Runner : `node:test` natif + `node:assert/strict`, zéro dépendance ajoutée.
- [x] Harnais `tests/helpers/` : `src/app.js` est chargé **tel quel** dans un `node:vm` muni d'un faux DOM minimal (`fake-dom.mjs`), et ses fonctions/état sont exposés aux tests via `loadApp()` (`load-app.mjs`). **Aucun `export` ni aucune modification du code produit** pour les besoins des tests — le livrable reste un `<script>` inline. Le faux `getComputedStyle` relit les variables `:root` de `src/style.css` pour rester en phase.
- [x] Calculs de dates (`tests/dates.test.js`) — `dateDiff`, `addDays`, `parseDate`, `formatDate` : non-régression du bug timezone UTC de la v2.0 (dates construites en heure locale), passage heure d'été/hiver, années bissextiles, réciprocité `addDays`/`dateDiff`.
- [x] Échappements (`tests/escape.test.js`) — `escapeHtml` (ordre du `&`), `escMD` (verrouille la correction du no-op), `escMermaid`.
- [x] Hiérarchie et cycles (`tests/hierarchy.test.js`) — `getChildren`, `getDescendants`, `getVisibleRows` (niveaux, tri par `order`, repli, recherche + ancêtres) et **terminaison sur un cycle `parentId`**.
- [x] **Correctif produit associé** : `getDescendants()` et la remontée d'ancêtres de `getVisibleRows()` bouclaient à l'infini sur un cycle `parentId` (bug de `TODO.md`) — garde-fou par `Set` des nœuds déjà vus. Les tests « cycle » ont été validés en les rejouant sans le correctif : ils échouent (et ne figent pas le runner, grâce à un budget d'accès à `tasks`).
- [x] Intégration outillage : `npm test` ; `npm run verify` = check → lint → **test** → build ; le hook `pre-commit` lance aussi les tests ; ESLint couvre désormais `tests/` (globales Node, ESM).

> Reste hors périmètre (assumé) : tout ce qui dépend du rendu réel (positions en pixels, en-tête SVG, drag-and-drop, exports) — vérification manuelle dans le navigateur, comme avant.

---

## 5. Correction des bugs de `TODO.md` — `[x]`

Fait le 2026-07-25, en 4 lots thématiques (un commit par lot), chacun validé manuellement dans le navigateur avant commit. `TODO.md` est **soldé** — les règles à maintenir pour ne pas réintroduire ces bugs sont dans `CLAUDE.md`, section « Règles à ne pas casser ».

- [x] **Sécurité** (`1345048`) — `escapeHtml()` sur les 3 points d'injection restants ; `sanitizeProject()` répare le projet chargé (fichier JSON **et** localStorage) et résume les corrections.
- [x] **Interactions** (`d9c6182`) — la recherche traverse les nœuds repliés, `n` n'écrase plus une saisie, Échap ferme le modal de nesting.
- [x] **Récapitulative vide** (`1fdec22`) — sa barre devient déplaçable (bordure pointillée) ; conforme à RG-20, que le TODO contredisait.
- [x] **Performance** (`890c8a3`) — `render(persist)` + un rendu par frame pendant un glissement, une seule sauvegarde au relâchement.

## 6. Spécification en Markdown versionné — `[x]`

Fait le 2026-07-27 (`e4199d0`, `7b3cd6d`). Le `.docx` était invisible pour git : aucun diff, jamais relu, d'où deux « v3.1 » divergentes et une fonctionnalité spécifiée absente du README.

- [x] `docs/spec-fonctionnelle.md` devient la **source de vérité** (conversion intégrale, accents restaurés), complétée des écarts constatés : recherche (§4.9), raccourcis clavier (§9.4), chargement tolérant (§6.4), RG-22 à RG-26.
- [x] Traçabilité **règle ↔ test** : 26 des 39 tests citent leur `RG-xx` en libellé — `grep -o "RG-[0-9]*" tests/*.test.js | sort -u`.
- [x] `.docx` diffusable = artefact : `npm run spec:docx` (pandoc 3.10, gitignoré). Sommaire en liens Markdown, pas `--toc` (champ Word non évalué par LibreOffice).
- [x] Numérotation alignée : spec, README (historique + badge) et `package.json` en **3.2**.

---

## Pistes ouvertes (fin de session du 2026-07-27)

Rien n'est en cours ni à moitié fait : l'arbre est propre, tout est poussé. Ce qui suit n'est **pas engagé** — à arbitrer en début de prochaine session.

1. **Relecture de fond de la spécification convertie.** Le rendu a été validé, pas le contenu : la conversion est fidèle au `.docx` v3.1, mais certaines affirmations d'alors pouvaient déjà être obsolètes. Seul le porteur du projet peut trancher.
2. **Gabarit Word pour le `.docx` généré.** Si la mise en forme par défaut de pandoc ne convient pas, `scripts/spec-docx.mjs` accepte un `--reference-doc <gabarit.docx>` — fournir un modèle et le brancher.
3. **Étendre la couverture RG ↔ tests.** 11 règles sur 26 sont vérifiées automatiquement. Testables sans toucher au DOM : RG-01 (`getTaskType`), RG-12/RG-17/RG-18 (`applyRowReorder`, `applyNest` — protection anti-boucle), RG-21 (reclassement manuel dans `saveTask`). Les autres dépendent du rendu.
4. **Tests du rendu ?** Le harnais `node:vm` s'arrête à la logique pure. Aller plus loin demanderait jsdom ou un pilotage navigateur, donc une dépendance de dev — contraire au parti pris actuel. À rouvrir seulement si un bug de rendu passe entre les mailles.
5. **Mode de contribution.** Tout est commité directement sur `main` (workflow retenu jusqu'ici). Si une relecture par pull request est souhaitée pour le prochain chantier : créer une branche **avant** de committer, puis `gh pr create`. Rendre rétroactivement « PR-ables » des commits déjà poussés imposerait de réécrire l'historique — déconseillé.
6. **Évolutions produit non planifiées** : dépendances entre tâches, chemin critique, % d'avancement, ressources. Explicitement **hors périmètre** dans la spec (§2.2) — un ajout supposerait de modifier ce périmètre d'abord.

## Notes de reprise

- **Chantiers 1 à 6 terminés.** Le workflow est : éditer `src/` → `npm run verify` → commit (le hook `pre-commit` rejoue tests + build et bloque si `ganttPro.html` est périmé).
- **Ne jamais éditer** `ganttPro.html` ni `docs/spec-fonctionnelle.docx` : ce sont des artefacts générés.
- Un changement de comportement et la règle `RG-xx` qui le décrit vont **dans le même commit** — c'est la raison d'être du passage de la spec en Markdown.
- Pour ajouter un test : créer `tests/<sujet>.test.js`, `import { loadApp } from './helpers/load-app.mjs'`, puis `const app = loadApp()` donne accès à toute fonction top-level de `src/app.js` (et à `app.tasks` / `app.searchQuery` en lecture-écriture). Passer les valeurs renvoyées par `plain()` avant un `assert.deepEqual` (elles viennent d'un autre realm). Si le test couvre une règle, préfixer son libellé par `RG-xx — `.
- Prérequis outillage sur une nouvelle machine : `npm install` (ESLint + hooks git), et pandoc uniquement pour `npm run spec:docx`.
