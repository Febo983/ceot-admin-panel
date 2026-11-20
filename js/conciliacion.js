// ══════ CONCILIACIÓN BANCARIA (BBVA ↔ ARCA) ═══════════════════════════
// Pedido de Marcelo, 20/11/2026. Ejercicio desde el 01/06/2026.
// Cada mes se importa:
//   · el resumen del BBVA en PDF (trae las 2 cuentas corrientes de CEOT:
//     094-351473/0 y 094-351474/7, con saldo anterior, movimientos y saldo
//     final; más abajo la lista de transferencias con CUIT/nombre),
//   · "Mis Comprobantes" de ARCA en Excel, emitidas y recibidas (pueden
//     traer varios meses juntos: se reparten por la fecha de cada factura).
// El panel cruza cada movimiento del banco con su factura (CUIT + importe +
// fecha) y deja a mano lo que no se pudo cruzar solo.
//
// Lo que se guarda (localStorage + syncPush, un registro por mes "AAAA-MM"):
//   conc_mov_AAAA-MM   movimientos del banco de ese mes (fecha real del mov.)
//   conc_arca_AAAA-MM  facturas de ARCA de ese mes
//   conc_man_AAAA-MM   lo que se resolvió a mano (vínculos y categorías)
//   conc_saldos        saldo anterior/final de cada resumen importado
//   conc_guardados     índice de meses cargados
// Los resúmenes del BBVA no cortan a fin de mes (el de junio arranca el
// 29/05): cada movimiento se guarda en el mes de SU fecha, y un movimiento
// que viene repetido en dos resúmenes se descarta por su firma (cuenta,
// fecha, concepto, importe y saldo).

var CONC_DESDE = '2026-06';
var CONC_CUENTAS = { '094-351473/0': 'CC 351473/0', '094-351474/7': 'CC 351474/7' };
var CONC_CUIT_PROPIO = '30719119545';
// CUITs de los profesionales (planilla de Marcelo, 20/11/2026). Lo que se les
// transfiere (o lo que depositan ellos) va a "Honorarios a profesionales".
var CONC_CUIT_PROF = {
  '23279400429': 'BRUNI, Maximiliano',   '20181292653': 'CORELICH, Daniel O.',
  '20274663252': 'DEGANUTTI, Cristian G.', '20182772578': 'FISSER, Fabián',
  '20272293458': 'GUILERA, Ariel',       '20137044618': 'LABAYEN, Daniel G.',
  '20295935643': 'MAZZOLA, Maximiliano', '24363841712': 'DE LA COLINA, Juan P.',
  '20206549883': 'TRIVELLINI, Amílcar',  '27347927622': 'GARMENDIA, Valeria',
  '20295053845': 'GERLING, Cristian',    '20374055829': 'LEON, Joaquín',
  '20295939339': 'PERLASCO, Camilo'
};
var CONC_ALICUOTAS = ['0', '2,5', '5', '10,5', '21', '27'];
var CONC_MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

// "1.234.567,89" / "-3,93" → número (2 decimales).
function concNum(s) {
  var t = String(s || '').replace(/\./g, '').replace(',', '.').trim();
  var n = parseFloat(t);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}
function concCent(n) { return Math.round((n || 0) * 100); }

// ── PDF → líneas de texto ────────────────────────────────────────────────
// pdf.js devuelve pedazos de texto sueltos con su posición: se agrupan por
// altura (misma línea) y se ordenan de izquierda a derecha. Entre dos pedazos
// separados por un hueco se pone doble espacio (así "CONCEPTO  -3,93" no se
// confunde con un número pegado al texto).
function concLineasDesdeItems(items) {
  var rows = [];
  items.forEach(function(it) {
    if (!it.str || !it.str.trim()) return;
    var y = it.transform[5], x = it.transform[4];
    var r = null;
    for (var i = 0; i < rows.length; i++) if (Math.abs(rows[i].y - y) < 2.5) { r = rows[i]; break; }
    if (!r) { r = { y: y, items: [] }; rows.push(r); }
    r.items.push({ x: x, s: it.str, w: it.width || 0 });
  });
  rows.sort(function(a, b) { return b.y - a.y; });
  return rows.map(function(r) {
    r.items.sort(function(a, b) { return a.x - b.x; });
    var s = '', end = null;
    r.items.forEach(function(i) {
      if (end !== null) s += (i.x - end > 1.5 ? '  ' : '');
      s += i.s; end = i.x + i.w;
    });
    return s.trim();
  });
}
function concLineasDesdePdf(data) {
  return pdfjsLib.getDocument({ data: data }).promise.then(function(doc) {
    var paginas = [];
    for (var p = 1; p <= doc.numPages; p++) paginas.push(p);
    return Promise.all(paginas.map(function(p) {
      return doc.getPage(p).then(function(pg) { return pg.getTextContent(); })
        .then(function(tc) { return concLineasDesdeItems(tc.items); });
    })).then(function(porPagina) { return [].concat.apply([], porPagina); });
  });
}

// ── Resumen BBVA (líneas) → cuentas con movimientos ─────────────────────
// Devuelve { mesRef:'AAAA-MM', cuentas:{ nro:{ saldoAnterior, saldoFinal,
// movs:[{f,o,c,imp,saldo}], errores:[] } }, enviadas:[], recibidas:[],
// debitosAuto:[] }.
// Control: cada movimiento tiene que cumplir saldo anterior + importe = saldo
// de esa línea, y el último saldo tiene que ser el "SALDO AL ..." del resumen.
// Si algo no cierra, va a "errores" y el importador no deja guardar.
// Sin ^: a veces el PDF pega un código de barras delante de la fecha.
var CONC_RE_MOV = /(?:^|[^\d\/])(\d{2})\/(\d{2})\s+(.*?)\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})$/;
function concParseBbva(lineas) {
  var res = { mesRef: '', cuentas: {}, enviadas: [], recibidas: [], debitosAuto: [] };
  // Mes del resumen: "SALDO AL 30 DE JUNIO" + el año de "movimientos del mes: JUNIO 2026".
  var anio = 0, mes = 0;
  lineas.forEach(function(l) {
    var m = /movimientos del mes:\s*([A-Z]+)\s+(\d{4})/i.exec(l);
    if (m) { var k = CONC_MESES.indexOf(m[1].toUpperCase()); if (k !== -1 && (+m[2] * 12 + k) > (anio * 12 + mes - 1)) { anio = +m[2]; mes = k + 1; } }
  });
  if (!anio) {
    lineas.forEach(function(l) {
      var m = /informaci[oó]n al:\s*\d{2}\/(\d{2})\/(\d{4})/i.exec(l);
      if (m && !anio) { anio = +m[2]; mes = +m[1] - 1; if (mes < 1) { mes = 12; anio--; } }
    });
  }
  if (!anio) throw new Error('No se encontró el mes del resumen (¿es un resumen del BBVA?).');
  res.mesRef = anio + '-' + (mes < 10 ? '0' : '') + mes;
  function fechaIso(dd, mm) {
    var a = anio;
    if (+mm - mes > 6) a--;          // resumen de enero con movimientos del 30/12
    if (mes - +mm > 6) a++;          // (no pasa, por las dudas)
    return a + '-' + mm + '-' + dd;
  }

  var cuenta = null, seccion = 'mov', sub = '';
  lineas.forEach(function(l) {
    var mc = /^CC \$ (\d{3}-\d{6}\/\d)\s+\(Cta\.Cte\.Bancaria\)\s*-/.exec(l);
    if (mc) {
      cuenta = mc[1]; seccion = 'mov';
      if (!res.cuentas[cuenta]) res.cuentas[cuenta] = { saldoAnterior: null, saldoFinal: null, movs: [], errores: [] };
      return;
    }
    if (/^Transferencias$/i.test(l)) { seccion = 'transf'; cuenta = null; return; }
    if (/^D[eé]bitos autom[aá]ticos$/i.test(l)) { seccion = 'debaut'; cuenta = null; return; }
    if (/^Legales y avisos/i.test(l)) { seccion = 'fin'; cuenta = null; return; }
    if (/^RECIBIDAS/.test(l)) sub = 'rec';
    else if (/^ENVIADAS/.test(l)) sub = 'env';

    if (seccion === 'mov' && cuenta) {
      var C = res.cuentas[cuenta];
      var ms = /^SALDO ANTERIOR\s+(-?[\d.]+,\d{2})$/.exec(l);
      if (ms) { if (C.saldoAnterior === null) C.saldoAnterior = concNum(ms[1]); return; }
      var mf = /^SALDO AL .*?\s(-?[\d.]+,\d{2})$/.exec(l);
      if (mf) { C.saldoFinal = concNum(mf[1]); cuenta = null; return; }
      var m = CONC_RE_MOV.exec(l);
      if (m) {
        var resto = m[3], origen = '';
        var mo = /^D(?:\s+(\d{3}))?\s+(.*)$/.exec(resto);
        if (mo) { origen = 'D' + (mo[1] ? ' ' + mo[1] : ''); resto = mo[2]; }
        C.movs.push({ f: fechaIso(m[1], m[2]), o: origen, c: resto.replace(/\s{2,}/g, ' ').trim(), imp: concNum(m[4]), saldo: concNum(m[5]) });
      }
      return;
    }
    if (seccion === 'transf') {
      var p = l.split(/\s{2,}/);
      var mi = /^(\d{2})\/(\d{2})$/.exec(p[0] || '');
      if (!mi) return;
      var imp = concNum(p[p.length - 2]);
      var cta = (/(\d{3}-\d{6}\/\d)$/.exec(l) || [])[1] || '';
      if (sub === 'env') {
        // "03/06  20295935643 MAZZOLA  0000000000  VARIOS ...  $  4.141.803,00 CC $ 094-351473/0"
        var md = /^(\d{11})\s+(.*)$/.exec(p[1] || '');
        var mImp = /\$\s+([\d.]+,\d{2})\s+CC/.exec(l);
        res.enviadas.push({ f: fechaIso(mi[1], mi[2]), cuit: md ? md[1] : '', nombre: md ? md[2].trim() : (p[1] || ''), imp: mImp ? concNum(mImp[1]) : imp, cta: cta });
      } else if (sub === 'rec') {
        var mr = /(\d{11})\s*([^\d].*)$/.exec(p[2] || '') || /(\d{11})\s*([^\d].*)$/.exec(p[1] || '');
        var mImp2 = /\$\s+([\d.]+,\d{2})\s+CC/.exec(l);
        res.recibidas.push({ f: fechaIso(mi[1], mi[2]), cuit: mr ? mr[1].slice(-11) : '', nombre: mr ? mr[2].trim() : '', imp: mImp2 ? concNum(mImp2[1]) : imp, cta: cta });
      }
      return;
    }
    if (seccion === 'debaut') {
      var q = l.split(/\s{2,}/);
      var md2 = /^(\d{2})\/(\d{2})$/.exec(q[0] || '');
      var mImp3 = /\$\s+([\d.]+,\d{2})\s+CC/.exec(l);
      if (md2 && mImp3) res.debitosAuto.push({ f: fechaIso(md2[1], md2[2]), empresa: q[1] || '', servicio: q[2] || '', imp: concNum(mImp3[1]), cta: (/(\d{3}-\d{6}\/\d)$/.exec(l) || [])[1] || '' });
    }
  });

  // Control de saldos.
  Object.keys(res.cuentas).forEach(function(nro) {
    var C = res.cuentas[nro];
    if (C.saldoAnterior === null) C.errores.push('No se encontró el SALDO ANTERIOR.');
    if (C.saldoFinal === null) C.errores.push('No se encontró el SALDO AL ... del cierre.');
    var s = C.saldoAnterior || 0;
    C.movs.forEach(function(mv) {
      if (concCent(s + mv.imp) !== concCent(mv.saldo)) {
        C.errores.push(mv.f + ' ' + mv.c + ': saldo anterior ' + s.toFixed(2) + ' + ' + mv.imp.toFixed(2) + ' no da ' + mv.saldo.toFixed(2));
      }
      s = mv.saldo;
    });
    if (C.saldoFinal !== null && concCent(s) !== concCent(C.saldoFinal)) {
      C.errores.push('El último saldo (' + s.toFixed(2) + ') no coincide con el saldo final del resumen (' + C.saldoFinal.toFixed(2) + ').');
    }
  });
  if (!Object.keys(res.cuentas).length) throw new Error('No se encontró ninguna cuenta en el PDF.');
  return res;
}


