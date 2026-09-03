// ═══════════════════════════════════════════════════════════════════
// presentacion.js — extraído de index.html.
// Pantalla Presentación (dashboard mes a mes) + módulo Premios por
// Desempeño + carga de datos de cirugías (CSV) + charts. Solo definiciones.
// ═══════════════════════════════════════════════════════════════════

// ══════ PRESENTACIÓN (dashboard mes a mes) ═════════════════════════

var presChartInstances = {};

var PRES_GA_SIG = {febrero:"marzo",marzo:"abril",abril:"mayo",mayo:"junio",junio:"julio",julio:"agosto",agosto:"septiembre",septiembre:"octubre",octubre:"noviembre",noviembre:"diciembre"};
function presGastosATotal(mes) {
  var v = GASTOS_A[PRES_GA_SIG[mes]];
  return (v === undefined || v === null) ? null : v;
}

function presCalcMes(mes) {
  var rs = DOCTORES.map(function(d) { return calcularNetoLocal(mes, d); }).filter(function(c) { return c; });
  if (!rs.length) return null;
  var t = { bruto:0, cm:0, neto:0, iibb:0, cpsm:0, ga:0, aporte:0, prestamo:0, prestamoCredito:0 };
  rs.forEach(function(c) {
    t.bruto  += (c.bruto       || 0);
    t.cm     += (c.cm          || 0);
    t.neto   += (c.neto        || 0);
    t.iibb   += (c.iibb        || 0);
    t.cpsm   += (c.cpsm        || 0);
    t.ga     += (c.ga          || 0);
    t.aporte += (c.aporteCeot  || 0);
    if (c.prestamoCasa > 0) t.prestamo += c.prestamoCasa;
    else if (c.prestamoCasa < 0) t.prestamoCredito += -c.prestamoCasa;
  });
  t.brutoTotal    = t.bruto + t.cm;
  t.prestamoNeto  = t.prestamo - t.prestamoCredito;
  t.desc          = t.iibb + t.cpsm + t.ga + t.aporte + t.prestamoNeto;
  t.n             = rs.length;
  t.gastosATotal  = presGastosATotal(mes);
  return t;
}

function presKpi(lbl, val, sub, color) {
  return '<div class="adm-kpi" style="border-left-color:' + color + '">'
    + '<div class="adm-kpi-lbl">' + lbl + '</div>'
    + '<div class="adm-kpi-val">' + val + '</div>'
    + (sub ? '<div class="adm-kpi-sub">' + sub + '</div>' : '')
    + '</div>';
}

function presChartCard(titulo, canvasId, heightPx) {
  heightPx = heightPx || 230;
  return '<div style="background:var(--co-card,#fbf8f0);border:1px solid var(--co-line,#d9d0b8);border-radius:10px;padding:14px">'
    + '<div style="font-size:0.72rem;font-weight:700;color:var(--co-ink-dim,#6b6a5a);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px">' + titulo + '</div>'
    + '<div style="position:relative;height:' + heightPx + 'px"><canvas id="' + canvasId + '"></canvas></div>'
    + '</div>';
}

// ── Cirugías por profesional (fuente: Historial CX, mismo Sheet que historial-cx-ceot.netlify.app) ──

var PRES_MES_NUM = {enero:"01",febrero:"02",marzo:"03",abril:"04",mayo:"05",junio:"06",julio:"07",agosto:"08",septiembre:"09",octubre:"10",noviembre:"11",diciembre:"12"};
var PRES_CX_SID   = "1F4vkoxgKU9GJP_7lDYoZtXTh6hhbXV6cP53fFs5EWGU";
var PRES_CX_PROXY = "https://corsproxy.io/?";
var PRES_CX_DOCS  = ["BRUNI","CORELICH","DEGANUTTI","LABAYEN","TRIVELLINI","GARMENDIA","SOULE","LEON","MAZZOLA","FISSER","GUILERA","DE LA COLINA","PERLASCO"];
var PRES_CX_MESES = {ENERO:1,FEBRERO:2,MARZO:3,ABRIL:4,MAYO:5,JUNIO:6,JULIO:7,AGOSTO:8,SEPTIEMBRE:9,OCTUBRE:10,NOVIEMBRE:11,DICIEMBRE:12};

var presMesActual = null;
var presCxRows    = null;
var presCxLoading = null;

function presCxGet(url) {
  return fetch(url, {cache:"no-cache"}).then(function(r) {
    if (r.ok) return r.text();
    throw new Error("http " + r.status);
  }).catch(function() {
    return fetch(PRES_CX_PROXY + encodeURIComponent(url), {cache:"no-cache"}).then(function(r2) {
      if (!r2.ok) throw new Error("HTTP " + r2.status);
      return r2.text();
    });
  });
}

function presCxParseLine(l) {
  var r = [], f = "", q = false;
  for (var i = 0; i < l.length; i++) {
    var c = l[i];
    if (c === '"') { if (q && l[i+1] === '"') { f += '"'; i++; } else q = !q; }
    else if (c === "," && !q) { r.push(f.trim()); f = ""; }
    else f += c;
  }
  r.push(f.trim());
  return r;
}

function presCxParseCSV(txt) {
  if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
  return txt.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(function(l) { return l.trim(); }).map(presCxParseLine);
}

function presCxNrm(s) { return (s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); }

function presCxParseSectionDate(row) {
  var text = presCxNrm((row[0] || "") + " " + (row[1] || ""));
  var m = text.match(/CIRUG[IÍ]?AS?\s+(\d{1,2})\s+DE\s+([A-Z]+)/);
  if (!m) return null;
  var mon = PRES_CX_MESES[m[2]];
  if (!mon) return null;
  return "2026-" + String(mon).padStart(2, "0") + "-" + String(parseInt(m[1], 10)).padStart(2, "0");
}

function presCxNormDoc(name) {
  if (!name) return "Sin asignar";
  if (name.indexOf("/") !== -1) name = name.split("/")[0].trim();
  var n = presCxNrm(name);
  for (var i = 0; i < PRES_CX_DOCS.length; i++) {
    var d = PRES_CX_DOCS[i];
    if (n === presCxNrm(d)) return d;
    if (n.indexOf(presCxNrm(d)) !== -1) return d;
    var parts = d.split(" ");
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];
      if (p.length >= 4 && n.indexOf(presCxNrm(p).slice(0, 4)) === 0) return d;
    }
  }
  var AM = {CORE:"CORELICH",CORI:"CORELICH",LABA:"LABAYEN",DEGA:"DEGANUTTI",TRIV:"TRIVELLINI",GARM:"GARMENDIA",PERL:"PERLASCO",PIRL:"PERLASCO",BRUN:"BRUNI",MAZZ:"MAZZOLA",MAZA:"MAZZOLA",GUIL:"GUILERA",COLI:"DE LA COLINA",DELA:"DE LA COLINA","DE L":"DE LA COLINA",DLC:"DE LA COLINA",FISS:"FISSER",SOUL:"SOULE",LEON:"LEON"};
  for (var k in AM) { if (n.indexOf(k) === 0 || n.indexOf(" " + k) !== -1) return AM[k]; }
  return "Sin asignar";
}

