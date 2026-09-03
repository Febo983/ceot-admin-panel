// ═══════════════════════════════════════════════════════════════════
// estadisticas.js — módulo "Estadísticas CEOT".
//   · renderEstadisticasCeot()  — panel admin (#adm-content)
//   · renderEstadisticasProf()  — portal profesional (#pane-estadisticas)
//   · estImportarExcel()        — carga del Excel mensual de consultas
// Semilla en js/estadisticas-datos.js (EST_SEED). Los meses nuevos se
// guardan en EST_IMPORT y se sincronizan entre PCs con syncPush/syncPull
// (clave "ceot_estadisticas_import"), igual que el resto del panel.
// ═══════════════════════════════════════════════════════════════════

var EST_IMPORT = { consultas: {}, cirugias: {} };
var estChartInstances = {};
var estVista      = "consultas";   // "consultas" | "cirugias"
var estImpPreview = null;           // preview pendiente de confirmar
var estProfCtx    = null;           // datos para (re)dibujar los charts del portal

function estN(n) { return (n == null || n === "") ? "—" : Number(n).toLocaleString("es-AR"); }
function estPct(n) { return (Math.round(n * 1000) / 10).toLocaleString("es-AR") + "%"; }
function estCap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// ── Estado sincronizado ───────────────────────────────────────────
function estCargar(onDone) {
  try {
    var raw = localStorage.getItem("ceot_estadisticas_import");
    var o = raw ? JSON.parse(raw) : null;
    EST_IMPORT = (o && typeof o === "object") ? o : { consultas: {}, cirugias: {} };
  } catch (e) { EST_IMPORT = { consultas: {}, cirugias: {} }; }
  if (!EST_IMPORT.consultas) EST_IMPORT.consultas = {};
  if (!EST_IMPORT.cirugias)  EST_IMPORT.cirugias  = {};
  syncPull("ceot_estadisticas_import", function () {
    estCargar();
    if (onDone) onDone();
  });
  if (onDone) onDone();
}
function estGuardar() {
  try {
    localStorage.setItem("ceot_estadisticas_import", JSON.stringify(EST_IMPORT));
    syncPush("ceot_estadisticas_import");
  } catch (e) {}
}

// ── Consolidación semilla + importado (año 2026) ──────────────────
function estConsMatriz2026() {
  var out = {};
  EST_MEDICOS.forEach(function (m) { out[m.key] = new Array(12).fill(null); });
  var seed = EST_SEED.consultas.porProf2026;
  Object.keys(seed).forEach(function (k) {
    if (!out[k]) out[k] = new Array(12).fill(null);
    for (var i = 0; i < seed[k].length; i++) out[k][i] = seed[k][i];
  });
  Object.keys(EST_IMPORT.consultas || {}).forEach(function (ym) {
    var mm = parseInt(ym.split("-")[1], 10) - 1;
    if (isNaN(mm) || mm < 0 || mm > 11) return;
    var obj = EST_IMPORT.consultas[ym] || {};
    Object.keys(obj).forEach(function (k) {
      if (k === "_total" || k === "_ts") return;
      if (!out[k]) out[k] = new Array(12).fill(null);
      out[k][mm] = obj[k];
    });
  });
  return out;
}
function estCxMatriz2026() {
  var out = {};
  var seed = EST_SEED.cirugias.porCirujano2026;
  Object.keys(seed).forEach(function (k) {
    out[k] = new Array(12).fill(null);
    for (var i = 0; i < seed[k].length; i++) out[k][i] = seed[k][i];
  });
  Object.keys(EST_IMPORT.cirugias || {}).forEach(function (ym) {
    var mm = parseInt(ym.split("-")[1], 10) - 1;
    if (isNaN(mm) || mm < 0 || mm > 11) return;
    var obj = EST_IMPORT.cirugias[ym] || {};
    Object.keys(obj).forEach(function (k) {
      if (k.charAt(0) === "_") return;
      if (!out[k]) out[k] = new Array(12).fill(null);
      out[k][mm] = obj[k];
    });
  });
  return out;
}
// Total del servicio por mes (2026): suma de la matriz por columna.
function estTotalPorMes(mat) {
  var t = new Array(12).fill(null);
  for (var m = 0; m < 12; m++) {
    var s = null;
    Object.keys(mat).forEach(function (k) {
      var v = mat[k][m];
      if (v != null) s = (s || 0) + v;
    });
    t[m] = s;
  }
  return t;
}
function estMesesConDato(totMes) {
  var out = [];
  for (var m = 0; m < 12; m++) if (totMes[m] != null) out.push(m);
  return out;
}
function estOrigenMes(tipo, mm) {
  var ym = "2026-" + String(mm + 1).padStart(2, "0");
  if (EST_IMPORT[tipo] && EST_IMPORT[tipo][ym]) return "importado";
  if (tipo === "consultas" && mm <= EST_SEED_HASTA_MES) return "semilla";
  if (tipo === "cirugias"  && mm <= EST_SEED_HASTA_MES) return "semilla";
  return null;
}

