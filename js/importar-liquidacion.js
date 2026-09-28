// importar-liquidacion.js — extraído de index.html. Modal de importación
// de liquidación (parseo de Excel/CSV pegado, MAPE_MAP, validación,
// preview y guardado). Solo definiciones.

// ══════ IMPORTAR LIQUIDACIÓN ════════════════════════════════════

// GARMENDIA se suma como socia desde agosto 2026 (ver [[project_ceot_garmendia]]) —
// mismo tratamiento que el resto para OSDE/Diferidos y reparto de cheques Colón.
const SOCIOS_IMP = ['BRUNI','CORELICH','DE LA COLINA','DEGANUTTI','LABAYEN',
                    'LEON','MAZZOLA','PERLASCO','SOULE','TRIVELLINI','GARMENDIA'];

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
var impCeotAyudantiaOsde = 0, impCeotAyudantiaDif = 0, impCeotAyudantiaDetalle = [], impCeotAyudantiaSinEspDetalle = [];

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
  gastosExtraDefaultCargar();
}

// ══════ OTROS GASTOS DEL MES (plantillas de reparto, persistentes) ══════
// Reemplaza los campos sueltos que había antes (Equipo laparoscopia
// hardcodeado a 3 socios en el código) por una lista editable de "gastos"
// — cada uno con su concepto y a qué profesional(es) le corresponde — que
// se guarda una sola vez y se reusa todos los meses. Solo el IMPORTE de
// cada uno se tipea de nuevo cada mes (como el cheque OSDE o los de Colón);
// el reparto en sí queda resuelto sin tener que acordarse de nada.
// Persistencia: mismo mecanismo que TRANSF_FAM_DEFAULT (localStorage +
// syncPull/syncPush contra el Sheet compartido, no algo por-navegador).
var GASTOS_EXTRA_DEFAULT = [
  { id: 'storz-compra', concepto: 'Storz — compra equipo de laparoscopia', socios: ['CORELICH','TRIVELLINI','DEGANUTTI'] },
  { id: 'storz-torre',  concepto: 'Storz — gasto torre laparoscópica',      socios: ['CORELICH','TRIVELLINI','DEGANUTTI'] }
];
var _gastosExtraCargado = false; // false = todavía no se confirmó si hay algo guardado (local o remoto); mientras tanto se muestra la plantilla de arranque de arriba, sin persistirla

function gastosExtraDefaultCargar() {
  try {
    var raw = localStorage.getItem('ceot_gastos_extra_default');
    if (raw) { GASTOS_EXTRA_DEFAULT = JSON.parse(raw) || []; _gastosExtraCargado = true; }
  } catch (e) {}
  gastosExtraRenderLista();
  syncPull('ceot_gastos_extra_default', function() {
    gastosExtraDefaultCargar();
  });
}

function gastosExtraDefaultGuardarTodo() {
  _gastosExtraCargado = true;
  localStorage.setItem('ceot_gastos_extra_default', JSON.stringify(GASTOS_EXTRA_DEFAULT));
  syncPush('ceot_gastos_extra_default');
}

function gastosExtraRenderLista() {
  var wrap = document.getElementById('impGastosExtraList');
  if (!wrap) return;
  if (!GASTOS_EXTRA_DEFAULT.length) {
    wrap.innerHTML = '<div style="font-size:.72rem;color:rgba(32,36,31,.45);font-style:italic;padding:4px 0">Todavía no hay ningún gasto configurado — agregá el primero abajo.</div>';
    return;
  }
  wrap.innerHTML = GASTOS_EXTRA_DEFAULT.map(function(g) {
    return '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px">'
      + '<div style="flex:1;min-width:0">'
      +   '<div style="font-weight:600;font-size:.82rem">' + escAttr(g.concepto) + '</div>'
      +   '<div style="font-size:.65rem;color:rgba(32,36,31,.5)">' + (g.socios || []).join(' / ') + '</div>'
      +   '<a href="javascript:void(0)" onclick="gastosExtraAbrirFormEditar(\'' + g.id + '\')" style="font-size:.62rem;color:#1f3a2e;text-decoration:underline;margin-right:8px">editar</a>'
      +   '<a href="javascript:void(0)" onclick="gastosExtraQuitar(\'' + g.id + '\')" style="font-size:.62rem;color:#b13a2c;text-decoration:underline">borrar</a>'
      + '</div>'
      + '<input type="text" id="impGastoExtra_' + g.id + '" class="imp-colon-input" placeholder="Importe $ este mes" style="max-width:140px;flex-shrink:0">'
      + '</div>';
  }).join('');
}

var _gastosExtraEditId = null;

function gastosExtraAbrirFormNuevo() {
  _gastosExtraEditId = null;
  document.getElementById('gexForm_concepto').value = '';
  gastosExtraRenderChecksSocios([]);
  document.getElementById('impGastosExtraForm').style.display = 'block';
}

function gastosExtraAbrirFormEditar(id) {
  var g = GASTOS_EXTRA_DEFAULT.filter(function(x){ return x.id === id; })[0];
  if (!g) return;
  _gastosExtraEditId = id;
  document.getElementById('gexForm_concepto').value = g.concepto;
  gastosExtraRenderChecksSocios(g.socios || []);
  document.getElementById('impGastosExtraForm').style.display = 'block';
}

function gastosExtraCerrarForm() {
  document.getElementById('impGastosExtraForm').style.display = 'none';
  _gastosExtraEditId = null;
}

function gastosExtraRenderChecksSocios(marcados) {
  var wrap = document.getElementById('gexForm_socios');
  wrap.innerHTML = SOCIOS_IMP.map(function(k) {
    var checked = marcados.indexOf(k) !== -1;
    return '<label style="display:inline-flex;align-items:center;gap:4px;background:rgba(32,36,31,.05);border:1px solid rgba(32,36,31,.15);border-radius:6px;padding:4px 8px;font-size:.72rem;cursor:pointer">'
      + '<input type="checkbox" value="' + k + '"' + (checked ? ' checked' : '') + '> ' + k
      + '</label>';
  }).join('');
}

