// ═══════════════════════════════════════════════════════════════════
// estadisticas-secretarias.js — vistas "Asignación de turnos" y
// "Atención en ventanilla" del módulo Estadísticas CEOT (solo admin).
//
//   · estAdminSecretarias(tipo)      — HTML de la vista
//   · estInitChartsSecretarias(tipo) — gráficos
//   · estImportarSecretarias(file)   — Excel mensual del sistema
//
// tipo = "turnos" | "ventanilla". Semilla en EST_SEED_SEC
// (js/estadisticas-datos.js); los meses nuevos se guardan en
// EST_IMPORT.turnos / EST_IMPORT.ventanilla, que viajan en la misma clave
// sincronizada que consultas y cirugías ("ceot_estadisticas_import").
// Se carga DESPUÉS de js/estadisticas.js y ANTES de estadisticas-export.js.
// ═══════════════════════════════════════════════════════════════════

var EST_SEC_TIPOS = {
  turnos: {
    titulo: "Asignación de turnos", unidad: "turnos", Unidad: "Turnos",
    kpi: "Turnos asignados 2026 (a la fecha)", color: "#1c78b0",
    reporte: "Auditoría de Turnos", reTitulo: /turnos/i, reOtro: /caja/i
  },
  ventanilla: {
    titulo: "Atención en ventanilla", unidad: "atenciones", Unidad: "Atenciones",
    kpi: "Atenciones en ventanilla 2026 (a la fecha)", color: "#1f3a2e",
    reporte: "Auditoría de Caja", reTitulo: /caja/i, reOtro: /turnos/i
  }
};
var EST_SEC_CHARTS = ["estChartSecEvo", "estChartSecRank", "estChartSecStack", "estChartSecProf", "estChartSecHoras", "estChartSecDow"];
var EST_SEC_COLORES = {
  DANIELA: "#1c78b0", PAULA: "#1f3a2e", ELIZABETH: "#c9933a", LAURA: "#7f77dd",
  EVELINA: "#d85a30", JOSEFINA: "#1d9e75", JULIETA: "#b0568f",
  SUPLENCIA: "#8a8f7a", MEDICOS: "#b9b3a0"
};
var EST_DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function estEsVistaSec(v) { return v === "turnos" || v === "ventanilla"; }
function estSecYm(m) { return "2026-" + String(m + 1).padStart(2, "0"); }
function estSecEsc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function estSecLabel(key) {
  for (var i = 0; i < EST_SECRETARIAS.length; i++) if (EST_SECRETARIAS[i].key === key) return EST_SECRETARIAS[i].label;
  return estExpNombreLindoSeguro(key);
}
function estSecLabelMedico(key) {
  for (var i = 0; i < EST_MEDICOS.length; i++) if (EST_MEDICOS[i].key === key) return EST_MEDICOS[i].label;
  return estExpNombreLindoSeguro(key);
}
// "TOBIAS" → "Tobias" (para nombres fuera del roster).
function estExpNombreLindoSeguro(s) {
  return estSecEsc(String(s || "").toLowerCase().replace(/(^|[\s.,])([a-záéíóúñ])/g, function (m, pre, l) { return pre + l.toUpperCase(); }));
}

// Mes consolidado: lo importado pisa a la semilla. Devuelve siempre la forma
// de la semilla ({ total, dias, porSec, porProf, dow, dowDias, horas, sinHora }).
function estSecMes(tipo, ym) {
  var imp = EST_IMPORT[tipo] && EST_IMPORT[tipo][ym];
  if (imp) {
    var porSec = {};
    Object.keys(imp).forEach(function (k) { if (k.charAt(0) !== "_") porSec[k] = imp[k]; });
    return {
      total: (imp._total != null) ? imp._total : estSum(Object.keys(porSec).map(function (k) { return porSec[k]; })),
      dias: imp._dias || null, porSec: porSec, porProf: imp._prof || {},
      dow: imp._dow || null, dowDias: imp._dowDias || null,
      horas: imp._horas || null, sinHora: imp._sinHora || 0
    };
  }
  var seed = (typeof EST_SEED_SEC !== "undefined" && EST_SEED_SEC[tipo]) ? EST_SEED_SEC[tipo][ym] : null;
  return seed || null;
}

