// ══════ CONVENIOS — Aranceles por obra social ═════════════════════════════
// Antes vivía como página suelta en Netlify (valores-convenios-ceot-2026).
// Acá se ven, se comparan y se ACTUALIZAN: se suben los archivos que mandan
// las obras sociales (Excel, CSV, TXT o PDF), el módulo lee los valores,
// muestra una vista previa contra lo actual y recién al confirmar los guarda.
// Cada actualización deja la versión anterior en el historial de esa obra
// social (se puede restaurar), así la evolución mes a mes queda registrada.
//
// Se guarda en ceot_convenios y se sincroniza entre PCs como Coberturas.
// La semilla (js/convenios-datos.js) es solo el punto de partida: lo guardado
// la reemplaza, y no se sube sola — recién al primer cambio.
//
// Formato de cada convenio:
//   { id, os, periodo:'AAAA-MM', vigencia:'01/07/2026', nota,
//     nun: { "1".."10": [cir, ay1, ay2, tot] } | null,
//     art: [sinMaterial, conMaterial] | null, neuro: [A, B, C, D] | null,
//     fuente: 'archivo.pdf' | 'manual' | 'semilla',
//     historial: [ { fecha, periodo, vigencia, nun, art, neuro, fuente } ] }  (más nuevo primero)
var CONV_KEY = "ceot_convenios";
var CONV = null;
var _convPulled = false;
var convVista = "lista", convSel = null, convBusca = "", convFiltro = "todos";
var convRol = 0, convOrden = { col: "os", dir: 1 };
var convEd = null; // editor / vista previa de importación
var CONV_MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
var CONV_ROLES = ["Cirujano", "1° Ayudante", "2° Ayudante", "Total equipo"];
var CONV_NEURO = ["A", "B", "C", "D"];

// ── Utilidades ──────────────────────────────────────────────────────────
function convEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function convNorm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function convRed(n) { return n == null || isNaN(n) ? null : Math.round(n * 100) / 100; }
function convFmt(n) { return n == null ? "—" : "$ " + Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 }); }
function convFmtIn(n) { return n == null ? "" : Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 }); }
function convPct(a, b) { return a && b != null ? (b - a) / a * 100 : null; }
function convPctHtml(p) {
  if (p == null) return '<span class="conv-dim">—</span>';
  var t = (p > 0 ? "▲ " : p < 0 ? "▼ " : "= ") + Math.abs(p).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "%";
  return '<span class="' + (p > 0.05 ? "conv-up" : p < -0.05 ? "conv-dn" : "conv-dim") + '">' + t + "</span>";
}
function convHoyPeriodo() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
function convPeriodoTxt(p) { if (!p) return "—"; var a = p.split("-"); return CONV_MESES[+a[1] - 1].slice(0, 3) + " " + a[0]; }
function convId(nombre) { return convNorm(nombre).replace(/ /g, "-") || ("os-" + Date.now()); }
function convClonar(o) { return JSON.parse(JSON.stringify(o)); }

// Número en formato argentino o inglés: "$ 1.234.567,89", "98.370", "1,234.5", 6634.
function convNum(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  var s = String(v).replace(/[$\s ]/g, "").replace(/[^\d.,\-]/g, "");
  if (!/\d/.test(s)) return null;
  var ip = s.lastIndexOf("."), ic = s.lastIndexOf(",");
  if (ip !== -1 && ic !== -1) {
    var dec = ip > ic ? "." : ",", mil = dec === "." ? "," : ".";
    s = s.split(mil).join("").replace(dec, ".");
  } else if (ip !== -1 || ic !== -1) {
    var sep = ip !== -1 ? "." : ",", partes = s.split(sep);
    if (partes.length > 2 || partes[partes.length - 1].length === 3) s = partes.join("");
    else s = partes.join(".");
  }
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Vigencia "01/07/2026", "1-7-26", "Jul/2026", "julio 2026" → Date (o null).
var CONV_MES_ABR = { ene: 0, jan: 0, feb: 1, mar: 2, abr: 3, apr: 3, may: 4, jun: 5, jul: 6, ago: 7, aug: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11, dec: 11 };
function convVigFecha(v) {
  if (!v) return null;
  var m = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(v);
  if (m) { var y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[2] - 1, +m[1]); }
  m = /([a-záéíóú]{3,})\.?[\s\/\-de]*(\d{4})/i.exec(v);
  if (m) { var k = CONV_MES_ABR[convNorm(m[1]).slice(0, 3)]; if (k != null) return new Date(+m[2], k, 1); }
  return null;
}
function convVigMeses(v) {
  var d = convVigFecha(v); if (!d) return null;
  var h = new Date();
  return (h.getFullYear() - d.getFullYear()) * 12 + (h.getMonth() - d.getMonth());
}
function convVigHtml(v) {
  if (!v) return '<span class="conv-tag conv-dim">sin dato</span>';
  var m = convVigMeses(v), cls = m == null ? "" : m > 6 ? "conv-tag-neg" : m > 3 ? "conv-tag-warn" : "conv-tag-ok";
  var tit = m == null ? "" : ' title="' + (m <= 0 ? "Vigente desde este mes" : "Hace " + m + (m === 1 ? " mes" : " meses")) + '"';
  return '<span class="conv-tag ' + cls + '"' + tit + ">" + (m != null && m > 3 ? "⚠ " : "") + convEsc(v) + "</span>";
}

// Ayudantes según el NUN: complejidad 2-4 lleva 1 ayudante, 5 en adelante 2;
// cada uno cobra el 20% del cirujano.
function convAyudantes(c, cir) {
  if (cir == null) return [null, null];
  return [c >= 2 ? convRed(cir * 0.2) : 0, c >= 5 ? convRed(cir * 0.2) : 0];
}
function convFila(c, cir, ay1, ay2) {
  if (cir == null) return [null, null, null, null];
  return [convRed(cir), convRed(ay1), convRed(ay2), convRed((cir || 0) + (ay1 || 0) + (ay2 || 0))];
}

// ── Estado y guardado ───────────────────────────────────────────────────
function convDesdeSemilla() {
  return { os: (typeof CONV_SEMILLA !== "undefined" ? CONV_SEMILLA : []).map(function (s) {
    return { id: convId(s.os), os: s.os, periodo: s.periodo, vigencia: s.vigencia || "", nota: "",
      nun: s.nun ? convLimpiarNun(s.nun) : null, art: s.art || null, neuro: s.neuro || null, fuente: "semilla", historial: [] };
  }), archivos: [] };
}
function convLeerLocal() {
  var d = null;
  try { d = JSON.parse(localStorage.getItem(CONV_KEY)); } catch (e) {}
  CONV = d && Array.isArray(d.os) ? d : convDesdeSemilla();
  if (!Array.isArray(CONV.archivos)) CONV.archivos = [];
  CONV.os.forEach(function (o) { if (!Array.isArray(o.historial)) o.historial = []; });
}
function convGuardar() {
  try { localStorage.setItem(CONV_KEY, JSON.stringify(CONV)); } catch (e) { alert("No se pudo guardar en este navegador: " + e.message); }
  if (typeof syncPush === "function") syncPush(CONV_KEY);
}
function convCargar() {
  convLeerLocal();
  if (!_convPulled && typeof syncPull === "function") {
    _convPulled = true;
    syncPull(CONV_KEY, function () {
      convLeerLocal();
      if (document.getElementById("convRoot") && !convEd) convRepintar();
      if (document.getElementById("portalConvLista")) portalConvPintar();
    });
  }
}
function convBuscarOs(nombre) {
  var n = convNorm(nombre);
  for (var i = 0; i < CONV.os.length; i++) if (convNorm(CONV.os[i].os) === n) return CONV.os[i];
  return null;
}
function convPorId(id) { for (var i = 0; i < CONV.os.length; i++) if (CONV.os[i].id === id) return CONV.os[i]; return null; }
function convCir(o, c) { return o.nun && o.nun[String(c)] ? o.nun[String(c)][0] : null; }

// ── Alertas automáticas ─────────────────────────────────────────────────
function convMediana(arr) { var a = arr.filter(function (x) { return x != null; }).sort(function (x, y) { return x - y; }); return a.length ? a[Math.floor(a.length / 2)] : null; }
function convAlertas(o) {
  var al = [];
  var m = convVigMeses(o.vigencia);
  if (m != null && m > 6) al.push("Vigencia de hace " + m + " meses: pedir valores actualizados.");
  if (!o.vigencia) al.push("Sin fecha de vigencia.");
  if (o.nun) {
    var med = convMediana(CONV.os.map(function (x) { return convCir(x, 5); })), c5 = convCir(o, 5);
    if (med && c5 && (c5 < med * 0.3 || c5 > med * 3)) al.push("C5 cirujano (" + convFmt(c5) + ") muy lejos de la mediana de los convenios (" + convFmt(med) + "): revisar si está bien cargado.");
    for (var c = 2; c <= 10; c++) { var a = convCir(o, c - 1), b = convCir(o, c); if (a != null && b != null && b < a) { al.push("C" + c + " vale menos que C" + (c - 1) + "."); break; } }
  }
  var firma = JSON.stringify([o.nun, o.art, o.neuro]);
  var gemelos = CONV.os.filter(function (x) { return x !== o && JSON.stringify([x.nun, x.art, x.neuro]) === firma && (x.art || x.neuro) && !/\bart\b/i.test(x.os + " " + o.os); });
  if (gemelos.length) al.push("Valores idénticos a " + gemelos.map(function (x) { return x.os; }).join(", ") + ": confirmar que no sea copiado.");
  return al;
}

