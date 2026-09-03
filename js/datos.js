// ═══════════════════════════════════════════════════════════════════
// datos.js — extraído de index.html (sección DATOS). Carga ANTES del
// script principal. Contiene: DOCTORES, datos de liquidación por mes,
// PERIOD_EXTRAS, IIBB/CPSM, GASTOS_A, config de grupos y %, endpoints
// de Apps Script, syncPush/syncPull, y los cargar*Remoto() de arranque.
// ═══════════════════════════════════════════════════════════════════


const DOCTORES = [
  { user:"delacolina", nombre:"DR. DE LA COLINA",  ini:"DC", apellido:"DE LA COLINA", junioKey:"DE LA COLINA, Juan Pablo", wapp:"5492235832116" },
  { user:"bruni",      nombre:"DR. BRUNI",         ini:"B",  apellido:"BRUNI",        junioKey:"BRUNI, Maximiliano",        wapp:"5492236357897" },
  { user:"corelich",   nombre:"DR. CORELICH",      ini:"C",  apellido:"CORELICH",     junioKey:"CORELICH, Daniel",          wapp:"5492236876857" },
  { user:"deganutti",  nombre:"DR. DEGANUTTI",     ini:"D",  apellido:"DEGANUTTI",    junioKey:"DEGANUTTI, Cristian",       wapp:"5492236237130" },
  { user:"fisser",     nombre:"DR. FISSER",        ini:"F",  apellido:"FISSER",       junioKey:"",                          wapp:"" },
  { user:"guilera",    nombre:"DR. GUILERA",       ini:"G",  apellido:"GUILERA",      junioKey:"",                          wapp:"" },
  { user:"labayen",    nombre:"DR. LABAYEN",       ini:"L",  apellido:"LABAYEN",      junioKey:"LABAYEN, Daniel",           wapp:"5492235837723" },
  { user:"mazzola",    nombre:"DR. MAZZOLA",       ini:"M",  apellido:"MAZZOLA",      junioKey:"MAZZOLA, Maximiliano",      wapp:"5492236021105" },
  { user:"trivellini", nombre:"DR. TRIVELLINI",    ini:"T",  apellido:"TRIVELLINI",   junioKey:"TRIVELLINI, Amilcar",       wapp:"5492236803383" },
  { user:"leon",       nombre:"DR. LEON",          ini:"L",  apellido:"LEON",         junioKey:"LEON, Joaquin",             wapp:"5492235033679" },
  { user:"perlasco",   nombre:"DR. PERLASCO",      ini:"P",  apellido:"PERLASCO",     junioKey:"PERLASCO, Camilo",          wapp:"5492235399935" },
  { user:"soule",      nombre:"DR. SOULE",         ini:"S",  apellido:"SOULE",        junioKey:"SOULE, Ivan",               wapp:"5492235726565" },
  { user:"garmendia",  nombre:"DRA. GARMENDIA",    ini:"VG", apellido:"GARMENDIA",    junioKey:"GARMENDIA, Valeria",        wapp:"5492268636272" },
];

// ── Nómina — override remoto de nombre/WhatsApp (pantalla "Nómina" del Home) ──
// No cubre altas/bajas ni pertenencia a grupos (Sueldo Director, Préstamo
// Casa, Retención Ganancias, exención CPSM) — eso sigue en DOCTORES/los
// arrays de grupos más abajo, a propósito (ver comentario en Code.js).
var NOMINA_REMOTA = {};
function aplicarNominaRemota() {
  DOCTORES.forEach(function(d) {
    var o = NOMINA_REMOTA[d.user];
    if (!o) return;
    if (o.nombre) d.nombre = o.nombre;
    if (o.wapp !== undefined) d.wapp = o.wapp;
  });
}
async function cargarNominaRemota() {
  try {
    var resp = await fetch(authURL(LIQUIDACION_ENDPOINT + '?action=leerNomina'));
    var data = await resp.json();
    if (data.ok) { NOMINA_REMOTA = data.valores || {}; aplicarNominaRemota(); }
  } catch (e) { /* mantiene los valores hardcodeados */ }
}

const MAYO = [
  { fecha:"04/05", items:[["Cheque", 2353953.18]] },
  { fecha:"08/05", items:[["Cheque", 267456]] },
  { fecha:"15/05", items:[["Cheque bruto",964752],["IIBB",530453],["A distribuir",434299]] },
  { fecha:"22/05", items:[["Cheque bruto",964752],["CPSM",757790.01],["A distribuir",206961.99]] },
  { fecha:"29/05", items:[["Cheque",522799.06]] },
];

var PERIODO_IIBB = { enero:null, febrero:{
  "BRUNI":305088.61,"CORELICH":285330.09,"DE LA COLINA":265359.10,"DEGANUTTI":494812.93,
  "LABAYEN":116214.12,"LEON":102829.31,"MAZZOLA":136185.10,"PERLASCO":140221.79,"SOULE":127686.81,"TRIVELLINI":150419.73,
}, marzo:{
  "BRUNI":693688.67,"CORELICH":675445.70,"DE LA COLINA":596088.81,"DEGANUTTI":1004275.11,
  "LABAYEN":167379.19,"LEON":221652.00,"MAZZOLA":276380.89,"PERLASCO":306937.85,"SOULE":259962.22,"TRIVELLINI":357562.07,
}, abril:{}, mayo:null, junio:null, julio:null, agosto:null, septiembre:null, octubre:null, noviembre:null, diciembre:null };
var PERIODO_CPSM = { enero:null, febrero:{
  "BRUNI":935603.40,"CORELICH":875010.69,"DE LA COLINA":813766.46,"DEGANUTTI":1517423.59,
  "LEON":315342.65,"MAZZOLA":417633.55,"PERLASCO":430012.70,"SOULE":391572.17,"TRIVELLINI":461286.35,
}, marzo:{
  "BRUNI":991283.81,"CORELICH":964922.43,"DE LA COLINA":851555.45,"DEGANUTTI":1434678.73,
  "LEON":316645.71,"MAZZOLA":394829.84,"PERLASCO":438482.64,"SOULE":371374.60,"TRIVELLINI":510802.96,
}, abril:{
  "BRUNI":578355.32,"CORELICH":166600.58,"DE LA COLINA":724804.25,"DEGANUTTI":1077114.18,
  "LEON":228514.58,"MAZZOLA":477652.69,"PERLASCO":506303.83,"SOULE":448966.49,"TRIVELLINI":617015.18,
}, mayo:null, junio:null, julio:null, agosto:{
  "BRUNI":978146.45,"CORELICH":358263.80,"DE LA COLINA":1149627.10,"DEGANUTTI":1928352.40,
  "LEON":331733.60,"MAZZOLA":790061.80,"PERLASCO":402392.85,"SOULE":421247.45,"TRIVELLINI":953503.20,
}, septiembre:null, octubre:null, noviembre:null, diciembre:null };

