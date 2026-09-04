// ═══════════════════════════════════════════════════════════════════
// gastos-casa.js — Módulo "Gastos Casa" · obra 14 de Julio 2067.
//
//   · Libro de movimientos (gastos + aportes de capital), 100% editable.
//   · Se agregan movimientos nuevos desde el panel — autocompleta proveedor,
//     rubro, método y alias/CBU al tipear el concepto; sólo cargás el importe.
//   · Gráficos: gasto por rubro (torta) + aporte por profesional (barras).
//   · Detalle del aporte de cada profesional (comprometido vs aportado).
//   · Exporta a Excel (SheetJS) y a PDF (jsPDF) — ambas ya cargadas en el head.
//
//   Persistencia: localStorage 'ceot_gastos_casa' (+ 'ceot_gastos_casa_cfg')
//   espejado con syncPush/syncPull, igual que el resto de los módulos
//   editables. El Sheet NO se toca: la fuente de verdad pasa a ser el panel.
//   El SEED de abajo se bajó del Google Sheet "liquidaciones CEOT actualizado"
//   (pestaña APORTES 14 DE JULIO 2067) vía gviz — 99 filas del libro + 10 filas
//   de "primer aporte" por profesional (columna PRIMER APORTE de la grilla, suma
//   $76.800.000 = saldo inicial del fondo) + 1 fila de ajuste. Rubros clasificados
//   automáticamente por palabras clave.
// ═══════════════════════════════════════════════════════════════════

var GC_K      = "ceot_gastos_casa";       // [] de movimientos
var GC_K_CFG  = "ceot_gastos_casa_cfg";   // { comprometido:{SOCIO:n}, apertura:n }
var _gcPulled = false;
var _gcCharts = {};
var _gcFiltroRubro = "";
var _gcFiltroTxt = "";
var _gcEditando = false;

// Saldo con el que arranca el libro. Va en 0: el fondo se llena con las 10 filas
// de "primer aporte" por profesional que abren el SEED (suman $76.800.000).
var GC_APERTURA_DEFAULT = 0;

// ── Rubros (orden fijo + color para torta/barras) ──────────────────
var GC_RUBROS = [
  "Mano de obra / albañilería", "Plomería", "Sanitarios / grifería / gas",
  "Cerámicos / pegamento", "Zinguería", "Techista", "Membrana / impermeabilización",
  "Herrería / hierros / acero", "Electricidad", "Aire acondicionado",
  "Durlock / placas", "Yesería", "Pintura", "Maderas", "Aberturas", "Alarma",
  "Jardinería", "Volquetes / contenedores", "Fletes", "Honorarios ingeniero",
  "Honorarios arquitecta", "Cableado Constitución 4901", "Otros"
];
var GC_RUBRO_COLOR = {
  "Mano de obra / albañilería": "#8c5a2b", "Plomería": "#2f7ea8",
  "Sanitarios / grifería / gas": "#4aa3b8", "Cerámicos / pegamento": "#c9933a",
  "Zinguería": "#7a8b99", "Techista": "#a0522d", "Membrana / impermeabilización": "#6b4f3a",
  "Herrería / hierros / acero": "#5c6b73", "Electricidad": "#d4a017",
  "Aire acondicionado": "#5b9aa0", "Durlock / placas": "#b0a58f", "Yesería": "#cfc3a8",
  "Pintura": "#b1483f", "Maderas": "#9c6b3f", "Aberturas": "#7d6b53", "Alarma": "#8a6d9c",
  "Jardinería": "#5a8f3d", "Volquetes / contenedores": "#8f7b5a", "Fletes": "#a98d5f",
  "Honorarios ingeniero": "#4f7f7a", "Honorarios arquitecta": "#4f6f8f",
  "Cableado Constitución 4901": "#6b6a5a", "Otros": "#9a8c78", "Aporte de capital": "#1f3a2e"
};

// ── Profesionales / socios (apellido tal como aparece en el Sheet) ──
// comprometido = lo declarado en la grilla "APORTES PARA 14 DE JULIO 2067".
var GC_SOCIOS = [
  { k: "GARMENDIA",     n: "Garmendia, Valeria",           comprometido: 22189400 }, // $3.740.000 + US$ 12.680 @ $1.455
  { k: "BRUNI",         n: "Bruni, Maximiliano E.",         comprometido: 30000000 },
  { k: "CORELICH",      n: "Corelich, Daniel O.",           comprometido: 30000000 },
  { k: "DEGANUTTI",     n: "Deganutti, Cristian G.",        comprometido: 40000000 },
  { k: "LABAYEN",       n: "Labayen, Daniel G.",            comprometido: 36000000 },
  { k: "TRIVELLINI",    n: "Trivellini, Amilcar",           comprometido: 30000000 },
  { k: "DE LA COLINA",  n: "De la Colina, Juan P.",         comprometido: 5000000 },
  { k: "LEON",          n: "León, Joaquín E.",              comprometido: 5000000 },
  { k: "MAZZOLA",       n: "Mazzola, Maximiliano T.",       comprometido: 5000000 },
  { k: "PERLASCO",      n: "Perlasco, Camilo N.",           comprometido: 6800000 },
  { k: "SOULE",         n: "Soule, Iván",                   comprometido: 5000000 }
];

// ── Diccionario de autocompletado ─────────────────────────────────
// Base: la agenda de proveedores de la obra (OBRA_AGENDA_SEED, mismo 14 de
// Julio 2067) — trae rubro, alias y CBU ya cargados. Si ese seed no está,
// el módulo igual funciona, sólo sin sugerencias.
function gcDiccionario() {
  var base = (typeof OBRA_AGENDA_SEED !== "undefined" ? OBRA_AGENDA_SEED : []).map(function (s) {
    return { term: s.n, rubro: s.r || "Otros", metodo: "Transferencia", destino: s.d || s.a || "", cuit: s.c || "" };
  });
  // Conceptos "genéricos" frecuentes en el libro que no matchean un proveedor.
  base.push({ term: "inyeccion de capital", rubro: "Aporte de capital", metodo: "Transferencia", destino: "", cuit: "" });
  base.push({ term: "aporte capital", rubro: "Aporte de capital", metodo: "Transferencia", destino: "", cuit: "" });
  base.push({ term: "aporte inicial", rubro: "Aporte de capital", metodo: "Transferencia", destino: "", cuit: "" });
  // Lo ya cargado en el propio libro (aprende de lo que fuiste tipeando).
  gcLeer().forEach(function (m) {
    if (m.c && !base.some(function (b) { return gcNorm(b.term) === gcNorm(m.c); })) {
      base.push({ term: m.c, rubro: m.rubro || "Otros", metodo: m.m || "Transferencia", destino: m.d || "", cuit: m.cuit || "" });
    }
  });
  return base;
}
function gcAutocompletar(concepto) {
  var t = gcNorm(concepto);
  if (!t) return null;
  var best = null, bestLen = 0;
  gcDiccionario().forEach(function (e) {
    var n = gcNorm(e.term);
    if (!n) return;
    var hit = (t.indexOf(n) !== -1 || n.indexOf(t) !== -1);
    if (hit && n.length > bestLen) { best = e; bestLen = n.length; }
  });
  return best;
}

