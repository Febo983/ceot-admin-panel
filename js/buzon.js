// ═══════════════════════════════════════════════════════════════════
// buzon.js — módulo "Buzón" (solo admin). Pedido de Marcelo, 19/11/2026.
//   · Contadora: PDFs que manda melisamiqueo@trauen.com.ar, ordenados por mes,
//     con descarga de cada archivo y de un mes entero en ZIP.
//   · Siniestros: todo lo que llega de @redsom.com.ar (Equipo Análisis de
//     Siniestros), agrupado por caso, con los adjuntos descargables.
//   · Alertas: cartel flotante + globito en el mosaico cuando llega algo nuevo.
//
// Los datos los junta un Apps Script que corre dentro de la casilla de
// traumatología (proyecto "correo", funciones bz_*). Cada pedido lleva el token
// del portal y el script lo valida contra el de Liquidación (action=whoami):
// solo entra un admin. El script anota cada mail/PDF en una planilla de esa
// cuenta y los archivos se bajan de Gmail cuando se piden (no se copian a
// Drive); el panel solo muestra y baja.
// ═══════════════════════════════════════════════════════════════════

var BUZON_ENDPOINT = "https://script.google.com/macros/s/AKfycby_yXzYg7nOgoFTrrF8eMO9mdbkK2yaeXUwVbxPgSF5WA_yo6PZ5QzYGSK0JorfEq4c/exec";
var BUZON_VISTO_KEY = "ceot_buzon_visto";      // { docs: ISO, sini: ISO } — hasta cuándo vio cada sección
var BUZON_GMAIL_CUENTA = "traumatologiaccolon@gmail.com";

var buzonDatos = null;          // última respuesta de bzlista
var buzonVista = "docs";        // "docs" | "sini"
var buzonSoloNuevos = false;
var buzonBusca = "";
var buzonTimer = null;
var buzonToastCerrado = "";     // firma del último cartel cerrado
var buzonObserver = null;
var buzonSolo = "";            // "sini" | "docs" cuando se entra por un link directo: muestra una sola sección

