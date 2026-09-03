// importar-liquidacion.js — extraído de index.html. Modal de importación
// de liquidación (parseo de Excel/CSV pegado, MAPE_MAP, validación,
// preview y guardado). Solo definiciones.

// ══════ IMPORTAR LIQUIDACIÓN ════════════════════════════════════

const SOCIOS_IMP = ['BRUNI','CORELICH','DE LA COLINA','DEGANUTTI','LABAYEN',
                    'LEON','MAZZOLA','PERLASCO','SOULE','TRIVELLINI'];

const MAPE_MAP = {
  '40796362':'BRUNI',      '41796362':'CORELICH',    '42796362':'DEGANUTTI',
  '43796362':'LABAYEN',    '44796362':'TRIVELLINI',  '45796362':'MAZZOLA',
  '46796362':'DE LA COLINA','47796362':'PERLASCO',   '48796362':'LEON',
  '49796362':'SOULE',      '50796362':'GARMENDIA'
};

var impOsdeBilling = {}, impDifBilling = {}, impOsdeNeto = {};
var impColonCheques = [], impArtTotal = 0;
var impUndo   = { tipo: null, mes: null, data: null };
var impCMTotales = {};
var impCMUndo = { tipo: null, mes: null, data: null };

function abrirImportModal() {
  impOsdeBilling = {}; impDifBilling = {}; impOsdeNeto = {};
  impColonCheques = []; impArtTotal = 0;
  impCMTotales = {}; impCMUndo = { tipo: null, mes: null, data: null };
  document.getElementById('impStep2').style.display      = 'none';
  document.getElementById('impResultados').style.display = 'none';
  document.getElementById('impSheetMsg').textContent     = '';
  document.getElementById('impSheetMsg').className       = 'imp-sheet-msg';
  document.getElementById('impError').style.display      = 'none';
  document.getElementById('impCMResultados').style.display = 'none';
  document.getElementById('impCMMsg').textContent        = '';
  document.getElementById('impCMError').style.display    = 'none';
  document.getElementById('impCMUndoArea').style.display = 'none';
  document.getElementById('fileCEOT').value = '';
  document.getElementById('fileART').value  = '';
  document.getElementById('fileCM').value   = '';
  document.getElementById('importModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  actualizarMesColonAuto();
}

// Los cheques Colón se depositan ~2 meses después del mes facturado (CEOT.xlsx).
// Sugiere automáticamente ese mes en el selector propio de Cheques Colón cada vez
// que cambia "Mes a importar" — evita escribir con fechas de depósito reales
// (ej. septiembre) en la pestaña del mes facturado (julio), que no tiene esas
// columnas y termina escribiendo 0 celdas en silencio.
const MESES_IMP_ORD = ['enero','febrero','marzo','abril','mayo','junio','julio',
                        'agosto','septiembre','octubre','noviembre','diciembre'];
function actualizarMesColonAuto() {
  var mesSel = document.getElementById('impMes').value;
  var idx = MESES_IMP_ORD.indexOf(mesSel);
  if (idx === -1) return;
  var mesColon = MESES_IMP_ORD[(idx + 2) % 12];
  var sel = document.getElementById('impMesColon');
  if (sel && sel.querySelector('option[value="' + mesColon + '"]')) sel.value = mesColon;
}

function cerrarImportModal() {
  document.getElementById('importModal').style.display = 'none';
  document.body.style.overflow = '';
}

function normDocImp(nombre) {
  var up = String(nombre).toUpperCase().trim();
  var coma = up.indexOf(',');
  var ap = coma !== -1 ? up.substring(0, coma).trim() : up.split(/\s+/)[0];
  var MAPA = {
    'DE LA COLINA':'DE LA COLINA','BRUNI':'BRUNI','CORELICH':'CORELICH',
    'DEGANUTTI':'DEGANUTTI','LABAYEN':'LABAYEN','LEON':'LEON',
    'MAZZOLA':'MAZZOLA','PERLASCO':'PERLASCO','SOULE':'SOULE','TRIVELLINI':'TRIVELLINI'
  };
  if (MAPA[ap]) return MAPA[ap];
  for (var k in MAPA) {
    if (ap.indexOf(k) !== -1 || k.indexOf(ap) !== -1) return MAPA[k];
  }
  return null;
}

function fmtImp(n) {
  return '$ ' + Math.round(n).toLocaleString('es-AR');
}

function parsearMontoImp(str) {
  if (!str) return 0;
  var s = String(str).replace(/\$\s*/g,'').replace(/\./g,'').replace(',','.').trim();
  return parseFloat(s) || 0;
}

// Reporte "Liquidación a Profesionales" de Colón exportado como .txt de ancho fijo.
// Columnas usadas (offsets estables, verificados contra el reporte real):
// IMPORTE vía regex (evita depender de columnas GE/A/T que a veces vienen vacías),
// INST. en [74,83), PROF.Q.REALIZA en [138,185), OBSERVACIONES desde 246.
function parsearTXTColon(text) {
  var lineas = text.split(/\r?\n/);
  var reDato    = /^\s*\d+\s+\d+\s+\d+\s+\d+/;
  var reImporte = /(-?[\d.]+,\d{2})\s+[A-Z-]\s+[A-Z]\s+(\d{6})\s+(\d{6})/;
  var rows = [];
  lineas.forEach(function(linea) {
    if (!reDato.test(linea)) return;
    var m = reImporte.exec(linea);
    if (!m) return;
    var importe = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
    if (!importe) return;
    var row = [];
    row[3]  = importe;
    row[7]  = linea.slice(74, 83).trim();
    row[12] = linea.slice(138, 185).trim();
    row[15] = linea.slice(246).trim();
    rows.push(row);
  });
  return rows;
}

async function leerXLSX(file) {
  return new Promise(function(resolve, reject) {
    var esCSV = /\.csv$/i.test(file.name);
    var esTXT = /\.txt$/i.test(file.name);
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        if (esTXT) { resolve(parsearTXTColon(ev.target.result)); return; }
        var wb = esCSV
          ? XLSX.read(ev.target.result, { type: 'string' })
          : XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header:1, raw:true }));
      } catch(e) { reject(e); }
    };
    reader.onerror = function() { reject(new Error('No se pudo leer el archivo')); };
    if (esTXT)      reader.readAsText(file, 'ISO-8859-1'); // el export viene en Latin-1
    else if (esCSV) reader.readAsText(file, 'UTF-8');
    else            reader.readAsArrayBuffer(file);
  });
}