// ═══════ SEED — importado del Google Sheet "liquidaciones CEOT actualizado" (pestaña APORTES 14 DE JULIO 2067) ═══════
// Bajado vía gviz el 2026-09-04. f=fecha ISO · c=concepto · m=método · d=alias/CBU · fac=factura
// imp=importe · sSheet="Saldo Actual" que tenía esa fila en la planilla (referencia, no se usa para calcular) ·
// tipo="gasto"|"aporte" · socio=clave (si es aporte) · noFondo=true: aporte que no entra al fondo común (se pagó directo).
// El rubro se clasificó automáticamente por palabras clave — corregilo donde no acierte.
// La última fila "Ajustes de saldo de la planilla" ($14.529.773) NO es un gasto real: son las correcciones
// que el contador hizo directo sobre la columna Saldo del Sheet sin cargarlas como movimiento. Está para que
// el total cierre en $35.515.331 igual que la planilla. Se va reduciendo a medida que se itemicen esas correcciones.
var GC_SEED = [
  // Primer aporte de cada profesional (columna PRIMER APORTE de la grilla, suma exacta $76.800.000
  // = saldo con el que el fondo arranca antes del primer gasto). Fecha estimada — ajustá si tenés la real.
  { f: "2026-03-01", c: "Primer aporte · Bruni", m: "Transferencia", d: "", fac: "", imp: 10000000, sSheet: null, tipo: "aporte", socio: "BRUNI", rubro: "Aporte de capital" },
  { f: "2026-03-01", c: "Primer aporte · Corelich", m: "Transferencia", d: "", fac: "", imp: 10000000, sSheet: null, tipo: "aporte", socio: "CORELICH", rubro: "Aporte de capital" },
  { f: "2026-03-01", c: "Primer aporte · De la Colina", m: "Transferencia", d: "", fac: "", imp: 5000000, sSheet: null, tipo: "aporte", socio: "DE LA COLINA", rubro: "Aporte de capital" },
  { f: "2026-03-01", c: "Primer aporte · Deganutti", m: "Transferencia", d: "", fac: "", imp: 10000000, sSheet: null, tipo: "aporte", socio: "DEGANUTTI", rubro: "Aporte de capital" },
  { f: "2026-03-01", c: "Primer aporte · Labayen", m: "Transferencia", d: "", fac: "", imp: 10000000, sSheet: null, tipo: "aporte", socio: "LABAYEN", rubro: "Aporte de capital" },
  { f: "2026-03-01", c: "Primer aporte · León", m: "Transferencia", d: "", fac: "", imp: 5000000, sSheet: null, tipo: "aporte", socio: "LEON", rubro: "Aporte de capital" },
  { f: "2026-03-01", c: "Primer aporte · Mazzola", m: "Transferencia", d: "", fac: "", imp: 5000000, sSheet: null, tipo: "aporte", socio: "MAZZOLA", rubro: "Aporte de capital" },
  { f: "2026-03-01", c: "Primer aporte · Perlasco", m: "Transferencia", d: "", fac: "", imp: 6800000, sSheet: null, tipo: "aporte", socio: "PERLASCO", rubro: "Aporte de capital" },
  { f: "2026-03-01", c: "Primer aporte · Soule", m: "Transferencia", d: "", fac: "", imp: 5000000, sSheet: null, tipo: "aporte", socio: "SOULE", rubro: "Aporte de capital" },
  { f: "2026-03-01", c: "Primer aporte · Trivellini", m: "Transferencia", d: "", fac: "", imp: 10000000, sSheet: 76800000, tipo: "aporte", socio: "TRIVELLINI", rubro: "Aporte de capital" },
  { f: "2026-03-16", c: "GM Sanitarios Srl", m: "Transferencia", d: "0170235620000000471286", fac: "A0004-00020099", imp: 5837260, sSheet: 70962740, tipo: "gasto", rubro: "Sanitarios / grifería / gas" },
  { f: "2026-03-19", c: "Mano de obra Plomeria", m: "Transferencia", d: "Sur.idea.bozal", fac: "FC0001-000183", imp: 4230000, sSheet: 66732740, tipo: "gasto", rubro: "Plomería" },
  { f: "2026-03-25", c: "Lopez lucas (Jardineria)", m: "Transferencia", d: "Jardineria.sosa17", fac: "", imp: 545000, sSheet: 66187740, tipo: "gasto", rubro: "Jardinería" },
  { f: "2026-03-26", c: "March Ceram", m: "Transferencia", d: "CERAMICO.PEGAMENTO", fac: "", imp: 123470.67, sSheet: 66064269.33, tipo: "gasto", rubro: "Cerámicos / pegamento" },
  { f: "2026-03-27", c: "Bertello Luis", m: "Transferencia", d: "aforo.aleta.edad", fac: "", imp: 85000, sSheet: 65979269.33, tipo: "gasto", rubro: "Volquetes / contenedores" },
  { f: "2026-04-07", c: "Mano de obra Plomeria", m: "Transferencia", d: "lucas.273.ajeno.mp", fac: "FC0001-000184", imp: 3000000, sSheet: 62979269.33, tipo: "gasto", rubro: "Plomería" },
  { f: "2026-04-14", c: "Raptor Monocomando Bañera C/T CROMO HIDROMET", m: "Transferencia", d: "0110350020035000580450", fac: "FC A 0022-00019347", imp: 137175.57, sSheet: 62842093.33, tipo: "gasto", rubro: "Sanitarios / grifería / gas" },
  { f: "2026-04-14", c: "Honorarios Ingeniero", m: "Transferencia", d: "pedropronzati.mp", fac: "", imp: 300000, sSheet: 62542093.33, tipo: "gasto", rubro: "Honorarios ingeniero" },
  { f: "2026-04-17", c: "Instalacion Alarma", m: "Transferencia", d: "2850684130094215735601", fac: "", imp: 776462.61, sSheet: 61765630.72, tipo: "gasto", rubro: "Alarma" },
  { f: "2026-04-22", c: "Honorarios Plomeria", m: "Transferencia", d: "Sur.idea.bozal", fac: "", imp: 3000000, sSheet: 58279679.74, tipo: "gasto", rubro: "Plomería" },
  { f: "2026-04-27", c: "Honorarios Herrero", m: "Transferencia", d: "walter.annese75", fac: "", imp: 840000, sSheet: 51057999.74, tipo: "gasto", rubro: "Herrería / hierros / acero" },
  { f: "2026-04-27", c: "Materiales aire acondicionado", m: "Transferencia", d: "jony.aire", fac: "", imp: 416675, sSheet: 50641324.74, tipo: "gasto", rubro: "Aire acondicionado" },
  { f: "2026-04-27", c: "GM SANITARIOS SRL GM SANITARIOS", m: "Transferencia", d: "CC $ 0235-004712/8", fac: "", imp: 530925, sSheet: 50110399.74, tipo: "gasto", rubro: "Sanitarios / grifería / gas" },
  { f: "2026-04-30", c: "honorarios Aire acondicionado", m: "Transferencia", d: "jony.aire", fac: "", imp: 450000, sSheet: 57829679.74, tipo: "gasto", rubro: "Aire acondicionado" },
  { f: "2026-04-30", c: "Aporte capital · Dra. Garmendia — US$ 12.680 @ $1.455, pagado directo a Aberturas ANAYA (50%)", m: "Transferencia", d: "", fac: "Aberturas ANAYA (50%)", imp: 18449400, sSheet: null, tipo: "aporte", socio: "GARMENDIA", rubro: "Aporte de capital", noFondo: true },
  { f: "2026-04-30", c: "Aberturas ANAYA (20%)", m: "Transferencia", d: "0150865702000100676406", fac: "", imp: 5931680, sSheet: 51897999.74, tipo: "gasto", rubro: "Aberturas" },
  { f: "2026-06-02", c: "Toletum", m: "Transferencia", d: "0140466501619005138383", fac: "", imp: 2478536.99, sSheet: 37016840.38, tipo: "gasto", rubro: "Zinguería" },
  { f: "2026-06-02", c: "Alejandro Ruben Silva", m: "Transferencia", d: "0150524501000132432556", fac: "", imp: 1575000, sSheet: 35441840.38, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-06-04", c: "Daniel Gomez", m: "Transferencia", d: "0000003100024631570262", fac: "", imp: 600000, sSheet: 34841840.38, tipo: "gasto", rubro: "Durlock / placas" },
  { f: "2026-06-04", c: "Alejandro Ruben silva", m: "Transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 3025000, sSheet: 31816840.38, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-06-04", c: "Julio Diaz", m: "Transferencia", d: "sprinter99", fac: "", imp: 40000, sSheet: 31776840.38, tipo: "gasto", rubro: "Fletes" },
  { f: "2026-06-04", c: "MARCH CERAM SA", m: "Transferencia", d: "CERAMICO.PEGAMENTO", fac: "", imp: 751803.02, sSheet: 31025037.36, tipo: "gasto", rubro: "Cerámicos / pegamento" },
  { f: "2026-06-04", c: "PLASTIGAS", m: "Transferencia", d: "0140401601618900587649", fac: "", imp: 572551.63, sSheet: 30452485.73, tipo: "gasto", rubro: "Sanitarios / grifería / gas" },
  { f: "2026-06-04", c: "SERVISTEEL MAR DEL PLATA SRL", m: "Transferencia", d: "0720459720000000044604", fac: "", imp: 1571898.2, sSheet: 28880587.53, tipo: "gasto", rubro: "Herrería / hierros / acero" },
  { f: "2026-06-05", c: "Electricista", m: "Transferencia", d: "alejandro.1364", fac: "", imp: 1000000, sSheet: 27880587.53, tipo: "gasto", rubro: "Electricidad" },
  { f: "2026-06-09", c: "Plomeria honorarios", m: "Transferencia", d: "Jmg.flia", fac: "", imp: 1000000, sSheet: 26880587.53, tipo: "gasto", rubro: "Plomería" },
  { f: "2026-06-11", c: "Alejandro Ruben silva", m: "Transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 3025000, sSheet: 23855587.53, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-06-17", c: "MARCH CERAM SA", m: "Transferencia", d: "CERAMICO.PEGAMENTO", fac: "", imp: 1048597.11, sSheet: 22806990.42, tipo: "gasto", rubro: "Cerámicos / pegamento" },
  { f: "2026-06-17", c: "ASERRADERO JESKE SRL", m: "Transferencia", d: "0720212620000000481140", fac: "", imp: 196200, sSheet: 22610790.42, tipo: "gasto", rubro: "Maderas" },
  { f: "2026-06-17", c: "Julio Diaz", m: "Transferencia", d: "sprinter99", fac: "", imp: 40000, sSheet: 22570790.42, tipo: "gasto", rubro: "Fletes" },
  { f: "2026-06-17", c: "Bertello Luis (1 contenedor)", m: "Transferencia", d: "Aforo aleta.edad", fac: "", imp: 90000, sSheet: 22480790.42, tipo: "gasto", rubro: "Volquetes / contenedores" },
  { f: "2026-06-18", c: "TERMO ATLANTICA S A", m: "Transferencia", d: "0070166820000001810451", fac: "", imp: 15880161, sSheet: 6600629.42, tipo: "gasto", rubro: "Sanitarios / grifería / gas" },
  { f: "2026-06-18", c: "Alejandro Ruben silva", m: "Transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 3025000, sSheet: 3575629.42, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-06-23", c: "Federico Javier López", m: "transferencia", d: "EstiLop", fac: "", imp: 240000, sSheet: 3335629.42, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-06-23", c: "Bertello Luis", m: "transferencia", d: "Aforo aleta.edad", fac: "", imp: 90000, sSheet: 3245629.42, tipo: "gasto", rubro: "Volquetes / contenedores" },
  { f: "2026-06-25", c: "Alejandro Ruben silva", m: "Transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 3025000, sSheet: 220629.42, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-06-26", c: "Alejandro Ruben silva", m: "Transferencia", d: "ARPA.TANQUE.MAMA", fac: "Diferencia no abonada el 25", imp: 605000, sSheet: -384370.58, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-06-26", c: "Electricista", m: "Transferencia", d: "alejandro.1364", fac: "", imp: 1000000, sSheet: -1384370.58, tipo: "gasto", rubro: "Electricidad" },
  { f: "2026-06-29", c: "Transferencia Dr.Deganutti", m: "Transferencia", d: "", fac: "", imp: 10000000, sSheet: 8616000, tipo: "aporte", socio: "DEGANUTTI", rubro: "Aporte de capital" },
  { f: "2026-07-02", c: "Alejandro Ruben silva", m: "Transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 4840000, sSheet: 3776000, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-07-06", c: "Aporte Dra. Garmendia", m: "transferencia", d: "restan $3.170.000", fac: "", imp: 1000000, sSheet: 4170000, tipo: "aporte", socio: "GARMENDIA", rubro: "Aporte de capital" },
  { f: "2026-07-08", c: "Alejandro Ruben silva", m: "Transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 4840000, sSheet: -670000, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-07-08", c: "Transferencia Dr.Corelich", m: "Transferencia", d: "", fac: "", imp: 19900000, sSheet: 19230000, tipo: "aporte", socio: "CORELICH", rubro: "Aporte de capital" },
  { f: "2026-07-13", c: "Bertello Luis", m: "transferencia", d: "Aforo aleta.edad", fac: "", imp: 270000, sSheet: 18960000, tipo: "gasto", rubro: "Volquetes / contenedores" },
  { f: "2026-07-15", c: "Alejandro Ruben silva", m: "transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 4840000, sSheet: 13850000, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-07-15", c: "Bertello Luis", m: "transferencia", d: "Aforo aleta.edad", fac: "", imp: 90000, sSheet: 13760000, tipo: "gasto", rubro: "Volquetes / contenedores" },
  { f: "2026-07-15", c: "Héctor Marcelo frías", m: "transferencia", d: "Bolsa.china.blonda", fac: "", imp: 3000000, sSheet: 10760000, tipo: "gasto", rubro: "Techista" },
  { f: "2026-07-16", c: "Transferencia Dr.Bruni", m: "transferencia", d: "", fac: "", imp: 19369272.94, sSheet: 29369272.94, tipo: "aporte", socio: "BRUNI", rubro: "Aporte de capital" },
  { f: "2026-07-16", c: "transferencia Dr. Deganutti", m: "transferencia", d: "", fac: "", imp: 10000000, sSheet: 39000000, tipo: "aporte", socio: "DEGANUTTI", rubro: "Aporte de capital" },
  { f: "2026-07-17", c: "transferencia Dr. Labayen", m: "transferencia", d: "", fac: "", imp: 20000000, sSheet: 59000000, tipo: "aporte", socio: "LABAYEN", rubro: "Aporte de capital" },
  { f: "2026-07-23", c: "Constitucion 4901", m: "transferencia", d: "30718517733", fac: "", imp: 1790261.35, sSheet: 57209738.65, tipo: "gasto", rubro: "Cableado Constitución 4901" },
  { f: "2026-07-23", c: "Alejandro Ruben silva", m: "transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 7260000, sSheet: 49949738.65, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-07-23", c: "Silva Franco", m: "transferencia", d: "20388319705", fac: "", imp: 142600, sSheet: 49807138.65, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-07-24", c: "Bertello Luis", m: "transferencia", d: "Aforo aleta.edad", fac: "", imp: 90000, sSheet: 49717138.65, tipo: "gasto", rubro: "Volquetes / contenedores" },
  { f: "2026-07-24", c: "honorarios Aire acondicionado", m: "Transferencia", d: "jony.aire", fac: "", imp: 1000000, sSheet: 48717138.65, tipo: "gasto", rubro: "Aire acondicionado" },
  { f: "2026-07-24", c: "Dra. Garmendia", m: "Transferencia", d: "", fac: "", imp: 1000000, sSheet: 49717138.65, tipo: "aporte", socio: "GARMENDIA", rubro: "Aporte de capital" },
  { f: "2026-07-29", c: "MARCH CERAM SA", m: "Transferencia", d: "CERAMICO.PEGAMENTO", fac: "", imp: 702155.27, sSheet: 49014983.38, tipo: "gasto", rubro: "Cerámicos / pegamento" },
  { f: "2026-07-29", c: "Alejandro Ruben silva", m: "transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 7260000, sSheet: 41754983.38, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-07-29", c: "Hierros FAULE", m: "transferencia", d: "Cobre.Banana.Grano", fac: "", imp: 1825137.79, sSheet: 39929845.59, tipo: "gasto", rubro: "Herrería / hierros / acero" },
  { f: "2026-07-30", c: "Marcos Cristobal Asensio (yesos)", m: "transferencia", d: "marcos.yeso.mp", fac: "", imp: 400000, sSheet: 39529845.59, tipo: "gasto", rubro: "Yesería" },
  { f: "2026-07-30", c: "MARCH CERAM SA", m: "Transferencia", d: "CERAMICO.PEGAMENTO", fac: "", imp: 111240.67, sSheet: 39418604.92, tipo: "gasto", rubro: "Cerámicos / pegamento" },
  { f: "2026-08-04", c: "cableado constitución 4901", m: "transferencia", d: "CC $ 0094-351474/7", fac: "", imp: 2100000, sSheet: 37318604.92, tipo: "gasto", rubro: "Cableado Constitución 4901" },
  { f: "2026-08-04", c: "MARCH CERAM SA", m: "Transferencia", d: "CERAMICO.PEGAMENTO", fac: "", imp: 106544.87, sSheet: 37212060.05, tipo: "gasto", rubro: "Cerámicos / pegamento" },
  { f: "2026-08-04", c: "materiales tech sider group", m: "Transferencia", d: "0070122420000005950717", fac: "", imp: 2714717, sSheet: 34497343.05, tipo: "gasto", rubro: "Herrería / hierros / acero" },
  { f: "2026-08-04", c: "Alejandro Ruben silva", m: "transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 6050000, sSheet: 28447343.05, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-08-04", c: "GH construcciones", m: "transferencia", d: "0720067020000001013522", fac: "", imp: 165294.47, sSheet: 28282045.58, tipo: "gasto", rubro: "Herrería / hierros / acero" },
  { f: "2026-08-04", c: "zingueria  Toletum srl", m: "transferencia", d: "0140466501619005138383", fac: "", imp: 858631, sSheet: 27423414.58, tipo: "gasto", rubro: "Zinguería" },
  { f: "2026-08-04", c: "Pérez Rivera  maderas", m: "transferencia", d: "0070084920000030433140", fac: "", imp: 282400, sSheet: 27141014.58, tipo: "gasto", rubro: "Maderas" },
  { f: "2026-08-05", c: "Electricista", m: "transferencia", d: "SICMAGALICIA", fac: "", imp: 2420000, sSheet: 24721014.58, tipo: "gasto", rubro: "Electricidad" },
  { f: "2026-08-11", c: "Toletum (zingueria)", m: "transferencia", d: "0140466501619005138383", fac: "", imp: 133670, sSheet: 24587344.58, tipo: "gasto", rubro: "Zinguería" },
  { f: "2026-08-11", c: "Bertello Luis ( contenedor)", m: "transferencia", d: "Aforo aleta.edad", fac: "", imp: 90000, sSheet: 24497344.58, tipo: "gasto", rubro: "Volquetes / contenedores" },
  { f: "2026-08-11", c: "Marcos Asensio (yesero)", m: "transferencia", d: "0000003100064311104471", fac: "", imp: 700000, sSheet: 23797344.58, tipo: "gasto", rubro: "Yesería" },
  { f: "2026-08-11", c: "Nuevo Frio (repuestos)", m: "transferencia", d: "CC $ 090-412829/3", fac: "", imp: 245760, sSheet: 23551584.58, tipo: "gasto", rubro: "Sanitarios / grifería / gas" },
  { f: "2026-08-13", c: "Alejandro Ruben silva", m: "transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 4840000, sSheet: 18711574.58, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-08-13", c: "Electricista", m: "transferencia", d: "SICMAGALICIA", fac: "", imp: 1850000, sSheet: 16861574.58, tipo: "gasto", rubro: "Electricidad" },
  { f: "2026-08-13", c: "zingueria  Toletum srl", m: "transferencia", d: "0140466501619005138383", fac: "", imp: 133670, sSheet: 16727904.58, tipo: "gasto", rubro: "Zinguería" },
  { f: "2026-08-13", c: "Techista: HECTOR MARCELO,FRIAS", m: "transferencia", d: "0140323503420072541219", fac: "", imp: 3000000, sSheet: 13727904.58, tipo: "gasto", rubro: "Techista" },
  { f: "2026-08-19", c: "GM SANITARIOS SRL GM SANITARIOS", m: "Transferencia", d: "CC $ 0235-004712/8", fac: "", imp: 3013800, sSheet: 10714104.58, tipo: "gasto", rubro: "Sanitarios / grifería / gas" },
  { f: "2026-08-20", c: "Alejandro Ruben silva", m: "transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 4000000, sSheet: 6714104.58, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-08-20", c: "Durlero", m: "transferencia", d: "daniel.gomez.id", fac: "", imp: 500000, sSheet: 6214104.58, tipo: "gasto", rubro: "Durlock / placas" },
  { f: "2026-08-20", c: "Techista: HECTOR MARCELO,FRIAS", m: "transferencia", d: "0140323503420072541219", fac: "", imp: 2500000, sSheet: 3704104.58, tipo: "gasto", rubro: "Techista" },
  { f: "2026-08-21", c: "MARCH CERAM SA", m: "Transferencia", d: "CERAMICO.PEGAMENTO", fac: "", imp: 147238.67, sSheet: 3566865.91, tipo: "gasto", rubro: "Cerámicos / pegamento" },
  { f: "2026-08-25", c: "Dra. Garmendia", m: "Transferencia", d: "", fac: "", imp: 2170400, sSheet: 4313381.48, tipo: "aporte", socio: "GARMENDIA", rubro: "Aporte de capital" },
  { f: "2026-08-25", c: "Dr. Trivellini", m: "Transferencia", d: "", fac: "", imp: 19865431, sSheet: 24178812.48, tipo: "aporte", socio: "TRIVELLINI", rubro: "Aporte de capital" },
  { f: "2026-08-31", c: "Marcos Cristobal Asensio (yesero)", m: "transferencia", d: "0000003100064311104471", fac: "", imp: 500000, sSheet: 23678812, tipo: "gasto", rubro: "Yesería" },
  { f: "2026-08-27", c: "MARCOS DANIEL,AGUIRRE (membrana)", m: "transferencia", d: "0140442903610552049689", fac: "", imp: 300000, sSheet: 23378812, tipo: "gasto", rubro: "Membrana / impermeabilización" },
  { f: "2026-08-27", c: "Pablo Daniel Gomez", m: "transferencia", d: "0000003100024631570262", fac: "", imp: 800000, sSheet: 22578812, tipo: "gasto", rubro: "Durlock / placas" },
  { f: "2026-08-27", c: "SILVA FRANCO EXEQUIEL", m: "transferencia", d: "0720459788000035986786", fac: "", imp: 1500000, sSheet: 21078812, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-08-27", c: "march", m: "Transferencia", d: "CERAMICO.PEGAMENTO", fac: "", imp: 363481.67, sSheet: 27715331, tipo: "gasto", rubro: "Cerámicos / pegamento" },
  { f: "2026-08-27", c: "Alejandro Ruben silva", m: "transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 2500000, sSheet: 18215331, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-09-02", c: "Inyeccion capital LABAYEN", m: "transferencia", d: "", fac: "", imp: 6000000, sSheet: 24215331, tipo: "aporte", socio: "LABAYEN", rubro: "Aporte de capital" },
  { f: "2026-09-03", c: "Inyeccion capital DEGANUTTI", m: "transferencia", d: "de honorarios", fac: "", imp: 10000000, sSheet: 34215331, tipo: "aporte", socio: "DEGANUTTI", rubro: "Aporte de capital" },
  { f: "2026-09-03", c: "Durlero", m: "transferencia", d: "daniel.gomez.id", fac: "", imp: 1500000, sSheet: 32715331, tipo: "gasto", rubro: "Durlock / placas" },
  { f: "2026-09-03", c: "Albañil Franco Silva", m: "transferencia", d: "construcciones.obras", fac: "", imp: 1500000, sSheet: 31215331, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-09-03", c: "Alejandro Ruben silva", m: "transferencia", d: "ARPA.TANQUE.MAMA", fac: "", imp: 2500000, sSheet: 28715331, tipo: "gasto", rubro: "Mano de obra / albañilería" },
  { f: "2026-09-03", c: "Electricista", m: "transferencia", d: "Alejandro.1364", fac: "", imp: 2000000, sSheet: 26715331, tipo: "gasto", rubro: "Electricidad" },
  { f: "2026-09-03", c: "Pintor", m: "transferencia", d: "Marcelo.parrado.04", fac: "", imp: 1200000, sSheet: 25515331, tipo: "gasto", rubro: "Pintura" },
  { f: "2026-09-02", c: "Inyeccion capital CORELICH", m: "transferencia", d: "", fac: "", imp: 5000000, sSheet: 30515331, tipo: "aporte", socio: "CORELICH", rubro: "Aporte de capital" },
  { f: "2026-09-03", c: "Inyeccion capital TRIVELLINI", m: "transferencia", d: "", fac: "", imp: 5000000, sSheet: 35515331, tipo: "aporte", socio: "TRIVELLINI", rubro: "Aporte de capital" },
  { f: "2026-09-03", c: "Ajustes de saldo de la planilla (correcciones del contador, no itemizados)", m: "—", d: "", fac: "", imp: 14529773.38, sSheet: 35515331, tipo: "gasto", rubro: "Otros" }
];

// ── helpers ───────────────────────────────────────────────────────
function gcUID() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function gcNorm(s) {
  return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
}
function gcEsc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function gcNum(s) {
  if (typeof s === "number") return isNaN(s) ? 0 : s;
  s = String(s == null ? "" : s).replace(/[^\d,.-]/g, "");
  if (s.indexOf(",") > -1 && s.indexOf(".") > -1) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.indexOf(",") > -1) s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.indexOf(".") > -1 && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "");
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function gcFmt(n) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(Math.round(n || 0));
}
function gcFmtPDF(n) { return "$ " + Math.round(n || 0).toLocaleString("es-AR"); }
function gcFechaAR(iso) {
  if (!iso || iso.indexOf("-") === -1) return iso || "";
  var p = iso.split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}

function gcLeer() {
  try { var v = JSON.parse(localStorage.getItem(GC_K)); if (Array.isArray(v)) return v; }
  catch (e) {}
  // primera vez: sembrar
  var seed = GC_SEED.map(function (r) {
    return {
      id: gcUID(), f: r.f, c: r.c, m: r.m || "Transferencia", d: r.d || "", fac: r.fac || "",
      imp: r.imp, tipo: r.tipo || "gasto", socio: r.socio || "", rubro: r.rubro || "Otros",
      sSheet: (r.sSheet == null ? null : r.sSheet), noFondo: !!r.noFondo
    };
  });
  gcGuardar(seed);
  return seed;
}
function gcGuardar(arr) {
  try { localStorage.setItem(GC_K, JSON.stringify(arr)); if (typeof syncPush === "function") syncPush(GC_K); } catch (e) {}
}
function gcCfg() {
  try { var v = JSON.parse(localStorage.getItem(GC_K_CFG)); if (v && typeof v === "object") return v; }
  catch (e) {}
  return { comprometido: {}, apertura: GC_APERTURA_DEFAULT };
}
function gcCfgGuardar(c) {
  try { localStorage.setItem(GC_K_CFG, JSON.stringify(c)); if (typeof syncPush === "function") syncPush(GC_K_CFG); } catch (e) {}
}

// ── cálculo: recorre el libro en orden y arma saldo + totales ──────
// El saldo se calcula sumando los movimientos (aporte +, gasto −), NO se toma
// de la columna del Sheet. Los aportes con noFondo (ej. el USD que se pagó
// directo al proveedor) suman al total del socio pero NO al saldo del fondo.
function gcCalcular() {
  var mov = gcLeer();
  var cfg = gcCfg();
  var saldo = gcNum(cfg.apertura);
  var totGasto = 0, totAporte = 0, totAporteFondo = 0, totAporteExt = 0;
  var porRubro = {}, porSocio = {};
  var filas = mov.map(function (m) {
    var imp = gcNum(m.imp);
    if (m.tipo === "aporte") {
      totAporte += imp;
      if (m.noFondo) { totAporteExt += imp; }
      else { saldo += imp; totAporteFondo += imp; }
      var sk = m.socio || "SIN ASIGNAR";
      if (!porSocio[sk]) porSocio[sk] = { ars: 0, n: 0 };
      porSocio[sk].ars += imp;
      porSocio[sk].n++;
    } else {
      saldo -= imp;
      totGasto += imp;
      var rk = m.rubro || "Otros";
      porRubro[rk] = (porRubro[rk] || 0) + imp;
    }
    return { m: m, saldo: m.noFondo ? null : saldo };
  });
  return {
    filas: filas, saldo: saldo, totGasto: totGasto, totAporte: totAporte,
    totAporteFondo: totAporteFondo, totAporteExt: totAporteExt,
    porRubro: porRubro, porSocio: porSocio, n: mov.length, apertura: gcNum(cfg.apertura)
  };
}

// ═══════ RENDER ═══════════════════════════════════════════════════
function renderGastosCasa() {
  if (typeof cerrarAdmSidenav === "function") cerrarAdmSidenav();
  if (typeof admDesactivarSidebar === "function") admDesactivarSidebar();
  var b = document.getElementById("adm-sidenav-gastoscasa");
  if (b) b.className = "adm-sidenav-btn active";

  if (!_gcPulled && typeof syncPull === "function") {
    _gcPulled = true;
    syncPull(GC_K, function () { if (document.getElementById("gcRoot")) renderGastosCasa(); });
    syncPull(GC_K_CFG, function () { if (document.getElementById("gcRoot")) renderGastosCasa(); });
  }

  var c = gcCalcular();
  var cont = document.getElementById("adm-content");
  if (!cont) return;

  // —— KPIs ——
  var kpis =
    '<div class="adm-kpis" style="flex-wrap:wrap">' +
      gcKpi("Aportado (capital)", gcFmt(c.totAporte), c.totAporteExt ? (gcFmt(c.totAporteExt) + " pagado directo") : (Object.keys(c.porSocio).length + " socios"), "#1f3a2e") +
      gcKpi("Gastado", gcFmt(c.totGasto), c.n + " movimientos", "#b13a2c") +
      gcKpi("Saldo del fondo", gcFmt(c.saldo), "= " + gcFmt(c.saldo) + " en la planilla", c.saldo < 0 ? "#b13a2c" : "#1c78b0") +
      gcKpi("Rubros con gasto", String(Object.keys(c.porRubro).length), "de " + GC_RUBROS.length + " definidos", "#c9933a") +
    '</div>' +
    '<div style="font-size:.66rem;color:rgba(32,36,31,.5);background:rgba(202,138,4,.09);border:1px solid rgba(202,138,4,.25);border-radius:8px;padding:8px 10px;margin-bottom:14px">' +
      '⚠ El saldo se calcula sumando los movimientos. La fila <b>"Ajustes de saldo de la planilla"</b> ($14.529.773) absorbe las correcciones que el contador hizo directo sobre la columna de saldo del Sheet sin cargarlas como movimiento — está para que el total cierre en <b>$35.515.331</b> como la planilla. Se va reduciendo a medida que se itemicen.' +
    '</div>';

  // —— gráficos ——
  var graf =
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:16px">' +
      '<div class="gc-panel"><div class="gc-panel-t">Gasto por rubro</div><div style="position:relative;height:260px"><canvas id="gcChartRubro"></canvas></div></div>' +
      '<div class="gc-panel"><div class="gc-panel-t">Aporte por profesional</div><div style="position:relative;height:260px"><canvas id="gcChartSocio"></canvas></div></div>' +
    '</div>';

  // —— tabla aporte por profesional ——
  var cfg = gcCfg();
  var totComp = 0, totAp = 0;
  var filasSoc = GC_SOCIOS.map(function (s) {
    var comp = (cfg.comprometido && cfg.comprometido[s.k] != null) ? gcNum(cfg.comprometido[s.k]) : s.comprometido;
    var ap = c.porSocio[s.k] ? c.porSocio[s.k].ars : 0;
    var n = c.porSocio[s.k] ? c.porSocio[s.k].n : 0;
    var falta = comp - ap;
    totComp += comp; totAp += ap;
    return '<tr>' +
      '<td>' + gcEsc(s.n) + '</td>' +
      '<td style="text-align:right"><input value="' + comp + '" onchange="gcSetComprometido(\'' + s.k + '\',this.value)" style="width:120px;text-align:right"></td>' +
      '<td style="text-align:right;font-weight:700">' + gcFmt(ap) + '</td>' +
      '<td style="text-align:right;color:' + (falta > 0 ? '#b13a2c' : '#16a34a') + '">' + (falta > 0 ? gcFmt(falta) : (falta < 0 ? '+' + gcFmt(-falta) : '—')) + '</td>' +
      '<td style="text-align:center;color:rgba(32,36,31,.5)">' + n + '</td>' +
      '</tr>';
  }).join("");
  var sinAsignar = c.porSocio["SIN ASIGNAR"];
  if (sinAsignar) {
    filasSoc += '<tr><td style="color:#b13a2c">⚠ Sin asignar</td><td></td><td style="text-align:right;font-weight:700">' + gcFmt(sinAsignar.ars) + '</td><td></td><td style="text-align:center">' + sinAsignar.n + '</td></tr>';
  }
  var tablaSoc =
    '<div class="adm-sec-title" style="margin-top:6px">Aporte de cada profesional</div>' +
    '<div style="font-size:.68rem;color:rgba(32,36,31,.45);margin-bottom:8px">"Comprometido" es lo declarado en la grilla del Sheet (editable). "Aportado" se suma solo de los movimientos tipo aporte del libro (incluye el aporte de Garmendia en USD valuado a $1.455 = $18.449.400, aunque ese se pagó directo al proveedor y no entró al fondo).</div>' +
    '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
    '<th>Profesional</th><th style="text-align:right">Comprometido</th><th style="text-align:right">Aportado</th><th style="text-align:right">Falta integrar</th><th style="text-align:center">Movs.</th>' +
    '</tr></thead><tbody>' + filasSoc + '</tbody><tfoot><tr class="adm-totals">' +
    '<td style="text-align:right;font-weight:800">Totales</td>' +
    '<td style="text-align:right;font-weight:800">' + gcFmt(totComp) + '</td>' +
    '<td style="text-align:right;font-weight:800">' + gcFmt(totAp) + '</td>' +
    '<td style="text-align:right;font-weight:800;color:' + ((totComp - totAp) > 0 ? '#b13a2c' : '#16a34a') + '">' + gcFmt(totComp - totAp) + '</td><td></td>' +
    '</tr></tfoot></table></div>';

  // —— alta de movimiento ——
  var rubroOpts = GC_RUBROS.map(function (r) { return '<option value="' + gcEsc(r) + '">' + gcEsc(r) + '</option>'; }).join("");
  var socioOpts = '<option value="">— socio —</option>' + GC_SOCIOS.map(function (s) { return '<option value="' + s.k + '">' + gcEsc(s.n) + '</option>'; }).join("");
  var dicList = gcDiccionario().map(function (e) { return '<option value="' + gcEsc(e.term) + '">'; }).join("");
  var hoy = new Date().toISOString().slice(0, 10);
  var alta =
    '<div class="adm-sec-title" style="margin-top:20px">Nuevo movimiento</div>' +
    '<datalist id="gcDic">' + dicList + '</datalist>' +
    '<div class="gc-add">' +
      '<input type="date" id="gcAddF" value="' + hoy + '" title="Fecha">' +
      '<input id="gcAddC" list="gcDic" placeholder="Concepto / proveedor" oninput="gcAltaAuto()" style="min-width:190px">' +
      '<select id="gcAddRubro">' + rubroOpts + '</select>' +
      '<input id="gcAddM" placeholder="Método" value="Transferencia" style="max-width:120px">' +
      '<input id="gcAddD" placeholder="Alias o CBU" style="max-width:170px">' +
      '<input id="gcAddFac" placeholder="Factura" style="max-width:120px">' +
      '<select id="gcAddTipo" onchange="gcAltaTipo()"><option value="gasto">Gasto</option><option value="aporte">Aporte</option></select>' +
      '<select id="gcAddSocio" style="display:none">' + socioOpts + '</select>' +
      '<input id="gcAddImp" placeholder="Importe" inputmode="decimal" style="max-width:120px;text-align:right">' +
      '<button class="cpsm-calc-btn" onclick="gcAgregar()">+ Agregar</button>' +
    '</div>';

  // —— libro (editable) ——
  var chips = '<button class="gc-chip' + (_gcFiltroRubro === "" ? " on" : "") + '" onclick="gcFiltroRubro(\'\')">Todos</button>' +
    GC_RUBROS.concat(["Aporte de capital"]).filter(function (r) { return c.porRubro[r] || r === "Aporte de capital" || r === _gcFiltroRubro; })
      .map(function (r) {
        return '<button class="gc-chip' + (_gcFiltroRubro === r ? " on" : "") + '" onclick="gcFiltroRubro(\'' + gcEsc(r).replace(/'/g, "\\'") + '\')">' + gcEsc(r) + '</button>';
      }).join("");

  var rows = c.filas.filter(function (x) {
    if (_gcFiltroRubro) {
      if (_gcFiltroRubro === "Aporte de capital") { if (x.m.tipo !== "aporte") return false; }
      else if ((x.m.rubro || "Otros") !== _gcFiltroRubro || x.m.tipo === "aporte") return false;
    }
    if (_gcFiltroTxt) {
      var hay = gcNorm(x.m.c + " " + x.m.d + " " + x.m.fac + " " + x.m.m).indexOf(gcNorm(_gcFiltroTxt)) !== -1;
      if (!hay) return false;
    }
    return true;
  }).map(function (x) { return gcFilaHtml(x); }).join("");

  var libro =
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:22px;flex-wrap:wrap">' +
      '<div class="adm-sec-title" style="margin:0">Libro de movimientos <span style="font-size:.7rem;font-weight:600;color:rgba(32,36,31,.4)">(' + c.n + ')</span></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<input id="gcBuscar" value="' + gcEsc(_gcFiltroTxt) + '" placeholder="Buscar…" oninput="gcBuscar(this.value)" style="font-size:.72rem;padding:4px 10px;border:1px solid rgba(32,36,31,.2);border-radius:7px">' +
        '<button class="gc-mini" onclick="gcExportExcel()">⬇ Excel</button>' +
        '<button class="gc-mini" onclick="gcExportPDF()">⬇ PDF</button>' +
        '<button class="gc-mini" onclick="gcResetSeed()" title="Volver a la importación original">↺ Reset</button>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin:6px 0 10px;font-size:.7rem;color:rgba(32,36,31,.5)">' +
      '<label>Saldo de apertura <input value="' + c.apertura + '" onchange="gcSetApertura(this.value)" style="width:120px;text-align:right"></label>' +
    '</div>' +
    '<div class="gc-chips">' + chips + '</div>' +
    '<div class="adm-table-wrap"><table class="adm-table gc-libro"><thead><tr>' +
    '<th>Fecha</th><th>Concepto</th><th>Rubro</th><th>Método</th><th>Alias / CBU</th><th>Factura</th><th style="text-align:right">Importe</th><th style="text-align:right">Saldo</th><th></th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div style="font-size:.66rem;color:rgba(32,36,31,.4);margin-top:8px">Cada celda se guarda al salir del campo. El importe de un <b>aporte</b> suma al fondo; el de un <b>gasto</b> resta. El saldo se recalcula en orden de carga.</div>';

  cont.innerHTML =
    '<div id="gcRoot" style="padding:4px 2px 20px">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
      '<div class="adm-sec-title" style="margin:0">🏠 Gastos Casa — 14 de Julio 2067</div>' +
    '</div>' +
    '<div style="font-size:.68rem;color:rgba(32,36,31,.45);margin:2px 0 14px">Libro de la obra importado del Sheet. Desde acá se edita y se cargan los movimientos nuevos — el Sheet queda como respaldo.</div>' +
    kpis + graf + tablaSoc + alta + libro +
    '</div>';

  gcPintarCharts(c);
}

function gcKpi(lbl, val, sub, col) {
  return '<div class="adm-kpi" style="border-left-color:' + col + '">' +
    '<div class="adm-kpi-lbl">' + lbl + '</div>' +
    '<div class="adm-kpi-val" style="color:' + col + '">' + val + '</div>' +
    '<div class="adm-kpi-sub">' + (sub || "") + '</div></div>';
}

function gcFilaHtml(x) {
  var m = x.m;
  var id = m.id;
  var esAporte = m.tipo === "aporte";
  var rubroOpts = GC_RUBROS.concat(esAporte ? ["Aporte de capital"] : []).map(function (r) {
    return '<option value="' + gcEsc(r) + '"' + ((m.rubro || "Otros") === r ? " selected" : "") + '>' + gcEsc(r) + '</option>';
  }).join("");
  var socioCell = esAporte
    ? '<select onchange="gcSet(\'' + id + '\',\'socio\',this.value)" style="font-size:.66rem">' +
        '<option value="">—</option>' +
        GC_SOCIOS.map(function (s) { return '<option value="' + s.k + '"' + (m.socio === s.k ? " selected" : "") + '>' + gcEsc(s.k) + '</option>'; }).join("") +
      '</select>'
    : '<select onchange="gcSet(\'' + id + '\',\'rubro\',this.value)" style="font-size:.66rem">' + rubroOpts + '</select>';
  var impCol = esAporte ? "#16a34a" : "#b13a2c";
  var signo = esAporte ? "+" : "−";
  return '<tr class="' + (esAporte ? "gc-r-aporte" : "") + '">' +
    '<td><input type="date" value="' + gcEsc(m.f) + '" onchange="gcSet(\'' + id + '\',\'f\',this.value)" style="font-size:.66rem"></td>' +
    '<td style="min-width:170px"><input value="' + gcEsc(m.c) + '" onchange="gcSet(\'' + id + '\',\'c\',this.value)"></td>' +
    '<td>' + socioCell + '</td>' +
    '<td><input value="' + gcEsc(m.m) + '" onchange="gcSet(\'' + id + '\',\'m\',this.value)" style="width:90px"></td>' +
    '<td><input value="' + gcEsc(m.d) + '" onchange="gcSet(\'' + id + '\',\'d\',this.value)" style="width:150px"></td>' +
    '<td><input value="' + gcEsc(m.fac) + '" onchange="gcSet(\'' + id + '\',\'fac\',this.value)" style="width:100px"></td>' +
    '<td style="text-align:right;white-space:nowrap"><span style="color:' + impCol + ';font-weight:700">' + signo + '</span> <input value="' + m.imp + '" onchange="gcSet(\'' + id + '\',\'imp\',this.value)" style="width:100px;text-align:right">' +
      (m.noFondo ? ' <span style="font-size:.55rem;color:#1c78b0;font-weight:700" title="no entra al fondo común">ext</span>' : '') + '</td>' +
    '<td style="text-align:right;font-weight:700;color:' + (x.saldo == null ? "rgba(32,36,31,.3)" : (x.saldo < 0 ? "#b13a2c" : "rgba(32,36,31,.75)")) + '">' + (x.saldo == null ? "—" : gcFmt(x.saldo)) + '</td>' +
    '<td style="text-align:center"><button class="obra-x" title="Borrar" onclick="gcBorrar(\'' + id + '\')">✕</button></td>' +
    '</tr>';
}

// ── charts ────────────────────────────────────────────────────────
function gcPintarCharts(c) {
  if (typeof Chart === "undefined") return;
  Object.keys(_gcCharts).forEach(function (k) { try { _gcCharts[k].destroy(); } catch (e) {} });
  _gcCharts = {};
  var dark = document.documentElement.getAttribute("data-theme") === "dark";
  var tick = dark ? "rgba(241,237,226,.7)" : "rgba(32,36,31,.65)";
  var grid = dark ? "rgba(241,237,226,.1)" : "rgba(32,36,31,.1)";

  var rk = Object.keys(c.porRubro).sort(function (a, b) { return c.porRubro[b] - c.porRubro[a]; });
  var cv1 = document.getElementById("gcChartRubro");
  if (cv1 && rk.length) {
    _gcCharts.rubro = new Chart(cv1, {
      type: "doughnut",
      data: {
        labels: rk,
        datasets: [{ data: rk.map(function (r) { return Math.round(c.porRubro[r]); }), backgroundColor: rk.map(function (r) { return GC_RUBRO_COLOR[r] || "#9a8c78"; }), borderWidth: 1, borderColor: dark ? "#241f18" : "#fbf8f0" }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { color: tick, font: { size: 10 }, boxWidth: 10 } },
          tooltip: { callbacks: { label: function (ct) { var t = c.totGasto || 1; return " " + ct.label + ": " + gcFmt(ct.parsed) + " (" + (ct.parsed / t * 100).toFixed(1) + "%)"; } } }
        }
      }
    });
  }

  var cv2 = document.getElementById("gcChartSocio");
  if (cv2) {
    var socs = GC_SOCIOS.filter(function (s) { return c.porSocio[s.k]; });
    var cfg = gcCfg();
    _gcCharts.socio = new Chart(cv2, {
      type: "bar",
      data: {
        labels: socs.map(function (s) { return s.k; }),
        datasets: [
          { label: "Aportado", data: socs.map(function (s) { return Math.round(c.porSocio[s.k].ars); }), backgroundColor: "#1f3a2e", borderRadius: 3 },
          { label: "Comprometido", data: socs.map(function (s) { return (cfg.comprometido && cfg.comprometido[s.k] != null) ? gcNum(cfg.comprometido[s.k]) : s.comprometido; }), backgroundColor: "rgba(201,147,58,.55)", borderRadius: 3 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: tick, font: { size: 10 }, boxWidth: 10 } }, tooltip: { callbacks: { label: function (ct) { return " " + ct.dataset.label + ": " + gcFmt(ct.parsed.y); } } } },
        scales: {
          x: { ticks: { color: tick, font: { size: 9 } }, grid: { display: false } },
          y: { ticks: { color: tick, font: { size: 9 }, callback: function (v) { return "$" + (v / 1e6) + "M"; } }, grid: { color: grid } }
        }
      }
    });
  }
}

// ── mutaciones ────────────────────────────────────────────────────
function gcSet(id, campo, val) {
  var arr = gcLeer();
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id === id) {
      if (campo === "imp") arr[i].imp = gcNum(val);
      else if (campo === "tipo") { arr[i].tipo = val; if (val !== "aporte") arr[i].socio = ""; }
      else arr[i][campo] = val;
      break;
    }
  }
  gcGuardar(arr);
  if (campo === "imp" || campo === "tipo" || campo === "rubro" || campo === "socio" || campo === "f") renderGastosCasa();
}
function gcBorrar(id) {
  if (!confirm("¿Borrar este movimiento del libro?")) return;
  gcGuardar(gcLeer().filter(function (x) { return x.id !== id; }));
  renderGastosCasa();
}
function gcAgregar() {
  var f = document.getElementById("gcAddF").value || new Date().toISOString().slice(0, 10);
  var cpt = (document.getElementById("gcAddC").value || "").trim();
  var imp = gcNum(document.getElementById("gcAddImp").value);
  if (!cpt) { alert("Falta el concepto."); return; }
  if (!imp) { alert("Falta el importe."); return; }
  var tipo = document.getElementById("gcAddTipo").value;
  var arr = gcLeer();
  arr.push({
    id: gcUID(), f: f, c: cpt,
    m: (document.getElementById("gcAddM").value || "Transferencia").trim(),
    d: (document.getElementById("gcAddD").value || "").trim(),
    fac: (document.getElementById("gcAddFac").value || "").trim(),
    imp: imp, tipo: tipo,
    socio: tipo === "aporte" ? (document.getElementById("gcAddSocio").value || "") : "",
    rubro: tipo === "aporte" ? "Aporte de capital" : (document.getElementById("gcAddRubro").value || "Otros"),
    sSheet: null, noFondo: false
  });
  gcGuardar(arr);
  renderGastosCasa();
}
function gcAltaTipo() {
  var t = document.getElementById("gcAddTipo").value;
  document.getElementById("gcAddSocio").style.display = t === "aporte" ? "" : "none";
  document.getElementById("gcAddRubro").style.display = t === "aporte" ? "none" : "";
}
function gcAltaAuto() {
  var e = gcAutocompletar(document.getElementById("gcAddC").value);
  if (!e) return;
  var r = document.getElementById("gcAddRubro"), m = document.getElementById("gcAddM"), d = document.getElementById("gcAddD");
  if (r && e.rubro && GC_RUBROS.indexOf(e.rubro) !== -1) r.value = e.rubro;
  if (m && e.metodo && (!m.value || m.value === "Transferencia")) m.value = e.metodo;
  if (d && e.destino && !d.value) d.value = e.destino;
}
function gcSetComprometido(k, val) {
  var c = gcCfg();
  if (!c.comprometido) c.comprometido = {};
  c.comprometido[k] = gcNum(val);
  gcCfgGuardar(c);
  renderGastosCasa();
}
function gcSetApertura(val) {
  var c = gcCfg();
  c.apertura = gcNum(val);
  gcCfgGuardar(c);
  renderGastosCasa();
}
function gcFiltroRubro(r) { _gcFiltroRubro = r; renderGastosCasa(); }
function gcBuscar(v) {
  _gcFiltroTxt = v;
  // filtrado en vivo sin re-render completo (mantiene foco en el input)
  var c = gcCalcular();
  var tb = document.querySelector(".gc-libro tbody");
  if (!tb) return;
  tb.innerHTML = c.filas.filter(function (x) {
    if (_gcFiltroRubro) {
      if (_gcFiltroRubro === "Aporte de capital") { if (x.m.tipo !== "aporte") return false; }
      else if ((x.m.rubro || "Otros") !== _gcFiltroRubro || x.m.tipo === "aporte") return false;
    }
    if (_gcFiltroTxt) return gcNorm(x.m.c + " " + x.m.d + " " + x.m.fac + " " + x.m.m).indexOf(gcNorm(_gcFiltroTxt)) !== -1;
    return true;
  }).map(function (x) { return gcFilaHtml(x); }).join("");
}
function gcResetSeed() {
  if (!confirm("Descarta TODO lo editado y vuelve a la importación original del Sheet. ¿Seguro?")) return;
  try { localStorage.removeItem(GC_K); localStorage.removeItem(GC_K_CFG); } catch (e) {}
  gcLeer(); // re-siembra
  _gcFiltroRubro = ""; _gcFiltroTxt = "";
  renderGastosCasa();
}

// ── export Excel (SheetJS) ────────────────────────────────────────
function gcExportExcel() {
  if (typeof XLSX === "undefined") { alert("La librería de Excel aún se está cargando."); return; }
  var c = gcCalcular();
  var wb = XLSX.utils.book_new();

  var mov = [["Fecha", "Concepto", "Tipo", "Socio", "Rubro", "Método", "Alias/CBU", "Factura", "Importe", "Saldo calculado", "Saldo planilla"]];
  c.filas.forEach(function (x) {
    var m = x.m;
    mov.push([gcFechaAR(m.f), m.c + (m.noFondo ? " (no entra al fondo)" : ""), m.tipo, m.socio || "", m.rubro || "", m.m || "", m.d || "", m.fac || "", gcNum(m.imp) * (m.tipo === "aporte" ? 1 : -1), x.saldo == null ? "" : Math.round(x.saldo), m.sSheet == null ? "" : Math.round(m.sSheet)]);
  });
  mov.push([]);
  mov.push(["", "", "", "", "", "", "", "Saldo apertura", c.apertura]);
  mov.push(["", "", "", "", "", "", "", "Total aportes (incl. directos)", Math.round(c.totAporte)]);
  mov.push(["", "", "", "", "", "", "", "  · de los cuales al fondo", Math.round(c.totAporteFondo)]);
  mov.push(["", "", "", "", "", "", "", "Total gastos", -Math.round(c.totGasto)]);
  mov.push(["", "", "", "", "", "", "", "Saldo final", Math.round(c.saldo)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mov), "Movimientos");

  var rub = [["Rubro", "Total gastado", "% del gasto"]];
  Object.keys(c.porRubro).sort(function (a, b) { return c.porRubro[b] - c.porRubro[a]; }).forEach(function (r) {
    rub.push([r, Math.round(c.porRubro[r]), +(c.porRubro[r] / (c.totGasto || 1) * 100).toFixed(2)]);
  });
  rub.push(["TOTAL", Math.round(c.totGasto), 100]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rub), "Por rubro");

  var cfg = gcCfg();
  var ap = [["Profesional", "Comprometido", "Aportado", "Falta integrar", "Movimientos"]];
  GC_SOCIOS.forEach(function (s) {
    var comp = (cfg.comprometido && cfg.comprometido[s.k] != null) ? gcNum(cfg.comprometido[s.k]) : s.comprometido;
    var d = c.porSocio[s.k] || { ars: 0, n: 0 };
    ap.push([s.n, comp, Math.round(d.ars), Math.round(comp - d.ars), d.n]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ap), "Aportes socios");

  XLSX.writeFile(wb, "GastosCasa_14deJulio2067_" + new Date().toISOString().slice(0, 10) + ".xlsx");
}

// ── export PDF (jsPDF, sin autotable) ─────────────────────────────
function gcExportPDF() {
  if (!window.jspdf) { alert("La librería PDF aún se está cargando."); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  var c = gcCalcular();
  var cfg = gcCfg();
  var W = 297, LM = 12, RM = 285;
  var hoy = new Date();
  var hoyStr = String(hoy.getDate()).padStart(2, "0") + "/" + String(hoy.getMonth() + 1).padStart(2, "0") + "/" + hoy.getFullYear();

  doc.setFillColor(31, 58, 46);
  doc.rect(LM, 10, RM - LM, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("GASTOS CASA — 14 DE JULIO 2067", W / 2, 17, { align: "center" });
  doc.setFontSize(8);
  doc.text("Libro de la obra · emitido " + hoyStr, W / 2, 22.5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  var y = 33;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("Aportado: " + gcFmtPDF(c.totAporte) + (c.totAporteExt ? " (" + gcFmtPDF(c.totAporteExt) + " directo)" : ""), LM, y);
  doc.text("Gastado: " + gcFmtPDF(c.totGasto), LM + 95, y);
  doc.text("Saldo del fondo: " + gcFmtPDF(c.saldo), LM + 175, y);
  y += 8;

  // Aportes por socio
  doc.setFontSize(9); doc.text("APORTE POR PROFESIONAL", LM, y); y += 2;
  doc.setDrawColor(31, 58, 46); doc.line(LM, y, LM + 150, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  GC_SOCIOS.forEach(function (s) {
    var comp = (cfg.comprometido && cfg.comprometido[s.k] != null) ? gcNum(cfg.comprometido[s.k]) : s.comprometido;
    var d = c.porSocio[s.k] || { ars: 0, n: 0 };
    doc.text(s.n, LM, y);
    doc.text("compr. " + gcFmtPDF(comp), LM + 55, y);
    doc.text("aport. " + gcFmtPDF(d.ars), LM + 100, y);
    var falta = comp - d.ars;
    doc.setTextColor(falta > 0 ? 177 : 22, falta > 0 ? 58 : 163, falta > 0 ? 44 : 74);
    doc.text((falta > 0 ? "falta " : "ok ") + gcFmtPDF(Math.abs(falta)), LM + 160, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
  });
  y += 3;

  // Por rubro
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("GASTO POR RUBRO", LM, y); y += 2;
  doc.line(LM, y, LM + 150, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  Object.keys(c.porRubro).sort(function (a, b) { return c.porRubro[b] - c.porRubro[a]; }).forEach(function (r) {
    if (y > 195) { doc.addPage(); y = 20; }
    doc.text(r, LM, y);
    doc.text(gcFmtPDF(c.porRubro[r]), LM + 90, y, { align: "right" });
    doc.text((c.porRubro[r] / (c.totGasto || 1) * 100).toFixed(1) + "%", LM + 100, y);
    y += 5;
  });

  // Libro completo
  doc.addPage(); y = 18;
  var cF = LM, cC = LM + 20, cR = LM + 95, cD = LM + 140, cFac = LM + 195, cImp = LM + 245, cSal = RM;
  function head(yy) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(0, 0, 0);
    doc.text("Fecha", cF, yy); doc.text("Concepto", cC, yy); doc.text("Rubro", cR, yy);
    doc.text("Alias/CBU", cD, yy); doc.text("Factura", cFac, yy);
    doc.text("Importe", cImp, yy, { align: "right" }); doc.text("Saldo", cSal, yy, { align: "right" });
    doc.setDrawColor(31, 58, 46); doc.line(LM, yy + 1.5, RM, yy + 1.5);
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("LIBRO DE MOVIMIENTOS (" + c.n + ")", LM, y); y += 4;
  head(y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  c.filas.forEach(function (x) {
    if (y > 200) { doc.addPage(); y = 18; head(y); y += 5; doc.setFont("helvetica", "normal"); doc.setFontSize(7); }
    var m = x.m;
    doc.text(gcFechaAR(m.f), cF, y);
    doc.text(doc.splitTextToSize(m.c || "", 72)[0], cC, y);
    doc.text((m.tipo === "aporte" ? "Aporte" : (m.rubro || "")), cR, y);
    doc.text(doc.splitTextToSize(m.d || "", 52)[0], cD, y);
    doc.text(doc.splitTextToSize(m.fac || "", 46)[0], cFac, y);
    doc.setTextColor(m.tipo === "aporte" ? 22 : 177, m.tipo === "aporte" ? 163 : 58, m.tipo === "aporte" ? 74 : 44);
    doc.text((m.tipo === "aporte" ? "+ " : "− ") + gcFmtPDF(gcNum(m.imp)) + (m.noFondo ? " (ext)" : ""), cImp, y, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.text(x.saldo == null ? "—" : gcFmtPDF(x.saldo), cSal, y, { align: "right" });
    y += 4.3;
  });

  doc.save("GastosCasa_14deJulio2067_" + hoy.toISOString().slice(0, 10) + ".pdf");
}
