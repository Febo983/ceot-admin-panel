// ══════ CIRUGÍAS PROGRAMADAS ════════════════════════════════════════════
// Antes era una página suelta en Netlify (cirugias-progamadas.netlify.app)
// donde cualquiera elegía un nombre de la lista y veía las cirugías (con datos
// de pacientes) de ese médico. Ahora vive en el panel:
//   · Portal profesional: cada uno ve SOLO las suyas (el médico sale del login,
//     no hay selector).
//   · Admin: elige el médico.
// Los datos vienen del mismo Apps Script de siempre (JSONP, ?doctor=Apellido).
// Se manda además el token de la sesión para que el Script pueda validarlo
// (ver nota al final). No se guarda nada en localStorage: los datos de
// pacientes quedan solo en memoria mientras la pestaña está abierta.
var CX_PROG_ENDPOINT = "https://script.google.com/macros/s/AKfycbzsc65Bpupizt_sZReTofTv-b_PXfqJAWoD4RkD8eb0UYz7BRNdn0GHuzgT7jSqzsjSXw/exec";
// Nombres tal como los espera el Script (igual que la lista de la página vieja).
var CX_DOCTORES = ["Deganutti", "Bruni", "Perlasco", "Corelich", "Trivellini", "De la Colina", "Fisser", "Mazzola", "Labayen", "Guilera", "Soule", "Garmendia"];
var CX_MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
var CX_DOW = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
var CX_CACHE_MS = 5 * 60 * 1000;
var _cxCache = {};            // nombre → { t, cirugias }
var _cxEstado = {};           // rootId → { nombre, anio, mes, dia, admin, cargando, error }
var cxAdminDoctor = "";

function cxEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function cxKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function cxHoyKey() { return cxKey(new Date()); }
// Médico del portal (DOCTORES de datos.js) → nombre que entiende el Script.
function cxNombreDe(doc) {
  if (!doc) return "";
  var ap = String(doc.apellido || "").toUpperCase();
  for (var i = 0; i < CX_DOCTORES.length; i++) if (CX_DOCTORES[i].toUpperCase() === ap) return CX_DOCTORES[i];
  return ap.toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); });
}

// JSONP (Apps Script no contesta CORS). Separado para poder probarlo.
function cxJsonp(url, cb) {
  var cbName = "_cxProgCb" + Date.now() + Math.floor(Math.random() * 1000), script, listo = false;
  var fin = function (resp) {
    if (listo) return; listo = true;
    clearTimeout(t);
    window[cbName] = function () {};
    if (script && script.parentNode) script.parentNode.removeChild(script);
    cb(resp);
  };
  var t = setTimeout(function () { fin({ status: "error", message: "El servidor tardó demasiado en responder." }); }, 30000);
  window[cbName] = fin;
  script = document.createElement("script");
  script.onerror = function () { fin({ status: "error", message: "No se pudo conectar con el servidor de cirugías." }); };
  script.src = url + (url.indexOf("?") === -1 ? "?" : "&") + "callback=" + cbName;
  document.body.appendChild(script);
}
function cxCargar(nombre, forzar, cb) {
  var c = _cxCache[nombre];
  if (!forzar && c && Date.now() - c.t < CX_PROG_CACHE_OK()) { cb(null, c.cirugias); return; }
  var tok = typeof AUTH_TOKEN !== "undefined" && AUTH_TOKEN ? "&token=" + encodeURIComponent(AUTH_TOKEN) : "";
  cxJsonp(CX_PROG_ENDPOINT + "?doctor=" + encodeURIComponent(nombre) + tok, function (json) {
    if (!json || json.status !== "ok") { cb((json && json.message) || "Error desconocido"); return; }
    // Defensa extra: si el Script devolviera filas de otro médico, no se muestran.
    var lista = (json.cirugias || []).filter(function (x) { return !x.doctor || String(x.doctor).toUpperCase().indexOf(nombre.toUpperCase()) !== -1; });
    _cxCache[nombre] = { t: Date.now(), cirugias: lista };
    cb(null, lista);
  });
}
function CX_PROG_CACHE_OK() { return CX_CACHE_MS; }
function cxLimpiarCache() { _cxCache = {}; _cxEstado = {}; }