function mostrarImpError(msg) {
  var el = document.getElementById('impError');
  el.textContent = msg; el.style.display = 'block';
}

async function detectarTotalART() {
  var fileART = document.getElementById('fileART').files[0];
  if (!fileART) return;
  var row = document.getElementById('impArtTotalRow');
  var inp = document.getElementById('impArtManual');
  row.style.display = 'block';
  inp.value = 'Leyendo...';
  try {
    var artRows = await leerXLSX(fileART);
    // Sumar todos los valores numéricos de columna P (índice 15), saltar encabezado
    var totalVal = 0;
    for (var r = 0; r < artRows.length; r++) {
      var v = artRows[r] && artRows[r][15];
      var val = typeof v === 'number' ? v : parsearMontoImp(v);
      if (val > 0) totalVal += val;
    }
    inp.value = totalVal > 0
      ? totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';
  } catch(e) {
    inp.value = '';
  }
}

async function procesarArchivosImport() {
  var fileCEOT = document.getElementById('fileCEOT').files[0];
  if (!fileCEOT) { mostrarImpError('Seleccioná el archivo CEOT.xlsx'); return; }
  var btn = document.getElementById('btnProcesarArchivos');
  btn.textContent = 'Procesando…'; btn.disabled = true;
  document.getElementById('impError').style.display = 'none';

  try {
    // ── CEOT.xlsx: formato "crudo" ART, columnas detectadas por nombre de header
    // (mismo patrón que debCargarXLSXCrudo — más robusto si la ART reordena columnas)
    var osdeBill = {}, difBill = {};
    SOCIOS_IMP.forEach(function(k){ osdeBill[k] = 0; difBill[k] = 0; });

    // GAS.EQUIPO solo corresponde a estos 3 — si el xlsx lo carga a otro profesional,
    // se acumula aparte y se reparte en partes iguales entre los 3 (ver abajo)
    var GASEQ_SOCIOS = ['TRIVELLINI', 'CORELICH', 'DEGANUTTI'];
    var gasEqAjenoOsde = 0, gasEqAjenoDif = 0;

    var rows = await leerXLSX(fileCEOT);
    if (!rows.length) throw new Error('Archivo vacío.');

    // El .txt de Colón (parsearTXTColon) ya devuelve filas en posiciones fijas
    // y sin fila de encabezado — no corresponde detectar columnas por nombre.
    var esTXTCeot = /\.txt$/i.test(fileCEOT.name);
    var iImp, iInst, iProf, iObs;
    if (esTXTCeot) {
      iImp = 3; iInst = 7; iProf = 12; iObs = 15;
    } else {
      var ceotHeaders = rows[0].map(function(h){ return String(h || '').replace(/\s+/g,'').toUpperCase(); });
      var idxOfCeot = function(needle) {
        for (var i = 0; i < ceotHeaders.length; i++) if (ceotHeaders[i] && ceotHeaders[i].indexOf(needle) !== -1) return i;
        return -1;
      };
      iImp  = idxOfCeot('IMPORTE');
      iInst = idxOfCeot('INST.');
      iProf = idxOfCeot('.Q.REALIZA'); // nombre del profesional que realizó (no la col "PROF", que es el código)
      iObs  = idxOfCeot('OBSERVACIONES');
      if (iImp === -1 || iInst === -1 || iProf === -1 || iObs === -1) {
        throw new Error('No reconozco las columnas de este archivo (falta IMPORTE, INST., PROF/.Q.REALIZA u OBSERVACIONES). ¿Es el formato crudo de la ART?');
      }
    }

    for (var r = esTXTCeot ? 0 : 1; r < rows.length; r++) {
      var row = rows[r];
      if (!row || !row.length) continue;
      var imp  = typeof row[iImp] === 'number' ? row[iImp] : parsearMontoImp(row[iImp]);
      if (!imp) continue;
      var inst = String(row[iInst] || '').trim().toUpperCase();
      var prof = String(row[iProf] || '').trim();
      var obs  = String(row[iObs]  || '').trim().toUpperCase();
      var key  = normDocImp(prof);
      if (!key) continue;
      var sgn  = (obs.indexOf('DEB') !== -1 && obs.indexOf('HONORARIOS') !== -1) ? -1 : 1;
      var esGasEquipoAjeno = obs.replace(/\s+/g, '').indexOf('GAS.EQUIPO') !== -1 && GASEQ_SOCIOS.indexOf(key) === -1;
      if (esGasEquipoAjeno) {
        if (inst === 'OSDE') gasEqAjenoOsde += imp * sgn;
        else                 gasEqAjenoDif  += imp * sgn;
        continue;
      }
      if (inst === 'OSDE') osdeBill[key] += imp * sgn;
      else                 difBill[key]  += imp * sgn;
    }
    if (gasEqAjenoOsde || gasEqAjenoDif) {
      GASEQ_SOCIOS.forEach(function(k) {
        osdeBill[k] += gasEqAjenoOsde / 3;
        difBill[k]  += gasEqAjenoDif  / 3;
      });
    }

    // ── ART: usar el total del campo editable (detectado o ingresado manualmente)
    var artTotal = 0;
    var fileART = document.getElementById('fileART').files[0];
    if (fileART) {
      artTotal = parsearMontoImp(document.getElementById('impArtManual').value);
      if (artTotal > 0) {
        difBill['DEGANUTTI']  += artTotal * 0.35;
        difBill['TRIVELLINI'] += artTotal * 0.35;
        difBill['MAZZOLA']    += artTotal * 0.30;
      }
    }

    impOsdeBilling = osdeBill;
    impDifBilling  = difBill;
    impArtTotal    = artTotal;

    // ── Preview table
    var totOSDE = SOCIOS_IMP.reduce(function(s,k){ return s+(osdeBill[k]||0); }, 0);
    var totDIF  = SOCIOS_IMP.reduce(function(s,k){ return s+(difBill[k]||0);  }, 0);

    var tbody = document.getElementById('impPreviewBody');
    tbody.innerHTML = '';
    SOCIOS_IMP.forEach(function(k) {
      var pO = totOSDE > 0 ? (osdeBill[k]||0)/totOSDE*100 : 0;
      var pD = totDIF  > 0 ? (difBill[k]||0)/totDIF*100   : 0;
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="ipt-name">' + k + '</td>' +
        '<td class="ipt-num">' + pO.toFixed(2) + '%</td>' +
        '<td class="ipt-num">' + fmtImp(difBill[k]||0) + '</td>' +
        '<td class="ipt-num">' + pD.toFixed(2) + '%</td>';
      tbody.appendChild(tr);
    });

    // ART / GAS.EQUIPO footnotes
    var prevTfoot = document.getElementById('impPreviewTable').querySelector('tfoot');
    if (prevTfoot) prevTfoot.remove();
    var tfootRows = '';
    if (artTotal > 0) {
      tfootRows += '<tr style="background:#f0fdf4"><td colspan="4" style="padding:6px 10px;font-size:0.7rem;color:#16a34a;font-weight:600;">' +
        'ART incluida: ' + fmtImp(artTotal) + ' → DEG 35% + TRI 35% + MAZ 30%</td></tr>';
    }
    if (gasEqAjenoOsde || gasEqAjenoDif) {
      var gasEqTotal = gasEqAjenoOsde + gasEqAjenoDif;
      var gasEqShare = gasEqTotal / 3;
      var gasEqDetalle = GASEQ_SOCIOS.map(function(k) {
        var totalPropio = (osdeBill[k]||0) + (difBill[k]||0);
        var pctPropio = totalPropio > 0 ? (gasEqShare / totalPropio * 100) : 0;
        return k + ' ' + fmtImp(gasEqShare) + ' (' + pctPropio.toFixed(2) + '% de su propio total)';
      }).join(' · ');
      tfootRows += '<tr style="background:#fef9c3"><td colspan="4" style="padding:6px 10px;font-size:0.7rem;color:#92610f;font-weight:600;">' +
        'GAS.EQUIPO redistribuido (cargado a otro profesional en el xlsx): ' + fmtImp(gasEqTotal) +
        ' → 33.33% c/u a TRI/COR/DEG.<br>' + gasEqDetalle + '</td></tr>';
    }
    if (tfootRows) {
      var tfoot = document.getElementById('impPreviewTable').createTFoot();
      tfoot.innerHTML = tfootRows;
    }

    // ── Colón cheque rows
    var colonDiv = document.getElementById('impColonFields');
    colonDiv.innerHTML = '';
    for (var i = 1; i <= 5; i++) {
      colonDiv.innerHTML +=
        '<div class="imp-colon-row">' +
        '<span class="imp-colon-lbl">Colón ' + i + '</span>' +
        '<input type="text" id="impChqColon' + i + '" class="imp-colon-input" placeholder="Importe bruto $">' +
        '<input type="text" id="impFechaColon' + i + '" class="imp-colon-fecha" placeholder="DD/MM">' +
        '</div>';
    }

    document.getElementById('impStep2').style.display = 'block';
    document.getElementById('impResultados').style.display = 'none';

  } catch(err) {
    mostrarImpError('Error procesando archivos: ' + err.message);
  }

  btn.textContent = 'Reprocesar ▸'; btn.disabled = false;
}

