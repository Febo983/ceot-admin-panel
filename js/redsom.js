// redsom.js — Seguimiento liquidaciones REDSOM: detalle completo (consultas,
// cirugías, etc.) de todo lo facturado a REDSOM, por profesional y paciente.
//
// Dos fuentes, y la pantalla tiene dos vistas:
//   • Las liquidaciones POR PROFESIONAL (CEOT.xlsx/.txt). Se cargan solas como
//     efecto secundario del import (ver extraerRedsomDeRegistros() /
//     guardarRedsomImportados() en importar-liquidacion.js): subir el archivo
//     por "Importar" alcanza. Traen el nombre del médico.
//   • El PDF "DETALLE DE PRACTICAS" de la clínica (DPR9042P<AAAAMM>.pdf), que
//     llega todos los meses pero NO dice qué profesional hizo cada práctica.
//     Se suma igual con el botón "Sumar PDF de la clínica", cruzando contra lo
//     que ya está cargado para no duplicar (ver redsomPlanPdf).
//
//   • "Detalle" = una fila por práctica, de los meses que se tilden.
//   • "Informe" = mes a mes y total hasta la fecha, sobre todo lo cargado.

// El detalle importado vivía solo en el localStorage de la PC que subió el
// archivo: desde la otra el módulo aparecía vacío. Ahora se espeja al guardado
// compartido (syncPush/syncPull de datos.js). Son claves separadas —el índice
// de períodos y el detalle de cada período— así una importación no manda un
// JSON con todos los meses juntos. Cada clave se pide una sola vez por sesión
// y, si lo que vuelve difiere de lo local, repinta la pantalla.
var REDSOM_GUARD_KEY = 'redsom_guardados';
var _redsomPulled = {};
function redsomPull(clave) {
  if (!clave || _redsomPulled[clave] || typeof syncPull !== 'function') return;
  _redsomPulled[clave] = true;
  syncPull(clave, function() {
    if (document.getElementById('redsomScreenRoot')) renderSeguimientoRedsom();
    if (document.getElementById('redsomProfRoot') && typeof doctorActual !== 'undefined' && doctorActual) {
      renderRedsomProf(doctorActual);
    }
  });
}

// Link "Ver el detalle" del aviso que deja la importación: el período viaja en
// data-periodo del propio link, así el onclick no necesita comillas adentro.
function redsomDesdeImport(el) {
  renderSeguimientoRedsom((el && el.getAttribute('data-periodo')) || '');
}

function redsomGetGuardados() {
  try { return JSON.parse(localStorage.getItem(REDSOM_GUARD_KEY) || '[]'); } catch (e) { return []; }
}

function redsomCargarPeriodo(key) {
  try { return JSON.parse(localStorage.getItem('redsom_imp_' + key) || '[]') || []; } catch (e) { return []; }
}

// ── Todo lo liquidado, no un mes a la vez ─────────────────────────
// REDSOM_TODOS no es un período guardado: es el data-periodo del chip
// "Todos" de la tira de meses, que tilda o destilda a todos de una.
// Cada fila cargada se queda con `_periodoKey` (la clave guardada, que
// siempre está) porque el campo `periodo` del archivo puede faltar.
// ⚠️ Acá solo se ve lo que REALMENTE está guardado: el extractor de REDSOM
// existe desde el 02/10/2026 y el importador le pone una sola clave de
// período a cada archivo, así que los meses viejos entran por el botón
// "Cargar histórico" (ver redsomAplicarHistorico).
var REDSOM_TODOS = '__todos';


// ── Reporte de varios meses ───────────────────────────────────────
// Ninguna de las dos pantallas mira un período a la vez: cada una guarda la
// lista de los elegidos (redsomSeleccion en el admin, redsomProfSel en el
// portal). Uno solo, varios sueltos o todos es el mismo camino — "Todos" no
// es un modo aparte, es tenerlos todos tildados.
var redsomSeleccion = [];

function redsomCargarVarios(periodos) {
  var out = [];
  (periodos || []).forEach(function(k) {
    redsomCargarPeriodo(k).forEach(function(it) {
      var copia = Object.assign({}, it);
      copia._periodoKey = k;
      out.push(copia);
    });
  });
  return out;
}

// Nunca deja una selección vacía ni con períodos que ya no existen: sin esto,
// borrar o recargar el histórico dejaría la pantalla pidiendo un mes fantasma.
function redsomSelLimpia(sel, guardados) {
  var s = (sel || []).filter(function(p) { return guardados.indexOf(p) !== -1; });
  if (!s.length && guardados.length) s = [guardados[0]];
  return s;
}

// Tildar o destildar un mes. "Todos" es un botón de dos tiempos: si ya están
// todos, vuelve al más nuevo solo. El último tildado no se puede sacar.
function redsomSelToggle(sel, p, guardados) {
  if (p === REDSOM_TODOS) {
    return sel.length === guardados.length ? [guardados[0]] : guardados.slice();
  }
  var s = sel.slice();
  var i = s.indexOf(p);
  if (i === -1) s.push(p);
  else if (s.length > 1) s.splice(i, 1);
  return s;
}

// La tira de meses. La dibujan las dos pantallas: cambia el tamaño y a qué
// función avisa el click, no el comportamiento. El período viaja en
// data-periodo, como en el resto del módulo.
function redsomChipsHtml(sel, guardados, fnName, chico) {
  var chip = function(k, lbl, on) {
    return '<span onclick="' + fnName + '(this)" data-periodo="' + k + '"'
      + ' style="flex-shrink:0;cursor:pointer;font-weight:700;white-space:nowrap;border-radius:20px'
      + ';font-size:' + (chico ? '0.6rem' : '0.72rem')
      + ';padding:' + (chico ? '3px 10px' : '5px 13px')
      + ';border:1px solid '
      + (on ? '#1f3a2e;background:#1f3a2e;color:#fff' : 'rgba(32,36,31,.18);background:rgba(32,36,31,.04);color:rgba(32,36,31,.55)')
      + '">' + (on ? '✓ ' : '') + lbl + '</span>';
  };
  return chip(REDSOM_TODOS, 'Todos (' + guardados.length + ')', sel.length === guardados.length)
    + guardados.map(function(g) { return chip(g, g, sel.indexOf(g) !== -1); }).join('');
}

function redsomTogglePeriodo(el) {
  var guardados = redsomGetGuardados();
  redsomSeleccion = redsomSelToggle(redsomSeleccion, el && el.getAttribute('data-periodo'), guardados);
  renderSeguimientoRedsom();
}


// Etiqueta del período de una fila, para cuando se muestran mezclados.
function redsomPeriodoDe(it) { return it.periodo || it._periodoKey || '—'; }

// Para ORDENAR no sirve la etiqueta: "12/2026" y "01/2027" comparados como
// texto quedan al revés, y justo el acumulado es la vista que cruza de año.
// `pperioRaw` es el AAAAMM crudo del archivo (lo guarda
// extraerRedsomDeRegistros), que ordena solo.
function redsomOrdenDe(it) {
  return String(it.pperioRaw || '') || String(redsomPeriodoDe(it));
}