// ══════ ADMIN ═════════════════════════════════════════════════════
function renderEstadisticasCeot(vista) {
  if (typeof cerrarAdmSidenav === "function") cerrarAdmSidenav();
  if (typeof admDesactivarSidebar === "function") admDesactivarSidebar();
  EST_MESES.forEach(function (p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });
  var sb = document.getElementById("adm-sidenav-estadisticas");
  if (sb) sb.className = "adm-sidenav-btn active";

  estVista = (vista === "cirugias" || vista === "consultas") ? vista : estVista;

  var cont = document.getElementById("adm-content");
  if (!cont) return;

  estCargar(function () {
    if (document.getElementById("estRoot")) estPintarAdmin();
  });
  estPintarAdmin();
}

function estBtnVista(v, txt) {
  var on = estVista === v;
  return '<button onclick="renderEstadisticasCeot(\'' + v + '\')" style="'
    + 'padding:7px 16px;border-radius:9px;border:1px solid ' + (on ? '#1f3a2e' : 'var(--co-line,#d9d0b8)')
    + ';background:' + (on ? '#1f3a2e' : 'var(--co-card,#fbf8f0)') + ';color:' + (on ? '#fff' : 'var(--co-ink,#20241f)')
    + ';font-size:0.78rem;font-weight:700;cursor:pointer">' + txt + '</button>';
}

function estCardWrap(titulo, inner, extra) {
  return '<div style="background:var(--co-card,#fbf8f0);border:1px solid var(--co-line,#d9d0b8);border-radius:10px;padding:14px">'
    + '<div style="font-size:0.72rem;font-weight:700;color:var(--co-ink-dim,#6b6a5a);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px">' + titulo + (extra || "") + '</div>'
    + inner + '</div>';
}
function estChartCard(titulo, canvasId, heightPx) {
  return estCardWrap(titulo, '<div style="position:relative;height:' + (heightPx || 240) + 'px"><canvas id="' + canvasId + '"></canvas></div>');
}
function estKpi(lbl, val, sub, color) {
  return '<div class="adm-kpi" style="border-left-color:' + color + '">'
    + '<div class="adm-kpi-lbl">' + lbl + '</div>'
    + '<div class="adm-kpi-val">' + val + '</div>'
    + (sub ? '<div class="adm-kpi-sub">' + sub + '</div>' : '')
    + '</div>';
}

function estPintarAdmin() {
  var cont = document.getElementById("adm-content");
  if (!cont) return;

  var html = '<div id="estRoot">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap">'
    + '<div class="adm-sec-title" style="margin:0;border:none;padding:0">📈 Estadísticas CEOT</div>'
    + '<div style="display:flex;gap:6px">' + estBtnVista("consultas", "Consultas") + estBtnVista("cirugias", "Cirugías") + '</div>'
    + '</div>';

  if (!window.Chart) {
    html += '<div style="padding:8px 10px;margin-bottom:10px;border-radius:8px;background:rgba(220,38,38,.08);color:#dc2626;font-size:0.72rem">⚠ No se pudo cargar la librería de gráficos. Se muestran solo las tablas.</div>';
  }

  html += estBloqueImport();

  html += (estVista === "consultas") ? estAdminConsultas() : estAdminCirugias();
  html += '</div>';

  cont.innerHTML = html;
  if (window.lucide) lucide.createIcons();
  if (estVista === "consultas") estInitChartsConsultas(); else estInitChartsCirugias();
}