// ── Movimientos del resumen → filas guardables ───────────────────────────
// Cada mes de la conciliación es UN resumen del banco tal como viene (el de
// julio trae movimientos fechados 30/06 que el banco procesó después del
// cierre de junio), así el saldo inicial y final coinciden con el PDF.
// Fila: [fecha, origen, concepto, importe, saldo, cuit, nombre].
// El CUIT sale del concepto ("TRANSFERENCIA 20274663252") o de las listas de
// transferencias enviadas/recibidas del mismo resumen (misma fecha, importe y
// cuenta); los débitos directos toman el nombre de "Débitos automáticos".
function concFilasDesdeResumen(res) {
  var out = {};
  Object.keys(res.cuentas).forEach(function(nro) {
    var C = res.cuentas[nro];
    var usadosE = {}, usadosR = {}, usadosD = {};
    var filas = C.movs.map(function(mv) {
      var cuit = '', nom = '';
      // CUIT en el concepto: "TRANSFERENCIA 20274663252", "...INMEDIATA COE 20274663252"
      // (las referencias COE de 15 dígitos no entran por el \b).
      var mc = /TRANSF.*?\b((?:2[0347]|3[034])\d{9})\b/.exec(mv.c);
      if (mc) cuit = mc[1];
      var lista = mv.imp < 0 ? res.enviadas : res.recibidas, usados = mv.imp < 0 ? usadosE : usadosR;
      for (var i = 0; i < lista.length; i++) {
        var t = lista[i];
        if (usados[i] || t.cta !== nro || t.f !== mv.f || concCent(t.imp) !== concCent(Math.abs(mv.imp))) continue;
        if (cuit && t.cuit && t.cuit !== cuit) continue;
        usados[i] = true; cuit = cuit || t.cuit; nom = t.nombre; break;
      }
      if (!nom && /DEBITO DIRECTO/.test(mv.c)) {
        for (var j = 0; j < res.debitosAuto.length; j++) {
          var d = res.debitosAuto[j];
          if (usadosD[j] || d.f !== mv.f || concCent(d.imp) !== concCent(-mv.imp)) continue;
          usadosD[j] = true; nom = (d.empresa + ' ' + d.servicio).trim(); break;
        }
      }
      if (!cuit && mv.imp > 0 && /CTRO MED MAR DEL|DNET CREDITO NE/.test(mv.c)) cuit = '30541190518';
      // Colón paga con cheques: el depósito no trae CUIT, se le asigna el de
      // Colón para poder comparar lo facturado contra lo cobrado.
      if (!cuit && mv.imp > 0 && /DEPOSITO CHEQUE/.test(mv.c)) { cuit = '30545778137'; nom = 'COLON (cheque)'; }
      return [mv.f, mv.o, mv.c, mv.imp, mv.saldo, cuit, nom];
    });
    out[nro] = { ant: C.saldoAnterior, fin: C.saldoFinal, filas: filas };
  });
  return out;
}

// ── ARCA "Mis Comprobantes" (filas de la hoja) → facturas ────────────────
// Busca los encabezados por nombre. Las notas de crédito restan (importe
// negativo). Devuelve { tipo:'R'|'E', facturas:[{id,f,tipo,pv,nro,cuit,nom,total,neto,iva}] }.
function concParseArca(rows) {
  var titulo = String((rows[0] || [])[0] || '');
  var tipo = /Recibidos/i.test(titulo) ? 'R' : (/Emitidos/i.test(titulo) ? 'E' : '');
  if (!tipo) throw new Error('No parece un "Mis Comprobantes" de ARCA (falta el título Emitidos/Recibidos).');
  var hi = -1;
  for (var i = 0; i < Math.min(rows.length, 6); i++) if (String((rows[i] || [])[0] || '').trim() === 'Fecha') { hi = i; break; }
  if (hi === -1) throw new Error('No se encontró la fila de encabezados de ARCA.');
  var H = rows[hi].map(function(h) { return String(h || '').trim(); });
  function col(n) { return H.indexOf(n); }
  var iF = col('Fecha'), iT = col('Tipo'), iPv = col('Punto de Venta'), iN = col('Número Desde'),
      iCuit = col(tipo === 'R' ? 'Nro. Doc. Emisor' : 'Nro. Doc. Receptor'),
      iNom = col(tipo === 'R' ? 'Denominación Emisor' : 'Denominación Receptor'),
      iTot = col('Imp. Total'), iNeto = col('Neto Gravado Total'), iIva = col('Total IVA'), iTc = col('Tipo Cambio'),
      iNg = col('Neto No Gravado'), iEx = col('Op. Exentas'), iOt = col('Otros Tributos');
  if (iF < 0 || iT < 0 || iTot < 0 || iCuit < 0) throw new Error('Faltan columnas de ARCA (Fecha, Tipo, Nro. Doc., Imp. Total).');
  var out = [];
  for (var r = hi + 1; r < rows.length; r++) {
    var row = rows[r]; if (!row || !row[iF]) continue;
    var fv = row[iF];
    if (typeof fv === 'number' && typeof XLSX !== 'undefined') { var dc = XLSX.SSF.parse_date_code(fv); fv = ('0' + dc.d).slice(-2) + '/' + ('0' + dc.m).slice(-2) + '/' + dc.y; }
    var f = String(fv).trim(), m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(f);
    if (!m) continue;
    var tdesc = String(row[iT] || '');
    var sg = /Cr[eé]dito/i.test(tdesc) && !/Factura de Cr[eé]dito/i.test(tdesc) ? -1 : 1;
    var tc = parseFloat(row[iTc]) || 1;
    var num = function(v) { return Math.round((parseFloat(v) || 0) * tc * 100) / 100; };
    var pv = String(row[iPv] || ''), nro = String(row[iN] || ''), cuit = String(row[iCuit] || '').replace(/\D/g, '');
    out.push({
      id: tipo + '|' + cuit + '|' + tdesc.split(' - ')[0] + '|' + pv + '|' + nro,
      f: m[3] + '-' + m[2] + '-' + m[1], tipo: tdesc, pv: pv, nro: nro, cuit: cuit,
      nom: String(row[iNom] || '').trim(), total: sg * num(row[iTot]),
      neto: sg * num(row[iNeto]), iva: sg * num(row[iIva]),
      ng: sg * num(row[iNg]), ex: sg * num(row[iEx]), ot: sg * num(row[iOt]),
      // IVA por alícuota, solo las que tienen importe: { '21': [neto, iva], ... }
      al: CONC_ALICUOTAS.reduce(function(o, a) {
        var n = sg * num(row[col('Neto Grav. IVA ' + a + '%')]), v = sg * num(row[col('IVA ' + a + '%')]);
        if (n || v) o[a] = [n, v];
        return o;
      }, {})
    });
  }
  return { tipo: tipo, facturas: out };
}

// ── Almacenamiento ───────────────────────────────────────────────────────
// Una clave por mes y cuenta para los movimientos (un mes de la cuenta
// principal son ~300 filas) y una por mes para ARCA.
var CONC_IDX_KEY = 'conc_guardados';
var CONC_CUITS_KEY = 'conc_cuits';
var CONC_MAN_KEY = 'conc_manual';
function concCtaCorta(nro) { return String(nro).replace(/^\d{3}-\d{3}(\d{3})\/\d$/, '$1'); }
function concKeyMov(mes, nro) { return 'conc_mov_' + mes + '_' + concCtaCorta(nro); }
function concKeyArca(mes, tipo) { return 'conc_arca_' + mes + '_' + tipo; }
function concLeer(k, def) {
  try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? def : v; } catch (e) { return def; }
}
function concEscribir(k, v) {
  localStorage.setItem(k, JSON.stringify(v));
  if (typeof syncPush === 'function') syncPush(k);
}
function concIdx() {
  var i = concLeer(CONC_IDX_KEY, {});
  return { bbva: i.bbva || [], arca: i.arca || [] };
}
function concMesesTodos() {
  var i = concIdx(), m = {};
  i.bbva.concat(i.arca).forEach(function(x) { m[x] = true; });
  return Object.keys(m).sort();
}