function renderSeguimientoRedsom(periodo) {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  admSubtabs('liquidaciones', 'redsom');
  var btn = document.getElementById('adm-sidenav-redsom');
  if (btn) btn.className = 'adm-sidenav-btn active';
  redsomPull(REDSOM_GUARD_KEY);

  var guardados = redsomGetGuardados();
  // Sigue aceptando un período suelto (lo usa el link del aviso de importación)
  // o REDSOM_TODOS; sin argumento, mantiene lo que ya estaba elegido.
  if (periodo === REDSOM_TODOS) redsomSeleccion = guardados.slice();
  else if (periodo) redsomSeleccion = [periodo];
  redsomSeleccion = redsomSelLimpia(redsomSeleccion, guardados);
  var sel = redsomSeleccion;

  var esInforme = redsomVista === 'informe';
  var html = '<style>@media print { .redsom-no-print { display:none !important } }</style>'
    + '<div class="deb-toolbar redsom-no-print" id="redsomScreenRoot" style="flex-wrap:wrap;gap:6px">'
    + '<button class="deb-btn' + (esInforme ? '' : ' deb-btn-pri') + '" onclick="redsomVerDetalle()">📋 Detalle</button>'
    + '<button class="deb-btn' + (esInforme ? ' deb-btn-pri' : '') + '" onclick="redsomVerInforme()" title="Mes a mes y total hasta la fecha, sobre todos los períodos cargados">📊 Informe</button>'
    + (esInforme ? '<button class="deb-btn deb-btn-pri" onclick="redsomDescargarInformePdf()" title="Baja el informe como PDF: mes a mes y total hasta la fecha">⬇ Descargar PDF</button>' : '')
    + '<button class="deb-btn" onclick="redsomImportarPdf()" style="margin-left:4px" title="DPR9042P&lt;AAAAMM&gt;.pdf — el detalle de prácticas que manda la clínica">📄 Sumar PDF de la clínica</button>'
    + '<button class="deb-btn" onclick="redsomCargarHistorico()" title="Cargar un JSON con períodos que el importador nunca vio">⬆ Cargar histórico</button>'
    + '<button class="deb-btn" onclick="actionFeedback(this); imprimirRedsom()">🖨 Imprimir</button>'
    + '</div>'
    + '<div id="redsomPdfAviso" class="redsom-no-print" style="display:none;background:rgba(32,36,31,.05);'
    + 'border-radius:7px;padding:8px 10px;margin-bottom:10px;font-size:.72rem;color:rgba(32,36,31,.7)"></div>';

  if (!guardados.length) {
    html += '<div style="padding:20px;text-align:center;color:rgba(32,36,31,.45);font-style:italic">'
      + 'Todavía no se importó ningún archivo con registros de REDSOM — se completa solo al subir el CEOT.xlsx/.txt por "Importar", '
      + 'o sumando el PDF de la clínica.</div>';
    document.getElementById('adm-content').innerHTML = html;
    return;
  }

  // El informe no mira la tira de meses: es todo lo cargado, siempre.
  if (esInforme) {
    guardados.forEach(function(k) { redsomPull('redsom_imp_' + k); });
    document.getElementById('adm-content').innerHTML = html + redsomInformeHtml();
    return;
  }

  // Tira de meses: se tildan los que entran en el reporte, uno o varios.
  html += '<div class="redsom-no-print" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:12px">'
    + redsomChipsHtml(sel, guardados, 'redsomTogglePeriodo', false)
    + '</div>';

  var varios = sel.length > 1;
  var items = redsomCargarVarios(sel);
  sel.forEach(function(k) { redsomPull('redsom_imp_' + k); });
  // Mezclados quedarían agrupados por mes (cada período viene ya ordenado por
  // profesional). Para leer "todo lo de fulano" conviene al revés.
  if (varios) {
    items.sort(function(a, b) {
      return String(a.prof || '').localeCompare(String(b.prof || ''))
        || redsomOrdenDe(a).localeCompare(redsomOrdenDe(b))
        || String(a.paciente || '').localeCompare(String(b.paciente || ''));
    });
  }

  // Encabezado del reporte: en papel hay que poder ver qué meses entraron.
  // En el orden de guardados (el mismo de los chips), no alfabético: ordenar
  // el nombre del mes pondría julio antes que junio y mayo.
  var selOrdenada = guardados.filter(function(p) { return sel.indexOf(p) !== -1; });
  html += '<div style="margin-bottom:12px;padding-bottom:9px;border-bottom:1px solid rgba(32,36,31,.15)">'
    + '<div style="font-size:.95rem;font-weight:800;letter-spacing:.04em">REDSOM · Reporte</div>'
    + '<div style="font-size:.68rem;color:rgba(32,36,31,.5);margin-top:2px">'
    + (varios ? selOrdenada.length + ' períodos: ' + selOrdenada.join(', ') : 'Período ' + selOrdenada[0])
    + ' · generado ' + new Date().toLocaleDateString('es-AR') + '</div></div>';

  var porProf = {};
  items.forEach(function(it) { porProf[it.prof || '—'] = (porProf[it.prof || '—'] || 0) + (it.imp || 0); });
  var profs = Object.keys(porProf).sort(function(a, b) { return porProf[b] - porProf[a]; });
  var total = items.reduce(function(s, it) { return s + (it.imp || 0); }, 0);

  html += '<div class="deb-stats">'
    + (varios ? '<div class="deb-stat"><div class="deb-stat-lbl">Períodos</div><div class="deb-stat-val">' + sel.length + '</div></div>' : '')
    + '<div class="deb-stat"><div class="deb-stat-lbl">Registros</div><div class="deb-stat-val">' + items.length + '</div></div>'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Profesionales</div><div class="deb-stat-val">' + profs.length + '</div></div>'
    + '<div class="deb-stat"><div class="deb-stat-lbl">' + (varios ? 'Total acumulado' : 'Total facturado') + '</div><div class="deb-stat-val">' + fmtImp(total) + '</div></div>'
    + '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin-bottom:14px">'
    + profs.map(function(p) {
        return '<div style="padding:8px 10px;background:rgba(32,36,31,.05);border-radius:8px">'
          + '<div style="font-size:.62rem;color:rgba(32,36,31,.5);text-transform:uppercase;letter-spacing:.03em">' + p + '</div>'
          + '<div style="font-size:.95rem;font-weight:800">' + fmtImp(porProf[p]) + '</div></div>';
      }).join('')
    + '</div>';

  html += '<div class="deb-table-wrap"><table class="deb-table" style="font-size:0.71rem;color:#222">'
    + '<thead><tr>'
    + '<th>#</th><th>Factura</th><th>Per.</th>'
    + '<th>Profesional</th><th>ROL</th>'
    + '<th>DNI</th><th>Paciente</th>'
    + '<th>Práctica</th><th>Tipo</th>'
    + '<th style="text-align:right">Importe</th>'
    + '</tr></thead><tbody>';

  items.forEach(function(it, i) {
    var tipoColor = it.tipo === 'DÉBITO' ? '#b13a2c' : (it.tipo === 'GASTOS' ? '#c2410c' : '#1f3a2e');
    html += '<tr>'
      + '<td style="color:rgba(32,36,31,.35);text-align:center;font-size:0.67rem">' + (i + 1) + '</td>'
      + '<td style="font-family:monospace;color:rgba(32,36,31,.6);white-space:nowrap;font-size:0.67rem">' + (it.factura || '—') + '</td>'
      + '<td style="color:rgba(32,36,31,.6);white-space:nowrap">' + redsomPeriodoDe(it) + '</td>'
      + '<td style="color:#20241f;white-space:nowrap">' + (it.prof || '—') + '</td>'
      + '<td style="color:rgba(32,36,31,.45);font-size:0.67rem">' + (it.rol || '') + '</td>'
      + '<td style="font-family:monospace;color:rgba(32,36,31,.5);font-size:0.67rem">' + (it.dni || '') + '</td>'
      + '<td style="color:#20241f">' + (it.paciente || '—') + '</td>'
      + '<td style="font-size:0.65rem;color:rgba(32,36,31,.5)">' + (it.practica || '') + '</td>'
      + '<td style="color:' + tipoColor + ';font-weight:700;white-space:nowrap">' + it.tipo + '</td>'
      + '<td style="font-weight:600;text-align:right;white-space:nowrap">' + fmtImp(it.imp) + '</td>'
      + '</tr>';
  });

  html += '<tr class="deb-total-row">'
    + '<td colspan="9">TOTAL</td>'
    + '<td style="text-align:right;font-weight:700">' + fmtImp(total) + '</td></tr>';
  html += '</tbody></table></div>';

  document.getElementById('adm-content').innerHTML = html;
}

