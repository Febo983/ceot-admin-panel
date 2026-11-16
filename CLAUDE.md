# CLAUDE.md — ceot-admin-panel

Portal de profesionales + panel admin de CEOT (clínica de traumatología, Mar del Plata).
Maneja plata real: honorarios, cheques, netos, Gastos A, préstamos, transferencias.
Lo usan médicos y secretarias. Un error de cálculo es un médico mal pagado.

## Stack
- HTML + JS plano, **sin build ni dependencias npm**. Lo que está en `master` se publica
  tal cual en GitHub Pages (https://febo983.github.io/ceot-admin-panel/).
- `index.html` (app + script principal) carga `js/*.js` en el orden de los `<script src>`
  (L~2453). Un módulo nuevo va en ese orden, con `?v=`.
- Datos: hardcodeados en `js/datos.js` + Google Apps Script (`*_ENDPOINT`) con token
  (`authURL()`), + `syncPush/syncPull` para el estado compartido del admin.
- Diseño: seguir `DESIGN.md` (estética "comprobante oficial", montos en monoespaciada,
  formato `$1.234.567,89`, español rioplatense).

## Cómo verificar un cambio (mostrá la salida, no digas "listo")
1. `node tools/bump.mjs nombre-del-cambio` si tocaste `index.html` o `js/*.js`.
2. `node tools/preflight.mjs` → tiene que terminar en `preflight OK`.
3. Si el cambio no debería alterar la UI: harness de regresión
   (`tools/regression/README.md`) → `diffCount: 0, errs: [], nofn: []`.
4. Smoke test de `PUBLICAR.md` (login director, login resto, login admin) con
   `python3 -m http.server 8781`. Consola sin errores en rojo.

## Reglas
- Nunca commitear tokens, contraseñas ni datos nuevos de pacientes. El repo es **público**.
- Montos: no redondear antes de sumar; formatear solo al mostrar (`fmt`).
- Agregar un mes/período: actualizar **todos** los lugares que listan períodos
  (`entrarConSesion`, `rerenderPortalMeses`, `handleLogout`, `PERIODOS_TODOS`).
- No romper el funcionamiento offline: si un endpoint falla, se sigue con lo local y se
  marca con `marcarEndpointStatus`.
- Commits chicos y reversibles; un cambio de cálculo por commit.

## No es objetivo
- Frameworks, bundlers o TypeScript.
- Rediseños visuales fuera de `DESIGN.md`.
