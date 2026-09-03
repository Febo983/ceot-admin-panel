# Publicar

Este repo se sirve tal cual por GitHub Pages (`master` → https://febo983.github.io/ceot-admin-panel/).
No hay build: lo que está en `master` es lo que ven los profesionales.

## Antes de cada push

1. **Bumpear la versión** (si el cambio toca `index.html`): poné el mismo valor
   nuevo en `version.txt` y en `CURRENT_BUILD` (dentro de `index.html`, script
   final "Auto-chequeo de versión"). Sin esto, quien tenga la página abierta
   no ve el aviso "hay versión nueva".

2. **Correr el chequeo automático:**
   ```
   node tools/preflight.mjs
   ```
   Verifica: sin marcadores de conflicto, sintaxis de todos los `<script>`,
   `version.txt` == `CURRENT_BUILD`, y que la versión se haya bumpeado.

3. **Smoke test manual** (2 minutos, con `python3 -m http.server 8781` y
   abriendo http://localhost:8781):
   - Login profesional (apellido + matrícula) de un **director** (ej. Bruni) y
     de uno del **resto** (ej. De la Colina).
     - Se abre el portal, se ve el mes actual con sus cheques y el NETO.
     - Historial y Mi Panel abren sin error.
   - Login **admin**.
     - Home de accesos carga.
     - "Transferencias del Mes": Sueldo Director, Resto, Gastos A e Inversiones
       renderizan; los checks de "transferido" tildan y quedan.
     - "Liquidaciones" del mes actual renderiza.
   - Consola del navegador sin errores en rojo.

4. `git push origin master`. Pages tarda ~1-10 min + caché del navegador.

## Estructura

- `index.html` — la app (portal profesional + panel admin).
- `data/` — datos que antes estaban hardcodeados en `index.html`
  (liquidaciones por mes, config de grupos/porcentajes, proveedores de obra).
  Cargan como `<script src>` **antes** del script principal.
- `js/` — módulos del script principal, en orden de carga.
- `tools/preflight.mjs` — chequeo previo a publicar.
- `version.txt` — build actual, para el auto-chequeo de versión del cliente.