// ── Bloque de importación mensual ────────────────────────────────
function estBloqueImport() {
  var h = '<div style="background:var(--co-card,#fbf8f0);border:1px dashed var(--co-line,#d9d0b8);border-radius:10px;padding:14px;margin-bottom:16px">';

  if (estImpPreview) {
    var p = estImpPreview;
    var opts = "";
    for (var i = 0; i < 12; i++) {
      var ym = "2026-" + String(i + 1).padStart(2, "0");
      opts += '<option value="' + ym + '"' + (ym === p.ym ? " selected" : "") + '>' + estCap(EST_MESES[i]) + " 2026</option>";
    }
    opts += '<option value="2027-01"' + (p.ym === "2027-01" ? " selected" : "") + '>Enero 2027</option>';
    var filasHtml = p.filas.map(function (f) {
      return '<tr' + (f.ok ? "" : ' style="background:rgba(220,38,38,.08)"') + '>'
        + '<td style="padding:3px 8px">' + f.raw + '</td>'
        + '<td style="padding:3px 8px;font-weight:600">' + (f.ok ? f.key : '<span style="color:#dc2626">? ' + f.key + '</span>') + '</td>'
        + '<td style="padding:3px 8px;text-align:right">' + estN(f.n) + '</td></tr>';
    }).join("");
    var noRec = p.filas.filter(function (f) { return !f.ok; }).length;
    h += '<div style="font-weight:700;font-size:0.82rem;margin-bottom:8px">Previsualización del archivo — ' + p.tipo + '</div>';
    h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">'
      + '<label style="font-size:0.75rem;color:var(--co-ink-dim,#6b6a5a)">Mes a cargar:</label>'
      + '<select id="estImpYm" style="padding:5px 8px;border-radius:7px;border:1px solid var(--co-line,#d9d0b8);font-size:0.78rem">' + opts + '</select>'
      + '<span style="font-size:0.75rem;color:var(--co-ink-dim,#6b6a5a)">· ' + p.filas.length + ' médicos · total ' + estN(p.total) + '</span>'
      + '</div>';
    if (noRec) h += '<div style="font-size:0.72rem;color:#dc2626;margin-bottom:8px">⚠ ' + noRec + ' nombre(s) sin reconocer (fila roja). Revisá el mapeo antes de confirmar.</div>';
    h += '<div style="max-height:230px;overflow:auto;border:1px solid var(--co-line,#d9d0b8);border-radius:7px;margin-bottom:10px">'
      + '<table style="width:100%;border-collapse:collapse;font-size:0.76rem"><thead><tr style="background:rgba(32,36,31,.05)">'
      + '<th style="padding:4px 8px;text-align:left">Nombre en el Excel</th><th style="padding:4px 8px;text-align:left">Médico</th><th style="padding:4px 8px;text-align:right">Consultas</th>'
      + '</tr></thead><tbody>' + filasHtml + '</tbody></table></div>';
    h += '<div style="display:flex;gap:8px">'
      + '<button onclick="estConfirmarImport()" style="padding:7px 16px;border-radius:8px;border:none;background:#16a34a;color:#fff;font-size:0.78rem;font-weight:700;cursor:pointer">✓ Confirmar y guardar</button>'
      + '<button onclick="estCancelarImport()" style="padding:7px 16px;border-radius:8px;border:1px solid var(--co-line,#d9d0b8);background:var(--co-card,#fbf8f0);color:var(--co-ink,#20241f);font-size:0.78rem;font-weight:600;cursor:pointer">Cancelar</button>'
      + '</div>';
    h += '</div>';
    return h;
  }

  h += '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">'
    + '<div style="flex:1;min-width:220px">'
    + '<div style="font-weight:700;font-size:0.82rem;margin-bottom:3px">⬆ Importar mes (Excel)</div>'
    + '<div style="font-size:0.73rem;color:var(--co-ink-dim,#6b6a5a)">Subí el Excel mensual de <b>consultas por médico</b> (formato del sistema de la clínica). El mes se detecta solo y podés corregirlo antes de guardar.</div>'
    + '<div style="font-size:0.7rem;color:var(--co-ink-dim,#6b6a5a);margin-top:4px">Cirugías: el importador mensual queda pendiente hasta definir el formato del archivo.</div>'
    + '</div>'
    + '<input type="file" accept=".xls,.xlsx" onchange="estImportarExcel(this.files[0])" style="font-size:0.75rem">'
    + '</div>';

  // Meses cargados
  var chips = [];
  for (var m = 0; m < 12; m++) {
    var o = estOrigenMes("consultas", m);
    if (!o) continue;
    var ym = "2026-" + String(m + 1).padStart(2, "0");
    var imp = o === "importado";
    chips.push('<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.7rem;padding:3px 8px;border-radius:20px;'
      + 'background:' + (imp ? "rgba(29,158,117,.12)" : "rgba(32,36,31,.06)") + ';color:' + (imp ? "#0f7a52" : "rgba(32,36,31,.55)") + '">'
      + estCap(EST_MESES[m]) + (imp ? ' · importado <a onclick="estQuitarMes(\'' + ym + '\')" style="cursor:pointer;text-decoration:underline">quitar</a>' : ' · semilla') + '</span>');
  }
  if (chips.length) h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' + chips.join("") + '</div>';
  h += '</div>';
  return h;
}

