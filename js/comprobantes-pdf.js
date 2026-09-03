// comprobantes-pdf.js — extraído de index.html. Marcado persistente de
// botones de acción (actionFeedback/actionDone*) + generación de PDF de
// comprobantes del historial. Solo definiciones.

// ══════ COMPROBANTES PDF ════════════════════════════════════════

// Marcado persistente en botones de acción (copiar/guardar/descargar/imprimir):
// además del flash "✅ Listo" de siempre, el botón queda en verde permanente
// (localStorage, sobrevive a recargas) hasta que se lo vuelve a clickear —
// sirve para llevar control visual de qué ya se hizo. La clave se arma con el
// onclick literal del botón (ya trae los datos que lo hacen único por fila:
// fecha, apellido, importe, id...) + su título/texto.
// (ACTION_DONE_KEYS está declarada más arriba, junto al primer uso.)

function actionDoneCargar() {
  try {
    var raw = localStorage.getItem("ceot_action_done");
    if (raw) ACTION_DONE_KEYS = JSON.parse(raw) || {};
  } catch (e) { ACTION_DONE_KEYS = {}; }
  syncPull("ceot_action_done", function() {
    actionDoneCargar();
    actionDoneRepintarTodo();
  });
}

function actionDoneGuardar() {
  localStorage.setItem("ceot_action_done", JSON.stringify(ACTION_DONE_KEYS));
  syncPush("ceot_action_done");
}

function actionDoneKey(btn) {
  return (btn.getAttribute("onclick") || "") + "|" + (btn.title || btn.textContent || "");
}

function actionDoneAplicar(btn) {
  if (ACTION_DONE_KEYS[actionDoneKey(btn)]) btn.classList.add("action-marked");
  else btn.classList.remove("action-marked");
}

// Repinta (o vuelve a evaluar) el estado marcado de todos los botones dentro
// de root — se llama al cargar y cada vez que el observer detecta HTML nuevo
// insertado por cualquiera de los render*() del panel (todos reconstruyen su
// contenedor con innerHTML, así que el estado hay que reaplicarlo cada vez).
function actionDoneRepintarTodo(root) {
  (root || document).querySelectorAll('[onclick*="actionFeedback(this)"],[onclick*="copiarTexto("]').forEach(actionDoneAplicar);
}

function actionFeedback(btn) {
  if (!btn) return;
  var key = actionDoneKey(btn);
  if (ACTION_DONE_KEYS[key]) {
    // ya estaba marcado: este clic lo destilda, sin flash de "Listo"
    delete ACTION_DONE_KEYS[key];
    actionDoneGuardar();
    actionDoneAplicar(btn);
    return;
  }
  if (btn.dataset.pdfBusy) return;
  btn.dataset.pdfBusy = "1";
  var original = btn.innerHTML;
  btn.innerHTML = "✅ Listo";
  btn.classList.add("action-done");
  setTimeout(function () {
    btn.innerHTML = original;
    btn.classList.remove("action-done");
    delete btn.dataset.pdfBusy;
    ACTION_DONE_KEYS[key] = true;
    actionDoneGuardar();
    actionDoneAplicar(btn);
  }, 1100);
}