function bzEsc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function bzMesLargo(p) {   // "2026-10" → "Octubre 2026"
  var m = /^(\d{4})-(\d{2})$/.exec(p || "");
  if (!m) return p || "Sin período";
  var n = MESES_NOMBRES[parseInt(m[2], 10) - 1] || m[2];
  return n.charAt(0).toUpperCase() + n.slice(1) + " " + m[1];
}
function bzFecha(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR") + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
function bzTam(b) {
  if (b == null) return "";
  return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
}
// El permalink de Apps Script apunta a /mail/u/0/: en una PC con varias cuentas abre la que no es.
function bzGmailLink(link) {
  var m = /\/mail\/u\/\d+\/(#.*)$/.exec(link || "");
  return m ? "https://mail.google.com/mail/?authuser=" + BUZON_GMAIL_CUENTA + m[1] : (link || "");
}

// ── Visto / nuevos ────────────────────────────────────────────────
function bzVisto() {
  try {
    var o = JSON.parse(localStorage.getItem(BUZON_VISTO_KEY) || "null");
    if (o && typeof o === "object") return o;
  } catch (e) {}
  return null;
}
function bzGuardarVisto(o) {
  try { localStorage.setItem(BUZON_VISTO_KEY, JSON.stringify(o)); } catch (e) {}
  if (typeof syncPush === "function") syncPush(BUZON_VISTO_KEY);
}
function bzEsNuevo(it, visto, clave) {
  if (it.ini) return false;
  var desde = visto && visto[clave];
  return !desde || it.proc > desde;
}
function bzNuevos() {
  var out = { docs: 0, sini: 0, liq: 0 };
  if (!buzonDatos) return out;
  var v = bzVisto();
  buzonDatos.docs.forEach(function (d) { if (bzEsNuevo(d, v, "docs")) out.docs++; });
  buzonDatos.sini.forEach(function (s) { if (bzEsNuevo(s, v, "sini")) out.sini++; });
  (buzonDatos.liq || []).forEach(function (l) { if (bzEsNuevo(l, v, "liq")) out.liq++; });
  return out;
}
function bzMarcarVisto(clave) {
  var v = bzVisto() || {};
  v[clave] = new Date().toISOString();
  bzGuardarVisto(v);
  bzActualizarAvisos();
}

// ── Pedidos al Apps Script ────────────────────────────────────────
async function bzPedir(params) {
  var q = Object.keys(params).map(function (k) { return k + "=" + encodeURIComponent(params[k]); }).join("&");
  var resp = await fetch(authURL(BUZON_ENDPOINT + "?" + q));
  var j = await resp.json();
  if (j.error) throw new Error(j.error === "unauthorized" ? "No tenés permiso (solo administradores) o la sesión venció." : j.error);
  return j;
}
async function bzCargar() {
  var j = await bzPedir({ accion: "bzlista" });
  buzonDatos = j;
  // Primera vez en este navegador/cuenta: nada de lo ya cargado cuenta como nuevo.
  var vv = bzVisto();
  if (!vv) bzGuardarVisto({ docs: j.ts, sini: j.ts, liq: j.ts });
  else if (!vv.liq) { vv.liq = j.ts; bzGuardarVisto(vv); }   // sección agregada después: lo que ya existía no cuenta como nuevo
  return j;
}
function bzBajarBlob(blob, nombre) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
}
function bzB64Blob(b64, mime) {
  var bin = atob(b64), n = bin.length, u8 = new Uint8Array(n);
  for (var i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime || "application/octet-stream" });
}
async function bzBajarDoc(id, btn) {
  var txt = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "…"; }
  try {
    var j = await bzPedir({ accion: "bzdoc", id: id });
    bzBajarBlob(bzB64Blob(j.b64, j.mime), j.name);
  } catch (e) { alert("No se pudo bajar el archivo: " + e.message); }
  if (btn) { btn.disabled = false; btn.textContent = txt; }
}
async function bzBajarAdj(msg, i, btn) {
  var txt = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "…"; }
  try {
    var j = await bzPedir({ accion: "bzadj", msg: msg, i: i });
    bzBajarBlob(bzB64Blob(j.b64, j.mime), j.name);
  } catch (e) { alert("No se pudo bajar el adjunto: " + e.message); }
  if (btn) { btn.disabled = false; btn.textContent = txt; }
}
function bzCargarJSZip() {
  return new Promise(function (res, rej) {
    if (window.JSZip) return res();
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = res; s.onerror = function () { rej(new Error("no se pudo cargar la librería ZIP")); };
    document.head.appendChild(s);
  });
}
async function bzBajarMes(periodo, btn) {
  var txt = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "Armando ZIP…"; }
  try {
    await bzCargarJSZip();
    var docs = (buzonDatos ? buzonDatos.docs : []).filter(function (d) { return d.periodo === periodo; });
    if (!docs.length) throw new Error("no hay archivos en ese mes");
    var zip = new JSZip(), usados = {};
    for (var i = 0; i < docs.length; i++) {
      if (btn) btn.textContent = "Bajando " + (i + 1) + "/" + docs.length + "…";
      var j = await bzPedir({ accion: "bzdoc", id: docs[i].id });
      var nombre = j.name, c = 2;
      while (usados[nombre]) { nombre = j.name.replace(/(\.pdf)?$/i, " (" + c + ").pdf"); c++; }
      usados[nombre] = true;
      zip.file(nombre, j.b64, { base64: true });
    }
    var blob = await zip.generateAsync({ type: "blob" });
    bzBajarBlob(blob, "Contadora_" + periodo + ".zip");
  } catch (e) { alert("No se pudo armar el ZIP: " + e.message); }
  if (btn) { btn.disabled = false; btn.textContent = txt; }
}

// ── Pantalla ──────────────────────────────────────────────────────
var BZ_BTN = "padding:6px 12px;border-radius:8px;border:1px solid var(--co-line,#d9d0b8);background:var(--co-card,#fbf8f0);color:var(--co-ink,#20241f);font-size:0.76rem;font-weight:700;cursor:pointer;font-family:inherit";

function bzPill(txt, bg, col) {
  return '<span style="display:inline-block;padding:1px 7px;border-radius:10px;font-size:.62rem;font-weight:800;background:' + bg + ';color:' + col + ';margin-left:6px">' + txt + '</span>';
}

