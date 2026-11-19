// ═══════════════════════════════════════════════════════════════════
// estadisticas-reportes.js — descargas en PDF del módulo Estadísticas CEOT
// (solo admin). Pedido de Marcelo, 19/11/2026.
//
//   · estRepProfesionalPdf(key|"todos") — una hoja A4 por profesional:
//       consultas, turnos asignados, cirugías y % de consultas que terminan
//       en cirugía, mes a mes y total 2026.
//   · estRepRankingSecretariasPdf()     — ranking mensual de secretarias
//       (turnos asignados + atenciones en ventanilla), y el acumulado 2026.
//
// Usa los mismos datos consolidados que las pantallas (semilla + meses
// importados): estConsMatriz2026, estCxMatriz2026 y estSecDatos. Se carga
// DESPUÉS de estadisticas-export.js.
// ═══════════════════════════════════════════════════════════════════

var EST_REP_VERDE = [31, 58, 46];

function estRepHoy() {
  var h = new Date();
  return String(h.getDate()).padStart(2, "0") + "/" + String(h.getMonth() + 1).padStart(2, "0") + "/" + h.getFullYear();
}
function estRepSello() {
  var h = new Date();
  return h.getFullYear() + "-" + String(h.getMonth() + 1).padStart(2, "0") + "-" + String(h.getDate()).padStart(2, "0");
}
// Texto plano (jsPDF no interpreta entidades): "León" ya viene con acento en el roster.
function estRepN(n) { return (n == null) ? "—" : Number(n).toLocaleString("es-AR"); }