// Guarda un resumen ya controlado (reemplaza ese mes entero, las dos cuentas).
function concGuardarResumen(res) {
  var mes = res.mesRef, filas = concFilasDesdeResumen(res);
  Object.keys(filas).forEach(function(nro) { concEscribir(concKeyMov(mes, nro), filas[nro]); });
  var idx = concIdx();
  if (idx.bbva.indexOf(mes) === -1) idx.bbva.push(mes);
  idx.bbva.sort();
  concEscribir(CONC_IDX_KEY, idx);
  return mes;
}
// Guarda facturas de ARCA repartidas por mes de la factura. Reemplaza los
// meses que trae el archivo, solo del tipo del archivo (emitidas o recibidas).
function concGuardarArca(arca) {
  var porMes = {};
  arca.facturas.forEach(function(f) {
    var mes = f.f.slice(0, 7);
    if (mes < CONC_DESDE) return;
    (porMes[mes] = porMes[mes] || []).push(f);
  });
  var idx = concIdx();
  Object.keys(porMes).forEach(function(mes) {
    concEscribir(concKeyArca(mes, arca.tipo), porMes[mes]);
    if (idx.arca.indexOf(mes) === -1) idx.arca.push(mes);
  });
  idx.arca.sort();
  concEscribir(CONC_IDX_KEY, idx);
  return Object.keys(porMes).sort();
}

// Movimientos de un mes como objetos (las dos cuentas).
function concMovsMes(mes) {
  var out = [];
  Object.keys(CONC_CUENTAS).forEach(function(nro) {
    var d = concLeer(concKeyMov(mes, nro), null);
    if (!d) return;
    d.filas.forEach(function(r, i) {
      out.push({ id: mes + '|' + concCtaCorta(nro) + '|' + i + '|' + concCent(r[3]), mes: mes, cta: nro, f: r[0], o: r[1], c: r[2], imp: r[3], saldo: r[4], cuit: r[5] || '', nom: r[6] || '' });
    });
  });
  return out;
}
function concSaldosMes(mes) {
  var out = {};
  Object.keys(CONC_CUENTAS).forEach(function(nro) {
    var d = concLeer(concKeyMov(mes, nro), null);
    if (d) out[nro] = { ant: d.ant, fin: d.fin };
  });
  return out;
}
function concFacturasMes(mes) {
  return concLeer(concKeyArca(mes, 'R'), []).concat(concLeer(concKeyArca(mes, 'E'), []));
}

// ── Clasificación ────────────────────────────────────────────────────────
var CONC_CATS = [
  { k: 'prov',      t: 'Pago a proveedor' },
  { k: 'cobro',     t: 'Cobro (Colón / Centro Médico)' },
  { k: 'hon',       t: 'Honorarios a profesionales' },
  { k: 'sueldos',   t: 'Sueldos' },
  { k: 'imp',       t: 'Impuestos y retenciones' },
  { k: 'banco',     t: 'Gastos e intereses bancarios' },
  { k: 'propias',   t: 'Entre cuentas propias' },
  { k: 'obra',      t: 'Obra / Gastos Casa' },
  { k: 'pf',        t: 'Plazo fijo' },
  { k: 'tarjeta',   t: 'Tarjeta / pago de servicios' },
  { k: 'servicios', t: 'Débitos automáticos' },
  { k: 'efectivo',  t: 'Efectivo / cheques por ventanilla' },
  { k: 'otros',     t: 'Otros (identificado)' },
  { k: 'pend',      t: 'Sin identificar' }
];
function concCatNombre(k) { for (var i = 0; i < CONC_CATS.length; i++) if (CONC_CATS[i].k === k) return CONC_CATS[i].t; return k; }
// Categoría automática por el concepto. Las que necesitan factura (prov,
// cobro) se deciden después, con ARCA a la vista (concCruzar).
function concCatAuto(mv) {
  var c = mv.c;
  if (/IMP\.?LEY|25\.?413|RETENCION ARBA|PERCEP|PAGOS AFIP|RETENCION/.test(c)) return 'imp';
  if (/^COMI|^COM |COMISION|IVA TASA GENERAL|INTERESES GANADOS/.test(c)) return 'banco';
  if (/HABERES|SUELDOS/.test(c)) return 'sueldos';
  if (/PLAZO FIJO/.test(c)) return 'pf';
  if (/TARJETA/.test(c)) return 'tarjeta';
  if (/DEBITO DIRECTO/.test(c)) return 'servicios';
  if (/VENTANILLA|EXTRACCION|AUTOSERVICIO/.test(c)) return 'efectivo';
  if (mv.cuit === CONC_CUIT_PROPIO || /CCP094\s*35147[34]/.test(c)) return 'propias';
  if (/DEPOSITO CHEQUE/.test(c)) return 'cobro';
  return '';
}

// ── Cruce banco ↔ ARCA ───────────────────────────────────────────────────
// Sobre TODOS los meses cargados (una factura de junio se paga en julio).
// Orden: 1) vínculos a mano; 2) un pago = una factura del mismo CUIT, mismo
// importe; 3) un pago = varias facturas del mismo CUIT (hasta 6, las más
// viejas pendientes); 4) varias transferencias = una factura. Las facturas
// de Colón se cobran con cheques (no traen CUIT): se cruzan contra la suma
// de los cheques depositados, en la vista Por CUIT, no una por una.
// Devuelve { movs, facs, porMov:{movId:[facId]}, porFac:{facId:[movId]}, cat:{movId:k} }.
function concCruzar() {
  var meses = concMesesTodos();
  var movs = [], facs = [];
  meses.forEach(function(m) { movs = movs.concat(concMovsMes(m)); facs = facs.concat(concFacturasMes(m)); });
  var man = concLeer(CONC_MAN_KEY, {}), cuits = concLeer(CONC_CUITS_KEY, {});
  var porMov = {}, porFac = {}, cat = {}, auto = {};
  var facById = {}; facs.forEach(function(f) { facById[f.id] = f; });
  function vincular(mid, fids, esAuto) {
    porMov[mid] = (porMov[mid] || []).concat(fids);
    fids.forEach(function(fid) { porFac[fid] = (porFac[fid] || []).concat([mid]); });
    if (esAuto) auto[mid] = true;
  }
  // 1) a mano
  movs.forEach(function(mv) {
    var x = man[mv.id]; if (!x) return;
    var fids = (x.facs || []).filter(function(id) { return facById[id]; });
    if (fids.length) vincular(mv.id, fids, false);
  });
  var cuitsConFac = {};
  facs.forEach(function(f) { cuitsConFac[f.cuit] = true; });
  function libre(f) { return !porFac[f.id]; }
  function dias(a, b) { return (new Date(a) - new Date(b)) / 86400000; }
  var porCuitFac = {};
  facs.forEach(function(f) { (porCuitFac[f.cuit] = porCuitFac[f.cuit] || []).push(f); });
  Object.keys(porCuitFac).forEach(function(k) { porCuitFac[k].sort(function(a, b) { return a.f < b.f ? -1 : a.f > b.f ? 1 : 0; }); });
  // Signo esperado: un pago (débito) cancela recibidas; un crédito, emitidas.
  function candidatas(mv) {
    var tipo = mv.imp < 0 ? 'R' : 'E';
    return (porCuitFac[mv.cuit] || []).filter(function(f) {
      return f.id.charAt(0) === tipo && libre(f) && dias(f.f, mv.f) <= 10 && dias(mv.f, f.f) <= 365;
    });
  }
  var conCuit = movs.filter(function(mv) { return mv.cuit && !porMov[mv.id] && !man[mv.id] && cuitsConFac[mv.cuit] && mv.cuit !== CONC_CUIT_PROPIO; });
  // 2) 1:1
  conCuit.forEach(function(mv) {
    var obj = concCent(Math.abs(mv.imp)), mejor = null;
    candidatas(mv).forEach(function(f) {
      if (concCent(f.total) !== obj) return;
      if (!mejor || Math.abs(dias(mv.f, f.f)) < Math.abs(dias(mv.f, mejor.f))) mejor = f;
    });
    if (mejor) vincular(mv.id, [mejor.id], true);
  });
  // 3) 1 pago : N facturas
  conCuit.forEach(function(mv) {
    if (porMov[mv.id]) return;
    var obj = concCent(Math.abs(mv.imp)), c = candidatas(mv).slice(0, 14), hallado = null;
    (function buscar(i, suma, sel) {
      if (hallado || sel.length > 6) return;
      if (suma === obj && sel.length > 1) { hallado = sel.slice(); return; }
      for (var j = i; j < c.length && !hallado; j++) {
        var v = concCent(c[j].total);
        if (suma + v > obj && v > 0) continue;
        sel.push(c[j]); buscar(j + 1, suma + v, sel); sel.pop();
      }
    })(0, 0, []);
    if (hallado) vincular(mv.id, hallado.map(function(f) { return f.id; }), true);
  });
  // 4) N pagos : 1 factura (pago en cuotas)
  Object.keys(porCuitFac).forEach(function(cu) {
    porCuitFac[cu].forEach(function(f) {
      if (!libre(f)) return;
      var tipo = f.id.charAt(0);
      var pagos = conCuit.filter(function(mv) {
        return mv.cuit === cu && !porMov[mv.id] && (tipo === 'R' ? mv.imp < 0 : mv.imp > 0) && dias(f.f, mv.f) <= 10 && dias(mv.f, f.f) <= 180;
      }).slice(0, 10);
      var obj = concCent(Math.abs(f.total)), hallado = null;
      (function buscar(i, suma, sel) {
        if (hallado || sel.length > 4) return;
        if (suma === obj && sel.length > 1) { hallado = sel.slice(); return; }
        for (var j = i; j < pagos.length && !hallado; j++) {
          var v = concCent(Math.abs(pagos[j].imp));
          if (suma + v > obj) continue;
          sel.push(pagos[j]); buscar(j + 1, suma + v, sel); sel.pop();
        }
      })(0, 0, []);
      if (hallado) hallado.forEach(function(mv) { vincular(mv.id, [f.id], true); });
    });
  });
  // CUITs de profesionales: el banco trae el apellido en la lista de
  // transferencias ("DE LA COLI", "BRUNI/ MAXIMILI"); si coincide con uno de
  // DOCTORES, ese CUIT es de un profesional (honorarios, sin factura en ARCA).
  var cuitProf = {};
  if (typeof DOCTORES !== 'undefined') {
    var aps = DOCTORES.map(function(d) { return String(d.apellido || '').toUpperCase().slice(0, 6); }).filter(function(a) { return a.length >= 4; });
    movs.forEach(function(mv) {
      if (!mv.cuit || !mv.nom || cuitsConFac[mv.cuit]) return;
      var n = mv.nom.toUpperCase();
      if (aps.some(function(a) { return n.indexOf(a) !== -1; })) cuitProf[mv.cuit] = true;
    });
  }
  // Obra (módulo Gastos Casa): muchas transferencias "INMEDIATA COE" no traen
  // CUIT ni nombre, pero están anotadas en el libro de la obra con la misma
  // fecha (±4 días) e importe. También la agenda de proveedores de la obra
  // (OBRA_AGENDA_SEED) trae CUITs con nombre (techista, fletes...).
  var obraNom = {}, obraCuit = {};
  if (typeof OBRA_AGENDA_SEED !== 'undefined') {
    OBRA_AGENDA_SEED.forEach(function(a) { var c = String(a.c || '').replace(/\D/g, ''); if (c.length === 11 && !obraCuit[c]) obraCuit[c] = a.n; });
  }
  var gc = [];
  try { if (typeof gcLeer === 'function') gc = gcLeer().filter(function(r) { return r && r.tipo !== 'aporte' && r.imp > 0 && r.f; }); } catch (e) {}
  var gcUsado = {};
  movs.forEach(function(mv) {
    if (mv.imp >= 0 || porMov[mv.id] || (man[mv.id] && man[mv.id].cat) || concCatAuto(mv)) return;
    if (!/TRANSF/.test(mv.c) || mv.cuit === CONC_CUIT_PROPIO) return;
    var mejor = -1;
    gc.forEach(function(r, i) {
      if (gcUsado[i] || concCent(r.imp) !== concCent(-mv.imp) || Math.abs(dias(r.f, mv.f)) > 4) return;
      if (mejor === -1 || Math.abs(dias(r.f, mv.f)) < Math.abs(dias(gc[mejor].f, mv.f))) mejor = i;
    });
    if (mejor !== -1) { gcUsado[mejor] = true; obraNom[mv.id] = gc[mejor].c; }
  });
  // Un CUIT que aparece una vez en Gastos Casa (ej. el pintor) es de la obra
  // también en los pagos que no están anotados ahí.
  movs.forEach(function(mv) { if (mv.cuit && obraNom[mv.id] && !obraCuit[mv.cuit] && !cuitsConFac[mv.cuit]) obraCuit[mv.cuit] = obraNom[mv.id]; });
  movs.forEach(function(mv) {
    if (!mv.nom && obraNom[mv.id]) mv.nom = obraNom[mv.id] + ' (Gastos Casa)';
    if (!mv.nom && mv.cuit && obraCuit[mv.cuit]) mv.nom = obraCuit[mv.cuit] + ' (agenda obra)';
  });
  Object.keys(CONC_CUIT_PROF).forEach(function(c) { if (!cuitsConFac[c]) cuitProf[c] = true; });
  movs.forEach(function(mv) { if (CONC_CUIT_PROF[mv.cuit] && (!mv.nom || /^\d+$/.test(mv.nom))) mv.nom = CONC_CUIT_PROF[mv.cuit]; });
  // Categoría final de cada movimiento.
  movs.forEach(function(mv) {
    var x = man[mv.id];
    if (x && x.cat) { cat[mv.id] = x.cat; return; }
    if (porMov[mv.id]) { cat[mv.id] = mv.imp < 0 ? 'prov' : 'cobro'; return; }
    var a = concCatAuto(mv);
    if (a) { cat[mv.id] = a; return; }
    if (mv.cuit && cuits[mv.cuit] && cuits[mv.cuit].cat) { cat[mv.id] = cuits[mv.cuit].cat; return; }
    if (mv.cuit && cuitsConFac[mv.cuit]) { cat[mv.id] = mv.imp < 0 ? 'prov' : 'cobro'; return; }
    if (mv.cuit && cuitProf[mv.cuit]) { cat[mv.id] = 'hon'; return; }
    if (obraNom[mv.id] || (mv.cuit && obraCuit[mv.cuit])) { cat[mv.id] = 'obra'; return; }
    cat[mv.id] = 'pend';
  });
  return { movs: movs, facs: facs, porMov: porMov, porFac: porFac, cat: cat, auto: auto, man: man, cuits: cuits, facById: facById };
}

