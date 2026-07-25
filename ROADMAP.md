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

## 4. Tests ciblés sur la logique pure — `[ ]` — dépend du point 3

Après découpage, tester les fonctions pures les plus à risque (3-4 assertions chacune).

- [ ] Détection de cycle `parentId` (`getDescendants`, `getVisibleRows`)
- [ ] `escapeHtml` / `escMD` / `escMermaid`
- [ ] Calculs de dates (`dateDiff`, `addDays`) — verrouiller la non-régression du bug timezone UTC corrigé en v2.0
- [ ] Choix du runner (node:test natif suffit, pas de dépendance lourde nécessaire)

---

## Notes de reprise

- Le point 1 est indépendant et à faire en premier (il sécurise tout le reste).
- Le point 2 est indépendant du 1.
- Les points 3 et 4 sont liés : 4 dépend du choix fait en 3.
- La liste des **bugs** produit (XSS, cycles `parentId`, `escMD`…) est dans `TODO.md`, distincte de ce chantier outillage.