// Todo 2026 consolidado para un tipo.
function estSecDatos(tipo) {
  var d = {
    mat: {}, prof: {}, totMes: new Array(12).fill(null), dias: new Array(12).fill(null),
    horas: new Array(24).fill(0), sinHora: 0, hayHoras: false,
    dow: new Array(7).fill(0), dowDias: new Array(7).fill(0)
  };
  for (var m = 0; m < 12; m++) {
    var o = estSecMes(tipo, estSecYm(m));
    if (!o) continue;
    d.totMes[m] = o.total;
    d.dias[m] = o.dias;
    (function (mm, mes) {
      Object.keys(mes.porSec || {}).forEach(function (k) {
        if (!d.mat[k]) d.mat[k] = new Array(12).fill(null);
        d.mat[k][mm] = mes.porSec[k];
      });
      Object.keys(mes.porProf || {}).forEach(function (k) {
        if (!d.prof[k]) d.prof[k] = new Array(12).fill(null);
        d.prof[k][mm] = mes.porProf[k];
      });
    })(m, o);
    if (o.horas) { d.hayHoras = true; for (var h = 0; h < 24; h++) d.horas[h] += o.horas[h] || 0; }
    d.sinHora += o.sinHora || 0;
    if (o.dow && o.dowDias) for (var w = 0; w < 7; w++) { d.dow[w] += o.dow[w] || 0; d.dowDias[w] += o.dowDias[w] || 0; }
  }
  d.meses = estMesesConDato(d.totMes);
  d.ytd = d.meses.reduce(function (s, m2) { return s + (d.totMes[m2] || 0); }, 0);
  d.diasYtd = d.meses.reduce(function (s, m2) { return s + (d.dias[m2] || 0); }, 0);
  return d;
}

// Filas ordenadas: roster primero no — se ordena por total, como el resto
// del módulo. labelFn traduce la clave a nombre.
function estSecFilas(mat, labelFn) {
  return Object.keys(mat).map(function (k) {
    return { key: k, label: labelFn(k), row: mat[k], tot: estSum(mat[k]) };
  }).filter(function (f) { return f.tot > 0; }).sort(function (a, b) { return b.tot - a.tot; });
}

// Meses sin dato ENTRE el primero y el último cargado (ej.: falta septiembre).
function estSecHuecos(meses) {
  var out = [];
  if (meses.length < 2) return out;
  for (var m = meses[0]; m <= meses[meses.length - 1]; m++) if (meses.indexOf(m) < 0) out.push(m);
  return out;
}