function calcularCPSMDesde(rawData, osdeMap) {
  var difMap = {}, totalDif = 0;
  rawData.forEach(function(row) {
    var dif = 0;
    ["f1","f2","f3","f4","f5","f6","f7"].forEach(function(k){ dif += (row[k]||0); });
    difMap[row.k] = dif;
    totalDif += dif;
  });
  var totalOsde = 0;
  Object.keys(osdeMap).forEach(function(k){ totalOsde += osdeMap[k]||0; });
  var totalCPSM = (totalDif + totalOsde) * 0.05;
  var result = {};
  rawData.forEach(function(row) {
    var k = row.k;
    var pctDif  = totalDif  > 0 ? (difMap[k] / totalDif)        : 0;
    var pctOsde = totalOsde > 0 ? ((osdeMap[k]||0) / totalOsde) : 0;
    result[k] = Math.round(totalCPSM * (pctDif + pctOsde) / 2);
  });
  return result;
}

// ── OSDE y Centro Médico por período ─────────────────────────
// pendiente:true → mostrar "Pendiente" con nota de timing
// pendiente:false → m tiene los importes individuales
const PERIOD_EXTRAS = {
  enero: {
    // Sin cheques Colón, sin CEM (no hay liquidación previa), sin IIBB/CPSM/Gastos A en la planilla
    osde: { pendiente: false, fecha: "Ene 2026", m: {
      "BRUNI":        3009206.82,
      "CORELICH":     2330206.90,
      "DE LA COLINA": 2744293.54,
      "DEGANUTTI":    7010794.29,
      "LABAYEN":      2867248.38,
      "LEON":         1229402.64,
      "MAZZOLA":      1936694.64,
      "PERLASCO":     1589478.47,
      "SOULE":        1800380.15,
      "TRIVELLINI":   1203682.73,
    }},
  },
  febrero: {
    osde: { pendiente: false, fecha: "Feb 2026", m: {
      "BRUNI":        3284007.84,
      "CORELICH":     3096335.81,
      "DE LA COLINA": 3938342.99,
      "DEGANUTTI":    8905431.86,
      "LABAYEN":      421091.74,
      "LEON":         1491639.32,
      "MAZZOLA":      1054052.37,
      "PERLASCO":     1252361.80,
      "SOULE":        941182.66,
      "TRIVELLINI":   3143286.84,
    }},
    // CEM de Febrero = liquidación de Enero — acreditado 1ra semana de Febrero
    cm: { pendiente: false, fecha: "Liquid. Enero", m: {
      "BRUNI":        455123.77,
      "CORELICH":     68079.46,
      "DE LA COLINA": 193206.98,
      "DEGANUTTI":    1183510.92,
      "LABAYEN":      195728.44,
      "LEON":         105901.38,
      "MAZZOLA":      154754.69,
      "PERLASCO":     241114.74,
      "SOULE":        328420.34,
      "TRIVELLINI":   226085.97,
    }},
  },
  marzo: {
    osde: { pendiente: false, fecha: "Mar 2026", m: {
      "BRUNI":        1288158.04,
      "CORELICH":     2349145.93,
      "DE LA COLINA": 1801872.37,
      "DEGANUTTI":    7168767.30,
      "LABAYEN":      3056471.19,
      "LEON":         1060987.89,
      "MAZZOLA":      2529849.46,
      "PERLASCO":     668603.07,
      "SOULE":        1011939.78,
      "TRIVELLINI":   4878995.40,
    }},
    // CEM de Marzo = liquidación de Febrero — acreditado 1ra semana de Marzo
    cm: { pendiente: false, fecha: "Liquid. Febrero", m: {
      "BRUNI":        3876051.84,
      "CORELICH":     1185765.28,
      "DE LA COLINA": 1386378.10,
      "DEGANUTTI":    653571.00,
      "LABAYEN":      2725717.44,
      "LEON":         1139704.56,
      "MAZZOLA":      616086.28,
      "PERLASCO":     1427288.75,
      "SOULE":        1684122.28,
      "TRIVELLINI":   440880.34,
    }},
  },
  abril: {
    osde: { pendiente: false, fecha: "Abr 2026", m: {
      "BRUNI":        2959887.21,
      "CORELICH":     4543844.66,
      "DE LA COLINA": 3464228.14,
      "DEGANUTTI":    2223257.27,
      "LABAYEN":      2289546.71,
      "LEON":         782358.87,
      "MAZZOLA":      1051237.80,
      "PERLASCO":     2843152.46,
      "SOULE":        1584976.31,
      "TRIVELLINI":   3767888.21,
    }},
    // CEM de Abril = liquidación de Marzo — acreditado 1ra semana de Abril
    cm: { pendiente: false, fecha: "Liquid. Marzo", m: {
      "BRUNI":        505254.34,
      "CORELICH":     452124.37,
      "DE LA COLINA": 313097.47,
      "DEGANUTTI":    803002.42,
      "LABAYEN":      155132.40,
      "LEON":         362063.79,
      "MAZZOLA":      762097.96,
      "PERLASCO":     99134.82,
      "SOULE":        335574.61,
      "TRIVELLINI":   360087.16,
    }},
  },
  mayo: {
    osde: { pendiente: false, fecha: "~3ra sem. de Junio", m: {
      "BRUNI":        2852488,
      "CORELICH":     4074983,
      "DE LA COLINA": 2586496,
      "DEGANUTTI":    5180664,
      "LABAYEN":      3365236,
      "LEON":         1323011,
      "MAZZOLA":      1885359,
      "PERLASCO":     1624560,
      "SOULE":        1434395,
      "TRIVELLINI":   2842621,
    }},
    // CEM de Mayo = liquidación de Abril — acreditado 1ra semana de Mayo
    cm: { pendiente: false, fecha: "Liquid. Abril", m: {
      "BRUNI":        2251335.09,
      "CORELICH":     720266.46,
      "DE LA COLINA": 1315259.64,
      "DEGANUTTI":    5112803.76,
      "LABAYEN":      487172.31,
      "LEON":         1312975.80,
      "MAZZOLA":      818701.09,
      "PERLASCO":     2326092.04,
      "SOULE":        1326296.57,
      "TRIVELLINI":   2137674.11,
    }},
  },
  junio: {
    osde: { pendiente: false, fecha: "Jun 2026", m: {
      "BRUNI":        4571883.44,
      "CORELICH":     2869216.75,
      "DE LA COLINA": 2938713.35,
      "DEGANUTTI":    6251211.94,
      "LABAYEN":      3824795,
      "LEON":         836441.22,
      "MAZZOLA":      982880.48,
      "PERLASCO":     476548.11,
      "SOULE":        987844.52,
      "TRIVELLINI":   1079679.31,
    }},
    // CEM de Junio = liquidación de Mayo — acreditado 01/06/2026
    cm: { pendiente: false, fecha: "Liquid. Mayo", m: {
      "BRUNI":        1274938,
      "CORELICH":     2182505,
      "DE LA COLINA": 1029425,
      "DEGANUTTI":    2361968,
      "LABAYEN":      215415,
      "LEON":         750227,
      "MAZZOLA":      1123420,
      "PERLASCO":     295991,
      "SOULE":        1345730,
      "TRIVELLINI":   3403479,
    }},
  },
  julio: {
    osde: { pendiente: true, fecha: "~3ra sem. de Agosto", m: {} },
    cm:   { pendiente: true, fecha: "primeros días de Agosto", m: {} },
  },
  agosto: {
    osde: { pendiente: true, fecha: "~3ra sem. de Sep",    m: {} },
    cm:   { pendiente: true, fecha: "1ra sem. de Ago",     m: {} },
  },
  septiembre: {
    osde: { pendiente: true, fecha: "~3ra sem. de Oct",    m: {} },
    cm:   { pendiente: true, fecha: "1ra sem. de Sep",     m: {} },
  },
  octubre: {
    osde: { pendiente: true, fecha: "~3ra sem. de Nov",    m: {} },
    cm:   { pendiente: true, fecha: "1ra sem. de Oct",     m: {} },
  },
  noviembre: {
    osde: { pendiente: true, fecha: "~3ra sem. de Dic",    m: {} },
    cm:   { pendiente: true, fecha: "1ra sem. de Nov",     m: {} },
  },
  diciembre: {
    osde: { pendiente: true, fecha: "~3ra sem. de Ene",    m: {} },
    cm:   { pendiente: true, fecha: "1ra sem. de Dic",     m: {} },
  },
};