function estImportarExcel(file) {
  if (!file) return;
  if (!window.XLSX) { alert("No se pudo cargar el lector de Excel (XLSX). Revisá la conexión."); return; }
  var rd = new FileReader();
  rd.onload = function (e) {
    try {
      var wb = XLSX.read(new Uint8Array(e.target.result), { type: "array", cellDates: true });
      var ws = wb.Sheets["Hoja2"] || wb.Sheets["Hoja1"] || wb.Sheets[wb.SheetNames[0]];
      // elige la hoja con más filas si la primera no tiene datos
      wb.SheetNames.forEach(function (nm) {
        var s = wb.Sheets[nm];
        var r = XLSX.utils.sheet_to_json(s, { header: 1 });
        if (r.length > (XLSX.utils.sheet_to_json(ws, { header: 1 }).length)) ws = s;
      });
      var rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      var filas = [], total = 0, detYm = null;
      rows.forEach(function (r) {
        if (!r || r.length < 2) return;
        var c0 = r[0], nombre = r[1], num = r[2];
        var etq = String(nombre || "").trim().toLowerCase();
        if (etq === "subtotal" || etq === "total" || etq === "médico" || etq === "medico" || etq === "" || etq.indexOf("mes/") === 0) return;
        if (num == null || num === "" || isNaN(Number(num))) return;
        if (!detYm && c0) {
          var d = (c0 instanceof Date) ? c0 : new Date(c0);
          if (!isNaN(d.getTime())) detYm = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
        }
        var key = estKeyDeMedico(nombre);
        var ok = EST_MEDICOS.some(function (m) { return m.key === key; });
        filas.push({ raw: String(nombre).trim(), key: key, n: Number(num), ok: ok });
        total += Number(num);
      });
      if (!filas.length) { alert("No encontré filas de médicos en el archivo. ¿Es el Excel de consultas del sistema?"); return; }
      estImpPreview = { tipo: "consultas", ym: detYm || ("2026-" + String(new Date().getMonth() + 1).padStart(2, "0")), filas: filas, total: total };
      estPintarAdmin();
    } catch (err) {
      alert("No pude leer el archivo: " + err.message);
    }
  };
  rd.readAsArrayBuffer(file);
}
function estCancelarImport() { estImpPreview = null; estPintarAdmin(); }
function estConfirmarImport() {
  if (!estImpPreview) return;
  var sel = document.getElementById("estImpYm");
  var ym = sel ? sel.value : estImpPreview.ym;
  var obj = { _ts: new Date().toISOString() };
  var tot = 0;
  estImpPreview.filas.forEach(function (f) { obj[f.key] = f.n; tot += f.n; });
  obj._total = tot;
  EST_IMPORT.consultas[ym] = obj;
  estGuardar();
  estImpPreview = null;
  estPintarAdmin();
}
function estQuitarMes(ym) {
  if (!confirm("¿Quitar el mes importado " + ym + "? (no afecta la semilla)")) return;
  if (EST_IMPORT.consultas) delete EST_IMPORT.consultas[ym];
  if (EST_IMPORT.cirugias)  delete EST_IMPORT.cirugias[ym];
  estGuardar();
  estPintarAdmin();
}

