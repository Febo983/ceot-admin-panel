// ═══════════════════════════════════════════════════════════════════
// portal-render.js — extraído de index.html.
// Render del portal del profesional (Enero/Mayo/Individual, Historial,
// Mi Panel, Notificaciones) + cálculos que comparten portal y admin
// (calcularNetoLocal, calcularDetalleChequesProfesional, calcularSueldoDirector).
// Solo definiciones — se carga antes del script principal.
// ═══════════════════════════════════════════════════════════════════

// ══════ RENDER MAYO (datos individuales por profesional) ════

// Enero no tiene cheques Colón ni CEM ni descuentos en la planilla — solo OSDE.
// No usa renderIndividual porque esa función corta todo si no hay fila de Colón.
function renderEnero(containerId, doctor) {
  var container = document.getElementById(containerId);
  var osdeExt = getExtra("enero", "osde", doctor.apellido);

  var html = '<div class="period-total">'
    + '<div class="pt-left">'
    + '<div class="pt-lbl">Enero 2026</div>'
    + '<div class="pt-val" style="color:rgba(32,36,31,.35);font-size:1.1rem">Sin cheques Colón</div>'
    + '<div class="pt-sub">Este mes no tuvo cheques diferidos</div>'
    + '</div><div class="pt-icon">💰</div></div>';

  html += '<div class="cheque-list">';
  html += extraRow("OSDE", osdeExt);
  html += '<div class="cl-row cl-sep-row"><span class="cl-date">—</span>'
    + '<span class="cl-lbl">Centro Médico <span style="font-size:.68rem;color:rgba(32,36,31,.35)">· sin liquidación previa</span></span>'
    + '<span class="cl-amt" style="color:rgba(32,36,31,.35);font-size:.75rem">—</span></div>';
  html += '<div class="cl-row cl-sep-row"><span class="cl-date">—</span>'
    + '<span class="cl-lbl">IIBB (3,5%)</span>'
    + '<span class="cl-amt" style="color:rgba(32,36,31,.35);font-size:.75rem">pendiente</span></div>';
  html += '<div class="cl-row cl-sep-row"><span class="cl-date">—</span>'
    + '<span class="cl-lbl">CPSM (5%)</span>'
    + '<span class="cl-amt" style="color:rgba(32,36,31,.35);font-size:.75rem">pendiente</span></div>';
  html += '<div class="cl-row cl-sep-row"><span class="cl-date">—</span>'
    + '<span class="cl-lbl">Gastos A</span>'
    + '<span class="cl-amt" style="color:rgba(32,36,31,.35);font-size:.75rem">pendiente</span></div>';
  html += '</div>';

  html += '<div class="mini-disc">⚠ Enero solo tiene datos de OSDE cargados — Colón, IIBB, CPSM y Gastos A todavía no están en la planilla.</div>';
  container.innerHTML = html;
}

function renderMayo(containerId, doctor) {
  var container = document.getElementById(containerId);

  // Match en MAYO_RAW por apellido
  var row = null;
  for (var i = 0; i < MAYO_RAW.length; i++) {
    if (MAYO_RAW[i].k === doctor.apellido) { row = MAYO_RAW[i]; break; }
  }

  var osdeExt = getExtra("mayo", "osde", doctor.apellido);
  var cmExt   = getExtra("mayo", "cm",   doctor.apellido); // CEM de Mayo se acredita en Junio, no se suma acá (ver más abajo)
  var html = '';

  if (row) {
    var vals = [row.f1, row.f2, row.f3, row.f4, row.f5];
    var colonTotal = vals.reduce(function(a,b){return a+b;}, 0);
    var osdeValTotal = (!osdeExt.pendiente && osdeExt.val) ? osdeExt.val : 0;
    var totalBruto = colonTotal + osdeValTotal;
    var subPartes = ["5 cheques Colón"];
    if (osdeValTotal) subPartes.push("OSDE");

    html += '<div class="period-total">'
      + '<div class="pt-left">'
      + '<div class="pt-lbl">Mayo 2026' + avisoTransferidoChipHtml("mayo", doctor) + '</div>'
      + '<div class="pt-val">' + fmt(totalBruto) + '</div>'
      + '<div class="pt-sub">' + subPartes.join(" + ") + ' · bruto</div>'
      + '</div><div class="pt-icon">💰</div></div>';

    var netosPorFechaMayo = {};
    vals.forEach(function(monto, idx) { netosPorFechaMayo[MAYO_FECHAS[idx]] = monto; });

    html += '<div class="cheque-list">';
    vals.forEach(function(monto, idx) {
      var fecha = MAYO_FECHAS[idx];
      var acred = chequeAcreditado(fecha);
      html += '<div class="cl-row' + (acred ? ' cl-acreditado' : ' cl-pendiente') + '">'
        + '<span class="cl-date">' + fecha + '</span>'
        + '<span class="cl-lbl">Cheque ' + (idx+1) + (acred ? ' <span class="cl-status-icon">✓</span>' : '') + '</span>'
        + '<span class="cl-amt">' + fmt(monto) + '</span>'
        + '</div>'
        + transfFamPortalDetalleHtml("mayo", doctor.apellido, fecha, monto, netosPorFechaMayo);
    });
    // OSDE — siempre presente
    html += extraRow("OSDE", osdeExt);
    // Centro Médico de Mayo se acredita en Junio — no se muestra en este tab
    html += '<div class="cl-row cl-sep-row">'
      + '<span class="cl-date">—</span>'
      + '<span class="cl-lbl">Centro Médico <span style="font-size:.68rem;color:rgba(32,36,31,.35)">· incluido en Jun 2026</span></span>'
      + '<span class="cl-amt" style="color:rgba(32,36,31,.35);font-size:.75rem">ver Junio</span>'
      + '</div>';
    // Gastos A Mayo → descuenta gastos de Junio
    var gaTotal = GASTOS_A["junio"];
    var gaPP    = gaTotal ? Math.round(gaTotal / 13) : null;
    if (gaPP) {
      html += '<div class="cl-row cl-sep-row cl-neg">'
        + '<span class="cl-date">—</span>'
        + '<span class="cl-lbl">Gastos A<span style="font-size:.68rem;color:rgba(32,36,31,.35);font-weight:400"> · Junio 2026</span></span>'
        + '<span class="cl-amt">−' + fmt(gaPP) + '</span>'
        + '</div>';
    } else {
      html += '<div class="cl-row cl-sep-row">'
        + '<span class="cl-date">—</span>'
        + '<span class="cl-lbl">Gastos A<span style="font-size:.68rem;color:rgba(32,36,31,.35);font-weight:400"> · Junio 2026</span></span>'
        + '<span class="cl-amt" style="color:rgba(32,36,31,.35);font-size:.75rem">pendiente</span>'
        + '</div>';
    }
    html += '<div style="font-size:.65rem;color:rgba(32,36,31,.35);padding:2px 0 6px 8px">⚑ Los Gastos A se descuentan del cheque actual para cubrir el mes siguiente</div>';
    html += '</div>';

  } else {
    html += '<div class="sin-datos">Sin datos Colón para Mayo.</div>';
  }

  html += '<div class="mini-disc">⚠ Importes brutos · no incluyen IIBB 3,5% ni CPSM 5%<br>📅 Los cheques se acreditan 48 hs. posteriores a la fecha indicada</div>';
  html += '<button class="btn-pdf" onclick="actionFeedback(this); descargarComprobanteHistorial(\'mayo\')">📄 Comprobante Mayo</button>';
  container.innerHTML = html;
}

// ══════ TRANSFERENCIAS A FAMILIARES (detalle en el portal) ═══
// Debajo de la fila de un cheque que Marcelo cargó como transferido (total o
// parcialmente) a un familiar, en vez de a la cuenta del profesional, muestra
// a quién y por cuánto. Reusa el mismo TRANSF_FAM que carga el panel admin
// (ver index.html, sección "Transferencias a familiares") — acá solo se lee,
// nunca se edita. netosPorFecha: mapa {fecha: netoDeEseCheque} de TODOS los
// cheques del mes de este profesional, para poder calcular el total de un
// grupo de cheques combinados y cuánto de ese grupo vuelve a su cuenta.
function transfFamPortalDetalleHtml(periodo, apellido, fecha, netoCheque, netosPorFecha) {
  if (typeof TRANSF_FAM === "undefined") return '';
  var profKey = transfFamProfKey(periodo, apellido);
  var todasEntries = TRANSF_FAM[profKey] || [];
  var relevantes = [];
  todasEntries.forEach(function(e, i) {
    if ((e.cheques || []).indexOf(fecha) !== -1) relevantes.push({ e: e, idx: i });
  });
  if (!relevantes.length) return '';

  var filas = relevantes.map(function(r) {
    var e = r.e, i = r.idx;
    var combinada = e.cheques.length > 1;
    var hecho = transfFamEstaTransferido(profKey, i);
    var linea2 = [e.aliasCbu, e.concepto].filter(Boolean).join(' · ');
    var tag = combinada
      ? 'combinado con ' + e.cheques.filter(function(f) { return f !== fecha; }).join(' + ')
      : 'a tu familiar';

    var html = '<div class="cl-sub">'
      +   '<span class="cl-sub-ico">🏠</span>'
      +   '<div class="cl-sub-body">'
      +     '<div class="cl-sub-name">' + escAttr(e.nombre) + ' <span class="tag">' + tag + '</span></div>'
      +     (linea2 ? '<div class="cl-sub-meta">' + escAttr(linea2) + '</div>' : '')
      +     (hecho ? '<div class="cl-sub-done">✓ Transferido</div>' : '')
      +   '</div>'
      +   '<div class="cl-sub-amt">' + fmt(e.importe) + '</div>'
      + '</div>';

    // "A tu cuenta" — una sola vez, en la última fecha del grupo combinado,
    // con lo que queda tras todas las transferencias que cubren ese mismo
    // conjunto exacto de cheques.
    if (combinada && fecha === e.cheques[e.cheques.length - 1]) {
      var netoGrupo = e.cheques.reduce(function(s, f) { return s + ((netosPorFecha || {})[f] || 0); }, 0);
      var transferidoGrupo = todasEntries.reduce(function(s, e2) {
        return s + (transfFamMismoGrupo(e2.cheques, e.cheques) ? (e2.importe || 0) : 0);
      }, 0);
      var resto = netoGrupo - transferidoGrupo;
      html += '<div class="cl-sub">'
        +   '<span class="cl-sub-ico">👤</span>'
        +   '<div class="cl-sub-body"><div class="cl-sub-name">A tu cuenta</div></div>'
        +   '<div class="cl-sub-amt">' + fmt(resto) + '</div>'
        + '</div>';
    }
    return html;
  }).join('');

  return filas;
}

