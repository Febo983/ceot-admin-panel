# REVIEW.md — qué importa al revisar este repo

## Qué es "romperlo" acá
- **Plata mal calculada**: un neto, cheque, Gastos A, aporte CEOT o préstamo que cambia
  sin que el PR diga que quería cambiarlo. Es lo más grave.
- **Un profesional ve datos de otro**, o alguien ve datos sin loguearse.
- **El login o el panel admin no abren** (un `throw` en `entrarConSesion` deja la
  pantalla en blanco para todos).
- **Versión no bumpeada**: los navegadores se quedan con el JS viejo.

## Revisar siempre
- Cambios en `js/datos.js`, `js/portal-render.js`, `calcularNetoLocal`, `getExtra`,
  Gastos A, préstamos, transferencias: pedir el antes/después de un neto concreto
  (ej. Bruni y De la Colina para un mes) como evidencia.
- Cualquier `innerHTML` con texto que venga de un Sheet o endpoint (riesgo de XSS).
- Cualquier `fetch` nuevo: ¿lleva `authURL()`? ¿manda datos a un tercero?
- Listas de períodos/panes copiadas a mano: ¿se actualizaron todas?
- `index.html` y `js/*.js` cambiados ⇒ `version.txt` y los `?v=` cambiados (preflight).

## Seguridad / privacidad (bloquea)
- Secretos, tokens o datos de pacientes commiteados (el repo es público).
- Credenciales en la URL de un GET.
- Datos sensibles enviados a proxies o servicios externos.

## Ignorar
- `architecture.html` (generado), `tools/regression/golden.json`.
- Estilo/nits de formato: máximo 2 por revisión, y solo si contradicen `DESIGN.md`.

## Formato de la revisión
- Empezar con un conteo: "N problemas (X importantes)". Si no hay nada, decirlo así.
- Cada hallazgo con archivo y línea como evidencia, no una suposición por el nombre.
- Marcar como *Pre-existing* lo que el PR no introdujo.