function bzHtmlDocs(v) {
  var docs = buzonDatos.docs.slice();
  if (!docs.length) return '<div style="font-size:.8rem;color:var(--co-ink-dim,#6b6a5a)">Todavía no hay PDFs de la contadora cargados.</div>';
  var porMes = {};
  docs.forEach(function (d) { (porMes[d.periodo] = porMes[d.periodo] || []).push(d); });
  var meses = Object.keys(porMes).sort().reverse();
  var abierto = true;
  return meses.map(function (p) {
    var lista = porMes[p].sort(function (a, b) { return a.archivo < b.archivo ? -1 : 1; });
    var nuevos = lista.filter(function (d) { return bzEsNuevo(d, v, "docs"); }).length;
    var filas = lista.map(function (d) {
      var nuevo = bzEsNuevo(d, v, "docs");
      return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--co-line,#d9d0b8)">'
        + '<span style="font-size:1rem">📄</span>'
        + '<div style="flex:1;min-width:0">'
        +   '<div style="font-size:.78rem;font-weight:600;word-break:break-word">' + bzEsc(d.archivo) + (nuevo ? bzPill("NUEVO", "#1f3a2e", "#fff") : "") + '</div>'
        +   '<div style="font-size:.66rem;color:var(--co-ink-dim,#6b6a5a)">' + bzEsc(d.asunto) + ' · ' + bzFecha(d.fecha) + ' · ' + bzTam(d.bytes) + '</div>'
        + '</div>'
        + '<button style="' + BZ_BTN + '" onclick="bzBajarDoc(\'' + bzEsc(d.id) + '\', this)">⬇</button>'
        + '</div>';
    }).join("");
    var res = '<details ' + (abierto ? 'open' : '') + ' style="background:var(--co-card,#fbf8f0);border:1px solid var(--co-line,#d9d0b8);border-radius:10px;padding:10px 12px;margin-bottom:10px">'
      + '<summary style="cursor:pointer;display:flex;align-items:center;gap:10px;flex-wrap:wrap;list-style:none">'
      +   '<span style="font-size:.9rem;font-weight:800">' + bzMesLargo(p) + '</span>'
      +   '<span style="font-size:.7rem;color:var(--co-ink-dim,#6b6a5a)">' + lista.length + (lista.length === 1 ? ' archivo' : ' archivos') + '</span>'
      +   (nuevos ? bzPill(nuevos + ' nuevo' + (nuevos > 1 ? 's' : ''), "#1f3a2e", "#fff") : "")
      +   '<button style="' + BZ_BTN + ';margin-left:auto" onclick="event.preventDefault();event.stopPropagation();bzBajarMes(\'' + bzEsc(p) + '\', this)">⬇ Bajar el mes (ZIP)</button>'
      + '</summary>' + filas + '</details>';
    abierto = false;   // solo el mes más reciente arranca abierto
    return res;
  }).join("");
}

function bzCasos() {
  var q = buzonBusca.trim().toLowerCase();
  var v = bzVisto();
  var por = {};
  buzonDatos.sini.forEach(function (s) {
    var o = por[s.hilo] || (por[s.hilo] = { hilo: s.hilo, msgs: [], link: s.link });
    o.msgs.push(s);
  });
  var casos = Object.keys(por).map(function (k) {
    var c = por[k];
    c.msgs.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });   // el más nuevo primero
    var ref = c.msgs.filter(function (m) { return m.paciente || m.dni; })[0] || c.msgs[0];
    c.paciente = ref.paciente; c.dni = ref.dni; c.asunto = ref.asunto;
    c.ultima = c.msgs[0].fecha;
    c.nuevos = c.msgs.filter(function (m) { return bzEsNuevo(m, v, "sini"); }).length;
    return c;
  });
  casos = casos.filter(function (c) {
    if (buzonSoloNuevos && !c.nuevos) return false;
    if (!q) return true;
    var hay = (c.paciente + " " + c.dni + " " + c.msgs.map(function (m) { return m.asunto + " " + m.cuerpo; }).join(" ")).toLowerCase();
    return hay.indexOf(q) !== -1;
  });
  casos.sort(function (a, b) { return a.ultima < b.ultima ? 1 : -1; });
  return casos;
}