// Resumen del mes: cuánto de tu neto fue a tu cuenta y cuánto a un familiar
// (puede ser más de una transferencia, algunas combinando varios cheques —
// no importa el detalle acá, solo el total). No se muestra si el profesional
// no tiene ninguna transferencia a familiar cargada este mes.
function transfFamResumenMesPortalHtml(periodo, apellido, netoFinal) {
  if (typeof TRANSF_FAM === "undefined") return '';
  var profKey = transfFamProfKey(periodo, apellido);
  var entries = TRANSF_FAM[profKey] || [];
  if (!entries.length) return '';

  var totalFamiliar = entries.reduce(function(s, e) { return s + (e.importe || 0); }, 0);
  var totalATuCuenta = netoFinal - totalFamiliar;

  return '<div class="resumen-fam">'
    +   '<div class="resumen-fam-row"><span>👤 A tu cuenta</span><span>' + fmt(totalATuCuenta) + '</span></div>'
    +   '<div class="resumen-fam-row"><span>🏠 A tu familiar' + (entries.length > 1 ? 'es' : '') + '</span><span>' + fmt(totalFamiliar) + '</span></div>'
    + '</div>';
}

// ══════ RENDER INDIVIDUAL (Junio / Julio) ════════════════════

var DISCLAIMER = '<div class="disclaimer">'
  + '<strong>⚠️ Importes brutos:</strong> No incluyen deducciones de '
  + '<strong>IIBB (3,5%)</strong>, <strong>CPSM (5%)</strong> '
  + 'ni el <strong>cheque de OSDE</strong>.'
  + '</div>';

