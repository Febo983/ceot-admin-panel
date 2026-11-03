// redsom.js — Seguimiento liquidaciones REDSOM: detalle completo (consultas,
// cirugías, etc.) de todo lo facturado a REDSOM, por profesional y paciente.
// Se completa solo como efecto secundario del import de CEOT.xlsx/.txt (ver
// extraerRedsomDeRegistros()/guardarRedsomImportados() en
// importar-liquidacion.js) — no hay carga manual, subir el archivo por
// "Importar" alcanza.

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
// REDSOM_TODOS no es un período guardado: es el valor que toman el select del
// admin y la píldora del portal para juntar todos los períodos importados.
// Cada fila se queda con `_periodoKey` (la clave guardada, que siempre está)
// porque el campo `periodo` que viene del archivo puede faltar.
// ⚠️ Esto solo acumula lo que REALMENTE se importó: el extractor de REDSOM
// existe desde el 02/10/2026, así que los meses anteriores no están hasta
// que se vuelva a subir su CEOT.xlsx (reimportar un período es idempotente,
// reemplaza su entrada entera).
var REDSOM_TODOS = '__todos';

function redsomCargarTodo() {
  return redsomCargarVarios(redsomGetGuardados());
}

function redsomCargarItems(key) {
  return key === REDSOM_TODOS ? redsomCargarTodo() : redsomCargarPeriodo(key);
}

// ── Reporte de varios meses ───────────────────────────────────────
// La pantalla del admin dejó de mirar un período a la vez: redsomSeleccion es
// la lista de los elegidos. Uno solo, varios sueltos o todos es el mismo
// camino — "Todos" no es un modo aparte, es tenerlos todos tildados.
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

// Nunca deja la selección vacía ni con períodos que ya no existen: sin esto,
// borrar o recargar el histórico dejaría la pantalla pidiendo un mes fantasma.
function redsomSelNormalizar(guardados) {
  var s = redsomSeleccion.filter(function(p) { return guardados.indexOf(p) !== -1; });
  if (!s.length && guardados.length) s = [guardados[0]];
  redsomSeleccion = s;
  return s;
}

// El período viaja en data-periodo, como en el resto del módulo.
function redsomTogglePeriodo(el) {
  var p = el && el.getAttribute('data-periodo');
  var guardados = redsomGetGuardados();
  if (p === REDSOM_TODOS) {
    // Botón de dos tiempos: si ya están todos, vuelve al más nuevo solo.
    redsomSeleccion = (redsomSeleccion.length === guardados.length) ? [guardados[0]] : guardados.slice();
  } else {
    var i = redsomSeleccion.indexOf(p);
    if (i === -1) redsomSeleccion.push(p);
    else if (redsomSeleccion.length > 1) redsomSeleccion.splice(i, 1);
  }
  renderSeguimientoRedsom();
}

// Con "todos" hay que traerse cada período, no uno. redsomPull ya ignora la
// clave que ya pidió, así que llamarlo de más no cuesta nada.
function redsomPullItems(key) {
  if (key === REDSOM_TODOS) redsomGetGuardados().forEach(function(k) { redsomPull('redsom_imp_' + k); });
  else redsomPull('redsom_imp_' + key);
}

function redsomEsTodos(key) { return key === REDSOM_TODOS; }

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
  var sel = redsomSelNormalizar(guardados);

  var html = '<style>@media print { .redsom-no-print { display:none !important } }</style>'
    + '<div class="deb-toolbar redsom-no-print" id="redsomScreenRoot" style="flex-wrap:wrap;gap:6px">'
    + '<button class="deb-btn" onclick="redsomCargarHistorico()" title="Cargar un JSON con períodos que el importador nunca vio">⬆ Cargar histórico</button>'
    + '<button class="deb-btn deb-btn-pri" onclick="actionFeedback(this); imprimirRedsom()" style="margin-left:4px">🖨 Imprimir</button>'
    + '</div>';

  // Tira de meses: se tildan los que entran en el reporte, uno o varios.
  if (guardados.length) {
    var todosTildados = sel.length === guardados.length;
    var chip = function(k, lbl, on) {
      return '<span onclick="redsomTogglePeriodo(this)" data-periodo="' + k + '"'
        + ' style="flex-shrink:0;cursor:pointer;font-size:0.72rem;font-weight:700;padding:5px 13px;border-radius:20px;white-space:nowrap;border:1px solid '
        + (on ? '#1f3a2e;background:#1f3a2e;color:#fff' : 'rgba(32,36,31,.18);background:rgba(32,36,31,.04);color:rgba(32,36,31,.55)')
        + '">' + (on ? '✓ ' : '') + lbl + '</span>';
    };
    html += '<div class="redsom-no-print" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:12px">'
      + chip(REDSOM_TODOS, 'Todos (' + guardados.length + ')', todosTildados)
      + guardados.map(function(g) { return chip(g, g, sel.indexOf(g) !== -1); }).join('')
      + '</div>';
  }

  if (!guardados.length) {
    html += '<div style="padding:20px;text-align:center;color:rgba(32,36,31,.45);font-style:italic">'
      + 'Todavía no se importó ningún archivo con registros de REDSOM — se completa solo al subir el CEOT.xlsx/.txt por "Importar".</div>';
    document.getElementById('adm-content').innerHTML = html;
    return;
  }

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

