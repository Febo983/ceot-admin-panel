// ══════ GASTO A DESTIEMPO ════════════════════════════════════════
// Pedido de Marcelo, 19/11/2026: poder cargar un gasto DESPUÉS de haber
// importado la liquidación (sin volver a subir archivos). Se elige un monto por
// profesional (no necesariamente iguales) y se descuenta, en partes iguales,
// de TODOS los cheques Colón que todavía no se acreditaron (fecha posterior a la
// fecha de corte, hoy por defecto), leyendo y reescribiendo la planilla de
// Liquidación con los mismos endpoints que usa el importador
// (action=leer / action=import, tipo=dist).
//
// Cada aplicación queda registrada (ceot_gastos_destiempo, con sync) con los
// importes exactos restados por cheque, para poder deshacerla.
// OJO: si después se vuelve a "Calcular distribución" de un mes con el
// importador, esa distribución pisa estos descuentos (el importador reescribe
// el cheque completo). Re-aplicar el gasto desde acá si pasa.

// Ids de período del panel (2026 sin año, 2027 con año pegado) — js/datos.js.
var GD_MESES = PERIODOS_TODOS;
var GASTOS_DESTIEMPO = [];
var _gdPlan = null; // último plan calculado en la vista previa

function gdEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

// ── Registro persistente ──
function gdCargar() {
  try {
    var raw = localStorage.getItem('ceot_gastos_destiempo');
    GASTOS_DESTIEMPO = raw ? (JSON.parse(raw) || []) : [];
  } catch (e) { GASTOS_DESTIEMPO = []; }
  gdRenderHistorial();
  syncPull('ceot_gastos_destiempo', function() {
    try {
      var raw2 = localStorage.getItem('ceot_gastos_destiempo');
      GASTOS_DESTIEMPO = raw2 ? (JSON.parse(raw2) || []) : [];
    } catch (e) {}
    gdRenderHistorial();
  });
}
function gdGuardar() {
  localStorage.setItem('ceot_gastos_destiempo', JSON.stringify(GASTOS_DESTIEMPO));
  syncPush('ceot_gastos_destiempo');
}

// ── Formulario ──
function gdInicializarForm() {
  var wrap = document.getElementById('gdSocios');
  if (wrap && !wrap.getAttribute('data-listo')) {
    wrap.setAttribute('data-listo', '1');
    wrap.innerHTML = SOCIOS_IMP.map(function(k) {
      return '<div style="display:flex;align-items:center;gap:6px">'
        + '<span style="flex:1;font-size:.72rem;font-weight:700">' + gdEsc(k) + '</span>'
        + '<input type="text" inputmode="decimal" class="imp-colon-input gd-monto" data-socio="' + gdEsc(k)
        + '" placeholder="$ monto" style="max-width:120px" oninput="gdInvalidarPlan()"></div>';
    }).join('');
  }
  var f = document.getElementById('gdCorte');
  if (f && !f.value) {
    var h = new Date();
    f.value = h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0') + '-' + String(h.getDate()).padStart(2, '0');
  }
  gdCargar();
}

function gdInvalidarPlan() {
  _gdPlan = null;
  var b = document.getElementById('gdBtnAplicar');
  if (b) b.style.display = 'none';
}

function gdMensaje(html, tipo) {
  var el = document.getElementById('gdMsg');
  if (!el) return;
  el.style.color = tipo === 'err' ? '#b13a2c' : (tipo === 'ok' ? '#1f6b3a' : 'rgba(32,36,31,.7)');
  el.innerHTML = html;
}

function gdLeerMontos() {
  var montos = {};
  var els = document.querySelectorAll('#gdSocios .gd-monto');
  for (var i = 0; i < els.length; i++) {
    var v = Math.abs(parsearMontoImp(els[i].value));
    if (v > 0) montos[els[i].getAttribute('data-socio')] = Math.round(v);
  }
  return montos;
}

// ── Lectura de la planilla ──
async function gdLeerMes(mes) {
  var resp = await fetch(authURL(LIQUIDACION_ENDPOINT + '?action=leer&tipo=dist&mes=' + mes));
  var data = await resp.json();
  if (!data.ok) throw new Error(data.error || 'error leyendo ' + mes);
  return data.cheques || [];
}