function renderIndividual(rawData, fechas, periodo, containerId, doctor) {
  var container = document.getElementById(containerId);
  var mesLabels = { febrero:"Febrero 2026", marzo:"Marzo 2026", abril:"Abril 2026", junio:"Junio 2026", julio:"Julio 2026", agosto:"Agosto 2026", septiembre:"Septiembre 2026", octubre:"Octubre 2026", noviembre:"Noviembre 2026", diciembre:"Diciembre 2026" };
  var mes = mesLabels[periodo] || (periodo.charAt(0).toUpperCase() + periodo.slice(1) + " 2026");
  var valCls = "ind-" + periodo;
  var tagClsMap = { junio:"chtag-teal", julio:"chtag-violet", agosto:"chtag-violet" };
  var tagCls = tagClsMap[periodo] || "chtag-violet";

  // Match
  var row = null;
  for (var i=0; i<rawData.length; i++) {
    var key = rawData[i].k;
    if (periodo === "junio" && key === doctor.junioKey) { row = rawData[i]; break; }
    if (key === doctor.apellido) { row = rawData[i]; break; }
  }

  if (!row) {
    container.innerHTML = DISCLAIMER + '<div class="sin-datos">Sin datos para este período.</div>';
    return;
  }

  var vals = [row.f1, row.f2, row.f3, row.f4, row.f5];
  var total = vals.reduce(function(a,b){return a+b;}, 0);
  // Gastos A: se descuentan del cheque actual para cubrir el mes siguiente
  var _gaSigMes = {febrero:"marzo",marzo:"abril",abril:"mayo",mayo:"junio",junio:"julio",julio:"agosto",agosto:"septiembre",septiembre:"octubre",octubre:"noviembre",noviembre:"diciembre"};
  var gaTotal = GASTOS_A[_gaSigMes[periodo]] !== undefined ? GASTOS_A[_gaSigMes[periodo]] : null;
  var gaPP    = gaTotal ? Math.round(gaTotal / 13) : null;
  var osdeExt = getExtra(periodo, "osde", doctor.apellido);
  var cmExt   = getExtra(periodo, "cm",   doctor.apellido);

  // Gastos A — de qué acreditación sale la parte de este profesional (snapshot
  // publicado desde el panel admin, calculadora de Gastos A). Solo informativo:
  // no cambia ningún total. gaAporteAnot(clave) devuelve la línea "↳ $X aporta
  // a Gastos A" para el cheque/OSDE/CEM que corresponda.
  var gaPub    = (typeof gastosAPublicadoCargar === "function") ? gastosAPublicadoCargar(periodo) : null;
  var gaProf   = (gaPub && gaPub.porProfesional && gaPub.porProfesional[doctor.apellido]) || null;
  var gaPartes = gaProf && gaProf.partes && gaProf.partes.length ? gaProf.partes : null;
  var gaFaltante = gaProf ? (gaProf.faltante || 0) : 0;
  // Chip discreto al lado de la acreditación que aporta a Gastos A (sin monto —
  // los montos van consolidados en un solo recuadro debajo de la línea Gastos A).
  function gaChipFor(clave) {
    if (!gaPartes) return '';
    if (!gaPartes.filter(function(p){ return p.clave === clave; })[0]) return '';
    return ' <span style="display:inline-block;font-size:.6rem;font-weight:700;background:rgba(146,97,15,.14);color:#92610f;border-radius:9px;padding:1px 7px;margin-left:5px;vertical-align:1px;text-transform:uppercase;letter-spacing:.03em">Gastos A</span>';
  }

  // Bruto total del período: 5 cheques Colón + OSDE + CEM cuando ya estén
  // disponibles (mientras estén pendientes no se suman — ver extraRow más abajo).
  var osdeValTotal = (!osdeExt.pendiente && osdeExt.val) ? osdeExt.val : 0;
  var cmValTotal   = (!cmExt.pendiente   && cmExt.val)   ? cmExt.val   : 0;
  var totalBruto = total + osdeValTotal + cmValTotal;
  var subPartes = ["5 cheques Colón"];
  if (osdeValTotal) subPartes.push("OSDE");
  if (cmValTotal)   subPartes.push("CEM");

  // IIBB y CPSM — calculados temprano para poder anotarlos en el 4to y 5to
  // cheque (ver forEach de abajo), que es de donde salen en la práctica.
  var iibbData2 = PERIODO_IIBB[periodo];
  var cpsmData2 = PERIODO_CPSM[periodo];
  var esLab2    = (doctor.user === "labayen");
  var osdeForNet = (!osdeExt.pendiente && osdeExt.val) ? osdeExt.val : 0;
  var brutoParaDesc = total + osdeForNet;
  var iibbAmt  = iibbData2 === null
               ? Math.round(brutoParaDesc * 0.035)
               : Math.round((iibbData2[doctor.apellido]||0));
  var cpsmAmt  = esLab2 ? 0
               : (cpsmData2 === null || cpsmData2[doctor.apellido] == null
                  ? 0
                  : Math.round(cpsmData2[doctor.apellido] || 0));

  // Retención Ganancias y Préstamo Casa — calculados temprano para poder anotarlos
  // en cada cheque individual (ver forEach de abajo), además de las líneas resumen
  // que ya se arman más abajo en esta misma función.
  var pctApCheq = APORTE_CEOT_DESDE.indexOf(periodo) !== -1 ? getAporteCeotPctPeriodo(periodo, doctor.apellido) : null;
  var prestamoCuotaCheq = PRESTAMO_CASA_CUOTA[periodo] || null;
  var prestamoIndCheq = 0;
  if (prestamoCuotaCheq) {
    if (PRESTAMO_CASA_SOCIOS.indexOf(doctor.apellido) !== -1) prestamoIndCheq = PRESTAMO_CASA_MONTO;
    else if (PRESTAMO_CASA_SOCIOS_A.indexOf(doctor.apellido) !== -1) prestamoIndCheq = -PRESTAMO_CASA_MONTO_CREDITO;
  }

  var html = '<div class="period-total">'
    + '<div class="pt-left">'
    + '<div class="pt-lbl">' + mes + avisoTransferidoChipHtml(periodo, doctor) + '</div>'
    + '<div class="pt-val">' + fmt(totalBruto) + '</div>'
    + '<div class="pt-sub">' + subPartes.join(" + ") + ' · bruto</div>'
    + '</div><div class="pt-icon">💰</div></div>';

  // Sueldo Director — solo para los 5 socios que cobran este concepto; les avisa
  // cuánto y en qué fecha se les transfiere, sin exponer el resto del cálculo
  // interno (retención/CPSM/IIBB de los demás cheques ya se ve más abajo igual).
  if (typeof SUELDO_DIRECTOR_LISTA !== "undefined" && SUELDO_DIRECTOR_LISTA.indexOf(doctor.apellido) !== -1 && typeof calcularSueldoDirector === "function") {
    var sd = calcularSueldoDirector(periodo, doctor, SUELDO_DIRECTOR_MONTO);
    if (sd) {
      var sdTxt = fmt(sd.monto);
      html += '<div style="background:rgba(201,147,58,.12);border:1px solid rgba(201,147,58,.35);border-radius:10px;padding:10px 12px;margin-bottom:10px">'
        + '<div style="font-size:.68rem;font-weight:700;color:#8a6423;text-transform:uppercase;letter-spacing:.04em">🏦 Sueldo Director' + avisoTransferidoChipHtml(periodo, doctor) + '</div>'
        + '<div style="font-size:.85rem;font-weight:700;color:#20241f;margin-top:2px">' + sdTxt + '</div>'
        + '</div>';
    }
  }

  // Neto de un cheque puntual (bruto − préstamo del 1ro − retención −
  // IIBB del 4to − CPSM del 5to) — extraído a función para poder calcular
  // de antemano el neto de TODOS los cheques del mes (netosPorFecha), que
  // hace falta para mostrar transferencias a familiares combinadas (ver
  // transfFamPortalDetalleHtml más abajo).
  function netoDeCheque(monto, idx) {
    var retCheq = pctApCheq ? Math.round(monto * pctApCheq) : 0;
    var iibbLineAmt = (idx === 3 && iibbAmt) ? iibbAmt : 0;
    var cpsmLineAmt = (idx === 4 && !esLab2 && cpsmAmt) ? cpsmAmt : 0;
    var prestamoLineAmt = (idx === 0 && prestamoIndCheq) ? prestamoIndCheq : 0;
    return monto - prestamoLineAmt - retCheq - iibbLineAmt - cpsmLineAmt;
  }
  var netosPorFecha = {};
  vals.forEach(function(monto, idx) { netosPorFecha[fechas[idx]] = netoDeCheque(monto, idx); });

  html += '<div class="cheque-list">';
  vals.forEach(function(monto, idx) {
    var fecha = fechas[idx];
    var acred = chequeAcreditado(fecha);
    // Descuentos de este cheque, consolidados en una sola línea gris tenue
    // (antes eran 2-4 renglones rojos por cheque). El neto se muestra en la
    // misma línea del bruto: "$ bruto → $ neto".
    // Color: descuentos en rojo, créditos (reintegro/exento) en verde. El bruto
    // arranca en negro (.cl-amt) y el neto va en verde/rojo más abajo.
    var descPartes = [];
    var iibbLineAmt = 0, cpsmLineAmt = 0, prestamoLineAmt = 0;
    if (idx === 0 && prestamoIndCheq) {
      prestamoLineAmt = prestamoIndCheq;
      descPartes.push(prestamoIndCheq > 0
        ? '<span style="color:#b13a2c">préstamo −' + fmt(prestamoIndCheq) + '</span>'
        : '<span style="color:#16a34a">reintegro +' + fmt(-prestamoIndCheq) + '</span>');
    }
    if (idx === 3 && iibbAmt) { iibbLineAmt = iibbAmt; descPartes.push('<span style="color:#b13a2c">IIBB −' + fmt(iibbAmt) + '</span>'); }
    if (idx === 4) {
      if (esLab2) descPartes.push('<span style="color:#16a34a">CPSM exento</span>');
      else if (cpsmAmt) { cpsmLineAmt = cpsmAmt; descPartes.push('<span style="color:#b13a2c">CPSM −' + fmt(cpsmAmt) + '</span>'); }
    }
    var retCheq = pctApCheq ? Math.round(monto * pctApCheq) : 0;
    if (retCheq) descPartes.push('<span style="color:#b13a2c">ret. ' + (pctApCheq*100) + '% −' + fmt(retCheq) + '</span>');

    var tieneDesc = (idx === 0 && prestamoIndCheq) || retCheq || iibbLineAmt || cpsmLineAmt;
    var amtHtml = fmt(monto);
    if (tieneDesc) {
      var netoCheque = netosPorFecha[fecha];
      amtHtml += ' <span style="color:rgba(32,36,31,.4);font-weight:400">→</span> '
        + '<span style="color:' + (netoCheque < 0 ? '#b13a2c' : '#16a34a') + '">' + fmt(netoCheque) + '</span>'
        + '<div style="font-size:.62rem;font-weight:400;color:rgba(32,36,31,.45);margin-top:1px">' + descPartes.join('  ·  ') + '</div>';
    }
    html += '<div class="cl-row' + (acred ? ' cl-acreditado' : ' cl-pendiente') + '">'
      + '<span class="cl-date">' + fecha + '</span>'
      + '<span class="cl-lbl">Cheque ' + (idx+1) + (acred ? ' <span class="cl-status-icon">✓</span>' : '') + gaChipFor(fecha) + '</span>'
      + '<span class="cl-amt">' + amtHtml + '</span>'
      + '</div>'
      + transfFamPortalDetalleHtml(periodo, doctor.apellido, fecha, netosPorFecha[fecha], netosPorFecha);
  });
  // OSDE — siempre presente
  var osdeValAnot = (!osdeExt.pendiente && osdeExt.val) ? osdeExt.val : 0;
  html += extraRow("OSDE", osdeExt, retencionExtraAnotHtml(osdeValAnot, pctApCheq), gaChipFor("Cheque OSDE"));
  // Centro Médico — liquidación del mes anterior, acreditado 1ra semana del mes actual
  var prevMesNombre = {"mayo":"Abril","junio":"Mayo","julio":"Junio","agosto":"Julio","septiembre":"Agosto","octubre":"Sep","noviembre":"Oct","diciembre":"Nov"};
  var cmLabel = "Centro Médico" + (prevMesNombre[periodo] ? " · Liquid. " + prevMesNombre[periodo] : "");
  var cmValAnot = (!cmExt.pendiente && cmExt.val) ? cmExt.val : 0;
  html += extraRow(cmLabel, cmExt, retencionExtraAnotHtml(cmValAnot, pctApCheq), gaChipFor("Acreditación CEM"));
  // Gastos A — se descuenta del cheque actual para cubrir gastos del mes siguiente
  var sigMesNombre = {"febrero":"Marzo","marzo":"Abril","abril":"Mayo","mayo":"Junio","junio":"Julio","julio":"Agosto","agosto":"Septiembre","septiembre":"Octubre","octubre":"Noviembre","noviembre":"Diciembre"};
  var gaLabelMes = sigMesNombre[periodo] ? " · " + sigMesNombre[periodo] + " 2026" : "";
  if (gaPP) {
    html += '<div class="cl-row cl-sep-row cl-neg">'
      + '<span class="cl-date">—</span>'
      + '<span class="cl-lbl">Gastos A<span style="font-size:.68rem;color:rgba(32,36,31,.35);font-weight:400">' + gaLabelMes + '</span></span>'
      + '<span class="cl-amt">−' + fmt(gaPP) + '</span>'
      + '</div>';
  } else {
    html += '<div class="cl-row cl-sep-row">'
      + '<span class="cl-date">—</span>'
      + '<span class="cl-lbl">Gastos A<span style="font-size:.68rem;color:rgba(32,36,31,.35);font-weight:400">' + gaLabelMes + '</span></span>'
      + '<span class="cl-amt" style="color:rgba(32,36,31,.35);font-size:.75rem">pendiente</span>'
      + '</div>';
  }
  if (gaPP && gaPartes) {
    var gaResumen = gaPartes.map(function(p){
      var etq = p.clave === "Cheque OSDE" ? "OSDE" : (p.clave === "Acreditación CEM" ? "CEM" : "Cheque " + p.clave);
      return etq + ' ' + fmt(p.monto);
    }).join('  +  ');
    if (gaFaltante) gaResumen += '  ·  resto ' + fmt(gaFaltante);
    html += '<div style="margin:4px 0 2px;padding:7px 10px;background:rgba(146,97,15,.10);border-radius:8px;font-size:.66rem;color:#92610f;line-height:1.5">'
      + 'Se cubre con: ' + gaResumen
      + '<br><span style="opacity:.8">Se descuenta este mes para cubrir ' + ((sigMesNombre[periodo] || 'el mes siguiente').toLowerCase()) + '.</span>'
      + '</div>';
  } else {
    html += '<div style="font-size:.62rem;color:rgba(32,36,31,.35);padding:2px 0 6px 8px">⚑ Los Gastos A se descuentan del cheque actual para cubrir el mes siguiente</div>';
  }
  html += '</div>';

  // Préstamo Casa 14 de julio 2067 (grupo B: descuento · grupo A: reintegro, desde Agosto 2026)
  var prestamoCuota = PRESTAMO_CASA_CUOTA[periodo] || null;
  var prestamoInd = 0;
  if (prestamoCuota) {
    if (PRESTAMO_CASA_SOCIOS.indexOf(doctor.apellido) !== -1) prestamoInd = PRESTAMO_CASA_MONTO;
    else if (PRESTAMO_CASA_SOCIOS_A.indexOf(doctor.apellido) !== -1) prestamoInd = -PRESTAMO_CASA_MONTO_CREDITO;
  }
  if (prestamoInd) {
    html += '<div class="cheque-list"><div class="cl-row cl-sep-row' + (prestamoInd > 0 ? ' cl-neg' : '') + '">'
      + '<span class="cl-date">—</span>'
      + '<span class="cl-lbl">Préstamo Casa <span style="font-size:.68rem;color:rgba(32,36,31,.35);font-weight:400">' + (prestamoInd > 0 ? 'cuota' : 'reintegro') + ' ' + prestamoCuota + '/' + PRESTAMO_CASA_TOTAL_CUOTAS + '</span></span>'
      + '<span class="cl-amt"' + (prestamoInd < 0 ? ' style="color:#16a34a"' : '') + '>' + (prestamoInd > 0 ? '−' + fmt(prestamoInd) : '+' + fmt(-prestamoInd)) + '</span>'
      + '</div></div>';
  }

  // ── Descuentos del período (Retención Ganancias + IIBB + CPSM en un bloque) ──
  html += '<div style="font-size:.62rem;letter-spacing:.04em;text-transform:uppercase;color:rgba(32,36,31,.4);margin:12px 2px 3px">Descuentos del período</div>';
  html += '<div class="cheque-list">';

  // Retención Ganancias (desde julio en adelante)
  var periodoConAporteInd = APORTE_CEOT_DESDE.indexOf(periodo) !== -1;
  if (periodoConAporteInd) {
    var pctAp = getAporteCeotPctPeriodo(periodo, doctor.apellido);
    var osdeValInd = (!osdeExt.pendiente && osdeExt.val) ? osdeExt.val : 0;
    var cmValInd   = (!cmExt.pendiente   && cmExt.val)   ? cmExt.val   : 0;
    var baseAp     = total + osdeValInd + cmValInd;
    if (pctAp !== null && pctAp !== undefined && pctAp > 0) {
      var montoAp = Math.round(baseAp * pctAp);
      html += '<div class="cl-row cl-sep-row cl-neg">'
        + '<span class="cl-date">—</span>'
        + '<span class="cl-lbl">Retención Ganancias (' + (pctAp*100) + '%)</span>'
        + '<span class="cl-amt">−' + fmt(montoAp) + '</span>'
        + '</div>';
    } else if (pctAp === null || pctAp === undefined) {
      html += '<div class="cl-row cl-sep-row">'
        + '<span class="cl-date">—</span>'
        + '<span class="cl-lbl">Retención Ganancias</span>'
        + '<span class="cl-amt" style="color:rgba(32,36,31,.35);font-size:.75rem">pendiente</span>'
        + '</div>';
    }
  }
  // ── IIBB y CPSM ya calculados más arriba (iibbAmt / cpsmAmt / esLab2) ────
  var cmForNet = (!cmExt.pendiente && cmExt.val) ? cmExt.val : 0;
  var gaAmt    = gaPP || 0;
  var apAmt    = 0;
  if (periodoConAporteInd) {
    var pctAp2 = getAporteCeotPctPeriodo(periodo, doctor.apellido);
    if (pctAp2 > 0) apAmt = Math.round((total + osdeForNet + cmForNet) * pctAp2);
  }
  var netoFinal = total + osdeForNet + cmForNet - iibbAmt - cpsmAmt - gaAmt - apAmt - prestamoInd;

  // IIBB — bloque "Descuentos del período", en rojo como todo descuento
  html += '<div class="cl-row cl-sep-row cl-neg">'
    + '<span class="cl-date">—</span>'
    + '<span class="cl-lbl">IIBB (3,5%)</span>'
    + '<span class="cl-amt">−' + fmt(iibbAmt) + '</span>'
    + '</div>';
  // CPSM
  if (esLab2) {
    html += '<div class="cl-row cl-sep-row">'
      + '<span class="cl-date">—</span>'
      + '<span class="cl-lbl">CPSM (5%)</span>'
      + '<span class="cl-amt" style="color:#16a34a;font-size:.75rem">EXENTO ✓</span>'
      + '</div>';
  } else {
    html += '<div class="cl-row cl-sep-row cl-neg">'
      + '<span class="cl-date">—</span>'
      + '<span class="cl-lbl">CPSM (5%)</span>'
      + '<span class="cl-amt">−' + fmt(cpsmAmt) + '</span>'
      + '</div>';
  }
  html += '</div>';

  // ── NETO total ───────────────────────────────────────────
  var netoFinalColor = netoFinal < 0 ? '#b13a2c' : '#16a34a';
  var netoFinalBg     = netoFinal < 0 ? 'rgba(177,58,44,0.08)' : 'rgba(22,163,74,0.08)';
  html += '<div class="hist-neto-line" style="margin:8px 0 4px;padding:10px 12px;background:' + netoFinalBg + ';border-radius:0;border-left:3px solid ' + netoFinalColor + '">'
    + '<span style="font-weight:700;color:' + netoFinalColor + ';letter-spacing:.05em">NETO ESTIMADO</span>'
    + '<span style="font-weight:700;font-size:1.1rem;color:' + netoFinalColor + '">' + fmt(netoFinal) + '</span>'
    + '</div>';
  html += transfFamResumenMesPortalHtml(periodo, doctor.apellido, netoFinal);

  // Aviso "ya transferido" — aparece cuando Marcelo tildó la transferencia del
  // mes en el panel admin (Sueldo Director / Resto de profesionales).
  if (transferenciaMesHecha(periodo, doctor)) {
    html += '<div style="display:flex;align-items:center;gap:8px;margin:6px 0 4px;padding:9px 12px;'
      + 'background:rgba(22,163,74,0.10);border-left:3px solid #16a34a;color:#0f7a37;font-weight:700;font-size:.8rem">'
      + '<span>✓</span><span>Transferencia del mes realizada</span></div>';
  }

  html += '<div class="mini-disc">📅 Los cheques se acreditan 48 hs. posteriores a la fecha indicada</div>';
  html += '<button class="btn-pdf" onclick="actionFeedback(this); descargarComprobanteHistorial(\'' + periodo + '\')">📄 Comprobante ' + mes + '</button>';
  container.innerHTML = html;
}