// ── ADMIN · Consultas ───────────────────────────────────────────
function estAdminConsultas() {
  var mat = estConsMatriz2026();
  var totMes = estTotalPorMes(mat);
  var meses = estMesesConDato(totMes);
  var ytd = meses.reduce(function (s, m) { return s + (totMes[m] || 0); }, 0);
  var prom = meses.length ? Math.round(ytd / meses.length) : 0;
  var ultMes = meses.length ? meses[meses.length - 1] : null;
  var anioPrev = EST_SEED.consultas.totalPorMesAnual["2025"];
  var deltaTxt = "";
  if (ultMes != null && anioPrev && anioPrev[ultMes] != null) {
    var d = totMes[ultMes] - anioPrev[ultMes];
    deltaTxt = (d >= 0 ? "▲ +" : "▼ ") + estN(Math.abs(d)) + " vs " + estCap(EST_MESES[ultMes]) + " 2025";
  }

  var rank = EST_MEDICOS.map(function (m) {
    var row = mat[m.key] || [];
    var s = row.reduce(function (a, v) { return a + (v || 0); }, 0);
    return { label: m.label, total: s };
  }).filter(function (x) { return x.total > 0; }).sort(function (a, b) { return b.total - a.total; });

  var html = '<div class="adm-kpis" style="flex-wrap:wrap">'
    + estKpi("Consultas 2026 (a la fecha)", estN(ytd), meses.length + " meses", "#1f3a2e")
    + estKpi("Promedio mensual", estN(prom), "", "#1c78b0")
    + estKpi("Último mes cargado", ultMes != null ? estCap(EST_MESES[ultMes]) + " · " + estN(totMes[ultMes]) : "—", deltaTxt, "#c9933a")
    + '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:6px">'
    + estChartCard("Evolución mensual — servicio (2026 vs años anteriores)", "estChartConsEvo", 260)
    + estChartCard("Ranking por profesional · 2026", "estChartConsRank", Math.max(240, rank.length * 26))
    + '</div>';

  // Tabla prof × mes
  html += '<div style="margin-top:14px">' + estCardWrap("Detalle por profesional y mes · 2026", estTablaMatriz(mat, totMes, meses)) + '</div>';
  return html;
}

// ── ADMIN · Cirugías ────────────────────────────────────────────
function estAdminCirugias() {
  var mat = estCxMatriz2026();
  var totMes = estTotalPorMes(mat);
  var meses = estMesesConDato(totMes);
  var cob = EST_SEED.cirugias.coberturaPorMes2026;
  var ytd = EST_SEED.cirugias.ytd2026;
  var totYtd = meses.reduce(function (s, m) { return s + (totMes[m] || 0); }, 0);

  var rank = EST_MEDICOS.map(function (m) {
    var row = mat[m.key] || [];
    var s = row.reduce(function (a, v) { return a + (v || 0); }, 0);
    return { label: m.label, total: s };
  }).filter(function (x) { return x.total > 0; }).sort(function (a, b) { return b.total - a.total; });

  var html = '<div class="adm-kpis" style="flex-wrap:wrap">'
    + estKpi("Cirugías 2026 (a la fecha)", estN(totYtd), meses.length + " meses", "#1f3a2e")
    + estKpi("Con ART", estN(ytd.art), estPct(ytd.art / (totYtd || 1)) + " del total", "#d85a30")
    + estKpi("Particulares", estN(ytd.particular), estPct(ytd.particular / (totYtd || 1)) + " del total", "#7f77dd")
    + '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:6px">'
    + estChartCard("Evolución mensual (2026 vs años anteriores)", "estChartCxEvo", 260)
    + estChartCard("Ranking por cirujano · 2026", "estChartCxRank", Math.max(240, rank.length * 26))
    + estChartCard("Cobertura por mes · 2026 (ART / particular / obras sociales)", "estChartCxCob", 260)
    + estChartCard("Cobertura acumulada · 2026", "estChartCxDona", 260)
    + '</div>';

  html += '<div style="margin-top:14px">' + estCardWrap("Detalle por cirujano y mes · 2026", estTablaMatriz(mat, totMes, meses)) + '</div>';

  html += '<div style="margin-top:14px">' + estCardWrap("Por obra social individual",
    '<div style="font-size:0.78rem;color:var(--co-ink-dim,#6b6a5a);line-height:1.5">'
    + 'Todavía no hay datos por obra social (OSDE, IOMA, PAMI, Swiss Medical…). '
    + 'El PDF actual solo trae ART / particular / resto agrupado. En cuanto el Excel mensual de cirugías incluya la columna de obra social, el desglose aparece acá automáticamente.'
    + '</div>') + '</div>';
  return html;
}

