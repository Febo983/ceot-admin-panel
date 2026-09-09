// ═══════════════════════════════════════════════════════════════════
// correos.js — módulo "Correos" del panel admin.
// Espejo de solo lectura de los correos que analiza el Apps Script
// "correo" (traumatologiaccolon@gmail.com): trae las últimas ~60 filas
// de la hoja "CEOT — Correos analizados" con un fetch() al doGet del Web
// App (responde JSON + CORS). La hoja queda PRIVADA; el endpoint devuelve
// solo lo que muestra el panel. Ver project_ceot_analizador_correos.
// ═══════════════════════════════════════════════════════════════════

// URL /exec del Web App del proyecto "correo" (Implementar → Aplicación web,
// "Ejecutar como: yo" · "Acceso: cualquiera").
var CORREOS_ENDPOINT = "https://script.google.com/macros/s/AKfycby_yXzYg7nOgoFTrrF8eMO9mdbkK2yaeXUwVbxPgSF5WA_yo6PZ5QzYGSK0JorfEq4c/exec";

var CORREOS_DATA = null;
var corrFiltro = "todos"; // "todos" | "urgentes" | "cat:<categoria>"

function corrEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function corrFetch(cb) {
  var done = false;
  var fin = function (data, err) { if (done) return; done = true; clearTimeout(to); cb(data, err); };
  var to = setTimeout(function () { fin(null, "tardó demasiado — reintentá"); }, 20000);
  fetch(CORREOS_ENDPOINT, { method: "GET" })
    .then(function (r) { return r.json(); })
    .then(function (resp) {
      if (resp && resp.ok && resp.items) { CORREOS_DATA = resp; fin(resp); }
      else fin(null, (resp && resp.error) || "respuesta inválida");
    })
    .catch(function (e) { fin(null, (e && e.message) ? e.message : "error de red"); });
}

function renderCorreos() {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  var b = document.getElementById("adm-sidenav-correos");
  if (b) b.className = "adm-sidenav-btn active";
  document.getElementById("adm-content").innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
      '<div class="adm-sec-title" style="margin:0">Correos</div>' +
      '<button id="corrRefreshBtn" onclick="corrRefrescar(this)" style="flex-shrink:0;border:1px solid rgba(32,36,31,.2);background:#fff;border-radius:7px;padding:4px 12px;font-size:.72rem;font-weight:700;cursor:pointer;font-family:inherit;color:rgba(32,36,31,.65)">↻ Actualizar</button>' +
    '</div>' +
    '<div id="corrBody" style="font-size:.8rem;color:rgba(32,36,31,.5);padding:20px 4px">⏳ Trayendo los correos analizados…</div>';
  if (CORREOS_DATA) { corrRender(); return; }
  corrTraer();
}

function corrTraer() {
  corrFetch(function (data, err) {
    var body = document.getElementById("corrBody");
    var btn = document.getElementById("corrRefreshBtn");
    if (btn) { btn.disabled = false; btn.textContent = "↻ Actualizar"; }
    if (!body) return;
    if (!data) {
      body.innerHTML = '<div style="color:#b13a2c">No se pudieron traer los correos (' + corrEsc(err || "?") + '). ' +
        '<button onclick="corrRefrescar(this)" style="border:1px solid rgba(32,36,31,.2);background:#fff;border-radius:6px;padding:3px 10px;cursor:pointer;font-family:inherit">Reintentar</button></div>';
      return;
    }
    corrRender();
  });
}

function corrRefrescar(btn) {
  if (btn) { btn.disabled = true; btn.textContent = "⏳ …"; }
  CORREOS_DATA = null;
  corrTraer();
}

var CORR_CAT_COLOR = {
  "turno": "#378add", "factura/pago": "#16a34a", "ART": "#d85a30",
  "obra social": "#6d28d9", "administrativo": "#7f77dd", "proveedor": "#92610f",
  "legal": "#b13a2c", "RRHH": "#0e7490", "spam/newsletter": "rgba(32,36,31,.4)", "otro": "rgba(32,36,31,.5)"
};
var CORR_PRIO_COLOR = { "alta": "#b13a2c", "media": "#92610f", "baja": "rgba(32,36,31,.45)" };

function corrChip(txt, color, bg) {
  return '<span style="display:inline-block;font-size:.62rem;font-weight:700;padding:2px 7px;border-radius:20px;color:' + color +
    ';background:' + (bg || "transparent") + ';border:1px solid ' + color + '33;white-space:nowrap">' + corrEsc(txt) + '</span>';
}