// ── Importador PDF "FAC" (Factura Clínica Colón — Gastos Generales) ──────
var FAC_SOCIOS_ADSCRIPTOS = ['DE LA COLINA', 'MAZZOLA', 'PERLASCO', 'SOULE', 'LEON'];

// Conceptos esperados en la factura de Colón, uno por línea con columnas Gravado / Exento-No Gravado
// (se suman ambas al extraer — cada concepto usa solo una de las dos, pero cuál varía según el concepto).
var FAC_CONCEPTOS = [
  { label:'Abono Telefónico',            key:'abonoTelefonico' },
  { label:'Gtos.Adm.',                   key:'gtosAdm' },
  { label:'Residuos Patológicos',        key:'residuosPatologicos' },
  { label:'Plan Swiss Medical',          key:'planSwissMedical' },
  { label:'Derechos Adscriptos',         key:'derechosAdscriptos' },
  { label:'Medicamentos y Descartables', key:'medicamentosDescartables' },
  { label:'Recetarios y Fotocopias',     key:'recetariosFotocopias' },
  { label:'Seguro de Mala Praxis SMG',   key:'seguroMalaPraxis' },
  { label:'Retención Centro Médico',     key:'retencionCM' },
  { label:'Contribuciones p/ Gastos',    key:'contribucionesGastos' }
];

function facExtraerImporte(linea) {
  var m = linea.match(/(-?[\d.]+,\d{2})\s*$/);
  return m ? parsearMontoImp(m[1]) : null;
}
function facExtraerParImportes(linea) {
  var m = linea.match(/(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})\s*$/);
  return m ? [parsearMontoImp(m[1]), parsearMontoImp(m[2])] : null;
}

async function facTextoAPaginas(file) {
  var buf = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  var lineas = [];
  for (var p = 1; p <= pdf.numPages; p++) {
    var page = await pdf.getPage(p);
    var content = await page.getTextContent();
    var filas = {};
    content.items.forEach(function(it) {
      var y = Math.round(it.transform[5] / 2) * 2; // agrupa items de la misma fila
      (filas[y] = filas[y] || []).push(it);
    });
    Object.keys(filas).map(Number).sort(function(a,b){ return b-a; }).forEach(function(y) {
      var fila = filas[y].sort(function(a,b){ return a.transform[4]-b.transform[4]; });
      lineas.push(fila.map(function(it){ return it.str; }).join(' ').replace(/\s+/g,' ').trim());
    });
  }
  return lineas.filter(function(l){ return l; });
}

function facWarnBox(list) {
  if (!list.length) return '';
  return '<div style="background:#fef3c7;border:1px solid #92610f;border-radius:7px;padding:8px 10px;' +
    'margin:6px 0;font-size:.72rem;color:#92610f"><strong>⚠ ' + list.length + ' aviso' +
    (list.length > 1 ? 's' : '') + ':</strong><ul style="margin:4px 0 0 16px;padding:0">' +
    list.map(function(w){ return '<li style="margin-bottom:2px">' + w + '</li>'; }).join('') +
    '</ul></div>';
}