// ── ADMIN · vista ───────────────────────────────────────────────
function estAdminSecretarias(tipo) {
  var T = EST_SEC_TIPOS[tipo];
  var d = estSecDatos(tipo);
  var meses = d.meses;

  if (!meses.length) {
    return estCardWrap(T.titulo, '<div style="font-size:0.8rem;color:var(--co-ink-dim,#6b6a5a)">Todavía no hay meses cargados. Importá el Excel "' + T.reporte + '" del sistema.</div>');
  }

  var prom = Math.round(d.ytd / meses.length);
  var ult = meses[meses.length - 1];
  var ant = meses.length > 1 ? meses[meses.length - 2] : null;
  var deltaTxt = "";
  if (ant != null) {
    var dl = d.totMes[ult] - d.totMes[ant];
    var col = dl > 0 ? "#166534" : (dl < 0 ? "#b13a2c" : "#6b6a5a");
    var pc = d.totMes[ant] ? " (" + (dl >= 0 ? "+" : "") + Math.round(dl / d.totMes[ant] * 100) + "%)" : "";
    deltaTxt = '<span style="color:' + col + '">' + (dl > 0 ? "▲ +" : (dl < 0 ? "▼ " : "= ")) + estN(Math.abs(dl)) + pc + " vs " + estCap(EST_MESES[ant]) + "</span>";
  }
  var porDia = d.diasYtd ? Math.round(d.ytd / d.diasYtd) : null;
  var desde = "desde " + EST_MESES[meses[0]] + " · " + meses.length + (meses.length === 1 ? " mes cargado" : " meses cargados");

  var html = "";
  var huecos = estSecHuecos(meses);
  if (huecos.length) {
    html += '<div style="padding:8px 10px;margin-bottom:10px;border-radius:8px;background:rgba(201,147,58,.14);color:#8a5a12;font-size:0.74rem">⚠ Falta cargar '
      + huecos.map(function (m) { return "<b>" + EST_MESES[m] + "</b>"; }).join(", ")
      + ': los totales y promedios no incluyen ' + (huecos.length === 1 ? "ese mes" : "esos meses") + '.</div>';
  }

  html += '<div class="adm-kpis" style="flex-wrap:wrap">'
    + estKpi(T.kpi, estN(d.ytd), desde, "#1f3a2e")
    + estKpi("Promedio mensual", estN(prom), porDia != null ? estN(porDia) + " por día hábil" : "", "#1c78b0")
    + estKpi("Último mes cargado", estCap(EST_MESES[ult]) + " · " + estN(d.totMes[ult]), deltaTxt, "#c9933a")
    + '</div>';

  var nSec = estSecFilas(d.mat, estSecLabel).length;
  var nProf = estSecFilas(d.prof, estSecLabelMedico).length;
  html += '<div data-est-grid="1" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:6px">'
    + estChartCard("Evolución mensual — " + T.unidad + " · 2026", "estChartSecEvo", 260)
    + estChartCard("Ranking por secretaria · acumulado 2026", "estChartSecRank", Math.max(240, nSec * 30))
    + estChartCard("Por secretaria y mes · 2026", "estChartSecStack", 260)
    + estChartCard("Por profesional · acumulado 2026", "estChartSecProf", Math.max(260, nProf * 24))
    + (tipo === "turnos" && d.hayHoras ? estChartCard("Hora de carga del turno · acumulado 2026", "estChartSecHoras", 260) : "")
    + estChartCard("Promedio por día de la semana · 2026", "estChartSecDow", 260)
    + '</div>';

  if (tipo === "turnos" && d.sinHora) {
    html += '<div style="margin-top:8px;font-size:0.72rem;color:var(--co-ink-dim,#6b6a5a)">El gráfico por hora no incluye '
      + estN(d.sinHora) + ' turnos que el sistema exporta sin hora de carga.</div>';
  }

  html += '<div style="margin-top:14px">' + estCardWrap("Detalle por secretaria y mes · 2026",
    estSecTabla(estSecFilas(d.mat, estSecLabel), d.totMes, meses, "Secretaria")) + '</div>';
  html += '<div style="margin-top:14px">' + estCardWrap(T.Unidad + " por profesional y mes · 2026",
    estSecTabla(estSecFilas(d.prof, estSecLabelMedico), d.totMes, meses, "Profesional")) + '</div>';
  return html;
}

// Tabla nombre × mes, con total y participación.
function estSecTabla(filas, totMes, meses, col0) {
  var fijo = "position:sticky;left:0;background:var(--co-card,#fbf8f0)";
  var th = '<th style="padding:5px 8px;text-align:left;' + fijo + '">' + col0 + '</th>';
  meses.forEach(function (m) { th += '<th style="padding:5px 8px;text-align:right">' + EST_MESES_CORTO[m] + '</th>'; });
  th += '<th style="padding:5px 8px;text-align:right">Total 2026</th><th style="padding:5px 8px;text-align:right">% del total</th>';
  var gran = meses.reduce(function (s, m) { return s + (totMes[m] || 0); }, 0);

  var body = filas.map(function (f) {
    var tds = '<td style="padding:4px 8px;font-weight:600;' + fijo + '">' + f.label + '</td>';
    meses.forEach(function (m) { tds += '<td style="padding:4px 8px;text-align:right">' + estN(f.row[m]) + '</td>'; });
    tds += '<td style="padding:4px 8px;text-align:right;font-weight:700">' + estN(f.tot) + '</td>'
      + '<td style="padding:4px 8px;text-align:right;color:var(--co-ink-dim,#6b6a5a)">' + (gran ? estPct(f.tot / gran) : "—") + '</td>';
    return '<tr>' + tds + '</tr>';
  }).join("");

  var tot = '<td style="padding:5px 8px;font-weight:800;position:sticky;left:0;background:rgba(32,36,31,.05)">TOTAL</td>';
  meses.forEach(function (m) { tot += '<td style="padding:5px 8px;text-align:right;font-weight:800">' + estN(totMes[m]) + '</td>'; });
  tot += '<td style="padding:5px 8px;text-align:right;font-weight:800">' + estN(gran) + '</td><td></td>';

  return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.76rem">'
    + '<thead><tr style="background:rgba(32,36,31,.05)">' + th + '</tr></thead>'
    + '<tbody>' + body + '<tr style="background:rgba(32,36,31,.05)">' + tot + '</tr></tbody></table></div>';
}

