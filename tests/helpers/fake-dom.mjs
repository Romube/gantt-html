// Faux DOM minimal pour charger src/app.js hors navigateur.
//
// But : exécuter le script tel quel (aucune modification de src/app.js, aucun
// export à maintenir) puis récupérer ses fonctions pures pour les tester.
// On ne simule que ce que le script touche réellement au chargement :
// getElementById / createElement / querySelector(All) / classList / style /
// addEventListener, plus localStorage, Blob, URL et alert.
//
// Ce stub ne prétend PAS reproduire un navigateur : il rend juste le
// chargement inoffensif. Tout ce qui dépend du rendu réel (positions,
// tailles en pixels) reste hors du champ des tests.

class FakeClassList {
  constructor(el) { this.el = el; }
  add(...c) { c.forEach(x => this.el._classes.add(x)); }
  remove(...c) { c.forEach(x => this.el._classes.delete(x)); }
  contains(c) { return this.el._classes.has(c); }
  toggle(c, force) {
    const on = force === undefined ? !this.contains(c) : !!force;
    if (on) this.add(c); else this.remove(c);
    return on;
  }
}

class FakeElement {
  constructor(tag = 'div') {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.childNodes = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = {};
    this._classes = new Set();
    this._listeners = {};
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.scrollLeft = 0;
    this.scrollTop = 0;
    this.scrollWidth = 0;
    this.scrollHeight = 0;
    this.offsetWidth = 0;
    this.offsetHeight = 0;
    this.clientWidth = 0;
    this.clientHeight = 0;
  }

  get classList() { return new FakeClassList(this); }

  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this._classes].join(' '); }

  appendChild(child) {
    if (child) { child.parentNode = this; this.children.push(child); this.childNodes.push(child); }
    return child;
  }
  insertBefore(child, ref) {
    const i = this.children.indexOf(ref);
    if (child) child.parentNode = this;
    this.children.splice(i < 0 ? this.children.length : i, 0, child);
    return child;
  }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    if (child) child.parentNode = null;
    return child;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(k, v) { this[k] = v; }
  getAttribute(k) { return this[k] === undefined ? null : this[k]; }
  removeAttribute(k) { delete this[k]; }
  addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) {
    const l = this._listeners[type];
    if (l) this._listeners[type] = l.filter(f => f !== fn);
  }
  dispatchEvent() { return true; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  contains() { return false; }
  focus() {}
  blur() {}
  click() {}
  select() {}
  getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }; }
  scrollTo() {}
}

class FakeDocument {
  constructor() {
    this._byId = new Map();
    this.body = new FakeElement('body');
    this.documentElement = new FakeElement('html');
    this.activeElement = null;
    this._listeners = {};
  }
  // Renvoie toujours le même élément pour un id donné : le script lit et
  // réécrit les mêmes nœuds (ex. project-name) d'un appel à l'autre.
  getElementById(id) {
    if (!this._byId.has(id)) {
      const el = new FakeElement('div');
      el.id = id;
      this._byId.set(id, el);
    }
    return this._byId.get(id);
  }
  createElement(tag) { return new FakeElement(tag); }
  createElementNS(_ns, tag) { return new FakeElement(tag); }
  createTextNode(text) { const el = new FakeElement('#text'); el.textContent = text; return el; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) {
    const l = this._listeners[type];
    if (l) this._listeners[type] = l.filter(f => f !== fn);
  }
}

class FakeStorage {
  constructor() { this._m = new Map(); }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(k, String(v)); }
  removeItem(k) { this._m.delete(k); }
  clear() { this._m.clear(); }
}

// Contexte global façon navigateur, à passer à vm.createContext().
// `cssVars` : variables CSS lues par getComputedStyle (--row-h, --bar-h…),
// fournies par l'appelant depuis src/style.css pour rester en phase.
export function createBrowserGlobals(cssVars = {}) {
  const document = new FakeDocument();
  const globals = {
    document,
    getComputedStyle: () => ({
      getPropertyValue: (name) => cssVars[name] ?? '0',
    }),
    localStorage: new FakeStorage(),
    alert: () => {},
    confirm: () => true,
    prompt: () => null,
    // Le script planifie un scroll initial en setTimeout : on l'avale pour ne
    // pas dépendre du rendu (et ne pas laisser de timer ouvert dans les tests).
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: () => 0,
    Blob: class Blob { constructor(parts) { this.parts = parts; } },
    FileReader: class FileReader { readAsText() {} },
    URL: { createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} },
    console,
    Math, Date, JSON, Set, Map, Array, Object, String, Number, Boolean, RegExp, Error,
  };
  globals.window = globals;
  globals.self = globals;
  globals.globalThis = globals;
  globals.innerWidth = 1280;
  globals.innerHeight = 800;
  return globals;
}