function facRenderResumen(d) {
  if (!d.totalFactura && !Object.keys(d.conceptos).length) {
    return '<div style="font-size:.75rem;color:rgba(32,36,31,.5);padding:6px 0">No se pudo extraer ningún dato reconocible de este PDF.</div>';
  }
  var c = d.conceptos;
  // "Resto de descuentos" — solo se muestran, sin ningún cálculo de distribución.
  var rows = [
    ['Abono Telefónico', c.abonoTelefonico],
    ['Gtos.Adm.', c.gtosAdm],
    ['Residuos Patológicos', c.residuosPatologicos],
    ['Medicamentos y Descartables', c.medicamentosDescartables],
    ['Recetarios y Fotocopias', c.recetariosFotocopias],
    ['Seguro de Mala Praxis SMG', c.seguroMalaPraxis],
    ['Retención Centro Médico', c.retencionCM],
    ['Contribuciones p/ Gastos', c.contribucionesGastos],
    ['Subtotal Gravado', d.subtotales.gravado],
    ['Subtotal Exento / No Gravado', d.subtotales.exento],
    ['IVA 21%', d.cargas.iva],
    ['Percepción IIBB', d.cargas.iibb],
    ['TOTAL FACTURA', d.totalFactura]
  ];
  var html = '<div style="font-size:.72rem;color:rgba(32,36,31,.5);margin:4px 0 6px">Factura Colón' +
    (d.facturaNro ? ' Nº <strong>' + d.facturaNro + '</strong>' : '') +
    (d.fecha ? ' — <strong>' + d.fecha + '</strong>' : '') +
    '</div><div class="imp-table-wrap"><table class="imp-table"><tbody>';
  rows.forEach(function(r) {
    if (r[1] === null || r[1] === undefined) return;
    html += '<tr><td style="text-align:left;padding:4px 8px">' + r[0] + '</td>' +
      '<td class="ipt-num">' + fmtImp(r[1]) + '</td></tr>';
  });
  html += '</tbody></table></div>';

  if (c.derechosAdscriptos) {
    var perSocio = Math.abs(c.derechosAdscriptos) / 5;
    html += '<div style="background:#eef2ea;border:1px solid #1f3a2e;border-radius:7px;padding:8px 10px;' +
      'margin-top:6px;font-size:.74rem;color:#1f3a2e"><strong>Derechos Adscriptos:</strong> ' +
      fmtImp(Math.abs(c.derechosAdscriptos)) + ' ÷ 5 socios = ' + fmtImp(perSocio) + ' c/u ÷ cheques diferidos — se aplica ' +
      'automático a ' + FAC_SOCIOS_ADSCRIPTOS.join(' / ') + ' al calcular distribución.</div>';
  }
  if (c.planSwissMedical) {
    html += '<div class="imp-field" style="margin-top:8px">' +
      '<label class="imp-label">Plan Swiss Medical (' + fmtImp(Math.abs(c.planSwissMedical)) +
      ') — descontar a</label>' +
      '<select id="facSwissMedicalDoctor" class="imp-select">' +
      '<option value="">Elegir profesional…</option>' +
      SOCIOS_IMP.map(function(k){ return '<option value="' + k + '">' + k + '</option>'; }).join('') +
      '</select></div>';
  }
  return html;
}