function bzHtmlSini(v) {
  var casos = bzCasos();
  if (!casos.length) return '<div style="font-size:.8rem;color:var(--co-ink-dim,#6b6a5a)">' + (buzonSoloNuevos || buzonBusca ? 'No hay casos con ese filtro.' : 'Todavía no hay mensajes del Equipo de Análisis de Siniestros cargados.') + '</div>';
  return casos.slice(0, 120).map(function (c) {
    var msgs = c.msgs.map(function (m) {
      var nuevo = bzEsNuevo(m, v, "sini");
      var adj = (m.adj || []).map(function (a) {
        return '<button style="' + BZ_BTN + ';margin:3px 6px 0 0;font-weight:600" onclick="bzBajarAdj(\'' + bzEsc(m.msg) + '\',' + a.i + ', this)" title="' + bzEsc(a.n) + '">📎 ' + bzEsc(a.n.length > 34 ? a.n.slice(0, 31) + '…' : a.n) + ' · ' + bzTam(a.s) + '</button>';
      }).join("");
      return '<div style="padding:8px 0;border-top:1px solid var(--co-line,#d9d0b8)">'
        + '<div style="font-size:.66rem;color:var(--co-ink-dim,#6b6a5a)">' + bzFecha(m.fecha) + ' · ' + bzEsc(String(m.de).replace(/<.*$/, "").trim() || m.de) + (nuevo ? bzPill("NUEVO", "#b13a2c", "#fff") : "") + '</div>'
        + '<div style="font-size:.78rem;white-space:pre-wrap;word-break:break-word;margin-top:3px">' + bzEsc(m.cuerpo) + '</div>'
        + (adj ? '<div>' + adj + '</div>' : '')
        + '</div>';
    }).join("");
    return '<details ' + (c.nuevos ? 'open' : '') + ' style="background:var(--co-card,#fbf8f0);border:1px solid ' + (c.nuevos ? '#b13a2c' : 'var(--co-line,#d9d0b8)') + ';border-radius:10px;padding:10px 12px;margin-bottom:10px">'
      + '<summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
      +   '<span style="font-size:.86rem;font-weight:800">' + bzEsc(c.paciente || c.asunto) + '</span>'
      +   (c.dni ? '<span style="font-size:.7rem;color:var(--co-ink-dim,#6b6a5a)">DNI ' + bzEsc(c.dni) + '</span>' : '')
      +   (c.nuevos ? bzPill(c.nuevos + ' nuevo' + (c.nuevos > 1 ? 's' : ''), "#b13a2c", "#fff") : "")
      +   '<span style="margin-left:auto;font-size:.66rem;color:var(--co-ink-dim,#6b6a5a)">' + bzFecha(c.ultima) + ' · ' + c.msgs.length + (c.msgs.length === 1 ? ' mensaje' : ' mensajes') + '</span>'
      + '</summary>'
      + '<div style="font-size:.68rem;color:var(--co-ink-dim,#6b6a5a);margin-top:4px">' + bzEsc(c.asunto) + '</div>'
      + msgs
      + '<div style="margin-top:6px"><a href="' + bzEsc(bzGmailLink(c.link)) + '" target="_blank" rel="noopener" style="font-size:.7rem;color:#1d4ed8">Abrir la conversación en Gmail ↗</a></div>'
      + '</details>';
  }).join("") + (casos.length > 120 ? '<div style="font-size:.7rem;color:var(--co-ink-dim,#6b6a5a)">Se muestran los 120 casos más recientes: usá el buscador para ver los demás.</div>' : '');
}

var BZ_LIQ_TIPOS = { FAC: "Factura al profesional", MCC: "Movimientos de cuenta corriente", DPR: "Detalle de prestaciones", DLQ: "Detalle de liquidación", DLA: "Detalle de liquidación ampliada" };
var BZ_LIQ_ORDEN = ["FAC", "DLQ", "DLA", "DPR", "MCC"];
function bzLiqMesLargo(per) { return bzMesLargo(String(per).slice(0, 4) + "-" + String(per).slice(4)); }

