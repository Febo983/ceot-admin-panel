#!/usr/bin/env node
// Bumpea la versión del panel en UN solo paso.
//
//   node tools/bump.mjs                 -> build = AAAA-MM-DD-HHMM (hora local)
//   node tools/bump.mjs mi-cambio       -> build = AAAA-MM-DD-mi-cambio
//   node tools/bump.mjs --dry mi-cambio -> muestra qué cambiaría, no escribe
//
// Escribe el mismo valor en los tres lugares que tienen que coincidir:
//   1. version.txt (sin salto de línea final, como lo espera el auto-chequeo)
//   2. CURRENT_BUILD dentro de index.html
//   3. el ?v= de cada <script src="..."> LOCAL de index.html (cache-bust)
// Los scripts externos (http/https) no se tocan. Después corré
// `node tools/preflight.mjs`, que verifica que quedó todo alineado.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const slug = args.find((a) => !a.startsWith('--'));

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const fecha = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const build = slug ? `${fecha}-${slug}` : `${fecha}-${pad(now.getHours())}${pad(now.getMinutes())}`;

// El valor va dentro de un atributo HTML, de un string JS y de un archivo:
// solo letras, números, punto, guion y guion bajo.
if (!/^[A-Za-z0-9._-]+$/.test(build)) {
  console.error(`Nombre de build inválido: "${build}". Usá solo letras, números, ".", "-" y "_" (sin espacios).`);
  process.exit(1);
}

const htmlPath = ROOT + 'index.html';
const verPath = ROOT + 'version.txt';
const html = readFileSync(htmlPath, 'utf8');
const anterior = readFileSync(verPath, 'utf8').trim();

let nSrc = 0;
let nSinV = 0;
let out = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (tag, src) => {
  if (/^(https?:)?\/\//i.test(src)) return tag; // externo: no se toca
  if (!/[?&]v=/.test(src)) { nSinV++; return tag; }
  nSrc++;
  return tag.replace(/([?&]v=)[^"'&\s>]*/, `$1${build}`);
});

let nBuild = 0;
out = out.replace(/(CURRENT_BUILD\s*=\s*')[^']*(')/, (_, a, b) => { nBuild++; return `${a}${build}${b}`; });

if (nBuild !== 1) {
  console.error(`No pude actualizar CURRENT_BUILD (encontré ${nBuild} coincidencias, esperaba 1). No escribí nada.`);
  process.exit(1);
}
if (!nSrc) {
  console.error('No encontré ningún <script src="...?v=..."> local para actualizar. No escribí nada.');
  process.exit(1);
}
if (build === anterior) {
  console.warn(`! El build "${build}" ya era el actual: nada cambia y los navegadores abiertos no van a ver el aviso. Elegí otro nombre.`);
}

console.log(`${dry ? '[dry] ' : ''}build: "${anterior}" -> "${build}"`);
console.log(`  ${nSrc} <script src> local(es) con ?v=, CURRENT_BUILD y version.txt`);
if (nSinV) console.warn(`  ! ${nSinV} <script src> local(es) SIN ?v= (no se cachean-bustean; agregales ?v=${build} si deberían)`);

if (!dry) {
  writeFileSync(htmlPath, out);
  writeFileSync(verPath, build);
  console.log('Listo. Ahora: node tools/preflight.mjs');
}