// ══════ HISTORIAL ════════════════════════════════════════════

// Calcula neto desde datos locales hardcodeados (no depende del API remoto)
function calcularNetoLocal(pid, doc) {
  var rawMap   = { febrero:FEBRERO_RAW, marzo:MARZO_RAW, abril:ABRIL_RAW, mayo:MAYO_RAW, junio:JUNIO_RAW, julio:JULIO_RAW, agosto:AGOSTO_RAW,
                   septiembre:SEPTIEMBRE_RAW, octubre:OCTUBRE_RAW, noviembre:NOVIEMBRE_RAW, diciembre:DICIEMBRE_RAW };
  var fechasMap = { febrero:FEBRERO_FECHAS, marzo:MARZO_FECHAS, abril:ABRIL_FECHAS, mayo:MAYO_FECHAS, junio:JUNIO_FECHAS, julio:JULIO_FECHAS, agosto:AGOSTO_FECHAS,
                    septiembre:SEPTIEMBRE_FECHAS, octubre:OCTUBRE_FECHAS, noviembre:NOVIEMBRE_FECHAS, diciembre:DICIEMBRE_FECHAS };
  var labelMap = { febrero:"Febrero 2026", marzo:"Marzo 2026", abril:"Abril 2026", mayo:"Mayo 2026", junio:"Junio 2026", julio:"Julio 2026", agosto:"Agosto 2026",
                   septiembre:"Septiembre 2026", octubre:"Octubre 2026", noviembre:"Noviembre 2026", diciembre:"Diciembre 2026" };
  var raw = rawMap[pid];
  if (!raw) return null;

  // JUNIO_RAW usa junioKey ("BRUNI, Maximiliano"); el resto usa apellido ("BRUNI")
  var matchKey = (pid === "junio") ? doc.junioKey : doc.apellido;
  if (!matchKey) return null;  // profesional sin datos para este período

  var row = null;
  for (var i = 0; i < raw.length; i++) {
    if (raw[i].k === matchKey) { row = raw[i]; break; }
  }
  if (!row) return null;

  var colonBruto = (row.f1||0)+(row.f2||0)+(row.f3||0)+(row.f4||0)+(row.f5||0);
  var fechas = fechasMap[pid] || [];
  var colonCheques = [row.f1||0, row.f2||0, row.f3||0, row.f4||0, row.f5||0].map(function(monto, i) {
    return { fecha: fechas[i] || null, monto: monto };
  });

  var osdeExt = getExtra(pid, "osde", doc.apellido);
  var cmExt   = getExtra(pid, "cm",   doc.apellido);

  var osdeVal      = (!osdeExt.pendiente && osdeExt.val) ? osdeExt.val : 0;
  var cmVal        = (!cmExt.pendiente   && cmExt.val)   ? cmExt.val   : 0;
  var hayPendiente = osdeExt.pendiente || cmExt.pendiente;
  var bruto        = colonBruto + osdeVal;

  if (bruto === 0 && cmVal === 0) return null;

  var esLab    = (doc.user === "labayen");
  var iibbData = PERIODO_IIBB[pid];
  var iibb     = iibbData === null
               ? Math.round(bruto * 0.035)
               : Math.round(iibbData[doc.apellido] || 0);
  var cpsmData = PERIODO_CPSM[pid];
  var cpsm     = esLab ? 0
               : (cpsmData === null || cpsmData[doc.apellido] == null
                  ? 0
                  : Math.round(cpsmData[doc.apellido] || 0));
  var _gaSig = {febrero:"marzo",marzo:"abril",abril:"mayo",mayo:"junio",junio:"julio",julio:"agosto",agosto:"septiembre",septiembre:"octubre",octubre:"noviembre",noviembre:"diciembre"};
  var gaT   = GASTOS_A[_gaSig[pid]] !== undefined ? GASTOS_A[_gaSig[pid]] : null;
  var ga    = gaT ? Math.round(gaT / 13) : 0;
  // Retención Ganancias — aplica desde Julio 2026; base = Colón + OSDE + CEM
  var periodoConAporte = APORTE_CEOT_DESDE.indexOf(pid) !== -1;
  var pctAporte  = getAporteCeotPctPeriodo(pid, doc.apellido);
  var baseAporte = colonBruto + osdeVal + cmVal;
  var aporteCeot = (periodoConAporte && pctAporte) ? Math.round(baseAporte * pctAporte) : 0;
  // Préstamo Casa 14 de julio 2067 — grupo B: descuento (+) · grupo A: reintegro (−), desde Agosto 2026
  var prestamoCasaCuota = PRESTAMO_CASA_CUOTA[pid] || null;
  var prestamoCasa = 0;
  if (prestamoCasaCuota) {
    if (PRESTAMO_CASA_SOCIOS.indexOf(doc.apellido) !== -1) prestamoCasa = PRESTAMO_CASA_MONTO;
    else if (PRESTAMO_CASA_SOCIOS_A.indexOf(doc.apellido) !== -1) prestamoCasa = -PRESTAMO_CASA_MONTO_CREDITO;
  }
  var neto  = bruto - iibb - cpsm - ga - aporteCeot - prestamoCasa + cmVal;

  return {
    label: labelMap[pid] || pid,
    bruto: bruto, colonBruto: colonBruto, colonCheques: colonCheques, osde: osdeVal,
    iibb: iibb, cpsm: cpsm,
    ga: ga, cm: cmVal, aporteCeot: aporteCeot, pctAporte: pctAporte,
    prestamoCasa: prestamoCasa, prestamoCasaCuota: prestamoCasaCuota,
    neto: neto, pendiente: hayPendiente, osdePendiente: osdeExt.pendiente, cmPendiente: cmExt.pendiente,
    osdeFecha: osdeExt.fecha, cmFecha: cmExt.fecha, esLab: esLab
  };
}

