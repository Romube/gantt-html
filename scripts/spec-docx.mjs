#!/usr/bin/env node
// Génère le .docx diffusable de la spécification fonctionnelle à partir de sa
// source Markdown (docs/spec-fonctionnelle.md).
//
// Même principe que ganttPro.html : le .docx est un ARTEFACT. On n'édite que le
// Markdown, versionné avec le code ; le Word se regénère à la demande, et n'est
// pas versionné (voir .gitignore).
//
// Usage :  node scripts/spec-docx.mjs   (ou : npm run spec:docx)
// Prérequis : pandoc  →  winget install --id JohnMacFarlane.Pandoc

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, 'docs/spec-fonctionnelle.md');
const TARGET = resolve(root, 'docs/spec-fonctionnelle.docx');

// pandoc est normalement dans le PATH. Après une installation par winget, le
// PATH n'est rafraîchi qu'au prochain terminal : on retombe alors sur le
// dossier d'installation plutôt que d'échouer pour rien.
function findPandoc() {
  if (spawnSync('pandoc', ['--version'], { stdio: 'ignore' }).status === 0) return 'pandoc';

  const local = process.env.LOCALAPPDATA;
  if (local) {
    const link = join(local, 'Microsoft/WinGet/Links/pandoc.exe');
    if (existsSync(link)) return link;
    const pkgs = join(local, 'Microsoft/WinGet/Packages');
    if (existsSync(pkgs)) {
      const dir = readdirSync(pkgs).find(d => d.startsWith('JohnMacFarlane.Pandoc'));
      if (dir) {
        const base = join(pkgs, dir);
        const sub = readdirSync(base).find(d => d.startsWith('pandoc-'));
        const exe = sub ? join(base, sub, 'pandoc.exe') : null;
        if (exe && existsSync(exe)) return exe;
      }
    }
  }
  return null;
}

if (!existsSync(SOURCE)) {
  console.error(`✗ Source introuvable : ${SOURCE}`);
  process.exit(1);
}

const pandoc = findPandoc();
if (!pandoc) {
  console.error('✗ pandoc est introuvable. Installe-le puis relance :');
  console.error('    winget install --id JohnMacFarlane.Pandoc');
  process.exit(1);
}

// Pas de --toc : pandoc y insère un *champ* Word (« Table of Contents »), que
// LibreOffice n'évalue pas à l'ouverture — sommaire vide et titre en anglais.
// Le Markdown porte donc son propre sommaire, en liens vers les sections :
// cliquable dans Word comme dans LibreOffice, et utile tel quel sur GitHub.
const args = [
  SOURCE,
  '--from', 'gfm',              // tables pipe et syntaxe GitHub, comme rendu sur le dépôt
  '--to', 'docx',
  '--output', TARGET,
  '--metadata', 'lang=fr-FR',
];

const res = spawnSync(pandoc, args, { stdio: 'inherit' });
if (res.status !== 0) {
  console.error('✗ pandoc a échoué. .docx non regénéré.');
  process.exit(res.status ?? 1);
}
console.log(`✓ docs/spec-fonctionnelle.docx regénéré depuis le Markdown (pandoc ${pandoc === 'pandoc' ? 'du PATH' : pandoc}).`);