function presCxDiscoverGids() {
  return presCxGet("https://docs.google.com/spreadsheets/d/" + PRES_CX_SID + "/htmlview").then(function(html) {
    var hits = html.match(/[?&#]gid=(\d+)/g) || [];
    var gids = [];
    hits.forEach(function(h) {
      var g = h.match(/(\d+)/)[1];
      if (gids.indexOf(g) === -1) gids.push(g);
    });
    if (gids.indexOf("") === -1) gids.unshift("");
    return gids;
  }).catch(function() { return [""]; });
}

function presCxParseTab(txt, outArr) {
  var csvRows = presCxParseCSV(txt);
  var ci = null, secDate = null, secBuf = [];
  function flushSection() {
    if (!secBuf.length || !ci) { secBuf = []; return; }
    secBuf.forEach(function(r) {
      var hs = (r[ci.hs] || "").trim();
      if (!hs) return;
      var rawMed = (r[ci.med] || "").trim();
      if (!rawMed || presCxNrm(rawMed) === "MEDICO") return;
      outArr.push({ med: presCxNormDoc(rawMed), pac: (r[ci.pac] || "").trim(), fecha: secDate });
    });
    secBuf = [];
  }
  csvRows.forEach(function(row) {
    if (!row.some(function(c) { return c; })) return;
    var sd = presCxParseSectionDate(row);
    if (sd !== null) { flushSection(); secDate = sd; return; }
    var upper = row.map(function(c) { return (c || "").toUpperCase().trim(); });
    if (upper.indexOf("HS") !== -1 && upper.indexOf("MEDICO") !== -1) {
      ci = { hs: upper.indexOf("HS"), med: upper.indexOf("MEDICO"), pac: upper.indexOf("PACIENTE") };
      return;
    }
    if (!ci) return;
    secBuf.push(row);
  });
  flushSection();
}

function presCxLoadData() {
  if (presCxRows) return Promise.resolve(presCxRows);
  if (presCxLoading) return presCxLoading;
  var allRows = [];
  presCxLoading = presCxDiscoverGids().then(function(gids) {
    var BATCH = 6;
    function fetchBatch(i) {
      if (i >= gids.length) return Promise.resolve();
      var slice = gids.slice(i, i + BATCH);
      var reqs = slice.map(function(gid) {
        var url = "https://docs.google.com/spreadsheets/d/" + PRES_CX_SID + "/export?format=csv" + (gid ? "&gid=" + gid : "");
        return presCxGet(url).catch(function() { return null; });
      });
      return Promise.all(reqs).then(function(texts) {
        texts.forEach(function(txt) { if (txt) presCxParseTab(txt, allRows); });
        return fetchBatch(i + BATCH);
      });
    }
    return fetchBatch(0);
  }).then(function() {
    var seen = {}, dedup = [];
    allRows.forEach(function(r) {
      var k = r.fecha + "|" + r.med + "|" + (r.pac || "").toUpperCase();
      if (seen[k]) return;
      seen[k] = true;
      dedup.push(r);
    });
    presCxRows = dedup;
    presCxLoading = null;
    return presCxRows;
  }).catch(function(err) {
    console.error("CX load error", err);
    presCxRows = [];
    presCxLoading = null;
    return presCxRows;
  });
  return presCxLoading;
}

function presChartCardCx() {
  return '<div style="background:var(--co-card,#fbf8f0);border:1px solid var(--co-line,#d9d0b8);border-radius:10px;padding:14px">'
    + '<div style="font-size:0.72rem;font-weight:700;color:var(--co-ink-dim,#6b6a5a);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px">Cirugías por profesional (mes)</div>'
    + '<div style="position:relative;height:230px">'
    + '<canvas id="presChartCx"></canvas>'
    + '<div id="presChartCxLoading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 10px;color:rgba(32,36,31,.4);font-size:0.72rem">Cargando cirugías…</div>'
    + '</div></div>';
}

function presRenderCxCard(mes) {
  var canvas = document.getElementById("presChartCx");
  var loadingEl = document.getElementById("presChartCxLoading");
  if (!canvas || !presCxRows) return;
  var ym = "2026-" + PRES_MES_NUM[mes];
  var counts = {};
  presCxRows.forEach(function(r) {
    if (!r.fecha || r.fecha.indexOf(ym) !== 0) return;
    counts[r.med] = (counts[r.med] || 0) + 1;
  });
  var entries = Object.keys(counts).map(function(k) { return [k, counts[k]]; }).sort(function(a, b) { return b[1] - a[1]; });

  if (presChartInstances.presChartCx) { presChartInstances.presChartCx.destroy(); delete presChartInstances.presChartCx; }

  if (!entries.length) {
    if (loadingEl) { loadingEl.textContent = "Sin cirugías registradas para este mes."; loadingEl.style.display = "flex"; }
    return;
  }
  if (loadingEl) loadingEl.style.display = "none";

  var wrap = canvas.parentElement;
  if (wrap) wrap.style.height = Math.max(230, entries.length * 32) + "px";

  var dark = document.documentElement.getAttribute("data-theme") === "dark";
  var gridColor = dark ? "rgba(241,237,226,.08)" : "rgba(32,36,31,.08)";
  presChartInstances.presChartCx = new Chart(canvas, {
    type: "bar",
    data: {
      labels: entries.map(function(e) { return e[0]; }),
      datasets: [{ label:"Cirugías", data: entries.map(function(e) { return e[1]; }), backgroundColor:"#1c78b0", borderRadius:4 }]
    },
    options: {
      indexAxis:"y", responsive:true, maintainAspectRatio:false,
      plugins: { legend:{display:false}, tooltip:{ callbacks:{ label:function(ctx) { return ctx.parsed.x + " cirugías"; } } } },
      scales: { x:{ grid:{color:gridColor}, ticks:{stepSize:1} }, y:{ grid:{display:false}, ticks:{ autoSkip:false } } }
    }
  });
}

/* ══════════════════ PREMIOS POR DESEMPEÑO ══════════════════
   Liquidación de premios al personal. Se cobra 2 veces al año (abril y
   octubre); cada liquidación evalúa el promedio de los 6 meses previos.
   Sin backend: estado en localStorage["ceot_premios"].
   Reusa facTextoAPaginas() (pdf.js ya cargado) para importar sueldos. */

var PREM_LS_KEY = "ceot_premios";
var PREM_AV_COLORS = ["#c9933a", "#4f8ef7", "#1d9e75", "#d85a30", "#7f77dd", "#b1483f", "#2563eb", "#0891b2"];

var PREM_VARS_DEFAULT = [
  { campo: "ideas",     label: "Ideas y ejecución", pct: 30 },
  { campo: "turnos",    label: "Turnos dados",      pct: 40 },
  { campo: "encuestas", label: "Encuesta pacientes", pct: 30 }
];

var PREM_ROSTER_DEFAULT = [
  { id: "julieta",   nombre: "Julieta",   ini: "JU", vars: [
      { campo: "ideas",     label: "Ideas y ejecución", pct: 60 },
      { campo: "encuestas", label: "Encuesta pacientes", pct: 40 } ] },
  { id: "laura",     nombre: "Laura",     ini: "LA", vars: null },
  { id: "daniela",   nombre: "Daniela",   ini: "DA", vars: null },
  { id: "elizabeth", nombre: "Elizabeth", ini: "EL", vars: null },
  { id: "paula",     nombre: "Paula",     ini: "PA", vars: null },
  { id: "josefina",  nombre: "Josefina",  ini: "JO", vars: null },
  { id: "marcelo",   nombre: "Marcelo",   ini: "MA", vars: null }
];

var PREM_CONFIG_DEFAULT = {
  fondoModo: "pct", fondoPct: 100, fondoMonto: 0,
  umbralA: 85, umbralB: 70,
  topeA: 120, topeB: 100, topeC: 80,
  redondeo: 1000
};

var premData = null;
var premPeriodoActual = null;
var premChartInstances = {};

var PREM_BTN = "padding:6px 11px;border-radius:8px;border:1px solid var(--co-line,#d9d0b8);background:var(--co-card,#fbf8f0);color:var(--co-ink,#20241f);font-size:0.72rem;font-weight:600;cursor:pointer;font-family:inherit";
var PREM_INP = "padding:5px 7px;border:1px solid var(--co-line,#d9d0b8);border-radius:6px;font-size:0.8rem;font-family:inherit;background:var(--co-card,#fbf8f0);color:var(--co-ink,#20241f);box-sizing:border-box";

function premLoad() {
  if (premData) return premData;
  var raw = null;
  try { raw = localStorage.getItem(PREM_LS_KEY); } catch (e) {}
  if (raw) { try { premData = JSON.parse(raw); } catch (e) { premData = null; } }
  if (!premData) premData = {};
  if (!premData.config) premData.config = {};
  Object.keys(PREM_CONFIG_DEFAULT).forEach(function (k) {
    if (premData.config[k] == null) premData.config[k] = PREM_CONFIG_DEFAULT[k];
  });
  if (!Array.isArray(premData.roster) || !premData.roster.length) {
    premData.roster = JSON.parse(JSON.stringify(PREM_ROSTER_DEFAULT));
  }
  if (!premData.roster.some(function (e) { return e.id === "marcelo"; })) {
    premData.roster.push({ id: "marcelo", nombre: "Marcelo", ini: "MA", vars: null });
  }
  if (!premData.periodos) premData.periodos = {};
  return premData;
}

function premSave() {
  try { localStorage.setItem(PREM_LS_KEY, JSON.stringify(premData)); } catch (e) {}
}

function premVars(emp) { return (emp.vars && emp.vars.length) ? emp.vars : PREM_VARS_DEFAULT; }

function premNorm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function premPeriodosDisponibles() {
  var d = premLoad();
  var set = {};
  Object.keys(d.periodos).forEach(function (k) { set[k] = 1; });
  var y = new Date().getFullYear();
  [(y - 1) + "-10", y + "-04", y + "-10", (y + 1) + "-04"].forEach(function (k) { set[k] = 1; });
  return Object.keys(set).sort();
}

function premPeriodoDefault() {
  var disp = premPeriodosDisponibles();
  var now = new Date();
  var cur = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  var cand = disp.filter(function (k) { return k <= cur; });
  return cand.length ? cand[cand.length - 1] : disp[disp.length - 1];
}

function premPeriodoLabel(pk) {
  var p = pk.split("-");
  var meses = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var m = meses[parseInt(p[1], 10)] || p[1];
  return m.charAt(0).toUpperCase() + m.slice(1) + " " + p[0];
}

function premPeriodoObj(pk) {
  var d = premLoad();
  if (!d.periodos[pk]) d.periodos[pk] = { emp: {} };
  if (!d.periodos[pk].emp) d.periodos[pk].emp = {};
  return d.periodos[pk];
}

function premEmpState(pk, empId) {
  var po = premPeriodoObj(pk);
  if (!po.emp[empId]) po.emp[empId] = { sueldo: 0, crit: {}, asistOk: true };
  var st = po.emp[empId];
  if (st.crit == null) st.crit = {};
  if (st.asistOk == null) st.asistOk = true;
  return st;
}

// valor efectivo de un criterio: promedio de los 6 meses si se cargaron, si no el valor directo
function premCritVal(st, campo) {
  var c = st.crit[campo];
  if (!c) return 50;
  if (c.modo === "meses" && Array.isArray(c.meses)) {
    var vals = c.meses.filter(function (v) { return v !== "" && v != null && !isNaN(v); }).map(Number);
    if (vals.length) return vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
  }
  return (c.val != null ? c.val : 50);
}

function premCritTieneMeses(st, campo) {
  var c = st.crit[campo];
  return !!(c && c.modo === "meses" && (c.meses || []).some(function (v) { return v !== "" && v != null && !isNaN(v); }));
}

function premRound(n, step) {
  step = step || 1;
  return Math.round(n / step) * step;
}

function premCalc(pk) {
  var d = premLoad();
  var cfg = d.config;
  var res = d.roster.map(function (emp) {
    var st = premEmpState(pk, emp.id);
    var score = premVars(emp).reduce(function (sum, v) {
      return sum + premCritVal(st, v.campo) * (v.pct / 100);
    }, 0);
    var level = score >= cfg.umbralA ? "A" : score >= cfg.umbralB ? "B" : "C";
    var topePct = (level === "A" ? cfg.topeA : level === "B" ? cfg.topeB : cfg.topeC) / 100;
    var teorico = st.asistOk ? (score / 100) * topePct * (st.sueldo || 0) : 0;
    return { emp: emp, st: st, score: score, level: level, topePct: topePct, teorico: teorico, sueldo: st.sueldo || 0, asistOk: st.asistOk };
  });
  var totalSueldos = res.reduce(function (a, r) { return a + r.sueldo; }, 0);
  var fondo = cfg.fondoModo === "monto" ? (cfg.fondoMonto || 0) : totalSueldos * (cfg.fondoPct || 0) / 100;
  var totalTeorico = res.reduce(function (a, r) { return a + r.teorico; }, 0);
  var factor = totalTeorico === 0 ? 1 : Math.min(1, fondo / totalTeorico);
  res.forEach(function (r) { r.final = premRound(r.teorico * factor, cfg.redondeo); });
  var totalPagar = res.reduce(function (a, r) { return a + r.final; }, 0);
  return { res: res, totalSueldos: totalSueldos, fondo: fondo, totalTeorico: totalTeorico, factor: factor, totalPagar: totalPagar, cfg: cfg };
}

/* ---------- RENDER (estructura completa; se llama al abrir / cambiar período) ---------- */
function renderPremios(pk) {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  var d = premLoad();
  var disp = premPeriodosDisponibles();
  if (!pk) pk = premPeriodoActual || premPeriodoDefault();
  if (disp.indexOf(pk) === -1) pk = premPeriodoDefault();
  premPeriodoActual = pk;

  var c = premCalc(pk);
  var cont = document.getElementById("adm-content");

  var optHtml = disp.map(function (k) {
    return '<option value="' + k + '"' + (k === pk ? " selected" : "") + '>' + premPeriodoLabel(k) + '</option>';
  }).join("");

  var html = "";
  html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap">'
    + '<div class="adm-sec-title" style="margin:0;border:none;padding:0;color:var(--co-ink,#20241f);opacity:.9">🏆 Premios por Desempeño</div>'
    + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
    +   '<select onchange="renderPremios(this.value)" style="' + PREM_BTN + '">' + optHtml + '</select>'
    +   '<button onclick="premToggleConfig()" style="' + PREM_BTN + '">⚙ Configuración</button>'
    +   '<button onclick="document.getElementById(\'premPdfInput\').click()" style="' + PREM_BTN + '">📄 Importar sueldos (PDF)</button>'
    +   '<button onclick="premExportarCSV()" style="' + PREM_BTN + '">⬇ CSV</button>'
    +   '<button onclick="premImprimirRecibos()" style="' + PREM_BTN + '">🖨 Recibos</button>'
    +   '<input type="file" id="premPdfInput" accept="application/pdf" style="display:none" onchange="premPdfImportar(this.files[0])">'
    + '</div>'
    + '</div>';

  html += '<div style="font-size:0.72rem;color:var(--co-ink-dim,#6b6a5a);margin-bottom:12px">'
    + 'Liquidación de <b>' + premPeriodoLabel(pk) + '</b> — puntajes = promedio de los 6 meses previos. '
    + 'El sueldo bruto de referencia es el del mes de liquidación (o el promedio, a tu criterio).</div>';

  html += premConfigPanelHtml(c.cfg);
  html += '<div id="premKpis">' + premKpisHtml(c) + '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px;margin-top:6px">';
  d.roster.forEach(function (emp, i) { html += premCardHtml(pk, emp, i, c.res[i]); });
  html += '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:14px">'
    + presChartCard("Premio final por empleada", "premChartRanking", Math.max(230, d.roster.length * 30))
    + presChartCard("Reparto del fondo", "premChartReparto")
    + '</div>';

  html += '<div id="premTabla">' + premTablaHtml(pk, c) + '</div>';

  cont.innerHTML = html;
  premInitCharts(c);
  if (window.lucide) lucide.createIcons();
}

/* ---------- REFRESH LIVIANO (no toca inputs, sólo recalcula y repinta lo derivado) ---------- */
function premRefreshLive() {
  var pk = premPeriodoActual;
  var d = premLoad();
  var c = premCalc(pk);
  var k = document.getElementById("premKpis");
  if (k) k.innerHTML = premKpisHtml(c);
  var t = document.getElementById("premTabla");
  if (t) t.innerHTML = premTablaHtml(pk, c);
  d.roster.forEach(function (emp, i) {
    var r = c.res[i];
    var badge = document.getElementById("premBadge_" + emp.id);
    if (badge) badge.outerHTML = premBadgeHtml(emp.id, r);
    var foot = document.getElementById("premFoot_" + emp.id);
    if (foot) foot.innerHTML = premFootInner(r);
    premVars(emp).forEach(function (v) {
      var enMeses = !!(r.st.crit[v.campo] && r.st.crit[v.campo].modo === "meses");
      var cv = document.getElementById("premCV_" + emp.id + "_" + v.campo);
      var val = premCritVal(r.st, v.campo);
      if (cv) cv.innerHTML = val.toFixed(0) + "%" + (enMeses ? ' <span style="color:#c9933a">(prom. 6m)</span>' : "");
      var sl = document.getElementById("premSlider_" + emp.id + "_" + v.campo);
      if (sl) { sl.disabled = enMeses; if (enMeses) sl.value = Math.round(val); }
    });
  });
  premInitCharts(c);
}

function premKpisHtml(c) {
  var factorPct = c.factor * 100;
  return '<div class="adm-kpis" style="flex-wrap:wrap">'
    + presKpi("Fondo disponible", fmt(c.fondo), c.cfg.fondoModo === "monto" ? "monto fijo" : c.cfg.fondoPct + "% de la nómina", "#1f3a2e")
    + presKpi("Total teórico", fmt(c.totalTeorico), "", "#c9933a")
    + presKpi("Total a pagar", fmt(c.totalPagar), "redondeo $" + c.cfg.redondeo, "#16a34a")
    + presKpi("Sueldos brutos", fmt(c.totalSueldos), c.res.filter(function (r) { return r.sueldo > 0; }).length + " con sueldo", "#1c78b0")
    + presKpi("Factor prorrateo", factorPct.toFixed(1) + "%", c.factor < 1 ? "el teórico supera el fondo" : "se paga sin ajuste", c.factor < 1 ? "#dc2626" : "#16a34a")
    + '</div>';
}

function premConfigPanelHtml(cfg) {
  var L = function (txt, inner) { return '<label style="font-size:0.72rem;display:flex;flex-direction:column;gap:3px">' + txt + inner + '</label>'; };
  return '<div id="premConfigPanel" style="display:none;background:var(--co-card,#fbf8f0);border:1px solid var(--co-line,#d9d0b8);border-radius:10px;padding:14px;margin-bottom:14px">'
    + '<div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--co-ink-dim,#6b6a5a);margin-bottom:10px">Configuración (afecta a todos los períodos)</div>'
    + '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">'
    + L("Fondo", '<select id="premCfgFondoModo" onchange="premCfgAplicar()" style="' + PREM_INP + '"><option value="pct"' + (cfg.fondoModo === "pct" ? " selected" : "") + '>% de la nómina</option><option value="monto"' + (cfg.fondoModo === "monto" ? " selected" : "") + '>Monto fijo $</option></select>')
    + L("% nómina", '<input type="number" id="premCfgFondoPct" value="' + cfg.fondoPct + '" min="0" step="5" style="' + PREM_INP + ';width:80px" oninput="premCfgAplicar()">')
    + L("Monto fijo $", '<input type="number" id="premCfgFondoMonto" value="' + cfg.fondoMonto + '" min="0" step="10000" style="' + PREM_INP + ';width:130px" oninput="premCfgAplicar()">')
    + L("Umbral A ≥", '<input type="number" id="premCfgUmbralA" value="' + cfg.umbralA + '" min="0" max="100" style="' + PREM_INP + ';width:70px" oninput="premCfgAplicar()">')
    + L("Umbral B ≥", '<input type="number" id="premCfgUmbralB" value="' + cfg.umbralB + '" min="0" max="100" style="' + PREM_INP + ';width:70px" oninput="premCfgAplicar()">')
    + L("Tope A %", '<input type="number" id="premCfgTopeA" value="' + cfg.topeA + '" min="0" step="5" style="' + PREM_INP + ';width:70px" oninput="premCfgAplicar()">')
    + L("Tope B %", '<input type="number" id="premCfgTopeB" value="' + cfg.topeB + '" min="0" step="5" style="' + PREM_INP + ';width:70px" oninput="premCfgAplicar()">')
    + L("Tope C %", '<input type="number" id="premCfgTopeC" value="' + cfg.topeC + '" min="0" step="5" style="' + PREM_INP + ';width:70px" oninput="premCfgAplicar()">')
    + L("Redondeo $", '<input type="number" id="premCfgRedondeo" value="' + cfg.redondeo + '" min="1" step="100" style="' + PREM_INP + ';width:90px" oninput="premCfgAplicar()">')
    + '</div></div>';
}

function premToggleConfig() {
  var p = document.getElementById("premConfigPanel");
  if (p) p.style.display = p.style.display === "none" ? "block" : "none";
}

function premCfgAplicar() {
  var d = premLoad();
  var g = function (id) { return document.getElementById(id); };
  d.config.fondoModo = g("premCfgFondoModo").value;
  d.config.fondoPct = parseFloat(g("premCfgFondoPct").value) || 0;
  d.config.fondoMonto = parseFloat(g("premCfgFondoMonto").value) || 0;
  d.config.umbralA = parseFloat(g("premCfgUmbralA").value) || 0;
  d.config.umbralB = parseFloat(g("premCfgUmbralB").value) || 0;
  d.config.topeA = parseFloat(g("premCfgTopeA").value) || 0;
  d.config.topeB = parseFloat(g("premCfgTopeB").value) || 0;
  d.config.topeC = parseFloat(g("premCfgTopeC").value) || 0;
  d.config.redondeo = parseFloat(g("premCfgRedondeo").value) || 1;
  premSave();
  premRefreshLive();
}

function premBadgeHtml(empId, r) {
  var inner;
  if (r.sueldo <= 0) inner = '<span style="font-size:0.62rem;color:var(--co-ink-dim,#6b6a5a)">—</span>';
  else if (!r.asistOk) inner = '<span style="font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:20px;background:rgba(220,38,38,.15);color:#dc2626">Sin premio</span>';
  else {
    var bg = r.level === "A" ? "rgba(245,166,35,.18);color:#b26b00" : r.level === "B" ? "rgba(79,142,247,.18);color:#2563eb" : "rgba(100,116,139,.18);color:#475569";
    inner = '<span style="font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:20px;background:' + bg + '">Nivel ' + r.level + '</span>';
  }
  return '<span id="premBadge_' + empId + '">' + inner + '</span>';
}

function premFootInner(r) {
  return '<span style="font-size:0.64rem;color:var(--co-ink-dim,#6b6a5a)">Puntaje <b style="color:var(--co-ink,#20241f);font-size:0.82rem">' + r.score.toFixed(1) + '%</b></span>'
    + '<span style="font-size:0.64rem;color:var(--co-ink-dim,#6b6a5a)">teórico ' + fmt(r.teorico) + ' &nbsp; <b style="color:#16a34a;font-size:0.92rem">' + fmt(r.final) + '</b></span>';
}

function premCardHtml(pk, emp, i, r) {
  var color = PREM_AV_COLORS[i % PREM_AV_COLORS.length];
  var st = r.st;

  var h = '<div style="background:var(--co-card,#fbf8f0);border:1px solid var(--co-line,#d9d0b8);border-radius:10px;padding:12px">'
    + '<div style="display:flex;align-items:center;gap:9px;margin-bottom:10px">'
    +   '<div style="width:30px;height:30px;border-radius:50%;background:' + color + ';color:#fff;font-size:0.72rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + emp.ini + '</div>'
    +   '<span style="font-weight:700;font-size:0.9rem;flex:1">' + emp.nombre + '</span>'
    +   premBadgeHtml(emp.id, r)
    + '</div>';

  h += '<label style="font-size:0.64rem;font-weight:600;text-transform:uppercase;letter-spacing:.3px;color:var(--co-ink-dim,#6b6a5a);display:block;margin-bottom:3px">Sueldo bruto (AR$)</label>'
    + '<input type="number" min="0" step="1000" value="' + (st.sueldo || "") + '" placeholder="0" style="' + PREM_INP + ';width:100%;margin-bottom:8px" '
    + 'oninput="premSetSueldo(\'' + emp.id + '\', this.value)">';

  premVars(emp).forEach(function (v) {
    var usaMeses = !!(st.crit[v.campo] && st.crit[v.campo].modo === "meses");
    var val = premCritVal(st, v.campo);
    h += '<div style="margin-bottom:7px">'
      + '<div style="display:flex;justify-content:space-between;font-size:0.66rem;color:var(--co-ink-dim,#6b6a5a);margin-bottom:2px">'
      +   '<span>' + v.label + ' <b style="color:var(--co-ink,#20241f)">' + v.pct + '%</b></span>'
      +   '<span id="premCV_' + emp.id + '_' + v.campo + '">' + val.toFixed(0) + '%' + (usaMeses ? ' <span style="color:#c9933a">(prom. 6m)</span>' : '') + '</span>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:6px">'
      +   '<input type="range" id="premSlider_' + emp.id + '_' + v.campo + '" min="0" max="100" value="' + Math.round(val) + '" ' + (usaMeses ? "disabled" : "") + ' style="flex:1" oninput="premSetCrit(\'' + emp.id + '\',\'' + v.campo + '\',this.value)">'
      +   '<button style="' + PREM_BTN + ';padding:2px 6px;font-size:0.62rem" onclick="premToggleMeses(\'' + emp.id + '\',\'' + v.campo + '\')">6m</button>'
      + '</div>'
      + premMesesHtml(emp.id, v.campo, st);
    h += '</div>';
  });

  h += '<label style="display:flex;align-items:center;gap:6px;font-size:0.68rem;margin:8px 0 6px;cursor:pointer">'
    + '<input type="checkbox" ' + (st.asistOk ? "checked" : "") + ' onchange="premSetAsist(\'' + emp.id + '\', this.checked)"> Asistencia regular / sin sanción grave</label>';

  h += '<div id="premFoot_' + emp.id + '" style="border-top:1px solid var(--co-line,#d9d0b8);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;align-items:baseline">'
    + premFootInner(r) + '</div>';

  h += '</div>';
  return h;
}

function premMesesHtml(empId, campo, st) {
  var c = st.crit[campo] || {};
  var open = c.modo === "meses";
  var meses = c.meses || ["", "", "", "", "", ""];
  var s = '<div id="premMeses_' + empId + '_' + campo + '" style="display:' + (open ? "flex" : "none") + ';gap:3px;margin-top:4px;flex-wrap:wrap">';
  for (var k = 0; k < 6; k++) {
    s += '<input type="number" min="0" max="100" placeholder="m' + (k + 1) + '" value="' + (meses[k] != null ? meses[k] : "") + '" '
      + 'style="' + PREM_INP + ';width:44px;padding:3px 4px;font-size:0.68rem" '
      + 'oninput="premSetMes(\'' + empId + '\',\'' + campo + '\',' + k + ',this.value)">';
  }
  s += '</div>';
  return s;
}

/* ---------- MUTACIONES ---------- */
function premSetSueldo(empId, val) {
  premEmpState(premPeriodoActual, empId).sueldo = parseFloat(val) || 0;
  premSave(); premRefreshLive();
}
function premSetCrit(empId, campo, val) {
  premEmpState(premPeriodoActual, empId).crit[campo] = { modo: "directo", val: parseFloat(val) || 0 };
  premSave(); premRefreshLive();
}
function premSetMes(empId, campo, idx, val) {
  var st = premEmpState(premPeriodoActual, empId);
  var c = st.crit[campo];
  if (!c || c.modo !== "meses") c = { modo: "meses", meses: ["", "", "", "", "", ""] };
  c.meses[idx] = (val === "" ? "" : (parseFloat(val) || 0));
  st.crit[campo] = c;
  premSave(); premRefreshLive();
}
function premToggleMeses(empId, campo) {
  var st = premEmpState(premPeriodoActual, empId);
  var c = st.crit[campo];
  if (c && c.modo === "meses") {
    st.crit[campo] = { modo: "directo", val: Math.round(premCritVal(st, campo)) };
  } else {
    st.crit[campo] = { modo: "meses", meses: ["", "", "", "", "", ""] };
  }
  premSave(); renderPremios(premPeriodoActual);
}
function premSetAsist(empId, ok) {
  premEmpState(premPeriodoActual, empId).asistOk = !!ok;
  premSave(); premRefreshLive();
}

/* ---------- TABLA ---------- */
function premTablaHtml(pk, c) {
  var thS = "text-align:left;padding:6px 8px;font-size:0.62rem;text-transform:uppercase;letter-spacing:.3px;color:var(--co-ink-dim,#6b6a5a);border-bottom:1px solid var(--co-line,#d9d0b8)";
  var tdS = "padding:6px 8px;font-size:0.76rem;border-bottom:1px solid var(--co-line,#d9d0b8)";
  var h = '<div style="margin-top:16px;background:var(--co-card,#fbf8f0);border:1px solid var(--co-line,#d9d0b8);border-radius:10px;padding:12px;overflow-x:auto">'
    + '<div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--co-ink-dim,#6b6a5a);margin-bottom:8px">Liquidación · ' + premPeriodoLabel(pk) + '</div>'
    + '<table style="width:100%;border-collapse:collapse;min-width:620px">'
    + '<tr><th style="' + thS + '">Empleada</th><th style="' + thS + '">Sueldo</th><th style="' + thS + '">Puntaje</th><th style="' + thS + '">Nivel</th><th style="' + thS + '">Tope</th><th style="' + thS + '">Teórico</th><th style="' + thS + '">Premio final</th><th style="' + thS + '">% s/sueldo</th></tr>';
  c.res.forEach(function (r) {
    var pct = r.sueldo > 0 ? (r.final / r.sueldo * 100).toFixed(1) + "%" : "—";
    h += '<tr>'
      + '<td style="' + tdS + '">' + r.emp.nombre + '</td>'
      + '<td style="' + tdS + '">' + (r.sueldo > 0 ? fmt(r.sueldo) : "—") + '</td>'
      + '<td style="' + tdS + '">' + (r.sueldo > 0 ? r.score.toFixed(1) + "%" : "—") + '</td>'
      + '<td style="' + tdS + '">' + (r.sueldo > 0 ? (r.asistOk ? "Nivel " + r.level : "Sin premio") : "—") + '</td>'
      + '<td style="' + tdS + '">' + (r.sueldo > 0 && r.asistOk ? Math.round(r.topePct * 100) + "%" : "—") + '</td>'
      + '<td style="' + tdS + '">' + (r.sueldo > 0 ? fmt(r.teorico) : "—") + '</td>'
      + '<td style="' + tdS + ';color:#16a34a;font-weight:600">' + (r.sueldo > 0 ? fmt(r.final) : "—") + '</td>'
      + '<td style="' + tdS + '">' + pct + '</td>'
      + '</tr>';
  });
  var totPct = c.totalSueldos > 0 ? (c.totalPagar / c.totalSueldos * 100).toFixed(1) + "%" : "—";
  h += '<tr>'
    + '<td style="' + tdS + ';font-weight:700">TOTAL</td>'
    + '<td style="' + tdS + ';font-weight:700">' + fmt(c.totalSueldos) + '</td>'
    + '<td style="' + tdS + '" colspan="3"></td>'
    + '<td style="' + tdS + ';font-weight:700">' + fmt(c.totalTeorico) + '</td>'
    + '<td style="' + tdS + ';font-weight:700;color:#16a34a">' + fmt(c.totalPagar) + '</td>'
    + '<td style="' + tdS + '">' + totPct + '</td>'
    + '</tr>';
  h += '</table></div>';
  return h;
}

/* ---------- CHARTS ---------- */
function premInitCharts(c) {
  ["premChartRanking", "premChartReparto"].forEach(function (id) {
    if (premChartInstances[id]) { premChartInstances[id].destroy(); delete premChartInstances[id]; }
  });
  if (!window.Chart) return;
  var dark = document.documentElement.getAttribute("data-theme") === "dark";
  var gridColor = dark ? "rgba(241,237,226,.08)" : "rgba(32,36,31,.08)";
  Chart.defaults.color = dark ? "rgba(241,237,226,.75)" : "#20241f";

  var conSueldo = c.res.filter(function (r) { return r.sueldo > 0; });

  var rk = document.getElementById("premChartRanking");
  if (rk) {
    premChartInstances.premChartRanking = new Chart(rk, {
      type: "bar",
      data: {
        labels: conSueldo.map(function (r) { return r.emp.nombre; }),
        datasets: [{ label: "Premio final", data: conSueldo.map(function (r) { return r.final; }), backgroundColor: "#16a34a", borderRadius: 4 }]
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (x) { return fmt(x.parsed.x); } } } },
        scales: { x: { grid: { color: gridColor }, ticks: { callback: function (v) { return fmt(v); } } }, y: { grid: { display: false }, ticks: { autoSkip: false } } }
      }
    });
  }

  var rp = document.getElementById("premChartReparto");
  if (rp) {
    var conPremio = conSueldo.filter(function (r) { return r.final > 0; });
    premChartInstances.premChartReparto = new Chart(rp, {
      type: "doughnut",
      data: {
        labels: conPremio.map(function (r) { return r.emp.nombre; }),
        datasets: [{ data: conPremio.map(function (r) { return r.final; }), backgroundColor: conPremio.map(function (r) { return PREM_AV_COLORS[c.res.indexOf(r) % PREM_AV_COLORS.length]; }) }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { callbacks: { label: function (x) { return x.label + ": " + fmt(x.parsed); } } } }
      }
    });
  }
}