// Desglosa la Retención Ganancias por cada acreditación individual (los cheques
// Colón con fecha + OSDE + CEM) en vez de un monto único — mismo % aplicado a
// cada uno; la suma de "retencion" da exactamente c.aporteCeot.
function retencionPorAcreditacion(c) {
  if (!c || !c.pctAporte) return [];
  var items = [];
  (c.colonCheques || []).forEach(function(chq, i) {
    if (chq.monto > 0) {
      items.push({
        label: "Cheque " + (i + 1) + (chq.fecha ? " (" + chq.fecha + ")" : ""),
        bruto: chq.monto, retencion: Math.round(chq.monto * c.pctAporte)
      });
    }
  });
  if (c.osde > 0) items.push({ label: "OSDE", bruto: c.osde, retencion: Math.round(c.osde * c.pctAporte) });
  if (c.cm > 0)   items.push({ label: "CEM",  bruto: c.cm,   retencion: Math.round(c.cm * c.pctAporte) });
  return items;
}

// Detalle cheque por cheque de CUALQUIER profesional (director o no): la
// Retención Ganancias sale de cada cheque Colón a medida que entra (no se
// puede reservar el bruto de un cheque para nada, ya sale descontado desde
// ese momento). El Préstamo Casa (crédito o descuento, según el grupo del
// profesional) sale del cheque 1. IIBB se reserva del cheque 4 y CPSM del
// cheque 5 — así lo maneja el contador en la práctica (son los cheques más
// caudalosos del mes). Devuelve el neto real cheque por cheque y el
// acumulado — la base que usan tanto Sueldo Director como Resto de
// profesionales para no duplicar la lógica.
function calcularDetalleChequesProfesional(periodo, doc) {
  var c = calcularNetoLocal(periodo, doc);
  if (!c) return null;

  // La Retención Ganancias arranca en Agosto 2026 (ver APORTE_CEOT_DESDE,
  // datos.js) — c.pctAporte es el % vigente del profesional sin importar el
  // período (calcularNetoLocal ya lo filtra para el total del mes, c.aporteCeot,
  // pero no lo expone filtrado). Sin este chequeo, un mes anterior a Agosto
  // termina restando esta retención cheque por cheque igual, aunque el total
  // del mes (c.aporteCeot) sí la haya excluido correctamente.
  var pctAporteDesdeCorresponde = APORTE_CEOT_DESDE.indexOf(periodo) !== -1 ? (c.pctAporte || 0) : 0;

  // OJO: IIBB/CPSM van atados al 4to y 5to cheque REALES del mes (así lo maneja
  // el contador — son los más caudalosos), no al 4to/5to que sobreviva el
  // filtro de "cheques con monto cargado". Antes se armaba `cheques` con
  // .filter() y se miraba el índice YA filtrado (i===3/i===4) — si algún
  // cheque anterior todavía no estaba cargado (0), todo se corría un lugar y
  // IIBB/CPSM terminaban en el cheque equivocado (o en ninguno, si quedaban
  // menos de 4-5 cheques cargados — típico de un profesional recién
  // incorporado a mitad de mes). Se guarda el índice original (0-4, antes del
  // filtro) para que la asignación sea siempre al cheque 4/5 real.
  var IDX_IIBB_CHEQUE = 3, IDX_CPSM_CHEQUE = 4;
  var cheques = (c.colonCheques || [])
    .map(function(chq, i) { return { fecha: chq.fecha, monto: chq.monto, origIdx: i }; })
    .filter(function(chq) { return chq.monto > 0; });
  var cum = 0;
  var detalle = [];

  // Acreditación CEM va SIEMPRE primera (antes del primer cheque Colón del
  // mes, incluso en el acumulado) — corresponde a la liquidación del mes
  // anterior (desfasaje real de facturación del Centro Médico) y en la
  // práctica se acredita antes que el primer cheque. Pedido explícito de
  // Marcelo, 20/08/2026 — antes se agregaba al final junto con OSDE (que
  // ahora va entre el 4to y 5to cheque, ver más abajo, no al final).
  var _idxMesCem = MESES_CPSM.indexOf(periodo);
  var _mesAnteriorCem = _idxMesCem > 0 ? MESES_CPSM[_idxMesCem - 1] : null;
  var _mesAnteriorCemCap = _mesAnteriorCem ? _mesAnteriorCem.charAt(0).toUpperCase() + _mesAnteriorCem.slice(1) : null;
  var cemInfo = _mesAnteriorCemCap ? ["liquidación de " + _mesAnteriorCemCap] : [];
  if (c.cmPendiente) {
    var infoPendCem = cemInfo.concat(c.cmFecha ? [c.cmFecha] : []);
    detalle.push({ fecha: "Acreditación CEM" + (infoPendCem.length ? " (" + infoPendCem.join(" · ") + ")" : ""), bruto: null, retencion: null, prestamo: 0, iibb: 0, cpsm: 0, neto: null, acumulado: cum, pendiente: true });
  } else if (c.cm > 0) {
    var retencionCem = Math.round(c.cm * pctAporteDesdeCorresponde);
    var netoCem = c.cm - retencionCem;
    cum += netoCem;
    detalle.push({ fecha: "Acreditación CEM" + (cemInfo.length ? " (" + cemInfo.join(" · ") + ")" : ""), bruto: c.cm, retencion: retencionCem, prestamo: 0, iibb: 0, cpsm: 0, neto: netoCem, acumulado: cum });
  }

  // Cheque OSDE va entre el 4to y 5to cheque real (mismo criterio de origIdx
  // que IIBB/CPSM más abajo, no de posición filtrada) — pedido de Marcelo,
  // 20/08/2026. Si el 4to real todavía no cargó este mes, se cae al final
  // como fallback (para no perderlo).
  function pushOsdeRow() {
    if (c.osdePendiente) {
      var infoPendOsde = c.osdeFecha ? [c.osdeFecha] : [];
      detalle.push({ fecha: "Cheque OSDE" + (infoPendOsde.length ? " (" + infoPendOsde.join(" · ") + ")" : ""), bruto: null, retencion: null, prestamo: 0, iibb: 0, cpsm: 0, neto: null, acumulado: cum, pendiente: true });
    } else if (c.osde > 0) {
      var retencionOsde = Math.round(c.osde * pctAporteDesdeCorresponde);
      var netoOsde = c.osde - retencionOsde;
      cum += netoOsde;
      detalle.push({ fecha: "Cheque OSDE", bruto: c.osde, retencion: retencionOsde, prestamo: 0, iibb: 0, cpsm: 0, neto: netoOsde, acumulado: cum });
    }
  }

  var osdeInsertado = false;
  var iibbAplicado = false, cpsmAplicado = false;
  cheques.forEach(function(chq, i) {
    var retencion = Math.round(chq.monto * pctAporteDesdeCorresponde);
    var neto = chq.monto - retencion;
    var prestamoAqui = 0, iibbAqui = 0, cpsmAqui = 0;
    if (i === 0) { prestamoAqui = c.prestamoCasa || 0; neto -= prestamoAqui; } // prestamoAqui > 0 = descuento, < 0 = crédito (mismo signo que c.prestamoCasa) — sale del primer cheque que llegue, no ata a un índice real
    if (chq.origIdx === IDX_IIBB_CHEQUE) { iibbAqui = c.iibb || 0; neto -= iibbAqui; iibbAplicado = true; }
    if (chq.origIdx === IDX_CPSM_CHEQUE) { cpsmAqui = c.cpsm || 0; neto -= cpsmAqui; cpsmAplicado = true; }
    cum += neto;
    detalle.push({ fecha: chq.fecha, bruto: chq.monto, retencion: retencion, prestamo: prestamoAqui, iibb: iibbAqui, cpsm: cpsmAqui, neto: neto, acumulado: cum });
    if (chq.origIdx === IDX_IIBB_CHEQUE) { osdeInsertado = true; pushOsdeRow(); }
  });
  if (!osdeInsertado) pushOsdeRow();

  // Si el cheque 4 o 5 real todavía no cargó, IIBB/CPSM quedan sin poder
  // aplicarse a ningún cheque — antes esto los perdía en silencio (el
  // "Acumulado" de esta tabla quedaba más alto que el neto real de
  // calcularNetoLocal). Ahora se deja una fila "pendiente".
  if (!iibbAplicado && c.iibb > 0) {
    detalle.push({ fecha: "IIBB (pendiente — cheque " + (IDX_IIBB_CHEQUE+1) + " sin cargar)", bruto: null, retencion: null, prestamo: 0, iibb: 0, cpsm: 0, neto: null, acumulado: cum, pendiente: true });
  }
  if (!cpsmAplicado && c.cpsm > 0) {
    detalle.push({ fecha: "CPSM (pendiente — cheque " + (IDX_CPSM_CHEQUE+1) + " sin cargar)", bruto: null, retencion: null, prestamo: 0, iibb: 0, cpsm: 0, neto: null, acumulado: cum, pendiente: true });
  }

  // ultimaFecha (usada para saber si "todavía suma" o ya pasó) mira solo la
  // cronología real de cheques Colón — CEM va primero y OSDE queda intercalado
  // entre el 4to y 5to, ninguno de los dos es "la última fecha real".
  var ultimaFecha = null;
  for (var _u = detalle.length - 1; _u >= 0; _u--) {
    if (/^\d{2}\/\d{2}$/.test(detalle[_u].fecha) || detalle[_u].fecha.indexOf('IIBB (pendiente') === 0 || detalle[_u].fecha.indexOf('CPSM (pendiente') === 0) {
      ultimaFecha = detalle[_u].fecha; break;
    }
  }

  return { doc: doc, periodo: periodo, detalle: detalle, totalNetoMes: cum, pctAporte: pctAporteDesdeCorresponde, ultimaFecha: ultimaFecha };
}

