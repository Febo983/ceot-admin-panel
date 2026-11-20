// ══════ TAREAS DE HOY ═════════════════════════════════════════════
// Pedido de Marcelo, 20/11/2026: que todos los días, al abrir el panel, salga
// un aviso con todo lo que hay que hacer ese día. Junta en un solo lugar lo que
// ya estaba repartido en el panel:
//   1) Agenda de Google de hoy (si está conectada en "Hoy ⚙").
//   2) Cheques Colón: el que hay que depositar hoy (su fecha) y el que se
//      acredita hoy (fecha + 2 días, mismo criterio que chequeAcreditado), que
//      es cuando se transfiere a los profesionales.
//   3) Checklist: las atrasadas de tramos anteriores y las pendientes del tramo
//      de hoy, con su tilde y su atajo. Los miércoles, recordatorio de Débitos.
//   4) Avisos: retención en riesgo, copia de seguridad y buzón con novedades.
// Sale solo una vez por día (al primer ingreso del día a Inicio); después se
// vuelve a abrir con el botón "Tareas de hoy" de Inicio.

var TAREAS_HOY_VISTO_KEY = "ceot_tareas_hoy_visto";

function tareasHoyFechaKey(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}
function tareasHoyEsc(t) {
  return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Cheques Colón de hoy ────────────────────────────────────────
// Las fechas vienen "dd/mm" sin año, en <PERIODO>_FECHAS (var globales que
// llena cargarLiquidacionRemota). Se miran el mes actual y los dos vecinos:
// un cheque de fin de mes puede depositarse o acreditarse en el mes siguiente.
function tareasHoyCheques(hoy) {
  hoy = hoy || new Date();
  var h0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  var out = [];
  var actual = periodoDeFecha(hoy), i = PERIODOS_TODOS.indexOf(actual);
  [i - 1, i, i + 1].forEach(function(j) {
    var pid = PERIODOS_TODOS[j];
    if (!pid) return;
    var nom = pid.toUpperCase();
    var fechas = window[nom + "_FECHAS"], raw = window[nom + "_RAW"];
    if (!fechas || !raw || !fechas.length) return;
    fechas.forEach(function(f, n) {
      var p = String(f || "").split("/");
      if (p.length < 2) return;
      var fecha = new Date(hoy.getFullYear(), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
      // Mismo ajuste de año que chequeAcreditado (cheque de diciembre mirado en enero).
      if (fecha - h0 > 183 * 86400000) fecha = new Date(hoy.getFullYear() - 1, fecha.getMonth(), fecha.getDate());
      if (h0 - fecha > 183 * 86400000) fecha = new Date(hoy.getFullYear() + 1, fecha.getMonth(), fecha.getDate());
      var dias = Math.round((h0 - fecha) / 86400000);
      if (dias !== 0 && dias !== 2) return;
      var total = 0;
      raw.forEach(function(r) { total += r["f" + (n + 1)] || 0; });
      if (!total) return;
      out.push({
        periodo: pid, n: n + 1, fecha: f, total: total,
        tipo: dias === 0 ? "depositar" : "acredita"
      });
    });
  });
  return out;
}

// ── Checklist: atrasadas + pendientes del tramo de hoy ──────────
function tareasHoyChecklist(hoy) {
  hoy = hoy || new Date();
  var dia = hoy.getDate(), tramoHoy = null;
  Object.keys(CHECKLIST_RANGOS).forEach(function(rk) {
    if (tramoHoy === null && dia <= CHECKLIST_RANGOS[rk].diaHasta) tramoHoy = rk;
  });
  var atrasadas = [], hoyLista = [];
  CHECKLIST_ITEMS.forEach(function(it) {
    if (checklistItemDone(it.id)) return;
    if (dia > CHECKLIST_RANGOS[it.rango].diaHasta) atrasadas.push(it);
    else if (it.rango === tramoHoy) hoyLista.push(it);
  });
  return { atrasadas: atrasadas, hoy: hoyLista, tramo: tramoHoy ? CHECKLIST_RANGOS[tramoHoy].label : "" };
}

// ── Avisos sueltos que ya calculaba el panel ────────────────────
function tareasHoyAvisos() {
  var out = [];
  try {
    var al = (typeof retRepAlertas === "function") ? retRepAlertas() : [];
    var rojos = al.filter(function(a) { return a.estado === "no-llega"; }).length;
    if (al.length) out.push({
      ico: rojos ? "🔴" : "🟡",
      txt: "Retención Ganancias: " + al.length + " socio" + (al.length === 1 ? "" : "s") + " con vencimiento en los próximos " + RET_ALERTA_DIAS + " días sin cubrir"
        + (rojos ? " (" + rojos + " no llega" + (rojos === 1 ? "" : "n") + " con el % vigente)" : ""),
      fn: "renderAporteCeot()", lbl: "Ver"
    });
  } catch (e) {}
  try {
    if (typeof backupHayQueAvisar === "function" && backupHayQueAvisar())
      out.push({ ico: "💾", txt: "Copia de seguridad del mes pendiente", fn: "backupExportar()", lbl: "Exportar" });
  } catch (e) {}
  try {
    if (typeof bzNuevos === "function" && typeof buzonDatos !== "undefined" && buzonDatos) {
      var n = bzNuevos(), tot = (n.docs || 0) + (n.sini || 0) + (n.liq || 0);
      if (tot) out.push({ ico: "📥", txt: "Buzón: " + tot + " novedad" + (tot === 1 ? "" : "es") + " sin ver", fn: "renderBuzon()", lbl: "Abrir" });
    }
  } catch (e) {}
  return out;
}

function tareasHoyTotal() {
  var c = tareasHoyChecklist();
  return tareasHoyCheques().length + c.atrasadas.length + c.hoy.length + tareasHoyAvisos().length
    + (typeof _agendaHoy !== "undefined" && _agendaHoy ? _agendaHoy.length : 0);
}

function tareasHoyHtml() {
  var hoy = new Date();
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var MES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  var titulo = DIAS[hoy.getDay()] + " " + hoy.getDate() + " de " + MES[hoy.getMonth()];
  var sec = function(t, cuerpo) {
    return '<div style="margin-top:14px"><div style="font-size:.7rem;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#4d5b68;margin-bottom:6px">' + t + '</div>' + cuerpo + '</div>';
  };
  var fila = function(ico, txt, extra, color) {
    return '<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-top:1px dashed rgba(15,28,40,.12);font-size:.84rem;color:' + (color || '#1c2b3a') + '">'
      + '<span style="flex-shrink:0">' + ico + '</span><span style="flex:1;min-width:0">' + txt + '</span>' + (extra || '') + '</div>';
  };
  var btn = function(fn, lbl) {
    return '<button type="button" onclick="tareasHoyCerrar();' + fn + '" style="flex-shrink:0;cursor:pointer;font-family:inherit;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:12px;border:1.5px solid #1c2b3a;background:#fff;color:#1c2b3a;white-space:nowrap">' + lbl + ' →</button>';
  };
  var html = '';

  // 1) Agenda
  if (typeof admHomeAgendaUrl === "function" && admHomeAgendaUrl()) {
    var ev = (typeof _agendaHoy !== "undefined" && _agendaHoy) ? _agendaHoy : null;
    var cuerpo;
    if (!ev) cuerpo = '<div style="font-size:.8rem;color:#4d5b68">Cargando la agenda…</div>';
    else if (!ev.length) cuerpo = '<div style="font-size:.8rem;color:#4d5b68">Sin eventos en el calendario.</div>';
    else {
      var min = hoy.getHours() * 60 + hoy.getMinutes();
      cuerpo = ev.map(function(e) {
        var p = String(e.fin || "").split(":"), pasado = !e.todoElDia && (+p[0]) * 60 + (+p[1]) <= min;
        var hora = e.todoElDia ? "Todo el día" : e.inicio + "–" + e.fin;
        return fila("🕒", '<b>' + tareasHoyEsc(hora) + '</b> · ' + tareasHoyEsc(e.titulo), '', pasado ? 'rgba(28,43,58,.4)' : null);
      }).join("");
    }
    html += sec("Agenda", cuerpo);
  }

  // 2) Cheques
  var ch = tareasHoyCheques(hoy);
  if (ch.length) {
    html += sec("Cheques Colón", ch.map(function(c) {
      var mes = (typeof periodoNombre === "function") ? periodoNombre(c.periodo) : c.periodo;
      return c.tipo === "depositar"
        ? fila("🏦", 'Depositar el <b>cheque ' + c.n + '</b> de ' + tareasHoyEsc(mes) + ' (' + tareasHoyEsc(c.fecha) + ') · ' + fmt(c.total))
        : fila("💸", 'Se acredita el <b>cheque ' + c.n + '</b> de ' + tareasHoyEsc(mes) + ' (' + fmt(c.total) + '): transferir a los profesionales'
            + (c.n === 4 ? ' — descontar IIBB' : c.n === 5 ? ' — descontar CPSM' : ''),
            btn("abrirSueldoDirectorMesActual()", "Transferencias"));
    }).join(""));
  }

  // 3) Checklist
  var ck = tareasHoyChecklist(hoy);
  var itemHtml = function(it, atrasada) {
    return '<label style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-top:1px dashed rgba(15,28,40,.12);font-size:.84rem;cursor:pointer;color:' + (atrasada ? '#c0392b' : '#1c2b3a') + '">'
      + '<input type="checkbox" onchange="admHomeChecklistToggle(\'' + it.id + '\');tareasHoyRepintar()" style="margin-top:3px">'
      + '<span style="flex:1;min-width:0">' + (atrasada ? '<b>Atrasada:</b> ' : '') + tareasHoyEsc(it.texto) + '</span>'
      + (typeof checklistIrHtml === "function" ? checklistIrHtml(it.id).replace('onclick="event.stopPropagation();', 'onclick="event.stopPropagation();tareasHoyCerrar();') : '')
      + (it.id === "r3-1" && typeof waHorariosLinksHtml === "function" ? '<span style="display:flex;gap:4px">' + waHorariosLinksHtml() + '</span>' : '')
      + '</label>';
  };
  var ckHtml = ck.atrasadas.map(function(it) { return itemHtml(it, true); }).join("")
    + ck.hoy.map(function(it) { return itemHtml(it, false); }).join("");
  if (hoy.getDay() === 3) ckHtml = fila("📌", 'Es miércoles: revisar <b>Débitos</b> en Convenios / Facturación', btn("renderDebitos()", "Débitos")) + ckHtml;
  if (!ckHtml) ckHtml = '<div style="font-size:.8rem;color:#1d6b62;font-weight:700">Nada pendiente del checklist ✓</div>';
  html += sec("Checklist" + (ck.tramo ? " · " + ck.tramo.toLowerCase() : ""), ckHtml);

  // 4) Avisos
  var av = tareasHoyAvisos();
  if (av.length) html += sec("Avisos", av.map(function(a) { return fila(a.ico, tareasHoyEsc(a.txt), btn(a.fn, a.lbl)); }).join(""));

  return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">'
    +   '<div><div style="font-size:1.15rem;font-weight:800;color:#1c2b3a">Tareas de hoy</div>'
    +   '<div style="font-size:.8rem;color:#4d5b68;text-transform:capitalize">' + titulo + '</div></div>'
    +   '<button type="button" onclick="tareasHoyCerrar()" title="Cerrar" style="border:none;background:none;cursor:pointer;font-size:1.3rem;line-height:1;color:#4d5b68">✕</button>'
    + '</div>'
    + html
    + '<div style="margin-top:16px;display:flex;justify-content:flex-end">'
    +   '<button type="button" onclick="tareasHoyCerrar()" style="cursor:pointer;font-family:inherit;font-weight:700;font-size:.85rem;padding:8px 20px;border-radius:10px;border:2px solid #0f1c28;background:#1c2b3a;color:#fff">Listo</button>'
    + '</div>';
}

function tareasHoyAbrir() {
  var ov = document.getElementById("tareasHoyOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "tareasHoyOverlay";
    ov.style.cssText = "position:fixed;inset:0;z-index:9000;background:rgba(15,28,40,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto";
    ov.onclick = function(e) { if (e.target === ov) tareasHoyCerrar(); };
    ov.innerHTML = '<div id="tareasHoyCaja" role="dialog" aria-label="Tareas de hoy" style="width:100%;max-width:620px;background:#fffaf1;border:2px solid #0f1c28;border-radius:14px;padding:18px 20px;box-shadow:0 10px 40px rgba(0,0,0,.25);font-family:inherit"></div>';
    document.body.appendChild(ov);
  }
  document.getElementById("tareasHoyCaja").innerHTML = tareasHoyHtml();
  try { localStorage.setItem(TAREAS_HOY_VISTO_KEY, tareasHoyFechaKey()); } catch (e) {}
}
function tareasHoyCerrar() {
  var ov = document.getElementById("tareasHoyOverlay");
  if (ov) ov.remove();
  tareasHoyBotonRender();
}
function tareasHoyRepintar() {
  var c = document.getElementById("tareasHoyCaja");
  if (c) c.innerHTML = tareasHoyHtml();
  tareasHoyBotonRender();
}

// Botón de Inicio para volver a abrirlo, con la cantidad de cosas del día.
function tareasHoyBotonRender() {
  var el = document.getElementById("admHomeTareasBtn");
  if (!el) return;
  var n = 0;
  try { n = tareasHoyTotal(); } catch (e) {}
  el.innerHTML = '<button type="button" onclick="tareasHoyAbrir()" style="cursor:pointer;font-family:inherit;font-size:.78rem;font-weight:700;padding:5px 12px;border-radius:16px;border:2px solid #0f1c28;background:#fffaf1;color:#1c2b3a">📋 Tareas de hoy' + (n ? ' (' + n + ')' : '') + '</button>';
}

// Lo llama renderAdmHome: dibuja el botón y, si hoy todavía no se mostró, abre
// el aviso. Se espera un momento para que llegue la agenda (fetch aparte).
function tareasHoyAlEntrar() {
  tareasHoyBotonRender();
  var visto = "";
  try { visto = localStorage.getItem(TAREAS_HOY_VISTO_KEY) || ""; } catch (e) {}
  if (visto === tareasHoyFechaKey()) return;
  setTimeout(function() {
    if (document.getElementById("admHomeTareasBtn") && !document.getElementById("tareasHoyOverlay")) tareasHoyAbrir();
  }, 1200);
}