function getExtra(periodo, tipo, apellido) {
  var p = PERIOD_EXTRAS[periodo];
  if (!p || !p[tipo]) return { val: null, pendiente: true, fecha: "" };
  var e = p[tipo];
  var val = (!e.pendiente && (apellido in e.m)) ? e.m[apellido] : null;
  return { val: val, pendiente: e.pendiente || val === null, fecha: e.fecha };
}

const FEBRERO_RAW = [
  { k:"BRUNI", f1:1656879.412784577, f2:1226826.680608093, f3:4345627.037334692, f4:4345627.037334692, f5:2466223.884119967 },
  { k:"CORELICH", f1:589626.9199361509, f2:436585.8078752607, f3:1546460.572473815, f4:1546460.572473815, f5:877645.0364741734 },
  { k:"DE LA COLINA", f1:1207022.784164229, f2:893732.9683068922, f3:3165752.923882245, f4:3165752.923882245, f5:1796623.45733415 },
  { k:"DEGANUTTI", f1:1718597.750535375, f2:1272525.663196216, f3:4507500.541923946, f4:4507500.541923946, f5:2558090.098085046 },
  { k:"LABAYEN", f1:217523.2712209744, f2:161063.835260375, f3:570515.2718861476, f4:570515.2718861476, f5:323777.9905391472 },
  { k:"LEON", f1:494286.9245354636, f2:365991.8653202971, f3:1296404.920532137, f4:1296404.920532137, f5:735733.8195474688 },
  { k:"MAZZOLA", f1:1496224.536674106, f2:1107870.716244415, f3:3924264.946697086, f4:3924264.946697086, f5:2227093.088295726 },
  { k:"PERLASCO", f1:1131121.013067606, f2:837531.9453668768, f3:2966679.420938094, f4:2966679.420938094, f5:1683645.554850044 },
  { k:"SOULE", f1:418339.8772942434, f2:309757.3179235479, f3:1097212.668307507, f4:1097212.668307507, f5:622688.5246458312 },
  { k:"TRIVELLINI", f1:1831486.124187272, f2:1356113.199898025, f3:4803581.696024329, f4:4803581.696024329, f5:2726121.640508445 },
];
const FEBRERO_FECHAS = ["02/02","06/02","13/02","20/02","27/02"];

const MARZO_RAW = [
  { k:"BRUNI", f1:109812.5404874975, f2:1329055.113174606, f3:4688205.399220314, f4:4688205.399220314, f5:2668778.066856623 },
  { k:"CORELICH", f1:106997.25782023, f2:1294981.902525321, f3:4568013.084732177, f4:4568013.084732177, f5:2600358.152327277 },
  { k:"DE LA COLINA", f1:94355.10543780372, f2:1141974.630397697, f3:4028284.135798472, f4:4028284.135798472, f5:2293115.474521095 },
  { k:"DEGANUTTI", f1:159006.9108936832, f2:1924451.86146485, f3:6788451.071760624, f4:6788451.071760624, f5:3864350.595913966 },
  { k:"LABAYEN", f1:26495.44261322251, f2:320672.8787495536, f3:1131164.770094579, f4:1131164.770094579, f5:643919.6817040873 },
  { k:"LEON", f1:35077.22399660694, f2:424537.7049078401, f3:1497545.090938645, f4:1497545.090938645, f5:852483.0190866919 },
  { k:"MAZZOLA", f1:43743.71518679657, f2:529427.769179831, f3:1867541.91106292, f4:1867541.91106292, f5:1063105.061909001 },
  { k:"PERLASCO", f1:48568.2434035667, f2:587818.7677551124, f3:2073514.554388913, f4:2073514.554388913, f5:1180355.742302038 },
  { k:"SOULE", f1:41150.95984753362, f2:498047.7944924179, f3:1756849.912440287, f4:1756849.912440287, f5:1000093.236925877 },
  { k:"TRIVELLINI", f1:56600.40511305911, f2:685031.5773527701, f3:2416430.069563068, f4:2416430.069563068, f5:1375561.653253342 },
];
const MARZO_FECHAS = ["02/03","06/03","13/03","20/03","27/03"];

