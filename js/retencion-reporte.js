// ══════ RETENCIÓN GANANCIAS — REPORTE INDIVIDUAL ═════════════════
// Pedido de Marcelo, 19/11/2026: además del detalle de todo CEOT, poder sacar
// un reporte por profesional, mes a mes y con el total, fácil de leer.
// Una hoja A4 vertical por profesional:
//   1) Cuánto lleva retenido en total (número grande) + su % vigente.
//   2) Tabla mes a mes: base (Colón + OSDE + CEM), %, retención, acumulado.
//   3) Detalle de cada mes por acreditación (cada cheque Colón, OSDE, CEM).
// Usa los MISMOS números que la tabla "Registro mensual": c.aporteCeot de
// calcularNetoLocal (retención devengada de la liquidación, la que va al
// contador para Ganancias) y retencionPorAcreditacion para el detalle.

function retRepSocios() {
  return DOCTORES.filter(function(d) { return APORTE_CEOT_PCT[d.apellido] !== null; });
}

// Meses con retención cargada de un profesional.
function retRepDatos(d) {
  var out = [];
  APORTE_CEOT_DESDE.forEach(function(p) {
    var c = calcularNetoLocal(p, d);
    if (!c || !c.aporteCeot) return;
    out.push({
      p: p, c: c,
      base: (c.colonBruto || 0) + (c.osde || 0) + (c.cm || 0),
      pct: c.pctAporte || 0,
      ret: c.aporteCeot || 0,
      items: retencionPorAcreditacion(c)
    });
  });
  return out;
}

