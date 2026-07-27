// Hiérarchie des tâches : getDescendants / getChildren / getVisibleRows.
//
// Point sensible : un cycle `parentId` (possible via un import JSON non validé,
// cf. TODO.md) faisait boucler ces fonctions à l'infini. Les tests « cycle »
// ci-dessous plafonnent le nombre d'accès au tableau `tasks` : sans garde-fou
// dans le code, ils échouent au lieu de figer la suite de tests.

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadApp, plain } from './helpers/load-app.mjs';

const app = loadApp();

// Fabrique une tâche minimale (ordre = id par défaut, suffisant pour les tris).
function task(id, parentId, extra = {}) {
  return {
    id,
    name: `T${id}`,
    description: '',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    type: 'standard',
    parentId,
    order: id,
    collapsed: false,
    ...extra,
  };
}

const summary = (id, parentId, extra = {}) => task(id, parentId, { type: 'summary', ...extra });

// Arbre de référence :
//   1 (récap)
//   ├── 2
//   └── 3 (récap)
//       └── 4
//   5
function sampleTree() {
  return [summary(1, null), task(2, 1), summary(3, 1), task(4, 3), task(5, null)];
}

// Enveloppe `tasks` d'un budget d'accès : au-delà, on lève au lieu de boucler
// indéfiniment (une boucle infinie bloquerait le processus de test entier).
function withCallBudget(arr, max = 1000) {
  let calls = 0;
  return new Proxy(arr, {
    get(target, prop, receiver) {
      if (prop === 'filter' || prop === 'find' || prop === 'forEach' || prop === 'some') {
        if (++calls > max) throw new Error(`boucle infinie suspectée : plus de ${max} parcours de tasks`);
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

test('getChildren ne renvoie que les enfants directs', () => {
  app.tasks = sampleTree();
  assert.deepEqual(plain(app.getChildren(1).map(t => t.id)), [2, 3]);
  assert.deepEqual(plain(app.getChildren(3).map(t => t.id)), [4]);
  assert.deepEqual(plain(app.getChildren(2).map(t => t.id)), []);
  assert.deepEqual(plain(app.getChildren(null).map(t => t.id)), [1, 5]);
});

test('getDescendants descend sur tous les niveaux', () => {
  app.tasks = sampleTree();
  assert.deepEqual(plain(app.getDescendants(1).sort()), [2, 3, 4]);
  assert.deepEqual(plain(app.getDescendants(3)), [4]);
  assert.deepEqual(plain(app.getDescendants(2)), [], 'une feuille n\'a pas de descendant');
  assert.deepEqual(plain(app.getDescendants(999)), [], 'id inconnu → tableau vide');
});

test('RG-24 — getDescendants termine sur un cycle parentId', () => {
  // 1 → 2 → 3 → 1 : chaque nœud est le parent du suivant, en boucle.
  app.tasks = withCallBudget([summary(1, 3), summary(2, 1), summary(3, 2)]);
  const result = plain(app.getDescendants(1));
  assert.deepEqual(result.sort(), [2, 3], 'chaque nœud du cycle listé une seule fois');
  assert.ok(!result.includes(1), 'le point de départ ne se liste pas lui-même');
});

test('RG-24 — getDescendants termine sur une auto-référence', () => {
  app.tasks = withCallBudget([summary(1, 1), task(2, 1)]);
  assert.deepEqual(plain(app.getDescendants(1).sort()), [2]);
});

test('RG-04 — recalcSummary aligne une récapitulative sur ses enfants', () => {
  app.tasks = [
    summary(1, null, { startDate: '2000-01-01', endDate: '2000-01-02' }),
    task(2, 1, { startDate: '2026-03-01', endDate: '2026-03-10' }),
    task(3, 1, { startDate: '2026-02-20', endDate: '2026-03-05' }),
  ];
  app.recalcSummary(1);
  const s = app.tasks[0];
  assert.equal(s.startDate, '2026-02-20', 'début = le plus tôt des enfants');
  assert.equal(s.endDate, '2026-03-10', 'fin = le plus tard des enfants');
});

test('RG-06/RG-20 — recalcSummary laisse ses dates à une récapitulative vide', () => {
  // Choix produit : une récapitulative sans sous-tâche garde son type mais ses
  // dates ne sont plus pilotées par personne — elle reste donc manipulable
  // (barre déplaçable, saisie inline) sans être réécrasée au rendu suivant.
  app.tasks = [summary(1, null, { startDate: '2026-04-01', endDate: '2026-04-30' })];
  app.recalcSummary(1);
  app.recalcAllSummaries();
  assert.equal(app.tasks[0].startDate, '2026-04-01');
  assert.equal(app.tasks[0].endDate, '2026-04-30');
  assert.equal(app.tasks[0].type, 'summary', 'elle reste récapitulative');
});

test('getVisibleRows renvoie l\'arbre à plat avec les niveaux', () => {
  app.tasks = sampleTree();
  app.searchQuery = '';
  assert.deepEqual(
    plain(app.getVisibleRows().map(r => [r.task.id, r.level])),
    [[1, 0], [2, 1], [3, 1], [4, 2], [5, 0]]
  );
});

test('getVisibleRows trie les frères et sœurs par `order`', () => {
  app.tasks = [
    summary(1, null, { order: 0 }),
    task(2, 1, { order: 2 }),
    task(3, 1, { order: 0 }),
    task(4, 1, { order: 1 }),
  ];
  app.searchQuery = '';
  assert.deepEqual(plain(app.getVisibleRows().map(r => r.task.id)), [1, 3, 4, 2]);
});

test('getVisibleRows masque les enfants d\'un nœud replié', () => {
  const tree = sampleTree();
  tree.find(t => t.id === 1).collapsed = true;
  app.tasks = tree;
  app.searchQuery = '';
  assert.deepEqual(plain(app.getVisibleRows().map(r => r.task.id)), [1, 5]);
});

test('RG-25 — getVisibleRows en recherche garde les ancêtres du résultat', () => {
  const tree = sampleTree();
  tree.find(t => t.id === 4).name = 'Recette validée';
  app.tasks = tree;
  app.searchQuery = 'recette';
  // 4 correspond ; 1 et 3 sont conservés parce qu'ils portent le résultat.
  assert.deepEqual(plain(app.getVisibleRows().map(r => r.task.id)), [1, 3, 4]);
  app.searchQuery = '';
});

test('RG-25 — getVisibleRows en recherche traverse les nœuds repliés', () => {
  // Le résultat est deux niveaux plus bas, sous deux ancêtres repliés : il doit
  // rester visible, sinon le compteur de résultats annonce une tâche
  // introuvable à l'écran.
  const tree = sampleTree();
  tree.find(t => t.id === 1).collapsed = true;
  tree.find(t => t.id === 3).collapsed = true;
  tree.find(t => t.id === 4).name = 'Recette validée';
  app.tasks = tree;
  app.searchQuery = 'recette';
  assert.deepEqual(plain(app.getVisibleRows().map(r => r.task.id)), [1, 3, 4]);
  app.searchQuery = '';
});

test('RG-25 — le repli reprend ses droits dès que la recherche est vidée', () => {
  const tree = sampleTree();
  tree.find(t => t.id === 1).collapsed = true;
  app.tasks = tree;
  app.searchQuery = 't';       // correspond à toutes les tâches (« T1 », « T2 »…)
  assert.deepEqual(plain(app.getVisibleRows().map(r => r.task.id)), [1, 2, 3, 4, 5]);
  app.searchQuery = '';
  assert.deepEqual(plain(app.getVisibleRows().map(r => r.task.id)), [1, 5]);
});

test('RG-24 — getVisibleRows en recherche ne boucle pas sur un cycle d\'ancêtres', () => {
  app.tasks = withCallBudget([summary(1, 3), summary(2, 1), summary(3, 2)]);
  app.searchQuery = 't2';
  // Le cycle n'est rattaché à aucune racine : rien n'est affichable, mais la
  // remontée d'ancêtres doit s'arrêter au lieu de tourner sans fin.
  assert.deepEqual(plain(app.getVisibleRows()), []);
  app.searchQuery = '';
});