// ══════ Solapa del portal del profesional ════════════════════════
// La misma data que ve el admin, recortada a las filas propias. El match es
// normDocImp(prof) === doctor.apellido: en el archivo de la clínica el
// profesional viene como venga ("BRUNI, Maximiliano", "0123 DE LA COLINA…")
// y normDocImp ya sabe reducirlo al apellido canónico que usa el portal.
// Leer el guardado compartido no pide ser admin —syncPull sale con cualquier
// sesión válida— así que el profesional ve lo que el admin importó desde su
// PC sin ningún paso extra. Se llega por el tile REDSOM de la home.
var redsomProfPeriodo = '';

function redsomFilasDe(doctor, periodoKey) {
  if (!doctor || !doctor.apellido) return [];
  var ap = String(doctor.apellido).toUpperCase();
  return redsomCargarItems(periodoKey).filter(function(it) {
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

// El período viaja en data-periodo de la píldora, así el onclick no necesita
// comillas adentro (mismo criterio que redsomDesdeImport).
function redsomProfIrA(el) {
  redsomProfPeriodo = (el && el.getAttribute('data-periodo')) || '';
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
  if (!redsomEsTodos(redsomProfPeriodo) && guardados.indexOf(redsomProfPeriodo) === -1) {
    redsomProfPeriodo = guardados[0];
  }
  redsomPullItems(redsomProfPeriodo);

  var todos = redsomEsTodos(redsomProfPeriodo);
  var filas = redsomFilasDe(doctor, redsomProfPeriodo);
  // Acumulado: lo más viejo arriba, para leerlo como una cuenta corriente.
  if (todos) {
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

  // Con un solo período importado el selector no aporta nada: la píldora
  // "Todo" mostraría exactamente lo mismo que ese mes.
  if (guardados.length > 1) {
    var opciones = [{ k: REDSOM_TODOS, lbl: 'Todo' }].concat(guardados.map(function(g) { return { k: g, lbl: g }; }));
    html += '<div style="display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;padding:9px 13px;border-bottom:1px solid rgba(32,36,31,.1)">'
      + opciones.map(function(o) {
          var on = o.k === redsomProfPeriodo;
          return '<span onclick="redsomProfIrA(this)" data-periodo="' + o.k + '"'
            + ' style="flex-shrink:0;cursor:pointer;font-size:0.6rem;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap;border:1px solid '
            + (on ? '#1f3a2e;background:#1f3a2e;color:#fff' : 'rgba(32,36,31,.2);background:transparent;color:rgba(32,36,31,.5)')
            + '">' + o.lbl + '</span>';
        }).join('')
      + '</div>';
  }

  html += '<div class="hist-period-section">'
    + '<div class="hist-period-headline"><span>' + (todos ? 'Todo lo liquidado' : redsomProfPeriodo) + '</span>'
    + '<span class="hist-period-badge">' + filas.length + (filas.length === 1 ? ' registro' : ' registros') + '</span></div>';

  if (!filas.length) {
    html += '<div class="hist-dline"><span class="hist-dline-lbl">'
      + (todos ? 'No figurás en ninguna liquidación cargada.' : 'No figurás en la liquidación de este período.')
      + '</span></div>';
  } else {
    filas.forEach(function(it) {
      var neg = it.tipo === 'DÉBITO' || (it.imp || 0) < 0;
      // Mezclados hace falta saber de qué mes es cada fila.
      var sub = [(todos ? redsomPeriodoDe(it) : ''), it.practica, it.rol, (it.tipo !== 'HONORARIOS' ? it.tipo : '')].filter(Boolean).join(' · ');
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
    + '<div class="hist-total-headline">' + (todos ? 'Total acumulado · ' + guardados.length + ' períodos' : 'Total del período') + '</div>'
    + (hon ? '<div class="hist-total-dline"><span>Honorarios</span><span>' + fmtImp(hon) + '</span></div>' : '')
    + (deb ? '<div class="hist-total-dline"><span>Débitos</span><span>' + fmtImp(deb) + '</span></div>' : '')
    + (gas ? '<div class="hist-total-dline"><span>Gastos</span><span>' + fmtImp(gas) + '</span></div>' : '')
    + '<div class="hist-total-neto"><span>' + nPac + (nPac === 1 ? ' paciente' : ' pacientes') + '</span><span>' + fmtImp(total) + '</span></div>'
    + '</div>';

  html += '</div>' + (typeof DISCLAIMER === 'string' ? DISCLAIMER : '');
  pane.innerHTML = html;
}
