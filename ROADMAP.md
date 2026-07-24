# ROADMAP — Amélioration du workflow de développement

Chantier ouvert le 2026-07-24. Objectif : rendre le développement de `ganttPro.html` plus sûr et reproductible, **sans perdre l'atout « fichier HTML unique et autonome »** du produit livré.

Statut : `[ ]` à faire · `[~]` en cours · `[x]` fait. Mettre à jour ce fichier à chaque avancée pour qu'une autre session puisse reprendre sans contexte perdu.

---

## 1. Initialiser git — `[x]`

Le manque le plus urgent : aucune historisation aujourd'hui, chaque édition d'un fichier de ~3000 lignes est irréversible.

- [x] `git init` à la racine (branche `master`)
- [x] Premier commit de l'existant (`0a81ff5`, 2026-07-24) — `ganttPro.html`, `README.md`, `CLAUDE.md`, `TODO.md`, `ROADMAP.md`, `.gitignore`, `.docx`
- [x] `.docx` versionné en binaire ; `.claude/settings.local.json` exclu via `.gitignore`
- [ ] (Optionnel) Pousser vers le dépôt `github.com/Romube/gantt-html` déjà cité dans le README

## 2. Check de syntaxe JS reproductible — `[ ]`

Aujourd'hui une erreur JS ne se voit qu'à l'ouverture dans le navigateur.

- [ ] Script (`scripts/check.mjs` ou équivalent) qui extrait le contenu du `<script>` de `ganttPro.html` et le passe à `node --check`
- [ ] (Optionnel mais recommandé) ESLint sur le JS extrait — aurait attrapé la globale implicite `curMonthYear` et le `escMD()` cassé
- [ ] Documenter la commande dans `CLAUDE.md` (section Commandes)

## 3. Découpage du fichier — `[ ]` — **décision à valider par l'utilisateur**

Choix structurant. Options :
- **A** — garder le fichier unique (zéro friction, mais illisible/intestable à terme)
- **B** — développer en fichiers séparés (`index.html` + `style.css` + `app.js`) et *builder* le fichier autonome par un script de concaténation/inline → **recommandation Claude**, préserve le livrable mono-fichier
- **C** — modules ES + bundler (esbuild/Vite) → plus puissant, mais introduit npm + build lourd

- [ ] **Trancher A / B / C** (statut : option B proposée, en attente de validation)
- [ ] Mettre en place l'arborescence et le script de build correspondant
- [ ] Vérifier que le fichier buildé reste bit-à-bit fonctionnel et autonome

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