// ══════ PANTALLA ═══════════════════════════════════════════════════════
var concMesSel = '', concVista = 'resumen', concFiltroCat = '', concFiltroCta = '', concFiltroFac = 'pend', concAbierto = '';
var _concPulled = {};
function concEsc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function concFmt(n) { return '$ ' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function concFecha(iso) { var p = String(iso).split('-'); return p[2] + '/' + p[1]; }
function concMesNombre(mes) { var p = mes.split('-'); return CONC_MESES[+p[1] - 1].charAt(0) + CONC_MESES[+p[1] - 1].slice(1).toLowerCase() + ' ' + p[0]; }
function concFacCorta(f) {
  var t = /Nota de Cr/i.test(f.tipo) ? 'NC' : (/Liquidaci/i.test(f.tipo) ? 'LIQ' : (/FCE|Cr[eé]dito electr/i.test(f.tipo) ? 'FCE' : 'F'));
  var letra = (/ ([ABCM])$/.exec(f.tipo) || /\b([ABCM])\b/.exec(f.tipo.replace(/^\d+ - /, '')) || [])[1] || '';
  return t + (letra ? ' ' + letra : '') + ' ' + f.pv + '-' + f.nro;
}

// Trae del servidor el índice y los meses; repinta si cambió algo y la
// pantalla sigue abierta.
function concPull(k) {
  if (_concPulled[k] || typeof syncPull !== 'function') return;
  _concPulled[k] = true;
  syncPull(k, function() {
    if (k === CONC_IDX_KEY) concPullMeses();
    if (document.getElementById('concRoot')) renderConciliacion();
  });
}
function concPullMeses() {
  var i = concIdx();
  i.bbva.forEach(function(m) { Object.keys(CONC_CUENTAS).forEach(function(n) { concPull(concKeyMov(m, n)); }); });
  i.arca.forEach(function(m) { concPull(concKeyArca(m, 'R')); concPull(concKeyArca(m, 'E')); });
  concPull(CONC_CUITS_KEY); concPull(CONC_MAN_KEY);
}

function renderConciliacion(mes) {
  if (typeof cerrarAdmSidenav === 'function') cerrarAdmSidenav();
  if (typeof admDesactivarSidebar === 'function' && !document.getElementById('concRoot')) admDesactivarSidebar();
  var btn = document.getElementById('adm-sidenav-conciliacion');
  if (btn) btn.className = 'adm-sidenav-btn active';
  concPull(CONC_IDX_KEY); concPullMeses();
  var meses = concMesesTodos();
  if (mes) concMesSel = mes;
  if (meses.indexOf(concMesSel) === -1) concMesSel = meses.length ? meses[meses.length - 1] : '';

  var vb = function(k, t) { return '<button class="deb-btn' + (concVista === k ? ' deb-btn-pri' : '') + '" onclick="concVista=\'' + k + '\';concAbierto=\'\';renderConciliacion()">' + t + '</button>'; };
  var html = '<div id="concRoot">'
    + '<div class="deb-toolbar" style="flex-wrap:wrap;gap:6px">'
    + vb('resumen', '📊 Resumen del mes') + vb('movs', '🏦 Movimientos') + vb('facturas', '🧾 Facturas ARCA') + vb('cuit', '👥 Por CUIT') + vb('imp', '🏛 Impuestos del banco')
    + '<button class="deb-btn" style="margin-left:auto" onclick="concImportar()" title="Resumen del BBVA en PDF y/o Mis Comprobantes de ARCA en Excel (emitidos y recibidos). Se pueden elegir varios juntos.">⬆ Importar mes</button>'
    + (concMesSel ? '<button class="deb-btn" onclick="concExportarExcel()">⬇ Excel del mes</button>'
      + '<button class="deb-btn deb-btn-pri" onclick="concPaqueteContador(false)" title="Un Excel con IVA ventas, control de IVA compras, impuestos del banco y resumen contable del mes elegido">📦 Contador: mes</button>'
      + '<button class="deb-btn deb-btn-pri" onclick="concPaqueteContador(true)" title="Lo mismo, desde junio 2026 hasta el mes elegido">📦 Contador: ejercicio</button>' : '')
    + '</div>'
    + '<div id="concAviso" style="display:none;font-size:.75rem;padding:8px 10px;border-radius:7px;margin-bottom:10px"></div>';
  if (!meses.length) {
    html += '<div style="padding:24px;text-align:center;color:rgba(32,36,31,.5);font-size:.82rem;line-height:1.6">'
      + 'Todavía no hay nada cargado.<br>Tocá <b>⬆ Importar mes</b> y elegí el resumen del BBVA (PDF) y los Excel de ARCA '
      + '(Mis Comprobantes emitidos y recibidos). Ejercicio desde el 01/06/2026.</div></div>';
    document.getElementById('adm-content').innerHTML = html;
    return;
  }
  var idx = concIdx();
  html += '<div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:12px">'
    + meses.map(function(m) {
        var on = m === concMesSel, falta = idx.bbva.indexOf(m) === -1 ? ' (sin banco)' : (idx.arca.indexOf(m) === -1 ? ' (sin ARCA)' : '');
        return '<span onclick="renderConciliacion(\'' + m + '\')" style="flex-shrink:0;cursor:pointer;font-size:.72rem;padding:5px 13px;border-radius:20px;white-space:nowrap;font-weight:700;border:1px solid '
          + (on ? '#1f3a2e;background:#1f3a2e;color:#fff' : 'rgba(32,36,31,.15);background:rgba(32,36,31,.04);color:rgba(32,36,31,.6)') + '">'
          + concMesNombre(m) + '<span style="font-weight:400;opacity:.7">' + falta + '</span></span>';
      }).join('') + '</div>';

  var X = concCruzar();
  if (concVista === 'movs') html += concVistaMovs(X);
  else if (concVista === 'facturas') html += concVistaFacturas(X);
  else if (concVista === 'cuit') html += concVistaCuit(X);
  else if (concVista === 'imp') html += concVistaImpuestos(X);
  else html += concVistaResumen(X);
  html += '</div>';
  document.getElementById('adm-content').innerHTML = html;
}

function concVistaResumen(X) {
  var mes = concMesSel, saldos = concSaldosMes(mes);
  var movs = X.movs.filter(function(m) { return m.mes === mes; });
  var h = '';
  if (!Object.keys(saldos).length) h += '<div style="font-size:.78rem;color:#9a3412;background:#ffedd5;padding:8px 10px;border-radius:7px;margin-bottom:10px">Falta importar el resumen del BBVA de ' + concMesNombre(mes) + '.</div>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px">';
  Object.keys(saldos).forEach(function(nro) {
    var S = saldos[nro], ms = movs.filter(function(m) { return m.cta === nro; });
    var cred = 0, deb = 0;
    ms.forEach(function(m) { if (m.imp > 0) cred += m.imp; else deb += m.imp; });
    var calc = (S.ant || 0) + cred + deb, ok = concCent(calc) === concCent(S.fin);
    h += '<div style="flex:1;min-width:260px;border:1px solid rgba(32,36,31,.12);border-radius:10px;padding:12px 14px;font-size:.8rem">'
      + '<div style="font-weight:800;margin-bottom:8px">' + concEsc(CONC_CUENTAS[nro] || nro) + ' <span style="font-weight:400;color:rgba(32,36,31,.5)">(' + ms.length + ' mov.)</span></div>'
      + '<div style="display:grid;grid-template-columns:1fr auto;gap:3px 12px">'
      + '<span>Saldo inicial del resumen</span><b style="text-align:right">' + concFmt(S.ant) + '</b>'
      + '<span>+ Créditos</span><span style="text-align:right;color:#1d6b62">' + concFmt(cred) + '</span>'
      + '<span>− Débitos</span><span style="text-align:right;color:#b13a2c">' + concFmt(-deb) + '</span>'
      + '<span>= Saldo calculado</span><b style="text-align:right">' + concFmt(calc) + '</b>'
      + '<span>Saldo final del resumen</span><b style="text-align:right">' + concFmt(S.fin) + '</b>'
      + '</div><div style="margin-top:8px;font-weight:700;color:' + (ok ? '#16a34a' : '#b13a2c') + '">' + (ok ? '✓ Cierra al centavo' : '✗ No cierra: diferencia ' + concFmt(S.fin - calc)) + '</div></div>';
  });
  h += '</div>';
  // Por categoría
  var porCat = {};
  movs.forEach(function(m) {
    var k = X.cat[m.id], c = porCat[k] = porCat[k] || { n: 0, cred: 0, deb: 0 };
    c.n++; if (m.imp > 0) c.cred += m.imp; else c.deb += m.imp;
  });
  h += '<div class="adm-sec-title">Movimientos por categoría</div><div class="adm-table-wrap"><table class="adm-table"><thead><tr><th style="text-align:left">Categoría</th><th>Cant.</th><th>Créditos</th><th>Débitos</th></tr></thead><tbody>'
    + CONC_CATS.filter(function(c) { return porCat[c.k]; }).map(function(c) {
        var v = porCat[c.k], pend = c.k === 'pend';
        return '<tr' + (pend ? ' style="background:#ffedd5"' : '') + '><td style="text-align:left"><a href="#" onclick="event.preventDefault();concVista=\'movs\';concFiltroCat=\'' + c.k + '\';renderConciliacion()" style="color:inherit">' + (pend ? '⚠ ' : '') + c.t + '</a></td>'
          + '<td>' + v.n + '</td><td>' + (v.cred ? concFmt(v.cred) : '—') + '</td><td>' + (v.deb ? concFmt(-v.deb) : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  // ARCA del mes
  var facs = X.facs.filter(function(f) { return f.f.slice(0, 7) === mes; });
  var fila = function(tipo, lbl, verbo) {
    var l = facs.filter(function(f) { return f.id.charAt(0) === tipo; }), v = l.filter(function(f) { return X.porFac[f.id]; });
    var tot = function(a) { return a.reduce(function(s, f) { return s + f.total; }, 0); };
    return '<tr><td style="text-align:left">' + lbl + '</td><td>' + l.length + '</td><td>' + concFmt(tot(l)) + '</td><td>' + v.length + ' (' + concFmt(tot(v)) + ')</td>'
      + '<td><a href="#" onclick="event.preventDefault();concVista=\'facturas\';concFiltroFac=\'pend' + tipo + '\';renderConciliacion()">' + (l.length - v.length) + '</a></td></tr>';
  };
  h += '<div class="adm-sec-title" style="margin-top:18px">Facturas de ARCA de ' + concMesNombre(mes) + '</div>'
    + (facs.length ? '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th style="text-align:left"></th><th>Cant.</th><th>Total</th><th>Con movimiento del banco</th><th>Sin movimiento</th></tr></thead><tbody>'
      + fila('R', 'Recibidas (compras)', 'pagadas') + fila('E', 'Emitidas (ventas)', 'cobradas') + '</tbody></table></div>'
      + '<div style="font-size:.68rem;color:rgba(32,36,31,.5);margin-top:4px">Una factura "sin movimiento" puede estar pendiente de pago, haberse pagado con retenciones (el importe no coincide) o en un mes que todavía no se importó. Las de Colón se cobran con cheques: se comparan en total en "Por CUIT".</div>'
      : '<div style="font-size:.78rem;color:#9a3412">Falta importar ARCA de este mes.</div>');
  return h;
}

function concVistaMovs(X) {
  var mes = concMesSel;
  var movs = X.movs.filter(function(m) { return m.mes === mes && (!concFiltroCta || m.cta === concFiltroCta) && (!concFiltroCat || X.cat[m.id] === concFiltroCat || (concFiltroCat === 'sinfac' && X.cat[m.id] === 'prov' && !X.porMov[m.id])); });
  var h = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;font-size:.75rem;align-items:center">'
    + '<select onchange="concFiltroCta=this.value;renderConciliacion()" style="font-family:inherit;font-size:.75rem;padding:4px"><option value="">Las 2 cuentas</option>'
    + Object.keys(CONC_CUENTAS).map(function(n) { return '<option value="' + n + '"' + (concFiltroCta === n ? ' selected' : '') + '>' + CONC_CUENTAS[n] + '</option>'; }).join('') + '</select>'
    + '<select onchange="concFiltroCat=this.value;renderConciliacion()" style="font-family:inherit;font-size:.75rem;padding:4px"><option value="">Todas las categorías</option>'
    + '<option value="sinfac"' + (concFiltroCat === 'sinfac' ? ' selected' : '') + '>Pagos a proveedor sin factura vinculada</option>'
    + CONC_CATS.map(function(c) { return '<option value="' + c.k + '"' + (concFiltroCat === c.k ? ' selected' : '') + '>' + c.t + '</option>'; }).join('') + '</select>'
    + '<span style="color:rgba(32,36,31,.5)">' + movs.length + ' movimiento(s)</span></div>';
  h += '<div class="adm-table-wrap"><table class="adm-table" style="font-size:.72rem"><thead><tr><th>Fecha</th><th>Cta.</th><th style="text-align:left">Concepto</th><th>Débito</th><th>Crédito</th><th>Categoría</th><th style="text-align:left">Factura</th></tr></thead><tbody>';
  movs.forEach(function(m) {
    var k = X.cat[m.id], fids = X.porMov[m.id] || [];
    var sel = '<select onchange="concSetCat(\'' + m.id + '\',this.value)" style="font-family:inherit;font-size:.7rem;padding:2px;max-width:150px' + (k === 'pend' ? ';background:#ffedd5' : '') + '">'
      + CONC_CATS.map(function(c) { return '<option value="' + c.k + '"' + (c.k === k ? ' selected' : '') + '>' + c.t + '</option>'; }).join('') + '</select>';
    var fac = fids.map(function(id) { var f = X.facById[id]; return f ? concEsc(concFacCorta(f)) + ' <span style="color:rgba(32,36,31,.5)">' + concFmt(f.total) + '</span>' : ''; }).join('<br>');
    if (fids.length) fac += (X.auto[m.id] ? ' <span title="Vinculada automáticamente" style="color:#1d6b62">auto</span>' : '') + ' <a href="#" onclick="event.preventDefault();concDesvincular(\'' + m.id + '\')" style="color:#b13a2c" title="Quitar el vínculo">✕</a>';
    else if (k === 'prov' || k === 'cobro' || k === 'pend' || k === 'otros') fac = '<a href="#" onclick="event.preventDefault();concAbierto=concAbierto===\'' + m.id + '\'?\'\':\'' + m.id + '\';renderConciliacion()">vincular…</a>';
    h += '<tr' + (k === 'pend' ? ' style="background:rgba(255,237,213,.5)"' : '') + '><td>' + concFecha(m.f) + '</td><td>' + concCtaCorta(m.cta) + '</td>'
      + '<td style="text-align:left">' + concEsc(m.c) + (m.nom || m.cuit ? '<div style="color:rgba(32,36,31,.5)">' + concEsc(m.nom) + (m.cuit ? ' · ' + m.cuit : '') + '</div>' : '') + '</td>'
      + '<td style="color:#b13a2c">' + (m.imp < 0 ? concFmt(-m.imp) : '') + '</td><td style="color:#1d6b62">' + (m.imp > 0 ? concFmt(m.imp) : '') + '</td>'
      + '<td>' + sel + '</td><td style="text-align:left">' + fac + '</td></tr>';
    if (concAbierto === m.id) h += '<tr><td colspan="7" style="background:rgba(32,36,31,.04);text-align:left">' + concPanelVincular(X, m) + '</td></tr>';
  });
  return h + '</tbody></table></div>';
}

// Candidatas para vincular a mano: del mismo CUIT primero, después las de
// importe parecido (±2%) en ±90 días. Solo facturas sin movimiento.
function concPanelVincular(X, m) {
  var tipo = m.imp < 0 ? 'R' : 'E', abs = Math.abs(m.imp);
  var dias = function(a, b) { return Math.abs(new Date(a) - new Date(b)) / 86400000; };
  var c = X.facs.filter(function(f) {
    if (f.id.charAt(0) !== tipo || X.porFac[f.id]) return false;
    if (m.cuit && f.cuit === m.cuit) return true;
    return Math.abs(Math.abs(f.total) - abs) <= abs * 0.02 && dias(f.f, m.f) <= 90;
  }).sort(function(a, b) { return (b.cuit === m.cuit) - (a.cuit === m.cuit) || (a.f < b.f ? -1 : 1); }).slice(0, 40);
  if (!c.length) return '<span style="font-size:.72rem;color:rgba(32,36,31,.55)">No hay facturas de ARCA sin vincular que coincidan (mismo CUIT o importe parecido). Si no lleva factura, elegí la categoría en el desplegable.</span>';
  return '<div style="font-size:.72rem;margin-bottom:6px">Elegí la/s factura/s que paga este movimiento de <b>' + concFmt(abs) + '</b>:</div>'
    + c.map(function(f) {
        return '<label style="display:block;font-size:.72rem;padding:2px 0"><input type="checkbox" class="conc-chk" value="' + concEsc(f.id) + '" data-t="' + f.total + '" onchange="concSumaSel(' + abs + ')"> '
          + concFecha(f.f) + '/' + f.f.slice(2, 4) + ' · ' + concEsc(concFacCorta(f)) + ' · ' + concEsc(f.nom) + ' · <b>' + concFmt(f.total) + '</b></label>';
      }).join('')
    + '<div style="margin-top:6px;display:flex;gap:8px;align-items:center"><button class="deb-btn deb-btn-pri" onclick="concGuardarVinculo(\'' + m.id + '\')">Guardar vínculo</button><span id="concSumaSel" style="font-size:.72rem"></span></div>';
}
function concSumaSel(obj) {
  var s = 0; document.querySelectorAll('.conc-chk:checked').forEach(function(ch) { s += parseFloat(ch.getAttribute('data-t')) || 0; });
  var el = document.getElementById('concSumaSel');
  if (el) el.innerHTML = 'Seleccionado: <b>' + concFmt(s) + '</b>' + (concCent(Math.abs(s)) === concCent(obj) ? ' <span style="color:#16a34a">✓ coincide</span>' : ' · diferencia ' + concFmt(obj - Math.abs(s)) + ' (retenciones, etc.)');
}
function concManGuardar(id, fn) {
  var man = concLeer(CONC_MAN_KEY, {});
  man[id] = fn(man[id] || {});
  concEscribir(CONC_MAN_KEY, man);
}
function concGuardarVinculo(id) {
  var fids = []; document.querySelectorAll('.conc-chk:checked').forEach(function(ch) { fids.push(ch.value); });
  if (!fids.length) return;
  concManGuardar(id, function(x) { x.facs = fids; delete x.cat; return x; });
  concAbierto = ''; renderConciliacion();
}
function concDesvincular(id) {
  concManGuardar(id, function(x) { x.facs = []; x.sinAuto = true; return x; });
  renderConciliacion();
}
function concSetCat(id, k) {
  var X = concCruzar(), mv = null;
  for (var i = 0; i < X.movs.length; i++) if (X.movs[i].id === id) { mv = X.movs[i]; break; }
  if (mv && mv.cuit && mv.cuit !== CONC_CUIT_PROPIO && confirm('¿Usar "' + concCatNombre(k) + '" para TODOS los movimientos del CUIT ' + mv.cuit + (mv.nom ? ' (' + mv.nom + ')' : '') + '?\n\nAceptar: todo el CUIT, también los meses que vengan.\nCancelar: solo este movimiento.')) {
    var cu = concLeer(CONC_CUITS_KEY, {});
    cu[mv.cuit] = { cat: k, nom: mv.nom || '' };
    concEscribir(CONC_CUITS_KEY, cu);
  } else {
    concManGuardar(id, function(x) { x.cat = k; return x; });
  }
  renderConciliacion();
}

function concVistaFacturas(X) {
  var mes = concMesSel, f0 = concFiltroFac;
  var facs = X.facs.filter(function(f) {
    if (f.f.slice(0, 7) !== mes) return false;
    if (f0 === 'pendR' || f0 === 'pendE') return f.id.charAt(0) === f0.charAt(4) && !X.porFac[f.id];
    if (f0 === 'R' || f0 === 'E') return f.id.charAt(0) === f0;
    if (f0 === 'pend') return !X.porFac[f.id];
    return true;
  });
  var movById = {}; X.movs.forEach(function(m) { movById[m.id] = m; });
  var op = function(v, t) { return '<option value="' + v + '"' + (f0 === v ? ' selected' : '') + '>' + t + '</option>'; };
  var h = '<div style="margin-bottom:10px;font-size:.75rem"><select onchange="concFiltroFac=this.value;renderConciliacion()" style="font-family:inherit;font-size:.75rem;padding:4px">'
    + op('', 'Todas') + op('pend', 'Sin movimiento del banco') + op('pendR', 'Recibidas sin pago') + op('pendE', 'Emitidas sin cobro') + op('R', 'Recibidas') + op('E', 'Emitidas')
    + '</select> <span style="color:rgba(32,36,31,.5)">' + facs.length + ' factura(s) · ' + concFmt(facs.reduce(function(s, f) { return s + f.total; }, 0)) + '</span></div>';
  h += '<div class="adm-table-wrap"><table class="adm-table" style="font-size:.72rem"><thead><tr><th>Fecha</th><th></th><th style="text-align:left">Comprobante</th><th style="text-align:left">Emisor / receptor</th><th>Total</th><th style="text-align:left">Movimiento del banco</th></tr></thead><tbody>'
    + facs.map(function(f) {
        var ms = (X.porFac[f.id] || []).map(function(id) { var m = movById[id]; return m ? concFecha(m.f) + ' ' + concCtaCorta(m.cta) + ' ' + concFmt(Math.abs(m.imp)) : ''; }).join('<br>');
        return '<tr><td>' + concFecha(f.f) + '</td><td>' + (f.id.charAt(0) === 'R' ? 'Rec.' : 'Emit.') + '</td><td style="text-align:left">' + concEsc(concFacCorta(f)) + '</td>'
          + '<td style="text-align:left">' + concEsc(f.nom) + '<div style="color:rgba(32,36,31,.5)">' + f.cuit + '</div></td><td>' + concFmt(f.total) + '</td>'
          + '<td style="text-align:left">' + (ms || '<span style="color:#9a3412">sin movimiento</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  return h;
}

// Cuenta corriente por CUIT, del inicio del ejercicio hasta el mes elegido:
// facturado (ARCA) contra lo pagado/cobrado (banco, movimientos de ese CUIT
// en categoría proveedor/cobro). El saldo es lo que queda por pagar/cobrar
// (o pagado de más / a cuenta, si es negativo).
function concVistaCuit(X) {
  var hasta = concMesSel, filas = {};
  var F = function(cu, nom) { return filas[cu] = filas[cu] || { cuit: cu, nom: nom, fr: 0, pag: 0, fe: 0, cob: 0 }; };
  X.facs.forEach(function(f) {
    if (f.f.slice(0, 7) > hasta) return;
    var r = F(f.cuit, f.nom); r.nom = f.nom;
    if (f.id.charAt(0) === 'R') r.fr += f.total; else r.fe += f.total;
  });
  X.movs.forEach(function(m) {
    if (m.mes > hasta || !m.cuit) return;
    var k = X.cat[m.id];
    if (k !== 'prov' && k !== 'cobro') return;
    var r = F(m.cuit, m.nom);
    if (m.imp < 0) r.pag -= m.imp; else r.cob += m.imp;
  });
  var lista = Object.keys(filas).map(function(k) { return filas[k]; }).sort(function(a, b) { return Math.abs(b.fr - b.pag) + Math.abs(b.fe - b.cob) - Math.abs(a.fr - a.pag) - Math.abs(a.fe - a.cob); });
  var T = { fr: 0, pag: 0, fe: 0, cob: 0 };
  var h = '<div style="font-size:.72rem;color:rgba(32,36,31,.55);margin-bottom:8px">Desde junio 2026 hasta ' + concMesNombre(hasta) + '. Saldo positivo: falta pagar/cobrar. Negativo: se pagó/cobró de más o a cuenta. Una diferencia chica suele ser retenciones.</div>'
    + '<div class="adm-table-wrap"><table class="adm-table" style="font-size:.72rem"><thead><tr><th style="text-align:left">Proveedor / cliente</th><th>Facturado (rec.)</th><th>Pagado</th><th>Saldo a pagar</th><th>Facturado (emit.)</th><th>Cobrado</th><th>Saldo a cobrar</th></tr></thead><tbody>'
    + lista.map(function(r) {
        T.fr += r.fr; T.pag += r.pag; T.fe += r.fe; T.cob += r.cob;
        var sp = r.fr - r.pag, sc = r.fe - r.cob;
        var c = function(v) { return Math.abs(v) < 0.01 ? '<span style="color:#16a34a">✓</span>' : '<b style="color:' + (v > 0 ? '#9a3412' : '#1d6b62') + '">' + concFmt(v) + '</b>'; };
        var n = function(v) { return v ? concFmt(v) : '—'; };
        return '<tr><td style="text-align:left">' + concEsc(r.nom || '') + '<div style="color:rgba(32,36,31,.5)">' + r.cuit + '</div></td><td>' + n(r.fr) + '</td><td>' + n(r.pag) + '</td><td>' + (r.fr || r.pag ? c(sp) : '') + '</td>'
          + '<td>' + n(r.fe) + '</td><td>' + n(r.cob) + '</td><td>' + (r.fe || r.cob ? c(sc) : '') + '</td></tr>';
      }).join('')
    + '<tr class="adm-totals"><td style="text-align:left">TOTAL</td><td>' + concFmt(T.fr) + '</td><td>' + concFmt(T.pag) + '</td><td>' + concFmt(T.fr - T.pag) + '</td><td>' + concFmt(T.fe) + '</td><td>' + concFmt(T.cob) + '</td><td>' + concFmt(T.fe - T.cob) + '</td></tr>'
    + '</tbody></table></div>';
  return h;
}

// ── Importar ─────────────────────────────────────────────────────────────
function concAviso(html, tipo) {
  var el = document.getElementById('concAviso'); if (!el) return;
  el.style.display = html ? 'block' : 'none';
  el.style.background = tipo === 'error' ? '#fee2e2' : (tipo === 'ok' ? '#dcfce7' : 'rgba(32,36,31,.05)');
  el.style.color = tipo === 'error' ? '#991b1b' : (tipo === 'ok' ? '#166534' : 'rgba(32,36,31,.75)');
  el.innerHTML = html;
}
function concImportar() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true; inp.accept = '.pdf,.xlsx,.xls,.csv';
  inp.onchange = function() { if (inp.files.length) concProcesarArchivos(Array.prototype.slice.call(inp.files)); };
  inp.click();
}
function concLeerArchivo(file) {
  return new Promise(function(ok, mal) {
    var r = new FileReader();
    r.onload = function() { ok(new Uint8Array(r.result)); };
    r.onerror = function() { mal(new Error('No se pudo leer ' + file.name)); };
    r.readAsArrayBuffer(file);
  });
}
function concProcesarArchivos(files) {
  concAviso('Leyendo ' + files.length + ' archivo(s)…');
  var resumenes = [], arcas = [], errores = [];
  Promise.all(files.map(function(file) {
    return concLeerArchivo(file).then(function(data) {
      if (/\.pdf$/i.test(file.name)) {
        return concLineasDesdePdf(data).then(function(lin) {
          var res = concParseBbva(lin), errs = [];
          Object.keys(res.cuentas).forEach(function(n) { res.cuentas[n].errores.forEach(function(e) { errs.push((CONC_CUENTAS[n] || n) + ': ' + e); }); });
          if (errs.length) errores.push('<b>' + concEsc(file.name) + '</b> no cierra, no se guardó:<br>' + errs.slice(0, 6).map(concEsc).join('<br>'));
          else resumenes.push({ file: file.name, res: res });
        });
      }
      var wb = XLSX.read(data, { type: 'array' });
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true });
      arcas.push({ file: file.name, arca: concParseArca(rows) });
    }).catch(function(e) { errores.push('<b>' + concEsc(file.name) + '</b>: ' + concEsc(e.message)); });
  })).then(function() {
    if (!resumenes.length && !arcas.length) { concAviso(errores.join('<br><br>') || 'No se reconoció ningún archivo.', 'error'); return; }
    var idx = concIdx(), lineas = [];
    resumenes.forEach(function(r) {
      var n = 0; Object.keys(r.res.cuentas).forEach(function(k) { n += r.res.cuentas[k].movs.length; });
      lineas.push('• BBVA ' + concMesNombre(r.res.mesRef) + ': ' + n + ' movimientos, 2 cuentas, saldos OK' + (idx.bbva.indexOf(r.res.mesRef) !== -1 ? ' (REEMPLAZA el ya cargado)' : ''));
    });
    arcas.forEach(function(a) {
      var meses = {}; a.arca.facturas.forEach(function(f) { if (f.f.slice(0, 7) >= CONC_DESDE) meses[f.f.slice(0, 7)] = true; });
      lineas.push('• ARCA ' + (a.arca.tipo === 'R' ? 'recibidas' : 'emitidas') + ': ' + a.arca.facturas.length + ' comprobantes, meses ' + Object.keys(meses).sort().map(concMesNombre).join(', ') + ' (reemplaza esos meses)');
    });
    if (!confirm('Se van a guardar:\n\n' + lineas.join('\n') + (errores.length ? '\n\n⚠ ' + errores.length + ' archivo(s) con error no se guardan.' : '') + '\n\nLo que hayas vinculado o clasificado a mano se mantiene. ¿Seguimos?')) { concAviso(''); return; }
    var meses = [];
    resumenes.forEach(function(r) { meses.push(concGuardarResumen(r.res)); });
    arcas.forEach(function(a) { concGuardarArca(a.arca); });
    if (meses.length) concMesSel = meses.sort()[meses.length - 1];
    renderConciliacion();
    concAviso('✓ Guardado: ' + lineas.map(concEsc).join('<br>') + (errores.length ? '<br><br>' + errores.join('<br><br>') : ''), errores.length ? 'error' : 'ok');
  });
}

// ── Excel del mes ────────────────────────────────────────────────────────
function concExportarExcel() {
  var mes = concMesSel, X = concCruzar(), saldos = concSaldosMes(mes);
  var movs = X.movs.filter(function(m) { return m.mes === mes; });
  var res = [['Conciliación bancaria BBVA — ' + concMesNombre(mes)], [], ['Cuenta', 'Saldo inicial', 'Créditos', 'Débitos', 'Saldo calculado', 'Saldo final resumen', 'Diferencia']];
  Object.keys(saldos).forEach(function(n) {
    var cr = 0, db = 0; movs.forEach(function(m) { if (m.cta !== n) return; if (m.imp > 0) cr += m.imp; else db += m.imp; });
    var calc = saldos[n].ant + cr + db;
    res.push([CONC_CUENTAS[n] || n, saldos[n].ant, cr, -db, calc, saldos[n].fin, Math.round((saldos[n].fin - calc) * 100) / 100]);
  });
  var mv = [['Fecha', 'Cuenta', 'Concepto', 'Nombre', 'CUIT', 'Débito', 'Crédito', 'Saldo', 'Categoría', 'Factura(s)']];
  movs.forEach(function(m) {
    mv.push([m.f, CONC_CUENTAS[m.cta] || m.cta, m.c, m.nom, m.cuit, m.imp < 0 ? -m.imp : '', m.imp > 0 ? m.imp : '', m.saldo, concCatNombre(X.cat[m.id]),
      (X.porMov[m.id] || []).map(function(id) { var f = X.facById[id]; return f ? concFacCorta(f) + ' ' + f.nom : ''; }).join(' | ')]);
  });
  var movById = {}; X.movs.forEach(function(m) { movById[m.id] = m; });
  var fc = [['Fecha', 'Tipo', 'Comprobante', 'CUIT', 'Emisor / receptor', 'Neto', 'IVA', 'Total', 'Movimiento del banco']];
  X.facs.filter(function(f) { return f.f.slice(0, 7) === mes; }).forEach(function(f) {
    fc.push([f.f, f.id.charAt(0) === 'R' ? 'Recibida' : 'Emitida', concFacCorta(f), f.cuit, f.nom, f.neto, f.iva, f.total,
      (X.porFac[f.id] || []).map(function(id) { var m = movById[id]; return m ? m.f + ' ' + (CONC_CUENTAS[m.cta] || '') + ' ' + Math.abs(m.imp) : ''; }).join(' | ') || 'sin movimiento']);
  });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(res), 'Resumen');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mv), 'Movimientos');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fc), 'Facturas ARCA');
  XLSX.writeFile(wb, 'Conciliacion_BBVA_' + mes + '.xlsx');
}