function estRepEncabezado(doc, subtitulo) {
  var LM = 15, RM = 195;
  doc.setFillColor(EST_REP_VERDE[0], EST_REP_VERDE[1], EST_REP_VERDE[2]);
  doc.rect(LM, 10, RM - LM, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
  doc.text("CEOT — CLÍNICA TRAUMATOLÓGICA COLÓN", 105, 17, { align: "center" });
  doc.setFontSize(8.5);
  doc.text(subtitulo, 105, 22.5, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

// ── PROFESIONAL ───────────────────────────────────────────────────
function estRepDatosProfesional(key) {
  var cons = estConsMatriz2026()[key] || [];
  var cx = estCxMatriz2026()[key] || [];
  var tur = (estSecDatos("turnos").prof[key]) || [];
  var meses = [];
  for (var m = 0; m < 12; m++) {
    if (cons[m] != null || cx[m] != null || tur[m] != null) meses.push(m);
  }
  var out = { key: key, meses: meses, cons: cons, cx: cx, tur: tur, sc: 0, sx: 0, tc: 0, tt: 0, tx: 0 };
  meses.forEach(function (m) {
    out.tc += cons[m] || 0; out.tt += tur[m] || 0; out.tx += cx[m] || 0;
    // El % se calcula solo sobre los meses que tienen consultas cargadas, para
    // no dividir cirugías de un mes por consultas de un mes que falta.
    if (cons[m]) { out.sc += cons[m]; out.sx += cx[m] || 0; }
  });
  return out;
}

function estRepPintarProfesional(doc, md) {
  var LM = 15, RM = 195;
  var d = estRepDatosProfesional(md.key);
  estRepEncabezado(doc, "ESTADÍSTICAS 2026 — REPORTE INDIVIDUAL");

  var y = 35;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("Dr. " + md.label, LM, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text("Emitido: " + estRepHoy() + "   ·   año 2026" + (d.meses.length ? " · datos hasta " + EST_MESES[d.meses[d.meses.length - 1]] : ""), RM, y, { align: "right" });
  doc.setTextColor(0, 0, 0);

  if (!d.meses.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(120, 120, 120);
    doc.text("Todavía no hay datos cargados para este profesional.", LM, y + 12);
    doc.setTextColor(0, 0, 0);
    return;
  }

  // Cuatro cajas: consultas | turnos | cirugías | % cx
  y += 6;
  var pctTotal = d.sc ? d.sx / d.sc : null;
  var cajas = [
    { t: "CONSULTAS", v: estRepN(d.tc), s: d.meses.length + (d.meses.length === 1 ? " mes" : " meses") + " cargados" },
    { t: "TURNOS ASIGNADOS", v: d.tt ? estRepN(d.tt) : "—", s: "por las secretarias" },
    { t: "CIRUGÍAS", v: estRepN(d.tx), s: "en el período" },
    { t: "CONSULTAS QUE TERMINAN EN CX", v: pctTotal == null ? "—" : estPct(pctTotal), s: pctTotal ? "1 cirugía cada " + Math.round(d.sc / d.sx) + " consultas" : "sin cirugías" }
  ];
  var bw = (RM - LM - 9) / 4;
  cajas.forEach(function (c, i) {
    var x0 = LM + i * (bw + 3);
    doc.setDrawColor(210, 205, 190); doc.setFillColor(244, 242, 236);
    doc.roundedRect(x0, y, bw, 27, 2, 2, "FD");
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.3); doc.setTextColor(90, 90, 90);
    doc.text(doc.splitTextToSize(c.t, bw - 6), x0 + 3, y + 5.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(i === 3 ? 15 : 16); doc.setTextColor(EST_REP_VERDE[0], EST_REP_VERDE[1], EST_REP_VERDE[2]);
    doc.text(c.v, x0 + 3, y + 16);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100);
    doc.text(c.s, x0 + 3, y + 22.5);
  });
  doc.setTextColor(0, 0, 0);
  y += 36;

  // Tabla mes a mes
  var X = { cons: 85, tur: 115, cx: 145, pct: 175, bar: 195 };
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(EST_REP_VERDE[0], EST_REP_VERDE[1], EST_REP_VERDE[2]);
  doc.text("Mes a mes", LM, y);
  y += 4.5;
  doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
  doc.text("Mes", LM + 1, y);
  doc.text("Consultas", X.cons, y, { align: "right" });
  doc.text("Turnos asignados", X.tur, y, { align: "right" });
  doc.text("Cirugías", X.cx, y, { align: "right" });
  doc.text("% consultas a cx", X.pct + 8, y, { align: "right" });
  doc.setDrawColor(EST_REP_VERDE[0], EST_REP_VERDE[1], EST_REP_VERDE[2]); doc.line(LM, y + 1.8, RM, y + 1.8);
  doc.setTextColor(0, 0, 0);
  y += 6;
  d.meses.forEach(function (m, i) {
    if (i % 2 === 0) { doc.setFillColor(248, 247, 242); doc.rect(LM, y - 4, RM - LM, 5.8, "F"); }
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.6);
    doc.text(estCap(EST_MESES[m]), LM + 1, y);
    doc.text(estRepN(d.cons[m]), X.cons, y, { align: "right" });
    doc.text(estRepN(d.tur[m]), X.tur, y, { align: "right" });
    doc.text(estRepN(d.cx[m]), X.cx, y, { align: "right" });
    var p = (d.cons[m] && d.cx[m] != null) ? estPct(d.cx[m] / d.cons[m]) : "—";
    doc.setFont("helvetica", "bold");
    doc.text(p, X.pct + 8, y, { align: "right" });
    y += 5.8;
  });
  doc.setDrawColor(EST_REP_VERDE[0], EST_REP_VERDE[1], EST_REP_VERDE[2]); doc.line(LM, y - 3.4, RM, y - 3.4);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.8);
  doc.text("TOTAL 2026", LM + 1, y + 1.5);
  doc.text(estRepN(d.tc), X.cons, y + 1.5, { align: "right" });
  doc.text(d.tt ? estRepN(d.tt) : "—", X.tur, y + 1.5, { align: "right" });
  doc.text(estRepN(d.tx), X.cx, y + 1.5, { align: "right" });
  doc.setTextColor(EST_REP_VERDE[0], EST_REP_VERDE[1], EST_REP_VERDE[2]);
  doc.text(pctTotal == null ? "—" : estPct(pctTotal), X.pct + 8, y + 1.5, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 10;

  doc.setFont("helvetica", "italic"); doc.setFontSize(6.8); doc.setTextColor(120, 120, 120);
  var primTur = null;
  d.meses.forEach(function (m) { if (primTur == null && d.tur[m] != null) primTur = m; });
  var nota = "% consultas a cx = cirugías ÷ consultas del mismo período. En un mes suelto puede distorsionar (un paciente consulta a fin de un mes y se opera a principios del siguiente); "
    + "el TOTAL compensa ese corrimiento y es el dato más representativo. Turnos asignados = turnos cargados en su agenda por las secretarias" + (primTur != null ? " (se miden desde " + EST_MESES[primTur] + ")" : "") + ". \"—\" = mes sin dato cargado.";
  doc.text(doc.splitTextToSize(nota, RM - LM), LM, y);
  doc.setTextColor(0, 0, 0);
}

function estRepProfesionalPdf(sel) {
  if (!window.jspdf) { alert("La librería PDF aún se está cargando. Esperá un segundo y volvé a intentar."); return; }
  var lista = (sel && sel !== "todos")
    ? EST_MEDICOS.filter(function (m) { return m.key === sel; })
    : EST_MEDICOS.filter(function (m) { return estRepDatosProfesional(m.key).meses.length > 0; });
  if (!lista.length) { alert("No hay profesionales con datos cargados."); return; }
  var doc = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  lista.forEach(function (md, i) {
    if (i > 0) doc.addPage();
    estRepPintarProfesional(doc, md);
  });
  var nombre = lista.length === 1 ? "Estadisticas_" + lista[0].label.replace(/[^A-Za-z]/g, "") : "Estadisticas_profesionales";
  doc.save(nombre + "_" + estRepSello() + ".pdf");
}

// ── SECRETARIAS ───────────────────────────────────────────────────
// SUPLENCIA y "Médicos (carga propia)" no son secretarias: figuran aparte, sin puesto.
var EST_REP_FUERA_RANKING = ["SUPLENCIA", "MEDICOS"];

function estRepFilasSec(dT, dV, m) {
  var keys = {};
  Object.keys(dT.mat).concat(Object.keys(dV.mat)).forEach(function (k) { keys[k] = true; });
  var filas = Object.keys(keys).map(function (k) {
    var t = (dT.mat[k] || [])[m] || 0, v = (dV.mat[k] || [])[m] || 0;
    return { key: k, label: estSecLabel(k), t: t, v: v, tot: t + v };
  }).filter(function (f) { return f.tot > 0; });
  return {
    rank: filas.filter(function (f) { return EST_REP_FUERA_RANKING.indexOf(f.key) < 0; }).sort(function (a, b) { return b.tot - a.tot; }),
    fuera: filas.filter(function (f) { return EST_REP_FUERA_RANKING.indexOf(f.key) >= 0; })
  };
}

function estRepPintarBloqueRanking(doc, y, titulo, g, previo, dias) {
  var LM = 15, RM = 195;
  var X = { n: LM + 4, sec: LM + 11, t: 98, v: 124, tot: 150, pct: 168, mov: 193 };
  var total = g.rank.reduce(function (s, f) { return s + f.tot; }, 0);
  doc.setFillColor(EST_REP_VERDE[0], EST_REP_VERDE[1], EST_REP_VERDE[2]);
  doc.rect(LM, y, RM - LM, 6.5, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.text(titulo, LM + 2, y + 4.6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  doc.text(estRepN(total) + " en total" + (dias ? " · " + dias + " días hábiles" : ""), RM - 2, y + 4.4, { align: "right" });
  doc.setTextColor(90, 90, 90);
  y += 10.5;
  doc.setFontSize(7);
  doc.text("#", X.n, y, { align: "center" });
  doc.text("Secretaria", X.sec, y);
  doc.text("Turnos", X.t, y, { align: "right" });
  doc.text("Ventanilla", X.v, y, { align: "right" });
  doc.text("Total", X.tot, y, { align: "right" });
  doc.text("% del mes", X.pct, y, { align: "right" });
  if (previo) doc.text("Vs mes ant.", X.mov, y, { align: "right" });
  doc.setDrawColor(200, 200, 190); doc.line(LM, y + 1.6, RM, y + 1.6);
  doc.setTextColor(0, 0, 0);
  y += 5.8;
  var medalla = [[201, 147, 58], [130, 130, 130], [160, 100, 60]];
  g.rank.forEach(function (f, i) {
    if (i === 0) { doc.setFillColor(250, 244, 226); doc.rect(LM, y - 4, RM - LM, 5.6, "F"); }
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    if (i < 3) doc.setTextColor(medalla[i][0], medalla[i][1], medalla[i][2]); else doc.setTextColor(120, 120, 120);
    doc.text(String(i + 1), X.n, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    doc.text(f.label, X.sec, y);
    doc.setFont("helvetica", "normal");
    doc.text(f.t ? estRepN(f.t) : "—", X.t, y, { align: "right" });
    doc.text(f.v ? estRepN(f.v) : "—", X.v, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(estRepN(f.tot), X.tot, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(total ? estPct(f.tot / total) : "—", X.pct, y, { align: "right" });
    if (previo) {
      var j = previo.rank.map(function (p) { return p.key; }).indexOf(f.key);
      if (j < 0) { doc.setTextColor(120, 120, 120); doc.text("nueva", X.mov, y, { align: "right" }); }
      else if (j > i) { doc.setTextColor(22, 101, 52); doc.text("+" + (j - i), X.mov, y, { align: "right" }); }
      else if (j < i) { doc.setTextColor(177, 58, 44); doc.text("-" + (i - j), X.mov, y, { align: "right" }); }
      else { doc.setTextColor(150, 150, 150); doc.text("=", X.mov, y, { align: "right" }); }
      doc.setTextColor(0, 0, 0);
    }
    y += 5.6;
  });
  if (g.fuera.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(6.8); doc.setTextColor(120, 120, 120);
    doc.text("Fuera del ranking: " + g.fuera.map(function (f) { return f.label + " " + estRepN(f.tot); }).join(" · "), LM + 2, y);
    doc.setTextColor(0, 0, 0);
    y += 4.5;
  }
  return y + 5;
}

function estRepRankingSecretariasPdf() {
  if (!window.jspdf) { alert("La librería PDF aún se está cargando. Esperá un segundo y volvé a intentar."); return; }
  var dT = estSecDatos("turnos"), dV = estSecDatos("ventanilla");
  var meses = {};
  dT.meses.concat(dV.meses).forEach(function (m) { meses[m] = true; });
  meses = Object.keys(meses).map(Number).sort(function (a, b) { return a - b; });
  if (!meses.length) { alert("Todavía no hay meses de turnos ni de ventanilla cargados."); return; }

  var doc = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  estRepEncabezado(doc, "RANKING DE SECRETARIAS — TURNOS Y VENTANILLA");
  var y = 34;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text("Emitido: " + estRepHoy() + "   ·   año 2026   ·   datos de " + EST_MESES[meses[0]] + " a " + EST_MESES[meses[meses.length - 1]], 15, y);
  doc.text("Puesto según turnos asignados + atenciones en ventanilla. Puesto: +N / -N = lugares que subió o bajó contra el mes anterior.", 15, y + 4.5);
  var huecos = estSecHuecos(meses);
  if (huecos.length) {
    doc.setTextColor(138, 90, 18);
    doc.text("Falta cargar: " + huecos.map(function (m) { return EST_MESES[m]; }).join(", ") + " — no figuran.", 15, y + 9);
  }
  doc.setTextColor(0, 0, 0);
  y += huecos.length ? 15 : 11;

  // Acumulado del período
  var acum = { rank: [], fuera: [] };
  var tmp = {};
  meses.forEach(function (m) {
    var g = estRepFilasSec(dT, dV, m);
    g.rank.concat(g.fuera).forEach(function (f) {
      if (!tmp[f.key]) tmp[f.key] = { key: f.key, label: f.label, t: 0, v: 0, tot: 0 };
      tmp[f.key].t += f.t; tmp[f.key].v += f.v; tmp[f.key].tot += f.tot;
    });
  });
  Object.keys(tmp).forEach(function (k) {
    (EST_REP_FUERA_RANKING.indexOf(k) < 0 ? acum.rank : acum.fuera).push(tmp[k]);
  });
  acum.rank.sort(function (a, b) { return b.tot - a.tot; });
  y = estRepPintarBloqueRanking(doc, y, "Acumulado " + estCap(EST_MESES[meses[0]]) + " – " + estCap(EST_MESES[meses[meses.length - 1]]) + " 2026", acum, null, null);

  // Mes a mes, el más reciente primero
  var mesActual = new Date().getMonth();
  for (var i = meses.length - 1; i >= 0; i--) {
    var m = meses[i];
    var g = estRepFilasSec(dT, dV, m);
    var prev = i > 0 && meses[i - 1] === m - 1 ? estRepFilasSec(dT, dV, meses[i - 1]) : null;
    var alto = 10.5 + 5.8 + g.rank.length * 5.6 + (g.fuera.length ? 4.5 : 0) + 5;
    if (y + alto > 285) { doc.addPage(); y = 15; }
    var titulo = estCap(EST_MESES[m]) + " 2026" + (m === mesActual ? " (en curso)" : "");
    y = estRepPintarBloqueRanking(doc, y, titulo, g, prev, dT.dias[m] || dV.dias[m]);
  }
  doc.save("Ranking_secretarias_" + estRepSello() + ".pdf");
}

// ── controles en la pantalla de Estadísticas ──────────────────────
function estRepControlesHtml() {
  var e = estExpEstiloBoton();
  var opts = '<option value="todos">Todos (una hoja por profesional)</option>'
    + EST_MEDICOS.map(function (m) { return '<option value="' + m.key + '">' + m.label + '</option>'; }).join("");
  return '<div data-est-skip="1" style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin:-4px 0 14px;padding:9px 12px;'
    + 'background:var(--co-card,#fbf8f0);border:1px solid var(--co-line,#d9d0b8);border-radius:10px">'
    + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
    +   '<span style="font-size:0.74rem;font-weight:700">Reporte por profesional</span>'
    +   '<select id="estRepProf" style="padding:6px 8px;border:1px solid var(--co-line,#d9d0b8);border-radius:8px;font-size:0.78rem;font-family:inherit">' + opts + '</select>'
    +   '<button onclick="estRepProfesionalPdf(document.getElementById(\'estRepProf\').value)" title="Consultas, turnos, cirugías y % de consultas que terminan en cirugía, mes a mes" style="' + e + '">⬇ PDF</button>'
    + '</div>'
    + '<div style="display:flex;gap:6px;align-items:center">'
    +   '<span style="font-size:0.74rem;font-weight:700">Secretarias</span>'
    +   '<button onclick="estRepRankingSecretariasPdf()" title="Ranking de cada mes y acumulado 2026" style="' + e + '">⬇ Ranking mensual (PDF)</button>'
    + '</div></div>';
}