function fmtPDF(n) {
  // Formato pesos argentinos: $ 1.234.567
  return "$ " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function descargarComprobanteHistorial(pid) {
  var doctor = doctorActual;
  if (!doctor) return;

  if (!window.jspdf) {
    alert("La librería PDF aún se está cargando. Esperá un segundo y volvé a intentar.");
    return;
  }

  var c = calcularNetoLocal(pid, doctor);
  if (!c) { alert("No hay datos para este período todavía."); return; }

  var jsPDF = window.jspdf.jsPDF;
  var doc   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  var W = 210, LM = 20, RM = 190, CW = 170;
  var today = new Date();
  var todayStr = String(today.getDate()).padStart(2,"0") + "/" +
                 String(today.getMonth()+1).padStart(2,"0") + "/" +
                 today.getFullYear();

  doc.setFillColor(31, 58, 46);
  doc.rect(LM, 15, CW, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("CEOT — CLÍNICA TRAUMATOLÓGICA COLÓN", W/2, 24, { align:"center" });
  doc.setFontSize(9.5);
  doc.text("COMPROBANTE DE HONORARIOS", W/2, 31, { align:"center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("Período: " + c.label, W/2, 37, { align:"center" });

  var y = 50;
  doc.setTextColor(0, 0, 0); doc.setFontSize(9);
  [
    ["Doctor:",    doctor.nombre],
    ["Matrícula:", doctor.pass],
    ["Emitido:",   todayStr],
  ].forEach(function(pair) {
    doc.setFont("helvetica", "bold");   doc.text(pair[0], LM, y);
    doc.setFont("helvetica", "normal"); doc.text(pair[1], LM + 28, y);
    y += 7;
  });
  doc.setDrawColor(180, 180, 180); doc.line(LM, y, RM, y); y += 8;

  function fila(label, val, opts) {
    opts = opts || {};
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 9);
    doc.setTextColor(0, 0, 0);
    doc.text(label, LM + 5, y);
    if (opts.color) doc.setTextColor.apply(doc, opts.color);
    doc.text((opts.prefix || "") + fmtPDF(val), RM, y, { align:"right" });
    doc.setTextColor(0, 0, 0);
    y += opts.gap || 7;
  }

  fila("Bruto", c.bruto, { bold:true });
  fila("IIBB (3,5%)", c.iibb, { prefix:"- ", color:[180,0,0] });
  if (c.esLab) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("CPSM (5%)", LM + 5, y);
    doc.setTextColor(0, 130, 0); doc.text("EXENTO", RM, y, { align:"right" });
    doc.setTextColor(0, 0, 0); y += 7;
  } else {
    fila("CPSM (5%)", c.cpsm, { prefix:"- ", color:[180,0,0] });
  }
  if (c.ga)          fila("Gastos A", c.ga, { prefix:"- ", color:[180,0,0] });
  if (c.prestamoCasa > 0) fila("Préstamo Casa (" + c.prestamoCasaCuota + "/" + PRESTAMO_CASA_TOTAL_CUOTAS + ")", c.prestamoCasa, { prefix:"- ", color:[180,0,0] });
  if (c.prestamoCasa < 0) fila("Préstamo Casa · reintegro (" + c.prestamoCasaCuota + "/" + PRESTAMO_CASA_TOTAL_CUOTAS + ")", -c.prestamoCasa, { prefix:"+ ", color:[0,120,0] });
  if (c.aporteCeot > 0) fila("Retención Ganancias (" + Math.round(c.pctAporte*100) + "%)", c.aporteCeot, { prefix:"- ", color:[180,0,0] });
  if (c.cm > 0)      fila("Centro Médico", c.cm, { prefix:"+ ", color:[0,120,0] });

  doc.setDrawColor(31, 58, 46); doc.line(LM, y, RM, y); y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("NETO", LM + 5, y);
  if (c.neto < 0) doc.setTextColor(177, 58, 44);
  else            doc.setTextColor(31, 58, 46);
  doc.text(fmtPDF(c.neto), RM, y, { align:"right" });
  doc.setTextColor(0, 0, 0); y += 10;

  var totalCeotVal = (liquidacionData.totalCeot && liquidacionData.totalCeot[pid] && liquidacionData.totalCeot[pid][doctor.apellido]) || null;
  if (totalCeotVal) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Total liquidado CEOT (todos los conceptos): " + fmtPDF(totalCeotVal), LM, y); y += 6;
    doc.setTextColor(0, 0, 0);
  }

  if (c.pendiente) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text("* Valores estimados — período aún no cerrado definitivamente.", LM, y);
    doc.setTextColor(0, 0, 0);
  }

  var fname = "Comprobante_" + doctor.apellido.replace(/[^A-Za-z0-9]/g, "") + "_" + pid + ".pdf";
  doc.save(fname);
}