function bzHtmlLiq(v) {
  var items = buzonDatos.liq || [];
  if (!items.length) return '<div style="font-size:.8rem;color:var(--co-ink-dim,#6b6a5a)">Todavía no hay archivos de liquidación cargados.</div>';
  var porPer = {};
  items.forEach(function (l) { (porPer[l.per] = porPer[l.per] || []).push(l); });
  var pers = Object.keys(porPer).sort().reverse();
  var abierto = true;
  return pers.map(function (per) {
    var lista = porPer[per];
    var nuevos = lista.filter(function (l) { return bzEsNuevo(l, v, "liq"); }).length;
    var tit = function (t) { return '<div style="font-size:.72rem;font-weight:800;color:var(--co-ink-dim,#6b6a5a);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">' + t + '</div>'; };
    var col = function (cta, titulo) {
      var fs = lista.filter(function (l) { return l.cta === cta; }).sort(function (a, b) { return BZ_LIQ_ORDEN.indexOf(a.tipo) - BZ_LIQ_ORDEN.indexOf(b.tipo); });
      if (!fs.length) return '<div>' + tit(titulo) + '<div style="font-size:.72rem;color:var(--co-ink-dim,#6b6a5a)">Sin archivos todavía</div></div>';
      return '<div>' + tit(titulo) + fs.map(function (l) {
        var id = l.per + "|" + l.cta + "|" + l.tipo, nuevo = bzEsNuevo(l, v, "liq");
        return '<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-top:1px solid var(--co-line,#d9d0b8)">'
          + '<span style="flex:1;min-width:0;font-size:.76rem;font-weight:600">' + bzEsc(BZ_LIQ_TIPOS[l.tipo] || l.tipo) + (nuevo ? bzPill("NUEVO", "#1f3a2e", "#fff") : "")
          + ' <span style="font-weight:400;color:var(--co-ink-dim,#6b6a5a);font-size:.64rem">' + bzTam(l.bytes) + '</span></span>'
          + '<a href="' + bzEsc(l.url) + '" target="_blank" rel="noopener" style="' + BZ_BTN + ';text-decoration:none">Abrir</a>'
          + '<button style="' + BZ_BTN + '" onclick="bzBajarLiq(\'' + bzEsc(id) + '\', this)">⬇</button></div>';
      }).join("") + '</div>';
    };
    var res = '<details ' + (abierto ? 'open' : '') + ' style="background:var(--co-card,#fbf8f0);border:1px solid var(--co-line,#d9d0b8);border-radius:10px;padding:10px 12px;margin-bottom:10px">'
      + '<summary style="cursor:pointer;display:flex;align-items:center;gap:10px;flex-wrap:wrap;list-style:none">'
      +   '<span style="font-size:.9rem;font-weight:800">' + bzLiqMesLargo(per) + '</span>'
      +   '<span style="font-size:.7rem;color:var(--co-ink-dim,#6b6a5a)">' + lista.length + (lista.length === 1 ? ' archivo' : ' archivos') + '</span>'
      +   (nuevos ? bzPill(nuevos + ' nuevo' + (nuevos > 1 ? 's' : ''), "#1f3a2e", "#fff") : "")
      +   '<button style="' + BZ_BTN + ';margin-left:auto" onclick="event.preventDefault();event.stopPropagation();bzBajarMesLiq(\'' + bzEsc(per) + '\', this)">⬇ Bajar el mes (ZIP)</button>'
      + '</summary>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:8px">' + col("9042P", "Individual") + col("9008G", "Grupal") + '</div></details>';
    abierto = false;
    return res;
  }).join("");
}

async function bzBajarLiq(id, btn) {
  var txt = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "…"; }
  try {
    var j = await bzPedir({ accion: "bzliq", id: id });
    bzBajarBlob(bzB64Blob(j.b64, j.mime), j.name);
  } catch (e) { alert("No se pudo bajar el archivo: " + e.message); }
  if (btn) { btn.disabled = false; btn.textContent = txt; }
}
async function bzBajarMesLiq(per, btn) {
  var txt = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "Armando ZIP…"; }
  try {
    await bzCargarJSZip();
    var fs = (buzonDatos.liq || []).filter(function (l) { return l.per === per; });
    if (!fs.length) throw new Error("no hay archivos en ese mes");
    var zip = new JSZip();
    for (var i = 0; i < fs.length; i++) {
      if (btn) btn.textContent = "Bajando " + (i + 1) + "/" + fs.length + "…";
      var j = await bzPedir({ accion: "bzliq", id: fs[i].per + "|" + fs[i].cta + "|" + fs[i].tipo });
      zip.file((fs[i].cta === "9008G" ? "Grupal/" : "Individual/") + j.name, j.b64, { base64: true });
    }
    bzBajarBlob(await zip.generateAsync({ type: "blob" }), "Liquidacion_" + per + ".zip");
  } catch (e) { alert("No se pudo armar el ZIP: " + e.message); }
  if (btn) { btn.disabled = false; btn.textContent = txt; }
}