const ABRIL_RAW = [
  { k:"BRUNI", f1:2880829.23232516, f2:638145.8013514152, f3:2259184.949847677, f4:2259184.949847677, f5:1340625.273008795 },
  { k:"CORELICH", f1:829899.6347962342, f2:183834.9047370795, f3:650818.4323381357, f4:650818.4323381357, f5:386202.8377053842 },
  { k:"DE LA COLINA", f1:3610439.481565487, f2:799765.1406552874, f3:2831355.099970727, f4:2831355.099970727, f5:1680157.352384552 },
  { k:"DEGANUTTI", f1:5365514.259965064, f2:1188539.86854483, f3:4207708.297420521, f4:4207708.297420521, f5:2496900.523948291 },
  { k:"LABAYEN", f1:1059389.037357507, f2:234670.1632299687, f3:830787.1019831279, f4:830787.1019831279, f5:492998.2317222019 },
  { k:"LEON", f1:1137086.223069146, f2:251881.2260317317, f3:891718.2778527847, f4:891718.2778527847, f5:529155.4636878775 },
  { k:"MAZZOLA", f1:2379379.701876311, f2:527067.3976560679, f3:1865941.497724043, f4:1865941.497724043, f5:1107270.270180136 },
  { k:"PERLASCO", f1:2522293.177457561, f2:558724.8223223346, f3:1978016.163428192, f4:1978016.163428192, f5:1173776.613238559 },
  { k:"SOULE", f1:2236466.524517586, f2:495410.0390504514, f3:1753867.06589, f4:1753867.06589, f5:1040764.065902815 },
  { k:"TRIVELLINI", f1:3073912.083869938, f2:680916.4764208327, f3:2410603.113544789, f4:2410603.113544789, f5:1430478.481821388 },
];
const ABRIL_FECHAS = ["06/04","10/04","17/04","24/04","30/04"];

const JUNIO_RAW = [
  { k:"BRUNI, Maximiliano",      f1:4018182, f2:782320,  f3:2770000, f4:2770000, f5:1610000 },
  { k:"CORELICH, Daniel",        f1:1291234, f2:251403,  f3:890000,  f4:890000,  f5:517000  },
  { k:"DE LA COLINA, Juan Pablo",f1:4607554, f2:897107,  f3:3176000, f4:3176000, f5:1846000 },
  { k:"DEGANUTTI, Cristian",     f1:8273217, f2:1610797, f3:5702000, f4:5702000, f5:3308000 },
  { k:"LABAYEN, Daniel",         f1:956057,   f2:186143,  f3:659000,  f4:659000,  f5:383000  },
  { k:"LEON, Joaquin",           f1:1456969,  f2:283699,  f3:1004000, f4:1004000, f5:583000  },
  { k:"MAZZOLA, Maximiliano",    f1:3614789,  f2:703866,  f3:2492000, f4:2492000, f5:1446000 },
  { k:"PERLASCO, Camilo",        f1:1844425,  f2:359141,  f3:1271000, f4:1271000, f5:738000  },
  { k:"SOULE, Ivan",             f1:1860629,  f2:362283,  f3:1282000, f4:1282000, f5:744000  },
  { k:"TRIVELLINI, Amilcar",     f1:3990530,  f2:776941,  f3:2751000, f4:2751000, f5:1598000 },
];
const JUNIO_FECHAS = ["01/06","09/06","16/06","23/06","30/06"];

const JULIO_RAW = [
  { k:"BRUNI",        f1:4953088,  f2:859853,  f3:3057254, f4:3057254, f5:1728182 },
  { k:"CORELICH",     f1:1592633,  f2:276480,  f3:983040,  f4:983040,  f5:555686  },
  { k:"DE LA COLINA", f1:5677736,  f2:985651,  f3:3504538, f4:3504538, f5:1981019 },
  { k:"DEGANUTTI",    f1:10196832, f2:1770163, f3:6293914, f4:6293914, f5:3557776 },
  { k:"LABAYEN",      f1:1178548,  f2:204595,  f3:727450,  f4:727450,  f5:411207  },
  { k:"LEON",         f1:1795693,  f2:311731,  f3:1108378, f4:1108378, f5:626535  },
  { k:"MAZZOLA",      f1:4455390,  f2:773453,  f3:2750054, f4:2750054, f5:1554530 },
  { k:"PERLASCO",     f1:2273483,  f2:394675,  f3:1403290, f4:1403290, f5:793241  },
  { k:"SOULE",        f1:2293391,  f2:398131,  f3:1415578, f4:1415578, f5:800187  },
  { k:"TRIVELLINI",   f1:5395044,  f2:936576,  f3:3330048, f4:3330048, f5:1882385 },
];
const JULIO_FECHAS = ["01/07","10/07","17/07","24/07","31/07"];

// Agosto en adelante — se llenan dinámicamente desde el endpoint al cargar
var AGOSTO_RAW        = []; var AGOSTO_FECHAS        = [];
var SEPTIEMBRE_RAW    = []; var SEPTIEMBRE_FECHAS    = [];
var OCTUBRE_RAW       = []; var OCTUBRE_FECHAS       = [];
var NOVIEMBRE_RAW     = []; var NOVIEMBRE_FECHAS     = [];
var DICIEMBRE_RAW     = []; var DICIEMBRE_FECHAS     = [];

// ── Cheques diferidos Colón Mayo 2026 — importes individuales por profesional ──
const MAYO_RAW = [
  { k:"BRUNI",        f1:2700726, f2:309127, f3:1115064, f4:1115064, f5:604253  },
  { k:"CORELICH",     f1:1989512, f2:227721, f3:821421,  f4:821421,  f5:445128  },
  { k:"DE LA COLINA", f1:2336715, f2:267462, f3:964773,  f4:964773,  f5:522810  },
  { k:"DEGANUTTI",    f1:6492380, f2:743122, f3:2680547, f4:2680547, f5:1452588 },
  { k:"LABAYEN",      f1:1484225, f2:169885, f3:612800,  f4:612800,  f5:332077  },
  { k:"LEON",         f1:1397332, f2:159939, f3:576925,  f4:576925,  f5:312635  },
  { k:"MAZZOLA",      f1:2355502, f2:269612, f3:972530,  f4:972530,  f5:527014  },
  { k:"PERLASCO",     f1:1451346, f2:166122, f3:599226,  f4:599226,  f5:324720  },
  { k:"SOULE",        f1:1019230, f2:116662, f3:420816,  f4:420816,  f5:228040  },
  { k:"TRIVELLINI",   f1:2257093, f2:258348, f3:931899,  f4:931899,  f5:504996  },
];
// CPSM Junio = 5% fact. Mayo, distribuido por participacion ponderada
PERIODO_CPSM.junio = calcularCPSMDesde(MAYO_RAW, PERIOD_EXTRAS.mayo.osde.m);
const MAYO_FECHAS = ["04/05","08/05","15/05","22/05","29/05"];