/* ---------- EXPORT CSV ---------- */
function premExportarCSV() {
  var pk = premPeriodoActual;
  var c = premCalc(pk);
  var rows = [["Empleada", "Sueldo bruto", "Detalle criterios", "Puntaje", "Nivel", "Tope %", "Teorico", "Premio final", "% s/sueldo"]];
  c.res.forEach(function (r) {
    var detalle = premVars(r.emp).map(function (v) {
      return v.label + " (" + v.pct + "%): " + premCritVal(r.st, v.campo).toFixed(0);
    }).join(" | ");
    rows.push([
      r.emp.nombre, r.sueldo,
      '"' + detalle + '"',
      r.score.toFixed(1) + "%",
      r.asistOk ? "Nivel " + r.level : "Sin premio",
      r.asistOk ? Math.round(r.topePct * 100) : 0,
      r.teorico.toFixed(2), r.final.toFixed(2),
      r.sueldo > 0 ? (r.final / r.sueldo * 100).toFixed(1) + "%" : "-"
    ]);
  });
  rows.push(["TOTAL", c.totalSueldos.toFixed(2), "", "", "", "", c.totalTeorico.toFixed(2), c.totalPagar.toFixed(2), ""]);
  var csv = rows.map(function (r) { return r.join(","); }).join("\n");
  var a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent("﻿" + csv);
  a.download = "CEOT_Premios_" + pk + ".csv";
  a.click();
}

