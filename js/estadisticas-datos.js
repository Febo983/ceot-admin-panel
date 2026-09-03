// ═══════════════════════════════════════════════════════════════════
// estadisticas-datos.js — semilla del módulo "Estadísticas CEOT".
// Datos históricos extraídos de los PDF del sistema de la clínica:
//   · CIRUGIAS 2026 (JULIO).pdf  — cirugías por año/mes, por cirujano
//     y por cobertura (ART / particular / resto).
//   · CONSULTAS 2026 (JULIO).pdf — consultas por profesional y total
//     del servicio por mes/año.
// Los datos 2026 llegan hasta JULIO. Agosto en adelante entra por el
// importador mensual del panel (ver js/estadisticas.js, EST_IMPORT).
// Solo definiciones — se carga ANTES de js/estadisticas.js.
// ═══════════════════════════════════════════════════════════════════

var EST_MESES       = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
var EST_MESES_CORTO = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// Último mes 2026 con dato en la semilla (0=enero … 6=julio).
var EST_SEED_HASTA_MES = 6;

// ── Roster de médicos que aparecen en las estadísticas ─────────────
// esProf = tiene login en el portal profesional (está en DOCTORES).
// GERLING hace solo consultas (anestesista), no tiene portal ni cirugías.
var EST_MEDICOS = [
  { key:"BRUNI",        label:"Bruni",        esProf:true  },
  { key:"CORELICH",     label:"Corelich",     esProf:true  },
  { key:"DE LA COLINA", label:"De la Colina", esProf:true  },
  { key:"DEGANUTTI",    label:"Deganutti",    esProf:true  },
  { key:"FISSER",       label:"Fisser",       esProf:true  },
  { key:"GARMENDIA",    label:"Garmendia",    esProf:true  },
  { key:"GUILERA",      label:"Guilera",      esProf:true  },
  { key:"LABAYEN",      label:"Labayen",      esProf:true  },
  { key:"LEON",         label:"León",         esProf:true  },
  { key:"MAZZOLA",      label:"Mazzola",      esProf:true  },
  { key:"PERLASCO",     label:"Perlasco",     esProf:true  },
  { key:"SOULE",        label:"Soule",        esProf:true  },
  { key:"TRIVELLINI",   label:"Trivellini",   esProf:true  },
  { key:"GERLING",      label:"Gerling",      esProf:false }
];

// Normaliza un nombre crudo del Excel mensual ("DR. CORELICH, DANIEL",
// "DRA. GARMENDIA VALERIA", "DR. DE LA COLINA, JUAN PABLO") a la clave
// del roster ("CORELICH", "GARMENDIA", "DE LA COLINA"). Devuelve el
// texto normalizado tal cual si no reconoce el apellido (el import lo
// marca en rojo en el preview).
function estKeyDeMedico(raw) {
  if (raw == null) return "";
  var s = String(raw).toUpperCase()
    .replace(/[ÁÀÄÂ]/g,"A").replace(/[ÉÈËÊ]/g,"E").replace(/[ÍÌÏÎ]/g,"I")
    .replace(/[ÓÒÖÔ]/g,"O").replace(/[ÚÙÜÛ]/g,"U")
    .replace(/^\s*(DRA?|DResa|MED)\.?\s+/,"")   // saca prefijo DR. / DRA.
    .replace(/\s+/g," ").trim();
  for (var i = 0; i < EST_MEDICOS.length; i++) {
    var k = EST_MEDICOS[i].key;
    if (s === k || s.indexOf(k + " ") === 0 || s.indexOf(k + ",") === 0) return k;
  }
  // fallback: lo anterior a la coma, o la primera palabra
  var antesComa = s.split(",")[0].trim();
  for (var j = 0; j < EST_MEDICOS.length; j++) {
    if (antesComa === EST_MEDICOS[j].key) return EST_MEDICOS[j].key;
  }
  return antesComa || s;
}