async function facCargarPDF(file) {
  var warnEl = document.getElementById('facWarnings');
  var resEl  = document.getElementById('facResumen');
  if (!file) return;
  if (!window.pdfjsLib) {
    warnEl.innerHTML = facWarnBox(['La librería de lectura de PDF todavía se está cargando — esperá un segundo y volvé a intentar.']);
    return;
  }
  resEl.innerHTML = '<div style="padding:8px 0;color:rgba(32,36,31,.5);font-size:.8rem">Leyendo PDF…</div>';
  warnEl.innerHTML = '';

  var lineas;
  try {
    lineas = await facTextoAPaginas(file);
  } catch (err) {
    resEl.innerHTML = '';
    warnEl.innerHTML = facWarnBox(['No se pudo leer el PDF: ' + err.message]);
    return;
  }

  var d = { facturaNro: null, fecha: null, conceptos: {}, subtotales: { gravado:null, exento:null },
            cargas: { iva:null, iibb:null }, totalFactura: null };
  var warnings = [], extra = [], encontrados = {}, gravadoSum = 0, exentoSum = 0;

  lineas.forEach(function(linea) {
    var mFact = linea.match(/Factura\s*N[ªa°]\s*(\d+\s+\d+)/i);
    if (mFact && !d.facturaNro) d.facturaNro = mFact[1];
    var mFecha = linea.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (mFecha && !d.fecha) d.fecha = mFecha[1];

    if (linea.indexOf('Gravado') === 0)              { d.subtotales.gravado = facExtraerImporte(linea); return; }
    if (linea.indexOf('Exento / No Gravado') === 0)  { d.subtotales.exento  = facExtraerImporte(linea); return; }
    if (linea.indexOf('Impuesto al Valor Agregado') === 0) { d.cargas.iva  = facExtraerImporte(linea); return; }
    if (linea.indexOf('Percepción Ingresos Brutos') === 0) { d.cargas.iibb = facExtraerImporte(linea); return; }
    if (linea.indexOf('TOTAL FACTURA') === 0)        { d.totalFactura = facExtraerImporte(linea); return; }

    var match = null;
    FAC_CONCEPTOS.forEach(function(x) {
      if (!match && linea.indexOf(x.label) === 0) match = x;
    });
    if (match) {
      var par = facExtraerParImportes(linea);
      if (par) {
        d.conceptos[match.key] = par[0] + par[1];
        gravadoSum += par[0]; exentoSum += par[1];
        encontrados[match.key] = true;
      }
      return;
    }

    var par2 = facExtraerParImportes(linea);
    if (par2 && (par2[0] || par2[1])) extra.push(linea);
  });

  // ── Anomalías: estructura ──
  FAC_CONCEPTOS.forEach(function(x) {
    if (!encontrados[x.key]) warnings.push('No se encontró la línea esperada "' + x.label + '".');
  });
  if (d.subtotales.gravado === null) warnings.push('No se encontró el subtotal "Gravado".');
  if (d.subtotales.exento === null)  warnings.push('No se encontró el subtotal "Exento / No Gravado".');
  if (d.cargas.iva === null)  warnings.push('No se encontró "Impuesto al Valor Agregado".');
  if (d.cargas.iibb === null) warnings.push('No se encontró "Percepción Ingresos Brutos".');
  if (d.totalFactura === null) warnings.push('No se encontró "TOTAL FACTURA".');
  extra.forEach(function(l) { warnings.push('Línea nueva no reconocida en el PDF (revisar si hay que sumarla a algún cálculo): "' + l + '"'); });

  function cerca(a, b) { return Math.abs((a||0) - (b||0)) < 1; }
  if (d.subtotales.gravado !== null && !cerca(gravadoSum, d.subtotales.gravado))
    warnings.push('La suma de la columna Gravado no cierra con el subtotal (' + fmtImp(gravadoSum) + ' vs ' + fmtImp(d.subtotales.gravado) + ').');
  if (d.subtotales.exento !== null && !cerca(exentoSum, d.subtotales.exento))
    warnings.push('La suma de la columna Exento/No Gravado no cierra con el subtotal (' + fmtImp(exentoSum) + ' vs ' + fmtImp(d.subtotales.exento) + ').');
  if (d.subtotales.gravado !== null && d.subtotales.exento !== null &&
      d.cargas.iva !== null && d.cargas.iibb !== null && d.totalFactura !== null &&
      !cerca(d.subtotales.gravado + d.subtotales.exento + d.cargas.iva + d.cargas.iibb, d.totalFactura))
    warnings.push('TOTAL FACTURA no cierra con Gravado + Exento + IVA + Percepción IIBB.');

  // ── Anomalías: variación fuerte vs. la última factura cargada ──
  try {
    var prev = JSON.parse(localStorage.getItem('ceot_fac_last') || 'null');
    if (prev) {
      var chk = function(label, curVal, prevVal) {
        if (curVal == null || prevVal == null || !prevVal) return;
        var pct = Math.abs(curVal - prevVal) / Math.abs(prevVal) * 100;
        if (pct > 15) warnings.push(label + ' varió ' + pct.toFixed(0) + '% respecto a la última factura cargada (' +
          fmtImp(Math.abs(prevVal)) + ' → ' + fmtImp(Math.abs(curVal)) + ').');
      };
      chk('Derechos Adscriptos', d.conceptos.derechosAdscriptos, prev.derechosAdscriptos);
      chk('Plan Swiss Medical', d.conceptos.planSwissMedical, prev.planSwissMedical);
      chk('TOTAL FACTURA', d.totalFactura, prev.totalFactura);
    }
  } catch (e) {}

  try {
    localStorage.setItem('ceot_fac_last', JSON.stringify({
      derechosAdscriptos: d.conceptos.derechosAdscriptos, planSwissMedical: d.conceptos.planSwissMedical,
      totalFactura: d.totalFactura, timestamp: Date.now()
    }));
  } catch (e) {}

  window.facParsed = d;
  warnEl.innerHTML = facWarnBox(warnings);
  resEl.innerHTML = facRenderResumen(d);
}