// Totales brutos de los cheques diferidos Colón — Julio 2026
const JULIO_CHEQUES = [
  { fecha:"01/07", bruto:41474813,  ret:1658992.51, neto:39815820.27 },
  { fecha:"10/07", bruto:7200000,   ret:288000,     neto:6912000     },
  { fecha:"17/07", bruto:25600000,  ret:1024000,    neto:24576000    },
  { fecha:"24/07", bruto:25600000,  ret:1024000,    neto:24576000    },
  { fecha:"31/07", bruto:14470977,  ret:578839.07,  neto:13892137.93 },
];

const GASTOS_A = {
  marzo: 19500000.00,
  abril: 20024038.40,
  mayo:  25344799.60,
  junio: 23868442.00,
  julio: null, agosto: null, septiembre: null, octubre: null, noviembre: null, diciembre: null,
};

// Retención Ganancias — aplica desde Agosto 2026 en adelante
// Base de cálculo: bruto total (cheques Colón + OSDE + CEM)
// Default parejo 15% para todos los socios — editable por profesional desde
// el panel admin ("Retención Ganancias" en el menú lateral). El override editado
// se guarda en el Script (compartido, no por navegador) y pisa este default.
// FISSER/GUILERA = null (externos, no participan de ningún cheque).
const APORTE_CEOT_PCT = {
  "BRUNI":        0.15,
  "CORELICH":     0.15,
  "DEGANUTTI":    0.15,
  "LABAYEN":      0.15,
  "TRIVELLINI":   0.15,
  "DE LA COLINA": 0.15,
  "LEON":         0.15,
  "MAZZOLA":      0.15,
  "PERLASCO":     0.15,
  "SOULE":        0.15,
  "FISSER":       null,
  "GUILERA":      null,
  "GARMENDIA":    0.15,
};
const APORTE_CEOT_DESDE = ["agosto","septiembre","octubre","noviembre","diciembre"]; // desde Agosto 2026 en adelante

// % de incidencia fija de cada socio para repartir un monto total cualquiera
// (p.ej. el fondo acumulado de Retención Ganancias) — NO es el % de Retención
// Ganancias de arriba (ese se aplica sobre los honorarios propios de cada uno;
// este es la proporción de participación societaria de cada uno sobre CUALQUIER
// monto a repartir, suma 100%). Datos provistos por Marcelo (25/08/2026).
// GARMENDIA no tiene % asignado todavía (se sumó como socia en agosto 2026).
const INCIDENCIA_FONDO_PCT = {
  "BRUNI":        0.1316,
  "CORELICH":     0.0910,
  "DE LA COLINA": 0.1151,
  "DEGANUTTI":    0.2195,
  "LABAYEN":      0.0522,
  "LEON":         0.0506,
  "MAZZOLA":      0.0870,
  "PERLASCO":     0.0764,
  "SOULE":        0.0601,
  "TRIVELLINI":   0.1165,
};

// Devuelve el % de Retención Ganancias vigente para un apellido: usa el override
// editado a mano en el panel admin si existe, si no cae al default de arriba.
function getAporteCeotPct(apellido) {
  var def = APORTE_CEOT_PCT[apellido];
  if (def === null || def === undefined) return def;
  if (APORTE_PCT_REMOTO && APORTE_PCT_REMOTO[apellido] !== undefined && APORTE_PCT_REMOTO[apellido] !== null) {
    return APORTE_PCT_REMOTO[apellido];
  }
  return def;
}

// Meses "cerrados" con "Cerrar mes" en el panel Retención Ganancias: guardan una foto
// del % de cada profesional en ese momento. Una vez cerrado, ese mes ya no se
// mueve aunque después cambies el % vigente — solo lo usan los meses abiertos.
// Compartido en el Script (mismo patrón que APORTE_PCT_REMOTO, ver arriba) —
// antes vivía solo en localStorage: un mes cerrado desde un dispositivo no
// aparecía cerrado desde otro.
var APORTE_CERRADOS_REMOTO = {};
async function cargarAporteCerradosRemoto() {
  try {
    var resp = await fetch(authURL(LIQUIDACION_ENDPOINT + '?action=leerAporteCerrados'));
    var data = await resp.json();
    if (data.ok) APORTE_CERRADOS_REMOTO = data.valores || {};
  } catch (e) { /* mantiene lo que ya había cargado */ }
}

function getAporteCerrados() {
  return APORTE_CERRADOS_REMOTO || {};
}

// Devuelve el % de Retención Ganancias a usar para un período/profesional puntual:
// el congelado si ese mes ya está cerrado, si no el vigente (getAporteCeotPct).
function getAporteCeotPctPeriodo(periodo, apellido) {
  var cerrados = getAporteCerrados();
  if (cerrados[periodo] && cerrados[periodo][apellido] !== undefined && cerrados[periodo][apellido] !== null) {
    return cerrados[periodo][apellido];
  }
  return getAporteCeotPct(apellido);
}

async function cerrarMesAporteCeot(periodo) {
  var label = periodo.charAt(0).toUpperCase() + periodo.slice(1);
  if (!confirm('¿Cerrar ' + label + '? Se guarda el % actual de cada profesional para este mes — si después cambiás los porcentajes, los montos de ' + label + ' ya no se van a mover.')) return;
  var stPre = document.getElementById("aporte-ceot-status");
  if (stPre) stPre.textContent = "Cerrando " + label + "…";
  var socios = DOCTORES.filter(function(d) { return APORTE_CEOT_PCT[d.apellido] !== null; });
  var cerrados = Object.assign({}, APORTE_CERRADOS_REMOTO);
  var snap = {};
  socios.forEach(function(d) { snap[d.apellido] = getAporteCeotPct(d.apellido); });
  cerrados[periodo] = snap;
  try {
    var url = LIQUIDACION_ENDPOINT + '?action=setAporteCerrados&valores=' + encodeURIComponent(JSON.stringify(cerrados));
    var data = await (await fetch(authURL(url))).json();
    if (!data.ok) throw new Error(data.error || 'error desconocido');
    APORTE_CERRADOS_REMOTO = cerrados;
    renderAporteCeot();
  } catch (e) {
    alert('No se pudo cerrar ' + label + ': ' + e.message);
    var stErr = document.getElementById("aporte-ceot-status");
    if (stErr) stErr.textContent = "";
  }
}

