// ══════ COBERTURAS DE LICENCIAS Y VACACIONES (personal / secretarias) ═════
// Quién está de licencia o vacaciones y quién cubre cada día, con las horas.
// Se carga y se edita acá (antes vivía en un Excel suelto: "COBERTURAS VERANO
// 2027"). Se guarda en ceot_coberturas, sincronizado entre PCs como Préstamos
// Casa. La lista del código es solo el punto de partida: lo guardado la
// reemplaza, y NO se sube sola al servidor — recién se guarda al primer cambio.
var COB_KEY = "ceot_coberturas";
var COB_BASE = {
  // Fechas de ausencia tomadas de la planilla; cada nombre marca el inicio de
  // un bloque semanal. "hasta" es el fin de esa semana (a confirmar).
  ausencias: [
    { id: "a1", persona: "Josefina",  tipo: "licencia",   desde: "2026-12-14", hasta: "2027-03-12", nota: "Fin = último día con cobertura cargada; confirmar" },
    { id: "a2", persona: "Paula",     tipo: "vacaciones", desde: "2026-12-11", hasta: "2026-12-13", nota: "" },
    { id: "a3", persona: "Elizabeth", tipo: "vacaciones", desde: "2026-12-14", hasta: "2026-12-20", nota: "" },
    { id: "a4", persona: "Paula",     tipo: "vacaciones", desde: "2026-12-21", hasta: "2026-12-27", nota: "" },
    { id: "a5", persona: "Laura",     tipo: "vacaciones", desde: "2026-12-28", hasta: "2027-01-17", nota: "Cobertura sin definir" },
    { id: "a6", persona: "Paula",     tipo: "vacaciones", desde: "2027-01-18", hasta: "2027-02-07", nota: "" }
  ],
  cobertura: [["2026-12-14","Evelina",8],["2026-12-14","Paula",4],["2026-12-14","Victoria",4],["2026-12-15","Evelina",8],["2026-12-15","Paula",4],["2026-12-15","Victoria",4],["2026-12-16","Evelina",12],["2026-12-16","Paula",4],["2026-12-17","Evelina",8],["2026-12-17","Paula",4],["2026-12-17","Victoria",4],["2026-12-18","Evelina",8],["2026-12-18","Paula",4],["2026-12-18","Victoria",4],["2026-12-21","Evelina",12],["2026-12-22","Evelina",8],["2026-12-22","Victoria",8],["2026-12-23","Evelina",8],["2026-12-23","Victoria",8],["2026-12-28","Evelina",12],["2026-12-28","Paula",4],["2026-12-29","Evelina",8],["2026-12-29","Paula",4],["2026-12-29","Victoria",4],["2026-12-30","Evelina",8],["2026-12-30","Victoria",4],["2027-01-04","Evelina",8],["2027-01-04","Victoria",8],["2027-01-05","Evelina",8],["2027-01-05","Paula",4],["2027-01-05","Victoria",4],["2027-01-06","Evelina",8],["2027-01-06","Victoria",8],["2027-01-07","Evelina",8],["2027-01-07","Paula",4],["2027-01-07","Victoria",4],["2027-01-08","Evelina",8],["2027-01-08","Victoria",8],["2027-01-11","Evelina",8],["2027-01-11","Victoria",8],["2027-01-12","Evelina",8],["2027-01-12","Paula",4],["2027-01-12","Victoria",4],["2027-01-13","Evelina",8],["2027-01-13","Victoria",8],["2027-01-14","Evelina",8],["2027-01-14","Paula",4],["2027-01-14","Victoria",4],["2027-01-15","Evelina",8],["2027-01-15","Victoria",8],["2027-01-18","Evelina",8],["2027-01-18","Victoria",8],["2027-01-19","Evelina",8],["2027-01-19","Victoria",8],["2027-01-20","Evelina",8],["2027-01-20","Victoria",8],["2027-01-21","Evelina",8],["2027-01-21","Victoria",8],["2027-01-22","Evelina",8],["2027-01-22","Victoria",8],["2027-01-25","Evelina",8],["2027-01-25","Victoria",8],["2027-01-26","Evelina",8],["2027-01-26","Victoria",8],["2027-01-27","Evelina",8],["2027-01-27","Victoria",8],["2027-01-28","Evelina",8],["2027-01-28","Victoria",8],["2027-01-29","Evelina",8],["2027-01-29","Victoria",8],["2027-02-01","Evelina",8],["2027-02-01","Victoria",8],["2027-02-02","Evelina",8],["2027-02-02","Victoria",8],["2027-02-03","Evelina",8],["2027-02-03","Victoria",8],["2027-02-04","Evelina",8],["2027-02-04","Victoria",8],["2027-02-05","Evelina",8],["2027-02-05","Victoria",8],["2027-02-10","Evelina",4],["2027-02-10","Victoria",4],["2027-02-11","Evelina",4],["2027-02-11","Paula",4],["2027-02-12","Evelina",4],["2027-02-12","Victoria",4],["2027-02-15","Evelina",4],["2027-02-15","Victoria",4],["2027-02-16","Evelina",4],["2027-02-16","Paula",4],["2027-02-17","Evelina",4],["2027-02-17","Victoria",4],["2027-02-18","Evelina",4],["2027-02-18","Paula",4],["2027-02-19","Evelina",4],["2027-02-19","Victoria",4],["2027-02-22","Evelina",4],["2027-02-22","Victoria",4],["2027-02-23","Evelina",4],["2027-02-23","Paula",4],["2027-02-24","Evelina",4],["2027-02-24","Victoria",4],["2027-02-25","Evelina",4],["2027-02-25","Paula",4],["2027-02-26","Evelina",4],["2027-02-26","Victoria",4],["2027-03-01","Evelina",4],["2027-03-01","Paula",4],["2027-03-02","Evelina",4],["2027-03-02","Paula",4],["2027-03-03","Evelina",4],["2027-03-03","Victoria",4],["2027-03-04","Evelina",4],["2027-03-04","Paula",4],["2027-03-05","Evelina",4],["2027-03-05","Victoria",4],["2027-03-08","Evelina",4],["2027-03-08","Paula",4],["2027-03-09","Evelina",4],["2027-03-09","Paula",4],["2027-03-10","Evelina",4],["2027-03-10","Victoria",4],["2027-03-11","Evelina",4],["2027-03-11","Paula",4],["2027-03-12","Evelina",4],["2027-03-12","Victoria",4]],
  notas: [
    "Evelina: en los días de 12 hs trabaja de 12 a 20.",
    "Victoria: en los días de 8 hs trabaja cortado, de 8 a 12 y de 16 a 20.",
    "Tobías: rinde a Viky."
  ]
};
var COB = null;
var COB_PERSONAS = ["Josefina", "Paula", "Elizabeth", "Evelina", "Victoria", "Tobías", "Laura"];
var _cobPulled = false;
var cobMes = null, cobAnio = null;