// ── Pantalla principal ──────────────────────────────────────────────────
function renderConvenios() {
  if (typeof cerrarAdmSidenav === "function") cerrarAdmSidenav();
  if (typeof admDesactivarSidebar === "function") admDesactivarSidebar();
  if (typeof PERIODOS_TODOS !== "undefined") PERIODOS_TODOS.forEach(function (p) { var t = document.getElementById("adm-tab-" + p); if (t) t.className = "adm-tab"; });
  var sb = document.getElementById("adm-sidenav-convenios");
  if (sb) sb.className = "adm-sidenav-btn active";
  convInyectarEstilos();
  convCargar();
  convEd = null;
  if (convVista === "editor") convVista = "lista";
  document.getElementById("adm-content").innerHTML = '<div id="convRoot"></div>';
  convRepintar();
}
function convIr(v, id) { convVista = v; if (id !== undefined) convSel = id; if (v !== "editor") convEd = null; convRepintar(); window.scrollTo(0, 0); }

function convRepintar() {
  var root = document.getElementById("convRoot");
  if (!root) return;
  var vb = function (k, t) { return '<button class="deb-btn' + (convVista === k ? " deb-btn-pri" : "") + '" onclick="convIr(\'' + k + '\')">' + t + "</button>"; };
  var html = '<div class="adm-sec-title">Convenios · aranceles por obra social</div>';
  if (convVista !== "editor") {
    html += '<div class="deb-toolbar" style="flex-wrap:wrap;gap:6px">'
      + vb("lista", "📋 Convenios") + vb("comparar", "⚖ Comparar / ranking") + vb("archivos", "🗂 Importaciones")
      + '<span style="flex:1"></span>'
      + '<button class="deb-btn deb-btn-pri" onclick="convImportar()" title="Excel, CSV, TXT o PDF que mandó la obra social. Se pueden elegir varios juntos.">⬆ Importar archivos</button>'
      + '<button class="deb-btn" onclick="convNuevo()">＋ Nuevo convenio</button>'
      + '<button class="deb-btn" onclick="convExportarExcel()" title="Todos los valores actuales, en el mismo formato que se puede volver a importar">⬇ Excel</button>'
      + '<button class="deb-btn" onclick="convPlanillaModelo()" title="Planilla vacía para cargar uno o varios convenios a mano y después importarla">⬇ Planilla modelo</button>'
      + "</div>"
      + '<div id="convAviso" style="display:none" class="conv-aviso"></div>';
  }
  if (convVista === "detalle" && convPorId(convSel)) html += convHtmlDetalle(convPorId(convSel));
  else if (convVista === "comparar") html += convHtmlComparar();
  else if (convVista === "archivos") html += convHtmlArchivos();
  else if (convVista === "editor" && convEd) html += convHtmlEditor();
  else { convVista = "lista"; html += convHtmlLista(); }
  root.innerHTML = html;
  if (convVista === "lista") convPintarTabla();
}
function convAviso(html, tipo) {
  var el = document.getElementById("convAviso");
  if (!el) return;
  el.style.display = html ? "block" : "none";
  el.className = "conv-aviso" + (tipo ? " conv-aviso-" + tipo : "");
  el.innerHTML = html || "";
}

// ── Lista ───────────────────────────────────────────────────────────────
function convHtmlLista() {
  var tot = CONV.os.length, viejos = CONV.os.filter(function (o) { var m = convVigMeses(o.vigencia); return m != null && m > 3; }).length;
  var conAl = CONV.os.filter(function (o) { return convAlertas(o).length; }).length;
  var f = function (k, t) { return '<span class="conv-chip' + (convFiltro === k ? " on" : "") + '" onclick="convFiltro=\'' + k + '\';convPintarTabla();convMarcarChips()" data-k="' + k + '">' + t + "</span>"; };
  return '<div class="conv-resumen">'
    + '<div><b>' + tot + '</b><span>convenios</span></div>'
    + '<div><b>' + CONV.os.filter(function (o) { return o.nun; }).length + '</b><span>con tabla NUN</span></div>'
    + '<div class="' + (viejos ? "conv-warn" : "") + '"><b>' + viejos + '</b><span>vigencia &gt; 3 meses</span></div>'
    + '<div class="' + (conAl ? "conv-warn" : "") + '"><b>' + conAl + '</b><span>con alertas</span></div>'
    + "</div>"
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:10px 0">'
    + '<input class="conv-input" style="flex:1;min-width:180px" placeholder="Buscar obra social…" value="' + convEsc(convBusca) + '" oninput="convBusca=this.value;convPintarTabla()">'
    + f("todos", "Todos") + f("nun", "NUN 1-10") + f("art", "Artroscopía") + f("neuro", "Neuro") + f("viejos", "⚠ Desactualizados") + f("alertas", "⚠ Con alertas")
    + "</div>"
    + '<div class="adm-table-wrap"><table class="adm-table conv-tabla"><thead><tr>'
    + "<th>Obra social</th><th>C1 cirujano</th><th>C5 cirujano</th><th>C10 cirujano</th><th>Artrosc. s/m</th><th>Artrosc. c/m</th><th>Neuro A</th><th>Vigencia</th><th>Actualizado</th>"
    + '</tr></thead><tbody id="convTbody"></tbody></table></div>'
    + '<div class="conv-pie">Tocá una obra social para ver la tabla completa, el historial y actualizarla. Lo que se sube queda guardado y sincronizado entre PCs.</div>';
}
function convMarcarChips() {
  document.querySelectorAll("#convRoot .conv-chip").forEach(function (el) { el.classList.toggle("on", el.getAttribute("data-k") === convFiltro); });
}
function convPintarTabla() {
  var tb = document.getElementById("convTbody");
  if (!tb) return;
  var q = convNorm(convBusca);
  var filas = CONV.os.filter(function (o) {
    if (q && convNorm(o.os).indexOf(q) === -1) return false;
    if (convFiltro === "nun") return !!o.nun;
    if (convFiltro === "art") return !!o.art;
    if (convFiltro === "neuro") return !!o.neuro;
    if (convFiltro === "viejos") { var m = convVigMeses(o.vigencia); return m == null || m > 3; }
    if (convFiltro === "alertas") return convAlertas(o).length > 0;
    return true;
  }).sort(function (a, b) { return a.os.localeCompare(b.os, "es"); });
  if (!filas.length) { tb.innerHTML = '<tr><td colspan="9" style="text-align:center;font-weight:400" class="conv-dim">Nada coincide con la búsqueda.</td></tr>'; return; }
  tb.innerHTML = filas.map(function (o) {
    var al = convAlertas(o);
    return '<tr class="conv-click" onclick="convIr(\'detalle\',\'' + convEsc(o.id) + '\')">'
      + "<td>" + convEsc(o.os) + (al.length ? ' <span class="conv-al" title="' + convEsc(al.join("\n")) + '">⚠</span>' : "") + "</td>"
      + "<td>" + convFmt(convCir(o, 1)) + "</td><td>" + convFmt(convCir(o, 5)) + "</td><td>" + convFmt(convCir(o, 10)) + "</td>"
      + "<td>" + convFmt(o.art && o.art[0]) + "</td><td>" + convFmt(o.art && o.art[1]) + "</td>"
      + "<td>" + convFmt(o.neuro && o.neuro[0]) + "</td>"
      + "<td>" + convVigHtml(o.vigencia) + "</td><td>" + convPeriodoTxt(o.periodo) + "</td></tr>";
  }).join("");
}

// ── Detalle de una obra social ──────────────────────────────────────────
function convHtmlDetalle(o) {
  var al = convAlertas(o), id = convEsc(o.id);
  var h = '<div class="conv-det-hd"><button class="deb-btn" onclick="convIr(\'lista\')">← Volver</button>'
    + '<div style="flex:1;min-width:200px"><div class="conv-det-tit">' + convEsc(o.os) + "</div>"
    + '<div class="conv-dim" style="font-size:.74rem">Vigencia ' + convVigHtml(o.vigencia) + " · cargado " + convPeriodoTxt(o.periodo)
    + " · fuente: " + convEsc(o.fuente === "semilla" ? "página de Netlify" : o.fuente || "—") + "</div></div>"
    + '<button class="deb-btn deb-btn-pri" onclick="convImportar(\'' + id + '\')">⬆ Actualizar desde archivo</button>'
    + '<button class="deb-btn" onclick="convEditar(\'' + id + '\')">✏ Editar valores</button>'
    + '<button class="deb-btn" onclick="convAumento(\'' + id + '\')">％ Aplicar aumento</button>'
    + '<button class="deb-btn" onclick="convBorrar(\'' + id + '\')" title="Borrar este convenio">🗑</button></div>';
  if (al.length) h += '<div class="conv-aviso conv-aviso-warn">' + al.map(function (a) { return "⚠ " + convEsc(a); }).join("<br>") + "</div>";
  if (o.nun) {
    h += '<div class="conv-sub">Honorarios NUN por complejidad</div><div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Complejidad</th>'
      + CONV_ROLES.map(function (r) { return "<th>" + r + "</th>"; }).join("") + "</tr></thead><tbody>";
    for (var c = 1; c <= 10; c++) {
      var f = o.nun[String(c)] || [];
      h += "<tr><td>C" + c + "</td><td>" + convFmt(f[0]) + "</td><td>" + convFmt(f[1]) + "</td><td>" + convFmt(f[2]) + '</td><td><b>' + convFmt(f[3]) + "</b></td></tr>";
    }
    h += "</tbody></table></div>";
  }
  if (o.art || o.neuro) {
    h += '<div class="conv-grid">';
    if (o.art) h += '<div class="conv-box"><div class="conv-sub" style="margin-top:0">Artroscopía</div><div class="conv-kv"><span>Sin material</span><b>' + convFmt(o.art[0]) + '</b></div><div class="conv-kv"><span>Con material</span><b>' + convFmt(o.art[1]) + "</b></div></div>";
    if (o.neuro) h += '<div class="conv-box"><div class="conv-sub" style="margin-top:0">Módulos neuro</div>' + CONV_NEURO.map(function (L, i) { return '<div class="conv-kv"><span>Módulo ' + L + "</span><b>" + convFmt(o.neuro[i]) + "</b></div>"; }).join("") + "</div>";
    h += "</div>";
  }
  if (!o.nun && !o.art && !o.neuro) h += '<div class="conv-vacio">Todavía no tiene valores. Subí el archivo de la obra social o cargalos a mano.</div>';
  h += '<div class="conv-sub">Nota</div><textarea class="conv-input" style="width:100%;min-height:54px;box-sizing:border-box" placeholder="Ej: valores informados por mail, falta firmar addenda…" onchange="convGuardarNota(\'' + id + '\',this.value)">' + convEsc(o.nota || "") + "</textarea>";
  h += convHtmlHistorial(o);
  return h;
}
function convGuardarNota(id, v) { var o = convPorId(id); if (!o) return; o.nota = v; convGuardar(); }