// ── Cargar histórico desde un JSON ────────────────────────────────
// Para meter períodos que el importador nunca vio. Hace falta porque
// guardarRedsomImportados() le pone UNA sola clave de período a todo el
// archivo (la mayoritaria), y los .txt viejos de la clínica traen
// prestaciones de varios meses mezcladas: el de agosto/2026 tiene 07, 06 y
// 05, y las 85 filas terminarían contadas como julio. El JSON ya viene
// partido por el P.PERIO real de cada fila.
//
// Escribe SOLO claves de REDSOM: no toca débitos, fondo de ayudantía ni
// liquidación, que es lo que sí recalcularía reimportar el archivo entero.
// El índice se FUSIONA con lo que ya haya: un período que no venga en el
// JSON queda como estaba.
function redsomCargarHistorico() {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = function() {
    var file = inp.files && inp.files[0];
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function(ev) {
      var d;
      try { d = JSON.parse(ev.target.result); } catch (e) { alert('Ese archivo no es un JSON válido.'); return; }
      redsomAplicarHistorico(d);
    };
    fr.onerror = function() { alert('No se pudo leer el archivo.'); };
    fr.readAsText(file, 'UTF-8');
  };
  inp.click();
}

// Valida y guarda el contenido ya parseado. Separado de redsomCargarHistorico
// para poder ejercitarlo sin pasar por el selector de archivos.
// Devuelve { ok, filas, total, periodos } o { ok:false, motivo }.
function redsomAplicarHistorico(d) {
  var claves = Object.keys(d || {}).filter(function(k) { return k.indexOf('redsom_imp_') === 0 && Array.isArray(d[k]); });
  if (!claves.length || !Array.isArray(d.redsom_guardados)) {
    alert('El archivo no tiene el formato esperado.\n\nTiene que traer "redsom_guardados" y una clave "redsom_imp_<período>" por mes.');
    return { ok: false, motivo: 'formato' };
  }
  var filas = 0, total = 0;
  claves.forEach(function(k) { d[k].forEach(function(it) { filas++; total += (it.imp || 0); }); });
  var periodos = claves.map(function(k) { return k.replace('redsom_imp_', ''); });
  var yaEstaban = redsomGetGuardados().filter(function(p) { return periodos.indexOf(p) !== -1; });
  var aviso = 'Se van a cargar ' + filas + ' registro(s) por ' + fmtImp(total) + '.\n\n'
    + 'Períodos: ' + periodos.join(', ') + '\n\n'
    + (yaEstaban.length ? '⚠ Estos ya estaban cargados y se reemplazan: ' + yaEstaban.join(', ') + '\n\n' : '')
    + 'El resto de lo que tengas guardado no se toca.\n\n¿Seguimos?';
  if (!confirm(aviso)) return { ok: false, motivo: 'cancelado' };
  try {
    claves.forEach(function(k) {
      localStorage.setItem(k, JSON.stringify(d[k]));
      if (typeof syncPush === 'function') syncPush(k);
    });
    var union = redsomGetGuardados();
    d.redsom_guardados.forEach(function(p) { if (union.indexOf(p) === -1) union.push(p); });
    localStorage.setItem(REDSOM_GUARD_KEY, JSON.stringify(union));
    if (typeof syncPush === 'function') syncPush(REDSOM_GUARD_KEY);
    // Lo que se acaba de escribir no hay que volver a pedirlo: un syncPull
    // en camino podría llegar con el valor viejo y pisarlo.
    claves.concat([REDSOM_GUARD_KEY]).forEach(function(k) { _redsomPulled[k] = true; });
  } catch (e) {
    alert('No se pudo guardar: ' + e.message);
    return { ok: false, motivo: e.message };
  }
  renderSeguimientoRedsom(REDSOM_TODOS);
  alert('Listo: ' + filas + ' registro(s) cargados.\n\nQuedó abierto en "Todos los períodos".');
  return { ok: true, filas: filas, total: total, periodos: periodos };
}

function imprimirRedsom() { window.print(); }

// ══════ Importar el PDF "DETALLE DE PRACTICAS" de la clínica ══════
// Francisco manda todos los meses un `DPR9042P<AAAAMM>.pdf` con el detalle de
// TODA la cuenta 9042 (CEOT TRAUMATOLOGIA): factura, obra social, paciente,
// práctica e importes. Es la fuente que llega siempre en fecha, pero **no dice
// qué profesional hizo cada práctica** — esa columna sólo existe en las
// liquidaciones "por profesional" (.xlsx/.txt), que llegan tarde y a veces no
// llegan. Decisión del 04/11/2026: se suma igual, con el profesional en
// blanco, antes que dejar el mes afuera del informe.
//
// Las filas que YA están cargadas con nombre (importadas del .xlsx/.txt) no se
// duplican: ver redsomPlanPdf.
var REDSOM_SIN_PROF = 'SIN PROFESIONAL';

// ── Geometría del PDF ─────────────────────────────────────────────
// Es un listado de ancho fijo tipeado en PDF, no una tabla: no hay celdas que
// leer, hay números puestos en una coordenada X. Las columnas de importe están
// alineadas a la DERECHA contra el borde derecho de su encabezado:
//
//   CANT   HONO-   GASTOS   DEB.HON   DEB.GAS   COS   TOTAL
//    337    380      422      465       508     536    578   ← borde derecho
//
// Cuando dos números quedan pegados el extractor los devuelve juntos
// ("11110166,00" = CANT 1 + HONORARIOS 1110166,00; "0,001224847,00" = COS +
// TOTAL). Por eso no se parte por espacios: se reparte CARÁCTER POR CARÁCTER
// según dónde cae cada uno. Partir por espacios se comía justo las cirugías
// grandes, que son las que mueven el total.
var REDSOM_PDF_DER = [
  { lim: 339,  col: 'cant'   },
  { lim: 382,  col: 'hon'    },
  { lim: 424,  col: 'gas'    },
  { lim: 467,  col: 'debHon' },
  { lim: 509,  col: 'debGas' },
  { lim: 538,  col: 'cos'    },
  { lim: 1e6,  col: 'tot'    }
];
// Cortes IZQUIERDOS de las columnas de texto. FECHA termina en 51 ("27/05/26"),
// SERVICIO arranca en 57 ("62552CON.EXT."), PRACTICA en 138
// ("125051NUN-COMPLEJIDAD") y CANT en 333: los cortes van en el medio de cada
// hueco para que no se corte ningún carácter.
var REDSOM_PDF_IZQ = { serv: 52, prac: 130, cant: 312 };

