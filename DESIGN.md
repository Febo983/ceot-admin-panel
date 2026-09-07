---
name: CEOT — Clínica de Traumatología Colón
version: 0.1.0
updated: 2026-09-01
status: draft
description: >
  Sistema de diseño para las apps de CEOT (portal profesionales, panel admin,
  comprobantes y las ~15 sub-apps del hub). Estética "Comprobante Oficial":
  papel cálido + verde institucional + tinta serif. Documento formal, no dashboard SaaS.
source: derivado de ceot-admin-panel/index.html (tokens --co-*, --iv*, [data-theme="dark"])
targets: [claude-code, cursor, v0, single-file-html, dyad]
---

# DESIGN.md — CEOT

## 1. Personalidad de marca

CEOT es una clínica de traumatología en Mar del Plata. Sus apps manejan plata
(liquidación de honorarios, cheques, gastos) y las usan profesionales médicos y
secretarias. El tono visual es el de un **comprobante oficial impreso**: papel
color hueso, renglones, margen rojo lateral, sellos dorados, títulos en serif.

- **Es:** formal, cálido, legible, "de papel", auditable, tranquilo.
- **No es:** neón, glassmorphism, gradientes vibrantes, dark-mode-first, startup.
- Palabra clave: **institucional**. Si una pantalla podría imprimirse y archivarse
  sin verse fuera de lugar, va bien encaminada.
- Los números son protagonistas: montos, netos, totales. Siempre en monoespaciada
  y alineados a la derecha en tablas.

## 2. Color

Doble tema. `light` es el default (papel). `dark` se activa con
`[data-theme="dark"]` en `<html>` e invierte papel↔tinta manteniendo los acentos.

### Semánticos

| Token           | Light     | Dark      | Uso |
|-----------------|-----------|-----------|-----|
| `bg`            | `#f2ecda` | `#15130f` | Fondo de página (papel / papel quemado) |
| `card`          | `#fbf8f0` | `#26221a` | Tarjetas, paneles, inputs, sidenav |
| `ink`           | `#20241f` | `#f1ede2` | Texto principal (tinta) |
| `ink-dim`       | `#6b6a5a` | `#a39c88` | Texto secundario, labels |
| `ink-faint`     | `rgba(32,36,31,.35)` | `#8f8873` | Hints, footnotes, placeholders |
| `line`          | `#d9d0b8` | `#3a362c` | Bordes, reglas, divisores |
| `header`        | `#1c1c1e` | `#1c1c1e` | Barra superior admin (tinta casi negra), texto blanco |

### Acentos (iguales en ambos temas, salvo la variante "bright" para dark)

| Token           | Valor     | Dark alt  | Uso |
|-----------------|-----------|-----------|-----|
| `green`         | `#1f3a2e` | `#3f6b4a` | Verde institucional. Sellos, encabezados de sección, marca |
| `positive`      | `#16a34a` | `#4ade80` | Totales, netos a favor, movimientos positivos, "al día" |
| `negative`      | `#b13a2c` | `#b13a2c` | Montos negativos, deudas, el renglón de margen |
| `margin-rule`   | `rgba(177,72,63,.35)` | igual | Línea vertical de margen tipo cuaderno (decorativa) |
| `warn`          | `#92610f` | `#c9933a` | Advertencias, diferidos, pendientes |
| `gold`          | `#c9933a` | `#c9933a` | Sellos (`.ph-seal`), badges (`.adm-badge`), detalles ceremoniales |

### Soft / fondos de estado

| Token          | Light                    | Uso |
|----------------|--------------------------|-----|
| `positive-soft`| `#eef2ea`                | Fondo de chip/badge positivo |
| `negative-soft`| `#f7e6e2`                | Fondo de alerta / monto negativo |
| `warn-soft`    | `#f6ecd6`                | Fondo de advertencia |

### Reglas de color

- No inventar azules ni violetas. La paleta es tierra + verde + rojo ladrillo + dorado.
- El verde institucional (`green`) es de **estructura** (títulos, sellos), no de éxito.
  Para "éxito / a favor / total" usar `positive` (`#16a34a`).