// ══════ PAQUETE PARA EL CONTADOR ═══════════════════════════════════════
// Impuestos, retenciones y gastos que el banco debita/acredita en la cuenta.
// Varios se pueden computar: el impuesto al cheque (Ley 25.413) en parte a
// cuenta de Ganancias, las retenciones y percepciones de IIBB a cuenta de
// IIBB, las percepciones de IVA y el IVA de las comisiones como crédito
// fiscal. El % computable del impuesto al cheque depende de la categoría de
// la empresa: se muestra el 33% general y se aclara que lo confirma la contadora.
var CONC_IMP_TIPOS = [
  { k: 'chqDeb',  t: 'Imp. cheque (Ley 25.413) s/ débitos',  re: /IMP\.?LEY 25\.?413/ },
  { k: 'chqCred', t: 'Imp. cheque (Ley 25.413) s/ créditos', re: /LEY NRO 25\.?413/ },
  { k: 'arba',    t: 'Retenciones IIBB (ARBA)',             re: /RETENCION ARBA/ },
  { k: 'pIIBB',   t: 'Percepciones IIBB',                   re: /PERCEP\.?\s*INGRESOS BRUTOS/ },
  { k: 'pIVA',    t: 'Percepciones IVA (RG 2408)',          re: /PERCEPCION IVA/ },
  { k: 'ivaCom',  t: 'IVA de comisiones bancarias',         re: /IVA TASA GENERAL/ },
  { k: 'comis',   t: 'Comisiones y mantenimiento (neto)',    re: /^COMI|^COM |COMISION/ },
  { k: 'afip',    t: 'Pagos AFIP / ARCA (VEP)',             re: /PAGOS AFIP/ },
  { k: 'otrRet',  t: 'Otras retenciones',                   re: /RETENCION/ },
  { k: 'interes', t: 'Intereses ganados',                   re: /INTERESES GANADOS/ }
];
function concImpTipo(c) {
  for (var i = 0; i < CONC_IMP_TIPOS.length; i++) if (CONC_IMP_TIPOS[i].re.test(c)) return CONC_IMP_TIPOS[i].k;
  return '';
}
// { mes: { tipo: importe (positivo = lo que salió de la cuenta; intereses positivo = ganado) } }
function concImpuestosPorMes(X, meses) {
  var out = {};
  meses.forEach(function(m) { out[m] = {}; });
  X.movs.forEach(function(mv) {
    if (!out[mv.mes]) return;
    var k = concImpTipo(mv.c); if (!k) return;
    out[mv.mes][k] = (out[mv.mes][k] || 0) + (k === 'interes' ? mv.imp : -mv.imp);
  });
  return out;
}
function concMesesHasta(hasta, ejercicio) {
  var b = concIdx().bbva;
  return ejercicio ? b.filter(function(m) { return m >= CONC_DESDE && m <= hasta; }) : (b.indexOf(hasta) !== -1 ? [hasta] : []);
}
function concVistaImpuestos(X) {
  var meses = concMesesHasta(concMesSel, true), I = concImpuestosPorMes(X, meses);
  if (!meses.length) return '<div style="font-size:.78rem;color:#9a3412">Falta importar resúmenes del BBVA.</div>';
  var tot = {};
  var h = '<div style="font-size:.72rem;color:rgba(32,36,31,.55);margin-bottom:8px">Desde junio 2026 hasta ' + concMesNombre(concMesSel) + ', las 2 cuentas. Sale de los movimientos del resumen.</div>'
    + '<div class="adm-table-wrap"><table class="adm-table" style="font-size:.72rem"><thead><tr><th style="text-align:left">Concepto</th>'
    + meses.map(function(m) { return '<th>' + concMesNombre(m).replace(/ 20/, ' ') + '</th>'; }).join('') + '<th>Total</th></tr></thead><tbody>';
  CONC_IMP_TIPOS.forEach(function(t) {
    var fila = meses.map(function(m) { return I[m][t.k] || 0; }), suma = fila.reduce(function(a, b) { return a + b; }, 0);
    tot[t.k] = suma;
    if (!suma) return;
    h += '<tr><td style="text-align:left">' + t.t + '</td>' + fila.map(function(v) { return '<td>' + (v ? concFmt(v) : '—') + '</td>'; }).join('') + '<td><b>' + concFmt(suma) + '</b></td></tr>';
  });
  h += '</tbody></table></div>';
  var chq = (tot.chqDeb || 0) + (tot.chqCred || 0);
  h += '<div class="adm-sec-title" style="margin-top:16px">Lo que se puede computar (para revisar con la contadora)</div>'
    + '<div style="font-size:.78rem;line-height:1.7">'
    + '• <b>A cuenta de Ganancias:</b> 33% del impuesto al cheque = <b>' + concFmt(chq * 0.33) + '</b> (sobre ' + concFmt(chq) + '). Si CEOT es PyME micro/pequeña el % puede ser mayor.<br>'
    + '• <b>A cuenta de IIBB:</b> retenciones ARBA + percepciones IIBB = <b>' + concFmt((tot.arba || 0) + (tot.pIIBB || 0)) + '</b><br>'
    + '• <b>Crédito fiscal IVA:</b> percepciones IVA = <b>' + concFmt(tot.pIVA || 0) + '</b>; IVA de comisiones = ' + concFmt(tot.ivaCom || 0)
    + ' <span style="color:rgba(32,36,31,.55)">(el BBVA lo documenta en sus "Liquidaciones A", que ya están en ARCA recibidas: no sumarlo dos veces)</span>'
    + '</div>';
  return h;
}