function bzPintar() {
  var cont = document.getElementById("adm-content");
  if (!cont) return;
  var n = bzNuevos(), v = bzVisto();
  var tab = function (clave, txt, cuenta) {
    var on = buzonVista === clave;
    return '<button onclick="bzCambiarVista(\'' + clave + '\')" style="padding:7px 16px;border-radius:9px;border:1px solid ' + (on ? '#1f3a2e' : 'var(--co-line,#d9d0b8)')
      + ';background:' + (on ? '#1f3a2e' : 'var(--co-card,#fbf8f0)') + ';color:' + (on ? '#fff' : 'var(--co-ink,#20241f)') + ';font-size:.78rem;font-weight:700;cursor:pointer;font-family:inherit">'
      + txt + (cuenta ? ' <span style="background:#b13a2c;color:#fff;border-radius:10px;padding:0 7px;font-size:.66rem;margin-left:4px">' + cuenta + '</span>' : '') + '</button>';
  };
  var titulo = buzonSolo === "sini" ? "🚑 Siniestros — REDSOM" : (buzonSolo === "docs" ? "📄 Contadora — PDFs por mes" : (buzonSolo === "liq" ? "🏥 Liquidación Clínica Colón" : "📬 Buzón"));
  var html = '<div style="padding:16px">'
    + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">'
    +   '<div class="adm-sec-title" style="margin:0;border:none;padding:0">' + titulo + '</div>'
    +   (buzonSolo ? '' : '<div style="display:flex;gap:6px;flex-wrap:wrap">' + tab("docs", "Contadora", n.docs) + tab("sini", "Siniestros", n.sini) + tab("liq", "Liquidación Clínica", n.liq) + '</div>')
    +   '<button style="' + BZ_BTN + ';margin-left:auto" onclick="renderBuzon(true)">↻ Actualizar</button>'
    + '</div>';
  if (buzonVista === "sini") {
    html += '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px">'
      + '<input id="bzBusca" type="search" placeholder="Buscar paciente, DNI o texto…" value="' + bzEsc(buzonBusca) + '" oninput="bzBuscar(this.value)" style="flex:1;min-width:220px;padding:7px 10px;border:1px solid var(--co-line,#d9d0b8);border-radius:8px;font-size:.82rem;font-family:inherit">'
      + '<label style="font-size:.76rem;display:flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" ' + (buzonSoloNuevos ? 'checked' : '') + ' onchange="bzSoloNuevos(this.checked)"> Solo con novedades</label>'
      + '</div>'
      + '<div id="bzLista">' + bzHtmlSini(v) + '</div>';
  } else if (buzonVista === "liq") {
    html += '<div style="font-size:.72rem;color:var(--co-ink-dim,#6b6a5a);margin-bottom:10px">Archivos de "Liquidación actual" de coloncc.com.ar, individual (CEOT) y grupal, por mes. Se actualizan solos cuando la clínica los sube.</div>'
      + '<div id="bzLista">' + bzHtmlLiq(v) + '</div>';
  } else {
    html += '<div style="font-size:.72rem;color:var(--co-ink-dim,#6b6a5a);margin-bottom:10px">PDFs que manda la contadora, ordenados por el período del asunto (o por el mes en que llegaron si el asunto no lo dice).</div>'
      + '<div id="bzLista">' + bzHtmlDocs(v) + '</div>';
  }
  html += '</div>';
  cont.innerHTML = html;
}
function bzBuscar(q) {
  buzonBusca = q || "";
  var l = document.getElementById("bzLista");
  if (l) l.innerHTML = bzHtmlSini(bzVisto());
}
function bzSoloNuevos(on) { buzonSoloNuevos = !!on; bzPintar(); }
function bzCambiarVista(v) {
  buzonVista = v;
  bzPintar();
  bzMarcarVistoLuego(v);
}
// Se marca como visto lo que ya se mostró; los "NUEVO" de esta pantalla quedan resaltados hasta que salga de ella.
function bzMarcarVistoLuego(clave) { setTimeout(function () { bzMarcarVisto(clave); }, 4000); }

async function renderBuzon(forzar) {
  if (forzar === undefined) buzonSolo = "";   // entrar desde el mosaico = módulo completo; los links directos y los botones internos pasan true
  if (typeof cerrarAdmSidenav === "function") cerrarAdmSidenav();
  if (typeof admDesactivarSidebar === "function") admDesactivarSidebar();
  var cont = document.getElementById("adm-content");
  if (!cont) return;
  if (!buzonDatos || forzar === true) {
    cont.innerHTML = '<div style="padding:24px;font-size:.85rem;color:var(--co-ink-dim,#6b6a5a)">Cargando el buzón…</div>';
    try { await bzCargar(); }
    catch (e) {
      cont.innerHTML = '<div style="padding:24px"><div style="font-size:.9rem;font-weight:700;color:#b13a2c">No se pudo cargar el buzón</div>'
        + '<div style="font-size:.8rem;margin-top:6px">' + bzEsc(e.message) + '</div>'
        + '<button style="' + BZ_BTN + ';margin-top:10px" onclick="renderBuzon(true)">Reintentar</button></div>';
      return;
    }
  }
  if (typeof syncPull === "function") syncPull(BUZON_VISTO_KEY, function () { bzActualizarAvisos(); });
  bzPintar();
  bzMarcarVistoLuego(buzonVista);
  bzActualizarAvisos();
}

