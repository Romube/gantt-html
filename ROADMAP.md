# ROADMAP — Amélioration du workflow de développement

Chantier ouvert le 2026-07-24. Objectif : rendre le développement de `ganttPro.html` plus sûr et reproductible, **sans perdre l'atout « fichier HTML unique et autonome »** du produit livré.

Statut : `[ ]` à faire · `[~]` en cours · `[x]` fait. Mettre à jour ce fichier à chaque avancée pour qu'une autre session puisse reprendre sans contexte perdu.

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

## Notes de reprise

- **Les 4 points du chantier sont terminés (2026-07-25).** Le workflow est : éditer `src/` → `npm run verify` → commit (le hook `pre-commit` rejoue tests + build).
- La liste des **bugs** produit (XSS, validation de l'import JSON, `render()` à chaque `mousemove`…) est dans `TODO.md`, distincte de ce chantier outillage. C'est le chantier suivant naturel : les tests sont maintenant là pour verrouiller chaque correction.
- Pour ajouter un test : créer `tests/<sujet>.test.js`, `import { loadApp } from './helpers/load-app.mjs'`, puis `const app = loadApp()` donne accès à toute fonction top-level de `src/app.js` (et à `app.tasks` / `app.searchQuery` en lecture-écriture). Passer les valeurs renvoyées par `plain()` avant un `assert.deepEqual` (elles viennent d'un autre realm).