function gastosExtraGuardarForm() {
  var concepto = document.getElementById('gexForm_concepto').value.trim();
  if (!concepto) { alert('Ponele un concepto a este gasto.'); return; }
  var socios = [];
  document.querySelectorAll('#gexForm_socios input[type=checkbox]:checked').forEach(function(chk) { socios.push(chk.value); });
  if (!socios.length) { alert('Elegí a qué profesional(es) le corresponde.'); return; }

  if (_gastosExtraEditId) {
    var g = GASTOS_EXTRA_DEFAULT.filter(function(x){ return x.id === _gastosExtraEditId; })[0];
    if (g) { g.concepto = concepto; g.socios = socios; }
  } else {
    var id = 'gex-' + Date.now();
    GASTOS_EXTRA_DEFAULT.push({ id: id, concepto: concepto, socios: socios });
  }
  gastosExtraDefaultGuardarTodo();
  gastosExtraRenderLista();
  gastosExtraCerrarForm();
}

function gastosExtraQuitar(id) {
  var g = GASTOS_EXTRA_DEFAULT.filter(function(x){ return x.id === id; })[0];
  if (!g) return;
  if (!confirm('¿Borrar "' + g.concepto + '" de la lista de gastos? (no afecta meses ya cargados al Sheet)')) return;
  GASTOS_EXTRA_DEFAULT = GASTOS_EXTRA_DEFAULT.filter(function(x){ return x.id !== id; });
  gastosExtraDefaultGuardarTodo();
  gastosExtraRenderLista();
}

// ══════ GASTO DE EQUIPOS (Storz) — historial Gasto vs. Recuperado ══════
// Pedido de Marcelo, 24/09/2026: hoy el gasto (Storz compra + torre, ver
// GASTOS_EXTRA_DEFAULT) y lo recuperado en honorarios (GAS.EQUIPO, ver
// billingDesdeRegistros) se calculan cada mes al importar, pero no quedan
// guardados en ningún lado — se usan una vez para el reparto y se pierden.
// Este historial guarda ambos montos por período (persistente, como
// TRANSF_FAM) para poder ver mes a mes cuánto se gastó en equipamiento de
// Deganutti/Trivellini/Corelich contra cuánto se recuperó vía honorarios.
// Se completa solo al correr el import (ver el final de
// procesarArchivosImport), pero también se puede cargar/corregir un mes a
// mano desde el acordeón "Gasto de Equipos" (por si falta un mes viejo).
var GASTO_EQUIPO_HIST = {};
function gastoEquipoCargar() {
  try {
    var raw = localStorage.getItem('ceot_gasto_equipo_hist');
    GASTO_EQUIPO_HIST = raw ? (JSON.parse(raw) || {}) : {};
  } catch (e) { GASTO_EQUIPO_HIST = {}; }
  syncPull('ceot_gasto_equipo_hist', function() {
    gastoEquipoCargar();
    var el = document.getElementById('gastoEquipoBody');
    if (el) el.innerHTML = gastoEquipoSectionHtml();
  });
}
function gastoEquipoGuardarTodo() {
  localStorage.setItem('ceot_gasto_equipo_hist', JSON.stringify(GASTO_EQUIPO_HIST));
  syncPush('ceot_gasto_equipo_hist');
}
// datos: { gasto, gastoDetalle:[{concepto,importe}], recuperadoOsde, recuperadoDif }
function gastoEquipoGuardarMes(periodo, datos) {
  if (!periodo) return;
  GASTO_EQUIPO_HIST[periodo] = {
    gasto: datos.gasto || 0,
    gastoDetalle: datos.gastoDetalle || [],
    recuperadoOsde: datos.recuperadoOsde || 0,
    recuperadoDif: datos.recuperadoDif || 0
  };
  gastoEquipoGuardarTodo();
}

