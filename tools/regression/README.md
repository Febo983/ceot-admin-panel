# Harness de regresión (sin backend)

Verifica que un refactor de `index.html` / `js/*.js` no cambie lo que se
renderiza. No usa datos remotos — solo lo hardcodeado en `js/datos.js`.

## Correr

```
python3 -m http.server 8781      # en la raíz del repo
```

Abrir http://localhost:8781, y en la consola del navegador:

```js
const c = await (await fetch('/tools/regression/harness.js')).text(); eval(c);
const g = await (await fetch('/tools/regression/golden.json')).text();
window.__check2(g);
```

Esperado tras un refactor que NO cambia UI:

```
{ total: 151, diffCount: 0, diffs: [], errs: [], nofn: [] }
```

- `diffCount > 0` → el refactor cambió algún render. Mirar `diffs[].k` y `diffs[].sample`.
- `errs` no vacío → alguna función tiró error (rompiste algo o falta un `<script src>`).
- `nofn` no vacío → una función quedó sin definir.

## Regenerar golden.json (después de un cambio de UI a propósito)

```js
const c = await (await fetch('/tools/regression/harness.js')).text(); eval(c);
// snap() está adentro del IIFE; usar __check2 con golden vacío para ver los hashes nuevos:
const r = window.__check2('{}');
// r.diffs tiene {k, now} de TODAS las claves. Armar el JSON nuevo con esos `now`,
// sacando las 4 pantallas async excluidas (ver cabecera de harness.js).
```

Después, pegar el JSON en `golden.json` y commitear junto con el cambio de UI.
