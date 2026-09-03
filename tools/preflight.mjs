#!/usr/bin/env node
// Chequeo previo a publicar. Corré `node tools/preflight.mjs` antes de cada push.
// No tiene dependencias. Falla (exit 1) si algo está mal; imprime OK si pasa todo.
//
// Verifica:
//   1. No quedaron marcadores de conflicto de git (<<<<<<< / ======= / >>>>>>>).
//   2. Cada <script> inline de index.html parsea sin error de sintaxis.
//   3. version.txt coincide con CURRENT_BUILD dentro de index.html.
//   4. version.txt cambió respecto de git HEAD (aviso, no error) — si no cambió,
//      los navegadores con la página abierta no van a ver "hay versión nueva".

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import vm from 'node:vm';

const ROOT = new URL('..', import.meta.url).pathname;
const rd = (p) => readFileSync(ROOT + p, 'utf8');

let errors = 0;
let warnings = 0;
const fail = (m) => { console.error('  ✗ ' + m); errors++; };
const warn = (m) => { console.warn('  ! ' + m); warnings++; };
const ok = (m) => console.log('  ✓ ' + m);

const html = rd('index.html');

// 1. marcadores de conflicto
{
  const re = /^(<{7}|={7}|>{7})( |$)/gm;
  const hits = [];
  let m;
  while ((m = re.exec(html))) hits.push(html.slice(0, m.index).split('\n').length);
  if (hits.length) fail(`marcadores de conflicto en index.html, líneas: ${hits.join(', ')}`);
  else ok('sin marcadores de conflicto');
}

// 2a. sintaxis de cada <script> inline
{
  const re = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, i = 0, bad = 0;
  while ((m = re.exec(html))) {
    i++;
    const code = m[1];
    const startLine = html.slice(0, m.index).split('\n').length;
    try {
      new vm.Script(code, { filename: `index.html:<script #${i} @L${startLine}>` });
    } catch (e) {
      bad++;
      fail(`<script #${i}> (empieza en L${startLine}): ${e.message}`);
    }
  }
  if (i === 0) fail('no se encontró ningún <script> inline en index.html');
  else if (!bad) ok(`${i} bloques <script> inline parsean OK`);
}

// 2b. sintaxis de cada <script src="..."> local + cache-bust ?v= al día
{
  const ver = rd('version.txt').trim();
  const re = /<script\b[^>]*\bsrc=["']([^"']+?)["'][^>]*>/gi;
  let m, i = 0, bad = 0, staleBust = 0;
  while ((m = re.exec(html))) {
    let src = m[1];
    if (/^https?:/.test(src)) continue;
    i++;
    const q = src.split('?')[1] || '';
    const path = src.split('?')[0];
    const vq = new URLSearchParams(q).get('v');
    if (vq !== ver) { staleBust++; fail(`${src}: el ?v= ("${vq}") no coincide con version.txt ("${ver}") — actualizá el include`); }
    try {
      new vm.Script(rd(path), { filename: path });
    } catch (e) {
      bad++;
      fail(`${path}: ${e.message}`);
    }
  }
  if (i && !bad && !staleBust) ok(`${i} archivo(s) <script src> local(es): sintaxis OK y ?v= al día`);
}

// 3. version.txt === CURRENT_BUILD
{
  const ver = rd('version.txt').trim();
  const m = html.match(/CURRENT_BUILD\s*=\s*'([^']+)'/);
  if (!m) fail("no encontré CURRENT_BUILD = '...' en index.html");
  else if (m[1] !== ver) fail(`version.txt ("${ver}") != CURRENT_BUILD ("${m[1]}") — tienen que ser iguales`);
  else ok(`version.txt y CURRENT_BUILD coinciden ("${ver}")`);
}

// 4. version.txt cambió vs HEAD
{
  try {
    const head = execSync('git show HEAD:version.txt', { cwd: ROOT }).toString().trim();
    const now = rd('version.txt').trim();
    if (head === now) warn(`version.txt no cambió desde HEAD ("${now}") — bumpealo si este commit toca index.html`);
    else ok(`version.txt bumpeado: "${head}" -> "${now}"`);
  } catch {
    warn('no pude leer version.txt de HEAD (¿primer commit?) — salteando chequeo de bump');
  }
}

console.log('');
if (errors) {
  console.error(`preflight: ${errors} error(es)${warnings ? `, ${warnings} aviso(s)` : ''} — NO publiques.`);
  process.exit(1);
}
console.log(`preflight OK${warnings ? ` (${warnings} aviso(s))` : ''}.`);
