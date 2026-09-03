// ═══════════════════════════════════════════════════════════════════
// sueldo-b.js — extraído de index.html.
// Sueldo B: personal, tarifas, cálculo de recibos e impresión.
// Solo definiciones.
// ═══════════════════════════════════════════════════════════════════

// ══════ SUELDO B ══════════════════════════════════════════════════

var SB_PERSONAL = [
  { legajo:"001", nombre:"Catania, Julieta",       cuil:"27-34851315-5", ingreso:"—",          tarifa:null,  facturacion:true,  mensualidad:null },
  { legajo:"002", nombre:"Falaschini, Laura",       cuil:"27-23478563-5", ingreso:"—",          tarifa:null,  facturacion:true,  mensualidad:null },
  { legajo:"003", nombre:"Caminos, Paula",           cuil:"27-21750873-3", ingreso:"—",          tarifa:14437, facturacion:true,  mensualidad:null },
  { legajo:"004", nombre:"Salgan, Elizabeth",        cuil:"27-20330902-9", ingreso:"01/10/2025", tarifa:14437, facturacion:true,  mensualidad:null },
  { legajo:"005", nombre:"Catania, Josefina",        cuil:"27-37719584-7", ingreso:"—",          tarifa:9300,  facturacion:false, mensualidad:null },
  { legajo:"006", nombre:"Balliro, Victoria",        cuil:"—",             ingreso:"—",          tarifa:9300,  facturacion:false, mensualidad:null },
  { legajo:"007", nombre:"Kienitz, Tobias",          cuil:"—",             ingreso:"—",          tarifa:9300,  facturacion:false, mensualidad:null },
  { legajo:"008", nombre:"Del Pozo, Evelina",        cuil:"—",             ingreso:"07/07/2026", tarifa:9300,  facturacion:false, mensualidad:null },
  { legajo:"009", nombre:"Pensa, Jimena",            cuil:"—",             ingreso:"01/05/2026", tarifa:9300,  facturacion:false, mensualidad:null },
  { legajo:"010", nombre:"Programacion CX, Marcela", cuil:"—",            ingreso:"06/07/2026", tarifa:9300,  facturacion:false, mensualidad:1343000 },
];

var SB_FACTURACION = 130000;

// Valor de la hora editable por persona — SB_PERSONAL queda como el valor de
// referencia (hardcodeado en el archivo); las ediciones se guardan aparte en
// localStorage, mismo patrón que NETO_OVERRIDE.
var SB_TARIFA_OVERRIDE = {};
function sbTarifaCargar() {
  try {
    var raw = localStorage.getItem("ceot_sb_tarifa_override");
    if (raw) SB_TARIFA_OVERRIDE = JSON.parse(raw) || {};
  } catch (e) { SB_TARIFA_OVERRIDE = {}; }
}
function sbTarifaGuardarTodo() {
  localStorage.setItem("ceot_sb_tarifa_override", JSON.stringify(SB_TARIFA_OVERRIDE));
}
function sbTarifaEfectiva(p) {
  return SB_TARIFA_OVERRIDE.hasOwnProperty(p.legajo) ? SB_TARIFA_OVERRIDE[p.legajo] : p.tarifa;
}

var SB_STATE = {}; // { legajo: { horas, usaMensualidad } }