// ── Tabla genérica médico × mes ─────────────────────────────────
function estTablaMatriz(mat, totMes, meses) {
  var filas = EST_MEDICOS.map(function (m) {
    var row = mat[m.key];
    if (!row) return null;
    var tot = row.reduce(function (a, v) { return a + (v || 0); }, 0);
    if (!tot) return null;
    return { label: m.label, row: row, tot: tot };
  }).filter(Boolean).sort(function (a, b) { return b.tot - a.tot; });

  var th = '<th style="padding:5px 8px;text-align:left;position:sticky;left:0;background:var(--co-card,#fbf8f0)">Médico</th>';
  meses.forEach(function (m) { th += '<th style="padding:5px 8px;text-align:right">' + EST_MESES_CORTO[m] + '</th>'; });
  th += '<th style="padding:5px 8px;text-align:right">Total</th>';

  var body = filas.map(function (f) {
    var tds = '<td style="padding:4px 8px;font-weight:600;position:sticky;left:0;background:var(--co-card,#fbf8f0)">' + f.label + '</td>';
    meses.forEach(function (m) { tds += '<td style="padding:4px 8px;text-align:right">' + estN(f.row[m]) + '</td>'; });
    tds += '<td style="padding:4px 8px;text-align:right;font-weight:700">' + estN(f.tot) + '</td>';
    return '<tr>' + tds + '</tr>';
  }).join("");

  var totRow = '<td style="padding:5px 8px;font-weight:800;position:sticky;left:0;background:rgba(32,36,31,.05)">TOTAL</td>';
  var gran = 0;
  meses.forEach(function (m) { totRow += '<td style="padding:5px 8px;text-align:right;font-weight:800">' + estN(totMes[m]) + '</td>'; gran += (totMes[m] || 0); });
  totRow += '<td style="padding:5px 8px;text-align:right;font-weight:800">' + estN(gran) + '</td>';

  return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.76rem">'
    + '<thead><tr style="background:rgba(32,36,31,.05)">' + th + '</tr></thead>'
    + '<tbody>' + body + '<tr style="background:rgba(32,36,31,.05)">' + totRow + '</tr></tbody></table></div>';
}