function cobEsc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function cobPad(n) { return String(n).padStart(2, "0"); }
function cobIso(y, m, d) { return y + "-" + cobPad(m + 1) + "-" + cobPad(d); }
function cobFechaCorta(iso) { var p = iso.split("-"); return parseInt(p[2], 10) + "/" + parseInt(p[1], 10); }
var COB_DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
var COB_MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
function cobDiaSemana(iso) { var p = iso.split("-"); return COB_DIAS[new Date(+p[0], +p[1] - 1, +p[2]).getDay()]; }

function cobNormalizar(d) {
  if (!d || !Array.isArray(d.ausencias) || !Array.isArray(d.cobertura)) return null;
  return { ausencias: d.ausencias, cobertura: d.cobertura, notas: Array.isArray(d.notas) ? d.notas : [] };
}
function cobLeerLocal() {
  var d = null;
  try { d = cobNormalizar(JSON.parse(localStorage.getItem(COB_KEY))); } catch (e) {}
  COB = d || JSON.parse(JSON.stringify(COB_BASE));
}
function cobGuardar() {
  try { localStorage.setItem(COB_KEY, JSON.stringify(COB)); } catch (e) {}
  if (typeof syncPush === "function") syncPush(COB_KEY);
}
function cobCargar() {
  cobLeerLocal();
  if (!_cobPulled && typeof syncPull === "function") {
    _cobPulled = true;
    syncPull(COB_KEY, function () {
      cobLeerLocal();
      if (document.getElementById("cobScreenRoot")) cobRepintar();
    });
  }
}
// Ausencias que caen en el día `iso`.
function cobAusentesEn(iso) { return COB.ausencias.filter(function (a) { return iso >= a.desde && iso <= a.hasta; }); }