/* ---------- RECIBOS ---------- */
function premImprimirRecibos() {
  var pk = premPeriodoActual;
  var c = premCalc(pk);
  var css = '.pr{font-family:"Segoe UI",Arial,sans-serif;color:#111;padding:1.4cm 2cm;width:21cm;box-sizing:border-box;page-break-after:always}'
    + '.pr:last-child{page-break-after:avoid}'
    + '.pr h1{font-size:13pt;text-align:center;border-bottom:2px solid #111;padding-bottom:6px;margin:0 0 4px}'
    + '.pr .sub{text-align:center;font-size:9pt;color:#555;margin-bottom:14px}'
    + '.pr table{width:100%;border-collapse:collapse;font-size:10pt}'
    + '.pr td{padding:5px 8px;border:1px solid #ccc}'
    + '.pr .tot td{font-weight:700;font-size:12pt;border-top:2px solid #111}'
    + '.pr .firma{margin-top:60px;display:flex;justify-content:space-around;font-size:9pt;text-align:center}';
  var body = "";
  c.res.forEach(function (r) {
    if (r.sueldo <= 0) return;
    body += '<div class="pr"><h1>CEOT · Premio por Desempeño</h1>'
      + '<div class="sub">Clínica de Traumatología Colón — ' + premPeriodoLabel(pk) + '</div>'
      + '<table>'
      + '<tr><td>Empleada</td><td>' + r.emp.nombre + '</td></tr>'
      + '<tr><td>Sueldo bruto de referencia</td><td>' + fmt(r.sueldo) + '</td></tr>'
      + '<tr><td>Puntaje (promedio 6 meses)</td><td>' + r.score.toFixed(1) + '%</td></tr>'
      + '<tr><td>Nivel alcanzado</td><td>' + (r.asistOk ? "Nivel " + r.level + " (tope " + Math.round(r.topePct * 100) + "%)" : "Sin premio — asistencia/sanción") + '</td></tr>'
      + '<tr><td>Premio teórico</td><td>' + fmt(r.teorico) + '</td></tr>'
      + '<tr><td>Factor de prorrateo</td><td>' + (c.factor * 100).toFixed(1) + '%</td></tr>'
      + '<tr class="tot"><td>PREMIO A COBRAR</td><td>' + fmt(r.final) + '</td></tr>'
      + '</table>'
      + '<div class="firma"><div>_______________________<br>Firma empleada</div><div>_______________________<br>Firma CEOT</div></div>'
      + '</div>';
  });
  if (!body) { alert("No hay empleadas con sueldo cargado."); return; }
  var w = window.open("", "_blank", "width=900,height=700");
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recibos Premios ' + pk + '</title><style>' + css + '</style></head><body>' + body + '<' + 'script>window.onload=function(){window.print()}<' + '/script></body></html>');
  w.document.close();
}