function gastoEquipoSectionHtml() {
  var periodos = Object.keys(GASTO_EQUIPO_HIST).sort(function(a, b) {
    return MESES_IMP_ORD.indexOf(a) - MESES_IMP_ORD.indexOf(b);
  });
  var filas = '', totGasto = 0, totRecup = 0;
  periodos.forEach(function(p) {
    var e = GASTO_EQUIPO_HIST[p];
    var recup = (e.recuperadoOsde || 0) + (e.recuperadoDif || 0);
    var dif = recup - (e.gasto || 0);
    totGasto += (e.gasto || 0); totRecup += recup;
    var pEsc = p.replace(/'/g, "\\'");
    filas += '<tr>'
      + '<td style="text-transform:capitalize">' + p + '</td>'
      + '<td class="ipt-num">' + fmtImp(e.gasto || 0) + '</td>'
      + '<td class="ipt-num">' + fmtImp(recup) + '</td>'
      + '<td class="ipt-num" style="font-weight:700;' + (dif < 0 ? 'color:#b13a2c' : 'color:#16a34a') + '">' + fmtImp(dif) + '</td>'
      + '<td><a href="javascript:void(0)" onclick="gastoEquipoAbrirForm(\'' + pEsc + '\')" style="font-size:.68rem;color:#1f3a2e;text-decoration:underline">editar</a></td>'
      + '</tr>';
  });
  var difTotal = totRecup - totGasto;

  // Acumulado — pedido de Marcelo, 24/09/2026: quería el total acumulado
  // adelante, como número principal, no solo perdido al pie de la tabla
  // mes a mes (que queda como detalle/auditoría abajo).
  var acumHtml = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">'
    + '<div style="flex:1;min-width:120px;padding:8px 10px;background:rgba(32,36,31,.05);border-radius:8px">'
    +   '<div style="font-size:.62rem;color:rgba(32,36,31,.5);text-transform:uppercase;letter-spacing:.03em">Gasto acumulado</div>'
    +   '<div style="font-size:1.05rem;font-weight:800">' + fmtImp(totGasto) + '</div></div>'
    + '<div style="flex:1;min-width:120px;padding:8px 10px;background:rgba(32,36,31,.05);border-radius:8px">'
    +   '<div style="font-size:.62rem;color:rgba(32,36,31,.5);text-transform:uppercase;letter-spacing:.03em">Recuperado acumulado</div>'
    +   '<div style="font-size:1.05rem;font-weight:800">' + fmtImp(totRecup) + '</div></div>'
    + '<div style="flex:1;min-width:120px;padding:8px 10px;background:' + (difTotal < 0 ? 'rgba(177,58,44,.1)' : 'rgba(22,163,74,.1)') + ';border-radius:8px">'
    +   '<div style="font-size:.62rem;color:rgba(32,36,31,.5);text-transform:uppercase;letter-spacing:.03em">Diferencia acumulada</div>'
    +   '<div style="font-size:1.05rem;font-weight:800;' + (difTotal < 0 ? 'color:#b13a2c' : 'color:#16a34a') + '">' + fmtImp(difTotal) + '</div></div>'
    + '</div>';

  var tablaHtml = periodos.length
    ? '<details style="margin-top:2px"><summary style="cursor:pointer;font-size:.68rem;color:rgba(32,36,31,.55);margin-bottom:6px">Ver detalle mes a mes</summary>'
      + '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>'
      + '<th style="text-align:left">Período</th><th>Gasto</th><th>Recuperado</th><th>Diferencia</th><th></th>'
      + '</tr></thead><tbody>' + filas + '</tbody></table></div></details>'
    : '<div style="font-size:.72rem;color:rgba(32,36,31,.45);font-style:italic;padding:6px 0">Todavía no hay ningún mes registrado — se completa solo al correr el import, o cargalo a mano abajo.</div>';

  var mesOpts = MESES_IMP_ORD.map(function(m) {
    return '<option value="' + m + '">' + m.charAt(0).toUpperCase() + m.slice(1) + '</option>';
  }).join('');

  return '<div style="font-size:.65rem;color:rgba(32,36,31,.5);margin-bottom:8px">'
    + 'Gasto = Storz compra + torre laparoscópica (ver "Otros gastos del mes" del importador). Recuperado = honorarios facturados '
    + 'como GAS.EQUIPO ese mes (bruto). Ambos son de ' + GASEQ_SOCIOS_CEOT.join(' / ') + '.</div>'
    + acumHtml
    + tablaHtml
    + '<div id="gastoEquipoForm" style="display:none;margin-top:10px;padding:8px;border:1px dashed rgba(32,36,31,.3);border-radius:6px">'
    +   '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
    +     '<select id="geFormMes" class="imp-select" style="width:auto">' + mesOpts + '</select>'
    +     '<input type="text" inputmode="decimal" id="geFormGasto" placeholder="Gasto $" style="width:110px;font-size:.75rem;padding:5px 7px;border:1px solid rgba(32,36,31,.2);border-radius:4px">'
    +     '<input type="text" inputmode="decimal" id="geFormRecuperado" placeholder="Recuperado $" style="width:120px;font-size:.75rem;padding:5px 7px;border:1px solid rgba(32,36,31,.2);border-radius:4px">'
    +     '<button type="button" onclick="gastoEquipoGuardarForm()" style="font-size:.7rem;padding:5px 10px;border:none;border-radius:4px;background:#1f3a2e;color:#fff;cursor:pointer">Guardar</button>'
    +     '<button type="button" onclick="gastoEquipoCerrarForm()" style="font-size:.7rem;padding:5px 10px;border:1px solid rgba(32,36,31,.25);border-radius:4px;background:none;cursor:pointer">Cancelar</button>'
    +   '</div>'
    + '</div>'
    + '<button type="button" onclick="gastoEquipoAbrirForm()" style="margin-top:8px;font-size:.68rem;padding:4px 10px;border:1px dashed rgba(32,36,31,.3);background:none;border-radius:5px;cursor:pointer;color:rgba(32,36,31,.55)">+ cargar/corregir un mes a mano</button>';
}

function gastoEquipoAbrirForm(periodo) {
  document.getElementById('gastoEquipoForm').style.display = 'block';
  var e = periodo ? GASTO_EQUIPO_HIST[periodo] : null;
  document.getElementById('geFormMes').value = periodo || MESES_IMP_ORD[new Date().getMonth()];
  document.getElementById('geFormGasto').value = e ? e.gasto : '';
  document.getElementById('geFormRecuperado').value = e ? ((e.recuperadoOsde || 0) + (e.recuperadoDif || 0)) : '';
}
function gastoEquipoCerrarForm() {
  document.getElementById('gastoEquipoForm').style.display = 'none';
}
function gastoEquipoGuardarForm() {
  var periodo = document.getElementById('geFormMes').value;
  var gasto = parsearMontoImp(document.getElementById('geFormGasto').value) || 0;
  var recuperado = parsearMontoImp(document.getElementById('geFormRecuperado').value) || 0;
  // Carga manual: el detalle/desglose OSDE-Diferidos no aplica, todo va a
  // "recuperadoDif" (columna Recuperado suma igual los dos campos).
  gastoEquipoGuardarMes(periodo, { gasto: gasto, gastoDetalle: [], recuperadoOsde: 0, recuperadoDif: recuperado });
  gastoEquipoCerrarForm();
  var el = document.getElementById('gastoEquipoBody');
  if (el) el.innerHTML = gastoEquipoSectionHtml();
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
    'MAZZOLA':'MAZZOLA','PERLASCO':'PERLASCO','SOULE':'SOULE','TRIVELLINI':'TRIVELLINI',
    'GARMENDIA':'GARMENDIA'
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

// ── CEOT (crudo ART .xlsx, o .txt de Colón "Liquidación a Profesionales") ──
// Las dos fuentes son el MISMO reporte de la ART: el .xlsx trae columnas
// separadas, el .txt es la versión impresa de ancho fijo (offsets verificados
// contra el reporte real). `leerRegistrosCeot` normaliza cualquiera de las dos
// a la misma forma de "registro" — así el cálculo de OSDE/Diferidos y la
// extracción de Débitos corren con un solo código, sin importar el formato.
async function leerRegistrosCeot(file) {
  if (/\.txt$/i.test(file.name)) {
    var texto = await leerTextoArchivo(file);
    return registrosDesdeTXT(texto);
  }
  var rows = await leerXLSX(file);
  return registrosDesdeXLSXCrudo(rows);
}

var reDatoTXTCeot    = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/;                    // TMOV CUEN S NRO-F.MOV
var reImporteTXTCeot = /(-?[\d.]+,\d{2})\s+[A-Z-]\s+[A-Z]\s+(\d{6})\s+(\d{6})/; // IMPORTE .. F.PERIO P.PERIO

function registroDesdeLineaTXTCeot(l) {
  var md = reDatoTXTCeot.exec(l);
  if (!md) return null;
  var mi = reImporteTXTCeot.exec(l);
  if (!mi) return null;
  var importe = parseFloat(mi[1].replace(/\./g, '').replace(',', '.'));
  if (!importe) return null;
  var practicaRaw = l.length >= 134 ? l.slice(83, 134).trim() : '';
  var profRaw     = l.length >= 185 ? l.slice(138, 185).trim() : '';
  var pacRaw      = l.length >= 246 ? l.slice(185, 246).trim() : '';
  var pacM        = pacRaw.match(/^(\d+)\s+(.*)$/);
  return {
    tmov: md[1], factura: md[3] + '-' + md[4],       // talón-nro (el nro solo no es único)
    fPerio: mi[2], pPerio: mi[3],
    nprest: l.length >= 74  ? l.slice(67, 74).trim()  : '',
    os:     l.length >= 83  ? l.slice(74, 83).trim()  : '',
    practicaCod: (practicaRaw.match(/^\d+/) || [''])[0],
    practicaDesc: practicaRaw.replace(/^\d+\s*/, '').trim(),
    rol: l.length >= 138 ? l.slice(134, 138).trim() : '',
    profNombre: profRaw.replace(/^\d+\s*/, '').trim(),
    pacienteDni: pacM ? pacM[1] : '', pacienteNombre: pacM ? pacM[2].trim() : pacRaw,
    obs: l.length >= 246 ? l.slice(246).trim().toUpperCase() : '',
    importe: importe
  };
}

function registrosDesdeTXT(text) {
  var out = [];
  String(text || '').split(/\r?\n/).forEach(function(l) {
    var reg = registroDesdeLineaTXTCeot(l);
    if (reg) out.push(reg);
  });
  return out;
}

// XLSX crudo ART: mismas columnas que el .txt, pero separadas y con headers —
// se detectan por NOMBRE (no posición fija), robusto a que la ART reordene columnas.
function registrosDesdeXLSXCrudo(rows) {
  if (!rows.length) throw new Error('Archivo vacío.');
  var headers = rows[0].map(function(h){ return String(h || '').replace(/\s+/g,'').toUpperCase(); });
  var idxOf = function(needle) {
    for (var i = 0; i < headers.length; i++) if (headers[i] && headers[i].indexOf(needle) !== -1) return i;
    return -1;
  };
  var iImp = idxOf('IMPORTE'), iInst = idxOf('INST.'), iProfNom = idxOf('.Q.REALIZA'), iObs = idxOf('OBSERVACIONES');
  if (iImp === -1 || iInst === -1 || iProfNom === -1 || iObs === -1) {
    throw new Error('No reconozco las columnas de este archivo (falta IMPORTE, INST., PROF/.Q.REALIZA u OBSERVACIONES). ¿Es el formato crudo de la ART?');
  }
  var iTmov = idxOf('TMOV'), iFactura = idxOf('NROF.MOV'), iFPerio = idxOf('F.PERIO'), iPPerio = idxOf('P.PERIO'),
      iNprest = idxOf('NPREST'), iPracti = idxOf('PRACTI'), iCA = idxOf('CA'), iRol = idxOf('ROL'),
      iPac = idxOf('PACIENTE'), iPacNom = idxOf('NOMBREYAPELLIDO');

  var out = [];
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row || !row.length) continue;
    var imp = typeof row[iImp] === 'number' ? row[iImp] : parsearMontoImp(row[iImp]);
    if (!imp) continue;
    var facturaRaw = iFactura !== -1 ? String(row[iFactura] || '').trim().split(/\s+/) : [];
    out.push({
      tmov: iTmov !== -1 ? String(row[iTmov] || '').trim() : '',
      factura: facturaRaw.length === 2 ? facturaRaw.join('-') : '',
      fPerio: iFPerio !== -1 ? String(row[iFPerio] || '').trim() : '',
      pPerio: iPPerio !== -1 ? String(row[iPPerio] || '').trim() : '',
      nprest: iNprest !== -1 ? String(row[iNprest] || '').trim() : '',
      os: String(row[iInst] || '').trim(),
      practicaCod: iPracti !== -1 ? String(row[iPracti] || '').trim() : '',
      practicaDesc: iCA !== -1 ? String(row[iCA] || '').trim() : '',
      rol: iRol !== -1 ? String(row[iRol] || '').trim() : '',
      profNombre: String(row[iProfNom] || '').trim(),
      pacienteDni: iPac !== -1 ? String(row[iPac] || '').trim() : '',
      pacienteNombre: iPacNom !== -1 ? String(row[iPacNom] || '').trim() : '',
      obs: String(row[iObs] || '').trim().toUpperCase(),
      importe: imp
    });
  }
  return out;
}