function cobMesInicial() {
  var hoy = new Date(), hoyIso = cobIso(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  var fechas = COB.ausencias.map(function (a) { return a.hasta; }).concat(COB.cobertura.map(function (c) { return c[0]; }));
  var futuras = fechas.filter(function (f) { return f >= hoyIso; }).sort();
  var base = futuras.length ? COB.ausencias.concat([]).map(function (a) { return a.desde; }).filter(function (f) { return f >= hoyIso; }).sort()[0] || futuras[0] : hoyIso;
  var p = base.split("-");
  cobAnio = +p[0]; cobMes = +p[1] - 1;
}
function cobCambiarMes(delta) {
  cobMes += delta;
  if (cobMes < 0) { cobMes = 11; cobAnio--; }
  if (cobMes > 11) { cobMes = 0; cobAnio++; }
  cobRepintar();
}

function cobChipAus(a) {
  var s = (typeof LIC_TYPE_STYLE !== "undefined" && LIC_TYPE_STYLE[a.tipo]) || { bg: "rgba(107,106,90,.12)", fg: "#6b6a5a", lbl: a.tipo };
  return '<span style="display:inline-block;margin:1px 3px 1px 0;padding:2px 9px;border-radius:99px;font-size:.72rem;font-weight:700;background:' + s.bg + ';color:' + s.fg + '">' + cobEsc(a.persona) + ' · ' + s.lbl.toLowerCase() + '</span>';
}

function cobTablaHtml() {
  var dim = new Date(cobAnio, cobMes + 1, 0).getDate();
  var filas = "";
  for (var d = 1; d <= dim; d++) {
    var iso = cobIso(cobAnio, cobMes, d);
    var aus = cobAusentesEn(iso);
    var cub = COB.cobertura.map(function (c, i) { return { f: c[0], p: c[1], h: c[2], i: i }; }).filter(function (c) { return c.f === iso; });
    if (!aus.length && !cub.length) continue;
    var dow = cobDiaSemana(iso);
    var finde = dow === "Sáb" || dow === "Dom";
    var cubHtml = cub.map(function (c) {
      return '<span style="display:inline-flex;align-items:center;gap:5px;margin:1px 4px 1px 0;padding:2px 4px 2px 9px;border-radius:99px;font-size:.72rem;background:rgba(31,58,46,.09);color:#1f3a2e;font-weight:600">'
        + cobEsc(c.p) + ' · ' + cobEsc(c.h) + ' hs'
        + '<button onclick="cobBorrarCob(' + c.i + ')" title="Quitar" style="border:none;background:none;cursor:pointer;color:#b13a2c;font-size:.8rem;padding:0 4px">×</button></span>';
    }).join("");
    filas += '<tr style="border-top:1px solid rgba(32,36,31,.08);' + (finde ? 'background:rgba(32,36,31,.03)' : '') + '">'
      + '<td style="padding:7px 10px;white-space:nowrap;font-weight:700;font-size:.8rem">' + dow + ' ' + d + '/' + (cobMes + 1) + '</td>'
      + '<td style="padding:7px 10px">' + (aus.map(cobChipAus).join("") || '<span style="color:rgba(32,36,31,.3)">—</span>') + '</td>'
      + '<td style="padding:7px 10px">' + (cubHtml || '<span style="color:' + (aus.length && !finde ? '#b13a2c' : 'rgba(32,36,31,.3)') + ';font-size:.74rem">' + (aus.length && !finde ? 'sin cobertura cargada' : '—') + '</span>') + '</td>'
      + '</tr>';
  }
  if (!filas) return '<div style="padding:18px;text-align:center;color:rgba(32,36,31,.45);font-size:.85rem">Sin licencias ni coberturas cargadas en este mes.</div>';
  return '<div style="overflow-x:auto;border:1px solid rgba(32,36,31,.14);border-radius:10px"><table style="border-collapse:collapse;width:100%;min-width:520px">'
    + '<thead><tr style="background:rgba(32,36,31,.06);font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;text-align:left"><th style="padding:7px 10px">Día</th><th style="padding:7px 10px">Ausentes</th><th style="padding:7px 10px">Cubren</th></tr></thead><tbody>'
    + filas
    + '</tbody></table></div>';
}

function cobListaAusenciasHtml() {
  var mi = cobIso(cobAnio, cobMes, 1), mf = cobIso(cobAnio, cobMes, new Date(cobAnio, cobMes + 1, 0).getDate());
  var l = COB.ausencias.map(function (a, i) { return { a: a, i: i }; }).filter(function (x) { return x.a.desde <= mf && x.a.hasta >= mi; });
  if (!l.length) return "";
  return '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">' + l.map(function (x) {
    return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.8rem">' + cobChipAus(x.a)
      + '<span style="color:rgba(32,36,31,.6)">del ' + cobFechaCorta(x.a.desde) + ' al ' + cobFechaCorta(x.a.hasta) + (x.a.nota ? ' · ' + cobEsc(x.a.nota) : '') + '</span>'
      + '<button onclick="cobFormAusencia(' + x.i + ')" style="font-size:.7rem;border:1px solid rgba(32,36,31,.2);background:none;border-radius:6px;padding:2px 8px;cursor:pointer">editar</button>'
      + '<button onclick="cobBorrarAus(' + x.i + ')" style="font-size:.7rem;border:1px solid rgba(177,58,44,.4);color:#b13a2c;background:none;border-radius:6px;padding:2px 8px;cursor:pointer">borrar</button></div>';
  }).join("") + '</div>';
}

function cobRepintar() {
  var root = document.getElementById("cobBody");
  if (!root) return;
  var btn = 'style="font-size:.74rem;padding:6px 13px;border-radius:8px;border:1px solid #1f3a2e;background:#1f3a2e;color:#fff;cursor:pointer;font-weight:700"';
  var btn2 = 'style="font-size:.74rem;padding:6px 13px;border-radius:8px;border:1px solid #1f3a2e;background:#fff;color:#1f3a2e;cursor:pointer;font-weight:700"';
  root.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">'
    + '<div style="display:flex;align-items:center;gap:8px">'
    +   '<button onclick="cobCambiarMes(-1)" style="width:30px;height:30px;border-radius:7px;border:1px solid rgba(32,36,31,.2);background:#fff;cursor:pointer;font-size:1rem">‹</button>'
    +   '<span style="font-weight:700;min-width:150px;text-align:center">' + COB_MESES[cobMes] + ' ' + cobAnio + '</span>'
    +   '<button onclick="cobCambiarMes(1)" style="width:30px;height:30px;border-radius:7px;border:1px solid rgba(32,36,31,.2);background:#fff;cursor:pointer;font-size:1rem">›</button>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +   '<button onclick="cobFormAusencia(-1)" ' + btn + '>+ Licencia / vacaciones</button>'
    +   '<button onclick="cobFormCobertura()" ' + btn2 + '>+ Cobertura</button>'
    +   '<button onclick="cobCopiarResumen()" ' + btn2 + '>Copiar resumen</button>'
    + '</div></div>'
    + '<div id="cobForm"></div>'
    + cobListaAusenciasHtml()
    + cobTablaHtml()
    + (COB.notas.length ? '<div style="margin-top:12px;font-size:.72rem;color:rgba(32,36,31,.55);line-height:1.6">' + COB.notas.map(function (n) { return '• ' + cobEsc(n); }).join('<br>') + '</div>' : '')
    + '<div id="cobMsg" style="margin-top:8px;font-size:.72rem;color:#1d6b62"></div>';
}

var _cobInp = 'style="font:inherit;font-size:.8rem;padding:6px 8px;border:1px solid rgba(32,36,31,.25);border-radius:7px;background:#fff;color:#20241f;min-width:0"';
function cobPersonasDatalist() {
  var set = {};
  COB_PERSONAS.concat(COB.ausencias.map(function (a) { return a.persona; }), COB.cobertura.map(function (c) { return c[1]; })).forEach(function (n) { set[n] = 1; });
  return '<datalist id="cobPersonas">' + Object.keys(set).map(function (n) { return '<option value="' + cobEsc(n) + '">'; }).join("") + '</datalist>';
}
function cobFormAusencia(idx) {
  var a = idx >= 0 ? COB.ausencias[idx] : { persona: "", tipo: "vacaciones", desde: cobIso(cobAnio, cobMes, 1), hasta: cobIso(cobAnio, cobMes, 1), nota: "" };
  document.getElementById("cobForm").innerHTML = '<div style="border:1px solid rgba(32,36,31,.2);border-radius:10px;padding:12px;margin-bottom:14px;background:rgba(32,36,31,.03);display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end">'
    + cobPersonasDatalist()
    + '<label style="font-size:.7rem">Persona<br><input id="cobAPersona" list="cobPersonas" value="' + cobEsc(a.persona) + '" ' + _cobInp + '></label>'
    + '<label style="font-size:.7rem">Tipo<br><select id="cobATipo" ' + _cobInp + '><option value="vacaciones"' + (a.tipo === "vacaciones" ? " selected" : "") + '>Vacaciones</option><option value="licencia"' + (a.tipo === "licencia" ? " selected" : "") + '>Licencia</option></select></label>'
    + '<label style="font-size:.7rem">Desde<br><input id="cobADesde" type="date" value="' + a.desde + '" ' + _cobInp + '></label>'
    + '<label style="font-size:.7rem">Hasta<br><input id="cobAHasta" type="date" value="' + a.hasta + '" ' + _cobInp + '></label>'
    + '<label style="font-size:.7rem;flex:1;min-width:140px">Nota<br><input id="cobANota" value="' + cobEsc(a.nota) + '" style="width:100%;font:inherit;font-size:.8rem;padding:6px 8px;border:1px solid rgba(32,36,31,.25);border-radius:7px;background:#fff;color:#20241f"></label>'
    + '<button onclick="cobGuardarAus(' + idx + ')" style="font-size:.76rem;padding:7px 14px;border-radius:8px;border:none;background:#1f3a2e;color:#fff;cursor:pointer;font-weight:700">Guardar</button>'
    + '<button onclick="document.getElementById(\'cobForm\').innerHTML=\'\'" style="font-size:.76rem;padding:7px 12px;border-radius:8px;border:1px solid rgba(32,36,31,.25);background:#fff;cursor:pointer">Cancelar</button>'
    + '<div id="cobFormErr" style="width:100%;font-size:.72rem;color:#b13a2c"></div></div>';
}
function cobGuardarAus(idx) {
  var v = function (id) { return document.getElementById(id).value.trim(); };
  var a = { id: idx >= 0 ? COB.ausencias[idx].id : "a" + Date.now(), persona: v("cobAPersona"), tipo: v("cobATipo"), desde: v("cobADesde"), hasta: v("cobAHasta"), nota: v("cobANota") };
  var err = document.getElementById("cobFormErr");
  if (!a.persona) { err.textContent = "Falta la persona."; return; }
  if (!a.desde || !a.hasta) { err.textContent = "Completá las fechas."; return; }
  if (a.hasta < a.desde) { err.textContent = "“Hasta” no puede ser anterior a “Desde”."; return; }
  if (idx >= 0) COB.ausencias[idx] = a; else COB.ausencias.push(a);
  cobGuardar(); cobRepintar();
}
function cobBorrarAus(idx) {
  var a = COB.ausencias[idx];
  if (!a || !confirm("¿Borrar " + a.tipo + " de " + a.persona + " (" + cobFechaCorta(a.desde) + " al " + cobFechaCorta(a.hasta) + ")? Las coberturas ya cargadas se mantienen.")) return;
  COB.ausencias.splice(idx, 1);
  cobGuardar(); cobRepintar();
}
function cobFormCobertura() {
  var ini = cobIso(cobAnio, cobMes, 1);
  document.getElementById("cobForm").innerHTML = '<div style="border:1px solid rgba(32,36,31,.2);border-radius:10px;padding:12px;margin-bottom:14px;background:rgba(32,36,31,.03);display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end">'
    + cobPersonasDatalist()
    + '<label style="font-size:.7rem">Quién cubre<br><input id="cobCPersona" list="cobPersonas" ' + _cobInp + '></label>'
    + '<label style="font-size:.7rem">Desde<br><input id="cobCDesde" type="date" value="' + ini + '" ' + _cobInp + '></label>'
    + '<label style="font-size:.7rem">Hasta<br><input id="cobCHasta" type="date" value="' + ini + '" ' + _cobInp + '></label>'
    + '<label style="font-size:.7rem">Horas por día<br><input id="cobCHoras" type="number" min="1" max="24" step="0.5" value="4" style="width:80px;font:inherit;font-size:.8rem;padding:6px 8px;border:1px solid rgba(32,36,31,.25);border-radius:7px;background:#fff;color:#20241f"></label>'
    + '<label style="font-size:.74rem;display:flex;align-items:center;gap:5px;padding-bottom:7px"><input id="cobCLaborables" type="checkbox" checked> solo lunes a viernes</label>'
    + '<button onclick="cobGuardarCob()" style="font-size:.76rem;padding:7px 14px;border-radius:8px;border:none;background:#1f3a2e;color:#fff;cursor:pointer;font-weight:700">Agregar</button>'
    + '<button onclick="document.getElementById(\'cobForm\').innerHTML=\'\'" style="font-size:.76rem;padding:7px 12px;border-radius:8px;border:1px solid rgba(32,36,31,.25);background:#fff;cursor:pointer">Cancelar</button>'
    + '<div id="cobFormErr" style="width:100%;font-size:.72rem;color:#b13a2c"></div></div>';
}
function cobGuardarCob() {
  var persona = document.getElementById("cobCPersona").value.trim();
  var desde = document.getElementById("cobCDesde").value, hasta = document.getElementById("cobCHasta").value;
  var horas = parseFloat(document.getElementById("cobCHoras").value);
  var soloLab = document.getElementById("cobCLaborables").checked;
  var err = document.getElementById("cobFormErr");
  if (!persona) { err.textContent = "Falta quién cubre."; return; }
  if (!desde || !hasta || hasta < desde) { err.textContent = "Revisá las fechas."; return; }
  if (!(horas > 0)) { err.textContent = "Cargá las horas por día."; return; }
  var p1 = desde.split("-"), p2 = hasta.split("-");
  var cur = new Date(+p1[0], +p1[1] - 1, +p1[2]), fin = new Date(+p2[0], +p2[1] - 1, +p2[2]);
  var n = 0;
  for (; cur <= fin; cur.setDate(cur.getDate() + 1)) {
    if (soloLab && (cur.getDay() === 0 || cur.getDay() === 6)) continue;
    var iso = cobIso(cur.getFullYear(), cur.getMonth(), cur.getDate());
    // Mismo día y misma persona: se reemplaza, no se duplica.
    COB.cobertura = COB.cobertura.filter(function (c) { return !(c[0] === iso && c[1] === persona); });
    COB.cobertura.push([iso, persona, horas]);
    n++;
  }
  COB.cobertura.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1; });
  cobGuardar(); cobRepintar();
  var m = document.getElementById("cobMsg"); if (m) m.textContent = "✓ " + n + " día(s) cargado(s) para " + persona + ".";
}
function cobBorrarCob(i) {
  COB.cobertura.splice(i, 1);
  cobGuardar(); cobRepintar();
}