// ── Pantalla (la misma para portal y admin) ─────────────────────────────
function cxMontar(rootId, nombre, admin) {
  var root = document.getElementById(rootId);
  if (!root) return;
  cxInyectarEstilos();
  var st = _cxEstado[rootId];
  if (!st || st.nombre !== nombre) st = _cxEstado[rootId] = { nombre: nombre, anio: null, mes: null, dia: null, admin: !!admin, cargando: true, error: "" };
  if (!nombre) { root.innerHTML = '<div class="cx-vacio">Elegí un médico.</div>'; return; }
  cxPintar(rootId);
  cxCargar(nombre, false, function (err, lista) {
    if (!_cxEstado[rootId] || _cxEstado[rootId].nombre !== nombre) return; // cambió de médico mientras cargaba
    st.cargando = false; st.error = err || "";
    if (!err && st.anio == null) cxIrAProxima(st, lista);
    cxPintar(rootId);
  });
}
function cxRecargar(rootId) {
  var st = _cxEstado[rootId]; if (!st) return;
  st.cargando = true; st.error = ""; cxPintar(rootId);
  cxCargar(st.nombre, true, function (err) { st.cargando = false; st.error = err || ""; cxPintar(rootId); });
}
function cxIrAProxima(st, lista) {
  var hoy = cxHoyKey(), prox = null;
  lista.forEach(function (c) { if (c.fechaIso && c.fechaIso >= hoy && (!prox || c.fechaIso < prox)) prox = c.fechaIso; });
  var d = prox ? new Date(prox + "T00:00:00") : new Date();
  st.anio = d.getFullYear(); st.mes = d.getMonth(); st.dia = prox;
}
function cxNav(rootId, dir) {
  var st = _cxEstado[rootId]; st.mes += dir;
  if (st.mes > 11) { st.mes = 0; st.anio++; }
  if (st.mes < 0) { st.mes = 11; st.anio--; }
  st.dia = null; cxPintar(rootId);
}
function cxElegirDia(rootId, key) {
  var st = _cxEstado[rootId]; st.dia = key;
  var p = key.split("-"); st.anio = +p[0]; st.mes = +p[1] - 1;
  cxPintar(rootId);
}
function cxPintar(rootId) {
  var root = document.getElementById(rootId), st = _cxEstado[rootId];
  if (!root || !st) return;
  var h = '<div class="cx-hd"><div class="cx-tit">' + (st.admin ? "Dr. " + cxEsc(st.nombre) : "Mis cirugías programadas") + "</div>"
    + '<button class="cx-btn" onclick="cxRecargar(\'' + rootId + '\')" title="Volver a traer del servidor">↻ Actualizar</button></div>';
  if (st.cargando) { root.innerHTML = h + '<div class="cx-vacio">Cargando cirugías…</div>'; return; }
  if (st.error) { root.innerHTML = h + '<div class="cx-err">❌ ' + cxEsc(st.error) + ' <button class="cx-btn" onclick="cxRecargar(\'' + rootId + '\')">Reintentar</button></div>'; return; }
  var lista = (_cxCache[st.nombre] || {}).cirugias || [];
  var porDia = {};
  lista.forEach(function (c) { if (c.fechaIso) (porDia[c.fechaIso] = porDia[c.fechaIso] || []).push(c); });
  var hoy = cxHoyKey();
  // Próximas
  var futuras = Object.keys(porDia).filter(function (k) { return k >= hoy; }).sort();
  h += '<div class="cx-prox">' + (futuras.length
    ? '<span class="cx-dim">Próximas:</span> ' + futuras.slice(0, 6).map(function (k) {
        return '<span class="cx-chip' + (k === st.dia ? " on" : "") + '" onclick="cxElegirDia(\'' + rootId + "','" + k + '\')">' + cxFechaCorta(k) + " · " + porDia[k].length + "</span>";
      }).join("")
    : '<span class="cx-dim">No hay cirugías próximas cargadas.</span>') + "</div>";
  // Calendario
  var mesPref = st.anio + "-" + String(st.mes + 1).padStart(2, "0");
  var off = (new Date(st.anio, st.mes, 1).getDay() + 6) % 7, dias = new Date(st.anio, st.mes + 1, 0).getDate();
  h += '<div class="cx-cal"><div class="cx-cal-hd"><button class="cx-btn" onclick="cxNav(\'' + rootId + '\',-1)">‹</button><b>' + CX_MESES[st.mes] + " " + st.anio + '</b><button class="cx-btn" onclick="cxNav(\'' + rootId + '\',1)">›</button></div>'
    + '<div class="cx-grid">' + CX_DOW.map(function (d) { return '<div class="cx-dow">' + d + "</div>"; }).join("");
  for (var i = 0; i < off; i++) h += "<div></div>";
  for (var d = 1; d <= dias; d++) {
    var k = mesPref + "-" + String(d).padStart(2, "0"), n = (porDia[k] || []).length;
    var cls = "cx-day" + (n ? " cx-has" : "") + (k === hoy ? " cx-hoy" : "") + (k === st.dia ? " cx-sel" : "") + (n && k < hoy ? " cx-pasado" : "");
    h += '<div class="' + cls + '"' + (n ? ' onclick="cxElegirDia(\'' + rootId + "','" + k + '\')"' : "") + ">" + d + (n ? "<small>" + n + "</small>" : "") + "</div>";
  }
  var nMes = Object.keys(porDia).filter(function (k) { return k.indexOf(mesPref) === 0; }).length;
  h += '</div><div class="cx-dim cx-pie">' + (nMes ? nMes + " día" + (nMes === 1 ? "" : "s") + " con cirugía este mes" : "Sin cirugías este mes") + "</div></div>";
  // Día elegido
  if (st.dia && porDia[st.dia]) h += cxHtmlDia(st.dia, porDia[st.dia]);
  else h += '<div class="cx-vacio">Tocá un día marcado para ver las cirugías.</div>';
  root.innerHTML = h;
}
function cxFechaCorta(k) { var p = k.split("-"); return +p[2] + "/" + +p[1]; }
function cxHtmlDia(key, lista) {
  var p = key.split("-");
  var diff = Math.round((new Date(key + "T00:00:00") - new Date(cxHoyKey() + "T00:00:00")) / 86400000);
  var extra = diff === 0 ? " · HOY" : diff === 1 ? " · mañana" : diff === -1 ? " · ayer" : "";
  var ord = lista.slice().sort(function (a, b) { return String(a.hs || "99").localeCompare(String(b.hs || "99")); });
  return '<div class="cx-dia-hd">' + p[2] + "/" + p[1] + "/" + p[0] + extra + ' <span class="cx-dim">· ' + lista.length + " cirugía" + (lista.length === 1 ? "" : "s") + "</span></div>"
    + ord.map(function (c) {
        var check = c.check ? (String(c.check).toUpperCase() === "OK" ? '<span class="cx-badge cx-ok">✓ OK</span>' : '<span class="cx-badge cx-pend">' + cxEsc(c.check) + "</span>") : "";
        var qx = c.qx ? '<span class="cx-badge">QX ' + cxEsc(c.qx) + (c.hs ? " · " + cxEsc(c.hs) + " hs" : "") + "</span>" : (c.hs ? '<span class="cx-badge">' + cxEsc(c.hs) + " hs</span>" : "");
        var it = function (l, v, full) { return v ? '<div class="cx-it' + (full ? " full" : "") + '"><span>' + l + "</span><b>" + cxEsc(v) + "</b></div>" : ""; };
        return '<details class="cx-card"><summary><div style="flex:1;min-width:0"><div class="cx-pac">' + cxEsc(c.paciente || "(sin nombre)") + "</div>"
          + '<div class="cx-dim cx-meta">' + [c.ooss, c.edad ? c.edad + " años" : ""].filter(Boolean).map(cxEsc).join(" · ") + "</div>"
          + '<div class="cx-prac">' + cxEsc(c.practica || "—") + '</div></div><div class="cx-badges">' + qx + check + "</div></summary>"
          + '<div class="cx-det">' + it("Obra social", c.ooss) + it("DNI", c.dni) + it("Edad", c.edad ? c.edad + " años" : "") + it("Check", c.check)
          + it("QX", c.qx) + it("Hora", c.hs ? c.hs + " hs" : "") + it("Ortopedia", c.ortopedia) + it("Código", c.codigo) + it("NUN", c.nun) + it("Práctica", c.practica, true) + "</div></details>";
      }).join("");
}