// ── OSDE/Diferidos por profesional, a partir de "registros" (xlsx o txt, mismo código) ──
// GAS.EQUIPO cargado a alguien fuera de Trivellini/Corelich/Deganutti se reparte
// en 3 partes iguales entre esos 3.
var GASEQ_SOCIOS_CEOT = ['TRIVELLINI', 'CORELICH', 'DEGANUTTI'];

// Ayudantía cruzada: si el AY2 de una práctica es uno de estos 4 y el ESP **o
// AY1** de esa MISMA práctica (misma factura + paciente — NPREST es el código
// de la prestación, no un ID único de la cirugía, así que 2 pacientes
// distintos con la misma práctica en la misma facturación podrían
// compartirlo) es del "equipo" contrario, ese importe no se le paga al AY2 —
// queda acreditado al fondo de CEOT en vez de a su propia cuenta. Si el
// responsable (ESP o AY1) es del mismo equipo que el AY2 (ej. BRUNI/DE LA
// COLINA), o ninguno de los 2 roles es de los 4, el importe sigue normal.
var AYUD_CRUZADA_A = ['BRUNI', 'DE LA COLINA'];
var AYUD_CRUZADA_B = ['GARMENDIA', 'PERLASCO'];

// factura + DNI (o nombre si no hay DNI) del paciente — misma práctica que se
// usa para emparejar AY2 contra ESP/AY1, evita depender de NPREST.
function ayudPacienteKey(reg) {
  var dni = String(reg.pacienteDni || '').trim();
  if (dni) return reg.factura + '|dni:' + dni;
  return reg.factura + '|nom:' + String(reg.pacienteNombre || '').trim().toUpperCase();
}