// Texto listo para pegar en WhatsApp: ausencias del mes y quién cubre.
function cobCopiarResumen() {
  var mi = cobIso(cobAnio, cobMes, 1), dim = new Date(cobAnio, cobMes + 1, 0).getDate(), mf = cobIso(cobAnio, cobMes, dim);
  var L = ["*Licencias y coberturas · " + COB_MESES[cobMes] + " " + cobAnio + "*", ""];
  COB.ausencias.filter(function (a) { return a.desde <= mf && a.hasta >= mi; }).forEach(function (a) {
    L.push("• " + a.persona + ": " + a.tipo + " del " + cobFechaCorta(a.desde) + " al " + cobFechaCorta(a.hasta));
  });
  var porPersona = {};
  COB.cobertura.filter(function (c) { return c[0] >= mi && c[0] <= mf; }).forEach(function (c) { (porPersona[c[1]] = porPersona[c[1]] || []).push(c); });
  var nombres = Object.keys(porPersona);
  if (nombres.length) {
    L.push("", "*Quién cubre*");
    nombres.forEach(function (n) {
      L.push("• " + n + ": " + porPersona[n].map(function (c) { return cobFechaCorta(c[0]) + " (" + c[2] + " hs)"; }).join(", "));
    });
  }
  var texto = L.join("\n"), m = document.getElementById("cobMsg");
  var ok = function () { if (m) m.textContent = "✓ Resumen copiado. Pegalo en WhatsApp."; };
  var fallo = function () { if (m) m.innerHTML = '<textarea readonly rows="8" style="width:100%;font:inherit;font-size:.78rem">' + cobEsc(texto) + '</textarea>'; };
  try { navigator.clipboard.writeText(texto).then(ok, fallo); } catch (e) { fallo(); }
}

function renderCoberturas() {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  admSubtabs("licencias", "coberturas");
  PERIODOS_TODOS.forEach(function (p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });
  var sl = document.getElementById("adm-sidenav-licencias");
  if (sl) sl.className = "adm-sidenav-btn active";
  cobCargar();
  if (cobMes === null) cobMesInicial();
  document.getElementById("adm-content").innerHTML =
    '<div id="cobScreenRoot"><div class="adm-sec-title">Coberturas de licencias y vacaciones</div>'
    + '<div id="cobBody" style="padding:8px 0"></div></div>';
  cobRepintar();
}