// Libro IVA (ventas o compras) desde ARCA, en filas para Excel.
function concLibroIva(X, tipo, meses) {
  var lista = X.facs.filter(function(f) { return f.id.charAt(0) === tipo && meses.indexOf(f.f.slice(0, 7)) !== -1; });
  // Solo las alícuotas que aparecen en el período (la mayoría vienen en cero).
  var alics = CONC_ALICUOTAS.filter(function(a) { return lista.some(function(f) { return (f.al || {})[a]; }); });
  var head = ['Fecha', 'Comprobante', 'Tipo', 'CUIT', tipo === 'E' ? 'Receptor' : 'Emisor'];
  alics.forEach(function(a) { head.push('Neto ' + a + '%', 'IVA ' + a + '%'); });
  head.push('Neto no gravado', 'Exento', 'Otros tributos', 'Total IVA', 'Total');
  var rows = [head], T = head.map(function() { return 0; });
  lista
    .sort(function(a, b) { return a.f < b.f ? -1 : a.f > b.f ? 1 : 0; })
    .forEach(function(f) {
      var r = [f.f, concFacCorta(f), f.tipo, f.cuit, f.nom];
      alics.forEach(function(a) { var v = (f.al || {})[a] || [0, 0]; r.push(v[0], v[1]); });
      r.push(f.ng || 0, f.ex || 0, f.ot || 0, f.iva || 0, f.total || 0);
      for (var i = 5; i < r.length; i++) T[i] += r[i] || 0;
      rows.push(r);
    });
  T[0] = 'TOTAL'; T[1] = T[2] = T[3] = T[4] = '';
  for (var j = 5; j < T.length; j++) T[j] = Math.round(T[j] * 100) / 100;
  rows.push([], T);
  return rows;
}