function billingDesdeRegistros(registros) {
  var osdeBill = {}, difBill = {};
  SOCIOS_IMP.forEach(function(k){ osdeBill[k] = 0; difBill[k] = 0; });
  var gasEqAjenoOsde = 0, gasEqAjenoDif = 0;
  // GAS.EQUIPO que ya viene tageado a uno de los 3 (no se redistribuye, se
  // suma normal a su facturación) — se separa acá SOLO para el reporte de
  // Gasto vs. Recuperado por equipos (ver gastoEquipoSectionHtml), no cambia
  // en nada el cálculo de osdeBill/difBill de abajo.
  var gasEqPropioOsde = 0, gasEqPropioDif = 0;
  var ceotAyudantiaOsde = 0, ceotAyudantiaDif = 0, ceotAyudantiaDetalle = [];
  var ceotAyudantiaSinEspDetalle = [];

  // Mapa factura|paciente → apellidos normalizados de ESP y AY1 de esa
  // práctica (puede haber más de uno), para cruzarlos contra cada AY2 del
  // mismo paciente/factura sin importar cuál de los 2 roles ocupe el rival.
  var responsablesPorPractica = {};
  registros.forEach(function(reg) {
    var rolReg = String(reg.rol || '').trim().toUpperCase();
    if (rolReg !== 'ESP' && rolReg !== 'AY1') return;
    if (!reg.factura || (!reg.pacienteDni && !reg.pacienteNombre)) return;
    var respKey = normDocImp(reg.profNombre);
    if (!respKey) return;
    var pk = ayudPacienteKey(reg);
    if (!responsablesPorPractica[pk]) responsablesPorPractica[pk] = [];
    if (responsablesPorPractica[pk].indexOf(respKey) === -1) responsablesPorPractica[pk].push(respKey);
  });

  registros.forEach(function(reg) {
    var imp = reg.importe;
    if (!imp) return;
    var inst = reg.os.toUpperCase();
    var obs  = reg.obs;
    var key  = normDocImp(reg.profNombre);
    if (!key) return;
    var sgn  = (obs.indexOf('DEB') !== -1 && obs.indexOf('HONORARIOS') !== -1) ? -1 : 1;

    var esAy2 = String(reg.rol || '').trim().toUpperCase() === 'AY2';
    if (esAy2 && (AYUD_CRUZADA_A.indexOf(key) !== -1 || AYUD_CRUZADA_B.indexOf(key) !== -1)) {
      var responsables = (reg.factura && (reg.pacienteDni || reg.pacienteNombre)) ? (responsablesPorPractica[ayudPacienteKey(reg)] || []) : [];
      var rivalEncontrado = null;
      var esCruce = responsables.some(function(r) {
        var cruce = (AYUD_CRUZADA_A.indexOf(key) !== -1 && AYUD_CRUZADA_B.indexOf(r) !== -1) ||
                    (AYUD_CRUZADA_B.indexOf(key) !== -1 && AYUD_CRUZADA_A.indexOf(r) !== -1);
        if (cruce) rivalEncontrado = r;
        return cruce;
      });
      if (esCruce) {
        if (inst === 'OSDE') ceotAyudantiaOsde += imp * sgn;
        else                 ceotAyudantiaDif  += imp * sgn;
        ceotAyudantiaDetalle.push({ esp: rivalEncontrado, ay2: key, importe: imp * sgn, os: inst, factura: reg.factura, paciente: reg.pacienteNombre || reg.pacienteDni || '' });
        return;
      }
      // No se encontró ESP ni AY1 para esta práctica en el archivo (puede
      // facturarse en otra factura/período) — no se puede confirmar si es
      // cruce o no, así que se paga normal (no se asume nada), pero se avisa
      // para revisar a mano.
      if (!responsables.length) {
        ceotAyudantiaSinEspDetalle.push({ ay2: key, importe: imp * sgn, os: inst, factura: reg.factura, paciente: reg.pacienteNombre || reg.pacienteDni || '' });
      }
    }

    var esGasEquipo = obs.replace(/\s+/g, '').indexOf('GAS.EQUIPO') !== -1;
    var esGasEquipoAjeno = esGasEquipo && GASEQ_SOCIOS_CEOT.indexOf(key) === -1;
    if (esGasEquipoAjeno) {
      if (inst === 'OSDE') gasEqAjenoOsde += imp * sgn;
      else                 gasEqAjenoDif  += imp * sgn;
      return;
    }
    if (esGasEquipo) {
      if (inst === 'OSDE') gasEqPropioOsde += imp * sgn;
      else                 gasEqPropioDif  += imp * sgn;
    }
    if (inst === 'OSDE') osdeBill[key] += imp * sgn;
    else                 difBill[key]  += imp * sgn;
  });
  if (gasEqAjenoOsde || gasEqAjenoDif) {
    GASEQ_SOCIOS_CEOT.forEach(function(k) {
      osdeBill[k] += gasEqAjenoOsde / 3;
      difBill[k]  += gasEqAjenoDif  / 3;
    });
  }
  return { osdeBill: osdeBill, difBill: difBill, gasEqAjenoOsde: gasEqAjenoOsde, gasEqAjenoDif: gasEqAjenoDif,
           gasEqPropioOsde: gasEqPropioOsde, gasEqPropioDif: gasEqPropioDif,
           ceotAyudantiaOsde: ceotAyudantiaOsde, ceotAyudantiaDif: ceotAyudantiaDif, ceotAyudantiaDetalle: ceotAyudantiaDetalle,
           ceotAyudantiaSinEspDetalle: ceotAyudantiaSinEspDetalle };
}