// Dibuja la hoja de un profesional. `doc` es un jsPDF portrait A4 y la hoja
// arranca en la página actual (el que llama hace addPage entre profesionales).
function retRepPintarHoja(doc, d, interesPF, hoy) {
  var LM = 15, RM = 195, W = 210;
  var xBase = 98, xPct = 118, xRet = 152, xAcum = 195;
  var datos = retRepDatos(d);
  var mesActual = tabMesActual();

  // Encabezado
  doc.setFillColor(31, 58, 46);
  doc.rect(LM, 12, RM - LM, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12.5);
  doc.text("CEOT — CLÍNICA TRAUMATOLÓGICA COLÓN", W / 2, 21, { align: "center" });
  doc.setFontSize(9.5);
  doc.text("RETENCIÓN GANANCIAS — REPORTE INDIVIDUAL", W / 2, 28.5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  var y = 45;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(d.nombre, LM, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  var pctVig = getAporteCeotPct(d.apellido);
  doc.text("Emitido: " + hoy + "   ·   % vigente: " + (Math.round((pctVig || 0) * 1000) / 10) + "%", RM, y, { align: "right" });
  doc.setTextColor(0, 0, 0);

  // Resumen en una caja
  var total = datos.reduce(function(s, m) { return s + m.ret; }, 0);
  var baseTot = datos.reduce(function(s, m) { return s + m.base; }, 0);
  y += 7;
  doc.setFillColor(244, 242, 236);
  doc.setDrawColor(210, 205, 190);
  doc.roundedRect(LM, y, RM - LM, interesPF > 0 ? 36 : 28, 2, 2, "FD");
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text("TOTAL RETENIDO A LA FECHA", LM + 6, y + 8);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.setTextColor(31, 58, 46);
  doc.text(fmtPDF(total), LM + 6, y + 19);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text(datos.length + (datos.length === 1 ? " mes con retención" : " meses con retención"), RM - 6, y + 8, { align: "right" });
  doc.text("Sobre honorarios de " + fmtPDF(baseTot), RM - 6, y + 14, { align: "right" });
  if (datos.length) {
    doc.text("Promedio mensual: " + fmtPDF(total / datos.length), RM - 6, y + 20, { align: "right" });
  }
  var yCaja = y + 24;
  if (interesPF > 0) {
    doc.setTextColor(60, 60, 60);
    doc.text("+ Intereses ya generados por plazos fijos: " + fmtPDF(interesPF) + "   →   Total real: " + fmtPDF(total + interesPF), LM + 6, y + 31);
    yCaja = y + 36;
  }
  doc.setTextColor(0, 0, 0);
  y = yCaja + 10;

  if (!datos.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Todavía no hay períodos con retención cargada para este profesional.", LM, y);
    doc.setTextColor(0, 0, 0);
    return;
  }

  function cabecera(titulo, yy) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.setTextColor(31, 58, 46);
    doc.text(titulo, LM, yy);
    doc.setTextColor(0, 0, 0);
    yy += 5;
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text("Período", LM, yy);
    doc.text("Honorarios", xBase, yy, { align: "right" });
    doc.text("%", xPct, yy, { align: "right" });
    doc.text("Retención", xRet, yy, { align: "right" });
    doc.text("Acumulado", xAcum, yy, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(31, 58, 46);
    doc.line(LM, yy + 2, RM, yy + 2);
    return yy + 7;
  }
  function pct(v) { return (Math.round(v * 1000) / 10) + "%"; }

  // 1) Mes a mes
  y = cabecera("Mes a mes", y);
  var acum = 0;
  datos.forEach(function(m, i) {
    if (y > 270) { doc.addPage(); y = cabecera("Mes a mes (continuación)", 20); }
    acum += m.ret;
    if (i % 2 === 0) { doc.setFillColor(248, 247, 242); doc.rect(LM, y - 4.5, RM - LM, 6.5, "F"); }
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    var lbl = periodoNombre(m.p) + (m.p === mesActual ? "  (en curso)" : "");
    doc.text(lbl, LM + 1, y);
    doc.text(fmtPDF(m.base), xBase, y, { align: "right" });
    doc.text(pct(m.pct), xPct, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(fmtPDF(m.ret), xRet, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(fmtPDF(acum), xAcum - 1, y, { align: "right" });
    y += 6.5;
  });
  doc.setDrawColor(31, 58, 46);
  doc.line(LM, y - 3, RM, y - 3);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.text("TOTAL", LM + 1, y + 2);
  doc.text(fmtPDF(baseTot), xBase, y + 2, { align: "right" });
  doc.setTextColor(31, 58, 46);
  doc.text(fmtPDF(total), xRet, y + 2, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 14;

  // 2) Detalle por acreditación
  if (y > 255) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.setTextColor(31, 58, 46);
  doc.text("Detalle de cada mes", LM, y);
  doc.setTextColor(0, 0, 0);
  y += 6;
  datos.forEach(function(m) {
    var filas = m.items.length || 1;
    if (y + 7 + filas * 5 > 280) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.setFillColor(238, 236, 228);
    doc.rect(LM, y - 4.5, RM - LM, 6.5, "F");
    doc.text(periodoNombre(m.p), LM + 1, y);
    doc.text(fmtPDF(m.ret), xRet, y, { align: "right" });
    y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    m.items.forEach(function(it) {
      doc.setTextColor(70, 70, 70);
      doc.text(it.label, LM + 5, y);
      doc.text(fmtPDF(it.bruto), xBase, y, { align: "right" });
      doc.text(pct(m.pct), xPct, y, { align: "right" });
      doc.text(fmtPDF(it.retencion), xRet, y, { align: "right" });
      y += 5;
    });
    doc.setTextColor(0, 0, 0);
    y += 3;
  });

  // Nota final
  if (y > 268) { doc.addPage(); y = 20; }
  y += 2;
  doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  var nota = "Retención = honorarios del período (cheques Colón + OSDE + CEM) × el % del profesional, según la liquidación de cada mes; "
    + "es el monto que se informa para Ganancias, esté o no ya acreditado el cheque en el banco. El mes en curso puede seguir subiendo a medida que se acrediten los cheques que faltan. "
    + "Los meses sin importes cargados no figuran.";
  doc.text(doc.splitTextToSize(nota, RM - LM), LM, y);
  doc.setTextColor(0, 0, 0);
}

// elegido: apellido de un profesional, o "" / "todos" para una hoja por profesional.
function descargarReporteRetencionIndividual() {
  if (!window.jspdf) { alert("La librería PDF aún se está cargando. Esperá un segundo y volvé a intentar."); return; }
  var sel = document.getElementById("aporte-rep-prof");
  var elegido = sel ? sel.value : "todos";
  var socios = retRepSocios();
  var lista = elegido && elegido !== "todos"
    ? socios.filter(function(d) { return d.apellido === elegido; })
    : socios;
  if (!lista.length) { alert("No encontré a ese profesional."); return; }

  var invData = invAcumuladoProfesionalData();
  var h = new Date();
  var hoy = String(h.getDate()).padStart(2, "0") + "/" + String(h.getMonth() + 1).padStart(2, "0") + "/" + h.getFullYear();
  var doc = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  lista.forEach(function(d, i) {
    if (i > 0) doc.addPage();
    retRepPintarHoja(doc, d, (invData.acum[d.apellido] || {}).interes || 0, hoy);
  });
  var nombre = lista.length === 1 ? "RetencionGanancias_" + lista[0].apellido.replace(/\s+/g, "") : "RetencionGanancias_individuales";
  doc.save(nombre + "_" + h.getFullYear() + "-" + String(h.getMonth() + 1).padStart(2, "0") + "-" + String(h.getDate()).padStart(2, "0") + ".pdf");
}

// Controles que se insertan debajo de "Descargar PDF — detalle y total".
function retRepControlesHtml() {
  var opts = '<option value="todos">Todos (una hoja por profesional)</option>'
    + retRepSocios().map(function(d) { return '<option value="' + escAttr(d.apellido) + '">' + escAttr(d.nombre) + '</option>'; }).join("");
  return '<div style="margin-top:14px;padding:10px 12px;background:rgba(32,36,31,.04);border:1px solid rgba(32,36,31,.12);border-radius:8px">'
    + '<div style="font-size:.78rem;font-weight:700;color:#20241f;margin-bottom:6px">Reporte individual — mes a mes y total</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    + '<select id="aporte-rep-prof" style="padding:6px 8px;border:1px solid rgba(32,36,31,.2);border-radius:6px;font-size:.85rem;font-family:inherit;min-width:230px">' + opts + '</select>'
    + '<button class="cpsm-dl-btn" style="display:inline-block" onclick="actionFeedback(this); descargarReporteRetencionIndividual()">⬇ Descargar reporte individual (PDF)</button>'
    + '</div></div>';
}
