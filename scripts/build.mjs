#!/usr/bin/env node
// Build de GanttPro : régénère le fichier autonome ganttPro.html à partir des
// sources séparées de src/ (index.html + style.css + app.js).
//
// Le développement se fait dans src/ (fichiers lisibles et testables) ; ce
// script réinjecte le CSS et le JS aux emplacements marqués du gabarit HTML,
// produisant un fichier unique sans dépendance externe — le livrable.
//
// Lecture/écriture en 'latin1' (mapping octet-à-octet) pour reproduire la
// sortie exactement, sans toucher aux fins de ligne ni à un éventuel BOM.
//
// Usage :  node scripts/build.mjs   (ou : npm run build)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const enc = 'latin1';

const STYLE_TOKEN = '@@GANTT_STYLE@@';
const SCRIPT_TOKEN = '@@GANTT_SCRIPT@@';

const tpl = readFileSync(resolve(root, 'src/index.html'), enc);
const css = readFileSync(resolve(root, 'src/style.css'), enc);
const js = readFileSync(resolve(root, 'src/app.js'), enc);

for (const [token, name] of [[STYLE_TOKEN, 'src/index.html'], [SCRIPT_TOKEN, 'src/index.html']]) {
  if (!tpl.includes(token)) {
    console.error(`✗ Marqueur ${token} introuvable dans ${name}. Build annulé.`);
    process.exit(1);
  }
}

// Remplaçants passés en fonction : évite l'interprétation des motifs spéciaux
// ($&, $1…) si le CSS/JS contient des '$'.
const out = tpl
  .replace(STYLE_TOKEN, () => css)
  .replace(SCRIPT_TOKEN, () => js);

const target = resolve(root, 'ganttPro.html');
writeFileSync(target, out, enc);
console.log(`✓ ganttPro.html régénéré (${out.length} octets) depuis src/`);
