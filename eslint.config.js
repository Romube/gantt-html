// Config ESLint (flat config) pour GanttPro.
//
// Depuis le découpage (chantier workflow, point 3), le JS de l'application vit
// dans src/app.js — un vrai fichier .js lisible directement par ESLint (plus
// besoin d'un plugin pour extraire un <script> inline).
//
// Objectif : attraper les bugs de logique que `node --check` (syntaxe pure) ne
// voit pas — globales implicites (no-undef), échappements de regex/chaînes
// inutiles (no-useless-escape), clés dupliquées, code injoignable, etc.
//
// `no-unused-vars` est désactivé : la plupart des fonctions de haut niveau sont
// appelées via des attributs onclick=/oninput= dans src/index.html, que le
// linter ne voit pas → elles seraient toutes signalées à tort comme inutilisées.

import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // `vars: 'local'` : on ignore les déclarations de portée globale — la
      // plupart des fonctions de haut niveau sont appelées via onclick=/oninput=
      // dans src/index.html, invisible pour le linter — mais on signale bien les
      // variables locales laissées derrière soi (vestiges de refactorisation).
      'no-unused-vars': ['error', { vars: 'local', args: 'none', caughtErrors: 'none' }],
    },
  },
  {
    // Les tests (chantier workflow, point 4) sont des modules ESM Node, pas du
    // script navigateur : ils ont leurs propres globales et sourceType.
    files: ['tests/**/*.js', 'tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