function calcularDistribucionFinal() {
  var totOSDE = SOCIOS_IMP.reduce(function(s,k){ return s+(impOsdeBilling[k]||0); }, 0);
  var totDIF  = SOCIOS_IMP.reduce(function(s,k){ return s+(impDifBilling[k]||0);  }, 0);

  // OSDE neto por profesional
  var chqOSDE  = parsearMontoImp(document.getElementById('impChqOSDE').value);
  var netoOSDE = chqOSDE * 0.96;
  impOsdeNeto  = {};
  SOCIOS_IMP.forEach(function(k) {
    impOsdeNeto[k] = totOSDE > 0 ? netoOSDE * (impOsdeBilling[k]||0) / totOSDE : 0;
  });

  // Colón cheques con fecha
  impColonCheques = [];
  for (var i = 1; i <= 5; i++) {
    var monto = parsearMontoImp(document.getElementById('impChqColon' + i).value);
    var fecha = (document.getElementById('impFechaColon' + i).value || '').trim();
    if (monto > 0 && fecha) {
      var neto = monto * 0.96;
      var d = {};
      SOCIOS_IMP.forEach(function(k) {
        d[k] = totDIF > 0 ? neto * (impDifBilling[k]||0) / totDIF : 0;
      });
      impColonCheques.push({ fecha: fecha, d: d });
    }
  }

  // Derechos Adscriptos (PDF FAC importado) — descuento solo a los 5 socios adscriptos,
  // repartido equitativo entre ellos y luego entre sus cheques Colón del mes.
  var facDerechosFootnote = '';
  if (window.facParsed && window.facParsed.conceptos.derechosAdscriptos && impColonCheques.length > 0) {
    var daTotal    = Math.abs(window.facParsed.conceptos.derechosAdscriptos);
    var daPerSocio = daTotal / 5;
    var daPerCheque = daPerSocio / impColonCheques.length;
    impColonCheques.forEach(function(c) {
      FAC_SOCIOS_ADSCRIPTOS.forEach(function(k) {
        if (c.d[k] !== undefined) c.d[k] -= daPerCheque;
      });
    });
    facDerechosFootnote = '<div style="font-size:.65rem;color:#92610f;padding:6px 0 0 8px">⚑ Derechos Adscriptos ' +
      fmtImp(daTotal) + ' ÷ 5 socios = ' + fmtImp(daPerSocio) + ' c/u, repartido en ' + impColonCheques.length +
      ' cheque(s) (' + fmtImp(daPerCheque) + ' c/u) — ya descontado de ' + FAC_SOCIOS_ADSCRIPTOS.join('/') + ' arriba.' +
      (impColonCheques.length !== 5 ? ' <strong>⚠ se calcularon ' + impColonCheques.length + ' cheques, no 5 — revisar.</strong>' : '') +
      '</div>';
  }

  // Plan Swiss Medical (PDF FAC importado) — se descuenta al profesional elegido en el selector;
  // el total se redistribuye entre los 9 restantes, proporcional a su facturación Diferidos del período,
  // repartido luego entre sus cheques Colón del mes (mismo criterio de reparto por cheque que arriba).
  var facSwissFootnote = '';
  var swissTotal = (window.facParsed && window.facParsed.conceptos.planSwissMedical)
    ? Math.abs(window.facParsed.conceptos.planSwissMedical) : 0;
  var swissDoctorEl = document.getElementById('facSwissMedicalDoctor');
  var swissDoctor = swissDoctorEl ? swissDoctorEl.value : '';
  if (swissTotal > 0 && swissDoctor && impColonCheques.length > 0) {
    var swissRestantes = SOCIOS_IMP.filter(function(k){ return k !== swissDoctor; });
    var totDIFRestantes = swissRestantes.reduce(function(s,k){ return s + (impDifBilling[k]||0); }, 0);
    var swissShare = {};
    swissRestantes.forEach(function(k) {
      swissShare[k] = totDIFRestantes > 0 ? swissTotal * (impDifBilling[k]||0) / totDIFRestantes : 0;
    });
    impColonCheques.forEach(function(c) {
      swissRestantes.forEach(function(k) {
        if (c.d[k] !== undefined) c.d[k] -= swissShare[k] / impColonCheques.length;
      });
    });
    facSwissFootnote = '<div style="font-size:.65rem;color:#92610f;padding:6px 0 0 8px">⚑ Plan Swiss Medical ' +
      fmtImp(swissTotal) + ' descontado a ' + swissDoctor + ', redistribuido proporcional a facturación ' +
      'Diferidos entre los 9 restantes, repartido en ' + impColonCheques.length + ' cheque(s).</div>';
  } else if (swissTotal > 0 && !swissDoctor) {
    facSwissFootnote = '<div style="font-size:.65rem;color:#b13a2c;padding:6px 0 0 8px">⚠ Plan Swiss Medical ' +
      fmtImp(swissTotal) + ' detectado en la factura pero no se eligió a qué profesional descontarlo — no se aplicó ningún descuento.</div>';
  }

  // Equipo laparoscopia (carga manual) — descuento solo a Corelich/Trivellini/Deganutti,
  // repartido equitativo entre ellos y luego entre sus cheques Colón del mes
  // (mismo criterio que la compra de equipo de artroscopia ya documentada).
  var EQUIPO_LAP_SOCIOS = ['CORELICH', 'TRIVELLINI', 'DEGANUTTI'];
  var compraEquipoLap = parsearMontoImp(document.getElementById('impCompraEquipoLap').value);
  var gastoTorreLap   = parsearMontoImp(document.getElementById('impGastoTorreLap').value);
  var totalEquipoLap  = Math.abs(compraEquipoLap) + Math.abs(gastoTorreLap);
  var equipoLapFootnote = '';
  if (totalEquipoLap > 0 && impColonCheques.length > 0) {
    var eqPerSocio  = totalEquipoLap / 3;
    var eqPerCheque = eqPerSocio / impColonCheques.length;
    impColonCheques.forEach(function(c) {
      EQUIPO_LAP_SOCIOS.forEach(function(k) {
        if (c.d[k] !== undefined) c.d[k] -= eqPerCheque;
      });
    });
    equipoLapFootnote = '<div style="font-size:.65rem;color:#92610f;padding:2px 0 6px 8px">⚑ Equipo laparoscopia ' +
      (compraEquipoLap ? 'Compra ' + fmtImp(Math.abs(compraEquipoLap)) : '') +
      (compraEquipoLap && gastoTorreLap ? ' + ' : '') +
      (gastoTorreLap ? 'Torre ' + fmtImp(Math.abs(gastoTorreLap)) : '') +
      ' = ' + fmtImp(totalEquipoLap) + ' ÷ 3 socios (' + EQUIPO_LAP_SOCIOS.join('/') + ') = ' + fmtImp(eqPerSocio) +
      ' c/u, repartido en ' + impColonCheques.length + ' cheque(s) (' + fmtImp(eqPerCheque) + ' c/u).</div>';
  }

  // Render resultado
  var totColon = {};
  SOCIOS_IMP.forEach(function(k) {
    totColon[k] = impColonCheques.reduce(function(s,c){ return s+(c.d[k]||0); }, 0);
  });

  var sumOSDE = 0, sumDIF = 0;
  var html = '<div class="imp-table-wrap"><table class="imp-table"><thead><tr>' +
    '<th style="text-align:left">Profesional</th><th>OSDE neto</th><th>Total Colón</th><th>Total neto</th>' +
    '</tr></thead><tbody>';
  SOCIOS_IMP.forEach(function(k) {
    var osde = impOsdeNeto[k]||0, col = totColon[k]||0, tot = osde + col;
    sumOSDE += osde; sumDIF += col;
    html += '<tr><td class="ipt-name">' + k + '</td>' +
      '<td class="ipt-num">' + fmtImp(osde) + '</td>' +
      '<td class="ipt-num">' + fmtImp(col) + '</td>' +
      '<td class="ipt-num" style="font-weight:800;color:#20241f">' + fmtImp(tot) + '</td></tr>';
  });
  html += '<tr style="background:rgba(32,36,31,.04);border-top:2px solid rgba(32,36,31,.15)">' +
    '<td style="padding:6px 10px;font-weight:800">TOTAL</td>' +
    '<td class="ipt-num" style="font-weight:700">' + fmtImp(sumOSDE) + '</td>' +
    '<td class="ipt-num" style="font-weight:700">' + fmtImp(sumDIF) + '</td>' +
    '<td class="ipt-num" style="font-weight:800;color:#20241f">' + fmtImp(sumOSDE+sumDIF) + '</td></tr>';
  html += '</tbody></table></div>';
  document.getElementById('impResultBody').innerHTML = html + facDerechosFootnote + facSwissFootnote + equipoLapFootnote;
  document.getElementById('impResultados').style.display = 'block';
}