async function reabrirMesAporteCeot(periodo) {
  var label = periodo.charAt(0).toUpperCase() + periodo.slice(1);
  if (!confirm('¿Reabrir ' + label + '? Vuelve a usar el % vigente actual en vez del que quedó guardado al cerrarlo.')) return;
  var cerrados = Object.assign({}, APORTE_CERRADOS_REMOTO);
  delete cerrados[periodo];
  try {
    var url = LIQUIDACION_ENDPOINT + '?action=setAporteCerrados&valores=' + encodeURIComponent(JSON.stringify(cerrados));
    var data = await (await fetch(authURL(url))).json();
    if (!data.ok) throw new Error(data.error || 'error desconocido');
    APORTE_CERRADOS_REMOTO = cerrados;
    renderAporteCeot();
  } catch (e) {
    alert('No se pudo reabrir ' + label + ': ' + e.message);
  }
}

// Préstamo Casa 14 de julio 2067 — cuota 1 de 48, desde Agosto 2026
// Grupo B (no pagan de bolsillo): se les descuenta la cuota. Grupo A (pagan de
// bolsillo la cuota total al banco): se les reintegra la diferencia. Recalculado
// para 11 socios (se sumó Mazzola al grupo B) — montos editables acá cada mes.
const PRESTAMO_CASA_MONTO = 228181.82;
const PRESTAMO_CASA_MONTO_CREDITO = 273818.18;
const PRESTAMO_CASA_TOTAL_CUOTAS = 48;
const PRESTAMO_CASA_SOCIOS = ["GARMENDIA", "DE LA COLINA", "SOULE", "LEON", "PERLASCO", "MAZZOLA"];
const PRESTAMO_CASA_SOCIOS_A = ["BRUNI", "CORELICH", "DEGANUTTI", "TRIVELLINI", "LABAYEN"];
const PRESTAMO_CASA_CUOTA = { agosto: 1, septiembre: 2, octubre: 3, noviembre: 4, diciembre: 5 };

// ── Sueldo Director — mismos 5 socios que PRESTAMO_CASA_SOCIOS_A, según el contador ──
const SUELDO_DIRECTOR_LISTA = PRESTAMO_CASA_SOCIOS_A;
var SUELDO_DIRECTOR_MONTO = 4000000;

// ── Todos los socios con cheques (Director + Resto) — usado por Inversiones ──
const TODOS_SOCIOS_INVERSION = PRESTAMO_CASA_SOCIOS_A.concat(PRESTAMO_CASA_SOCIOS);

// ── URL del Apps Script Web App (pegar después de desplegar) ──────
// Instrucciones: ceot_gastos_a_script.gs → sección "CÓMO DESPLEGAR"
const GASTOS_A_ENDPOINT  = "https://script.google.com/macros/s/AKfycbwaMlP7F0oghuVC4ec0MX_pOXqg-l_vToI287NZ71eCiy8Qh-0SSdJzeLg4InAXG-fp/exec";
const CIRUGIAS_ENDPOINT  = "https://script.google.com/macros/s/AKfycbwp5aAdiCzb5m0drkBQ6m_fZ2wK5h6GLoXHzkekJJuuFQljUdvJBLKoK8wobfth8PLy/exec";
const CAJAS_ENDPOINT     = "https://script.google.com/macros/s/AKfycbw3Zqjjf7rqXcRLKw5Om0WHOGTSJBqh9akdH2jGVrn7OEDThtRLCYG0fogvO5TtJ3E/exec";
const SYNC_ENDPOINT      = "https://script.google.com/macros/s/AKfycbxSG-1vkb6u2Ir0cYY1A55VTyaw0FLDX2XZOIHPQhahZqRD5VFVsIhXtN-v8gVgdP7EKQ/exec";

// ── Sync de estado entre PCs ──────────────────────────────────────
// Varias features (nombres de módulos editados, accesos, botones marcados,
// calculadora de Gastos A, transferencias a familiares, neto cheque override)
// vivían SOLO en localStorage — cada PC/navegador tenía su propia copia
// aislada, nunca sincronizada. syncPush espeja lo que se acaba de guardar en
// localStorage hacia SYNC_ENDPOINT (JSONP, fire-and-forget, no bloquea la UI).
// syncPull trae lo último guardado desde cualquier PC y, si difiere de lo
// local, pisa el localStorage + corre onDone (típicamente la misma función
// "xCargar()" que ya sabe parsear ese localStorage a la variable global).
// Si el pedido falla (offline, etc.) queda todo como estaba — el panel sigue
// funcionando 100% desde localStorage, esto es una mejora, no una dependencia.
var _syncCbSeq = 0;
function syncPush(clave) {
  try {
    var valor = localStorage.getItem(clave);
    if (valor === null) return;
    var cbName = '_syncPushCb' + (_syncCbSeq++);
    // Apps Script a veces responde 500 y de todos modos entrega el script más
    // tarde (redirect/retry demorado) — dejamos un stub para siempre en vez de
    // "delete" para que esa llamada tardía no explote con ReferenceError.
    var limpiar = function() {
      window[cbName] = function() {};
      var s = document.getElementById(cbName);
      if (s) s.remove();
    };
    window[cbName] = limpiar;
    var script = document.createElement('script');
    script.id = cbName;
    script.onerror = limpiar;
    script.src = SYNC_ENDPOINT + '?accion=set&clave=' + encodeURIComponent(clave) +
      '&valor=' + encodeURIComponent(valor) + '&callback=' + cbName;
    document.head.appendChild(script);
  } catch (e) {}
}
function syncPull(clave, onDone) {
  try {
    var cbName = '_syncPullCb' + (_syncCbSeq++);
    var limpiar = function() {
      clearTimeout(timeout);
      window[cbName] = function() {};
      var s = document.getElementById(cbName);
      if (s) s.remove();
    };
    var timeout = setTimeout(limpiar, 20000);
    window[cbName] = function(resp) {
      limpiar();
      try {
        if (resp && resp.valor_json != null && resp.valor_json !== localStorage.getItem(clave)) {
          localStorage.setItem(clave, resp.valor_json);
          if (onDone) onDone();
        }
      } catch (e) {}
    };
    var script = document.createElement('script');
    script.id = cbName;
    script.onerror = limpiar;
    script.src = SYNC_ENDPOINT + '?clave=' + encodeURIComponent(clave) + '&callback=' + cbName;
    document.head.appendChild(script);
  } catch (e) {}
}

// ── Sesión: token emitido por el Script al loguearse, se manda en cada pedido ──
var AUTH_TOKEN = null;
var AUTH_ROLE  = null;
function authURL(url) {
  return url + (url.indexOf('?') === -1 ? '?' : '&') + 'token=' + encodeURIComponent(AUTH_TOKEN || '');
}