// Mensajes de Ayudantía cruzada, sin markup — se usa tanto en el preview
// (impPreviewTable, apenas se sube el archivo, como filas de tabla) como en
// el resultado final (impResultBody, con los cheques Colón ya cargados, como
// divs sueltos), para que el aviso no dependa de que Marcelo lo haya visto
// solo en el paso 1.
function ayudantiaCruzadaMensajes(osde, dif, detalle, sinEspDetalle) {
  var msgs = [];
  if (osde || dif) {
    var total = osde + dif;
    var det = (detalle || []).map(function(d) {
      return 'ESP/AY1 ' + d.esp + ' / AY2 ' + d.ay2 + ': ' + fmtImp(d.importe) + ' (' + d.os + (d.paciente ? ', ' + d.paciente : '') + ')';
    }).join('<br>');
    msgs.push({ bg: '#fee2e2', color: '#991b1b', texto: '🏛 Ayudantía cruzada acreditada a CEOT (no se paga al AY2): ' + fmtImp(total) +
      ' — OSDE ' + fmtImp(osde) + ' + Diferidos ' + fmtImp(dif) + '.<br>' + det });
  }
  if (sinEspDetalle && sinEspDetalle.length) {
    var sinEspTotal = sinEspDetalle.reduce(function(s,d){ return s + d.importe; }, 0);
    var sinEsp = sinEspDetalle.map(function(d) {
      return 'AY2 ' + d.ay2 + ': ' + fmtImp(d.importe) + ' (' + d.os + (d.paciente ? ', ' + d.paciente : '') + ', factura ' + d.factura + ')';
    }).join('<br>');
    msgs.push({ bg: '#ffedd5', color: '#9a3412', texto: '⚠ AY2 de Bruni/De la Colina/Garmendia/Perlasco sin ESP/AY1 identificable en este archivo (se pagó normal, revisar a mano si corresponde a CEOT): ' +
      fmtImp(sinEspTotal) + '.<br>' + sinEsp });
  }
  return msgs;
}
function ayudantiaCruzadaFootnoteRowsHtml(osde, dif, detalle, sinEspDetalle) {
  return ayudantiaCruzadaMensajes(osde, dif, detalle, sinEspDetalle).map(function(m) {
    return '<tr style="background:' + m.bg + '"><td colspan="4" style="padding:6px 10px;font-size:0.7rem;color:' + m.color + ';font-weight:600;">' + m.texto + '</td></tr>';
  }).join('');
}
function ayudantiaCruzadaFootnoteDivHtml(osde, dif, detalle, sinEspDetalle) {
  return ayudantiaCruzadaMensajes(osde, dif, detalle, sinEspDetalle).map(function(m) {
    return '<div style="font-size:.65rem;color:' + m.color + ';padding:6px 8px;margin-top:6px;background:' + m.bg + ';border-radius:6px;font-weight:600">' + m.texto + '</div>';
  }).join('');
}

// ── Fondo CEOT — Ayudantía cruzada: registro acumulado por período ──
// Cada vez que se importa una liquidación y se detecta al menos un cruce (o un
// caso sin ESP/AY1 identificable), se guarda acá — mismo mecanismo que
// GASTOS_EXTRA_DEFAULT (localStorage + syncPull/syncPush, visible en
// cualquier dispositivo). Reimportar el mismo período reemplaza su entrada
// entera (idempotente), no la suma dos veces.
var CEOT_AYUD_CRUZADA = {};
var _ceotAyudPulled = false;
function ceotAyudCruzadaCargar(onDone) {
  try {
    var raw = localStorage.getItem('ceot_ayud_cruzada');
    if (raw) CEOT_AYUD_CRUZADA = JSON.parse(raw) || {};
  } catch (e) {}
  if (onDone) onDone();
  if (!_ceotAyudPulled) {
    _ceotAyudPulled = true;
    syncPull('ceot_ayud_cruzada', function() { ceotAyudCruzadaCargar(onDone); });
  }
}
// Total acumulado histórico de todos los períodos — usado tanto en el panel
// admin (detalle completo) como en la home del portal profesional (solo el
// número, sin desglose por profesional/práctica).
function ceotAyudCruzadaTotal() {
  return Object.keys(CEOT_AYUD_CRUZADA).reduce(function(s, p) {
    var e = CEOT_AYUD_CRUZADA[p] || {};
    return s + (e.osde || 0) + (e.dif || 0);
  }, 0);
}
function ceotAyudCruzadaGuardarPeriodo(periodoKey, entry) {
  if (!periodoKey) return;
  CEOT_AYUD_CRUZADA[periodoKey] = entry;
  try { localStorage.setItem('ceot_ayud_cruzada', JSON.stringify(CEOT_AYUD_CRUZADA)); } catch (e) {}
  syncPush('ceot_ayud_cruzada');
}

// ── Débitos, a partir de "registros" (xlsx o txt, mismo código) ──
// Levanta SOLO las filas DEB. HONORARIOS / DEB. GASTOS (TMOV 34), saltea
// consultas y débitos <= $50.000, y agrupa por (talón-factura, nprest)
// colapsando roles (ESP/AY1/AY2). Devuelve ítems con el shape que consume la
// pestaña Débitos (renderDebitos modo import) y el auditor NUN.
var DEB_MIN_IMPORTE = 50000;
var DEB_OS_LABEL = {
  'U.PERSON': 'Unión Personal', 'PROV.ART': 'Provincia ART', 'MEDIFEAS': 'Medifé',
  'PREVENCI': 'Prevención Salud', 'SWISS ME': 'Swiss Medical', 'SANCORME': 'Sancor Salud'
};
var DEB_MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var reConsultaDeb = /CONSULTA|ATENCION\s+MEDICA/i;

function extraerDebitosDeRegistros(registros) {
  var grupos = {};
  registros.forEach(function(reg) {
    if (reg.obs.indexOf('DEB') === -1) return;      // solo DEB. HONORARIOS / DEB. GASTOS
    if (reg.tmov !== '34') return;                  // TMOV 34 = movimiento de débito/ajuste
    if (!reg.importe) return;
    if (reConsultaDeb.test(reg.practicaDesc)) return; // sin consultas
    if (!reg.factura || !reg.nprest) return;         // sin clave de agrupación, no se puede armar el grupo

    var k = reg.factura + '|' + reg.nprest;
    if (!grupos[k]) {
      var cplx = (reg.practicaDesc.match(/NUN[- ]*COMPLEJIDAD\s*(\d+)/i) || [])[1];
      grupos[k] = {
        fact: reg.factura, nprest: reg.nprest,
        periodo: debFmtPeriodo(reg.pPerio), periodoFact: debFmtPeriodo(reg.fPerio), pperioRaw: reg.pPerio,
        os: DEB_OS_LABEL[reg.os] || reg.os,
        prac: reg.practicaDesc, practicaCod: reg.practicaCod,
        complejidadNUN: cplx ? parseInt(cplx, 10) : null,
        dni: reg.pacienteDni, paciente: reg.pacienteNombre,
        prof: '', roles: {}, tipo: 'GAS', fuente: 'colon'
      };
    }
    var g = grupos[k];
    g.roles[reg.rol || '—'] = (g.roles[reg.rol || '—'] || 0) + reg.importe;
    if (reg.obs.indexOf('HONORARIOS') !== -1) g.tipo = 'HON';
    if (reg.rol === 'ESP' || !g.prof) g.prof = reg.profNombre;
  });

  var out = [];
  Object.keys(grupos).forEach(function(k) {
    var g = grupos[k];
    g.imp = Object.keys(g.roles).reduce(function(s, r) { return s + g.roles[r]; }, 0);
    if (g.imp <= DEB_MIN_IMPORTE) return;
    g.rol = Object.keys(g.roles).join('+');
    g.rolesDetalle = g.roles;
    delete g.roles;
    out.push(g);
  });
  out.sort(function(a, b) { return b.imp - a.imp; });
  return out;
}