async function cargarEnSheet(tipo) {
  // "dist" (Cheques Colón) usa su propio selector de mes: se deposita ~2 meses
  // después del mes facturado que usan Diferidos/OSDE/CM.
  var mes   = tipo === 'dist' ? document.getElementById('impMesColon').value
                               : document.getElementById('impMes').value;
  var msgEl = document.getElementById('impSheetMsg');
  var undoArea = document.getElementById('impUndoArea');
  msgEl.textContent = 'Guardando backup…';
  msgEl.className   = 'imp-sheet-msg';
  undoArea.style.display = 'none';

  // Validaciones previas
  if (tipo === 'osde' && !Object.keys(impOsdeNeto).length) {
    msgEl.textContent = 'Calculá la distribución OSDE primero';
    msgEl.className = 'imp-sheet-msg imp-err'; return;
  }
  if (tipo === 'dist' && !impColonCheques.length) {
    msgEl.textContent = 'Calculá los cheques Colón primero';
    msgEl.className = 'imp-sheet-msg imp-err'; return;
  }

  // Leer estado actual del sheet (backup para deshacer)
  try {
    var bkpResp = await fetch(authURL(LIQUIDACION_ENDPOINT + '?action=leer&tipo=' + tipo + '&mes=' + mes));
    var bkpData = await bkpResp.json();
    if (bkpData.ok) {
      impUndo = { tipo: tipo, mes: mes, data: bkpData.valores || bkpData.cheques };
    } else {
      impUndo = { tipo: null, mes: null, data: null };
    }
  } catch(e) {
    impUndo = { tipo: null, mes: null, data: null };
  }

  // Escribir nuevos valores
  msgEl.textContent = 'Cargando en Sheet…';
  try {
    var url = LIQUIDACION_ENDPOINT + '?action=import&tipo=' + tipo + '&mes=' + mes;
    if (tipo === 'diferidos') {
      url += '&valores=' + encodeURIComponent(JSON.stringify(impDifBilling));
    } else if (tipo === 'osde') {
      url += '&valores=' + encodeURIComponent(JSON.stringify(impOsdeNeto));
    } else if (tipo === 'dist') {
      url += '&cheques=' + encodeURIComponent(JSON.stringify(impColonCheques));
    }
    var resp = await fetch(authURL(url));
    var data = await resp.json();
    if (data.ok && (data.escritos||0) > 0) {
      var noEnc = data.chequesNoEncontrados || [];
      if (noEnc.length) {
        msgEl.textContent = '⚠ Cargado ' + data.escritos + ' celdas, pero NO encontré columna para: ' +
          noEnc.join(', ') + ' — revisá la fecha de ese/esos cheque(s) (columnas disponibles en el Sheet: ' +
          (data.columnasDisponibles || []).join(', ') + ')';
        msgEl.className = 'imp-sheet-msg imp-err';
      } else {
        msgEl.textContent = '✓ Cargado — ' + data.escritos + ' celdas escritas';
        msgEl.className   = 'imp-sheet-msg imp-ok';
      }
      if (impUndo.tipo) {
        var labels = { diferidos: 'Diferidos', osde: 'OSDE', dist: 'Colón' };
        document.getElementById('impUndoLabel').textContent = labels[tipo] + ' — ' + mes;
        undoArea.style.display = 'block';
      }
    } else if (data.ok) {
      msgEl.textContent = '⚠ 0 celdas escritas — revisá que el mes/fecha coincida con las columnas de esa pestaña en el Sheet';
      msgEl.className   = 'imp-sheet-msg imp-err';
    } else {
      msgEl.textContent = '✗ ' + (data.error || 'Error');
      msgEl.className   = 'imp-sheet-msg imp-err';
    }
  } catch(err) {
    msgEl.textContent = '✗ ' + err.message;
    msgEl.className   = 'imp-sheet-msg imp-err';
  }
}

// Formato B (CSV de CEM) trae el importe ya escalado con "." como separador decimal
// (ej. "83241.00", "397156.14") — NO en centavos como el Formato A. Si SheetJS lo lee
// como number, se usa tal cual; si llega como string, se parsea como decimal con punto
// (no con la convención argentina de parsearMontoImp, que asumiría "." como miles).
function parsearImporteCM(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  var s = String(v).trim().replace(/[^0-9.\-]/g, '');
  return parseFloat(s) || 0;
}

async function procesarCentroMedico() {
  var files = document.getElementById('fileCM').files;
  var errEl = document.getElementById('impCMError');
  errEl.style.display = 'none';
  if (!files.length) { errEl.textContent='Seleccioná al menos un archivo CM'; errEl.style.display='block'; return; }

  var totales = {};
  SOCIOS_IMP.forEach(function(k){ totales[k] = 0; });
  // Garmendia (MAPE 50796362) u otro profesional mapeado fuera de SOCIOS_IMP:
  // si su MAPE aparece en el CSV, el importe se le atribuye a esa persona.
  Object.keys(MAPE_MAP).forEach(function(m){ if (totales[MAPE_MAP[m]] === undefined) totales[MAPE_MAP[m]] = 0; });

  try {
    for (var f = 0; f < files.length; f++) {
      var rows = await leerXLSX(files[f]);
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        if (!row) continue;
        // Formato A: col N(13)=matrícula, col Q(16)=importe
        var mapeA = String(row[13] || '').trim();
        var profA = MAPE_MAP[mapeA];
        if (profA) {
          var vA = row[16];
          // Celda numérica: Excel la trae en centavos (ej. 340347873 = $3.403.478,73)
          var valA = typeof vA === 'number' ? vA / 100 : parsearMontoImp(vA);
          totales[profA] += valA;
          continue;
        }
        // Formato B: col H(7)=matrícula, col J(9)=importe
        var mapeB = String(row[7] || '').trim();
        var profB = MAPE_MAP[mapeB];
        if (profB) {
          var vB = row[9];
          var valB = parsearImporteCM(vB);
          totales[profB] += valB;
        }
      }
    }

    // Total real depositado (opcional): si se carga, se usa como el "cheque" real y se
    // prorratea entre los profesionales según el % que cada uno sacó de los CSV — mismo
    // criterio que ya se usa para el cheque OSDE/Colón (el archivo da el %, el depósito
    // real da el monto a repartir).
    // SOCIOS_IMP + cualquier profesional mapeado (ej. Garmendia) que tenga importe en el CSV
    var profsCM = SOCIOS_IMP.concat(Object.keys(totales).filter(function(k){
      return SOCIOS_IMP.indexOf(k) < 0 && (totales[k] || 0) > 0;
    }));

    var totalCSV = profsCM.reduce(function(s,k){ return s+(totales[k]||0); }, 0);
    var totalReal = parsearMontoImp(document.getElementById('impCMTotalReal').value);
    var usarTotalReal = totalReal > 0 && totalCSV > 0;

    var montos = {};
    profsCM.forEach(function(k) {
      montos[k] = usarTotalReal ? totalReal * (totales[k]||0) / totalCSV : (totales[k]||0);
    });
    impCMTotales = montos;
    var total = profsCM.reduce(function(s,k){ return s+(montos[k]||0); }, 0);

    var tbody = document.getElementById('impCMBody');
    tbody.innerHTML = '';
    profsCM.forEach(function(k) {
      var imp = montos[k]||0;
      var pct = total > 0 ? (imp/total*100) : 0;
      var tr = document.createElement('tr');
      tr.innerHTML = '<td class="ipt-name">' + k + '</td>' +
        '<td class="ipt-num">' + fmtImp(imp) + '</td>' +
        '<td class="ipt-num">' + pct.toFixed(2) + '%</td>';
      tbody.appendChild(tr);
    });
    var tf = document.createElement('tr');
    tf.style.cssText = 'background:rgba(32,36,31,.04);border-top:2px solid #e5e7eb';
    tf.innerHTML = '<td style="padding:6px 10px;font-weight:800">TOTAL</td>' +
      '<td class="ipt-num" style="font-weight:700">' + fmtImp(total) + '</td>' +
      '<td class="ipt-num" style="font-weight:700">100%</td>';
    tbody.appendChild(tf);

    var notaTotal = document.getElementById('impCMNotaTotal');
    notaTotal.innerHTML = usarTotalReal
      ? '💰 Usando total real depositado: ' + fmtImp(totalReal) + ' (los CSV sumaban ' + fmtImp(totalCSV) + ', prorrateado por %).'
      : '';

    document.getElementById('impCMResultados').style.display = 'block';
    document.getElementById('impCMMsg').textContent = '';
    document.getElementById('impCMUndoArea').style.display = 'none';
  } catch(err) {
    errEl.textContent = 'Error procesando CM: ' + err.message;
    errEl.style.display = 'block';
  }
}