// ── Estado de conexión de cada fuente remota ──────────────────────
// Antes, si fallaba un fetch remoto, la app seguía mostrando los valores
// locales sin avisar (ni a Marcelo ni al profesional) que estaban desactualizados.
// Cualquier cargarXRemoto() marca acá si su última consulta funcionó o no —
// mientras haya al menos una fallada, se ve un aviso fijo abajo de la pantalla.
var ENDPOINT_STATUS = {};
var ENDPOINT_LABELS = { gastosA: "Gastos A", liquidacion: "Liquidaciones", cajas: "Cajas" };
function marcarEndpointStatus(key, ok, errMsg) {
  ENDPOINT_STATUS[key] = { ok: ok, ts: new Date(), error: errMsg || null };
  renderEndpointStatusBanner();
}
function renderEndpointStatusBanner() {
  var fallidos = Object.keys(ENDPOINT_STATUS).filter(function(k) { return !ENDPOINT_STATUS[k].ok; });
  var el = document.getElementById("endpointStatusBanner");
  if (!fallidos.length) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = "endpointStatusBanner";
    el.style.cssText = "position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#92610f;color:#fff;"
      + "font-size:.72rem;padding:6px 12px;text-align:center;font-family:inherit;box-shadow:0 -2px 8px rgba(0,0,0,.15)";
    document.body.appendChild(el);
  }
  var nombres = fallidos.map(function(k) { return ENDPOINT_LABELS[k] || k; }).join(", ");
  var horaMasVieja = fallidos.map(function(k) { return ENDPOINT_STATUS[k].ts; }).sort(function(a,b){return a-b;})[0];
  var horaTxt = horaMasVieja.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  el.textContent = "⚠ No se pudo actualizar: " + nombres + " — mostrando datos de la última carga (intento fallido " + horaTxt + "hs).";
}

async function cargarGastosARemoto() {
  if (!GASTOS_A_ENDPOINT) return;
  try {
    var resp = await fetch(authURL(GASTOS_A_ENDPOINT));
    var data = await resp.json();
    // "unauthorized" sin AUTH_TOKEN es esperado (esta función se lanza sola al
    // cargar la página, antes de loguearse) — no es una falla real, no avisar.
    // Se vuelve a llamar ya logueado (ver Promise.all en el login) y ahí sí
    // cualquier error es real.
    if (data.error) {
      console.warn("Gastos A API error:", data.error);
      if (AUTH_TOKEN) marcarEndpointStatus("gastosA", false, data.error);
      return;
    }
    ["mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre",
     "enero","febrero","marzo","abril"].forEach(function(m) {
      if ((m in data) && data[m] !== null) GASTOS_A[m] = data[m];
    });
    console.log("Gastos A actualizados desde el sheet ✓");
    marcarEndpointStatus("gastosA", true);
  } catch(e) {
    console.warn("No se pudo cargar Gastos A remotos — usando valores locales:", e.message);
    if (AUTH_TOKEN) marcarEndpointStatus("gastosA", false, e.message);
  }
}

// Lanzar la carga en segundo plano (sin bloquear el login)
cargarGastosARemoto();

// ── URL del Apps Script Web App para liquidaciones (ceot_liquidacion_api.gs) ──
const LIQUIDACION_ENDPOINT = "https://script.google.com/macros/s/AKfycbyTQSTf6gQEXFZYgrI2MPnS8RcxKOy7M-C-UD4PZsNtqtse8iK_Jy46oK-yFAAJ8kt3yw/exec";

// Datos completos del endpoint — usados para Historial
var liquidacionData = {};
var FACTURAS_DATA = { colon: [], cem: [] };

// Override de Retención Ganancias por profesional — compartido en el Script
// (antes vivía en localStorage y solo le llegaba a quien lo hubiera cargado
// en su propio navegador; ver getAporteCeotPct más abajo).
var APORTE_PCT_REMOTO = {};
async function cargarAportePctRemoto() {
  try {
    var resp = await fetch(authURL(LIQUIDACION_ENDPOINT + '?action=leerAportePct'));
    var data = await resp.json();
    if (data.ok) APORTE_PCT_REMOTO = data.valores || {};
  } catch (e) { /* mantiene lo que ya había cargado */ }
}