// Historial: una columna por versión (de la más vieja a la actual) con la
// variación contra la versión anterior.
function convHtmlHistorial(o) {
  var h = '<div class="conv-sub">Historial de actualizaciones</div>';
  if (!o.historial.length) return h + '<div class="conv-dim" style="font-size:.76rem">Sin versiones anteriores. Cuando se actualice, la versión actual queda acá y se puede restaurar.</div>';
  var vers = o.historial.slice().reverse().concat([{ periodo: o.periodo, vigencia: o.vigencia, nun: o.nun, art: o.art, neuro: o.neuro, fuente: o.fuente, actual: true }]);
  var filas = [];
  var get = function (v, tipo, i) { if (tipo === "nun") return v.nun && v.nun[String(i)] ? v.nun[String(i)][0] : null; if (tipo === "art") return v.art ? v.art[i] : null; return v.neuro ? v.neuro[i] : null; };
  for (var k = 1; k <= 10; k++) filas.push({ lbl: "C" + k + " cirujano", t: "nun", i: k });
  filas.push({ lbl: "Artrosc. s/m", t: "art", i: 0 }, { lbl: "Artrosc. c/m", t: "art", i: 1 });
  CONV_NEURO.forEach(function (L, i) { filas.push({ lbl: "Neuro " + L, t: "neuro", i: i }); });
  filas = filas.filter(function (f) { return vers.some(function (v) { return get(v, f.t, f.i) != null; }); });
  h += '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Concepto</th>'
    + vers.map(function (v, j) {
        return "<th>" + convPeriodoTxt(v.periodo) + '<br><small class="conv-dim" style="font-weight:400">' + convEsc(v.vigencia || "") + "</small>"
          + (v.actual ? '<br><small style="font-weight:700">actual</small>' : '<br><button class="conv-mini" onclick="convRestaurar(\'' + convEsc(o.id) + "'," + (o.historial.length - 1 - j) + ')">restaurar</button>') + "</th>";
      }).join("") + "</tr></thead><tbody>"
    + filas.map(function (f) {
        var prev = null;
        return "<tr><td>" + f.lbl + "</td>" + vers.map(function (v) {
          var x = get(v, f.t, f.i), cel = convFmt(x) + (prev != null && x != null ? "<br>" + convPctHtml(convPct(prev, x)) : "");
          if (x != null) prev = x;
          return "<td>" + cel + "</td>";
        }).join("") + "</tr>";
      }).join("")
    + "</tbody></table></div>";
  return h;
}
function convSnapshot(o) { return { fecha: new Date().toISOString().slice(0, 10), periodo: o.periodo, vigencia: o.vigencia, nun: o.nun, art: o.art, neuro: o.neuro, fuente: o.fuente }; }
function convRestaurar(id, idx) {
  var o = convPorId(id), v = o && o.historial[idx];
  if (!v) return;
  if (!confirm("¿Volver a los valores de " + convPeriodoTxt(v.periodo) + " (vigencia " + (v.vigencia || "sin dato") + ")? Los actuales quedan en el historial.")) return;
  o.historial.splice(idx, 1);
  o.historial.unshift(convSnapshot(o));
  o.periodo = v.periodo; o.vigencia = v.vigencia; o.nun = v.nun; o.art = v.art; o.neuro = v.neuro; o.fuente = v.fuente;
  convGuardar(); convRepintar();
}
function convBorrar(id) {
  var o = convPorId(id); if (!o) return;
  if (!confirm("¿Borrar el convenio " + o.os + " con todo su historial?")) return;
  CONV.os = CONV.os.filter(function (x) { return x !== o; });
  convGuardar(); convIr("lista");
}

// ── Comparar / ranking ──────────────────────────────────────────────────
function convHtmlComparar() {
  var lista = CONV.os.filter(function (o) { return o.nun; });
  var val = function (o, c) { var f = o.nun[String(c)]; return f ? f[convRol] : null; };
  lista.sort(function (a, b) {
    if (convOrden.col === "os") return convOrden.dir * a.os.localeCompare(b.os, "es");
    var x = val(a, convOrden.col), y = val(b, convOrden.col);
    if (x == null) return 1; if (y == null) return -1;
    return convOrden.dir * (x - y);
  });
  var max = {}, min = {};
  for (var c = 1; c <= 10; c++) {
    var vs = lista.map(function (o) { return val(o, c); }).filter(function (x) { return x; });
    max[c] = Math.max.apply(null, vs); min[c] = Math.min.apply(null, vs);
  }
  var th = function (col, t) { var on = convOrden.col === col; return '<th class="conv-click" onclick="convOrdenar(\'' + col + '\')">' + t + (on ? (convOrden.dir > 0 ? " ▲" : " ▼") : "") + "</th>"; };
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px">'
    + '<span class="conv-dim" style="font-size:.74rem">Ver:</span>'
    + CONV_ROLES.map(function (r, i) { return '<span class="conv-chip' + (convRol === i ? " on" : "") + '" onclick="convRol=' + i + ';convRepintar()">' + r + "</span>"; }).join("")
    + '<span style="flex:1"></span><button class="deb-btn" onclick="convCsvComparar()">⬇ CSV</button><button class="deb-btn" onclick="window.print()">🖶 Imprimir</button></div>'
    + '<div class="conv-pie" style="margin:0 0 8px">Tocá el encabezado de una complejidad para ordenar (ranking). <span class="conv-up">Verde</span> = el que más paga, <span class="conv-dn">rojo</span> = el que menos.</div>'
    + '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' + th("os", "Obra social")
    + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (c) { return th(c, "C" + c); }).join("") + "<th>Vigencia</th></tr></thead><tbody>"
    + lista.map(function (o, i) {
        return '<tr class="conv-click" onclick="convIr(\'detalle\',\'' + convEsc(o.id) + '\')"><td>' + (convOrden.col !== "os" ? (i + 1) + ". " : "") + convEsc(o.os) + "</td>"
          + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (c) {
              var x = val(o, c), cls = x && x === max[c] ? "conv-up" : x && x === min[c] ? "conv-dn" : "";
              return '<td class="' + cls + '">' + (x ? convFmt(x) : "—") + "</td>";
            }).join("") + "<td>" + convVigHtml(o.vigencia) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
}
function convOrdenar(col) {
  if (convOrden.col === col) convOrden.dir = -convOrden.dir;
  else convOrden = { col: col, dir: col === "os" ? 1 : -1 };
  convRepintar();
}
function convCsvComparar() {
  var filas = [["Obra social"].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (c) { return "C" + c; })).concat(["Vigencia"])];
  CONV.os.filter(function (o) { return o.nun; }).forEach(function (o) {
    filas.push([o.os].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (c) { var f = o.nun[String(c)]; return f && f[convRol] != null ? String(f[convRol]).replace(".", ",") : ""; })).concat([o.vigencia || ""]));
  });
  var csv = "﻿" + filas.map(function (f) { return f.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(";"); }).join("\n");
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = "Convenios_" + CONV_ROLES[convRol].replace(/[^a-zA-Z0-9]+/g, "") + "_" + convHoyPeriodo() + ".csv";
  a.click();
}

// ── Registro de importaciones ───────────────────────────────────────────
function convHtmlArchivos() {
  if (!CONV.archivos.length) return '<div class="conv-vacio">Todavía no se importó ningún archivo. Tocá <b>⬆ Importar archivos</b> y elegí lo que mandó la obra social (Excel, CSV, TXT o PDF).</div>';
  return '<div class="conv-pie" style="margin:0 0 8px">Registro de lo que se subió y qué convenios actualizó. El archivo original no se guarda acá (solo los valores leídos): conservalo en Drive.</div>'
    + '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Archivo</th><th>Fecha</th><th>Tamaño</th><th>Convenios actualizados</th></tr></thead><tbody>'
    + CONV.archivos.map(function (a) {
        return "<td>" + convEsc(a.nombre) + "</td><td>" + convEsc(a.fecha) + "</td><td>" + (a.tam ? Math.round(a.tam / 1024) + " KB" : "—") + '</td><td style="text-align:left">' + convEsc((a.os || []).join(", ") || "ninguno") + "</td>";
      }).map(function (t) { return "<tr>" + t + "</tr>"; }).join("")
    + "</tbody></table></div>";
}