/* ---------- IMPORT PDF ---------- */
async function premPdfImportar(file) {
  if (!file) return;
  if (!window.pdfjsLib) { alert("pdf.js no está disponible."); return; }
  var lineas;
  try { lineas = await facTextoAPaginas(file); }
  catch (e) { alert("No se pudo leer el PDF: " + e.message); return; }

  var d = premLoad();
  var reMonto = /\$?\s*\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\$?\s*\d+,\d{2}/g;
  var montosDe = function (txt) {
    var ms = (txt || "").match(reMonto);
    if (!ms) return [];
    return ms.map(function (x) { return parsearMontoImp(x); }).filter(function (v) { return v > 1000; });
  };
  var detect = d.roster.map(function (emp) {
    var nn = premNorm(emp.nombre);
    var hit = null, hitLinea = "";
    for (var k = 0; k < lineas.length; k++) {
      if (premNorm(lineas[k]).indexOf(nn) === -1) continue;
      hitLinea = lineas[k];
      // montos de la MISMA línea (nunca de la siguiente, para no tomar el de otra persona)
      var vals = montosDe(lineas[k]);
      if (!vals.length) vals = montosDe(lineas[k + 1] || ""); // sólo si esta línea no tiene ninguno
      if (vals.length) { hit = Math.max.apply(null, vals); break; }
    }
    return { emp: emp, val: hit, linea: hitLinea };
  });

  var rowsHtml = detect.map(function (x) {
    var ok = x.val != null;
    return '<tr style="' + (ok ? "" : "background:rgba(245,166,35,.12)") + '">'
      + '<td style="padding:5px 8px;border-bottom:1px solid var(--co-line,#d9d0b8)">' + x.emp.nombre + '</td>'
      + '<td style="padding:5px 8px;border-bottom:1px solid var(--co-line,#d9d0b8);font-size:0.68rem;color:var(--co-ink-dim,#6b6a5a);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (x.linea ? x.linea.replace(/</g, "&lt;") : "<i>sin coincidencia</i>") + '</td>'
      + '<td style="padding:5px 8px;border-bottom:1px solid var(--co-line,#d9d0b8)"><input type="number" min="0" step="1000" data-emp="' + x.emp.id + '" class="premPdfVal" value="' + (ok ? x.val : "") + '" style="' + PREM_INP + ';width:120px"></td>'
      + '</tr>';
  }).join("");

  var ov = document.createElement("div");
  ov.id = "premPdfOverlay";
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px";
  ov.innerHTML = '<div style="background:var(--co-bg,#f2ecda);border:1px solid var(--co-line,#d9d0b8);border-radius:12px;padding:18px;max-width:640px;width:100%;max-height:85vh;overflow:auto;color:var(--co-ink,#20241f)">'
    + '<div style="font-weight:700;font-size:0.95rem;margin-bottom:4px">Sueldos detectados en el PDF</div>'
    + '<div style="font-size:0.72rem;color:var(--co-ink-dim,#6b6a5a);margin-bottom:12px">Revisá y corregí lo que haga falta. Se aplican al período <b>' + premPeriodoLabel(premPeriodoActual) + '</b>. Las filas amarillas no se encontraron.</div>'
    + '<table style="width:100%;border-collapse:collapse;font-size:0.8rem"><tr><th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--co-line,#d9d0b8);font-size:0.62rem;text-transform:uppercase;color:var(--co-ink-dim,#6b6a5a)">Empleada</th><th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--co-line,#d9d0b8);font-size:0.62rem;text-transform:uppercase;color:var(--co-ink-dim,#6b6a5a)">Línea del PDF</th><th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--co-line,#d9d0b8);font-size:0.62rem;text-transform:uppercase;color:var(--co-ink-dim,#6b6a5a)">Sueldo bruto</th></tr>' + rowsHtml + '</table>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">'
    +   '<button style="' + PREM_BTN + '" onclick="document.getElementById(\'premPdfOverlay\').remove()">Cancelar</button>'
    +   '<button style="' + PREM_BTN + ';background:#16a34a;color:#fff;border-color:#16a34a" onclick="premPdfAplicar()">Aplicar</button>'
    + '</div></div>';
  document.body.appendChild(ov);
  var inp = document.getElementById("premPdfInput");
  if (inp) inp.value = "";
}