// Sueldo Director: toma el detalle cheque por cheque y encuentra la fecha en
// la que el acumulado neto alcanza el monto objetivo (ej. $4.000.000).
function calcularSueldoDirector(periodo, doc, monto) {
  var base = calcularDetalleChequesProfesional(periodo, doc);
  if (!base) return null;
  monto = monto || SUELDO_DIRECTOR_MONTO;

  var fechaCompleta = null;
  var yaAlcanzo = false;
  base.detalle.forEach(function(d) {
    if (!yaAlcanzo && d.acumulado >= monto) { fechaCompleta = d.fecha; yaAlcanzo = true; }
  });

  var totalNetoMes = base.totalNetoMes;
  var alcanza = yaAlcanzo;
  var saldoFinal = totalNetoMes - monto;

  return {
    doc: doc, periodo: periodo, monto: monto,
    detalle: base.detalle, fechaCompleta: fechaCompleta, alcanza: alcanza,
    faltante: alcanza ? 0 : (monto - totalNetoMes),
    totalNetoMes: totalNetoMes, saldoFinal: saldoFinal, pctAporte: base.pctAporte
  };
}

// Abre/cierra el detalle de descuentos de un período en el Historial (ver
// renderHistorial) — colapsado por defecto para no abrumar con 3-5 líneas
// rojas sueltas cuando lo único que importa de un vistazo es el total.
function histToggleDesc(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var abierto = el.classList.toggle('open');
  var arrow = document.getElementById(id + '_arrow');
  if (arrow) arrow.textContent = abierto ? '▾' : '▸';
}

function renderHistorial(doctor) {
  var pane = document.getElementById("pane-historial");
  if (!pane) return;

  // Períodos con datos locales disponibles
  var meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  var resultados = [];

  meses.forEach(function(pid) {
    var calc = calcularNetoLocal(pid, doctor);
    if (calc) resultados.push({ pid: pid, calc: calc });
  });

  if (resultados.length === 0) {
    pane.innerHTML = '<div class="hist-empty">📭 Sin historial individual disponible aún.</div>';
    return;
  }

  // ── Masthead ──────────────────────────────────────────────
  var html = '<div class="hist-newspaper">'
    + '<div class="hist-masthead">'
    + '<div class="hist-masthead-title">Honorarios · CEOT</div>'
    + '<div class="hist-masthead-sub">Registro histórico · ' + doctor.nombre + '</div>'
    + '</div>';

  // ── Mini gráfico de barras ────────────────────────────────
  if (resultados.length > 1) {
    var maxNeto = Math.max.apply(null, resultados.map(function(r){ return Math.max(1, r.calc.neto); }));
    html += '<div style="padding:11px 13px 4px;background:rgba(32,36,31,.06);border-bottom:1px solid rgba(32,36,31,.1)">';
    html += '<div style="font-size:0.55rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(32,36,31,.35);margin-bottom:7px">Neto por período</div>';
    html += '<div style="display:flex;gap:5px;align-items:flex-end;height:48px">';
    resultados.forEach(function(r) {
      var h = Math.max(4, Math.round(Math.max(0, r.calc.neto) / maxNeto * 44));
      var color = r.calc.pendiente ? 'rgba(32,36,31,.18)' : '#1f3a2e';
      var lbl = r.calc.label.split(' ')[0].substring(0,3).toUpperCase();
      html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end">'
        + '<div style="width:100%;background:'+color+';height:'+h+'px;border-radius:3px 3px 0 0"></div>'
        + '<div style="font-size:0.52rem;color:rgba(32,36,31,.35)">'+lbl+'</div>'
        + '</div>';
    });
    html += '</div>';
    html += '<div style="display:flex;gap:12px;margin-top:7px;padding-bottom:3px">'
      + '<span style="font-size:0.52rem;color:rgba(32,36,31,.4)"><span style="display:inline-block;width:7px;height:7px;border-radius:2px;background:#1f3a2e;margin-right:4px;vertical-align:middle"></span>Confirmado</span>'
      + '<span style="font-size:0.52rem;color:rgba(32,36,31,.4)"><span style="display:inline-block;width:7px;height:7px;border-radius:2px;background:rgba(32,36,31,.18);margin-right:4px;vertical-align:middle"></span>Estimado</span>'
      + '</div></div>';
  }

  // ── Períodos ──────────────────────────────────────────────
  resultados.forEach(function(r) {
    var c = r.calc;
    var pendBadge = c.pendiente ? '<span class="hist-period-badge">estimado</span>' : '';

    // Descuentos reales (con monto) van todos juntos, colapsados, en un solo
    // renglón "Descuentos" — antes eran 3 a 5 líneas rojas sueltas (IIBB,
    // CPSM, Gastos A, Retención, Préstamo) que pesaban visualmente mucho más
    // de lo que representan en plata frente al bruto. Pedido de Marcelo,
    // 04/09/2026: "salía casi todo en rojo" mirando el historial de Bruni.
    var descLineas = [];
    var totalDesc = 0;
    descLineas.push('<div class="hist-dline"><span class="hist-dline-lbl">IIBB (3,5%)</span><span class="hist-dline-val neg">−' + fmt(c.iibb) + '</span></div>');
    totalDesc += c.iibb;
    if (c.esLab) {
      descLineas.push('<div class="hist-dline"><span class="hist-dline-lbl">CPSM (5%)</span><span class="hist-dline-val exento">EXENTO ✓</span></div>');
    } else {
      descLineas.push('<div class="hist-dline"><span class="hist-dline-lbl">CPSM (5%)</span><span class="hist-dline-val neg">−' + fmt(c.cpsm) + '</span></div>');
      totalDesc += c.cpsm;
    }
    if (c.ga) {
      descLineas.push('<div class="hist-dline"><span class="hist-dline-lbl">Gastos A</span><span class="hist-dline-val neg">−' + fmt(c.ga) + '</span></div>');
      totalDesc += c.ga;
    }
    if (c.prestamoCasa > 0) {
      descLineas.push('<div class="hist-dline"><span class="hist-dline-lbl">Préstamo Casa (' + c.prestamoCasaCuota + '/' + PRESTAMO_CASA_TOTAL_CUOTAS + ')</span><span class="hist-dline-val neg">−' + fmt(c.prestamoCasa) + '</span></div>');
      totalDesc += c.prestamoCasa;
    }
    if (c.aporteCeot > 0) {
      descLineas.push('<div class="hist-dline"><span class="hist-dline-lbl">Retención Ganancias (' + (c.pctAporte*100) + '%)</span><span class="hist-dline-val neg">−' + fmt(c.aporteCeot) + '</span></div>');
      totalDesc += c.aporteCeot;
      var retItems = retencionPorAcreditacion(c);
      if (retItems.length > 1) {
        retItems.forEach(function(it) {
          descLineas.push('<div class="hist-dline" style="padding-left:14px;font-size:.72rem;opacity:.7"><span class="hist-dline-lbl">· ' + it.label + '</span><span class="hist-dline-val neg">−' + fmt(it.retencion) + '</span></div>');
        });
      }
    }
    var histDescId = 'histDesc_' + r.pid + '_' + (doctor.user || doctor.apellido);
    var descBloqueHtml = '<div class="hist-dline hist-desc-toggle" onclick="histToggleDesc(\'' + histDescId + '\')">'
      +   '<span class="hist-dline-lbl"><span class="hist-desc-arrow" id="' + histDescId + '_arrow">▸</span> Descuentos</span>'
      +   '<span class="hist-dline-val neg">−' + fmt(totalDesc) + '</span>'
      + '</div>'
      + '<div class="hist-desc-detalle" id="' + histDescId + '">' + descLineas.join('') + '</div>';

    // Avisos "todavía no confirmado" (no son descuentos con monto real, no
    // suman a totalDesc) y créditos (CM, reintegro de préstamo) quedan
    // siempre visibles, fuera del acordeón — son buenas noticias o avisos
    // importantes, no ruido.
    var pendientesHtml = '';
    if (!c.ga) {
      pendientesHtml += '<div class="hist-dline"><span class="hist-dline-lbl">Gastos A</span><span class="hist-dline-val" style="color:rgba(32,36,31,.35)">pendiente</span></div>';
    }
    if (c.aporteCeot === 0 && APORTE_CEOT_DESDE.indexOf(r.pid) !== -1 && c.pctAporte === null) {
      pendientesHtml += '<div class="hist-dline"><span class="hist-dline-lbl">Retención Ganancias</span><span class="hist-dline-val" style="color:rgba(32,36,31,.35)">pendiente</span></div>';
    }

    var creditosHtml = '';
    if (c.prestamoCasa < 0) {
      creditosHtml += '<div class="hist-dline"><span class="hist-dline-lbl">Préstamo Casa (reintegro ' + c.prestamoCasaCuota + '/' + PRESTAMO_CASA_TOTAL_CUOTAS + ')</span><span class="hist-dline-val" style="color:#16a34a">+' + fmt(-c.prestamoCasa) + '</span></div>';
    }
    if (c.cm > 0) {
      creditosHtml += '<div class="hist-dline"><span class="hist-dline-lbl">Centro Médico</span><span class="hist-dline-val cm">+' + fmt(c.cm) + '</span></div>';
    }

    var totalCeotVal = (liquidacionData.totalCeot && liquidacionData.totalCeot[r.pid] && liquidacionData.totalCeot[r.pid][doctor.apellido]) || null;
    var totalCeotHtml = totalCeotVal
      ? '<div class="hist-dline" style="margin-top:4px;border-top:1px dashed rgba(32,36,31,.15);padding-top:4px"><span class="hist-dline-lbl" style="color:rgba(32,36,31,.45)">Total liquidado CEOT</span><span class="hist-dline-val" style="color:rgba(32,36,31,.45)">' + fmt(totalCeotVal) + '</span></div>'
      : '';

    var pdfBtn = '<button class="btn-pdf-mini" onclick="actionFeedback(this); descargarComprobanteHistorial(\'' + r.pid + '\')" title="Descargar comprobante PDF">📄 PDF</button>';

    html += '<div class="hist-period-section">'
      + '<div class="hist-period-headline"><span>' + c.label.toUpperCase() + '</span>'
      + '<span style="display:flex;align-items:center;gap:6px;text-transform:none;letter-spacing:normal">' + pendBadge + pdfBtn + '</span></div>'
      + '<div class="hist-dline"><span class="hist-dline-lbl">Bruto</span><span class="hist-dline-val">' + fmt(c.bruto) + '</span></div>'
      + creditosHtml + descBloqueHtml + pendientesHtml
      + '<hr class="hist-rule">'
      + '<div class="hist-neto-line"><span>NETO</span><span>' + fmt(c.neto) + '</span></div>'
      + totalCeotHtml
      + '</div>';
  });

  // ── Acumulado (fondo invertido) ───────────────────────────
  if (resultados.length > 1) {
    var totBruto = resultados.reduce(function(s,r){ return s + r.calc.bruto; }, 0);
    var totNeto  = resultados.reduce(function(s,r){ return s + r.calc.neto; }, 0);
    var hayPend  = resultados.some(function(r){ return r.calc.pendiente; });
    html += '<div class="hist-total-section">'
      + '<div class="hist-total-headline">ACUMULADO — ' + resultados.length + ' PERÍODOS' + (hayPend ? ' · ESTIMADO' : '') + '</div>'
      + '<div class="hist-total-dline"><span>Bruto total</span><span>' + fmt(totBruto) + '</span></div>'
      + '<div class="hist-total-neto"><span>NETO TOTAL</span><span>' + fmt(totNeto) + '</span></div>'
      + '</div>';
  }

  html += '</div>';
  pane.innerHTML = html;
}