async function cargarCMenSheet() {
  var mes = document.getElementById('impMesCM').value;
  var msgEl = document.getElementById('impCMMsg');
  var undoArea = document.getElementById('impCMUndoArea');
  msgEl.textContent = 'Guardando backup…'; msgEl.className = 'imp-sheet-msg';
  undoArea.style.display = 'none';
  try {
    var bkp = await fetch(authURL(LIQUIDACION_ENDPOINT + '?action=leer&tipo=cm&mes=' + mes));
    var bd  = await bkp.json();
    impCMUndo = bd.ok ? { tipo:'cm', mes:mes, data:bd.valores||{} } : { tipo:null, mes:null, data:null };
  } catch(e) { impCMUndo = { tipo:null, mes:null, data:null }; }

  msgEl.textContent = 'Cargando en Sheet…';
  try {
    var url = LIQUIDACION_ENDPOINT + '?action=import&tipo=cm&mes=' + mes +
              '&valores=' + encodeURIComponent(JSON.stringify(impCMTotales));
    var data = await (await fetch(authURL(url))).json();
    if (data.ok) {
      msgEl.textContent = '✓ CM cargado — ' + (data.escritos||0) + ' celdas escritas';
      msgEl.className = 'imp-sheet-msg imp-ok';
      if (impCMUndo.tipo) undoArea.style.display = 'block';
    } else {
      msgEl.textContent = '✗ ' + (data.error||'Error');
      msgEl.className = 'imp-sheet-msg imp-err';
    }
  } catch(err) { msgEl.textContent='✗ '+err.message; msgEl.className='imp-sheet-msg imp-err'; }
}

async function deshacerCM() {
  if (!impCMUndo.tipo) return;
  var msgEl = document.getElementById('impCMMsg');
  var undoArea = document.getElementById('impCMUndoArea');
  msgEl.textContent = 'Deshaciendo CM…'; msgEl.className = 'imp-sheet-msg';
  undoArea.style.display = 'none';
  try {
    var url = LIQUIDACION_ENDPOINT + '?action=import&tipo=cm&mes=' + impCMUndo.mes +
              '&valores=' + encodeURIComponent(JSON.stringify(impCMUndo.data));
    var data = await (await fetch(authURL(url))).json();
    if (data.ok) {
      msgEl.textContent = '✓ CM deshecho'; msgEl.className = 'imp-sheet-msg imp-ok';
      impCMUndo = { tipo:null, mes:null, data:null };
    } else {
      msgEl.textContent = '✗ ' + (data.error||'Error al deshacer');
      msgEl.className = 'imp-sheet-msg imp-err';
      undoArea.style.display = 'block';
    }
  } catch(err) { msgEl.textContent='✗ '+err.message; msgEl.className='imp-sheet-msg imp-err'; undoArea.style.display='block'; }
}

async function deshacerImport() {
  if (!impUndo.tipo) return;
  var msgEl    = document.getElementById('impSheetMsg');
  var undoArea = document.getElementById('impUndoArea');
  msgEl.textContent = 'Deshaciendo…';
  msgEl.className   = 'imp-sheet-msg';
  undoArea.style.display = 'none';
  try {
    var url = LIQUIDACION_ENDPOINT + '?action=import&tipo=' + impUndo.tipo + '&mes=' + impUndo.mes;
    if (impUndo.tipo === 'dist') {
      url += '&cheques=' + encodeURIComponent(JSON.stringify(impUndo.data));
    } else {
      url += '&valores=' + encodeURIComponent(JSON.stringify(impUndo.data));
    }
    var resp = await fetch(authURL(url));
    var data = await resp.json();
    if (data.ok) {
      msgEl.textContent = '✓ Deshecho — valores anteriores restaurados';
      msgEl.className   = 'imp-sheet-msg imp-ok';
      impUndo = { tipo: null, mes: null, data: null };
    } else {
      msgEl.textContent = '✗ Error al deshacer: ' + (data.error || '');
      msgEl.className   = 'imp-sheet-msg imp-err';
      undoArea.style.display = 'block';
    }
  } catch(err) {
    msgEl.textContent = '✗ ' + err.message;
    msgEl.className   = 'imp-sheet-msg imp-err';
    undoArea.style.display = 'block';
  }
}