function sbNumLetras(n) {
  n = Math.floor(n);
  var UN = ["","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE",
            "DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISEIS","DIECISIETE","DIECIOCHO","DIECINUEVE"];
  var DE = ["","DIEZ","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
  var CE = ["","CIENTO","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS","SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];
  function cientos(x) {
    if (x === 100) return "CIEN";
    var c = Math.floor(x/100), r = x%100, p = [];
    if (c) p.push(CE[c]);
    if (r < 20) { if (UN[r]) p.push(UN[r]); }
    else { var d=Math.floor(r/10),u=r%10; p.push(u ? DE[d]+" Y "+UN[u] : DE[d]); }
    return p.join(" ");
  }
  if (n === 0) return "CERO";
  var M = Math.floor(n/1000000), mi = Math.floor((n%1000000)/1000), re = n%1000, p = [];
  if (M) p.push(cientos(M) + (M===1 ? " MILLON" : " MILLONES"));
  if (mi) p.push((mi===1 ? "MIL" : cientos(mi)+" MIL"));
  if (re) p.push(cientos(re));
  return p.join(" ");
}

function sbMontoLetras(total) {
  var ent = Math.floor(total);
  var cts = Math.round((total - ent) * 100);
  return sbNumLetras(ent) + " PESOS CON " + (cts < 10 ? "0"+cts : cts) + "/100";
}

function sbFmt(n) {
  return "$ " + Math.round(n).toLocaleString("es-AR");
}

function sbCalcTotal(p, horas, usaMensualidad) {
  var totalHoras = 0, totalFact = 0, totalMens = 0;
  var tarifa = sbTarifaEfectiva(p);
  if (usaMensualidad && p.mensualidad) {
    totalMens = p.mensualidad;
  } else if (tarifa && horas > 0) {
    totalHoras = Math.round(horas * tarifa);
  }
  if (p.facturacion) totalFact = SB_FACTURACION;
  return { totalHoras: totalHoras, totalFact: totalFact, totalMens: totalMens,
           total: totalHoras + totalFact + totalMens };
}

function sbReciboHTML(p, horas, usaMensualidad, periodo) {
  var c = sbCalcTotal(p, horas, usaMensualidad);
  if (c.total === 0) return "";
  var conceptos = "";
  if (c.totalMens > 0) {
    conceptos += '<tr><td class="center">001</td><td class="center">1</td><td>Mensualidad</td><td class="right">'+sbFmt(c.totalMens)+'</td></tr>';
  } else if (c.totalHoras > 0) {
    conceptos += '<tr><td class="center">001</td><td class="center">'+horas+'</td><td>Horas Extras &mdash; '+horas+' hs</td><td class="right">'+sbFmt(c.totalHoras)+'</td></tr>';
  }
  if (c.totalFact > 0) {
    conceptos += '<tr><td class="center">002</td><td class="center">1</td><td>Facturacion</td><td class="right">'+sbFmt(c.totalFact)+'</td></tr>';
  }
  var conceptoTotal = (c.totalHoras > 0 && c.totalFact > 0) ? "Hs+Fc"
                    : (c.totalMens > 0 && c.totalFact > 0) ? "Mens+Fc"
                    : (c.totalMens > 0) ? "Mensualidad"
                    : (c.totalFact > 0) ? "Facturacion"
                    : "Horas Extras";
  return '<div class="sb-recibo"><div class="recibo-wrap">'
    + '<div class="recibo-header">'
    + '<div class="recibo-titulo">CEOT &mdash; Clinica de Traumatologia Colon</div>'
    + '<div class="recibo-sub">14 de Julio 2067, Mar del Plata</div>'
    + '<div class="recibo-periodo">RECIBO DE HABERES &mdash; SUELDO B &mdash; PERIODO '+periodo+'</div>'
    + '</div>'
    + '<table class="recibo-datos">'
    + '<tr><td>Legajo</td><td>'+p.legajo+'</td><td>CUIL</td><td>'+p.cuil+'</td></tr>'
    + '<tr><td>Apellido y Nombres</td><td colspan="3">'+p.nombre+'</td></tr>'
    + '<tr><td>Ingreso</td><td>'+p.ingreso+'</td><td>Tarea</td><td>Administrativo</td></tr>'
    + '<tr><td>Categoria</td><td colspan="3">Prof. de nivel medio Adm.</td></tr>'
    + '</table>'
    + '<table class="recibo-conceptos">'
    + '<thead><tr><th>COD</th><th>CANTIDAD</th><th>CONCEPTO</th><th>IMPORTE</th></tr></thead>'
    + '<tbody>'+conceptos
    + '<tr class="recibo-total-row"><td class="center">001</td><td class="center">30</td><td>'+conceptoTotal+'</td><td class="right">'+sbFmt(c.total)+'</td></tr>'
    + '</tbody></table>'
    + '<div class="recibo-son"><strong>SON:</strong> '+sbMontoLetras(c.total)+'</div>'
    + '<div class="recibo-neto"><strong>NETO A COBRAR: '+sbFmt(c.total)+'</strong></div>'
    + '<div class="recibo-pie">'
    + '<div>_______________________<br>Firma y Aclaracion</div>'
    + '<div>_______________________<br>Recibi Conforme</div>'
    + '</div></div></div>';
}

function sbActualizarCard(legajo) {
  var p = SB_PERSONAL.find(function(x){ return x.legajo === legajo; });
  if (!p) return;
  var horasEl = document.getElementById("sb-h-"+legajo);
  var mensEl  = document.getElementById("sb-mens-"+legajo);
  var totalEl = document.getElementById("sb-total-"+legajo);
  var horas = horasEl ? parseFloat(horasEl.value)||0 : 0;
  var usaMens = mensEl ? mensEl.checked : false;
  var c = sbCalcTotal(p, horas, usaMens);
  if (totalEl) totalEl.textContent = c.total > 0 ? sbFmt(c.total) : "—";
  if (horasEl) horasEl.disabled = usaMens;
}

function sbTarifaTagHtml(p) {
  var overridden = SB_TARIFA_OVERRIDE.hasOwnProperty(p.legajo);
  var val = sbTarifaEfectiva(p);
  return '<span class="sb-tag" id="sb-tarifa-tag-' + p.legajo + '">' + sbFmt(val) + '/hs'
    + (overridden ? ' <span title="Valor editado a mano" style="color:#8a6423">✎</span>' : '')
    + ' <a href="javascript:void(0)" onclick="sbTarifaEditarAbrir(\'' + p.legajo + '\')" style="text-decoration:underline;cursor:pointer;margin-left:4px;font-size:.85em">editar</a>'
    + (overridden ? ' <a href="javascript:void(0)" onclick="sbTarifaRestablecer(\'' + p.legajo + '\')" style="text-decoration:underline;cursor:pointer;margin-left:4px;font-size:.85em;color:#b13a2c">restablecer</a>' : '')
    + '</span>';
}

function sbTarifaEditarAbrir(legajo) {
  var p = SB_PERSONAL.find(function(x){ return x.legajo === legajo; });
  if (!p) return;
  var tagEl = document.getElementById('sb-tarifa-tag-' + legajo);
  if (!tagEl) return;
  var actual = sbTarifaEfectiva(p);
  tagEl.innerHTML = '<input type="text" inputmode="decimal" id="sbTarifaEditInput" value="' + actual + '" style="width:80px;font-size:.8rem;padding:2px 4px">'
    + ' <button type="button" onclick="sbTarifaEditarGuardar(\'' + legajo + '\')" style="font-size:.7rem;padding:2px 6px;border:none;border-radius:4px;background:#1f3a2e;color:#fff;cursor:pointer">✓</button>'
    + ' <button type="button" onclick="renderSueldoB()" style="font-size:.7rem;padding:2px 6px;border:1px solid rgba(32,36,31,.25);border-radius:4px;background:none;cursor:pointer;margin-left:2px">✕</button>';
  document.getElementById('sbTarifaEditInput').focus();
}

function sbTarifaEditarGuardar(legajo) {
  var input = document.getElementById('sbTarifaEditInput');
  var nuevo = parseFloat((input.value + '').replace(/\./g, '').replace(',', '.'));
  if (isNaN(nuevo) || nuevo <= 0) { alert('Ingresá un valor de hora válido.'); return; }
  SB_TARIFA_OVERRIDE[legajo] = nuevo;
  sbTarifaGuardarTodo();
  renderSueldoB();
}

function sbTarifaRestablecer(legajo) {
  delete SB_TARIFA_OVERRIDE[legajo];
  sbTarifaGuardarTodo();
  renderSueldoB();
}

function renderSueldoB() {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  var btn = document.getElementById("adm-sidenav-sueldob");
  if (btn) btn.className = "adm-sidenav-btn active";

  var hoy = new Date();
  var mesActual = hoy.getMonth() + 1;
  var anioActual = hoy.getFullYear();

  var MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  // Opciones de mes
  var opsMes = "";
  for (var m = 1; m <= 12; m++) {
    var sel = m === mesActual ? " selected" : "";
    opsMes += '<option value="'+m+'"'+sel+'>'+MESES[m]+'</option>';
  }

  // Cards de personal
  var cards = "";
  SB_PERSONAL.forEach(function(p) {
    var tags = "";
    if (p.facturacion) tags += '<span class="sb-tag">Facturacion</span>';
    if (p.tarifa) tags += sbTarifaTagHtml(p);
    if (p.mensualidad) tags += '<span class="sb-tag">Mens. disponible</span>';

    var inputs = "";
    if (p.tarifa) {
      inputs += '<div class="sb-field" style="margin-bottom:6px"><label>Horas extras</label>'
             + '<input type="number" id="sb-h-'+p.legajo+'" min="0" step="0.5" placeholder="0" '
             + 'oninput="sbActualizarCard(\''+p.legajo+'\')" style="width:120px"></div>';
    }
    if (p.mensualidad) {
      inputs += '<label class="sb-toggle"><input type="checkbox" id="sb-mens-'+p.legajo+'" '
             + 'onchange="sbActualizarCard(\''+p.legajo+'\')"> Usar mensualidad ('+sbFmt(p.mensualidad)+')</label>';
    }

    cards += '<div class="sb-persona">'
           + '<div class="sb-persona-header">'
           + '<div><span class="sb-persona-nombre">'+p.nombre+'</span>'
           + '<span class="sb-persona-legajo"> &nbsp;Leg.'+p.legajo+'</span>'+tags+'</div>'
           + '<span class="sb-persona-total" id="sb-total-'+p.legajo+'">—</span>'
           + '</div>'
           + inputs
           + '</div>';
  });

  var html = '<div class="adm-sec-title" style="margin-top:4px">Sueldo B</div>'
    + '<div style="padding:0 2px 24px">'
    + '<div class="sb-form-grid">'
    + '<div class="sb-field"><label>Mes</label><select id="sb-mes">'+opsMes+'</select></div>'
    + '<div class="sb-field"><label>Ano</label><input type="number" id="sb-anio" value="'+anioActual+'" min="2026"></div>'
    + '</div>'
    + cards
    + '<button class="sb-calcular-btn" onclick="actionFeedback(this); sbGenerarRecibos()">Generar recibos</button>'
    + '</div>'
    + '<div id="sb-resultados" style="padding:0 2px 24px;display:none">'
    + '<hr style="border-color:rgba(32,36,31,.1);margin-bottom:16px">'
    + '<button class="sb-print-all-btn" onclick="actionFeedback(this); sbImprimirTodos()">Imprimir todos</button>'
    + '<div id="sb-lista-recibos"></div>'
    + '</div>';

  document.getElementById("adm-content").innerHTML = html;
}

function sbGenerarRecibos() {
  var MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  var mes  = parseInt(document.getElementById("sb-mes").value);
  var anio = parseInt(document.getElementById("sb-anio").value);
  var periodo = MESES[mes].toUpperCase() + " " + anio;

  var lista = "";
  SB_PERSONAL.forEach(function(p) {
    var horasEl = document.getElementById("sb-h-"+p.legajo);
    var mensEl  = document.getElementById("sb-mens-"+p.legajo);
    var horas    = horasEl ? parseFloat(horasEl.value)||0 : 0;
    var usaMens  = mensEl ? mensEl.checked : false;
    var c = sbCalcTotal(p, horas, usaMens);
    if (c.total === 0) return;

    lista += '<div style="display:flex;justify-content:space-between;align-items:center;'
           + 'background:rgba(32,36,31,.05);border:0.5px solid rgba(32,36,31,.12);'
           + 'border-radius:8px;padding:10px 14px;margin-bottom:8px">'
           + '<div><span style="font-weight:700">'+p.nombre+'</span>'
           + '<span style="font-size:0.78rem;color:rgba(32,36,31,.45);margin-left:8px">Leg.'+p.legajo+'</span></div>'
           + '<div style="display:flex;align-items:center;gap:10px">'
           + '<span style="font-weight:700">'+sbFmt(c.total)+'</span>'
           + '<button class="sb-print-btn" onclick="actionFeedback(this); sbImprimirUno(\''+p.legajo+'\','+horas+','+usaMens+',\''+periodo+'\')">Imprimir</button>'
           + '</div></div>';
  });

  document.getElementById("sb-lista-recibos").innerHTML = lista || '<div style="color:rgba(32,36,31,.35);padding:12px">Sin importes para imprimir.</div>';
  document.getElementById("sb-resultados").style.display = "block";

  // guardar estado para imprimir todos
  SB_STATE = {};
  SB_PERSONAL.forEach(function(p) {
    var horasEl = document.getElementById("sb-h-"+p.legajo);
    var mensEl  = document.getElementById("sb-mens-"+p.legajo);
    SB_STATE[p.legajo] = {
      horas: horasEl ? parseFloat(horasEl.value)||0 : 0,
      usaMens: mensEl ? mensEl.checked : false
    };
  });
  SB_STATE._periodo = periodo;
}

function sbAbrirVentanaImpresion(html) {
  var css = '.sb-recibo{page-break-after:always}.sb-recibo:last-child{page-break-after:avoid}'
    + '.recibo-wrap{font-family:"Segoe UI",Arial,sans-serif;font-size:11pt;color:#111;padding:1.5cm 2cm;width:21cm;box-sizing:border-box}'
    + '.recibo-header{text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px}'
    + '.recibo-titulo{font-size:13pt;font-weight:700;letter-spacing:.5px}'
    + '.recibo-sub{font-size:9pt;color:#555;margin-top:2px}'
    + '.recibo-periodo{font-size:10pt;font-weight:700;margin-top:6px;text-transform:uppercase}'
    + '.recibo-datos{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:9.5pt}'
    + '.recibo-datos td{padding:3px 6px;border:1px solid #ccc}'
    + '.recibo-conceptos{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:9.5pt}'
    + '.recibo-conceptos th{background:#111;color:#fff;padding:4px 8px;text-align:left;font-size:8.5pt}'
    + '.recibo-conceptos td{padding:4px 8px;border-bottom:1px solid #ddd}'
    + '.recibo-total-row td{font-weight:700;border-top:2px solid #111}'
    + '.center{text-align:center}.right{text-align:right}'
    + '.recibo-son{font-size:9pt;margin-bottom:6px;padding:4px 0}'
    + '.recibo-neto{font-size:12pt;font-weight:700;text-align:right;border-top:2px solid #111;padding-top:6px;margin-bottom:20px}'
    + '.recibo-pie{display:flex;justify-content:space-between;padding-top:30px;font-size:9pt;text-align:center}';
  var w = window.open('', '_blank', 'width=900,height=700');
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recibo Sueldo B</title><style>' + css + '</style></head><body>' + html + '<script>window.onload=function(){window.print();}<\/script></body></html>');
  w.document.close();
}

function sbImprimirUno(legajo, horas, usaMens, periodo) {
  var p = SB_PERSONAL.find(function(x){ return x.legajo === legajo; });
  if (!p) return;
  var html = sbReciboHTML(p, horas, usaMens, periodo);
  if (!html) return;
  sbAbrirVentanaImpresion(html);
}

function sbImprimirTodos() {
  var periodo = SB_STATE._periodo || "";
  var html = "";
  SB_PERSONAL.forEach(function(p) {
    var st = SB_STATE[p.legajo];
    if (!st) return;
    html += sbReciboHTML(p, st.horas, st.usaMens, periodo);
  });
  if (!html) return;
  sbAbrirVentanaImpresion(html);
}

