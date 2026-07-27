// Calculs de dates : dateDiff / addDays / parseDate / formatDate.
//
// Enjeu principal : verrouiller la non-régression du bug de fuseau horaire
// corrigé en v2.0 — les dates sont manipulées en heure LOCALE (new Date(y, m-1, d)),
// jamais via Date.parse('YYYY-MM-DD') qui interprète en UTC et décale d'un jour
// dans les fuseaux négatifs.

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadApp } from './helpers/load-app.mjs';

const app = loadApp();

test('dateDiff compte les jours entre deux dates', () => {
  assert.equal(app.dateDiff('2026-01-01', '2026-01-01'), 0);
  assert.equal(app.dateDiff('2026-01-01', '2026-01-02'), 1);
  assert.equal(app.dateDiff('2026-01-31', '2026-02-01'), 1);
  assert.equal(app.dateDiff('2026-01-01', '2027-01-01'), 365);
  assert.equal(app.dateDiff('2026-01-10', '2026-01-01'), -9, 'sens inverse → négatif');
});

test('RG-15 — dateDiff traverse un changement d\'heure d\'été sans décalage', () => {
  // Passage à l'heure d'été en Europe : nuit du 28 au 29 mars 2026 (23 h).
  // Un calcul naïf en millisecondes sans Math.round renverrait 0,958 jour.
  assert.equal(app.dateDiff('2026-03-28', '2026-03-29'), 1);
  // Retour à l'heure d'hiver : nuit du 24 au 25 octobre 2026 (25 h).
  assert.equal(app.dateDiff('2026-10-24', '2026-10-25'), 1);
  assert.equal(app.dateDiff('2026-03-01', '2026-11-01'), 245);
});

test('RG-15 — addDays reste sur le bon jour civil (pas de dérive UTC)', () => {
  assert.equal(app.addDays('2026-01-01', 0), '2026-01-01');
  assert.equal(app.addDays('2026-01-01', 1), '2026-01-02');
  assert.equal(app.addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(app.addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(app.addDays('2026-12-31', 1), '2027-01-01');
});

test('addDays gère les années bissextiles', () => {
  assert.equal(app.addDays('2028-02-28', 1), '2028-02-29', '2028 est bissextile');
  assert.equal(app.addDays('2028-02-29', 1), '2028-03-01');
  assert.equal(app.addDays('2026-02-28', 1), '2026-03-01', '2026 ne l\'est pas');
});

test('addDays et dateDiff sont réciproques', () => {
  for (const n of [1, 7, 30, 365, -12]) {
    assert.equal(app.dateDiff('2026-06-15', app.addDays('2026-06-15', n)), n);
  }
});

test('RG-15 — parseDate construit une date locale (jamais UTC)', () => {
  const d = app.parseDate('2026-07-25');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 6, 'juillet = index 6');
  assert.equal(d.getDate(), 25, 'le jour civil ne doit pas glisser au 24');
  assert.equal(d.getHours(), 0);
  assert.equal(app.parseDate(''), null);
});

test('formatDate passe en JJ/MM/AAAA', () => {
  assert.equal(app.formatDate('2026-07-25'), '25/07/2026');
  assert.equal(app.formatDate('2026-01-05'), '05/01/2026');
  assert.equal(app.formatDate(''), '');
});