- Contraste mínimo 4.5:1 para texto. `ink` sobre `bg` y sobre `card` cumple.
- `ink-faint` solo para texto no esencial (≥ 12px). Nunca para datos.
- El header admin siempre es tinta oscura con texto blanco, en ambos temas.

## 3. Tipografía

| Rol        | Familia | Notas |
|------------|---------|-------|
| Display / títulos | `Georgia, "Iowan Old Style", "Times New Roman", serif` | `--font-display`. Encabezados, masthead, sellos. Peso 700, `letter-spacing: .01em` |
| Cuerpo / UI | `system-ui, -apple-system, "Segoe UI", Arial, sans-serif` | Texto general, botones, formularios |
| Números / montos | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` | `--font-num`. TODOS los importes, fechas de comprobante, IDs, tablas numéricas |
| Retro display (opcional) | `'PixelDisplay', monospace` | Solo para el branding pixelado puntual ya existente. No extender su uso |

Escala (rem, base 16px):

| Uso | size | weight | line-height |
|-----|------|--------|-------------|
| Masthead / H1 | 1.5–1.75 | 700 | 1.15 |
| Sección / H2 | 1.15 | 700 | 1.25 |
| Sub-sección / H3 | 1.0 | 700 | 1.3 |
| Cuerpo | 0.95–1.0 | 400 | 1.5 |
| Label / caption | 0.8 | 600 | 1.3 |
| Badge / sello | 0.56 | 700 | 1 · `text-transform: uppercase` · `letter-spacing: .5px` |

- Títulos en serif, todo lo demás en sans. Nunca serif para párrafos largos de UI.
- Montos: monoespaciada, `font-variant-numeric: tabular-nums`, alineados a la derecha.
- Signo del monto por color + signo explícito (`-$1.234,56`), no solo color.

## 4. Espaciado y layout

- Base **4px**. Escala: 2 · 4 · 8 · 10 · 13 · 15 · 20 · 28 · 40.
- Padding de tarjeta: 13–15px. Padding de header: 13px 15px.
- Sidenav admin: ancho fijo `175px`, `sticky`, scroll propio.
- Ancho de lectura de contenido: máx ~900px para documentos/comprobantes.
- Gap entre ítems de lista/nav: 2px (denso, tipo formulario oficial).
- Fondo de `#adminView`: renglones horizontales cada 28px (`line`) + línea de
  margen vertical roja a 40px del borde izquierdo. Es identidad, mantener.

## 5. Bordes, radios y elevación

| Token | Valor | Uso |
|-------|-------|-----|
| `radius-sm` | 3px | Badges, sellos, chips |
| `radius-md` | 5px | Botones, inputs |
| `radius-lg` | 8px | Tarjetas grandes (uso moderado) |
| `radius-none` | 0 | Headers, mastheads, secciones de comprobante |

- **Poco redondeo.** El documento oficial es de esquinas rectas o casi. Nada de
  `border-radius` > 8px, nada de píldoras salvo badges chicos.
- Elevación: preferir **borde `1px solid line`** antes que sombra.
- Sombra permitida (sutil): `0 1px 3px rgba(32,36,31,.12)` para modales/dropdowns.
- Separadores = reglas de 1px en `line`, no espacios en blanco grandes.

## 6. Componentes

### Botón
- Primario: fondo `header` (`#1c1c1e`) / texto blanco / `radius-md` / padding `8px 16px` / weight 600.
- Secundario: fondo transparente / borde `1px line` / texto `ink`.
- Peligro: texto o borde `negative`; fondo `negative` solo para confirmaciones destructivas.
- Hover: `opacity .7` o oscurecer 6%. Transición `.15s`.
- `:disabled` → `opacity .35`, `cursor: default`.

### Input / campo
- Fondo `card` (light) o `rgba(ink,.06)`; borde `1.5px line`; `radius-md`; padding `8px 10px`.
- Foco: `border-color: ink` (sin glow de color). 
- Label arriba, `ink-dim`, 0.8rem, weight 600.
- Placeholder `ink-faint`.

### Tarjeta / panel
- Fondo `card`, borde `1px line`, `radius-lg` o 0 según contexto, padding 13–15px.
- Título de tarjeta en serif si es encabezado de sección.

