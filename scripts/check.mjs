#!/usr/bin/env node
// Vérification de la syntaxe JavaScript de ganttPro.html.
//
// L'application est un fichier HTML unique : son JS vit dans un bloc <script>
// inline, donc aucun outil ne le voit tant qu'on n'ouvre pas le navigateur.
// Ce script extrait chaque bloc <script> sans attribut src, l'écrit dans un
// fichier temporaire et le passe à `node --check` (analyse syntaxique pure,
// sans exécution). Les numéros de ligne des erreurs sont recalés sur
// ganttPro.html pour être cliquables directement.
//
// Usage :  node scripts/check.mjs [chemin/vers/fichier.html]
// Défaut :  ganttPro.html (à la racine du dépôt)
// Sortie :  code 0 si tout est OK, 1 sinon.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(process.argv[2] ?? join(projectRoot, 'ganttPro.html'));

let html;
try {
  html = readFileSync(target, 'utf8');
} catch (err) {
  console.error(`✗ Impossible de lire ${target} : ${err.message}`);
  process.exit(1);
}

// Blocs <script> inline uniquement (on ignore ceux qui ont un attribut src).
const scriptRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const blocks = [];
let m;
while ((m = scriptRe.exec(html)) !== null) {
  const code = m[1];
  // Ligne (1-indexée) dans le HTML où commence le contenu du <script>.
  const startLine = html.slice(0, m.index + m[0].indexOf(code)).split('\n').length;
  blocks.push({ code, startLine });
}

if (blocks.length === 0) {
  console.error(`✗ Aucun bloc <script> inline trouvé dans ${target}`);
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'ganttpro-check-'));
let failed = false;

blocks.forEach((block, i) => {
  const file = join(tmp, `block_${i}.js`);
  writeFileSync(file, block.code, 'utf8');
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`✓ Bloc <script> #${i + 1} (débute l.${block.startLine}) : syntaxe OK`);
  } catch (err) {
    failed = true;
    // node --check écrit l'erreur sur stderr, avec un numéro de ligne relatif
    // au fichier temporaire ; on le recale sur ganttPro.html.
    const raw = (err.stderr?.toString() || err.message).trim();
    const recale = raw.replace(
      new RegExp(`${block_reEscape(file)}:(\\d+)`, 'g'),
      (_, ln) => `${target}:${Number(ln) + block.startLine - 1}`
    );
    console.error(`✗ Bloc <script> #${i + 1} (débute l.${block.startLine}) : erreur de syntaxe`);
    console.error(recale);
  }
});

function block_reEscape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (failed) {
  console.error('\n✗ Échec : au moins un bloc contient une erreur de syntaxe.');
  process.exit(1);
}
console.log('\n✓ Tous les blocs <script> sont syntaxiquement valides.');