// Cada carácter con su posición. `it` es un item de pdf.js: str + ancho + X.
// Adentro de un item se le da a todos los caracteres el mismo ancho — la
// fuente del listado es monoespaciada, así que alcanza y sobra.
function redsomPdfChars(items) {
  var out = [];
  (items || []).forEach(function(it) {
    var t = String(it.str == null ? '' : it.str);
    if (!t) return;
    var paso = (it.w || 0) / t.length;
    for (var i = 0; i < t.length; i++) {
      if (t.charAt(i) === ' ') continue;
      out.push({ c: t.charAt(i), x0: it.x + paso * i, x1: it.x + paso * (i + 1) });
    }
  });
  return out.sort(function(a, b) { return a.x0 - b.x0; });
}

// Texto de un tramo horizontal. El espacio entre palabras se reconstruye por
// el hueco: adentro de una palabra los caracteres se tocan.
function redsomPdfTexto(chars, lo, hi) {
  var s = '', ult = null;
  chars.forEach(function(ch) {
    if (ch.x0 < lo || ch.x1 > hi) return;
    if (ult !== null && ch.x0 - ult > 1.5) s += ' ';
    s += ch.c;
    ult = ch.x1;
  });
  return s.trim();
}

function redsomPdfMonto(s) {
  if (!s) return 0;
  var n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// "0028-00030925" va a "28-30925", que es como vienen las facturas en el resto
// del módulo (las del .xlsx/.txt). Sin esto el cruce contra lo ya cargado no
// encontraría nada y se duplicaría todo.
function redsomPdfFactura(s) {
  var m = String(s || '').match(/(\d+)\s*-\s*(\d+)/);
  return m ? (parseInt(m[1], 10) + '-' + parseInt(m[2], 10)) : '';
}

// Agrupa los items de una página en renglones por su Y.
function redsomPdfRenglones(items) {
  var filas = {};
  (items || []).forEach(function(it) {
    var y = Math.round(it.y);
    (filas[y] = filas[y] || []).push(it);
  });
  return Object.keys(filas).map(Number).sort(function(a, b) { return b - a; })
    .map(function(y) { return redsomPdfChars(filas[y]); });
}

// Lee las páginas ya convertidas a items y devuelve una fila por línea de
// detalle, con la factura / obra social / paciente que vienen arrastrados del
// encabezado de arriba (el PDF no los repite en cada línea).
function redsomPdfParsear(paginas) {
  var out = [], factura = '', os = '', dni = '', paciente = '';
  (paginas || []).forEach(function(pag) {
    redsomPdfRenglones(pag.items).forEach(function(chars) {
      if (!chars.length) return;
      var linea = redsomPdfTexto(chars, -1e6, 1e6);
      var izq = redsomPdfTexto(chars, -1e6, REDSOM_PDF_IZQ.serv);

      // Encabezado de factura: "A 0028-00030925 REDSOM 48662116 MENICHETTI, LUCA"
      if (/^A\b/.test(linea) && /\d{3,}\s*-\s*\d{5,}/.test(linea.slice(0, 40))) {
        factura  = redsomPdfFactura(linea.slice(0, 40));
        os       = redsomPdfTexto(chars, 104, 178);
        dni      = redsomPdfTexto(chars, 178, 229);
        paciente = redsomPdfTexto(chars, 229, 470);
        return;
      }
      if (/^TOTAL\b/.test(linea)) return;

      // Cambio de paciente adentro de la misma factura: sólo DNI + nombre.
      var posibleDni = redsomPdfTexto(chars, 178, 229);
      if (!izq && /^\d{5,}$/.test(posibleDni)) {
        dni = posibleDni;
        paciente = redsomPdfTexto(chars, 229, 470);
        return;
      }

      if (!/^\d{2}\/\d{2}\/\d{2}/.test(izq)) return;

      var cols = {};
      REDSOM_PDF_DER.forEach(function(b) { cols[b.col] = ''; });
      chars.forEach(function(ch) {
        if (ch.x1 <= REDSOM_PDF_IZQ.cant) return;
        for (var i = 0; i < REDSOM_PDF_DER.length; i++) {
          if (ch.x1 <= REDSOM_PDF_DER[i].lim) { cols[REDSOM_PDF_DER[i].col] += ch.c; return; }
        }
      });

      var serv = redsomPdfTexto(chars, REDSOM_PDF_IZQ.serv, REDSOM_PDF_IZQ.prac);
      var mServ = serv.match(/^(\d+)\s*(.*)$/);
      var prac = redsomPdfTexto(chars, REDSOM_PDF_IZQ.prac, REDSOM_PDF_IZQ.cant - 1);
      var mPrac = prac.match(/^(\d{6})\s*(.*)$/);

      out.push({
        fecha: izq.slice(0, 8), factura: factura, os: os, dni: dni, paciente: paciente,
        nprest: mServ ? mServ[1] : '', servicio: mServ ? mServ[2] : serv,
        practicaCod: mPrac ? mPrac[1] : '', practica: mPrac ? mPrac[2] : prac,
        hon: redsomPdfMonto(cols.hon), gas: redsomPdfMonto(cols.gas),
        debHon: redsomPdfMonto(cols.debHon), debGas: redsomPdfMonto(cols.debGas),
        tot: redsomPdfMonto(cols.tot)
      });
    });
  });
  return out;
}

// De líneas del PDF a registros del módulo. Una misma línea puede traer
// honorarios, gasto de equipo y débitos a la vez (son columnas, no filas): se
// parte en un registro por concepto, igual que los arma el importador del
// .xlsx/.txt. Los débitos van en NEGATIVO, que es como los suma el total.
function redsomPdfARegistros(filas) {
  var out = [];
  (filas || []).forEach(function(f) {
    if (!/REDSOM/i.test(f.os || '')) return;
    var m = String(f.fecha || '').match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
    var aaaa = m ? '20' + m[3] : '';
    var mm = m ? m[2] : '';
    var base = {
      factura: f.factura, nprest: f.nprest,
      periodo: m ? (mm + '/' + aaaa) : '', periodoFact: '', pperioRaw: m ? (aaaa + mm) : '',
      prof: REDSOM_SIN_PROF, rol: '',
      dni: f.dni, paciente: f.paciente,
      practicaCod: f.practicaCod, practica: f.practica,
      origen: 'pdf'
    };
    [['hon', 'HONORARIOS', 1], ['gas', 'GASTOS', 1], ['debHon', 'DÉBITO', -1], ['debGas', 'DÉBITO', -1]]
      .forEach(function(par) {
        var v = f[par[0]] || 0;
        if (!v) return;
        out.push(Object.assign({}, base, { tipo: par[1], imp: Math.round(v * par[2] * 100) / 100 }));
      });
  });
  return out;
}

// ── Fusión con lo que ya está cargado ─────────────────────────────
// El PDF se pisa con las liquidaciones por profesional: las mismas prácticas
// aparecen en los dos lados (con nombre en el .txt, sin nombre en el PDF).
// Sumarlas de nuevo duplicaría la plata. Se cruzan por
// factura + Nº prestación + código de práctica + tipo + importe, que
// identifica la línea sin depender del nombre.
//
// El cruce mira TODOS los períodos guardados, no el del mes de la fila: el
// importador del .txt le pone a cada archivo UNA sola clave de período (la
// mayoritaria), así que una práctica de mayo puede estar guardada bajo
// "octubre-2026". Mirando sólo su propio mes, entraría duplicada.
function redsomClaveFila(it) {
  return [it.factura || '', it.nprest || '', it.practicaCod || '', it.tipo || '',
          Math.round((it.imp || 0) * 100)].join('|');
}

function redsomPeriodoKeyDe(it) {
  var m = String(it.pperioRaw || '').match(/^(\d{4})(\d{2})$/);
  if (!m) return 'sin-periodo';
  return (DEB_MESES[parseInt(m[2], 10) - 1] || m[2]) + '-' + m[1];
}

// Devuelve el plan de la importación SIN tocar el storage, para poder mostrarlo
// antes de confirmar (y para poder testearlo sin navegador).
function redsomPlanPdf(registros, guardados, cargarPeriodo) {
  var vistas = {};
  (guardados || []).forEach(function(k) {
    (cargarPeriodo(k) || []).forEach(function(it) {
      var c = redsomClaveFila(it);
      vistas[c] = (vistas[c] || 0) + 1;
    });
  });
  var nuevos = {}, repetidos = 0, totalNuevo = 0;
  (registros || []).forEach(function(it) {
    var c = redsomClaveFila(it);
    if (vistas[c]) { vistas[c]--; repetidos++; return; }
    var k = redsomPeriodoKeyDe(it);
    (nuevos[k] = nuevos[k] || []).push(it);
    totalNuevo += (it.imp || 0);
  });
  return {
    nuevos: nuevos, repetidos: repetidos, totalNuevo: Math.round(totalNuevo * 100) / 100,
    cantNuevos: Object.keys(nuevos).reduce(function(s, k) { return s + nuevos[k].length; }, 0),
    periodos: Object.keys(nuevos)
  };
}

function redsomImportarPdf() {
  if (!window.pdfjsLib) { alert('pdf.js no está disponible — recargá la página.'); return; }
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.pdf,application/pdf';
  inp.multiple = true;
  inp.onchange = function() {
    var files = Array.prototype.slice.call(inp.files || []);
    if (files.length) redsomProcesarPdfs(files);
  };
  inp.click();
}

async function redsomPdfAPaginas(file) {
  var buf = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  var paginas = [];
  for (var p = 1; p <= pdf.numPages; p++) {
    var page = await pdf.getPage(p);
    var content = await page.getTextContent();
    paginas.push({
      items: content.items.map(function(it) {
        return { str: it.str, x: it.transform[4], y: it.transform[5], w: it.width };
      })
    });
  }
  return paginas;
}

async function redsomProcesarPdfs(files) {
  var aviso = document.getElementById('redsomPdfAviso');
  var decir = function(txt) { if (aviso) { aviso.style.display = 'block'; aviso.textContent = txt; } };
  decir('📄 Leyendo ' + files.length + ' PDF…');
  var registros = [];
  try {
    for (var i = 0; i < files.length; i++) {
      decir('📄 Leyendo ' + files[i].name + ' (' + (i + 1) + '/' + files.length + ')…');
      var paginas = await redsomPdfAPaginas(files[i]);
      registros = registros.concat(redsomPdfARegistros(redsomPdfParsear(paginas)));
    }
  } catch (e) {
    decir('📄 No se pudo leer el PDF: ' + e.message);
    return;
  }
  if (!registros.length) {
    decir('📄 Ningún renglón de REDSOM en ' + (files.length > 1 ? 'esos PDF.' : 'ese PDF.'));
    return;
  }
  var plan = redsomPlanPdf(registros, redsomGetGuardados(), redsomCargarPeriodo);
  if (!plan.cantNuevos) {
    decir('📄 ' + registros.length + ' renglón(es) de REDSOM leídos, y los ' + plan.repetidos
      + ' ya estaban cargados (con nombre de profesional). No hay nada nuevo para sumar.');
    return;
  }
  var txt = 'Se leyeron ' + registros.length + ' renglón(es) de REDSOM.\n\n'
    + '• ' + plan.repetidos + ' ya estaban cargados (no se duplican).\n'
    + '• ' + plan.cantNuevos + ' son nuevos, por ' + fmtImp(plan.totalNuevo) + '.\n\n'
    + 'Meses: ' + plan.periodos.join(', ') + '\n\n'
    + 'Entran SIN nombre de profesional (el PDF de la clínica no lo trae):\n'
    + 'figuran como «' + REDSOM_SIN_PROF + '».\n\n¿Los sumamos?';
  if (!confirm(txt)) return;
  var guard = redsomGetGuardados();
  try {
    plan.periodos.forEach(function(k) {
      var clave = 'redsom_imp_' + k;
      localStorage.setItem(clave, JSON.stringify(redsomCargarPeriodo(k).concat(plan.nuevos[k])));
      if (typeof syncPush === 'function') syncPush(clave);
      _redsomPulled[clave] = true;
      if (guard.indexOf(k) === -1) guard.push(k);
    });
    localStorage.setItem(REDSOM_GUARD_KEY, JSON.stringify(guard));
    if (typeof syncPush === 'function') syncPush(REDSOM_GUARD_KEY);
    _redsomPulled[REDSOM_GUARD_KEY] = true;
  } catch (e) {
    alert('No se pudo guardar: ' + e.message);
    return;
  }
  redsomVista = 'informe';
  renderSeguimientoRedsom(REDSOM_TODOS);
  alert('Listo: ' + plan.cantNuevos + ' renglón(es) sumados por ' + fmtImp(plan.totalNuevo) + '.');
}


// ══════ Informe: mes a mes y total hasta la fecha ═════════════════
// La pantalla de detalle responde "qué se liquidó": una fila por práctica. El
// informe responde la otra pregunta, la que se lleva a una reunión: cuánto por
// mes, cuánto en total y quién se lo llevó. Siempre sobre TODOS los períodos
// guardados — "hasta la fecha" no se tilda, es todo.
var redsomVista = 'detalle';

function redsomVerInforme() { redsomVista = 'informe'; renderSeguimientoRedsom(); }
function redsomVerDetalle() { redsomVista = 'detalle'; renderSeguimientoRedsom(); }

// Parte las filas en honorarios / gastos de equipo / débitos. El total es la
// suma de los tres (los débitos ya vienen negativos).
function redsomResumir(filas) {
  var r = { n: 0, hon: 0, gas: 0, deb: 0, total: 0 };
  (filas || []).forEach(function(it) {
    var v = it.imp || 0;
    r.n++;
    if (it.tipo === 'DÉBITO') r.deb += v;
    else if (it.tipo === 'GASTOS') r.gas += v;
    else r.hon += v;
    r.total += v;
  });
  return r;
}

// Agrupa por una clave y devuelve los grupos ya resumidos y ordenados.
function redsomAgrupar(filas, claveFn, ordenFn) {
  var map = {};
  (filas || []).forEach(function(it) {
    var k = claveFn(it) || '—';
    (map[k] = map[k] || []).push(it);
  });
  return Object.keys(map).map(function(k) {
    var r = redsomResumir(map[k]);
    r.clave = k;
    return r;
  }).sort(ordenFn);
}

function redsomMesLbl(k) {
  var m = String(k).match(/^(\d{4})(\d{2})$/);
  return m ? ((DEB_MESES[parseInt(m[2], 10) - 1] || m[2]) + ' ' + m[1]) : String(k);
}

// Las tres tablas del informe salen del mismo molde: cambia por qué se agrupa.
function redsomTablaHtml(titulo, col1, grupos, lbl, tot) {
  var pct = function(v) { return tot.total ? (v / tot.total * 100).toFixed(1).replace('.', ',') + '%' : '—'; };
  var h = '<div style="font-size:.74rem;font-weight:800;margin:16px 0 6px;letter-spacing:.03em">' + titulo + '</div>'
    + '<div class="deb-table-wrap"><table class="deb-table" style="font-size:0.72rem;color:#222">'
    + '<thead><tr><th>' + col1 + '</th><th style="text-align:right">Reg.</th>'
    + '<th style="text-align:right">Honorarios</th><th style="text-align:right">Gastos eq.</th>'
    + '<th style="text-align:right">Débitos</th><th style="text-align:right">Total</th>'
    + '<th style="text-align:right">%</th></tr></thead><tbody>';
  grupos.forEach(function(g) {
    h += '<tr><td style="color:#20241f">' + lbl(g.clave) + '</td>'
      + '<td style="text-align:right;color:rgba(32,36,31,.5)">' + g.n + '</td>'
      + '<td style="text-align:right">' + (g.hon ? fmtImp(g.hon) : '—') + '</td>'
      + '<td style="text-align:right">' + (g.gas ? fmtImp(g.gas) : '—') + '</td>'
      + '<td style="text-align:right;color:' + (g.deb ? '#b13a2c' : 'inherit') + '">' + (g.deb ? fmtImp(g.deb) : '—') + '</td>'
      + '<td style="text-align:right;font-weight:700">' + fmtImp(g.total) + '</td>'
      + '<td style="text-align:right;color:rgba(32,36,31,.5)">' + pct(g.total) + '</td></tr>';
  });
  return h + '<tr class="deb-total-row"><td>TOTAL</td>'
    + '<td style="text-align:right">' + tot.n + '</td>'
    + '<td style="text-align:right">' + fmtImp(tot.hon) + '</td>'
    + '<td style="text-align:right">' + (tot.gas ? fmtImp(tot.gas) : '—') + '</td>'
    + '<td style="text-align:right">' + (tot.deb ? fmtImp(tot.deb) : '—') + '</td>'
    + '<td style="text-align:right;font-weight:700">' + fmtImp(tot.total) + '</td>'
    + '<td style="text-align:right">100%</td></tr></tbody></table></div>';
}

// Todo lo que muestra el informe, ya calculado. La pantalla (redsomInformeHtml)
// y el PDF (redsomInformePdfDoc) salen de acá, así nunca pueden mostrar
// números distintos. `lbl` es texto plano; `lblHtml` (opcional) es la versión
// con formato para la pantalla.
function redsomInformeDatos() {
  var filas = redsomCargarVarios(redsomGetGuardados());
  if (!filas.length) return null;
  var tot = redsomResumir(filas);
  var sinProf = filas.filter(function(it) { return (it.prof || REDSOM_SIN_PROF) === REDSOM_SIN_PROF; }).length;

  // Mes a mes por el período de la PRÁCTICA (pperioRaw), no por la clave con
  // que quedó guardado el archivo: un .txt de agosto trae prestaciones de mayo,
  // junio y julio, y mostrarlas todas como "agosto" sería mentira.
  var meses = redsomAgrupar(filas, redsomOrdenDe, function(a, b) { return String(a.clave).localeCompare(String(b.clave)); });
  var profs = redsomAgrupar(filas, function(it) { return it.prof || REDSOM_SIN_PROF; },
                            function(a, b) { return b.total - a.total; });
  // Por CÓDIGO de práctica, no por la descripción: el importador de los .txt
  // de ancho fijo a veces se lleva la columna CANT pegada al final del texto
  // ("CONSULTA MEDICA EN CONSULTORIO 1"), y agrupando por el texto la misma
  // práctica aparecía partida en dos filas. El rótulo es la descripción más
  // repetida de ese código.
  var nombres = {};
  filas.forEach(function(it) {
    var cod = it.practicaCod || it.practica || '—';
    var n = (nombres[cod] = nombres[cod] || {});
    var d = it.practica || '—';
    n[d] = (n[d] || 0) + 1;
  });
  // Ordenadas por CÓDIGO, no por plata: el nomenclador ya las agrupa solo
  // (12094x artroscopías, 12505x NUN por complejidad, 420101 consulta) y por
  // importe quedaban las complejidades salteadas y mezcladas con el resto.
  // Las que no tienen código van al final.
  var practs = redsomAgrupar(filas, function(it) { return it.practicaCod || it.practica || '—'; },
                             function(a, b) {
                               var ca = /^\d{6}$/.test(a.clave), cb = /^\d{6}$/.test(b.clave);
                               if (ca !== cb) return ca ? -1 : 1;
                               return String(a.clave).localeCompare(String(b.clave));
                             });
  var practDesc = function(cod) {
    var n = nombres[cod] || {};
    return Object.keys(n).sort(function(a, b) { return n[b] - n[a]; })[0] || '—';
  };
  var idem = function(k) { return k; };

  return {
    tot: tot, sinProf: sinProf, nMeses: meses.length,
    tablas: [
      { titulo: 'Mes a mes (por período de la práctica)', col1: 'Mes', grupos: meses, lbl: redsomMesLbl },
      { titulo: 'Por profesional (acumulado)', col1: 'Profesional', grupos: profs, lbl: idem },
      { titulo: 'Por práctica (acumulado)', col1: 'Práctica', grupos: practs,
        lbl: function(cod) { return /^\d{6}$/.test(cod) ? (practDesc(cod) + ' · ' + cod) : practDesc(cod); },
        lblHtml: function(cod) {
          return /^\d{6}$/.test(cod) ? (practDesc(cod) + ' <span style="color:rgba(32,36,31,.4)">· ' + cod + '</span>') : practDesc(cod);
        } }
    ]
  };
}

function redsomInformeHtml() {
  var d = redsomInformeDatos();
  if (!d) {
    return '<div style="padding:20px;text-align:center;color:rgba(32,36,31,.45);font-style:italic">'
      + 'No hay registros cargados todavía.</div>';
  }
  var tot = d.tot;

  var html = '<div style="margin-bottom:12px;padding-bottom:9px;border-bottom:1px solid rgba(32,36,31,.15)">'
    + '<div style="font-size:.95rem;font-weight:800;letter-spacing:.04em">REDSOM · Informe</div>'
    + '<div style="font-size:.68rem;color:rgba(32,36,31,.5);margin-top:2px">'
    + d.nMeses + ' mes(es) con movimiento · todo lo cargado hasta '
    + new Date().toLocaleDateString('es-AR') + '</div></div>';

  html += '<div class="deb-stats">'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Meses</div><div class="deb-stat-val">' + d.nMeses + '</div></div>'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Registros</div><div class="deb-stat-val">' + tot.n + '</div></div>'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Honorarios</div><div class="deb-stat-val">' + fmtImp(tot.hon) + '</div></div>'
    + (tot.gas ? '<div class="deb-stat"><div class="deb-stat-lbl">Gastos de equipo</div><div class="deb-stat-val">' + fmtImp(tot.gas) + '</div></div>' : '')
    + (tot.deb ? '<div class="deb-stat"><div class="deb-stat-lbl">Débitos</div><div class="deb-stat-val">' + fmtImp(tot.deb) + '</div></div>' : '')
    + '<div class="deb-stat"><div class="deb-stat-lbl">Total hasta la fecha</div><div class="deb-stat-val">' + fmtImp(tot.total) + '</div></div>'
    + '</div>';

  if (d.sinProf) {
    html += '<div style="background:#fef3c7;border:1px solid #92610f;border-radius:7px;padding:8px 10px;'
      + 'margin:0 0 12px;font-size:.72rem;color:#92610f">⚠ ' + d.sinProf + ' de los ' + tot.n
      + ' registros vienen del PDF de la clínica, que no trae el nombre del profesional: '
      + 'suman al total del mes pero quedan en «' + REDSOM_SIN_PROF + '».</div>';
  }

  d.tablas.forEach(function(t) {
    html += redsomTablaHtml(t.titulo, t.col1, t.grupos, t.lblHtml || t.lbl, tot);
  });
  return html;
}

// ── Informe en PDF ────────────────────────────────────────────────
// jsPDF sin autotable, dibujado a mano como el resto de los PDF del panel
// (ver gcExportPDF). Apaisado: la columna de práctica es larga y son siete
// columnas. Devuelve el documento sin guardarlo, para poder probarlo.
function redsomInformePdfDoc() {
  var d = redsomInformeDatos();
  if (!d) return null;
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  var W = 297, H = 210, LM = 12, RM = 285, TOPE = H - 16;
  var tot = d.tot;
  var hoyStr = new Date().toLocaleDateString('es-AR');
  // Importe sin símbolo de moneda en las tablas (ahorra ancho), con "$" en los
  // totales. Los vacíos van con guion: la raya larga no sale en todas las
  // fuentes estándar de jsPDF.
  var num = function(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var cel = function(n) { return n ? (n < 0 ? '-' + num(-n) : num(n)) : '-'; };
  var pct = function(v) { return tot.total ? (v / tot.total * 100).toFixed(1).replace('.', ',') + '%' : '-'; };

  // Posiciones de las columnas, alineadas a la derecha.
  var X = { reg: RM - 138, hon: RM - 108, gas: RM - 78, deb: RM - 48, tot: RM - 16, pct: RM };

  var y = 0;
  var pie = function() {
    var n = doc.internal.getNumberOfPages();
    for (var p = 1; p <= n; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
      doc.text('REDSOM · Informe · emitido ' + hoyStr, LM, H - 8);
      doc.text('Página ' + p + ' de ' + n, RM, H - 8, { align: 'right' });
    }
    doc.setTextColor(0, 0, 0);
  };

  // Encabezado
  doc.setFillColor(31, 58, 46);
  doc.rect(LM, 10, RM - LM, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('REDSOM - INFORME', W / 2, 17, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('CEOT · ' + d.nMeses + ' mes(es) con movimiento · todo lo cargado hasta ' + hoyStr, W / 2, 22.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Cifras principales
  y = 35;
  var cifras = [['Registros', String(tot.n)], ['Honorarios', '$ ' + num(tot.hon)]];
  if (tot.gas) cifras.push(['Gastos de equipo', '$ ' + num(tot.gas)]);
  if (tot.deb) cifras.push(['Débitos', '$ ' + cel(tot.deb)]);
  cifras.push(['TOTAL HASTA LA FECHA', '$ ' + num(tot.total)]);
  var anchoC = (RM - LM) / cifras.length;
  cifras.forEach(function(c, i) {
    var x = LM + anchoC * i;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110, 110, 110);
    doc.text(c[0].toUpperCase(), x, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0, 0, 0);
    doc.text(c[1], x, y + 6);
  });
  y += 14;

  if (d.sinProf) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(146, 97, 15);
    var aviso = 'Atención: ' + d.sinProf + ' de los ' + tot.n + ' registros vienen del PDF de la clínica, que no trae el nombre '
      + 'del profesional: suman al total del mes pero figuran como "' + REDSOM_SIN_PROF + '".';
    doc.text(doc.splitTextToSize(aviso, RM - LM), LM, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  var cabecera = function(col1) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(0, 0, 0);
    doc.setFillColor(238, 236, 228);
    doc.rect(LM, y - 4, RM - LM, 6, 'F');
    doc.text(col1, LM + 1.5, y);
    doc.text('Reg.', X.reg, y, { align: 'right' });
    doc.text('Honorarios', X.hon, y, { align: 'right' });
    doc.text('Gastos eq.', X.gas, y, { align: 'right' });
    doc.text('Débitos', X.deb, y, { align: 'right' });
    doc.text('Total', X.tot, y, { align: 'right' });
    doc.text('%', X.pct - 1.5, y, { align: 'right' });
    y += 6;
  };

  d.tablas.forEach(function(t) {
    // Que el título no quede solo al pie de una hoja.
    if (y > TOPE - 28) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(31, 58, 46);
    doc.text(t.titulo.toUpperCase(), LM, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
    cabecera(t.col1);
    doc.setFontSize(7.5);
    var cebra = false;
    t.grupos.forEach(function(g) {
      if (y > TOPE) { doc.addPage(); y = 18; cabecera(t.col1); doc.setFontSize(7.5); cebra = false; }
      if (cebra) { doc.setFillColor(248, 247, 243); doc.rect(LM, y - 3.6, RM - LM, 5, 'F'); }
      cebra = !cebra;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
      doc.text(doc.splitTextToSize(String(t.lbl(g.clave)), X.reg - LM - 12)[0], LM + 1.5, y);
      doc.setTextColor(110, 110, 110);
      doc.text(String(g.n), X.reg, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.text(cel(g.hon), X.hon, y, { align: 'right' });
      doc.text(cel(g.gas), X.gas, y, { align: 'right' });
      if (g.deb) doc.setTextColor(177, 58, 44);
      doc.text(cel(g.deb), X.deb, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(num(g.total), X.tot, y, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setTextColor(110, 110, 110);
      doc.text(pct(g.total), X.pct - 1.5, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 5;
    });
    // Fila de total
    if (y > TOPE) { doc.addPage(); y = 18; }
    doc.setDrawColor(31, 58, 46); doc.line(LM, y - 3.6, RM, y - 3.6);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', LM + 1.5, y);
    doc.text(String(tot.n), X.reg, y, { align: 'right' });
    doc.text(cel(tot.hon), X.hon, y, { align: 'right' });
    doc.text(cel(tot.gas), X.gas, y, { align: 'right' });
    doc.text(cel(tot.deb), X.deb, y, { align: 'right' });
    doc.text(num(tot.total), X.tot, y, { align: 'right' });
    doc.text('100%', X.pct - 1.5, y, { align: 'right' });
    y += 12;
  });

  pie();
  return doc;
}

function redsomDescargarInformePdf() {
  if (!window.jspdf) { alert('La librería PDF aún se está cargando. Esperá un segundo y volvé a intentar.'); return; }
  var doc = redsomInformePdfDoc();
  if (!doc) { alert('No hay registros de REDSOM cargados todavía.'); return; }
  doc.save('REDSOM_Informe_' + new Date().toISOString().slice(0, 10) + '.pdf');
}


// ══════ Solapa del portal del profesional ════════════════════════
// La misma data que ve el admin, recortada a las filas propias. El match es
// normDocImp(prof) === doctor.apellido: en el archivo de la clínica el
// profesional viene como venga ("BRUNI, Maximiliano", "0123 DE LA COLINA…")
// y normDocImp ya sabe reducirlo al apellido canónico que usa el portal.
// Leer el guardado compartido no pide ser admin —syncPull sale con cualquier
// sesión válida— así que el profesional ve lo que el admin importó desde su
// PC sin ningún paso extra. Se llega por el tile REDSOM de la home.
var redsomProfSel = [];

function redsomFilasDe(doctor, periodos) {
  if (!doctor || !doctor.apellido) return [];
  var ap = String(doctor.apellido).toUpperCase();
  return redsomCargarVarios(periodos).filter(function(it) {
    // Lo que vino del PDF de la clínica no tiene dueño: suma al total del
    // módulo pero no se le puede mostrar a nadie como propio.
    if ((it.prof || '') === REDSOM_SIN_PROF) return false;
    if (typeof normDocImp === 'function' && normDocImp(it.prof) === doctor.apellido) return true;
    // Red de seguridad: normDocImp solo mira el primer token, asi que un
    // nombre con un codigo adelante ("0123 BRUNI") le da null y la fila
    // desapareceria de la vista del profesional sin que nadie se entere.
    // Buscar el apellido dentro del texto la recupera. Ningun apellido de
    // DOCTORES es parte de otro, asi que esto no puede robarle una fila a
    // otro profesional.
    return String(it.prof || '').toUpperCase().indexOf(ap) !== -1;
  });
}

function redsomProfToggle(el) {
  var guardados = redsomGetGuardados();
  redsomProfSel = redsomSelToggle(redsomProfSel, el && el.getAttribute('data-periodo'), guardados);
  if (typeof doctorActual !== 'undefined' && doctorActual) renderRedsomProf(doctorActual);
}

function renderRedsomProf(doctor) {
  var pane = document.getElementById('pane-redsom');
  if (!pane || !doctor) return;

  redsomPull(REDSOM_GUARD_KEY);
  var guardados = redsomGetGuardados();
  if (!guardados.length) {
    pane.innerHTML = '<div class="hist-empty">Todavía no hay liquidaciones de REDSOM cargadas.</div>';
    return;
  }
  redsomProfSel = redsomSelLimpia(redsomProfSel, guardados);
  var sel = redsomProfSel;
  sel.forEach(function(k) { redsomPull('redsom_imp_' + k); });

  var varios = sel.length > 1;
  var filas = redsomFilasDe(doctor, sel);
  // Acumulado: lo más viejo arriba, para leerlo como una cuenta corriente.
  if (varios) {
    filas.sort(function(a, b) {
      return redsomOrdenDe(a).localeCompare(redsomOrdenDe(b))
        || String(a.paciente || '').localeCompare(String(b.paciente || ''));
    });
  }
  var hon = 0, deb = 0, gas = 0, pacientes = {};
  filas.forEach(function(it) {
    if (it.tipo === 'DÉBITO') deb += (it.imp || 0);
    else if (it.tipo === 'GASTOS') gas += (it.imp || 0);
    else hon += (it.imp || 0);
    if (it.paciente) pacientes[it.paciente] = 1;
  });
  var total = hon + deb + gas;
  var nPac = Object.keys(pacientes).length;

  var html = '<div class="hist-newspaper" id="redsomProfRoot">'
    + '<div class="hist-masthead">'
    + '<div class="hist-masthead-title">REDSOM</div>'
    + '<div class="hist-masthead-sub">Lo que te liquidó REDSOM · ' + doctor.nombre + '</div>'
    + '</div>';

  // Con un solo período importado la tira no aporta nada: "Todos" mostraría
  // exactamente lo mismo que ese mes.
  if (guardados.length > 1) {
    html += '<div style="display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;padding:9px 13px;border-bottom:1px solid rgba(32,36,31,.1)">'
      + redsomChipsHtml(sel, guardados, 'redsomProfToggle', true)
      + '</div>';
  }

  html += '<div class="hist-period-section">'
    + '<div class="hist-period-headline"><span>'
    + (sel.length === guardados.length ? 'Todo lo liquidado' : varios ? sel.length + ' períodos' : sel[0])
    + '</span>'
    + '<span class="hist-period-badge">' + filas.length + (filas.length === 1 ? ' registro' : ' registros') + '</span></div>';

  if (!filas.length) {
    html += '<div class="hist-dline"><span class="hist-dline-lbl">'
      + (varios ? 'No figurás en los períodos elegidos.' : 'No figurás en la liquidación de este período.')
      + '</span></div>';
  } else {
    filas.forEach(function(it) {
      var neg = it.tipo === 'DÉBITO' || (it.imp || 0) < 0;
      // Mezclados hace falta saber de qué mes es cada fila.
      var sub = [(varios ? redsomPeriodoDe(it) : ''), it.practica, it.rol, (it.tipo !== 'HONORARIOS' ? it.tipo : '')].filter(Boolean).join(' · ');
      html += '<div class="hist-dline">'
        + '<span class="hist-dline-lbl">' + (it.paciente || '—')
        + (sub ? '<span style="display:block;font-size:.6rem;opacity:.65">' + sub + '</span>' : '')
        + '</span>'
        + '<span class="hist-dline-val' + (neg ? ' neg' : '') + '">' + fmtImp(it.imp) + '</span>'
        + '</div>';
    });
  }
  html += '</div>';

  html += '<div class="hist-total-section">'
    + '<div class="hist-total-headline">' + (varios ? 'Total acumulado · ' + sel.length + ' períodos' : 'Total del período') + '</div>'
    + (hon ? '<div class="hist-total-dline"><span>Honorarios</span><span>' + fmtImp(hon) + '</span></div>' : '')
    + (deb ? '<div class="hist-total-dline"><span>Débitos</span><span>' + fmtImp(deb) + '</span></div>' : '')
    + (gas ? '<div class="hist-total-dline"><span>Gastos</span><span>' + fmtImp(gas) + '</span></div>' : '')
    + '<div class="hist-total-neto"><span>' + nPac + (nPac === 1 ? ' paciente' : ' pacientes') + '</span><span>' + fmtImp(total) + '</span></div>'
    + '</div>';

  html += '</div>' + (typeof DISCLAIMER === 'string' ? DISCLAIMER : '');
  pane.innerHTML = html;
}
