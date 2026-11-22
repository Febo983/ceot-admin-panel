// Actualiza arquitectura.json (líneas por archivo, versión, fecha) y lo
// embebe en arquitectura.html, así la página funciona sola (sin fetch) y el
// JSON queda descargable al lado. Uso: node tools/arquitectura.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = join(root, 'arquitectura.json');
const htmlPath = join(root, 'arquitectura.html');

const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
data.version = readFileSync(join(root, 'version.txt'), 'utf8').trim();
data.generado = new Date().toISOString().slice(0, 10);
const faltan = [];
for (const f of data.archivos) {
  const p = join(root, f.ruta);
  if (!existsSync(p)) { faltan.push(f.ruta); f.lineas = 0; continue; }
  f.lineas = readFileSync(p, 'utf8').split('\n').length;
}
writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');

const html = readFileSync(htmlPath, 'utf8');
const ini = '<!-- ARQ-DATA:START -->', fin = '<!-- ARQ-DATA:END -->';
const a = html.indexOf(ini), b = html.indexOf(fin);
if (a < 0 || b < 0) throw new Error('arquitectura.html: faltan los marcadores ARQ-DATA');
const embebido = JSON.stringify(data).replace(/</g, '\\u003c');
writeFileSync(htmlPath, html.slice(0, a + ini.length)
  + '\n<script type="application/json" id="arq-data">' + embebido + '</script>\n'
  + html.slice(b));

console.log('arquitectura: ' + data.archivos.length + ' archivos, versión ' + data.version);
if (faltan.length) console.log('  ⚠ no existen: ' + faltan.join(', '));