function corrFechaCorta(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return corrEsc(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function corrRender() {
  if (!CORREOS_DATA) return;
  var body = document.getElementById("corrBody");
  if (!body) return;
  var items = CORREOS_DATA.items || [];
  var nUrg = items.filter(function (x) { return x.urgente; }).length;
  var cats = [];
  items.forEach(function (x) { if (x.categoria && cats.indexOf(x.categoria) === -1) cats.push(x.categoria); });

  var chip = function (id, lbl, on) {
    return '<button onclick="corrSetFiltro(\'' + id.replace(/'/g, "\\'") + '\')" style="flex-shrink:0;font-size:.72rem;padding:4px 12px;border-radius:20px;border:1px solid ' +
      (on ? "#1f3a2e" : "rgba(32,36,31,.15)") + ";background:" + (on ? "#1f3a2e" : "rgba(32,36,31,.05)") +
      ";color:" + (on ? "#fff" : "rgba(32,36,31,.55)") + ';font-weight:600;cursor:pointer;font-family:inherit">' + corrEsc(lbl) + "</button>";
  };
  var chipsHtml = chip("todos", "Todos (" + items.length + ")", corrFiltro === "todos") +
    chip("urgentes", "🔴 Urgentes (" + nUrg + ")", corrFiltro === "urgentes") +
    cats.map(function (c) { return chip("cat:" + c, c, corrFiltro === "cat:" + c); }).join("");

  var vis = items.filter(function (x) {
    if (corrFiltro === "todos") return true;
    if (corrFiltro === "urgentes") return x.urgente;
    if (corrFiltro.indexOf("cat:") === 0) return x.categoria === corrFiltro.slice(4);
    return true;
  });

  var pills = function (arr, color) {
    if (!arr || !arr.length) return "";
    return arr.map(function (t) {
      return '<span style="display:inline-block;font-size:.68rem;padding:2px 7px;border-radius:5px;background:' + color +
        "14;color:" + color + ';margin:2px 3px 0 0">' + corrEsc(t) + "</span>";
    }).join("");
  };

  var cards = vis.map(function (x) {
    var d = x.datos || {};
    var catCol = CORR_CAT_COLOR[x.categoria] || "rgba(32,36,31,.5)";
    var prioCol = CORR_PRIO_COLOR[x.prioridad] || "rgba(32,36,31,.45)";
    var datosBits = "";
    if (d.entidad) datosBits += pills([d.entidad], "#378add");
    datosBits += pills(d.montos, "#16a34a");
    datosBits += pills(d.personas, "#6d28d9");
    datosBits += pills(d.nros_referencia, "#92610f");
    datosBits += pills(d.fechas_clave, "#b13a2c");
    return '<div style="border:1px solid ' + (x.urgente ? "#b13a2c55" : "rgba(32,36,31,.12)") + ";border-left:3px solid " + catCol +
        ";border-radius:8px;padding:11px 13px;margin-bottom:9px;background:" + (x.urgente ? "rgba(177,58,44,.04)" : "#fff") + '">' +
      '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
        '<div style="font-weight:700;font-size:.86rem;color:#20241f;line-height:1.3">' + corrEsc(x.asunto || "(sin asunto)") + "</div>" +
        '<div style="flex-shrink:0;display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">' +
          (x.urgente ? corrChip("URGENTE", "#b13a2c", "rgba(177,58,44,.1)") : "") +
          corrChip(x.categoria || "otro", catCol) +
          corrChip(x.prioridad || "media", prioCol) +
        "</div>" +
      "</div>" +
      '<div style="font-size:.7rem;color:rgba(32,36,31,.5);margin:3px 0 6px">' + corrEsc(x.de || "") + " · " + corrFechaCorta(x.fecha) + "</div>" +
      '<div style="font-size:.8rem;color:rgba(32,36,31,.8);line-height:1.45">' + corrEsc(x.tldr || "") + "</div>" +
      (datosBits ? '<div style="margin-top:6px">' + datosBits + "</div>" : "") +
      (x.link ? '<div style="margin-top:7px"><a href="' + escAttr(x.link) + '" target="_blank" rel="noopener" style="font-size:.7rem;font-weight:700;color:#1f3a2e;text-decoration:none">Abrir en Gmail →</a></div>' : "") +
      "</div>";
  }).join("");

  body.innerHTML =
    '<div style="font-size:.68rem;color:rgba(32,36,31,.45);margin-bottom:8px">Resúmenes del analizador de correos de <b>traumatologiaccolon@gmail.com</b>. Solo lectura — se procesan cada 15 min; los urgentes además llegan por mail.</div>' +
    '<div class="adm-sf-wrap" id="corrChipsWrap" style="margin-bottom:12px"><div id="corrChipsScroll" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none">' + chipsHtml + "</div></div>" +
    (vis.length ? cards : '<div style="padding:16px 4px;color:rgba(32,36,31,.45);font-size:.82rem">Sin correos para este filtro.</div>') +
    '<div style="font-size:.7rem;color:rgba(32,36,31,.45);margin-top:10px">' + vis.length + " de " + items.length + " correos" +
      (nUrg ? ' · <span style="color:#b13a2c">' + nUrg + " urgente" + (nUrg > 1 ? "s" : "") + "</span>" : "") +
      (CORREOS_DATA.total > items.length ? " · últimos " + items.length + " de " + CORREOS_DATA.total : "") + "</div>";
  coInitScrollFade("corrChipsScroll", "corrChipsWrap");
}

function corrSetFiltro(f) {
  corrFiltro = f;
  corrRender();
}
