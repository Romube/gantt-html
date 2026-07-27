// sanitizeProject() — validation/réparation d'un projet chargé, qu'il vienne
// d'un fichier JSON importé ou du localStorage.
//
// Principe retenu : on ne refuse le fichier que s'il n'a pas de liste de
// tâches ; tout le reste est réparé et signalé. Ces tests figent les règles de
// réparation, en particulier celles qui protègent le rendu (dates illisibles,
// parentId orphelin, hiérarchie circulaire).

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadApp, plain } from './helpers/load-app.mjs';

const app = loadApp();

function task(id, extra = {}) {
  return {
    id,
    name: `T${id}`,
    description: '',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    type: 'standard',
    parentId: null,
    order: 0,
    collapsed: false,
    ...extra,
  };
}

const project = (tasks, extra = {}) => ({ version: 1, name: 'Projet', nextId: 99, tasks, ...extra });

test('RG-23 — un projet valide traverse sans modification ni avertissement', () => {
  const src = project([task(1), task(2, { parentId: 1, type: 'summary' })]);
  const out = app.sanitizeProject(src);
  assert.deepEqual(plain(out.tasks), plain(src.tasks));
  assert.deepEqual(plain(out.warnings), []);
  assert.equal(out.nextId, 99);
  assert.equal(out.name, 'Projet');
});

test('RG-23 — refuse seulement l\'absence de liste de tâches', () => {
  assert.throws(() => app.sanitizeProject(null), /format invalide/);
  assert.throws(() => app.sanitizeProject({}), /format invalide/);
  assert.throws(() => app.sanitizeProject({ tasks: 'nope' }), /format invalide/);
  assert.deepEqual(plain(app.sanitizeProject({ tasks: [] }).tasks), [], 'un projet vide est légitime');
});

test('RG-23 — ignore les entrées inexploitables', () => {
  const out = app.sanitizeProject(project([
    null,
    'texte',
    { name: 'sans id' },
    task(1),
    task(1, { name: 'doublon' }),
  ]));
  assert.deepEqual(plain(out.tasks.map(t => t.id)), [1]);
  assert.equal(out.tasks[0].name, 'T1', 'le premier gagne, le doublon est écarté');
  assert.equal(out.warnings.length, 4);
});

test('RG-02/RG-23 — remplace les dates illisibles et remet la fin après le début', () => {
  const out = app.sanitizeProject(project([
    task(1, { startDate: 'n\'importe quoi', endDate: '2026-05-10' }),
    task(2, { startDate: '2026-02-31', endDate: '2026-02-31' }), // date inexistante
    task(3, { startDate: '2026-06-10', endDate: '2026-06-01' }),
  ]));
  const [a, b, c] = out.tasks;
  assert.equal(a.startDate, '2026-05-10', 'début illisible → aligné sur la fin');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(b.startDate), '31 février → date de repli valide');
  assert.equal(b.startDate, b.endDate);
  assert.equal(c.endDate, '2026-06-10', 'fin antérieure au début → recalée');
  assert.equal(out.warnings.length, 3);
});

test('RG-23 — normalise les champs secondaires', () => {
  const out = app.sanitizeProject(project([
    task(1, { type: 'phase', name: '   ', description: 42, order: 'x', collapsed: 'oui' }),
  ]));
  const t = out.tasks[0];
  assert.equal(t.type, 'standard', 'type inconnu → standard');
  assert.equal(t.name, 'Sans nom');
  assert.equal(t.description, '');
  assert.equal(t.order, 0);
  assert.equal(t.collapsed, false, 'seul le booléen true replie une tâche');
  assert.equal(app.sanitizeProject(project([task(1, { collapsed: true })])).tasks[0].collapsed, true);
  assert.ok(out.warnings.length >= 2);
});

test('RG-23 — replace à la racine les parentId orphelins ou auto-référents', () => {
  const out = app.sanitizeProject(project([
    task(1, { parentId: 404 }),
    task(2, { parentId: 2 }),
    task(3, { parentId: 1 }),
  ]));
  assert.deepEqual(plain(out.tasks.map(t => t.parentId)), [null, null, 1]);
  assert.equal(out.warnings.length, 2);
});

test('RG-23/RG-24 — casse les hiérarchies circulaires', () => {
  // 1 → 2 → 3 → 1 : aucune tâche n'est atteignable depuis la racine.
  const out = app.sanitizeProject(project([
    task(1, { parentId: 3 }),
    task(2, { parentId: 1 }),
    task(3, { parentId: 2 }),
  ]));
  const roots = out.tasks.filter(t => t.parentId === null);
  assert.equal(roots.length, 1, 'exactement un lien coupé, la hiérarchie reste connexe');
  assert.ok(out.warnings.some(w => w.includes('circulaire')));
  // Preuve que le cycle a disparu : tout le monde remonte à la racine.
  for (const t of out.tasks) {
    let cur = t, hops = 0;
    while (cur.parentId !== null && hops++ < 10) cur = out.tasks.find(p => p.id === cur.parentId);
    assert.equal(cur.parentId, null, `« ${t.name} » doit remonter à une racine`);
  }
});

test('RG-07/RG-23 — recalcule nextId quand il est absent ou trop bas', () => {
  assert.equal(app.sanitizeProject({ tasks: [task(7), task(3)] }).nextId, 8);
  assert.equal(app.sanitizeProject(project([task(7)], { nextId: 2 })).nextId, 8, 'nextId trop bas → recalculé');
  assert.equal(app.sanitizeProject(project([task(7)], { nextId: 50 })).nextId, 50, 'nextId plus haut → conservé');
  assert.equal(app.sanitizeProject({ tasks: [] }).nextId, 1);
});

test('le nom du projet est null quand il est inutilisable (l\'appelant choisit son défaut)', () => {
  assert.equal(app.sanitizeProject({ tasks: [] }).name, null);
  assert.equal(app.sanitizeProject({ tasks: [], name: '   ' }).name, null);
  assert.equal(app.sanitizeProject({ tasks: [], name: 'Chantier' }).name, 'Chantier');
});
