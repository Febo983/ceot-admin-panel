// redsom.js — Seguimiento liquidaciones REDSOM: detalle completo (consultas,
// cirugías, etc.) de todo lo facturado a REDSOM, por profesional y paciente.
// Se completa solo como efecto secundario del import de CEOT.xlsx/.txt (ver
// extraerRedsomDeRegistros()/guardarRedsomImportados() en
// importar-liquidacion.js) — no hay carga manual, subir el archivo por
// "Importar" alcanza.

var redsomPeriodoActual = '';

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
  var out = [];
  redsomGetGuardados().forEach(function(k) {
    redsomCargarPeriodo(k).forEach(function(it) {
      var copia = Object.assign({}, it);
      copia._periodoKey = k;
      out.push(copia);
    });
  });
  return out;
}

function redsomCargarItems(key) {
  return key === REDSOM_TODOS ? redsomCargarTodo() : redsomCargarPeriodo(key);
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
  if (periodo) redsomPeriodoActual = periodo;
  if (!redsomPeriodoActual || (!redsomEsTodos(redsomPeriodoActual) && guardados.indexOf(redsomPeriodoActual) === -1)) {
    redsomPeriodoActual = guardados[0] || '';
  }

  var html = '<div class="deb-toolbar" id="redsomScreenRoot" style="flex-wrap:wrap;gap:6px">'
    + (guardados.length
        ? '<select class="deb-mes-sel" id="redsomMesSel" onchange="renderSeguimientoRedsom(this.value)">'
          + '<option value="' + REDSOM_TODOS + '"' + (redsomEsTodos(redsomPeriodoActual) ? ' selected' : '') + '>'
          + 'Todos los períodos (' + guardados.length + ')</option>'
          + guardados.map(function(g) {
              return '<option value="' + g + '"' + (g === redsomPeriodoActual ? ' selected' : '') + '>' + g + '</option>';
            }).join('')
          + '</select>'
        : '')
    + '<button class="deb-btn deb-btn-pri" onclick="actionFeedback(this); imprimirRedsom()" style="margin-left:4px">🖨 Imprimir</button>'
    + '</div>';

  if (!guardados.length) {
    html += '<div style="padding:20px;text-align:center;color:rgba(32,36,31,.45);font-style:italic">'
      + 'Todavía no se importó ningún archivo con registros de REDSOM — se completa solo al subir el CEOT.xlsx/.txt por "Importar".</div>';
    document.getElementById('adm-content').innerHTML = html;
    return;
  }

  var todos = redsomEsTodos(redsomPeriodoActual);
  var items = redsomCargarItems(redsomPeriodoActual);
  redsomPullItems(redsomPeriodoActual);
  // Mezclados quedarían agrupados por mes (cada período viene ya ordenado por
  // profesional). Para leer "todo lo de fulano" conviene al revés.
  if (todos) {
    items.sort(function(a, b) {
      return String(a.prof || '').localeCompare(String(b.prof || ''))
        || redsomOrdenDe(a).localeCompare(redsomOrdenDe(b))
        || String(a.paciente || '').localeCompare(String(b.paciente || ''));
    });
  }

  var porProf = {};
  items.forEach(function(it) { porProf[it.prof || '—'] = (porProf[it.prof || '—'] || 0) + (it.imp || 0); });
  var profs = Object.keys(porProf).sort(function(a, b) { return porProf[b] - porProf[a]; });
  var total = items.reduce(function(s, it) { return s + (it.imp || 0); }, 0);

  html += '<div class="deb-stats">'
    + (todos ? '<div class="deb-stat"><div class="deb-stat-lbl">Períodos</div><div class="deb-stat-val">' + guardados.length + '</div></div>' : '')
    + '<div class="deb-stat"><div class="deb-stat-lbl">Registros</div><div class="deb-stat-val">' + items.length + '</div></div>'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Profesionales</div><div class="deb-stat-val">' + profs.length + '</div></div>'
    + '<div class="deb-stat"><div class="deb-stat-lbl">' + (todos ? 'Total acumulado' : 'Total facturado') + '</div><div class="deb-stat-val">' + fmtImp(total) + '</div></div>'
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