// ── Charts ──────────────────────────────────────────────────────
function estInitChartsSecretarias(tipo) {
  estDestruir(["estChartConsEvo", "estChartConsRank", "estChartCxEvo", "estChartCxRank", "estChartCxCob", "estChartCxDona"].concat(EST_SEC_CHARTS));
  if (!window.Chart) return;
  var T = EST_SEC_TIPOS[tipo];
  var b = estChartBase();
  var d = estSecDatos(tipo);
  if (!d.meses.length) return;
  var leyenda = { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } };
  var sinLeyenda = { display: false };
  var tip = function (c) { return (c.dataset.label ? c.dataset.label + ": " : "") + estN(c.chart.options.indexAxis === "y" ? c.parsed.x : c.parsed.y); };

  var evo = document.getElementById("estChartSecEvo");
  if (evo) {
    estChartInstances.estChartSecEvo = new Chart(evo, {
      type: "line",
      data: {
        labels: EST_MESES_CORTO,
        datasets: [{ label: "2026", data: d.totMes, borderColor: "#1f3a2e", backgroundColor: "rgba(31,58,46,.15)", tension: .3, fill: true, spanGaps: false, pointRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: leyenda, tooltip: { callbacks: { label: tip } } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: b.grid }, beginAtZero: true } }
      }
    });
  }

  var filasSec = estSecFilas(d.mat, estSecLabel);
  var rk = document.getElementById("estChartSecRank");
  if (rk) {
    estChartInstances.estChartSecRank = new Chart(rk, {
      type: "bar",
      data: {
        labels: filasSec.map(function (f) { return f.label; }),
        datasets: [{ label: T.Unidad + " 2026", data: filasSec.map(function (f) { return f.tot; }), backgroundColor: T.color, borderRadius: 4 }]
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: sinLeyenda, tooltip: { callbacks: { label: tip } } },
        scales: { x: { grid: { color: b.grid }, beginAtZero: true }, y: { grid: { display: false }, ticks: { autoSkip: false } } }
      }
    });
  }

  var st = document.getElementById("estChartSecStack");
  if (st) {
    var m0 = d.meses[0], m1 = d.meses[d.meses.length - 1];
    var idx = [];
    for (var m = m0; m <= m1; m++) idx.push(m);
    estChartInstances.estChartSecStack = new Chart(st, {
      type: "bar",
      data: {
        labels: idx.map(function (m2) { return EST_MESES_CORTO[m2]; }),
        datasets: filasSec.map(function (f) {
          return { label: f.label, data: idx.map(function (m2) { return f.row[m2] || 0; }), backgroundColor: EST_SEC_COLORES[f.key] || "#6b6a5a" };
        })
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: leyenda, tooltip: { callbacks: { label: tip } } },
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: b.grid } } }
      }
    });
  }

  var pf = document.getElementById("estChartSecProf");
  if (pf) {
    var filasProf = estSecFilas(d.prof, estSecLabelMedico);
    estChartInstances.estChartSecProf = new Chart(pf, {
      type: "bar",
      data: {
        labels: filasProf.map(function (f) { return f.label; }),
        datasets: [{ label: T.Unidad + " 2026", data: filasProf.map(function (f) { return f.tot; }), backgroundColor: "#c9933a", borderRadius: 4 }]
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: sinLeyenda, tooltip: { callbacks: { label: tip } } },
        scales: { x: { grid: { color: b.grid }, beginAtZero: true }, y: { grid: { display: false }, ticks: { autoSkip: false } } }
      }
    });
  }

  var hr = document.getElementById("estChartSecHoras");
  if (hr) {
    var h0 = 0, h1 = 23;
    while (h0 < 23 && !d.horas[h0]) h0++;
    while (h1 > h0 && !d.horas[h1]) h1--;
    var hs = [];
    for (var h = h0; h <= h1; h++) hs.push(h);
    estChartInstances.estChartSecHoras = new Chart(hr, {
      type: "bar",
      data: {
        labels: hs.map(function (x) { return x + " h"; }),
        datasets: [{ label: "Turnos cargados", data: hs.map(function (x) { return d.horas[x]; }), backgroundColor: "#7f77dd", borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: sinLeyenda, tooltip: { callbacks: { label: tip } } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: b.grid }, beginAtZero: true } }
      }
    });
  }

  var dw = document.getElementById("estChartSecDow");
  if (dw) {
    var ds = [1, 2, 3, 4, 5, 6, 0].filter(function (w) { return d.dowDias[w] > 0; });
    estChartInstances.estChartSecDow = new Chart(dw, {
      type: "bar",
      data: {
        labels: ds.map(function (w) { return EST_DOW[w]; }),
        datasets: [{ label: "Promedio por día", data: ds.map(function (w) { return Math.round(d.dow[w] / d.dowDias[w]); }), backgroundColor: "#1d9e75", borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: sinLeyenda, tooltip: { callbacks: { label: tip } } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: b.grid }, beginAtZero: true } }
      }
    });
  }
}