// ══════ MI PANEL ══════════════════════════════════════════════

// Mapeo de prefijos NUN → descripción de parte del cuerpo
const NUN_PARTES = {
  MS: 'Miembro superior', MI: 'Miembro inferior', CO: 'Columna',
  RO: 'Rodilla', CA: 'Cadera', HO: 'Hombro', PI: 'Pie',
  MA: 'Mano', TO: 'Tobillo', CO2: 'Codo', MU: 'Muñeca',
};
function nunParte(cod) {
  if (!cod) return 'Sin código';
  var p = cod.substring(0, 2).toUpperCase();
  return NUN_PARTES[p] || p;
}

function renderMiPanel(doctor) {
  var pane = document.getElementById('pane-mipanel');
  if (!pane) return;

  var mesActual = tabMesActual();
  var fmt = function(n) { return '$' + Math.round(n).toLocaleString('es-AR'); };

  // ── 1. Honorarios desde datos locales (síncronos) ──────────
  // Extendido hasta Dic-2026 (13/08/2026, pedido de Marcelo) — Oct/Nov ya
  // sincronizan solos con el sheet (ver cargarLiquidacionRemota); Dic muestra
  // "Sin datos" hasta que se resuelva el choque con Dic-2025 (ver nota en
  // cargarLiquidacionRemota, "diciembre excluido a propósito").
  // ⚠️ NO se pudo extender hasta Jun-2027 como se pidió originalmente: el
  // sistema entero identifica los períodos solo por nombre de mes SIN año
  // (calcularNetoLocal, PERIODO_IIBB, PERIODO_CPSM, GASTOS_A...) — "febrero"
  // ya está tomado por Febrero-2026 (FEBRERO_RAW, con datos reales cargados).
  // Reutilizar esas claves para 2027 mostraría honorarios de 2026 con la
  // etiqueta de 2027. Para llegar a 2027 hace falta agregar claves con año
  // (ej. "enero2027") en todo el motor de cálculo, no solo acá — pendiente,
  // se le preguntó a Marcelo cómo prefiere encararlo y no contestó todavía.
  var PERIODOS_HON = [
    { label:'Abr', raw:null,           key:'abril' },
    { label:'May', raw:MAYO_RAW,       key:'mayo' },
    { label:'Jun', raw:JUNIO_RAW,      key:'junio', altKey: doctor.junioKey || null },
    { label:'Jul', raw:JULIO_RAW,      key:'julio' },
    { label:'Ago', raw:AGOSTO_RAW,     key:'agosto' },
    { label:'Sep', raw:SEPTIEMBRE_RAW, key:'septiembre' },
    { label:'Oct', raw:OCTUBRE_RAW,    key:'octubre' },
    { label:'Nov', raw:NOVIEMBRE_RAW,  key:'noviembre' },
    { label:'Dic', raw:DICIEMBRE_RAW,  key:'diciembre' },
  ];
  var honorarios = PERIODOS_HON.map(function(p) {
    var val = 0;
    if (p.raw) {
      var searchKey = p.altKey || doctor.apellido;
      for (var i = 0; i < p.raw.length; i++) {
        if (p.raw[i].k === searchKey || p.raw[i].k === doctor.apellido) {
          val = p.raw[i].neto || p.raw[i].total || 0; break;
        }
      }
    }
    return { label: p.label, val: val, current: p.key === mesActual };
  });
  var maxHon    = Math.max(1, Math.max.apply(null, honorarios.map(function(h){ return h.val; })));
  var honActual = honorarios.find(function(h){ return h.current; }) || honorarios[honorarios.length-1];
  var honAcum   = honorarios.reduce(function(s,h){ return s + h.val; }, 0);
  var gastosTotal = GASTOS_A[mesActual] || 0;

  var barsHtml = honorarios.map(function(h) {
    var pct = Math.round((h.val / maxHon) * 54);
    return '<div class="mp-chart-col">'
      + '<div class="mp-chart-bar' + (h.current ? ' current' : '') + '" style="height:' + Math.max(4, pct) + 'px">'
      + (h.current ? '<span style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);background:#1f3a2e; color:#fff;font-size:0.55rem;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap;">actual</span>' : '')
      + '</div>'
      + '<div class="mp-chart-month' + (h.current ? ' current' : '') + '">' + h.label + '</div>'
      + '</div>';
  }).join('');

  // ── 2. Render estático completo (sin esperar fetches) ──────
  var html = '<div class="mp-section-label">Mis datos</div>';

  html += '<div class="mp-card-dark">'
    + '<div class="mp-label-dark">Mis honorarios netos</div>'
    + '<div class="mp-chart-bars" style="position:relative;">' + barsHtml + '</div>'
    + '<div class="mp-totals">'
    + '<div><div style="font-size:0.6rem;color:rgba(32,36,31,.45);">Este mes</div>'
    + '<div style="font-size:1.3rem;font-weight:800;">' + (honActual.val ? fmt(honActual.val) : '<span style="font-weight:600;color:rgba(32,36,31,.4)">Sin datos aún</span>') + '</div></div>'
    + '<div style="text-align:right;"><div style="font-size:0.6rem;color:rgba(32,36,31,.45);">Acumulado 2026</div>'
    + '<div style="font-size:1.05rem;font-weight:700;color:#1f3a2e;">' + (honAcum ? fmt(honAcum) : '<span style="font-weight:600;color:rgba(32,36,31,.4);font-size:0.7rem">Sin datos aún</span>') + '</div></div>'
    + '</div></div>';


  // Accesos rápidos
  html += '<div class="mp-link-grid">'
    + '<a href="https://febo983.github.io/generador-de-ordenes-ceot/" target="_blank" class="mp-link-card">'
    + '<span class="mp-link-card-icon">📋</span>'
    + '<div><div class="mp-link-card-title">Órdenes CX</div><div class="mp-link-card-sub">Fuera de horario</div></div></a>'
    + '<a href="https://cirugias-progamadas.netlify.app/" target="_blank" class="mp-link-card">'
    + '<span class="mp-link-card-icon">📅</span>'
    + '<div><div class="mp-link-card-title">CX programadas</div><div class="mp-link-card-sub">Mi calendario</div></div></a>'
    + '<a href="https://historial-cx-ceot.netlify.app/" target="_blank" class="mp-link-card">'
    + '<span class="mp-link-card-icon">📊</span>'
    + '<div><div class="mp-link-card-title">Historial CX</div><div class="mp-link-card-sub">Tu apellido · 1234</div></div></a>'
    + '<a href="https://drive.google.com/drive/folders/1eOUfTKOEkFZTsgsctzwNhq0IJ-Wdp3N7" target="_blank" class="mp-link-card">'
    + '<span class="mp-link-card-icon">📁</span>'
    + '<div><div class="mp-link-card-title">Documentación</div><div class="mp-link-card-sub">Google Drive</div></div></a>'
    + '</div>';

  html += '<div class="mp-section-label">Institucional</div>';

  html += '<div class="mp-card" style="margin-bottom:7px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">'
    + '<div class="mp-label" style="margin:0;">Gastos del mes</div>'
    + '<div style="font-size:0.63rem;color:rgba(32,36,31,.35);">' + (new Date().toLocaleString('es-AR',{month:'long',year:'numeric'})) + '</div>'
    + '</div>'
    + '<div id="mp-gastos-total" style="font-size:1.1rem;font-weight:800;color:#20241f;">' + (gastosTotal ? fmt(gastosTotal) : 'Actualizá para ver') + '</div>'
    + (gastosTotal ? '<div id="mp-gastos-porcabeza" class="mp-sub">/' + DOCTORES.length + ' = ' + fmt(gastosTotal / DOCTORES.length) + ' por profesional</div>' : '')
    + '</div>';

  // Cajas con skeleton mientras carga
  html += '<div class="mp-grid2">'
    + '<div class="mp-card" style="margin-bottom:0;">'
    + '<div class="mp-label">Casa 2067</div>'
    + '<div id="mp-saldo-2067" style="font-size:1.1rem;font-weight:800;color:rgba(32,36,31,.35);">...</div>'
    + '<div class="mp-sub">Saldo actual</div>'
    + '</div>'
    + '<div class="mp-card" style="margin-bottom:0;">'
    + '<div class="mp-label">Caja Gerling</div>'
    + '<div id="mp-saldo-gerling" style="font-size:1.1rem;font-weight:800;color:rgba(32,36,31,.35);">...</div>'
    + '<div class="mp-sub">Saldo actual</div>'
    + '</div>'
    + '</div>';

  pane.innerHTML = html;

  // ── 3. Fetch con timeout ────────────────────────────────────
  function fetchT(url, ms) {
    var ctrl = new AbortController();
    var t = setTimeout(function(){ ctrl.abort(); }, ms);
    return fetch(url, { signal: ctrl.signal }).finally(function(){ clearTimeout(t); });
  }

  // Cajas
  fetchT(CAJAS_ENDPOINT, 30000)
    .then(function(r){ return r.json(); })
    .then(function(d) {
      if (d.status !== 'ok') { console.warn('Cajas error:', d); marcarEndpointStatus("cajas", false, "respuesta sin status ok"); return; }
      var el2067    = document.getElementById('mp-saldo-2067');
      var elGerling = document.getElementById('mp-saldo-gerling');
      if (el2067) {
        var v2067 = typeof d.casa2067 === 'number' ? d.casa2067 : parseFloat(String(d.casa2067).replace(/[$\.]/g,'').replace(',','.'));
        el2067.textContent = fmt(v2067);
        el2067.style.color = v2067 >= 0 ? '#16a34a' : '#dc2626';
      }
      if (elGerling) {
        elGerling.textContent = fmt(d.gerling);
        elGerling.style.color = d.gerling >= 0 ? '#16a34a' : '#dc2626';
      }
      marcarEndpointStatus("cajas", true);
    })
    .catch(function(e) {
      console.warn('Cajas fetch error:', e.message);
      marcarEndpointStatus("cajas", false, e.message);
      var msg = '<span style="font-size:0.72rem;color:rgba(32,36,31,.35);">Sin conexión</span>';
      var el2067 = document.getElementById('mp-saldo-2067');
      var elG    = document.getElementById('mp-saldo-gerling');
      if (el2067) el2067.innerHTML = msg;
      if (elG)    elG.innerHTML    = msg;
    });

}