// "DD/MM" de la pestaña del mes → Date. La pestaña no trae año: se toma el del período
// (periodoInfo) y se corrige solo si el mes del cheque queda a más de 6 meses de la
// pestaña (ej. un cheque 05/01 en la pestaña de diciembre es del año siguiente).
function gdFechaCheque(fecha, mesId) {
  var info = periodoInfo(mesId);
  if (!info) return null;
  var p = String(fecha).split('/');
  var dd = parseInt(p[0], 10), mm = parseInt(p[1], 10);
  if (!dd || !mm) return null;
  var anio = info.anio, mesIdx = info.idx + 1;
  if (mm < mesIdx - 6) anio += 1;
  else if (mm > mesIdx + 6) anio -= 1;
  return new Date(anio, mm - 1, dd);
}

// Reparte un total entero en n partes enteras (el resto, de a 1 peso, a las primeras).
function gdPartes(total, n) {
  var base = Math.floor(total / n), resto = total - base * n, out = [];
  for (var i = 0; i < n; i++) out.push(base + (i < resto ? 1 : 0));
  return out;
}

async function gdPrevisualizar() {
  var concepto = (document.getElementById('gdConcepto').value || '').trim();
  var montos = gdLeerMontos();
  if (!concepto) { gdMensaje('Ponele un concepto al gasto.', 'err'); return; }
  if (!Object.keys(montos).length) { gdMensaje('Cargá el monto de al menos un profesional.', 'err'); return; }
  var corteStr = document.getElementById('gdCorte').value;
  if (!corteStr) { gdMensaje('Elegí la fecha de corte.', 'err'); return; }
  var cp = corteStr.split('-');
  var corte = new Date(parseInt(cp[0], 10), parseInt(cp[1], 10) - 1, parseInt(cp[2], 10));

  gdMensaje('Leyendo la planilla…');
  document.getElementById('gdBtnAplicar').style.display = 'none';
  _gdPlan = null;

  // Meses a revisar: desde 3 meses antes de la fecha de corte hasta el último período del panel.
  var idCorte = periodoIdDe(corte.getFullYear(), corte.getMonth());
  var desde = Math.max(0, (idCorte ? GD_MESES.indexOf(idCorte) : 0) - 3);
  var futuros = []; // {mes, mesIdx, fecha, d}
  var errores = [], vacios = 0;
  for (var i = desde; i < GD_MESES.length; i++) {
    try {
      var chs = await gdLeerMes(GD_MESES[i]);
      // Pestañas futuras que todavía no existen vuelven vacías: con 3 seguidas se corta.
      vacios = chs.length ? 0 : vacios + 1;
      if (vacios >= 3 && i > desde + 3) break;
      chs.forEach(function(c) {
        var dt = gdFechaCheque(c.fecha, GD_MESES[i]);
        if (dt && dt > corte) futuros.push({ mes: GD_MESES[i], mesIdx: i, fecha: c.fecha, dt: dt, d: c.d || {} });
      });
    } catch (e) {
      // un mes sin pestaña no es un problema; sí lo es si falla el mes de corte
      errores.push(GD_MESES[i] + ': ' + e.message);
    }
  }
  futuros.sort(function(a, b) { return a.dt - b.dt; });
  if (!futuros.length) {
    gdMensaje('No encontré ningún cheque Colón con fecha posterior a la de corte.' +
      (errores.length ? ' (' + gdEsc(errores.join('; ')) + ')' : ''), 'err');
    return;
  }

  // Plan: por cada socio, su monto en N partes enteras, una por cheque futuro.
  var n = futuros.length, negativos = [];
  var aplicar = futuros.map(function() { return {}; });
  Object.keys(montos).forEach(function(k) {
    var partes = gdPartes(montos[k], n);
    futuros.forEach(function(c, idx) {
      aplicar[idx][k] = partes[idx];
      var actual = c.d[k] != null ? c.d[k] : 0;
      if (actual - partes[idx] < 0) negativos.push(k + ' en el cheque del ' + c.fecha + ' (' + c.mes + ') quedaría en ' + fmtImp(actual - partes[idx]));
    });
  });

  _gdPlan = { concepto: concepto, montos: montos, futuros: futuros, aplicar: aplicar };

  var socios = Object.keys(montos);
  var html = '<div style="font-size:.72rem;margin:6px 0">Se descuenta de <strong>' + n + ' cheque(s)</strong> por acreditar: '
    + futuros.map(function(c) { return gdEsc(c.fecha) + ' (' + gdEsc(c.mes) + ')'; }).join(', ') + '.</div>';
  html += '<div class="imp-table-wrap"><table class="imp-table"><thead><tr><th style="text-align:left">Profesional</th><th>Total gasto</th>'
    + futuros.map(function(c) { return '<th>' + gdEsc(c.fecha) + '</th>'; }).join('') + '</tr></thead><tbody>';
  socios.forEach(function(k) {
    html += '<tr><td class="ipt-name">' + gdEsc(k) + '</td><td class="ipt-num">' + fmtImp(montos[k]) + '</td>'
      + futuros.map(function(c, idx) {
        var actual = c.d[k] != null ? c.d[k] : 0;
        return '<td class="ipt-num" style="font-size:.66rem">−' + fmtImp(aplicar[idx][k]) + '<br><span style="color:rgba(32,36,31,.45)">'
          + fmtImp(actual) + ' → ' + fmtImp(actual - aplicar[idx][k]) + '</span></td>';
      }).join('') + '</tr>';
  });
  html += '</tbody></table></div>';
  if (negativos.length) {
    html += '<div style="font-size:.68rem;color:#b13a2c;margin-top:6px">⚠ Quedarían cheques en negativo:<br>' + negativos.map(gdEsc).join('<br>') + '</div>';
  }
  if (errores.length) {
    html += '<div style="font-size:.64rem;color:rgba(32,36,31,.5);margin-top:4px">Meses sin leer: ' + gdEsc(errores.join('; ')) + '</div>';
  }
  gdMensaje(html);
  document.getElementById('gdBtnAplicar').style.display = 'inline-block';
}