// Guarda los débitos importados como un período de la pestaña Débitos
// (mismo mecanismo que debGuardarImport: deb_imp_<key> + deb_guardados).
// periodoHint (ej. "julio-2026") ancla la key al mes de liquidación que eligió
// el usuario; si no viene, se infiere del P.PERIO más frecuente.
function guardarDebitosImportados(items, periodoHint) {
  if (!items || !items.length) return { n: 0 };
  var periodoKey = (periodoHint || '').trim().toLowerCase();
  if (!/^[a-zñ]+-\d{4}$/.test(periodoKey)) {
    var cuenta = {};
    items.forEach(function(it) {
      var m = String(it.pperioRaw || '').match(/^(\d{4})(\d{2})$/);
      var key = m ? (DEB_MESES[parseInt(m[2], 10) - 1] + '-' + m[1]) : 'sin-periodo';
      cuenta[key] = (cuenta[key] || 0) + 1;
    });
    periodoKey = Object.keys(cuenta).sort(function(a, b) { return cuenta[b] - cuenta[a]; })[0];
  }
  try {
    localStorage.setItem('deb_imp_' + periodoKey, JSON.stringify(items));
    var guard = [];
    try { guard = JSON.parse(localStorage.getItem('deb_guardados') || '[]'); } catch (e) {}
    if (guard.indexOf(periodoKey) === -1) { guard.unshift(periodoKey); localStorage.setItem('deb_guardados', JSON.stringify(guard)); }
  } catch (e) { return { n: 0, error: e.message }; }
  var total = items.reduce(function(s, it) { return s + (it.imp || 0); }, 0);
  return { n: items.length, periodoKey: periodoKey, total: total };
}

async function leerTextoArchivo(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(ev) { resolve(ev.target.result); };
    reader.onerror = function() { reject(new Error('No se pudo leer el archivo')); };
    reader.readAsText(file, 'ISO-8859-1');
  });
}

async function leerXLSX(file) {
  return new Promise(function(resolve, reject) {
    var esCSV = /\.csv$/i.test(file.name);
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var wb = esCSV
          ? XLSX.read(ev.target.result, { type: 'string' })
          : XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header:1, raw:true }));
      } catch(e) { reject(e); }
    };
    reader.onerror = function() { reject(new Error('No se pudo leer el archivo')); };
    if (esCSV) reader.readAsText(file, 'UTF-8');
    else       reader.readAsArrayBuffer(file);
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
  if (!fileCEOT) { mostrarImpError('Seleccioná el archivo CEOT.xlsx'); return false; }
  var btn = document.getElementById('btnProcesarArchivos');
  btn.textContent = 'Procesando…'; btn.disabled = true;
  document.getElementById('impError').style.display = 'none';
  var ok = false;

  try {
    // ── CEOT: crudo ART (.xlsx) o .txt de Colón — se normalizan los dos a
    // "registros" con el mismo shape, así el cálculo de OSDE/Diferidos y la
    // extracción de Débitos corren igual sin importar qué formato subió Marcelo.
    var registros = await leerRegistrosCeot(fileCEOT);
    if (!registros.length) throw new Error('Archivo vacío o sin filas reconocibles.');

    var bill = billingDesdeRegistros(registros);
    var osdeBill = bill.osdeBill, difBill = bill.difBill;
    var gasEqAjenoOsde = bill.gasEqAjenoOsde, gasEqAjenoDif = bill.gasEqAjenoDif;
    var ceotAyudantiaOsde = bill.ceotAyudantiaOsde, ceotAyudantiaDif = bill.ceotAyudantiaDif, ceotAyudantiaDetalle = bill.ceotAyudantiaDetalle;
    var ceotAyudantiaSinEspDetalle = bill.ceotAyudantiaSinEspDetalle;
    var GASEQ_SOCIOS = GASEQ_SOCIOS_CEOT;

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

    // Período detectado del archivo — se usa tanto para Débitos como para el
    // Fondo CEOT de Ayudantía cruzada (independiente de si hay débitos o no).
    // El pPerio de cada registro es el período de ACREDITACIÓN de esa línea
    // puntual (Colón deposita ~2 meses después de lo facturado), no el mes
    // que representa el archivo — por eso el mes elegido en el selector
    // (impMes) manda siempre que esté cargado; el pPerio solo es un
    // fallback aproximado (por mayoría, no el primero que aparece).
    var mesSel = document.getElementById('impMes');
    var regConPeriodo = registros.find(function(r) { return /^\d{6}$/.test(r.pPerio); });
    var yr = regConPeriodo ? regConPeriodo.pPerio.slice(0, 4) : String(new Date().getFullYear());
    var periodoHint = mesSel && mesSel.value ? (mesSel.value + '-' + yr) : '';
    var periodoKeyArchivo = periodoHint;
    if (!/^[a-zñ]+-\d{4}$/i.test(periodoKeyArchivo)) {
      var cuentaPPerio = {};
      registros.forEach(function(r) {
        if (/^\d{6}$/.test(r.pPerio)) cuentaPPerio[r.pPerio] = (cuentaPPerio[r.pPerio] || 0) + 1;
      });
      var pPerioMasComun = Object.keys(cuentaPPerio).sort(function(a,b){ return cuentaPPerio[b]-cuentaPPerio[a]; })[0];
      periodoKeyArchivo = pPerioMasComun ? (DEB_MESES[parseInt(pPerioMasComun.slice(4,6),10)-1] + '-' + pPerioMasComun.slice(0,4)) : '';
    } else {
      periodoKeyArchivo = periodoKeyArchivo.toLowerCase();
    }

    // ── Débitos > $50k (excl. consultas) → pestaña Débitos.
    // Corre para cualquiera de los 2 formatos (antes solo para .txt) — el
    // xlsx crudo ART tiene las mismas columnas, solo separadas en vez de en texto.
    // Va aislado: si algo falla acá, no rompe el cálculo de cheques.
    var debMsgEl = document.getElementById('impDebitosMsg');
    if (debMsgEl) { debMsgEl.style.display = 'none'; debMsgEl.textContent = ''; }
    try {
      var debs   = extraerDebitosDeRegistros(registros);
      var resDeb = guardarDebitosImportados(debs, periodoHint);
      if (debMsgEl && resDeb.n) {
        debMsgEl.style.display = 'block';
        debMsgEl.textContent = '🩺 ' + resDeb.n + ' débito(s) > $50.000 (' + fmtImp(resDeb.total) +
          ') cargados a la pestaña Débitos — período «' + resDeb.periodoKey + '». Abrilos ahí para analizarlos con el NUN.';
      } else if (debMsgEl) {
        debMsgEl.style.display = 'block';
        debMsgEl.textContent = '🩺 Sin débitos > $50.000 fuera de consultas en este archivo.';
      }
    } catch (e) {
      if (debMsgEl) { debMsgEl.style.display = 'block'; debMsgEl.textContent = '🩺 No se pudieron extraer los débitos: ' + e.message; }
    }

    // ── Fondo CEOT — Ayudantía cruzada: se guarda el resultado de este
    // período (reemplaza lo que hubiera si ya se había importado antes).
    impCeotAyudantiaOsde = ceotAyudantiaOsde;
    impCeotAyudantiaDif  = ceotAyudantiaDif;
    impCeotAyudantiaDetalle = ceotAyudantiaDetalle;
    impCeotAyudantiaSinEspDetalle = ceotAyudantiaSinEspDetalle;
    if (periodoKeyArchivo && (ceotAyudantiaOsde || ceotAyudantiaDif || ceotAyudantiaSinEspDetalle.length)) {
      ceotAyudCruzadaGuardarPeriodo(periodoKeyArchivo, {
        osde: ceotAyudantiaOsde, dif: ceotAyudantiaDif,
        detalle: ceotAyudantiaDetalle, sinEsp: ceotAyudantiaSinEspDetalle,
        actualizado: new Date().toISOString()
      });
    }

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
    tfootRows += ayudantiaCruzadaFootnoteRowsHtml(ceotAyudantiaOsde, ceotAyudantiaDif, ceotAyudantiaDetalle, ceotAyudantiaSinEspDetalle);
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
    ok = true;

  } catch(err) {
    mostrarImpError('Error procesando archivos: ' + err.message);
  }

  btn.textContent = 'Reprocesar ▸'; btn.disabled = false;
  return ok;
}

