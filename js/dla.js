// ══════ Registro de "Detalle de Liquidación de Cuenta" (DLA9042P<AAAAMM>.pdf) ══════
// PDF de una página que manda la clínica cada mes: acreditaciones brutas, descuentos
// (gastos generales, contribución extraordinaria, impuestos) y la composición final
// Honorarios / Gastos de equipo. Se parsea por ETIQUETA (no por posición): cada renglón
// es "texto  $ importe". Las etiquetas que aparecen dos veces (generales / OSDE) se
// resuelven por orden de aparición.
// Se guarda por período (AAAAMM) en localStorage + sync ("ceot_dla").
// Los Honorarios (sin gastos de equipo) alimentan solos el total de la pantalla CPSM.
var DLA_K = "ceot_dla";

// [etiqueta normalizada, campo, nro de aparición (0 = primera, 1 = segunda)]
var DLA_CAMPOS = [
  ["acreditaciones brutas",                "bruta",          0],
  ["acreditaciones por prestaciones generales", "generales", 0],
  ["acreditaciones individuales",          "genIndiv",       0],
  ["transferencia de grupo",               "transfGrupo",    0],
  ["debitos ooss",                         "genDeb",         0],
  ["acreditaciones por prestaciones osde", "osde",           0],
  ["acreditaciones individuales",          "osdeIndiv",      1],
  ["debitos ooss",                         "osdeDeb",        1],
  ["descuentos",                           "descuentos",     0],
  ["gastos generales",                     "gastosGenerales",0],
  ["gtos.adm.",                            "gtosAdm",        0],
  ["derechos adscriptos",                  "derAdscriptos",  0],
  ["acred por ret. centro medico",         "acredRetCM",     0],
  ["retencion centro medico",              "retCM",          0],
  ["contribuciones p/ gastos",             "contrib",        0],
  ["contrib. extraord.",                   "contribExtra",   0],
  ["recupero de gastos propios",           "recupero",       0],
  ["abono telefonico",                     "abonoTel",       0],
  ["residuos patologicos",                 "residuos",       0],
  ["medicamentos y descartables",          "medicamentos",   0],
  ["factura pacientes a cargo",            "factPacientes",  0],
  ["seguro de mala praxis",                "malaPraxis",     0],
  ["impuestos",                            "impuestos",      0],
  ["retencion iigg",                       "retGanancias",   0],
  ["imp.a los bienes personales",          "bienesPers",     0],
  ["impuesto al valor agregado",           "iva",            0],
  ["percepcion de iibb",                   "percIIBB",       0],
  ["honorarios",                           "honorarios",     0],
  ["gastos de equipo",                     "gastosEquipo",   0],
  ["total acreditaciones brutas",          "total",          0]
];
// Etiquetas para mostrar el detalle, en orden y con sangría.
var DLA_DETALLE = [
  ["bruta","Acreditaciones brutas (emitir factura)",0], ["generales","Prestaciones generales",1],
  ["genIndiv","Acreditaciones individuales",2], ["transfGrupo","Transferencia de grupo",2], ["genDeb","Débitos OOSS",2],
  ["osde","Prestaciones OSDE",1], ["osdeIndiv","Acreditaciones individuales",2], ["osdeDeb","Débitos OOSS",2],
  ["descuentos","Descuentos",0], ["gastosGenerales","Gastos generales",1],
  ["gtosAdm","Gtos. Adm.",2], ["derAdscriptos","Derechos adscriptos",2], ["acredRetCM","Acred. por Ret. Centro Médico",2],
  ["retCM","Retención Centro Médico",2], ["contrib","Contribuciones p/ gastos",2], ["contribExtra","Contrib. extraordinaria gastos 2026-2028",2],
  ["recupero","Recupero de gastos propios del profesional",1], ["abonoTel","Abono telefónico",2], ["residuos","Residuos patológicos",2],
  ["medicamentos","Medicamentos y descartables",2], ["factPacientes","Factura pacientes a cargo prof.",2], ["malaPraxis","Seguro mala praxis SMG",2],
  ["impuestos","Impuestos",1], ["retGanancias","Retención IIGG",2], ["bienesPers","Imp. bienes personales",2], ["iva","IVA",2], ["percIIBB","Percepción IIBB",2],
  ["honorarios","HONORARIOS",0], ["gastosEquipo","GASTOS DE EQUIPO",0], ["total","Total acreditaciones brutas",0]
];
var DLA_MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function dlaNorm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}
function dlaMonto(s) { // "$ -1.234,56" -> -1234.56
  var m = /\$\s*(-?)\s*([\d.]+,\d{2})/.exec(s);
  if (!m) return null;
  var n = parseFloat(m[2].replace(/\./g, "").replace(",", "."));
  return m[1] ? -n : n;
}
function dlaFmt(n) {
  if (n == null) return "—";
  return (n < 0 ? "-" : "") + "$ " + Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parsea las líneas de texto (array de strings) → {periodo, label, campos, avisos}
function dlaParsearLineas(lineas, nombreArchivo) {
  var d = { campos: {}, avisos: [] }, vistos = {};
  var texto = lineas.join("\n");
  var mp = /Per[ií]odo Liquidado:\s*([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+(\d{4})/.exec(texto);
  if (mp) {
    var mi = DLA_MESES.indexOf(dlaNorm(mp[1]));
    if (mi >= 0) d.periodo = mp[2] + ("0" + (mi + 1)).slice(-2);
  }
  if (!d.periodo) {
    var mf = /(\d{4})(\d{2})(?!\d)/.exec(nombreArchivo || "");
    if (mf) d.periodo = mf[1] + mf[2];
  }
  lineas.forEach(function(l) {
    var n = dlaNorm(l);
    var monto = dlaMonto(l);
    if (monto === null) return;
    // la etiqueta más larga que coincida con el inicio de la línea
    var clave = "";
    DLA_CAMPOS.forEach(function(c) { if (n.indexOf(c[0]) === 0 && c[0].length > clave.length) clave = c[0]; });
    if (!clave) return;
    // si la etiqueta se repite (generales / OSDE) se elige por nº de aparición
    var apar = vistos[clave] || 0;
    vistos[clave] = apar + 1;
    var def = DLA_CAMPOS.filter(function(c) { return c[0] === clave && c[2] === apar; })[0];
    if (def && d.campos[def[1]] === undefined) d.campos[def[1]] = monto;
  });
  var c = d.campos;
  if (!d.periodo) d.avisos.push("No pude leer el período del PDF.");
  ["honorarios", "gastosEquipo", "total", "contribExtra"].forEach(function(k) {
    if (c[k] === undefined) d.avisos.push("No encontré: " + k);
  });
  var cerca = function(a, b) { return Math.abs(a - b) < 0.05; };
  if (c.honorarios !== undefined && c.gastosEquipo !== undefined && c.total !== undefined && !cerca(c.honorarios + c.gastosEquipo, c.total))
    d.avisos.push("Honorarios + Gastos de equipo no suman el total.");
  if (c.bruta !== undefined && c.total !== undefined && !cerca(c.bruta, c.total))
    d.avisos.push("Acreditaciones brutas no coincide con la composición.");
  if (c.descuentos !== undefined && c.gastosGenerales !== undefined && c.recupero !== undefined && c.impuestos !== undefined &&
      !cerca(c.descuentos, c.gastosGenerales + c.recupero + c.impuestos))
    d.avisos.push("Los descuentos no suman (gastos generales + recupero + impuestos).");
  return d;
}

function dlaCargar() {
  try { return JSON.parse(localStorage.getItem(DLA_K) || "{}"); } catch (e) { return {}; }
}
function dlaGuardar(obj) {
  try {
    localStorage.setItem(DLA_K, JSON.stringify(obj));
    if (typeof syncPush === "function") syncPush(DLA_K);
  } catch (e) {}
}
function dlaHonorarios(periodo) {
  var r = dlaCargar()[periodo];
  return r && typeof r.honorarios === "number" ? r.honorarios : 0;
}

// Agrupa los items de pdf.js en líneas por Y y las une por X.
function dlaLineasDePagina(items) {
  var filas = [];
  items.forEach(function(it) {
    if (!it.str || !it.str.trim()) return;
    var y = it.transform[5], x = it.transform[4];
    var f = filas.filter(function(r) { return Math.abs(r.y - y) < 2.5; })[0];
    if (!f) { f = { y: y, its: [] }; filas.push(f); }
    f.its.push({ x: x, s: it.str });
  });
  filas.sort(function(a, b) { return b.y - a.y; });
  return filas.map(function(f) {
    f.its.sort(function(a, b) { return a.x - b.x; });
    return f.its.map(function(i) { return i.s; }).join(" ");
  });
}

async function dlaImportarPdf() {
  if (!window.pdfjsLib) { alert("pdf.js no está disponible — recargá la página."); return; }
  var inp = document.createElement("input");
  inp.type = "file"; inp.accept = ".pdf,application/pdf"; inp.multiple = true;
  inp.onchange = async function() {
    var guardados = dlaCargar(), msgs = [];
    for (var i = 0; i < inp.files.length; i++) {
      var f = inp.files[i];
      try {
        var pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
        var lineas = [];
        for (var p = 1; p <= pdf.numPages; p++) {
          var tc = await (await pdf.getPage(p)).getTextContent();
          lineas = lineas.concat(dlaLineasDePagina(tc.items));
        }
        var d = dlaParsearLineas(lineas, f.name);
        if (!d.periodo || d.campos.honorarios === undefined) { msgs.push(f.name + ": no parece un Detalle de Liquidación de Cuenta."); continue; }
        var ya = guardados[d.periodo] ? " (reemplaza lo anterior)" : "";
        guardados[d.periodo] = Object.assign({}, d.campos, { importado: new Date().toISOString(), archivo: f.name, avisos: d.avisos });
        msgs.push(f.name + ": " + d.periodo + " guardado" + ya + (d.avisos.length ? " ⚠ " + d.avisos.join(" · ") : " ✓"));
      } catch (e) { msgs.push(f.name + ": error — " + e.message); }
    }
    dlaGuardar(guardados);
    dlaRenderSeccion();
    if (typeof cpsmActualizarResultados === "function") { cpsmTotalRefrescarInput(); cpsmActualizarResultados(); }
    alert(msgs.join("\n"));
  };
  inp.click();
}

function dlaEtiquetaPeriodo(p) {
  return DLA_MESES[parseInt(p.slice(4), 10) - 1] + " " + p.slice(0, 4);
}

var _dlaAbierto = "";
function dlaToggle(p) { _dlaAbierto = _dlaAbierto === p ? "" : p; dlaRenderSeccion(); }
function dlaBorrar(p) {
  if (!confirm("¿Borrar el registro de " + dlaEtiquetaPeriodo(p) + "?")) return;
  var o = dlaCargar(); delete o[p]; dlaGuardar(o); dlaRenderSeccion();
  if (typeof cpsmActualizarResultados === "function") cpsmActualizarResultados();
}

function dlaRenderSeccion() {
  var box = document.getElementById("dla-seccion");
  if (!box) return;
  var o = dlaCargar(), per = Object.keys(o).sort().reverse();
  var h = '<div class="cpsm-title" style="font-size:1rem">🧾 Liquidación de la clínica (DLA9042P)</div>'
    + '<div class="cpsm-subtitle">Registro mensual del "Detalle de Liquidación de Cuenta". Los honorarios sin gastos de equipo alimentan el total del CPSM.</div>'
    + '<div class="cpsm-btn-row"><button class="cpsm-calc-btn" onclick="actionFeedback(this); dlaImportarPdf()">📄 Importar PDF</button></div>';
  if (!per.length) {
    h += '<div style="margin-top:10px;font-size:0.8rem;color:rgba(32,36,31,.6)">Todavía no hay meses cargados.</div>';
  } else {
    h += '<table class="cpsm-tabla" style="margin-top:10px"><thead><tr><th>Período</th><th>Honorarios</th><th>Gastos de equipo</th><th>Contrib. extraord.</th><th></th></tr></thead><tbody>';
    per.forEach(function(p) {
      var r = o[p], av = r.avisos && r.avisos.length;
      h += '<tr><td><strong>' + dlaEtiquetaPeriodo(p) + '</strong>' + (av ? ' <span title="' + r.avisos.join(" · ") + '" style="color:#b45309">⚠</span>' : '') + '</td>'
        + '<td style="text-align:right">' + dlaFmt(r.honorarios) + '</td>'
        + '<td style="text-align:right">' + dlaFmt(r.gastosEquipo) + '</td>'
        + '<td style="text-align:right">' + dlaFmt(r.contribExtra) + '</td>'
        + '<td style="white-space:nowrap"><a href="#" onclick="dlaToggle(\'' + p + '\');return false">' + (_dlaAbierto === p ? 'ocultar' : 'detalle') + '</a> · <a href="#" onclick="dlaBorrar(\'' + p + '\');return false" style="color:#b13a2c">borrar</a></td></tr>';
      if (_dlaAbierto === p) {
        h += '<tr><td colspan="5" style="background:rgba(32,36,31,.03)"><table style="width:100%;font-size:0.8rem">';
        DLA_DETALLE.forEach(function(d) {
          if (r[d[0]] === undefined) return;
          h += '<tr><td style="padding-left:' + (d[2] * 16) + 'px;' + (d[2] === 0 ? 'font-weight:700' : '') + '">' + d[1] + '</td><td style="text-align:right;' + (d[2] === 0 ? 'font-weight:700' : '') + '">' + dlaFmt(r[d[0]]) + '</td></tr>';
        });
        h += '</table><div style="font-size:0.7rem;color:rgba(32,36,31,.5);margin-top:4px">Archivo: ' + (r.archivo || "") + '</div></td></tr>';
      }
    });
    h += '</tbody></table>';
  }
  box.innerHTML = h;
}