// ── Portal: pestaña "Mis cirugías" (solo las del médico logueado) ─────────
function cxPortalRender() {
  var pane = document.getElementById("pane-cirugias");
  if (!pane) return;
  if (typeof doctorActual === "undefined" || !doctorActual) { pane.innerHTML = ""; return; }
  if (!document.getElementById("cxPortal")) pane.innerHTML = '<div style="padding:14px 4px 24px"><div id="cxPortal"></div></div>';
  cxMontar("cxPortal", cxNombreDe(doctorActual), false);
}

// ── Admin: elige el médico ──────────────────────────────────────────────
function renderCxProgramadas() {
  if (typeof cerrarAdmSidenav === "function") cerrarAdmSidenav();
  if (typeof admDesactivarSidebar === "function") admDesactivarSidebar();
  var sb = document.getElementById("adm-sidenav-cxprog");
  if (sb) sb.className = "adm-sidenav-btn active";
  cxInyectarEstilos();
  document.getElementById("adm-content").innerHTML = '<div class="adm-sec-title">Cirugías programadas</div>'
    + '<div id="cxAdmDocs" class="cx-docs"></div><div id="cxAdmin"></div>';
  cxAdminPintarDocs();
  cxMontar("cxAdmin", cxAdminDoctor, true);
}
function cxAdminPintarDocs() {
  var el = document.getElementById("cxAdmDocs"); if (!el) return;
  el.innerHTML = CX_DOCTORES.map(function (n) {
    return '<span class="cx-chip' + (n === cxAdminDoctor ? " on" : "") + '" onclick="cxAdminElegir(\'' + cxEsc(n) + '\')">' + cxEsc(n) + "</span>";
  }).join("");
}
function cxAdminElegir(n) { cxAdminDoctor = n; cxAdminPintarDocs(); cxMontar("cxAdmin", n, true); }