// ── Charts admin ───────────────────────────────────────────────
function estDestruir(ids) {
  ids.forEach(function (id) {
    if (estChartInstances[id]) { estChartInstances[id].destroy(); delete estChartInstances[id]; }
  });
}
function estChartBase() {
  var dark = document.documentElement.getAttribute("data-theme") === "dark";
  Chart.defaults.color = dark ? "rgba(241,237,226,.75)" : "#20241f";
  Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
  return { grid: dark ? "rgba(241,237,226,.08)" : "rgba(32,36,31,.08)" };
}
function estInitChartsConsultas() {
  estDestruir(["estChartConsEvo", "estChartConsRank", "estChartCxEvo", "estChartCxRank", "estChartCxCob", "estChartCxDona"]);
  if (!window.Chart) return;
  var b = estChartBase();
  var mat = estConsMatriz2026();
  var totMes = estTotalPorMes(mat);
  var tpa = EST_SEED.consultas.totalPorMesAnual;

  var evo = document.getElementById("estChartConsEvo");
  if (evo) {
    var cur2026 = totMes.map(function (v, i) { return v != null ? v : (tpa["2026"][i]); });
    estChartInstances.estChartConsEvo = new Chart(evo, {
      type: "line",
      data: {
        labels: EST_MESES_CORTO,
        datasets: [
          { label: "2026", data: cur2026, borderColor: "#1f3a2e", backgroundColor: "rgba(31,58,46,.15)", tension: .3, fill: true, spanGaps: false },
          { label: "2025", data: tpa["2025"], borderColor: "#c9933a", borderDash: [5, 4], tension: .3, fill: false },
          { label: "2024", data: tpa["2024"], borderColor: "#7f77dd", borderDash: [2, 3], tension: .3, fill: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: b.grid }, beginAtZero: false } }
      }
    });
  }

  var rk = document.getElementById("estChartConsRank");
  if (rk) {
    var rank = EST_MEDICOS.map(function (m) {
      var row = mat[m.key] || [];
      return { label: m.label, total: row.reduce(function (a, v) { return a + (v || 0); }, 0) };
    }).filter(function (x) { return x.total > 0; }).sort(function (a, b2) { return b2.total - a.total; });
    estChartInstances.estChartConsRank = new Chart(rk, {
      type: "bar",
      data: { labels: rank.map(function (r) { return r.label; }), datasets: [{ label: "Consultas", data: rank.map(function (r) { return r.total; }), backgroundColor: "#1c78b0", borderRadius: 4 }] },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: b.grid } }, y: { grid: { display: false }, ticks: { autoSkip: false } } }
      }
    });
  }
}
function estInitChartsCirugias() {
  estDestruir(["estChartConsEvo", "estChartConsRank", "estChartCxEvo", "estChartCxRank", "estChartCxCob", "estChartCxDona"]);
  if (!window.Chart) return;
  var b = estChartBase();
  var mat = estCxMatriz2026();
  var totMes = estTotalPorMes(mat);
  var apm = EST_SEED.cirugias.anualPorMes;
  var cob = EST_SEED.cirugias.coberturaPorMes2026;
  var ytd = EST_SEED.cirugias.ytd2026;

  var evo = document.getElementById("estChartCxEvo");
  if (evo) {
    var cur = totMes.map(function (v, i) { return v != null ? v : apm["2026"][i]; });
    estChartInstances.estChartCxEvo = new Chart(evo, {
      type: "line",
      data: {
        labels: EST_MESES_CORTO,
        datasets: [
          { label: "2026", data: cur, borderColor: "#1f3a2e", backgroundColor: "rgba(31,58,46,.15)", tension: .3, fill: true },
          { label: "2025", data: apm["2025"], borderColor: "#c9933a", borderDash: [5, 4], tension: .3, fill: false },
          { label: "2024", data: apm["2024"], borderColor: "#7f77dd", borderDash: [2, 3], tension: .3, fill: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: b.grid }, beginAtZero: true } }
      }
    });
  }

  var rk = document.getElementById("estChartCxRank");
  if (rk) {
    var rank = EST_MEDICOS.map(function (m) {
      var row = mat[m.key] || [];
      return { label: m.label, total: row.reduce(function (a, v) { return a + (v || 0); }, 0) };
    }).filter(function (x) { return x.total > 0; }).sort(function (a, b2) { return b2.total - a.total; });
    estChartInstances.estChartCxRank = new Chart(rk, {
      type: "bar",
      data: { labels: rank.map(function (r) { return r.label; }), datasets: [{ label: "Cirugías", data: rank.map(function (r) { return r.total; }), backgroundColor: "#1f3a2e", borderRadius: 4 }] },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: b.grid } }, y: { grid: { display: false }, ticks: { autoSkip: false } } }
      }
    });
  }

  var cobC = document.getElementById("estChartCxCob");
  if (cobC) {
    var n = 7;
    var art = cob.art.slice(0, n), par = cob.particular.slice(0, n);
    var resto = cob.total.slice(0, n).map(function (t, i) { return t - art[i] - par[i]; });
    estChartInstances.estChartCxCob = new Chart(cobC, {
      type: "bar",
      data: {
        labels: EST_MESES_CORTO.slice(0, n),
        datasets: [
          { label: "Obras sociales", data: resto, backgroundColor: "#1c78b0" },
          { label: "ART", data: art, backgroundColor: "#d85a30" },
          { label: "Particular", data: par, backgroundColor: "#7f77dd" }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: b.grid } } }
      }
    });
  }

  var dona = document.getElementById("estChartCxDona");
  if (dona) {
    var totYtd = cob.total.reduce(function (a, v) { return a + v; }, 0);
    var restoYtd = totYtd - ytd.art - ytd.particular;
    estChartInstances.estChartCxDona = new Chart(dona, {
      type: "doughnut",
      data: {
        labels: ["Obras sociales", "ART", "Particular"],
        datasets: [{ data: [restoYtd, ytd.art, ytd.particular], backgroundColor: ["#1c78b0", "#d85a30", "#7f77dd"], borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "60%",
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } }
      }
    });
  }
}

// ══════ PORTAL PROFESIONAL ═══════════════════════════════════════
function renderEstadisticasProf(doctor) {
  var pane = document.getElementById("pane-estadisticas");
  if (!pane) return;
  estCargar(function () {
    if (document.getElementById("estProfRoot")) estPintarProf(doctor);
  });
  estPintarProf(doctor);
}