// ══════ IMPORTACIÓN ═════════════════════════════════════════════════════
// convImportar(id?) → elegir archivos → leer → parsear → editor con vista
// previa (valores nuevos vs actuales, alertas) → Guardar.
function convImportar(idDestino) {
  var inp = document.createElement("input");
  inp.type = "file"; inp.multiple = !idDestino; inp.accept = ".xlsx,.xls,.csv,.txt,.pdf";
  inp.onchange = function () { if (inp.files.length) convProcesarArchivos(Array.prototype.slice.call(inp.files), idDestino); };
  inp.click();
}
function convProcesarArchivos(files, idDestino) {
  convAviso("Leyendo " + files.length + " archivo(s)…");
  var items = [], errores = [];
  Promise.all(files.map(function (file) {
    return convLeerArchivo(file).then(function (doc) {
      var res = convParsear(doc, idDestino);
      if (!res.length) errores.push("<b>" + convEsc(file.name) + "</b>: no se encontraron valores (complejidades, artroscopía, neuro ni porcentaje de aumento).");
      res.forEach(function (it) { it.archivo = file.name; it.tam = file.size; items.push(it); });
    }).catch(function (e) { errores.push("<b>" + convEsc(file.name) + "</b>: " + convEsc(e.message || String(e))); });
  })).then(function () {
    if (!items.length) { convAviso(errores.join("<br>") || "No se reconoció ningún archivo.", "error"); return; }
    convEd = { modo: "importar", items: items, errores: errores };
    convVista = "editor"; convRepintar(); window.scrollTo(0, 0);
  });
}

// Lee el archivo y devuelve { nombre, filas: [[celdas]], texto }.
function convLeerArchivo(file) {
  var nombre = file.name;
  if (/\.pdf$/i.test(nombre)) {
    if (!window.pdfjsLib) return Promise.reject(new Error("pdf.js no está disponible, recargá la página."));
    return file.arrayBuffer().then(function (buf) { return pdfjsLib.getDocument({ data: buf }).promise; }).then(function (pdf) {
      var ps = [];
      for (var p = 1; p <= Math.min(pdf.numPages, 30); p++) ps.push(pdf.getPage(p).then(function (pg) { return pg.getTextContent(); }));
      return Promise.all(ps);
    }).then(function (tcs) {
      var filas = [];
      tcs.forEach(function (tc) { filas = filas.concat(convFilasPdf(tc.items)); });
      if (!filas.length) throw new Error("el PDF no tiene texto (parece escaneado). Pedí la versión en Excel o cargá los valores a mano.");
      return { nombre: nombre, filas: filas, texto: filas.map(function (f) { return f.join("  "); }).join("\n") };
    });
  }
  if (/\.(txt)$/i.test(nombre)) {
    return file.text().then(function (t) {
      var filas = t.split(/\r?\n/).map(function (l) { return l.split(/\t|;|\s{2,}/).map(function (x) { return x.trim(); }).filter(function (x) { return x !== ""; }); }).filter(function (f) { return f.length; });
      return { nombre: nombre, filas: filas, texto: t };
    });
  }
  if (typeof XLSX === "undefined") return Promise.reject(new Error("la librería de Excel todavía se está cargando, probá de nuevo en un segundo."));
  return file.arrayBuffer().then(function (buf) {
    var wb = XLSX.read(new Uint8Array(buf), { type: "array" }), filas = [];
    wb.SheetNames.forEach(function (sn) {
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: "" });
      rows.forEach(function (r) { if (r.some(function (x) { return x !== ""; })) filas.push(r); });
    });
    return { nombre: nombre, filas: filas, texto: filas.map(function (f) { return f.join("  "); }).join("\n") };
  });
}
// Ítems de pdf.js → filas (misma altura) → celdas (separadas por huecos).
function convFilasPdf(items) {
  var lineas = [];
  items.forEach(function (it) {
    if (!it.str || !it.str.trim()) return;
    var x = it.transform[4], y = it.transform[5], l = null;
    for (var i = 0; i < lineas.length; i++) if (Math.abs(lineas[i].y - y) < 3) { l = lineas[i]; break; }
    if (!l) { l = { y: y, its: [] }; lineas.push(l); }
    l.its.push({ x: x, w: it.width || 0, s: it.str });
  });
  lineas.sort(function (a, b) { return b.y - a.y; });
  return lineas.map(function (l) {
    l.its.sort(function (a, b) { return a.x - b.x; });
    var celdas = [], cur = "", fin = null;
    l.its.forEach(function (it) {
      if (fin != null && it.x - fin > 12) { celdas.push(cur.trim()); cur = ""; }
      cur += (cur && fin != null && it.x - fin > 1 ? " " : "") + it.s;
      fin = it.x + it.w;
    });
    if (cur.trim()) celdas.push(cur.trim());
    return celdas;
  });
}

// Números "de plata" de una celda/texto (ignora años sueltos y números chicos).
var CONV_RE_NUM = /\$?\s?\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\$?\s?\d+(?:[.,]\d{1,2})?/g;
function convMontos(celda) {
  if (typeof celda === "number") return celda >= 500 && !(Number.isInteger(celda) && celda >= 1990 && celda <= 2100) ? [celda] : [];
  var s = String(celda || "").replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, " ").replace(/\b\d+(?:[.,]\d+)?\s*%/g, " ");
  var out = [];
  (s.match(CONV_RE_NUM) || []).forEach(function (t) {
    var n = convNum(t);
    if (n != null && n >= 500 && !(/^\$?\s?\d{4}$/.test(t.trim()) && n >= 1990 && n <= 2100)) out.push(n);
  });
  return out;
}
function convMontosFila(fila) { var o = []; fila.forEach(function (c) { o = o.concat(convMontos(c)); }); return o; }