### Badge / sello
- `.adm-badge`: fondo `gold`, texto blanco, 0.56rem, uppercase, `radius-sm`.
- `.ph-seal`: borde `1.5px gold`, fondo transparente, texto `gold`, serif — sello ceremonial.
- Chip de estado: usar `*-soft` de fondo + acento de texto.

### Tabla numérica
- Encabezados `ink-dim`, 0.8rem, uppercase ligero.
- Celdas de monto: `--font-num`, `tabular-nums`, alineadas a la derecha.
- Filas separadas por regla `1px line`. Cebrado opcional muy sutil (`rgba(ink,.03)`).
- Total: fila con borde superior `2px ink`, monto en `positive` si es a favor.

### Tabs de período (abril…diciembre / historial / mipanel)
- Inactivo: texto `ink-faint`. Hover: `ink-dim`. Activo: texto `ink` + `border-bottom: 2px ink`.
- Fade lateral con gradiente hacia `card` para indicar scroll.

### Modal / dropdown
- z-index: dropdown 200 · sidenav 300 · overlay 999 · modal 3000 · modal-top 4000.
- Overlay `rgba(0,0,0,.5)`. Contenedor `card` + sombra sutil + borde `line`.

## 7. Movimiento

- Duraciones: 150ms (hover, micro), 200–300ms (paneles, tabs, overlays).
- Easing: `ease` o `cubic-bezier(.4,0,.2,1)`. Nada de rebotes ni overshoot.
- Sin animaciones decorativas continuas. Respetar `prefers-reduced-motion: reduce`
  (desactivar transiciones y transforms).

## 8. Iconografía e imágenes

- Iconos de línea, 1.5–2px de trazo, mismo color que el texto acompañante.
- Marcas de agua / iconos de fondo de tarjeta: `opacity .05–.08`.
- Nada de ilustraciones 3D, emojis grandes ni stock fotográfico.

## 9. Voz y microcopy

- Español rioplatense, formal pero directo. Tratamiento neutro/impersonal
  ("Seleccioná el período", "No hay datos para este mes").
- Montos en formato AR: `$1.234.567,89`. Fechas `dd/mm/aaaa`.
- Términos consistentes: "honorarios", "neto", "período", "comprobante",
  "Gastos A", "diferidos", "cheque". No "invoice", "dashboard", "settings".
- Errores: qué pasó + qué hacer. Sin jerga técnica ni stack traces al usuario.

## 10. Do / Don't

**Do**
- Tratar cada pantalla como un documento archivable.
- Borde antes que sombra; regla antes que espacio en blanco.
- Números en monoespaciada, a la derecha, con signo explícito.
- Verde institucional para estructura; `#16a34a` para "a favor".
- Probar siempre en `light` y en `[data-theme="dark"]`.

**Don't**
- Gradientes vibrantes, glass, neón, sombras de color.
- Radios grandes o píldoras (salvo badges).
- Azules/violetas ajenos a la paleta.
- Color como único indicador de estado (agregar signo/ícono/texto).
- Serif para párrafos largos de interfaz.

## 11. Snippet de tokens (CSS)

```css
:root {
  --bg:#f2ecda; --card:#fbf8f0; --ink:#20241f; --ink-dim:#6b6a5a;
  --ink-faint:rgba(32,36,31,.35); --line:#d9d0b8; --header:#1c1c1e;
  --green:#1f3a2e; --positive:#16a34a; --negative:#b13a2c;
  --warn:#92610f; --gold:#c9933a;
  --positive-soft:#eef2ea; --negative-soft:#f7e6e2; --warn-soft:#f6ecd6;
  --font-display:Georgia,"Iowan Old Style","Times New Roman",serif;
  --font-ui:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
  --font-num:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --radius-sm:3px; --radius-md:5px; --radius-lg:8px;
  --z-dropdown:200; --z-sidenav:300; --z-overlay:999; --z-modal:3000; --z-modal-top:4000;
}
[data-theme="dark"] {
  --bg:#15130f; --card:#26221a; --ink:#f1ede2; --ink-dim:#a39c88;
  --ink-faint:#8f8873; --line:#3a362c;
  --green:#3f6b4a; --positive:#4ade80;
}
```