// ── Alertas ───────────────────────────────────────────────────────
// En un link directo (una sola sección) solo cuenta lo de esa sección.
function bzTotal(n) { return buzonSolo ? (n[buzonSolo] || 0) : n.docs + n.sini + n.liq; }
function bzActualizarAvisos() {
  var n = bzNuevos(), total = bzTotal(n);
  // Título de la pestaña
  var base = document.title.replace(/^\(\d+\)\s*/, "");
  document.title = total ? "(" + total + ") " + base : base;
  bzPintarBadges(total);
  bzToast(n);
}
function bzPintarBadges(total) {
  document.querySelectorAll("[data-bz-badge]").forEach(function (e) { e.remove(); });
  if (!total) return;
  document.querySelectorAll('[onclick*="renderBuzon()"]').forEach(function (el) {
    if (el.style) el.style.position = el.style.position || "relative";
    var b = document.createElement("span");
    b.setAttribute("data-bz-badge", "1");
    b.textContent = total;
    b.style.cssText = "position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;border-radius:9px;background:#b13a2c;color:#fff;font-size:.66rem;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px;box-shadow:0 0 0 2px #fff";
    el.appendChild(b);
  });
}
function bzToast(n) {
  var viejo = document.getElementById("bzToast");
  var total = bzTotal(n);
  var firma = n.docs + "/" + n.sini + "/" + n.liq;
  var adm = document.getElementById("adminView");
  var visible = adm && getComputedStyle(adm).display !== "none";
  var enBuzon = !!document.getElementById("bzLista");
  if (!total || !visible || enBuzon || buzonToastCerrado === firma) { if (viejo) viejo.remove(); return; }
  if (viejo) viejo.remove();
  var partes = [];
  if (n.sini) partes.push(n.sini + (n.sini === 1 ? " mensaje nuevo" : " mensajes nuevos") + " de Siniestros");
  if (n.docs) partes.push(n.docs + (n.docs === 1 ? " PDF nuevo" : " PDFs nuevos") + " de la contadora");
  if (n.liq) partes.push(n.liq + (n.liq === 1 ? " archivo nuevo" : " archivos nuevos") + " de la liquidación de la clínica");
  var t = document.createElement("div");
  t.id = "bzToast";
  t.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;max-width:320px;background:#1f3a2e;color:#fff;border-radius:12px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.3);font-family:inherit;display:flex;gap:10px;align-items:flex-start";
  t.innerHTML = '<div style="font-size:1.3rem;line-height:1">📬</div>'
    + '<div style="flex:1;cursor:pointer" onclick="bzIrDesdeToast()"><div style="font-size:.82rem;font-weight:800">Buzón</div><div style="font-size:.76rem;margin-top:2px">' + partes.join(" · ") + '</div><div style="font-size:.68rem;opacity:.75;margin-top:4px">Tocá para verlo</div></div>'
    + '<div style="cursor:pointer;opacity:.7;font-size:.9rem" onclick="bzCerrarToast(\'' + firma + '\')">✕</div>';
  document.body.appendChild(t);
}
function bzCerrarToast(firma) {
  buzonToastCerrado = firma;
  var t = document.getElementById("bzToast"); if (t) t.remove();
}
function bzIrDesdeToast() {
  var n = bzNuevos();
  buzonVista = n.sini ? "sini" : (n.docs ? "docs" : "liq");
  var t = document.getElementById("bzToast"); if (t) t.remove();
  renderBuzon(true);
}

