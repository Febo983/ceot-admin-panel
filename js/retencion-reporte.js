// ══════ RETENCIÓN GANANCIAS — REPORTE INDIVIDUAL ═════════════════
// Pedido de Marcelo, 19/11/2026: además del detalle de todo CEOT, poder sacar
// un reporte por profesional, mes a mes y con el total, fácil de leer.
// Una hoja A4 vertical por profesional:
//   1) Total retenido + hasta qué vencimiento de Ganancias le alcanza (cobertura).
//   2) Tira de vencimientos (cubierto / al acreditar / no cubierto / pagado).
//   3) Una sola tabla mes a mes con Colón / OSDE / CEM, %, retención y acumulado.
// Todo en UNA página por profesional (pedido del 19/11/2026: más compacto).
// Usa los MISMOS números que la tabla "Registro mensual": c.aporteCeot de
// calcularNetoLocal (retención devengada de la liquidación, la que va al
// contador para Ganancias).

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
      ret: c.aporteCeot || 0
    });
  });
  return out;
}

// Cobertura del pago de Ganancias de un profesional: hasta qué vencimiento le
// alcanza lo retenido. Misma cuenta que la tabla "Reparto del fondo" (Acumulado
// = retención YA acreditada + intereses de plazos fijos − vencimientos marcados
// como pagados; calendario con el reparto que le toca de cada pago). Devuelve
// también hasta dónde llegaría si se acreditaran los cheques que faltan del
// período (retención devengada − acreditada), que es lo que se retuvo "en papel".
function retRepCobertura(d) {
  if (typeof incidenciaApellidos !== "function" || incidenciaApellidos().indexOf(d.apellido) < 0) return null;
  var ap = d.apellido, plan = incidenciaPlanCargar();
  var pct = INCIDENCIA_FONDO_PCT[ap] || 0, pctAnt = incidenciaAnticipoPct(ap);
  var inm = Math.round((plan.inm || 0) * pct), d30 = Math.round((plan.d30 || 0) * pct);
  var cuota = Math.round((plan.cuota || 0) * pct), ant = Math.round((plan.ant || 0) * pctAnt);
  var calOrig = incidenciaCalendario(inm, d30, cuota, plan.nc || 0, ant, plan.na || 0);
  var pagos = incidenciaPagosCargar();
  var invData = (typeof invAcumuladoProfesionalData === "function") ? invAcumuladoProfesionalData() : { acum: {} };
  var acum = (getAporteCeotAcumuladoPorApellido([ap])[ap] || 0) + ((invData.acum[ap] || {}).interes || 0);
  var cal = calOrig.slice();
  calOrig.forEach(function(v, i) { if (pagos[i]) { acum -= v; cal[i] = 0; } });
  var pendiente = 0;
  APORTE_CEOT_DESDE.forEach(function(p) {
    var c = calcularNetoLocal(p, d);
    if (c) pendiente += (c.aporteCeot || 0) - aporteCeotAcreditadoHoy(c);
  });
  var n = incidenciaMesesQueCubre(acum, cal);
  var nTodo = incidenciaMesesQueCubre(acum + pendiente, cal);
  var saldo = acum;
  for (var i = 0; i < n; i++) saldo -= cal[i];
  return {
    calOrig: calOrig, pagos: pagos, acum: acum, pendiente: pendiente, n: n, nTodo: nTodo,
    proxFalta: n < cal.length ? Math.max(0, cal[n] - saldo) : 0,
    totalPlan: cal.length
  };
}

// "Cubierto hasta Dic/26", o un texto si no cubre ninguno / todos.
function retRepTextoCubre(n, total) {
  if (n <= 0) return "Todavía no cubre ningún vencimiento";
  if (n >= total) return "Cubre todo el plan (hasta " + incidenciaMesCorto(total - 1) + ")";
  return "Cubierto hasta " + incidenciaMesCorto(n - 1);
}