// ── Escritura ──
async function gdEscribirMes(mes, cheques) {
  var url = LIQUIDACION_ENDPOINT + '?action=import&tipo=dist&mes=' + mes
    + '&cheques=' + encodeURIComponent(JSON.stringify(cheques));
  var resp = await fetch(authURL(url));
  var data = await resp.json();
  if (!data.ok) throw new Error(data.error || 'error escribiendo ' + mes);
  if (data.chequesNoEncontrados && data.chequesNoEncontrados.length) {
    throw new Error('no encontré la columna del cheque ' + data.chequesNoEncontrados.join(', ') + ' en ' + mes);
  }
  return data;
}

// Aplica deltas (signo +1 = descontar, −1 = devolver) a cheques de la planilla.
// items: [{mes, fecha, d:{K:importe}}]. Relee cada mes ANTES de escribir, así se
// parte del valor real de la planilla y no de uno viejo de la vista previa.
// Devuelve [{mes, fecha, d}] de lo realmente escrito.
async function gdAplicarDeltas(items, signo) {
  var porMes = {};
  items.forEach(function(it) { (porMes[it.mes] = porMes[it.mes] || []).push(it); });
  var hechos = [];
  for (var mes in porMes) {
    var actuales = await gdLeerMes(mes);
    var envio = [], esperado = [];
    porMes[mes].forEach(function(it) {
      var cheque = actuales.filter(function(c) { return c.fecha === it.fecha; })[0];
      if (!cheque) throw new Error('el cheque ' + it.fecha + ' ya no está en la pestaña de ' + mes);
      var d = {};
      Object.keys(it.d).forEach(function(k) {
        d[k] = Math.round((cheque.d[k] != null ? cheque.d[k] : 0) - signo * it.d[k]);
      });
      envio.push({ fecha: it.fecha, d: d });
      esperado.push({ fecha: it.fecha, d: d });
      hechos.push({ mes: mes, fecha: it.fecha, d: it.d });
    });
    await gdEscribirMes(mes, envio);
    // Verificación: releer y comparar con lo que se quiso escribir.
    var tras = await gdLeerMes(mes);
    esperado.forEach(function(e) {
      var c = tras.filter(function(x) { return x.fecha === e.fecha; })[0];
      Object.keys(e.d).forEach(function(k) {
        if (!c || Math.round(c.d[k] || 0) !== e.d[k]) {
          throw new Error('la planilla no quedó como se esperaba (' + k + ', cheque ' + e.fecha + ', ' + mes + ') — revisala a mano');
        }
      });
    });
  }
  return hechos;
}

