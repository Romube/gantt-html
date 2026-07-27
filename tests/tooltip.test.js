// buildTooltip() — seule fabrique de HTML de l'app qui soit une fonction pure
// (elle renvoie une chaîne au lieu d'écrire dans le DOM), donc la seule dont la
// protection XSS soit vérifiable ici.
//
// Le HTML produit est injecté via innerHTML dans #tooltip : tout texte venant
// d'une tâche (nom, description) doit être échappé. Les deux autres points
// d'injection corrigés en même temps (barres du Gantt, option de nesting)
// écrivent directement dans le DOM → vérification manuelle.

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadApp } from './helpers/load-app.mjs';

const app = loadApp();

function tooltipFor(extra) {
  return app.buildTooltip({
    id: 1,
    name: 'Tâche',
    description: '',
    startDate: '2026-01-01',
    endDate: '2026-01-10',
    type: 'standard',
    parentId: null,
    order: 0,
    collapsed: false,
    ...extra,
  });
}

test('RG-22 — buildTooltip échappe le nom de la tâche', () => {
  const html = tooltipFor({ name: '<img src=x onerror=alert(1)>' });
  assert.ok(!html.includes('<img'), 'aucune balise img ne doit subsister');
  // Le texte « onerror=… » peut rester : hors d'une balise, il est inerte.
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'le nom reste lisible, échappé');
});

test('RG-22 — buildTooltip échappe la description', () => {
  const html = tooltipFor({ description: '<script>alert(1)</script>' });
  assert.ok(!html.includes('<script'), 'aucune balise script ne doit subsister');
  assert.ok(html.includes('&lt;script&gt;'), 'la description reste lisible, échappée');
});

test('RG-22 — buildTooltip échappe les deux champs à la fois', () => {
  const html = tooltipFor({ name: '</strong><b>x', description: '</span><b>y' });
  assert.ok(!html.includes('<b>'), 'aucune balise injectée');
});

test('buildTooltip affiche les informations attendues', () => {
  const html = tooltipFor({ name: 'Analyse & conception' });
  assert.ok(html.includes('Analyse &amp; conception'));
  assert.ok(html.includes('Début : 01/01/2026'));
  assert.ok(html.includes('Fin : 10/01/2026'));
  assert.ok(html.includes('Durée : 10 jours'), 'durée inclusive');
});

test('buildTooltip d\'un jalon n\'affiche ni fin ni durée', () => {
  const html = tooltipFor({ startDate: '2026-03-02', endDate: '2026-03-02' });
  assert.ok(html.includes('Jalon'));
  assert.ok(html.includes('Début : 02/03/2026'));
  assert.ok(!html.includes('Fin :'));
  assert.ok(!html.includes('Durée :'));
});