function estPintarProf(doctor) {
  var pane = document.getElementById("pane-estadisticas");
  if (!pane) return;
  var apellido = (doctor && doctor.apellido) ? doctor.apellido.toUpperCase() : "";

  var consMat = estConsMatriz2026();
  var cxMat   = estCxMatriz2026();
  var misC = consMat[apellido] || new Array(12).fill(null);
  var misX = cxMat[apellido]   || new Array(12).fill(null);
  var totC = estTotalPorMes(consMat);
  var totX = estTotalPorMes(cxMat);
  var mesesC = estMesesConDato(totC);
  var mesesX = estMesesConDato(totX);

  var miCYtd = misC.reduce(function (a, v) { return a + (v || 0); }, 0);
  var miXYtd = misX.reduce(function (a, v) { return a + (v || 0); }, 0);
  var srvCYtd = mesesC.reduce(function (a, m) { return a + (totC[m] || 0); }, 0);
  var srvXYtd = mesesX.reduce(function (a, m) { return a + (totX[m] || 0); }, 0);

  // Puesto en el ranking de cirugías (sin nombrar a nadie)
  var rankX = EST_MEDICOS.map(function (m) {
    var row = cxMat[m.key] || [];
    return { key: m.key, total: row.reduce(function (a, v) { return a + (v || 0); }, 0) };
  }).filter(function (x) { return x.total > 0; }).sort(function (a, b) { return b.total - a.total; });
  var puestoX = rankX.findIndex(function (x) { return x.key === apellido; });
  var puestoTxt = puestoX >= 0 ? ("N.º " + (puestoX + 1) + " de " + rankX.length) : "—";

  var mp = function (n) { return estN(n); };
  var html = '<div id="estProfRoot" style="padding:4px 0">';
  html += '<div class="mp-section-label">Estadísticas del servicio</div>';

  html += '<div class="adm-kpis" style="flex-wrap:wrap;margin-bottom:12px">'
    + estKpi("Mis consultas 2026", mp(miCYtd), srvCYtd ? estPct(miCYtd / srvCYtd) + " del servicio" : "", "#1c78b0")
    + estKpi("Mis cirugías 2026", mp(miXYtd), srvXYtd ? estPct(miXYtd / srvXYtd) + " del servicio" : "", "#1f3a2e")
    + estKpi("Mi lugar en cirugías", puestoTxt, "por volumen 2026", "#c9933a")
    + '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">'
    + estChartCard("Mis consultas por mes · 2026", "estProfCons", 220)
    + estChartCard("Mis cirugías por mes · 2026", "estProfCx", 220)
    + estChartCard("Mi participación en el total del servicio", "estProfPart", 220)
    + '</div>';

  html += '<div style="margin-top:12px;font-size:0.72rem;color:var(--co-ink-dim,#6b6a5a)">'
    + 'Se comparan tus números contra el total de CEOT. El detalle individual del resto de los profesionales solo lo ve la administración.'
    + '</div>';
  html += '</div>';

  pane.innerHTML = html;
  if (window.lucide) lucide.createIcons();

  estProfCtx = { misC: misC, misX: misX, totC: totC, totX: totX };
  estProfActivarCharts();
}

// Se llama también desde cambiarTab() al mostrar la pestaña (los canvas
// en un pane oculto miden 0 y Chart.js no dibuja).
function estProfActivarCharts() {
  if (!estProfCtx || !window.Chart) return;
  if (!document.getElementById("estProfCons")) return;
  estDestruir(["estProfCons", "estProfCx", "estProfPart"]);
  var b = estChartBase();
  var c = estProfCtx;

  estChartInstances.estProfCons = new Chart(document.getElementById("estProfCons"), {
    type: "bar",
    data: { labels: EST_MESES_CORTO, datasets: [{ label: "Consultas", data: c.misC, backgroundColor: "#1c78b0", borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: b.grid }, beginAtZero: true } } }
  });
  estChartInstances.estProfCx = new Chart(document.getElementById("estProfCx"), {
    type: "bar",
    data: { labels: EST_MESES_CORTO, datasets: [{ label: "Cirugías", data: c.misX, backgroundColor: "#1f3a2e", borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: b.grid }, beginAtZero: true } } }
  });
  var partC = document.getElementById("estProfPart");
  if (partC) {
    var pc = c.misC.map(function (v, i) { return (v != null && c.totC[i]) ? Math.round(v / c.totC[i] * 1000) / 10 : null; });
    var px = c.misX.map(function (v, i) { return (v != null && c.totX[i]) ? Math.round(v / c.totX[i] * 1000) / 10 : null; });
    estChartInstances.estProfPart = new Chart(partC, {
      type: "line",
      data: {
        labels: EST_MESES_CORTO,
        datasets: [
          { label: "% consultas", data: pc, borderColor: "#1c78b0", tension: .3, fill: false, spanGaps: true },
          { label: "% cirugías", data: px, borderColor: "#1f3a2e", tension: .3, fill: false, spanGaps: true }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ": " + (ctx.parsed.y == null ? "—" : ctx.parsed.y + "%"); } } } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: b.grid }, beginAtZero: true, ticks: { callback: function (v) { return v + "%"; } } } }
      }
    });
  }
}
