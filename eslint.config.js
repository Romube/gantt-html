// Config ESLint (flat config) pour GanttPro.
//
// Le JS de l'application vit dans un bloc <script> inline de ganttPro.html ;
// eslint-plugin-html permet à ESLint de lire ce bloc directement, avec des
// numéros de ligne recalés sur le fichier HTML.
//
// Objectif : attraper les bugs de logique que `node scripts/check.mjs`
// (syntaxe pure) ne voit pas — globales implicites (no-undef), échappements
// de regex/chaînes inutiles (no-useless-escape, cf. bug escMD), clés dupliquées,
// code injoignable, etc.
//
// `no-unused-vars` est désactivé : la quasi-totalité des fonctions de haut
// niveau sont appelées via des attributs onclick=/oninput= dans le HTML, que
// le linter ne voit pas → elles seraient toutes signalées à tort comme inutilisées.

import js from '@eslint/js';
import globals from 'globals';
import html from 'eslint-plugin-html';

export default [
  {
    files: ['**/*.html'],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
    },
  },
];