// ══════ NOTIFICACIONES ════════════════════════════════════════

function mostrarNotificaciones(doctor) {
  var banner = document.getElementById('notifBanner');
  if (!banner) return;
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  var anio = hoy.getFullYear();
  var msgs = [];

  var periodos = [
    { label:'Mayo',      raw:MAYO_RAW,       fechas:MAYO_FECHAS,       key:doctor.apellido },
    { label:'Junio',     raw:JUNIO_RAW,      fechas:JUNIO_FECHAS,      key:doctor.junioKey||doctor.apellido },
    { label:'Julio',     raw:JULIO_RAW,      fechas:JULIO_FECHAS,      key:doctor.apellido },
    { label:'Agosto',    raw:AGOSTO_RAW,     fechas:AGOSTO_FECHAS,     key:doctor.apellido },
    { label:'Sep',       raw:SEPTIEMBRE_RAW, fechas:SEPTIEMBRE_FECHAS, key:doctor.apellido },
    { label:'Oct',       raw:OCTUBRE_RAW,    fechas:OCTUBRE_FECHAS,    key:doctor.apellido },
    { label:'Nov',       raw:NOVIEMBRE_RAW,  fechas:NOVIEMBRE_FECHAS,  key:doctor.apellido },
    { label:'Dic',       raw:DICIEMBRE_RAW,  fechas:DICIEMBRE_FECHAS,  key:doctor.apellido },
  ];

  periodos.forEach(function(p) {
    if (!p.raw.length || !p.fechas.length) return;
    var row = null;
    for (var i = 0; i < p.raw.length; i++) { if (p.raw[i].k === p.key) { row = p.raw[i]; break; } }
    if (!row) return;
    p.fechas.forEach(function(fecha, idx) {
      if (!fecha || fecha === '—') return;
      var parts = fecha.split('/');
      if (parts.length < 2) return;
      var cheqDate = new Date(anio, parseInt(parts[1])-1, parseInt(parts[0]));
      cheqDate.setHours(0,0,0,0);
      var acred = new Date(cheqDate); acred.setDate(acred.getDate() + 2);
      var diff = Math.round((acred - hoy) / 86400000);
      if (diff >= 0 && diff <= 3) {
        var cuando = diff === 0 ? 'hoy' : diff === 1 ? 'mañana' : 'en ' + diff + ' días';
        var monto = row['f'+(idx+1)];
        msgs.push('💰 Cheque ' + (idx+1) + ' <strong>' + p.label + '</strong> (' + fecha + ') acredita <strong>' + cuando + '</strong>' + (monto ? ' · ' + fmt(monto) : ''));
      }
    });
  });

  if (msgs.length) {
    banner.innerHTML = '📅 <strong>Próximas acreditaciones:</strong><br>' + msgs.join('<br>');
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

// ══════ AVISO "TRANSFERENCIA REALIZADA" (banner en Home) ═════
// Tildar "ya transferido" en el admin (Sueldo Director / Resto de
// profesionales) solo cambiaba el chip dentro del detalle del mes — si el
// profesional no entraba ahí, no se enteraba. Este banner aparece en la
// pantalla de inicio del portal la primera vez que entra después de que
// Marcelo tilde el check del mes actual, y no vuelve a aparecer una vez
// cerrado (se guarda localmente en el dispositivo del profesional, no hace
// falta sync — cada profesional entra desde el suyo).
var AVISO_TRANSF_VISTOS_KEY = "ceot_aviso_transf_visto";

function avisoTransfVistosCargar() {
  try {
    var raw = localStorage.getItem(AVISO_TRANSF_VISTOS_KEY);
    return raw ? (JSON.parse(raw) || []) : [];
  } catch (e) { return []; }
}

function avisoTransfMarcarVisto(key) {
  var vistos = avisoTransfVistosCargar();
  if (vistos.indexOf(key) !== -1) return;
  vistos.push(key);
  if (vistos.length > 30) vistos = vistos.slice(-30); // no crece para siempre
  try { localStorage.setItem(AVISO_TRANSF_VISTOS_KEY, JSON.stringify(vistos)); } catch (e) {}
}

// Se llama al loguearse y cada vez que llega una novedad de sync (ver
// avisoTransferidoRerender, index.html) — solo mira el mes actual, no
// arrastra avisos de meses viejos aunque sigan "hechos".
function avisoTransfChequear(doctor) {
  var banner = document.getElementById('avisoTransfBanner');
  if (!banner || !doctor) return;
  var periodo = (typeof tabMesActual === "function") ? tabMesActual() : null;
  if (!periodo) { banner.style.display = 'none'; return; }

  var esDirector = (typeof SUELDO_DIRECTOR_LISTA !== "undefined") && SUELDO_DIRECTOR_LISTA.indexOf(doctor.apellido) !== -1;
  var hecho = esDirector ? sueldoDirectorEstaHecho(periodo, doctor.apellido) : restoProfEstaHecho(periodo, doctor.apellido);
  if (!hecho) { banner.style.display = 'none'; return; }

  var avisoKey = "gral|" + periodo + "|" + doctor.apellido;
  if (avisoTransfVistosCargar().indexOf(avisoKey) !== -1) { banner.style.display = 'none'; return; }

  var monto = null;
  if (esDirector && typeof calcularSueldoDirector === "function") {
    var sd = calcularSueldoDirector(periodo, doctor, SUELDO_DIRECTOR_MONTO);
    monto = sd ? sd.monto : null;
  } else if (typeof calcularDetalleChequesProfesional === "function") {
    var base = calcularDetalleChequesProfesional(periodo, doctor);
    monto = base ? base.totalNetoMes : null;
  }

  var mesLabel = periodo.charAt(0).toUpperCase() + periodo.slice(1);
  var sub = document.getElementById('avisoTransfSub');
  if (sub) sub.textContent = mesLabel + (monto != null ? ' · ' + fmt(monto) : '');
  banner.dataset.avisoKey = avisoKey;
  banner.style.display = 'flex';
}

function avisoTransfCerrar() {
  var banner = document.getElementById('avisoTransfBanner');
  if (!banner) return;
  if (banner.dataset.avisoKey) avisoTransfMarcarVisto(banner.dataset.avisoKey);
  banner.style.display = 'none';
}