// ── Estilos (tokens --co-* → se ven bien en claro y en oscuro) ────────────
function cxInyectarEstilos() {
  if (document.getElementById("cxStyles")) return;
  var R = ":is(#cxPortal,#cxAdmin,#cxAdmDocs) ";
  var st = document.createElement("style");
  st.id = "cxStyles";
  st.textContent = [
    ".cx-dim{color:var(--co-ink-dim)}",
    ".cx-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px}",
    ".cx-tit{flex:1;font-family:var(--font-display);font-size:1.1rem;font-weight:700;color:var(--co-ink)}",
    ".cx-btn{font:inherit;font-size:.72rem;font-weight:700;padding:5px 10px;border-radius:7px;border:1px solid var(--co-line);background:var(--co-card);color:var(--co-ink);cursor:pointer}",
    ".cx-chip{display:inline-block;cursor:pointer;font-size:.72rem;font-weight:700;padding:4px 11px;border-radius:20px;border:1px solid var(--co-line);color:var(--co-ink-dim);margin:0 4px 4px 0;white-space:nowrap}",
    ".cx-chip.on{background:#1f3a2e;border-color:#1f3a2e;color:#fff}",
    ".cx-docs{margin:4px 0 12px}",
    ".cx-prox{margin-bottom:10px;font-size:.74rem;line-height:2}",
    ".cx-cal{background:var(--co-card);border:1px solid var(--co-line);border-radius:12px;padding:10px;margin-bottom:12px;max-width:560px}",
    ".cx-cal-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;color:var(--co-ink)}",
    ".cx-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}",
    ".cx-dow{text-align:center;font-size:.62rem;font-weight:700;color:var(--co-ink-dim);padding:2px 0}",
    ".cx-day{position:relative;text-align:center;padding:8px 0;border-radius:8px;font-size:.8rem;color:var(--co-ink-dim);opacity:.55}",
    ".cx-day small{position:absolute;top:1px;right:4px;font-size:.55rem;font-weight:800}",
    ".cx-has{opacity:1;cursor:pointer;background:var(--co-accent-soft);color:var(--co-ink);font-weight:800;border:1px solid #3f6b4a}",
    ".cx-pasado{border-style:dashed;font-weight:600}",
    ".cx-hoy{outline:2px solid var(--co-gold);outline-offset:-2px;opacity:1}",
    ".cx-sel{background:#1f3a2e !important;color:#fff !important}",
    ".cx-pie{font-size:.68rem;text-align:center;margin-top:6px}",
    ".cx-vacio{padding:18px;text-align:center;color:var(--co-ink-dim);font-size:.8rem}",
    ".cx-err{padding:12px;border-radius:8px;background:var(--co-neg-soft);color:var(--co-neg);font-size:.8rem}",
    ".cx-dia-hd{font-weight:800;font-size:.85rem;color:var(--co-ink);margin:6px 0 8px}",
    ".cx-card{background:var(--co-card);border:1px solid var(--co-line);border-radius:10px;margin-bottom:7px;color:var(--co-ink)}",
    ".cx-card summary{display:flex;gap:8px;padding:10px 12px;cursor:pointer;list-style:none}",
    ".cx-card summary::-webkit-details-marker{display:none}",
    ".cx-pac{font-weight:800;font-size:.86rem}",
    ".cx-meta{font-size:.7rem;margin:2px 0}",
    ".cx-prac{font-size:.74rem;line-height:1.35}",
    ".cx-badges{display:flex;flex-direction:column;gap:4px;align-items:flex-end}",
    ".cx-badge{font-size:.64rem;font-weight:800;padding:2px 8px;border-radius:10px;background:var(--co-accent-soft);white-space:nowrap}",
    ".cx-ok{color:#1f7a3e}",
    ".cx-pend{background:var(--co-warn-soft);color:var(--co-warn)}",
    ".cx-det{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;padding:0 12px 12px;border-top:1px solid var(--co-line);padding-top:10px}",
    ".cx-it{display:flex;flex-direction:column;font-size:.74rem}",
    ".cx-it span{font-size:.6rem;text-transform:uppercase;letter-spacing:.05em;color:var(--co-ink-dim)}",
    ".cx-it.full{grid-column:1/-1}"
  ].map(function (r) { return r.split("}").filter(Boolean).map(function (x) { return R + x + "}"; }).join(""); }).join("\n");
  document.head.appendChild(st);
}

// NOTA DE SEGURIDAD: que el portal muestre solo las cirugías del médico
// logueado es una restricción de la pantalla. El Apps Script de cirugías
// todavía contesta a cualquiera que le pida ?doctor=X sin validar nada. Para
// cerrarlo, el Script tiene que validar el `token` que ahora se le manda y
// tomar el médico de la sesión, no del parámetro (ver PR de esta migración).