// Dispara solo con subir el Excel (onchange de fileCEOT/fileART): procesa y,
// si Diferidos quedó calculado, lo carga al Sheet sin pedir click. OSDE y
// Cheques Colón siguen manuales — necesitan el importe real del cheque
// bancario, que no está en el Excel (ver cargarEnSheet).
async function autoProcesarYCargarDiferidos() {
  if (!document.getElementById('fileCEOT').files.length) return;
  var ok = await procesarArchivosImport();
  if (ok) await cargarEnSheet('diferidos');
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

  // Otros gastos del mes (plantillas de GASTOS_EXTRA_DEFAULT) — mismo criterio
  // que Derechos Adscriptos/Swiss arriba: se reparte en partes iguales entre
  // los profesionales de la plantilla, y esa parte se reparte a su vez entre
  // sus cheques Colón del mes. Reemplaza el "Equipo laparoscopia" que antes
  // estaba hardcodeado a 3 socios fijos en el código.
  var gastosExtraFootnote = '';
  // Detalle de los gastos asignados exactamente al grupo Storz (Deganutti/
  // Trivellini/Corelich) — para el historial de Gasto de Equipos (ver abajo,
  // después de "Render resultado"). Cualquier gasto futuro que se agregue a
  // ese mismo trío (no solo "Storz" por nombre) entra acá automáticamente.
  var gastosExtraDetalleEquipo = [];
  if (impColonCheques.length > 0) {
    GASTOS_EXTRA_DEFAULT.forEach(function(g) {
      var inputEl = document.getElementById('impGastoExtra_' + g.id);
      var importe = inputEl ? Math.abs(parsearMontoImp(inputEl.value)) : 0;
      if (!importe || !g.socios || !g.socios.length) return;
      var perSocio  = importe / g.socios.length;
      var perCheque = perSocio / impColonCheques.length;
      impColonCheques.forEach(function(c) {
        g.socios.forEach(function(k) {
          if (c.d[k] !== undefined) c.d[k] -= perCheque;
        });
      });
      gastosExtraFootnote += '<div style="font-size:.65rem;color:#92610f;padding:2px 0 6px 8px">⚑ ' + escAttr(g.concepto) + ' ' +
        fmtImp(importe) + ' ÷ ' + g.socios.length + ' socio(s) (' + g.socios.join('/') + ') = ' + fmtImp(perSocio) +
        ' c/u, repartido en ' + impColonCheques.length + ' cheque(s) (' + fmtImp(perCheque) + ' c/u).</div>';
      if (transfFamMismoGrupo(g.socios, GASEQ_SOCIOS_CEOT)) {
        gastosExtraDetalleEquipo.push({ concepto: g.concepto, importe: importe });
      }
    });
  }

  // Gasto de Equipos (Storz) — guarda el historial del mes (ver
  // gastoEquipoGuardarMes, arriba en este archivo). Se completa solo acá,
  // cada vez que se corre el import; se puede corregir a mano después desde
  // el acordeón "Gasto de Equipos" si hace falta.
  var mesGastoEquipo = document.getElementById('impMes').value;
  if (mesGastoEquipo) {
    gastoEquipoGuardarMes(mesGastoEquipo, {
      gasto: gastosExtraDetalleEquipo.reduce(function(s, g) { return s + g.importe; }, 0),
      gastoDetalle: gastosExtraDetalleEquipo,
      recuperadoOsde: gasEqAjenoOsde + bill.gasEqPropioOsde,
      recuperadoDif: gasEqAjenoDif + bill.gasEqPropioDif
    });
    var gastoEquipoEl = document.getElementById('gastoEquipoBody');
    if (gastoEquipoEl) gastoEquipoEl.innerHTML = gastoEquipoSectionHtml();
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
  var ayudantiaCruzadaFootnote = ayudantiaCruzadaFootnoteDivHtml(impCeotAyudantiaOsde, impCeotAyudantiaDif, impCeotAyudantiaDetalle, impCeotAyudantiaSinEspDetalle);
  document.getElementById('impResultBody').innerHTML = html + facDerechosFootnote + facSwissFootnote + gastosExtraFootnote + ayudantiaCruzadaFootnote;
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