// ── Importador mensual ──────────────────────────────────────────
// Los dos reportes traen: fila de título ("Auditoría de Turnos" / "Auditoría
// de Caja"), "Desde dd/mm/aaaa Hasta dd/mm/aaaa", una fila de encabezados y
// después una fila por registro con Profesional, Usuario, Fecha y Cantidad
// (el orden de columnas cambia entre uno y otro: se ubican por nombre).
// El mes se toma de las FECHAS de las filas, no del "Desde/Hasta" ni del
// nombre del archivo: ya llegó un archivo "septiembre" con datos de octubre.

// Fecha de una celda → { y, m, d, H, conHora } sin pasar por zonas horarias.
function estSecFecha(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    var p = XLSX.SSF.parse_date_code(v);
    if (!p || !p.y) return null;
    return { y: p.y, m: p.m, d: p.d, H: p.H, conHora: !!(p.H || p.M || p.S) };
  }
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return { y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate(), H: v.getHours(), conHora: !!(v.getHours() || v.getMinutes() || v.getSeconds()) };
  }
  var mt = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(String(v));
  if (!mt) return null;
  return { y: +mt[3], m: +mt[2], d: +mt[1], H: mt[4] != null ? +mt[4] : 0, conHora: mt[4] != null && (+mt[4] > 0 || +mt[5] > 0) };
}