function premPdfAplicar() {
  var inputs = document.querySelectorAll(".premPdfVal");
  inputs.forEach(function (inp) {
    var v = parseFloat(inp.value);
    if (!isNaN(v) && v > 0) premEmpState(premPeriodoActual, inp.getAttribute("data-emp")).sueldo = v;
  });
  premSave();
  var ov = document.getElementById("premPdfOverlay");
  if (ov) ov.remove();
  renderPremios(premPeriodoActual);
}


function renderPresentacion(mes) {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  var MESES_ORD = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  MESES_ORD.forEach(function(p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });

  var container = document.getElementById("adm-content");
  var disponibles = MESES_ORD.map(function(m) { return { mes:m, tt: presCalcMes(m) }; }).filter(function(x) { return x.tt; });

  // El mes calendario en curso se agrega igual aunque todavía no haya cheques
  // Colón importados (datos financieros) — así se puede ver el avance de
  // cirugías del mes (parcial, día a día) sin esperar al cierre financiero.
  var mesReal = MESES_ORD[new Date().getMonth()];
  if (!disponibles.some(function(x) { return x.mes === mesReal; })) {
    disponibles.push({ mes: mesReal, tt: null });
  }

  if (!disponibles.length) {
    container.innerHTML = '<div class="adm-sec-title">Presentación</div>'
      + '<div style="padding:24px;color:rgba(32,36,31,.35);font-size:0.85rem">Sin datos disponibles todavía.</div>';
    return;
  }

  var idx = disponibles.findIndex(function(x) { return x.mes === mes; });
  if (idx === -1) idx = disponibles.length - 1;
  mes = disponibles[idx].mes;
  presMesActual = mes;
  var sinFinanciero = !disponibles[idx].tt;
  var tt = disponibles[idx].tt || { bruto:0, cm:0, neto:0, iibb:0, cpsm:0, ga:0, aporte:0, prestamo:0, prestamoCredito:0, brutoTotal:0, prestamoNeto:0, desc:0, n:0, gastosATotal:null };

  var rows = DOCTORES.map(function(d) { return { doc:d, calc: calcularNetoLocal(mes, d) }; }).filter(function(r) { return r.calc; });
  rows.sort(function(a, b) { return b.calc.neto - a.calc.neto; });

  var cap = function(s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var btnStyle = "padding:6px 12px;border-radius:8px;border:1px solid var(--co-line,#d9d0b8);background:var(--co-card,#fbf8f0);color:var(--co-ink,#20241f);font-size:0.72rem;font-weight:600;cursor:pointer";
  var prevMes = idx > 0 ? disponibles[idx - 1].mes : null;
  var nextMes = idx < disponibles.length - 1 ? disponibles[idx + 1].mes : null;
  var prevBtn = prevMes
    ? '<button onclick="renderPresentacion(\'' + prevMes + '\')" style="' + btnStyle + '">‹ ' + cap(prevMes) + '</button>'
    : '<button disabled style="' + btnStyle + ';opacity:.3;cursor:default">‹ Anterior</button>';
  var nextBtn = nextMes
    ? '<button onclick="renderPresentacion(\'' + nextMes + '\')" style="' + btnStyle + '">' + cap(nextMes) + ' ›</button>'
    : '<button disabled style="' + btnStyle + ';opacity:.3;cursor:default">Siguiente ›</button>';

  var html = "";
  html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap">'
    + '<div class="adm-sec-title" style="margin:0;border:none;padding:0">📊 Presentación · ' + cap(mes) + ' 2026</div>'
    + '<div style="display:flex;gap:6px">' + prevBtn + nextBtn + '</div>'
    + '</div>';

  if (!window.Chart) {
    html += '<div style="padding:8px 10px;margin-bottom:10px;border-radius:8px;background:rgba(220,38,38,.08);color:#dc2626;font-size:0.72rem">⚠ No se pudo cargar la librería de gráficos (revisá la conexión). Se muestran solo los totales.</div>';
  }
  if (sinFinanciero) {
    html += '<div style="padding:8px 10px;margin-bottom:10px;border-radius:8px;background:rgba(28,120,176,.08);color:#1c78b0;font-size:0.72rem">ℹ Mes en curso — todavía no hay cheques Colón importados, así que los totales financieros están vacíos. Las cirugías sí se muestran (parciales, día a día).</div>';
  }

  html += '<div class="adm-kpis" style="flex-wrap:wrap">'
    + presKpi('Bruto total', fmt(tt.brutoTotal), rows.length + ' profesionales', '#1f3a2e')
    + presKpi('Descuentos', fmt(tt.desc), (tt.brutoTotal > 0 ? Math.round(tt.desc / tt.brutoTotal * 100) : 0) + '% del bruto', '#dc2626')
    + presKpi('Neto distribuido', fmt(tt.neto), '', '#16a34a')
    + presKpi('Promedio por socio', fmt(rows.length ? tt.neto / rows.length : 0), '', '#1c78b0')
    + presKpi('Gastos A (mes)', tt.gastosATotal != null ? fmt(tt.gastosATotal) : '—', '', '#b1483f')
    + '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:6px">'
    + presChartCard('Ranking por profesional', 'presChartRanking', Math.max(230, rows.length * 32))
    + presChartCard('Evolución mensual (Bruto vs. Neto)', 'presChartEvolucion')
    + presChartCard('Composición de descuentos', 'presChartComposicion')
    + presChartCard('Gastos A — evolución mensual', 'presChartGastosA')
    + presChartCardCx()
    + '</div>';

  container.innerHTML = html;
  presInitCharts(mes, rows, tt, disponibles);
}

function presInitCharts(mes, rows, tt, disponibles) {
  ['presChartRanking', 'presChartEvolucion', 'presChartComposicion', 'presChartGastosA'].forEach(function(id) {
    if (presChartInstances[id]) { presChartInstances[id].destroy(); delete presChartInstances[id]; }
  });
  if (!window.Chart) return;

  var dark = document.documentElement.getAttribute('data-theme') === 'dark';
  var inkColor  = dark ? 'rgba(241,237,226,.75)' : '#20241f';
  var gridColor = dark ? 'rgba(241,237,226,.08)' : 'rgba(32,36,31,.08)';
  Chart.defaults.color = inkColor;
  Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";

  var rkCanvas = document.getElementById('presChartRanking');
  if (rkCanvas) {
    presChartInstances.presChartRanking = new Chart(rkCanvas, {
      type: 'bar',
      data: {
        labels: rows.map(function(r) { return r.doc.apellido; }),
        datasets: [{ label:'Neto', data: rows.map(function(r) { return r.calc.neto; }), backgroundColor:'#1f3a2e', borderRadius:4 }]
      },
      options: {
        indexAxis: 'y', responsive:true, maintainAspectRatio:false,
        plugins: { legend:{display:false}, tooltip:{ callbacks:{ label:function(ctx){ return fmt(ctx.parsed.x); } } } },
        scales: { x:{ grid:{color:gridColor}, ticks:{ callback:function(v){ return fmt(v); } } }, y:{ grid:{display:false}, ticks:{ autoSkip:false } } }
      }
    });
  }

  var evCanvas = document.getElementById('presChartEvolucion');
  if (evCanvas) {
    var labels = disponibles.map(function(x) { return x.mes.charAt(0).toUpperCase() + x.mes.slice(1,3); });
    presChartInstances.presChartEvolucion = new Chart(evCanvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label:'Bruto', data: disponibles.map(function(x){ return x.tt ? x.tt.brutoTotal : null; }), borderColor:'#c9933a', backgroundColor:'rgba(201,147,58,.15)', tension:.3, fill:true },
          { label:'Neto',  data: disponibles.map(function(x){ return x.tt ? x.tt.neto : null; }),       borderColor:'#1f3a2e', backgroundColor:'rgba(31,58,46,.15)', tension:.3, fill:true }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins: { legend:{ position:'bottom', labels:{ boxWidth:10, font:{size:10} } }, tooltip:{ callbacks:{ label:function(ctx){ return ctx.dataset.label + ': ' + fmt(ctx.parsed.y); } } } },
        scales: { x:{ grid:{display:false} }, y:{ grid:{color:gridColor}, ticks:{ callback:function(v){ return fmt(v); } } } }
      }
    });
  }

  var coCanvas = document.getElementById('presChartComposicion');
  if (coCanvas) {
    var comp = [
      { l:'IIBB',                 v:tt.iibb,         c:'#c9933a' },
      { l:'CPSM',                 v:tt.cpsm,         c:'#7f77dd' },
      { l:'Gastos A',             v:tt.ga,           c:'#b1483f' },
      { l:'Retención Ganancias',  v:tt.aporte,       c:'#d85a30' },
      { l:'Préstamo Casa',        v:tt.prestamoNeto, c:'#6b6a5a' }
    ].filter(function(x) { return x.v > 0; });
    presChartInstances.presChartComposicion = new Chart(coCanvas, {
      type: 'doughnut',
      data: { labels: comp.map(function(x){return x.l;}), datasets:[{ data: comp.map(function(x){return x.v;}), backgroundColor: comp.map(function(x){return x.c;}), borderWidth:0 }] },
      options: {
        responsive:true, maintainAspectRatio:false, cutout:'62%',
        plugins: { legend:{ position:'bottom', labels:{ boxWidth:10, font:{size:9.5} } }, tooltip:{ callbacks:{ label:function(ctx){ return ctx.label + ': ' + fmt(ctx.parsed); } } } }
      }
    });
  }

  var gaCanvas = document.getElementById('presChartGastosA');
  if (gaCanvas) {
    var gaLabels = disponibles.map(function(x) { return x.mes.charAt(0).toUpperCase() + x.mes.slice(1,3); });
    presChartInstances.presChartGastosA = new Chart(gaCanvas, {
      type: 'bar',
      data: {
        labels: gaLabels,
        datasets: [{ label:'Gastos A', data: disponibles.map(function(x){ return x.tt ? x.tt.gastosATotal : null; }), backgroundColor:'#b1483f', borderRadius:4 }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins: { legend:{display:false}, tooltip:{ callbacks:{ label:function(ctx){ return ctx.parsed.y != null ? fmt(ctx.parsed.y) : 'Sin dato'; } } } },
        scales: { x:{ grid:{display:false} }, y:{ grid:{color:gridColor}, ticks:{ callback:function(v){ return fmt(v); } } } }
      }
    });
  }

  if (document.getElementById('presChartCx')) {
    if (presCxRows) {
      presRenderCxCard(mes);
    } else {
      presCxLoadData().then(function() {
        if (presMesActual === mes) presRenderCxCard(mes);
      });
    }
  }
}

