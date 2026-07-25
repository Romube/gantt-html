// Charge src/app.js dans un contexte vm muni d'un faux DOM et rend son
// « global » accessible aux tests.
//
// Le script n'exporte rien (il est conçu pour être inliné dans une balise
// <script>) : on l'exécute donc dans un vm.createContext(), où toutes ses
// déclarations top-level (fonctions, `let tasks`, …) deviennent des propriétés
// du contexte. Les tests peuvent ainsi appeler `app.dateDiff(...)` ou piloter
// l'état via `setTasks(...)` sans que src/app.js ait à connaître les tests.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { createBrowserGlobals } from './fake-dom.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = resolve(root, 'src/app.js');
const CSS = resolve(root, 'src/style.css');

// Variables CSS du bloc :root, relues depuis la vraie feuille de style pour
// que le faux getComputedStyle renvoie les mêmes valeurs que le navigateur.
function readRootCssVars() {
  const css = readFileSync(CSS, 'utf8');
  const root = /:root\s*\{([^}]*)\}/.exec(css);
  const vars = {};
  if (root) {
    for (const m of root[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      vars[m[1]] = m[2].trim();
    }
  }
  return vars;
}

// Les valeurs renvoyées par le script viennent d'un autre realm (celui du vm) :
// leurs prototypes ne sont pas ceux du realm de test, et assert.deepEqual les
// refuse (« same structure but not reference-equal »). `plain()` les recopie
// côté test avant comparaison.
export const plain = (v) => JSON.parse(JSON.stringify(v));

// Charge une instance neuve de l'application (état isolé entre les tests).
export function loadApp() {
  const source = readFileSync(APP, 'utf8');
  const context = vm.createContext(createBrowserGlobals(readRootCssVars()));
  // `var`/`function` top-level atterrissent sur le contexte ; `let`/`const` non
  // (ils vivent dans la portée lexicale du script). On expose donc les
  // variables d'état dont les tests ont besoin via des accesseurs générés à la
  // suite du script, dans la même portée.
  const bridge = `
    globalThis.__app = {
      get tasks() { return tasks; },
      set tasks(v) { tasks = v; },
      get searchQuery() { return searchQuery; },
      set searchQuery(v) { searchQuery = v; },
      get nextId() { return nextId; },
      set nextId(v) { nextId = v; },
    };
    globalThis.__fn = (name) => eval(name);
  `;
  vm.runInContext(source + '\n' + bridge, context, { filename: APP });

  const state = context.__app;
  const fn = context.__fn;
  // Accès uniforme : app.dateDiff(...), app.tasks = [...]
  return new Proxy({}, {
    get(_t, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop in state) return state[prop];
      return fn(prop);
    },
    set(_t, prop, value) {
      state[prop] = value;
      return true;
    },
  });
}