function estImportarSecretarias(file) {
  if (!file) return;
  var tipo = estVista;
  if (!estEsVistaSec(tipo)) return;
  var T = EST_SEC_TIPOS[tipo];
  if (!window.XLSX) { alert("No se pudo cargar el lector de Excel (XLSX). Revisá la conexión."); return; }
  var rd = new FileReader();
  rd.onload = function (e) {
    try {
      var wb = XLSX.read(new Uint8Array(e.target.result), { type: "array", cellDates: false });
      var rows = [];
      wb.SheetNames.forEach(function (nm) {
        var r = XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, blankrows: false, raw: true });
        if (r.length > rows.length) rows = r;
      });

      // Encabezados
      var hdr = -1, COL = {};
      for (var i = 0; i < Math.min(15, rows.length); i++) {
        var txt = (rows[i] || []).map(function (x) { return String(x == null ? "" : x).trim().toUpperCase(); });
        if (txt.indexOf("USUARIO") < 0 || txt.indexOf("CANTIDAD") < 0) continue;
        txt.forEach(function (t, ci) {
          if (t === "USUARIO") COL.usu = ci;
          else if (t === "CANTIDAD") COL.cant = ci;
          else if (t === "PROFESIONAL") COL.prof = ci;
          else if (/^FECHA/.test(t)) COL.fecha = ci;
        });
        hdr = i;
        break;
      }
      if (hdr < 0 || COL.fecha == null) {
        alert('No encontré las columnas Usuario / Fecha / Cantidad. ¿Es el Excel "' + T.reporte + '" del sistema?');
        return;
      }

      // Título y período declarado
      var cab = rows.slice(0, hdr).map(function (r) { return String((r && r[0]) || ""); }).join(" | ");
      if (T.reOtro.test(cab) && !T.reTitulo.test(cab)) {
        var otro = tipo === "turnos" ? "ventanilla" : "turnos";
        alert('Este archivo es un reporte "' + EST_SEC_TIPOS[otro].reporte + '": corresponde a la pestaña "'
          + EST_SEC_TIPOS[otro].titulo + '", no a "' + T.titulo + '".');
        return;
      }
      var mDesde = /desde\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i.exec(cab);
      var ymDecl = mDesde ? mDesde[3] + "-" + String(mDesde[2]).padStart(2, "0") : null;

      // Registros
      var regs = [], porYm = {};
      for (var j = hdr + 1; j < rows.length; j++) {
        var r = rows[j] || [];
        var usu = String(r[COL.usu] == null ? "" : r[COL.usu]).trim();
        var n = Number(r[COL.cant]);
        var f = estSecFecha(r[COL.fecha]);
        if (!usu || !f || !isFinite(n) || r[COL.cant] == null || r[COL.cant] === "") continue;
        var ym = f.y + "-" + String(f.m).padStart(2, "0");
        porYm[ym] = (porYm[ym] || 0) + 1;
        regs.push({ usu: usu, prof: COL.prof != null ? String(r[COL.prof] == null ? "" : r[COL.prof]).trim() : "", n: n, f: f, ym: ym });
      }
      if (!regs.length) { alert('No encontré registros en el archivo. ¿Es el Excel "' + T.reporte + '" del sistema?'); return; }

      // Mes = el que más filas tiene; lo de otros meses se descarta y se avisa.
      var detYm = Object.keys(porYm).sort(function (a, b2) { return porYm[b2] - porYm[a]; })[0];
      var fuera = 0;
      var porRaw = {}, prof = {}, horas = new Array(24).fill(0), sinHora = 0;
      var dow = new Array(7).fill(0), dias = {}, total = 0;
      regs.forEach(function (g) {
        if (g.ym !== detYm) { fuera += g.n; return; }
        total += g.n;
        porRaw[g.usu] = (porRaw[g.usu] || 0) + g.n;
        if (g.prof) { var kp = estKeyDeMedico(g.prof); prof[kp] = (prof[kp] || 0) + g.n; }
        var w = new Date(g.f.y, g.f.m - 1, g.f.d).getDay();
        dow[w] += g.n;
        dias[g.f.d] = w;
        if (tipo === "turnos") { if (g.f.conHora) horas[g.f.H] += g.n; else sinHora += g.n; }
      });
      var dowDias = new Array(7).fill(0);
      Object.keys(dias).forEach(function (dd) { dowDias[dias[dd]]++; });

      var filas = Object.keys(porRaw).map(function (raw) {
        var key = estKeyDeSecretaria(raw);
        return { raw: estSecEsc(raw), key: estSecEsc(key), n: porRaw[raw], ok: EST_SECRETARIAS.some(function (s) { return s.key === key; }) };
      }).sort(function (a, b2) { return b2.n - a.n; });

      var avisos = [];
      if (ymDecl && ymDecl !== detYm) {
        avisos.push('El encabezado del archivo dice "' + estSecEsc(mDesde[0]) + '" pero las fechas de los registros son de <b>'
          + EST_MESES[parseInt(detYm.split("-")[1], 10) - 1] + " " + detYm.split("-")[0] + '</b>. Se carga según las fechas: verificá que sea el archivo correcto.');
      }
      if (fuera) avisos.push(estN(fuera) + ' ' + T.unidad + ' con fecha de otro mes quedaron afuera.');
      if (detYm.split("-")[0] !== "2026") avisos.push('El archivo es de ' + detYm.split("-")[0] + ': el módulo hoy solo muestra 2026.');
      var ya = estSecMes(tipo, detYm);
      if (ya) avisos.push('Ese mes ya está cargado (' + estN(ya.total) + ' ' + T.unidad + '): al confirmar se reemplaza.');

      estImpPreview = {
        tipo: tipo, ym: detYm, filas: filas, total: total, avisos: avisos,
        sec: { dias: Object.keys(dias).length, prof: prof, dow: dow, dowDias: dowDias, horas: tipo === "turnos" ? horas : null, sinHora: sinHora }
      };
      estPintarAdmin();
    } catch (err) {
      alert("No pude leer el archivo: " + err.message);
    }
  };
  rd.readAsArrayBuffer(file);
}

// Arma el objeto que se guarda en EST_IMPORT[tipo][ym] a partir del preview.
function estSecObjImport(p) {
  var obj = { _ts: new Date().toISOString() };
  var tot = 0;
  p.filas.forEach(function (f) { obj[f.key] = (obj[f.key] || 0) + f.n; tot += f.n; });
  obj._total = tot;
  obj._dias = p.sec.dias;
  obj._prof = p.sec.prof;
  obj._dow = p.sec.dow;
  obj._dowDias = p.sec.dowDias;
  if (p.sec.horas) { obj._horas = p.sec.horas; obj._sinHora = p.sec.sinHora; }
  return obj;
}