var CONV_RE_COMP = /(?:^|[^a-z0-9])(?:complejidad|complej\.?|compl\.?|comp\.?|cpj|nivel|c)\s*(?:n[º°o]\.?|#|:|-)?\s*(10|0?[1-9])(?![0-9]|[.,]\d)/i;

// Archivo → lista de ítems { osNombre, osId, vigencia, nun, art, neuro, pct, avisos }.
function convParsear(doc, idDestino) {
  var plantilla = convParsearPlantilla(doc.filas);
  if (plantilla) return plantilla;
  var r = { nun: {}, art: [null, null], neuro: [null, null, null, null], avisos: [] }, repetidas = {};
  var horizontal = convParsearHorizontal(doc.filas);
  if (horizontal) r.nun = horizontal;
  doc.filas.forEach(function (fila) {
    var txt = fila.map(function (c) { return String(c); }).join(" | "), n = convNorm(txt);
    // Artroscopía
    if (/artrosc/.test(n)) {
      var ma = convMontosFila(fila);
      if (ma.length) {
        if (/\bsin\b/.test(n) && !/\bcon\b/.test(n)) { if (r.art[0] == null) r.art[0] = ma[0]; }
        else if (/\bcon\b/.test(n) && !/\bsin\b/.test(n)) { if (r.art[1] == null) r.art[1] = ma[0]; }
        else if (ma.length >= 2 && r.art[0] == null) { r.art[0] = ma[0]; r.art[1] = ma[1]; }
        else if (r.art[0] == null) r.art[0] = ma[0];
      }
      return;
    }
    // Módulos neuro (A-D)
    var mn = /(?:neuro\w*|modulo|mod)\s*(?:nivel\s*)?\b([abcd])\b/.exec(n);
    if (mn && /neuro|modulo/.test(n)) {
      var mv = convMontosFila(fila), k = "abcd".indexOf(mn[1]);
      if (mv.length && r.neuro[k] == null) r.neuro[k] = mv[0];
      return;
    }
    if (horizontal) return;
    // Complejidad NUN (vertical: una fila por complejidad)
    var c = null, resto = fila.slice();
    for (var i = 0; i < fila.length && c == null; i++) {
      var cel = fila[i];
      if (typeof cel === "number" && i === 0 && Number.isInteger(cel) && cel >= 1 && cel <= 10) { c = cel; resto.splice(i, 1); break; }
      var s = String(cel);
      if (i === 0 && /^\s*(10|0?[1-9])\s*$/.test(s)) { c = parseInt(s, 10); resto.splice(i, 1); break; }
      var m = CONV_RE_COMP.exec(s);
      if (m) { c = parseInt(m[1], 10); resto[i] = s.replace(m[0], " "); }
    }
    if (c == null) return;
    var nums = convMontosFila(resto);
    if (!nums.length) return;
    if (r.nun[c]) { repetidas[c] = (repetidas[c] || 1) + 1; return; }
    if (nums.length >= 3) {
      var suma = nums.slice(0, -1).reduce(function (a, b) { return a + b; }, 0), ult = nums[nums.length - 1];
      if (Math.abs(suma - ult) <= Math.max(2, ult * 0.005)) nums = nums.slice(0, -1);
    }
    r.nun[c] = { cir: nums[0], ay1: nums.length > 1 ? nums[1] : null, ay2: nums.length > 2 ? nums[2] : null };
  });
  var reps = Object.keys(repetidas);
  if (reps.length) r.avisos.push("Complejidades repetidas en el archivo (" + reps.map(function (c) { return "C" + c; }).join(", ") + "): se tomó la primera aparición. Si hay varios planes, revisá cuál corresponde.");

  // Vigencia y porcentaje de aumento
  var vig = convDetectarVigencia(doc.texto);
  var pm = /(aumento|incremento|actualizaci[oó]n|ajuste)[^%\n]{0,80}?(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i.exec(doc.texto);
  var pct = pm ? convNum(pm[2]) : null;

  // Armar el ítem
  var it = { osNombre: "", osId: null, vigencia: vig || "", nun: null, art: null, neuro: null, avisos: r.avisos, aplicar: true };
  var cs = Object.keys(r.nun);
  var destino = idDestino ? convPorId(idDestino) : convDetectarOs(doc.nombre + "\n" + doc.texto.slice(0, 4000));
  if (destino) { it.osId = destino.id; it.osNombre = destino.os; }
  else it.osNombre = convNombreDesdeArchivo(doc.nombre);
  if (cs.length) {
    it.nun = {};
    var calc = false;
    for (var k = 1; k <= 10; k++) {
      var v = r.nun[k];
      if (!v) { it.nun[k] = [null, null, null, null]; continue; }
      var ay = convAyudantes(k, v.cir);
      if ((k >= 2 && v.ay1 == null) || (k >= 5 && v.ay2 == null)) calc = true;
      it.nun[k] = convFila(k, v.cir, v.ay1 != null ? v.ay1 : ay[0], v.ay2 != null ? v.ay2 : ay[1]);
    }
    if (calc) it.avisos.push("El archivo no traía los ayudantes de todas las complejidades: se calcularon al 20% del cirujano (C2-C4 un ayudante, C5+ dos).");
    if (cs.length < 10) it.avisos.push("Faltan complejidades: " + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(function (k) { return !r.nun[k]; }).map(function (k) { return "C" + k; }).join(", ") + ". " + (destino && destino.nun ? "Se mantienen los valores actuales de esas complejidades." : "Completalas a mano o quedan vacías."));
  }
  if (r.art[0] != null || r.art[1] != null) it.art = r.art;
  if (r.neuro.some(function (x) { return x != null; })) it.neuro = r.neuro;
  if (!it.nun && !it.art && !it.neuro) {
    if (pct == null) return [];
    // Solo vino un porcentaje: se aplica sobre los valores actuales.
    if (!destino) { it.avisos.push("El archivo informa un aumento del " + pct + "% pero no se reconoció la obra social: elegila arriba."); it.pctPendiente = pct; return [it]; }
    convAplicarPct(it, destino, pct);
    it.avisos.push("El archivo informa un aumento del " + String(pct).replace(".", ",") + "%: se aplicó sobre los valores actuales de " + destino.os + ".");
  } else if (pct != null) {
    it.avisos.push("El archivo menciona un " + String(pct).replace(".", ",") + "% de aumento: comparalo con la variación que muestra la tabla.");
  }
  if (!vig) it.avisos.push("No se encontró la fecha de vigencia en el archivo: completala.");
  if (!destino) it.avisos.push("No se reconoció la obra social: revisá el nombre (si no existe, se crea un convenio nuevo).");
  return [it];
}
function convAplicarPct(it, o, pct) {
  var f = 1 + pct / 100;
  if (o.nun) { it.nun = {}; for (var k = 1; k <= 10; k++) { var x = o.nun[String(k)] || []; it.nun[k] = x[0] == null ? [null, null, null, null] : convFila(k, x[0] * f, x[1] == null ? null : x[1] * f, x[2] == null ? null : x[2] * f); } }
  if (o.art) it.art = o.art.map(function (x) { return x == null ? null : convRed(x * f); });
  if (o.neuro) it.neuro = o.neuro.map(function (x) { return x == null ? null : convRed(x * f); });
}
// Tabla horizontal: una fila con 1..10 (o C1..C10) como encabezado y los
// valores debajo (cirujano, ayudantes…).
function convParsearHorizontal(filas) {
  for (var i = 0; i < filas.length; i++) {
    var cols = {};
    filas[i].forEach(function (c, j) { var m = /^\s*(?:c|comp\.?|complejidad)?\s*(10|[1-9])\s*$/i.exec(String(c)); if (m) cols[j] = +m[1]; });
    var js = Object.keys(cols);
    if (js.length < 8) continue;
    var nun = {}, roles = 0;
    for (var r = i + 1; r < Math.min(filas.length, i + 6) && roles < 3; r++) {
      var f = filas[r], lbl = convNorm(f.slice(0, Math.min.apply(null, js.map(Number))).join(" "));
      if (/total/.test(lbl)) continue;
      var rol = /(2|segundo)\s*(°|º|o)?\s*ayud|ayud\w*\s*2/.test(lbl) ? 2 : /ayud/.test(lbl) ? 1 : (roles === 0 ? 0 : null);
      if (rol == null) continue;
      var alguno = false;
      js.forEach(function (j) { var v = convMontos(f[j])[0]; if (v != null) { alguno = true; nun[cols[j]] = nun[cols[j]] || {}; nun[cols[j]][["cir", "ay1", "ay2"][rol]] = v; } });
      if (alguno) roles++;
    }
    var ok = Object.keys(nun).filter(function (c) { return nun[c].cir != null; });
    if (ok.length >= 5) { ok.forEach(function (c) { nun[c].ay1 = nun[c].ay1 != null ? nun[c].ay1 : null; nun[c].ay2 = nun[c].ay2 != null ? nun[c].ay2 : null; }); return nun; }
  }
  return null;
}
// Planilla modelo / Excel exportado: columnas Obra social | Vigencia | Concepto | Cirujano | 1° Ayudante | 2° Ayudante.
function convParsearPlantilla(filas) {
  var h = -1, col = {};
  for (var i = 0; i < Math.min(filas.length, 10) && h < 0; i++) {
    var n = filas[i].map(convNorm);
    if (n.indexOf("obra social") !== -1 && n.indexOf("concepto") !== -1) {
      h = i;
      n.forEach(function (x, j) {
        if (x === "obra social") col.os = j; else if (x === "vigencia") col.vig = j; else if (x === "concepto") col.con = j;
        else if (/^cirujano|^valor/.test(x)) col.cir = j; else if (/1.*ayud/.test(x)) col.ay1 = j; else if (/2.*ayud/.test(x)) col.ay2 = j;
      });
    }
  }
  if (h < 0 || col.cir == null) return null;
  var porOs = {}, orden = [];
  var fin = false;
  filas.slice(h + 1).forEach(function (f) {
    if (fin) return;
    if (convNorm(f[col.os]) === "obra social") { fin = true; return; } // otra hoja (ej. "Resumen")
    var os = String(f[col.os] || "").trim(), con = convNorm(f[col.con]), cir = convNum(f[col.cir]);
    if (!os || cir == null || !/^(c\s*\d|complejidad|artrosc|neuro)/.test(con)) return;
    var it = porOs[convNorm(os)];
    if (!it) { it = porOs[convNorm(os)] = { osNombre: os, vigencia: "", nun: null, art: null, neuro: null, avisos: [], aplicar: true, _calc: false }; orden.push(it); }
    if (col.vig != null && f[col.vig] !== "" && !it.vigencia) it.vigencia = convVigTexto(f[col.vig]);
    var m;
    if ((m = /^c\s*(10|[1-9])$|^complejidad\s*(10|[1-9])$/.exec(con))) {
      var c = +(m[1] || m[2]), ay = convAyudantes(c, cir);
      var a1 = col.ay1 != null ? convNum(f[col.ay1]) : null, a2 = col.ay2 != null ? convNum(f[col.ay2]) : null;
      if (a1 == null && c >= 2 || a2 == null && c >= 5) it._calc = true;
      it.nun = it.nun || {};
      it.nun[c] = convFila(c, cir, a1 != null ? a1 : ay[0], a2 != null ? a2 : ay[1]);
    } else if (/artrosc/.test(con)) {
      it.art = it.art || [null, null];
      it.art[/\bcon\b/.test(con) ? 1 : 0] = cir;
    } else if ((m = /neuro\w*\s*([abcd])$/.exec(con))) {
      it.neuro = it.neuro || [null, null, null, null];
      it.neuro["abcd".indexOf(m[1])] = cir;
    }
  });
  orden = orden.filter(function (it) { return it.nun || it.art || it.neuro; });
  if (!orden.length) return null;
  orden.forEach(function (it) {
    var o = convBuscarOs(it.osNombre);
    if (o) { it.osId = o.id; it.osNombre = o.os; } else it.avisos.push("Obra social nueva: se va a crear el convenio.");
    if (it.nun) for (var k = 1; k <= 10; k++) if (!it.nun[k]) it.nun[k] = [null, null, null, null];
    if (it._calc) it.avisos.push("Ayudantes vacíos: se calcularon al 20% del cirujano.");
    if (!it.vigencia) it.avisos.push("Sin vigencia: completala.");
    delete it._calc;
  });
  return orden;
}
function convVigTexto(v) {
  if (typeof v === "number" && v > 30000 && v < 60000) { var d = new Date(Math.round((v - 25569) * 86400000)); return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0") + "/" + d.getUTCFullYear(); }
  return String(v).trim();
}
function convDetectarVigencia(t) {
  var m = /(?:vigencia|vigente|a partir del?|desde el?|valores? al|aplicables? (?:desde|a partir))[^\d\n]{0,25}(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i.exec(t);
  if (m) return m[1].replace(/[\-.]/g, "/");
  m = /(?:vigencia|vigente|a partir de|desde|per[ií]odo|mes de)[^\n]{0,20}?\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b\D{0,6}(\d{4})/i.exec(t);
  if (m) { var k = CONV_MES_ABR[convNorm(m[1]).slice(0, 3)]; return "01/" + String(k + 1).padStart(2, "0") + "/" + m[2]; }
  return "";
}
// Obra social mencionada en el nombre del archivo o en el texto: gana la
// coincidencia más larga (así "Prevencion Art" le gana a "Prevencion").
function convDetectarOs(texto) {
  var t = " " + convNorm(texto) + " ", mejor = null;
  CONV.os.forEach(function (o) {
    var n = convNorm(o.os.replace(/\(.*?\)/g, ""));
    if (n.length < 3) return;
    if (t.indexOf(" " + n + " ") !== -1 && (!mejor || n.length > convNorm(mejor.os.replace(/\(.*?\)/g, "")).length)) mejor = o;
  });
  return mejor;
}
function convNombreDesdeArchivo(nombre) {
  var s = nombre.replace(/\.[a-z0-9]+$/i, "").replace(/[_\-]+/g, " ").replace(/\b(valores?|aranceles?|convenio|honorarios|nun|20\d\d|\d{1,2})\b/gi, " ").replace(/\s+/g, " ").trim();
  return s ? s.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : "";
}

// ══════ EDITOR / VISTA PREVIA ═══════════════════════════════════════════
function convNuevo() {
  convEd = { modo: "nuevo", items: [{ osNombre: "", osId: null, vigencia: "", nun: convNunVacio(), art: null, neuro: null, avisos: [], aplicar: true, archivo: "manual" }], errores: [] };
  convVista = "editor"; convRepintar();
}
function convNunVacio() { var n = {}; for (var k = 1; k <= 10; k++) n[k] = [null, null, null, null]; return n; }
function convEditar(id) {
  var o = convPorId(id); if (!o) return;
  convEd = { modo: "editar", items: [{ osNombre: o.os, osId: o.id, vigencia: o.vigencia, nun: o.nun ? convClonar(o.nun) : null, art: o.art ? o.art.slice() : null, neuro: o.neuro ? o.neuro.slice() : null, avisos: [], aplicar: true, archivo: "manual" }], errores: [] };
  convVista = "editor"; convRepintar();
}
function convAumento(id) {
  var o = convPorId(id); if (!o) return;
  var r = prompt("Porcentaje de aumento a aplicar sobre todos los valores de " + o.os + " (ej: 4,5):");
  if (r == null) return;
  var pct = convNum(r);
  if (pct == null || pct <= -100) { alert("Porcentaje inválido."); return; }
  var it = { osNombre: o.os, osId: o.id, vigencia: "", nun: null, art: null, neuro: null, avisos: ["Aumento del " + String(pct).replace(".", ",") + "% sobre los valores actuales. Completá la nueva vigencia."], aplicar: true, archivo: "aumento " + String(pct).replace(".", ",") + "%" };
  convAplicarPct(it, o, pct);
  convEd = { modo: "editar", items: [it], errores: [] };
  convVista = "editor"; convRepintar();
}

function convHtmlEditor() {
  var tit = convEd.modo === "importar" ? "Vista previa de la importación" : convEd.modo === "nuevo" ? "Nuevo convenio" : "Editar valores";
  var h = '<div class="conv-det-hd"><button class="deb-btn" onclick="convCancelarEditor()">← Cancelar</button><div class="conv-det-tit" style="flex:1">' + tit + "</div></div>";
  if (convEd.modo === "importar") h += '<div class="conv-pie" style="margin:0 0 10px">Revisá lo que se leyó de cada archivo. Podés corregir cualquier valor antes de guardar. Nada se guarda hasta tocar <b>Guardar</b>; la versión actual de cada obra social queda en su historial.</div>';
  if (convEd.errores && convEd.errores.length) h += '<div class="conv-aviso conv-aviso-error">' + convEd.errores.join("<br>") + "</div>";
  h += '<datalist id="convOsList">' + CONV.os.map(function (o) { return '<option value="' + convEsc(o.os) + '">'; }).join("") + "</datalist>";
  h += convEd.items.map(convHtmlItem).join("");
  var n = convEd.items.filter(function (it) { return it.aplicar; }).length;
  h += '<div class="conv-acciones"><button class="deb-btn" onclick="convCancelarEditor()">Cancelar</button>'
    + '<button class="deb-btn deb-btn-pri" id="convBtnGuardar" onclick="convGuardarEditor()">Guardar ' + n + " convenio" + (n === 1 ? "" : "s") + "</button></div>";
  return h;
}
function convCancelarEditor() {
  var volver = convEd && convEd.items.length === 1 && convEd.items[0].osId && convEd.modo !== "nuevo" ? convEd.items[0].osId : null;
  convEd = null;
  if (volver) convIr("detalle", volver); else convIr("lista");
}
function convHtmlItem(it, i) {
  var o = it.osId ? convPorId(it.osId) : null;
  var h = '<div class="conv-card' + (it.aplicar ? "" : " conv-off") + '" id="convItem' + i + '">'
    + '<div class="conv-card-hd">'
    + (convEd.items.length > 1 ? '<label class="conv-dim" style="font-size:.74rem"><input type="checkbox"' + (it.aplicar ? " checked" : "") + ' onchange="convEd.items[' + i + '].aplicar=this.checked;convRepintar()"> guardar</label>' : "")
    + '<input class="conv-input conv-in-os" list="convOsList" placeholder="Obra social" value="' + convEsc(it.osNombre) + '" onchange="convEdOs(' + i + ',this.value)"' + (convEd.modo === "editar" ? " disabled" : "") + ">"
    + '<span class="conv-tag ' + (o ? "conv-tag-ok" : "conv-tag-warn") + '">' + (o ? "actualiza existente" : "convenio nuevo") + "</span>"
    + '<label class="conv-dim" style="font-size:.74rem">Vigencia <input class="conv-input" style="width:110px" placeholder="dd/mm/aaaa" value="' + convEsc(it.vigencia) + '" oninput="convEd.items[' + i + '].vigencia=this.value"></label>'
    + (it.archivo && it.archivo !== "manual" ? '<span class="conv-dim" style="font-size:.7rem">📄 ' + convEsc(it.archivo) + "</span>" : "")
    + "</div>";
  if (it.avisos.length) h += '<div class="conv-aviso conv-aviso-warn">' + it.avisos.map(function (a) { return "• " + convEsc(a); }).join("<br>") + "</div>";
  if (it.pctPendiente != null) h += '<div style="margin:6px 0"><button class="deb-btn" onclick="convEdAplicarPct(' + i + ')">Aplicar ' + String(it.pctPendiente).replace(".", ",") + "% a la obra social elegida</button></div>";
  // Tabla NUN
  if (it.nun) {
    h += '<div class="conv-sub">Honorarios NUN <button class="conv-mini" onclick="convEdAyudantes(' + i + ')" title="Recalcula 1° y 2° ayudante al 20% del cirujano">ayudantes al 20%</button> <button class="conv-mini" onclick="convEd.items[' + i + '].nun=null;convRepintar()">quitar tabla</button></div>'
      + '<div class="adm-table-wrap"><table class="adm-table conv-ed"><thead><tr><th>C</th><th>Cirujano actual</th><th>Cirujano</th><th>1° Ayudante</th><th>2° Ayudante</th><th>Total</th><th>vs actual</th></tr></thead><tbody>';
    for (var c = 1; c <= 10; c++) {
      var f = it.nun[c] || [null, null, null, null], act = o ? convCir(o, c) : null;
      h += "<tr><td>C" + c + '</td><td class="conv-dim">' + convFmt(act) + "</td>"
        + [0, 1, 2].map(function (k) { return '<td><input class="conv-input conv-num" value="' + convFmtIn(f[k]) + '" oninput="convEdNun(' + i + "," + c + "," + k + ',this.value)"></td>'; }).join("")
        + '<td id="convTot' + i + "_" + c + '"><b>' + convFmt(f[3]) + '</b></td><td id="convVar' + i + "_" + c + '">' + convHtmlVar(act, f[0]) + "</td></tr>";
    }
    h += "</tbody></table></div>";
  } else h += '<div style="margin:8px 0"><button class="conv-mini" onclick="convEd.items[' + i + '].nun=convNunVacio();convRepintar()">＋ agregar tabla NUN 1-10</button></div>';
  // Artroscopía y neuro
  h += '<div class="conv-grid">';
  h += '<div class="conv-box"><div class="conv-sub" style="margin-top:0">Artroscopía ' + (it.art ? '<button class="conv-mini" onclick="convEd.items[' + i + '].art=null;convRepintar()">quitar</button>' : '<button class="conv-mini" onclick="convEd.items[' + i + '].art=[null,null];convRepintar()">＋ agregar</button>') + "</div>"
    + (it.art ? ["Sin material", "Con material"].map(function (l, k) { var act = o && o.art ? o.art[k] : null; return '<div class="conv-kv"><span>' + l + '</span><input class="conv-input conv-num" value="' + convFmtIn(it.art[k]) + '" oninput="convEdLista(' + i + ",'art'," + k + ',this.value)"></div><div class="conv-kv conv-dim" style="font-size:.68rem"><span>actual ' + convFmt(act) + '</span><span id="convVar' + i + "_art" + k + '">' + convHtmlVar(act, it.art[k]) + "</span></div>"; }).join("") : "")
    + "</div>";
  h += '<div class="conv-box"><div class="conv-sub" style="margin-top:0">Módulos neuro ' + (it.neuro ? '<button class="conv-mini" onclick="convEd.items[' + i + '].neuro=null;convRepintar()">quitar</button>' : '<button class="conv-mini" onclick="convEd.items[' + i + '].neuro=[null,null,null,null];convRepintar()">＋ agregar</button>') + "</div>"
    + (it.neuro ? CONV_NEURO.map(function (L, k) { var act = o && o.neuro ? o.neuro[k] : null; return '<div class="conv-kv"><span>Módulo ' + L + '</span><input class="conv-input conv-num" value="' + convFmtIn(it.neuro[k]) + '" oninput="convEdLista(' + i + ",'neuro'," + k + ',this.value)"></div><div class="conv-kv conv-dim" style="font-size:.68rem"><span>actual ' + convFmt(act) + '</span><span id="convVar' + i + "_neuro" + k + '">' + convHtmlVar(act, it.neuro[k]) + "</span></div>"; }).join("") : "")
    + "</div></div>";
  if (o && convEd.modo === "importar") h += '<div class="conv-pie" style="margin:6px 0 0">Lo que no venga en el archivo (por ejemplo artroscopía, si solo mandaron la tabla NUN) se mantiene como está.</div>';
  return h + "</div>";
}
// Variación vs actual, marcando saltos raros (más de +40% o baja de más de 20%).
function convHtmlVar(act, nuevo) {
  var p = convPct(act, nuevo);
  if (p == null) return '<span class="conv-dim">—</span>';
  var raro = p > 40 || p < -20;
  return (raro ? '<span title="Variación fuera de lo habitual: revisá que el valor esté bien leído">⚠ </span>' : "") + convPctHtml(p);
}
function convEdOs(i, v) {
  var it = convEd.items[i], o = convBuscarOs(v);
  it.osNombre = o ? o.os : v.trim();
  it.osId = o ? o.id : null;
  convRepintar();
}
function convEdAplicarPct(i) {
  var it = convEd.items[i], o = it.osId && convPorId(it.osId);
  if (!o) { alert("Primero elegí una obra social existente."); return; }
  convAplicarPct(it, o, it.pctPendiente);
  it.avisos.push("Se aplicó el " + String(it.pctPendiente).replace(".", ",") + "% sobre los valores actuales.");
  delete it.pctPendiente;
  convRepintar();
}
function convEdNun(i, c, k, v) {
  var it = convEd.items[i], f = it.nun[c] || [null, null, null, null];
  f[k] = convNum(v);
  f = f[0] == null ? [null, f[1], f[2], null] : convFila(c, f[0], f[1], f[2]);
  it.nun[c] = f;
  var o = it.osId ? convPorId(it.osId) : null;
  var t = document.getElementById("convTot" + i + "_" + c); if (t) t.innerHTML = "<b>" + convFmt(f[3]) + "</b>";
  var p = document.getElementById("convVar" + i + "_" + c); if (p) p.innerHTML = convHtmlVar(o ? convCir(o, c) : null, f[0]);
}
function convEdLista(i, campo, k, v) {
  var it = convEd.items[i]; it[campo][k] = convNum(v);
  var o = it.osId ? convPorId(it.osId) : null;
  var p = document.getElementById("convVar" + i + "_" + campo + k);
  if (p) p.innerHTML = convHtmlVar(o && o[campo] ? o[campo][k] : null, it[campo][k]);
}
function convEdAyudantes(i) {
  var it = convEd.items[i];
  for (var c = 1; c <= 10; c++) { var f = it.nun[c]; if (f && f[0] != null) { var ay = convAyudantes(c, f[0]); it.nun[c] = convFila(c, f[0], ay[0], ay[1]); } }
  convRepintar();
}
function convGuardarEditor() {
  var sel = convEd.items.filter(function (it) { return it.aplicar; });
  if (!sel.length) { alert("No hay nada marcado para guardar."); return; }
  for (var j = 0; j < sel.length; j++) {
    if (!sel[j].osNombre) { alert("Falta el nombre de la obra social en uno de los convenios."); return; }
    if (sel[j].pctPendiente != null) { alert(sel[j].osNombre + ": falta aplicar el porcentaje de aumento."); return; }
  }
  var hoy = new Date().toISOString().slice(0, 10), periodo = convHoyPeriodo(), porArchivo = {}, nombres = [];
  sel.forEach(function (it) {
    var nun = it.nun && Object.keys(it.nun).some(function (c) { return it.nun[c] && it.nun[c][0] != null; }) ? convLimpiarNun(it.nun) : null;
    var art = it.art && it.art.some(function (x) { return x != null; }) ? it.art : null;
    var neuro = it.neuro && it.neuro.some(function (x) { return x != null; }) ? it.neuro : null;
    var o = it.osId ? convPorId(it.osId) : convBuscarOs(it.osNombre);
    var fuente = it.archivo || "manual";
    if (!o) {
      o = { id: convId(it.osNombre), os: it.osNombre, periodo: periodo, vigencia: it.vigencia, nota: "", nun: nun, art: art, neuro: neuro, fuente: fuente, historial: [] };
      while (convPorId(o.id)) o.id += "-2";
      CONV.os.push(o);
    } else {
      var editar = convEd.modo === "editar";
      var nuevoNun = editar ? nun : convFusionarNun(o.nun, nun);
      var nuevoArt = editar ? art : convFusionarLista(o.art, art);
      var nuevoNeuro = editar ? neuro : convFusionarLista(o.neuro, neuro);
      var vig = it.vigencia || o.vigencia;
      if (vig === o.vigencia && convIgual(nuevoNun, o.nun) && convIgual(nuevoArt, o.art) && convIgual(nuevoNeuro, o.neuro)) return;
      o.historial.unshift(convSnapshot(o));
      if (o.historial.length > 36) o.historial.length = 36;
      o.nun = nuevoNun; o.art = nuevoArt; o.neuro = nuevoNeuro; o.vigencia = vig; o.periodo = periodo; o.fuente = fuente;
    }
    nombres.push(o.os);
    if (it.archivo && it.archivo !== "manual" && !/^aumento/.test(it.archivo)) {
      var a = porArchivo[it.archivo] || (porArchivo[it.archivo] = { fecha: hoy, nombre: it.archivo, tam: it.tam || 0, os: [] });
      a.os.push(o.os);
    }
  });
  Object.keys(porArchivo).forEach(function (k) { CONV.archivos.unshift(porArchivo[k]); });
  if (CONV.archivos.length > 200) CONV.archivos.length = 200;
  convGuardar();
  var unico = sel.length === 1 && nombres.length === 1 ? convBuscarOs(nombres[0]) : null;
  convEd = null;
  if (unico) convIr("detalle", unico.id); else convIr("lista");
  convAviso(nombres.length ? "✔ Guardado: " + convEsc(nombres.join(", ")) + "." : "No había cambios respecto de los valores actuales.", "ok");
}
// Al importar, lo que el archivo no trae (una complejidad, el módulo neuro B…)
// conserva el valor actual en vez de quedar vacío.
function convFusionarLista(act, nuevo) {
  if (!nuevo) return act;
  if (!act) return nuevo;
  return nuevo.map(function (x, i) { return x != null ? x : act[i]; });
}
function convFusionarNun(act, nuevo) {
  if (!nuevo) return act;
  if (!act) return nuevo;
  var out = {};
  for (var c = 1; c <= 10; c++) { var k = String(c); out[k] = nuevo[k] && nuevo[k][0] != null ? nuevo[k] : act[k]; }
  return out;
}
// Igualdad tolerante: hasta $1 de redondeo (algunos totales de origen no daban la suma exacta) y null ≈ 0 no cuentan como cambio.
function convIgual(a, b) {
  if (a == null && b == null) return true;
  if (typeof a === "number" || typeof b === "number" || a == null || b == null) {
    if ((a == null || typeof a === "number") && (b == null || typeof b === "number")) return Math.abs((a || 0) - (b || 0)) <= 1;
    return false;
  }
  var ks = Object.keys(a).concat(Object.keys(b));
  for (var i = 0; i < ks.length; i++) if (!convIgual(a[ks[i]], b[ks[i]])) return false;
  return true;
}
function convLimpiarNun(nun) {
  var out = {};
  for (var c = 1; c <= 10; c++) { var f = nun[c] || nun[String(c)] || [null, null, null, null]; out[String(c)] = f[0] == null ? [null, null, null, null] : convFila(c, f[0], f[1], f[2]); }
  return out;
}

// ── Excel: exportación y planilla modelo (mismo formato, se reimporta) ─────
var CONV_XLS_HDR = ["Obra social", "Vigencia", "Concepto", "Cirujano / valor", "1° Ayudante", "2° Ayudante", "Total"];
function convFilasXls(o) {
  var f = [];
  if (o.nun) for (var c = 1; c <= 10; c++) { var x = o.nun[String(c)]; if (x && x[0] != null) f.push([o.os, o.vigencia || "", "C" + c, x[0], x[1], x[2], x[3]]); }
  if (o.art) { if (o.art[0] != null) f.push([o.os, o.vigencia || "", "Artroscopía sin material", o.art[0], "", "", ""]); if (o.art[1] != null) f.push([o.os, o.vigencia || "", "Artroscopía con material", o.art[1], "", "", ""]); }
  if (o.neuro) CONV_NEURO.forEach(function (L, k) { if (o.neuro[k] != null) f.push([o.os, o.vigencia || "", "Neuro " + L, o.neuro[k], "", "", ""]); });
  return f;
}
function convExportarExcel() {
  if (typeof XLSX === "undefined") { alert("La librería de Excel aún se está cargando."); return; }
  var aoa = [CONV_XLS_HDR];
  CONV.os.slice().sort(function (a, b) { return a.os.localeCompare(b.os, "es"); }).forEach(function (o) { aoa = aoa.concat(convFilasXls(o)); });
  var res = [["Obra social", "Vigencia", "Cargado", "C1", "C5", "C10", "Artrosc. s/m", "Artrosc. c/m", "Neuro A", "Alertas"]];
  CONV.os.forEach(function (o) { res.push([o.os, o.vigencia || "", convPeriodoTxt(o.periodo), convCir(o, 1), convCir(o, 5), convCir(o, 10), o.art && o.art[0], o.art && o.art[1], o.neuro && o.neuro[0], convAlertas(o).join(" / ")]); });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Valores");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(res), "Resumen");
  XLSX.writeFile(wb, "Convenios_CEOT_" + convHoyPeriodo() + ".xlsx");
}
function convPlanillaModelo() {
  if (typeof XLSX === "undefined") { alert("La librería de Excel aún se está cargando."); return; }
  var aoa = [CONV_XLS_HDR];
  for (var c = 1; c <= 10; c++) aoa.push(["NOMBRE OBRA SOCIAL", "01/12/2026", "C" + c, "", "", "", ""]);
  aoa.push(["NOMBRE OBRA SOCIAL", "01/12/2026", "Artroscopía sin material", "", "", "", ""], ["NOMBRE OBRA SOCIAL", "01/12/2026", "Artroscopía con material", "", "", "", ""]);
  CONV_NEURO.forEach(function (L) { aoa.push(["NOMBRE OBRA SOCIAL", "01/12/2026", "Neuro " + L, "", "", "", ""]); });
  var ayuda = [["Cómo usar esta planilla"], ["Una fila por concepto. Se pueden cargar varias obras sociales en la misma hoja (repetí el nombre en cada fila)."],
    ["Si los ayudantes quedan vacíos se calculan al 20% del cirujano (C2-C4 un ayudante, C5 en adelante dos)."],
    ["Las filas sin valor se ignoran. Lo que no se cargue (ej. artroscopía) se mantiene como está."],
    ["Después: Convenios → ⬆ Importar archivos → elegir esta planilla → revisar la vista previa → Guardar."]];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Valores");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ayuda), "Ayuda");
  XLSX.writeFile(wb, "Planilla_convenio_CEOT.xlsx");
}

// ══════ PORTAL PROFESIONAL (solo lectura) ═══════════════════════════════
// Pestaña "Convenios" del portal: los mismos valores que carga el admin
// (ceot_convenios, o la semilla si todavía no se guardó nada). Sin notas
// internas ni alertas de carga: solo valores y vigencia.
var portalConvBusca = "", portalConvAbierto = null;
function portalConveniosRender() {
  var root = document.getElementById("portalConv");
  if (!root) return;
  convInyectarEstilos();
  convCargar();
  root.innerHTML = '<input class="conv-input" style="width:100%;box-sizing:border-box;margin-bottom:8px" placeholder="Buscar obra social…" value="' + convEsc(portalConvBusca) + '" oninput="portalConvBusca=this.value;portalConvPintar()">'
    + '<div id="portalConvLista"></div>'
    + '<div class="conv-pie">Valores en pesos, sin centavos en la tabla. Honorarios por complejidad NUN (cirujano, ayudantes y total del equipo), artroscopía y módulos neuro. Los carga la administración; ante dudas, consultá antes de facturar.</div>';
  portalConvPintar();
}
function portalConvPintar() {
  var el = document.getElementById("portalConvLista");
  if (!el) return;
  var q = convNorm(portalConvBusca);
  var lista = CONV.os.filter(function (o) { return (o.nun || o.art || o.neuro) && (!q || convNorm(o.os).indexOf(q) !== -1); })
    .sort(function (a, b) { return a.os.localeCompare(b.os, "es"); });
  if (!lista.length) { el.innerHTML = '<div class="conv-vacio">Ninguna obra social coincide.</div>'; return; }
  el.innerHTML = lista.map(function (o) {
    var abierto = portalConvAbierto === o.id;
    var tipos = [o.nun ? "NUN" : "", o.art ? "Artroscopía" : "", o.neuro ? "Neuro" : ""].filter(Boolean).join(" · ");
    var h = '<div class="conv-pcard' + (abierto ? " on" : "") + '">'
      + '<div class="conv-phd" onclick="portalConvAbierto=portalConvAbierto===\'' + convEsc(o.id) + '\'?null:\'' + convEsc(o.id) + '\';portalConvPintar()">'
      + '<div style="flex:1;min-width:0"><div class="conv-pnom">' + convEsc(o.os) + '</div><div class="conv-dim" style="font-size:.66rem">' + tipos + "</div></div>"
      + convVigHtml(o.vigencia) + '<span class="conv-dim" style="font-size:.8rem">' + (abierto ? "▴" : "▾") + "</span></div>";
    if (abierto) {
      if (o.nun) {
        h += '<div class="adm-table-wrap" style="margin-top:8px"><table class="adm-table conv-ptabla"><thead><tr><th>C</th><th>Cirujano</th><th>1° Ay.</th><th>2° Ay.</th><th>Total</th></tr></thead><tbody>';
        var k0 = function (n) { return n == null ? "—" : Math.round(n).toLocaleString("es-AR"); };
        for (var c = 1; c <= 10; c++) { var f = o.nun[String(c)] || []; h += "<tr><td>C" + c + "</td><td>" + k0(f[0]) + "</td><td>" + k0(f[1]) + "</td><td>" + k0(f[2]) + "</td><td><b>" + k0(f[3]) + "</b></td></tr>"; }
        h += "</tbody></table></div>";
      }
      if (o.art) h += '<div class="conv-sub">Artroscopía</div><div class="conv-kv"><span>Sin material</span><b>' + convFmt(o.art[0]) + '</b></div><div class="conv-kv"><span>Con material</span><b>' + convFmt(o.art[1]) + "</b></div>";
      if (o.neuro) h += '<div class="conv-sub">Módulos neuro</div>' + CONV_NEURO.map(function (L, i) { return o.neuro[i] == null ? "" : '<div class="conv-kv"><span>Módulo ' + L + "</span><b>" + convFmt(o.neuro[i]) + "</b></div>"; }).join("");
      h += '<div class="conv-dim" style="font-size:.64rem;margin-top:6px">Actualizado ' + convPeriodoTxt(o.periodo) + "</div>";
    }
    return h + "</div>";
  }).join("");
}

// ── Estilos del módulo (usan los tokens --co-* del tema claro/oscuro) ─────
function convInyectarEstilos() {
  if (document.getElementById("convStyles")) return;
  var st = document.createElement("style");
  st.id = "convStyles";
  st.textContent = [
    "#convRoot .conv-dim{color:var(--co-ink-dim)}",
    "#convRoot .conv-up{color:#16a34a;font-weight:700}",
    "#convRoot .conv-dn{color:var(--co-neg);font-weight:700}",
    "#convRoot .conv-input{font:inherit;font-size:.78rem;padding:6px 9px;border:1px solid var(--co-line);border-radius:7px;background:var(--co-card);color:var(--co-ink)}",
    "#convRoot .conv-input:disabled{opacity:.7}",
    "#convRoot .conv-num{width:110px;text-align:right;font-family:var(--font-num)}",
    "#convRoot .conv-in-os{min-width:200px;flex:1;font-weight:700}",
    "#convRoot .conv-chip{cursor:pointer;font-size:.72rem;padding:5px 12px;border-radius:20px;font-weight:700;border:1px solid var(--co-line);color:var(--co-ink-dim);white-space:nowrap}",
    "#convRoot .conv-chip.on{background:#1f3a2e;border-color:#1f3a2e;color:#fff}",
    "#convRoot .conv-click{cursor:pointer}",
    "#convRoot .conv-tabla tbody tr:hover td{background:var(--co-accent-soft)}",
    "#convRoot .adm-table td{font-family:var(--font-num);white-space:nowrap}",
    "#convRoot .adm-table td:first-child{font-family:inherit;white-space:normal}",
    "#convRoot .conv-tag{display:inline-block;font-size:.68rem;padding:2px 8px;border-radius:10px;font-weight:700;font-family:inherit}",
    "#convRoot .conv-tag-ok{background:var(--co-accent-soft);color:#1f7a3e}",
    "#convRoot .conv-tag-warn{background:var(--co-warn-soft);color:var(--co-warn)}",
    "#convRoot .conv-tag-neg{background:var(--co-neg-soft);color:var(--co-neg)}",
    "#convRoot .conv-al{color:var(--co-warn);cursor:help}",
    "#convRoot .conv-resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}",
    "#convRoot .conv-resumen>div{background:var(--co-card);border:1px solid var(--co-line);border-radius:9px;padding:10px 12px}",
    "#convRoot .conv-resumen b{display:block;font-size:1.3rem;font-family:var(--font-num);color:var(--co-ink)}",
    "#convRoot .conv-resumen span{font-size:.7rem;color:var(--co-ink-dim)}",
    "#convRoot .conv-resumen .conv-warn b{color:var(--co-warn)}",
    "#convRoot .conv-pie{font-size:.72rem;color:var(--co-ink-dim);margin-top:8px;line-height:1.5}",
    "#convRoot .conv-aviso{font-size:.76rem;padding:8px 11px;border-radius:8px;margin:8px 0;line-height:1.55;background:var(--co-accent-soft);color:var(--co-ink)}",
    "#convRoot .conv-aviso-warn{background:var(--co-warn-soft);color:var(--co-warn)}",
    "#convRoot .conv-aviso-error{background:var(--co-neg-soft);color:var(--co-neg)}",
    "#convRoot .conv-aviso-ok{background:var(--co-accent-soft);color:#1f7a3e}",
    "#convRoot .conv-det-hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 12px}",
    "#convRoot .conv-det-tit{font-family:var(--font-display);font-size:1.25rem;font-weight:700;color:var(--co-ink)}",
    "#convRoot .conv-sub{font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--co-ink-dim);margin:16px 0 6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}",
    "#convRoot .conv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:12px}",
    "#convRoot .conv-box,#convRoot .conv-card{background:var(--co-card);border:1px solid var(--co-line);border-radius:10px;padding:12px}",
    "#convRoot .conv-card{margin-bottom:14px}",
    "#convRoot .conv-card.conv-off{opacity:.5}",
    "#convRoot .conv-card-hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
    "#convRoot .conv-kv{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0;font-size:.8rem;color:var(--co-ink)}",
    "#convRoot .conv-kv b{font-family:var(--font-num)}",
    "#convRoot .conv-mini{font:inherit;font-size:.66rem;font-weight:700;padding:2px 8px;border-radius:6px;border:1px solid var(--co-line);background:transparent;color:var(--co-ink-dim);cursor:pointer;text-transform:none;letter-spacing:0}",
    "#convRoot .conv-vacio{padding:24px;text-align:center;color:var(--co-ink-dim);font-size:.82rem;line-height:1.6}",
    "#convRoot .conv-acciones{display:flex;gap:8px;justify-content:flex-end;padding:10px 0}",
    "#convRoot .conv-ed input.conv-num{width:120px;padding:4px 6px}"
    ,"#convRoot .conv-pcard{background:var(--co-card);border:1px solid var(--co-line);border-radius:10px;padding:10px 12px;margin-bottom:6px}"
    ,"#convRoot .conv-phd{display:flex;gap:8px;align-items:center;cursor:pointer}"
    ,"#convRoot .conv-ptabla th,#convRoot .conv-ptabla td{padding:5px 5px;font-size:.66rem}"
    ,"#convRoot .conv-pnom{font-weight:700;font-size:.82rem;color:var(--co-ink)}"
  ].join("\n").replace(/#convRoot /g, ":is(#convRoot,#portalConv) ");
  document.head.appendChild(st);
}