async function bzSondear() {
  if (typeof AUTH_TOKEN === "undefined" || !AUTH_TOKEN || AUTH_ROLE !== "admin") return;
  var adm = document.getElementById("adminView");
  if (!adm || getComputedStyle(adm).display === "none") return;
  if (document.hidden) return;
  try { await bzCargar(); } catch (e) { return; }
  bzActualizarAvisos();
  // Si está mirando el buzón, se refresca la lista conservando qué casos/meses tenía abiertos.
  if (document.getElementById("bzLista")) {
    var abiertos = {};
    document.querySelectorAll("#bzLista details").forEach(function (d, i) { abiertos[i] = d.open; });
    bzPintar();
    document.querySelectorAll("#bzLista details").forEach(function (d, i) { if (abiertos[i] != null) d.open = abiertos[i]; });
  }
}
function bzIniciar() {
  if (buzonTimer) return;
  syncPull && syncPull(BUZON_VISTO_KEY, function () { bzActualizarAvisos(); });
  setTimeout(bzSondear, 8000);
  buzonTimer = setInterval(bzSondear, 5 * 60 * 1000);
  // Los mosaicos se redibujan al volver a la home: se vuelve a poner el globito.
  if (window.MutationObserver && !buzonObserver) {
    var pend = null;
    buzonObserver = new MutationObserver(function () {
      if (pend) return;
      pend = setTimeout(function () {
        pend = null;
        if (buzonDatos && !document.querySelector("[data-bz-badge]")) { var n = bzNuevos(); bzPintarBadges(bzTotal(n)); }
      }, 400);
    });
    var ac = document.getElementById("adm-content");
    if (ac) buzonObserver.observe(ac, { childList: true });
  }
}
document.addEventListener("DOMContentLoaded", function () { setTimeout(bzIniciar, 1500); });

// ── Links directos ─────────────────────────────────────────────────
// ...?ir=siniestros  → solo la sección de REDSOM (Equipo Análisis de Siniestros)
// ...?ir=contadora   → solo los PDFs de la contadora
// ...?ir=liquidacion → solo la liquidación de la clínica (individual y grupal)
// ...?ir=buzon       → el módulo completo
// Sin sesión, el panel pide el login y después de entrar abre directo esa pantalla.
function buzonIrADesdeUrl() {
  var q = "";
  try { q = new URLSearchParams(location.search).get("ir") || ""; } catch (e) {}
  if (!q && location.hash) q = location.hash.replace(/^#/, "");
  q = q.toLowerCase();
  if (q === "siniestros" || q === "redsom") { buzonSolo = "sini"; buzonVista = "sini"; }
  else if (q === "contadora") { buzonSolo = "docs"; buzonVista = "docs"; }
  else if (q === "liquidacion" || q === "liquidaciones") { buzonSolo = "liq"; buzonVista = "liq"; }
  else if (q === "buzon") { buzonSolo = ""; }
  else return false;
  buzonModoSolo(!!buzonSolo);
  renderBuzon(true);
  return true;
}

// Modo "solo esta pantalla": con un link directo (?ir=siniestros / ?ir=contadora) el panel
// queda reducido a esa sección — sin menú, mes a mes, módulos, importar, checklist, voz ni
// botón Inicio. Queda el título y "Salir". Hasta el refresco automático de la home se desvía
// a la misma pantalla para que no saque al usuario de ahí.
var _bzRenderAdmHomeOrig = null;
function buzonModoSolo(on) {
  var st = document.getElementById("bzKioskCss");
  if (on && !st) {
    st = document.createElement("style");
    st.id = "bzKioskCss";
    st.textContent = "body.buzon-kiosk #adminView .adm-header > div:last-child > *:not(#adminLogoutBtn){display:none!important}"
      + "body.buzon-kiosk .adm-sidenav,body.buzon-kiosk .adm-sidenav-overlay,body.buzon-kiosk .adm-tabs,body.buzon-kiosk .adm-footer,"
      + "body.buzon-kiosk #voiceFab,body.buzon-kiosk #voiceHandsFreeBtn,body.buzon-kiosk #voiceStatus,body.buzon-kiosk #endpointStatusBanner,"
      + "body.buzon-kiosk #admHomeBtn,body.buzon-kiosk #admHamburgerBtn{display:none!important}"
      + "body.buzon-kiosk .adm-layout{display:block!important}";
    document.head.appendChild(st);
  }
  document.body.classList.toggle("buzon-kiosk", !!on);
  if (on && !_bzRenderAdmHomeOrig && typeof window.renderAdmHome === "function") {
    _bzRenderAdmHomeOrig = window.renderAdmHome;
    window.renderAdmHome = function () { if (document.body.classList.contains("buzon-kiosk")) renderBuzon(true); else _bzRenderAdmHomeOrig(); };
  }
}