// Dibuja la hoja de un profesional en UNA página: arriba el total retenido y la
// cobertura de Ganancias, después la tira de vencimientos y una sola tabla mes a
// mes con la apertura Colón / OSDE / CEM. `doc` es un jsPDF portrait A4 y la hoja
// arranca en la página actual (el que llama hace addPage entre profesionales).
function retRepPintarHoja(doc, d, interesPF, hoy) {
  var LM = 15, RM = 195, W = 210;
  var datos = retRepDatos(d);
  var mesActual = tabMesActual();
  var cob = retRepCobertura(d);
  var total = datos.reduce(function(s, m) { return s + m.ret; }, 0);
  var baseTot = datos.reduce(function(s, m) { return s + m.base; }, 0);
  function pct(v) { return (Math.round(v * 1000) / 10) + "%"; }

  // Encabezado
  doc.setFillColor(31, 58, 46);
  doc.rect(LM, 10, RM - LM, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
  doc.text("CEOT — CLÍNICA TRAUMATOLÓGICA COLÓN", W / 2, 17, { align: "center" });
  doc.setFontSize(8.5);
  doc.text("RETENCIÓN GANANCIAS — REPORTE INDIVIDUAL", W / 2, 22.5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  var y = 35;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(d.nombre, LM, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Emitido: " + hoy + "   ·   % vigente: " + (Math.round((getAporteCeotPct(d.apellido) || 0) * 1000) / 10) + "%", RM, y, { align: "right" });
  doc.setTextColor(0, 0, 0);

  // Dos cajas lado a lado: total retenido | cobertura de Ganancias
  y += 5;
  var altoCaja = 30, mid = LM + 84;
  doc.setDrawColor(210, 205, 190); doc.setFillColor(244, 242, 236);
  doc.roundedRect(LM, y, 84, altoCaja, 2, 2, "FD");
  doc.roundedRect(mid + 3, y, RM - mid - 3, altoCaja, 2, 2, "FD");
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
  doc.text("TOTAL RETENIDO A LA FECHA", LM + 5, y + 6);
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(31, 58, 46);
  doc.text(fmtPDF(total), LM + 5, y + 16);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
  doc.text(datos.length + (datos.length === 1 ? " mes" : " meses") + " · promedio " + fmtPDF(datos.length ? total / datos.length : 0) + " por mes", LM + 5, y + 22);
  if (interesPF > 0) doc.text("+ intereses de plazos fijos " + fmtPDF(interesPF), LM + 5, y + 26.5);

  var xc = mid + 8;
  doc.text("PAGO DE GANANCIAS — HASTA DÓNDE ALCANZA", xc, y + 6);
  if (cob) {
    var todo = cob.n >= cob.totalPlan;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
    if (todo) doc.setTextColor(22, 107, 58); else if (cob.n > 0) doc.setTextColor(31, 58, 46); else doc.setTextColor(177, 58, 44);
    doc.text(retRepTextoCubre(cob.n, cob.totalPlan), xc, y + 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
    doc.text("Con lo ya acreditado: " + fmtPDF(cob.acum), xc, y + 19.5);
    if (!todo) doc.text("Próximo (" + incidenciaMesCorto(cob.n) + "): faltan " + fmtPDF(cob.proxFalta), xc, y + 23.5);
    if (cob.nTodo > cob.n) {
      doc.text("Al acreditarse el resto (" + fmtPDF(cob.pendiente) + "): " + retRepTextoCubre(cob.nTodo, cob.totalPlan).toLowerCase(), xc, y + 27.5);
    }
  } else {
    doc.setFontSize(8); doc.text("Este profesional no participa del reparto del fondo.", xc, y + 14);
  }
  doc.setTextColor(0, 0, 0);
  y += altoCaja + 5;

  // Tira de vencimientos
  if (cob) {
    var nv = cob.calOrig.length, bw = (RM - LM) / nv;
    for (var i = 0; i < nv; i++) {
      var pagado = !!cob.pagos[i], ok = i < cob.n, okTodo = i < cob.nTodo;
      var fill = pagado ? [225, 228, 224] : ok ? [214, 236, 222] : okTodo ? [253, 240, 205] : [246, 217, 213];
      var x0 = LM + i * bw;
      doc.setFillColor(fill[0], fill[1], fill[2]); doc.setDrawColor(255, 255, 255);
      doc.rect(x0, y, bw, 12, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(60, 60, 60);
      doc.text(incidenciaMesCorto(i), x0 + bw / 2, y + 4, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.3);
      doc.text(fmtPDF(cob.calOrig[i]), x0 + bw / 2, y + 7.6, { align: "center" });
      doc.setFontSize(5.8); doc.setTextColor(100, 100, 100);
      doc.text(pagado ? "pagado" : ok ? "cubierto" : okTodo ? "al acreditar" : "no cubierto", x0 + bw / 2, y + 10.6, { align: "center" });
    }
    doc.setTextColor(0, 0, 0);
    y += 17;
  }

  if (!datos.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(120, 120, 120);
    doc.text("Todavía no hay períodos con retención cargada para este profesional.", LM, y + 4);
    doc.setTextColor(0, 0, 0);
    return;
  }

  // Tabla mes a mes (una sola, con apertura de honorarios)
  var X = { col: 74, osde: 96, cem: 116, hon: 140, pct: 153, ret: 174, acum: 195 };
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(31, 58, 46);
  doc.text("Mes a mes", LM, y);
  y += 4.5;
  doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
  doc.text("Período", LM + 1, y);
  doc.text("Colón", X.col, y, { align: "right" });
  doc.text("OSDE", X.osde, y, { align: "right" });
  doc.text("CEM", X.cem, y, { align: "right" });
  doc.text("Honorarios", X.hon, y, { align: "right" });
  doc.text("%", X.pct, y, { align: "right" });
  doc.text("Retención", X.ret, y, { align: "right" });
  doc.text("Acumulado", X.acum - 1, y, { align: "right" });
  doc.setDrawColor(31, 58, 46); doc.line(LM, y + 1.8, RM, y + 1.8);
  doc.setTextColor(0, 0, 0);
  y += 6;
  var acum = 0, tCol = 0, tOs = 0, tCem = 0, hayCurso = false;
  datos.forEach(function(m, i) {
    if (y > 275) { doc.addPage(); y = 20; }
    acum += m.ret; tCol += m.c.colonBruto || 0; tOs += m.c.osde || 0; tCem += m.c.cm || 0;
    if (i % 2 === 0) { doc.setFillColor(248, 247, 242); doc.rect(LM, y - 4, RM - LM, 5.6, "F"); }
    var curso = m.p === mesActual; if (curso) hayCurso = true;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.3);
    doc.text(periodoNombre(m.p) + (curso ? " *" : ""), LM + 1, y);
    doc.text(fmtPDF(m.c.colonBruto || 0), X.col, y, { align: "right" });
    doc.text(m.c.osde ? fmtPDF(m.c.osde) : "—", X.osde, y, { align: "right" });
    doc.text(m.c.cm ? fmtPDF(m.c.cm) : "—", X.cem, y, { align: "right" });
    doc.text(fmtPDF(m.base), X.hon, y, { align: "right" });
    doc.text(pct(m.pct), X.pct, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(fmtPDF(m.ret), X.ret, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(fmtPDF(acum), X.acum - 1, y, { align: "right" });
    y += 5.6;
  });
  doc.setDrawColor(31, 58, 46); doc.line(LM, y - 3.2, RM, y - 3.2);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("TOTAL", LM + 1, y + 1.5);
  doc.text(fmtPDF(tCol), X.col, y + 1.5, { align: "right" });
  doc.text(fmtPDF(tOs), X.osde, y + 1.5, { align: "right" });
  doc.text(fmtPDF(tCem), X.cem, y + 1.5, { align: "right" });
  doc.text(fmtPDF(baseTot), X.hon, y + 1.5, { align: "right" });
  doc.setTextColor(31, 58, 46);
  doc.text(fmtPDF(total), X.ret, y + 1.5, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 9;

  doc.setFont("helvetica", "italic"); doc.setFontSize(6.8); doc.setTextColor(120, 120, 120);
  var nota = "Retención = honorarios del período (Colón + OSDE + CEM) × % del profesional, según la liquidación de cada mes; es el monto que se informa para Ganancias, esté o no acreditado el cheque. "
    + (hayCurso ? "* Mes en curso: puede seguir subiendo a medida que se acrediten los cheques que faltan. " : "")
    + (cob ? "Cobertura: se usa lo ya acreditado más intereses de plazos fijos, menos los vencimientos ya pagados, contra lo que le toca de cada vencimiento (mismo cálculo que Reparto del fondo). "
      + "Verde = cubierto · amarillo = se cubre cuando se acrediten los cheques pendientes · rojo = no cubierto · gris = ya pagado." : "");
  if (y > 285) { doc.addPage(); y = 20; }
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

// ══════ ALERTA: RETENCIÓN QUE NO ALCANZA PARA EL VENCIMIENTO ═════
// Pedido de Marcelo, 20/11/2026: que el panel le avise (solo a él) cuando un
// profesional no llega a juntar con su retención lo que hay que pagar de
// Ganancias, con 30 días de anticipación.
// Para cada socio mira los vencimientos NO pagados que caen dentro de los
// próximos 30 días (o ya vencidos) y toma el primero que su fondo no cubre:
//   "al acreditar" = hoy no llega, pero sí cuando entren los cheques que faltan.
//   "no llega"     = ni con los cheques pendientes alcanza.
// Misma cuenta que retRepCobertura (Acumulado + intereses − pagados).
var RET_ALERTA_DIAS = 30;
// Día del mes en que vence cada pago del calendario (el calendario del plan solo
// tiene mes, no día). Se usa el 13 = el más temprano de los vencimientos de
// Ganancias, así el aviso salta antes y no después. Ajustar acá si hace falta.
var RET_ALERTA_DIA_VENC = 13;

function retRepAlertas(hoy) {
  hoy = hoy || new Date();
  var hoy0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  var out = [];
  retRepSocios().forEach(function(d) {
    var cob = retRepCobertura(d);
    if (!cob) return;
    var acum = 0, accTodo = 0, sumCal = 0;
    var cal = cob.calOrig.map(function(v, i) { return cob.pagos[i] ? 0 : v; });
    for (var i = 0; i < cal.length; i++) {
      if (!cal[i]) continue;
      var m = INCIDENCIA_MES1.mes - 1 + i;
      var fecha = new Date(INCIDENCIA_MES1.anio + Math.floor(m / 12), m % 12, RET_ALERTA_DIA_VENC);
      var dias = Math.round((fecha - hoy0) / 86400000);
      if (dias > RET_ALERTA_DIAS) break;
      sumCal += cal[i];
      if (cob.n > i) continue;                  // lo cubre lo ya acreditado
      var falta = sumCal - cob.acum;
      var faltaTodo = sumCal - (cob.acum + cob.pendiente);
      out.push({
        doc: d, idx: i, fecha: fecha, dias: dias, monto: cal[i],
        falta: Math.max(0, Math.round(falta)),
        estado: cob.nTodo > i ? "acreditar" : "no-llega",
        faltaTodo: Math.max(0, Math.round(faltaTodo))
      });
      break;
    }
  });
  out.sort(function(a, b) { return a.dias - b.dias || b.falta - a.falta; });
  return out;
}

function retRepAlertasHtml() {
  var al;
  try { al = retRepAlertas(); } catch (e) { return ""; }
  if (!al.length) return "";
  var fd = function(f) { return ("0" + f.getDate()).slice(-2) + "/" + ("0" + (f.getMonth() + 1)).slice(-2) + "/" + f.getFullYear(); };
  var filas = al.map(function(a) {
    var rojo = a.estado === "no-llega";
    var cuando = a.dias < 0 ? "vencido hace " + (-a.dias) + " d" : (a.dias === 0 ? "vence hoy" : "vence en " + a.dias + " d");
    return '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;padding:5px 0;border-top:1px dashed rgba(15,28,40,.15)">'
      + '<span style="font-weight:800;min-width:150px">' + (rojo ? '🔴 ' : '🟡 ') + admHomeHudEsc(a.doc.nombre) + '</span>'
      + '<span style="font-size:.78rem">' + incidenciaMesCorto(a.idx) + ' · ' + fd(a.fecha) + ' · ' + cuando + '</span>'
      + '<span style="font-size:.78rem;font-weight:700;color:' + (rojo ? '#c0392b' : '#a86a00') + '">'
      +   (rojo ? 'No llega: faltan $ ' + fmt(a.faltaTodo) + ' aun con los cheques pendientes'
                : 'Hoy faltan $ ' + fmt(a.falta) + ' (llega al acreditarse los cheques pendientes)') + '</span>'
      + '</div>';
  }).join("");
  return '<div onclick="renderAporteCeot()" style="cursor:pointer;margin-bottom:14px;padding:10px 14px;border:2px solid #c0392b;border-radius:10px;background:#fff4f1;color:#1c2b3a">'
    + '<div style="font-size:.74rem;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#c0392b;margin-bottom:4px">'
    +   'Retención en riesgo · Ganancias (próximos ' + RET_ALERTA_DIAS + ' días)</div>'
    + filas
    + '<div style="font-size:.68rem;opacity:.6;margin-top:4px">Tocá para ver Retención Ganancias. Se calcula con lo acreditado hoy + intereses − vencimientos tildados como pagados.</div>'
    + '</div>';
}