function concPaqueteContador(ejercicio) {
  var hasta = concMesSel, meses = concMesesHasta(hasta, ejercicio), X = concCruzar();
  var mesesArca = ejercicio ? concIdx().arca.filter(function(m) { return m >= CONC_DESDE && m <= hasta; }) : [hasta];
  var titulo = ejercicio ? 'Ejercicio desde junio 2026 hasta ' + concMesNombre(hasta) : concMesNombre(hasta);
  var wb = XLSX.utils.book_new();
  var hoja = function(nombre, aoa, anchos) {
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    if (anchos) ws['!cols'] = anchos.map(function(w) { return { wch: w }; });
    XLSX.utils.book_append_sheet(wb, ws, nombre);
  };

  // 1) Resumen contable del banco: por mes y cuenta, débitos/créditos por categoría.
  var rc = [['CEOT — Resumen contable BBVA — ' + titulo], [], ['Mes', 'Cuenta', 'Concepto', 'Débitos', 'Créditos']];
  meses.forEach(function(m) {
    var saldos = concSaldosMes(m);
    Object.keys(saldos).forEach(function(n) {
      var cta = CONC_CUENTAS[n] || n, por = {};
      X.movs.forEach(function(mv) {
        if (mv.mes !== m || mv.cta !== n) return;
        var k = X.cat[mv.id], c = por[k] = por[k] || [0, 0];
        if (mv.imp < 0) c[0] -= mv.imp; else c[1] += mv.imp;
      });
      rc.push([concMesNombre(m), cta, 'Saldo inicial', '', saldos[n].ant]);
      var td = 0, tc = 0;
      CONC_CATS.forEach(function(c) {
        var v = por[c.k]; if (!v) return;
        td += v[0]; tc += v[1];
        rc.push([concMesNombre(m), cta, c.t, Math.round(v[0] * 100) / 100 || '', Math.round(v[1] * 100) / 100 || '']);
      });
      rc.push([concMesNombre(m), cta, 'Total movimientos', Math.round(td * 100) / 100, Math.round(tc * 100) / 100]);
      rc.push([concMesNombre(m), cta, 'Saldo final (resumen)', '', saldos[n].fin]);
      rc.push([concMesNombre(m), cta, 'Control: inicial + créditos − débitos − final', '', Math.round((saldos[n].ant + tc - td - saldos[n].fin) * 100) / 100]);
      rc.push([]);
    });
  });
  hoja('Resumen banco', rc, [16, 14, 44, 18, 18]);

  // 2) Impuestos y retenciones del banco.
  var I = concImpuestosPorMes(X, meses), tot = {};
  var im = [['CEOT — Impuestos, retenciones y gastos debitados por el BBVA — ' + titulo], [], ['Concepto'].concat(meses.map(concMesNombre), ['Total'])];
  CONC_IMP_TIPOS.forEach(function(t) {
    var fila = meses.map(function(m) { return Math.round((I[m][t.k] || 0) * 100) / 100; });
    tot[t.k] = fila.reduce(function(a, b) { return a + b; }, 0);
    if (tot[t.k]) im.push([t.t].concat(fila, [Math.round(tot[t.k] * 100) / 100]));
  });
  var chq = (tot.chqDeb || 0) + (tot.chqCred || 0);
  im.push([], ['Computable (a confirmar con la contadora)'],
    ['A cuenta de Ganancias: 33% del impuesto al cheque', Math.round(chq * 0.33 * 100) / 100],
    ['A cuenta de IIBB: retenciones ARBA + percepciones IIBB', Math.round(((tot.arba || 0) + (tot.pIIBB || 0)) * 100) / 100],
    ['Crédito fiscal IVA: percepciones IVA', Math.round((tot.pIVA || 0) * 100) / 100],
    ['IVA de comisiones (ya documentado en las Liquidaciones A del BBVA en ARCA)', Math.round((tot.ivaCom || 0) * 100) / 100]);
  hoja('Impuestos banco', im, [58].concat(meses.map(function() { return 15; }), [16]));
  var det = [['Fecha', 'Cuenta', 'Concepto', 'Tipo', 'Importe']];
  X.movs.forEach(function(mv) {
    if (meses.indexOf(mv.mes) === -1) return;
    var k = concImpTipo(mv.c); if (!k) return;
    var t = CONC_IMP_TIPOS.filter(function(x) { return x.k === k; })[0];
    det.push([mv.f, CONC_CUENTAS[mv.cta] || mv.cta, mv.c, t.t, mv.imp]);
  });
  hoja('Detalle impuestos', det, [11, 13, 40, 36, 14]);

  // 3) IVA ventas y control de IVA compras.
  hoja('IVA Ventas', concLibroIva(X, 'E', mesesArca), [11, 16, 30, 13, 34]);
  hoja('IVA Compras (control)', concLibroIva(X, 'R', mesesArca), [11, 16, 30, 13, 34]);

  // 4) Lo que falta identificar, para que se sepa qué no está clasificado.
  var pe = [['Fecha', 'Cuenta', 'Concepto', 'Nombre', 'CUIT', 'Importe']];
  X.movs.forEach(function(mv) {
    if (meses.indexOf(mv.mes) !== -1 && X.cat[mv.id] === 'pend') pe.push([mv.f, CONC_CUENTAS[mv.cta] || mv.cta, mv.c, mv.nom, mv.cuit, mv.imp]);
  });
  hoja('Sin identificar', pe.length > 1 ? pe : [['No quedan movimientos sin identificar.']], [11, 13, 40, 22, 13, 14]);

  XLSX.writeFile(wb, 'CEOT_contador_' + (ejercicio ? CONC_DESDE + '_a_' : '') + hasta + '.xlsx');
}

if (typeof module !== 'undefined') module.exports = { concParseBbva: concParseBbva, concLineasDesdeItems: concLineasDesdeItems, concNum: concNum,
  concParseArca: concParseArca, concGuardarResumen: concGuardarResumen, concGuardarArca: concGuardarArca, concCruzar: concCruzar, concMovsMes: concMovsMes };
