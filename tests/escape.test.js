// Fonctions d'échappement : escapeHtml (rendu), escMD (export Markdown),
// escMermaid (diagramme Mermaid de l'export Markdown).
//
// escMD a déjà été un no-op silencieux (chaînes de remplacement mal écrites,
// corrigé le 2026-07-24) : ces tests figent le comportement attendu.

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadApp } from './helpers/load-app.mjs';

const app = loadApp();

test('escapeHtml neutralise les balises', () => {
  assert.equal(app.escapeHtml('<b>gras</b>'), '&lt;b&gt;gras&lt;/b&gt;');
  assert.equal(
    app.escapeHtml('<img src=x onerror=alert(1)>'),
    '&lt;img src=x onerror=alert(1)&gt;'
  );
  assert.equal(app.escapeHtml('a & b'), 'a &amp; b');
  assert.equal(app.escapeHtml('rien à échapper'), 'rien à échapper');
});

test('escapeHtml échappe & en premier (pas de double échappement inversé)', () => {
  // Si < était traité avant &, on obtiendrait '&amp;lt;' pour une entrée '<'.
  assert.equal(app.escapeHtml('&lt;'), '&amp;lt;');
  assert.equal(app.escapeHtml('&<>'), '&amp;&lt;&gt;');
});

test('escMD échappe les caractères qui cassent un tableau Markdown', () => {
  assert.equal(app.escMD('Analyse | Conception'), 'Analyse \\| Conception');
  assert.equal(app.escMD('*gras*'), '\\*gras\\*');
  assert.equal(app.escMD('nom_avec_underscores'), 'nom\\_avec\\_underscores');
  assert.equal(app.escMD('a|b*c_d'), 'a\\|b\\*c\\_d');
});

test('escMD échappe TOUTES les occurrences et tolère l\'absence de valeur', () => {
  assert.equal(app.escMD('a|b|c'), 'a\\|b\\|c');
  assert.equal(app.escMD(''), '');
  assert.equal(app.escMD(null), '');
  assert.equal(app.escMD(undefined), '');
  assert.equal(app.escMD('Phase 1 — Conception'), 'Phase 1 — Conception');
});

test('escMermaid retire les caractères que Mermaid interprète', () => {
  assert.equal(app.escMermaid('Phase 1 : conception'), 'Phase 1  - conception');
  assert.equal(app.escMermaid('a, b, c'), 'a  b  c');
  assert.equal(app.escMermaid('tâche #3'), 'tâche 3');
  assert.equal(app.escMermaid('dit "bonjour"'), "dit 'bonjour'");
  assert.equal(app.escMermaid('  espaces  '), 'espaces', 'trim final');
  assert.equal(app.escMermaid(null), '');
});