// ── SEMILLA ───────────────────────────────────────────────────────
var EST_SEED = {

  consultas: {
    // 2026, por profesional, índice 0=enero … 6=julio.
    porProf2026: {
      "CORELICH":     [174,269,348,277,286,321,344],
      "LABAYEN":      [314,291,312,292,275,244,268],
      "TRIVELLINI":   [300,290,284,265,232,267,259],
      "DEGANUTTI":    [268,453,462,390,447,430,477],
      "FISSER":       [239,180,227,236,189,237,208],
      "BRUNI":        [284,276,271,312,265,299,288],
      "GUILERA":      [191,169,188,159,165,171,176],
      "MAZZOLA":      [310,224,247,261,239,238,183],
      "GERLING":      [56,46,69,47,54,65,50],
      "DE LA COLINA": [256,269,195,271,266,200,253],
      "GARMENDIA":    [168,208,231,208,153,247,251],
      "PERLASCO":     [215,177,157,217,140,218,214],
      "LEON":         [207,163,149,104,135,187,158],
      "SOULE":        [193,184,153,135,159,246,202]
    },
    // Total del servicio por mes, por año (2017-2026). 12 posiciones;
    // null = mes sin dato todavía. Fuente: cuadro "POR MES / POR AÑO".
    totalPorMesAnual: {
      "2026": [3175,3199,3293,3174,3005,3370,3331,null,null,null,null,null],
      "2025": [3447,2879,2901,3088,3231,3051,3282,3287,3492,3541,2879,2777],
      "2024": [3305,2663,2767,3015,3262,2668,3199,3171,3121,3387,3023,2605],
      "2023": [3409,3131,3446,2695,3430,3160,3253,3651,3228,3305,3450,2786],
      "2022": [2831,2936,3347,3017,3339,3440,3395,3806,3501,3143,3442,2889],
      "2021": [2653,2402,3282,2817,2627,2779,2907,3283,3473,3286,3443,2896],
      "2020": [3707,3087,1780,616,1123,1637,2057,1986,1711,2085,2301,2238],
      "2019": [3511,3215,3264,3468,3502,3065,3644,3484,3473,3856,3360,3024],
      "2018": [3228,2804,2980,2748,3086,3045,2737,3590,3167,3541,3198,2729],
      "2017": [2624,2257,2685,2262,2605,2773,2333,3084,3062,3201,2968,2580]
    }
  },

  cirugias: {
    // Total del servicio por mes, por año (2020-2026).
    anualPorMes: {
      "2026": [139,138,129,118,110,146,138,null,null,null,null,null],
      "2025": [129,107,113,127,124,126,145,127,146,130,111,117],
      "2024": [121,118,130,171,145,127,141,129,132,138,136,93],
      "2023": [102,91,135,113,141,124,144,164,145,147,139,101],
      "2022": [99,93,109,111,128,134,126,149,139,113,123,106],
      "2021": [104,86,112,111,97,107,109,126,141,137,142,111],
      "2020": [112,82,138,23,56,55,82,98,66,76,80,85]
    },
    // 2026, por cirujano, índice 0=enero … 6=julio.
    porCirujano2026: {
      "BRUNI":        [22,18,23,22,14,31,15],
      "CORELICH":     [3,5,7,8,6,12,6],
      "DE LA COLINA": [22,19,17,22,13,13,18],
      "DEGANUTTI":    [23,18,28,21,33,21,27],
      "FISSER":       [3,7,3,6,4,2,7],
      "GARMENDIA":    [9,13,12,8,4,16,14],
      "GUILERA":      [2,1,0,3,0,1,3],
      "LABAYEN":      [8,4,9,7,3,5,3],
      "LEON":         [0,0,1,1,0,3,0],
      "MAZZOLA":      [19,13,7,3,12,10,7],
      "PERLASCO":     [17,15,16,8,11,15,20],
      "SOULE":        [1,6,0,2,4,2,8],
      "TRIVELLINI":   [10,19,6,7,6,15,10]
    },
    // 2026, cobertura por mes, índice 0=enero … 6=julio.
    //   art        — cirugías con ART
    //   particular — cirugías particulares (sin cobertura)
    //   total      — total del mes (resto obras sociales = total - art - particular)
    coberturaPorMes2026: {
      art:        [41,32,24,11,21,24,25],
      particular: [7,7,9,6,3,8,7],
      total:      [139,138,129,118,110,146,138]
    },
    // Acumulado 2026 hasta julio (del pie del PDF).
    ytd2026: { art:178, particular:47, otras:740 },
    // Desglose por obra social individual (OSDE, IOMA, PAMI, Swiss…).
    // VACÍO: el PDF actual no lo trae. Se llena cuando el Excel mensual
    // de cirugías incluya la columna de obra social.  Shape previsto:
    //   { "2026-07": { OSDE:12, IOMA:9, PAMI:4, ... }, ... }
    porObraSocial: {}
  }
};