async function gdAplicar() {
  if (!_gdPlan) { gdMensaje('Primero armá la vista previa.', 'err'); return; }
  var p = _gdPlan;
  var total = Object.keys(p.montos).reduce(function(s, k) { return s + p.montos[k]; }, 0);
  if (!confirm('¿Descontar «' + p.concepto + '» (' + fmtImp(total) + ' en total, ' + Object.keys(p.montos).length +
      ' profesional(es)) de ' + p.futuros.length + ' cheque(s) en la planilla de Liquidación?\n\nSe modifican los valores ya cargados. Queda registrado y se puede deshacer.')) return;
  var btn = document.getElementById('gdBtnAplicar');
  btn.disabled = true;
  gdMensaje('Escribiendo en la planilla…');
  var items = p.futuros.map(function(c, idx) { return { mes: c.mes, fecha: c.fecha, d: p.aplicar[idx] }; });
  try {
    var hechos = await gdAplicarDeltas(items, +1);
    GASTOS_DESTIEMPO.push({
      id: 'gd' + Date.now(), alta: new Date().toISOString(), concepto: p.concepto,
      montos: p.montos, aplicado: hechos, estado: 'aplicado'
    });
    gdGuardar();
    gdRenderHistorial();
    _gdPlan = null;
    btn.style.display = 'none';
    document.getElementById('gdConcepto').value = '';
    document.querySelectorAll('#gdSocios .gd-monto').forEach(function(el) { el.value = ''; });
    gdMensaje('✓ Descontado y verificado en la planilla (' + hechos.length + ' cheque(s)).', 'ok');
  } catch (e) {
    gdMensaje('✗ ' + gdEsc(e.message) + ' — puede haber quedado a medias: revisá la planilla antes de reintentar.', 'err');
  }
  btn.disabled = false;
}

async function gdDeshacer(id) {
  var g = GASTOS_DESTIEMPO.filter(function(x) { return x.id === id; })[0];
  if (!g || g.estado !== 'aplicado') return;
  if (!confirm('¿Deshacer «' + g.concepto + '»? Se le suma de vuelta a cada cheque lo que se había descontado.')) return;
  gdMensaje('Devolviendo importes a la planilla…');
  try {
    await gdAplicarDeltas(g.aplicado, -1);
    g.estado = 'deshecho';
    g.deshecho = new Date().toISOString();
    gdGuardar();
    gdRenderHistorial();
    gdMensaje('✓ Gasto deshecho y verificado en la planilla.', 'ok');
  } catch (e) {
    gdMensaje('✗ ' + gdEsc(e.message) + ' — revisá la planilla antes de reintentar.', 'err');
  }
}

function gdRenderHistorial() {
  var el = document.getElementById('gdHistorial');
  if (!el) return;
  if (!GASTOS_DESTIEMPO.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<div style="font-size:.7rem;font-weight:800;margin:10px 0 4px">Gastos a destiempo cargados</div>' +
    GASTOS_DESTIEMPO.slice().reverse().map(function(g) {
      var total = Object.keys(g.montos || {}).reduce(function(s, k) { return s + g.montos[k]; }, 0);
      var det = Object.keys(g.montos || {}).map(function(k) { return gdEsc(k) + ' ' + fmtImp(g.montos[k]); }).join(' · ');
      var cheq = (g.aplicado || []).map(function(a) { return gdEsc(a.fecha); }).join(', ');
      var fecha = new Date(g.alta).toLocaleDateString('es-AR');
      var activo = g.estado === 'aplicado';
      return '<div style="font-size:.68rem;padding:6px 0;border-top:1px solid rgba(32,36,31,.1);' + (activo ? '' : 'opacity:.5') + '">'
        + '<strong>' + gdEsc(g.concepto) + '</strong> — ' + fmtImp(total) + ' · ' + fecha + (activo ? '' : ' · <em>deshecho</em>') + '<br>'
        + '<span style="color:rgba(32,36,31,.6)">' + det + '<br>Cheques: ' + cheq + '</span>'
        + (activo ? ' <a href="javascript:void(0)" onclick="gdDeshacer(\'' + g.id + '\')" style="color:#b13a2c;text-decoration:underline;margin-left:6px">deshacer</a>' : '')
        + '</div>';
    }).join('');
}