async function cargarLiquidacionRemota() {
  if (!LIQUIDACION_ENDPOINT) return;
  try {
    var resp = await fetch(authURL(LIQUIDACION_ENDPOINT));
    var data = await resp.json();
    // "unauthorized" sin AUTH_TOKEN es esperado (llamada automática al cargar
    // la página, antes de loguearse) — no avisar; se vuelve a llamar ya
    // logueado (Promise.all del login) y ahí cualquier error sí es real.
    if (data.error) { if (AUTH_TOKEN) marcarEndpointStatus("liquidacion", false, data.error); return; }

    // Guardar datos completos para Historial
    liquidacionData = data;

    // ── Extraer OSDE y CM para cada período ────────────────
    // "diciembre" excluido a propósito: el endpoint devuelve datos de Dic-2025
    // (planilla vieja), no de Dic-2026 real — sacar de esta lista cuando
    // Marce confirme que la pestaña de Dic-2026 ya está cargada en el Sheet.
    ["mayo","junio","julio","agosto","septiembre","octubre","noviembre"].forEach(function(pid) {
      if (!data[pid] || !data[pid].cheques) return;
      var cheques = data[pid].cheques;

      ["osde","cm"].forEach(function(tipo) {
        var chq = cheques.find(function(c){ return c.tipo === tipo; });
        if (!chq || !chq.m) return;
        var pe = PERIOD_EXTRAS[pid] && PERIOD_EXTRAS[pid][tipo];
        if (!pe) return;
        if (!chq.pendiente) {
          Object.keys(chq.m).forEach(function(k){
            var v = chq.m[k];
            if (v != null && typeof v === "number") pe.m[k] = v;
          });
          pe.pendiente = false;
        }
      });
    });

    // ── IIBB y CPSM por profesional desde endpoint ───────────
    // Mayo/junio/julio: marcar como "cargado" aunque no haya dato (= 0, no fallback 3.5%)
    ["mayo","junio","julio"].forEach(function(pid) {
      if (!data[pid] || !data[pid].cheques) return;
      PERIODO_IIBB[pid] = {};
      PERIODO_CPSM[pid] = {};

      ["iibb","cpsm"].forEach(function(tipo) {
        var chq = data[pid].cheques.find(function(c){ return c.tipo === tipo; });
        if (!chq || chq.pendiente || !chq.m) return;
        var map = {};
        Object.keys(chq.m).forEach(function(k) {
          var entry = chq.m[k];
          if (typeof entry === "object" && entry !== null && "desc" in entry) {
            map[k] = entry.desc;
          }
        });
        if (Object.keys(map).length > 0) {
          if (tipo === "iibb") PERIODO_IIBB[pid] = map;
          else                 PERIODO_CPSM[pid] = map;
        }
      });
    });

    // Agosto: solo cargar si hay datos reales; si no, mantener null → fallback 3.5%/5%
    if (data.agosto && data.agosto.cheques) {
      ["iibb","cpsm"].forEach(function(tipo) {
        var chq = data.agosto.cheques.find(function(c){ return c.tipo === tipo; });
        if (!chq || chq.pendiente || !chq.m) return;
        var map = {};
        Object.keys(chq.m).forEach(function(k) {
          var entry = chq.m[k];
          if (typeof entry === "object" && entry !== null && "desc" in entry) {
            map[k] = entry.desc;
          }
        });
        if (Object.keys(map).length > 0) {
          if (tipo === "iibb") PERIODO_IIBB.agosto = map;
          else                 PERIODO_CPSM.agosto = map;
        }
      });
    }

    // ── Junio: reconstruir JUNIO_RAW y JUNIO_FECHAS ─────────
    if (data.junio && data.junio.cheques) {
      var colonJunio = data.junio.cheques.filter(function(c){ return c.tipo !== "osde" && c.tipo !== "cm"; });
      if (colonJunio.length > 0) {
        JUNIO_FECHAS.length = 0;
        colonJunio.forEach(function(c){ JUNIO_FECHAS.push(c.fecha); });
        JUNIO_RAW.length = 0;
        Object.keys(colonJunio[0].m).forEach(function(apiKey) {
          var doc = DOCTORES.find(function(d){ return d.apellido === apiKey; });
          var k = doc ? doc.junioKey : apiKey;
          if (!k) return; // externos no tienen junioKey
          var row = { k: k };
          colonJunio.forEach(function(chq, idx) {
            var v = chq.m[apiKey];
            row["f"+(idx+1)] = v == null ? 0 : (typeof v === "object" ? (v.bruto || 0) : v);
          });
          JUNIO_RAW.push(row);
        });
        // CPSM Julio = 5% fact. Junio, distribuido por participacion ponderada
        if (!PERIODO_CPSM.julio) {
          var junioByAp = JUNIO_RAW.map(function(r) {
            var d = DOCTORES.find(function(x){ return x.junioKey === r.k; });
            return Object.assign({}, r, { k: d ? d.apellido : r.k });
          });
          PERIODO_CPSM.julio = calcularCPSMDesde(junioByAp, PERIOD_EXTRAS.junio.osde.m);
        }
      }
    }

    // ── Julio: reconstruir JULIO_RAW y JULIO_FECHAS ─────────
    if (data.julio && data.julio.cheques) {
      var colonJulio = data.julio.cheques.filter(function(c){ return c.tipo !== "osde" && c.tipo !== "cm"; });
      if (colonJulio.length > 0) {
        JULIO_FECHAS.length = 0;
        colonJulio.forEach(function(c){ JULIO_FECHAS.push(c.fecha); });
        JULIO_RAW.length = 0;
        Object.keys(colonJulio[0].m).forEach(function(apiKey) {
          var row = { k: apiKey };
          colonJulio.forEach(function(chq, idx) {
            var v = chq.m[apiKey];
            row["f"+(idx+1)] = v == null ? 0 : (typeof v === "object" ? (v.bruto || 0) : v);
          });
          JULIO_RAW.push(row);
        });
      }
    }

    // ── Reconstruir RAW/FECHAS para agosto en adelante ──────
    // "diciembre" excluido a propósito (ver nota más arriba, mismo motivo).
    var mesesDin = {
      agosto:     { RAW: AGOSTO_RAW,     FECHAS: AGOSTO_FECHAS     },
      septiembre: { RAW: SEPTIEMBRE_RAW, FECHAS: SEPTIEMBRE_FECHAS },
      octubre:    { RAW: OCTUBRE_RAW,    FECHAS: OCTUBRE_FECHAS    },
      noviembre:  { RAW: NOVIEMBRE_RAW,  FECHAS: NOVIEMBRE_FECHAS  },
    };
    Object.keys(mesesDin).forEach(function(pid) {
      if (!data[pid] || !data[pid].cheques) return;
      var colon = data[pid].cheques.filter(function(c){ return c.tipo !== "osde" && c.tipo !== "cm"; });
      if (!colon.length) return;
      var ref = mesesDin[pid];
      ref.FECHAS.length = 0; colon.forEach(function(c){ ref.FECHAS.push(c.fecha); });
      ref.RAW.length = 0;
      Object.keys(colon[0].m).forEach(function(apiKey) {
        var row = { k: apiKey };
        colon.forEach(function(chq, idx) {
          var v = chq.m[apiKey];
          row["f"+(idx+1)] = v == null ? 0 : (typeof v === "object" ? (v.bruto || 0) : v);
        });
        ref.RAW.push(row);
      });
      // IIBB / CPSM
      ["iibb","cpsm"].forEach(function(tipo) {
        var chq = data[pid].cheques.find(function(c){ return c.tipo === tipo; });
        if (!chq || chq.pendiente || !chq.m) return;
        var map = {};
        Object.keys(chq.m).forEach(function(k) {
          var entry = chq.m[k];
          if (typeof entry === "object" && entry !== null && "desc" in entry) map[k] = entry.desc;
        });
        if (Object.keys(map).length > 0) {
          if (tipo === "iibb") PERIODO_IIBB[pid] = map;
          else                 PERIODO_CPSM[pid] = map;
        }
      });
    });

    // ── FACTURAS ─────────────────────────────────────────────────
    if (data.facturas) {
      FACTURAS_DATA = data.facturas;
      var sfBtn = document.getElementById("adm-sidenav-facturas");
      if (sfBtn && sfBtn.classList.contains("active")) renderFacturas();
    }

    // Si ya hay un doctor logueado, actualizar el historial con los nuevos datos
    if (doctorActual) renderHistorial(doctorActual);

    console.log("Liquidación actualizada desde el sheet ✓");
    marcarEndpointStatus("liquidacion", true);
  } catch(e) {
    console.warn("No se pudo cargar liquidación remota — usando valores locales:", e.message);
    if (AUTH_TOKEN) marcarEndpointStatus("liquidacion", false, e.message);
  }
}
