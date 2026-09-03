// ═══════════════════════════════════════════════════════════════════
// gastos-obra.js — extraído de index.html.
// Gastos y Pagos (espejo sheet, solo lectura) + Pagos de obra (cola/
// agenda de proveedores con CUIT-CBU + historial) + Licencias y
// asistencias. Solo definiciones.
// ═══════════════════════════════════════════════════════════════════

// ══════ GASTOS Y PAGOS — espejo de la pestaña "GASTOS MENSUALES" ══════
// Solo lectura. Trae el detalle del sheet "Gastos y Pagos CEOT"
// (1BjKNOWI...) tab GASTOS MENSUALES (gid 822642804) vía gviz JSONP — SIN
// backend nuevo. Layout del sheet: bloques por mes de liquidación ("abril
// 2026", "mayo 2026"...); en cada bloque las columnas K/L (idx 10/11)
// tienen el Método de Pago y el Importe vigentes del mes (las columnas
// NOV..FEB de la izquierda quedaron congeladas en feb, no se usan). El
// estado se DEDUCE del método: "Pendiente"/"en espera"/"en trámite" →
// pendiente; sin importe → sin dato; cualquier método real → pagado.
// N° de factura: Marcelo lo va a agregar más adelante (hoy no está en el sheet).
var GP_SHEET_ID = "1BjKNOWI4TpijG_56XFbSVz1u5QNWVQE53SD5gA1LPAc";
var GP_GID = "822642804";
var GP_DATA = null;
var _gpCbSeq = 0;
var _gpMesAct = null;

function gpNum(s) {
  if (s == null) return null;
  s = String(s).replace(/[^\d.,-]/g, "");
  if (!s) return null;
  var hasC = s.indexOf(",") !== -1, hasD = s.indexOf(".") !== -1;
  if (hasC && hasD) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasC) {
    var af = s.length - s.lastIndexOf(",") - 1;
    s = af <= 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (hasD) {
    var parts = s.split("."), g3 = parts.slice(1).every(function (p) { return p.length === 3; });
    if (g3) s = s.replace(/\./g, "");
  }
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}
function gpEstado(metodo, importe) {
  if (importe == null) return "sindato";
  var m = (metodo || "").toLowerCase();
  if (/pendiente|espera|tr[aá]mite/.test(m)) return "pendiente";
  return "pagado";
}
function gpParse(rows) {
  var MESES_RE = /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+2026/i;
  var meses = [], porMes = {}, cur = null;
  rows.forEach(function (r) {
    var c = r.c || [];
    var v = function (i) { return (c[i] && c[i].v != null ? c[i].v : "").toString().trim(); };
    var a = v(0);
    var mm = a.match(MESES_RE);
    if (mm) {
      cur = mm[1].toLowerCase();
      if (!porMes[cur]) { porMes[cur] = { filas: [], total: null, emp: [], sec: {} }; meses.push(cur); }
      return;
    }
    if (!cur) return;
    var S = porMes[cur].sec;

    // ── Lado izquierdo: gastos (servicios / alquiler / honorarios) ──
    if (a && a !== "RUBRO") {
      if (a.indexOf("TOTAL GASTOS A") !== -1) {
        porMes[cur].total = gpNum(v(11));
      } else {
        var imp = gpNum(v(11)), met = v(10);
        if (imp != null || met) {
          porMes[cur].filas.push({ rubro: a, detalle: v(1), importe: imp, metodo: met, estado: gpEstado(met, imp) });
        }
      }
    }

    // ── Lado derecho: sueldos y otras secciones (cols N–Q ≈ idx 13–16) ──
    var d13 = v(13), up = d13.toUpperCase();
    var n14 = gpNum(v(14)), n15 = gpNum(v(15)), n16 = gpNum(v(16));
    if (d13) {
      if (up.indexOf("TOTAL POR CONCEPTO") === 0) { S.sueldoA = n14; S.sueldoB = n15; if (n16 != null) S.sueldoTot = n16; }
      else if (up.indexOf("FONDO CAJA CHICA") === 0) { S.cajaChica = (n16 != null ? n16 : n15); }
      else if (up.indexOf("CARGAS SOCIALES") === 0) { S.cargas = n16; }
      else if (up.indexOf("SINDICATOS") === 0) { S.sindicatos = n16; }
      else if (/\/\s*13\s*=?/.test(d13)) {
        var x = d13.match(/([\d.,]+)\s*\/\s*13\s*=?\s*([\d.,]+)/);
        if (x) { S.divMonto = gpNum(x[1]); S.divPorProf = gpNum(x[2]); }
      } else if (!/EMPLEADOS|SUELDO|TOTAL|GERLING|DETALLE/.test(up) && (n14 != null || n15 != null)) {
        porMes[cur].emp.push({ nombre: d13, sa: n14, sb: n15, tot: (n16 != null ? n16 : (((n14 || 0) + (n15 || 0)) || null)) });
      }
    }
    if (v(15).toUpperCase().indexOf("TOTAL FINAL") === 0) { var tf = gpNum(v(16)); if (tf != null) S.sueldoTot = tf; }
  });
  return { meses: meses, porMes: porMes };
}
function gpFetch(cb) {
  var cbName = "__gpCb" + (_gpCbSeq++);
  var done = false;
  var limpiar = function () {
    window[cbName] = function () {};
    var s = document.getElementById(cbName); if (s) s.remove();
  };
  var to = setTimeout(function () { if (!done) { done = true; limpiar(); cb(null, "timeout"); } }, 15000);
  window[cbName] = function (resp) {
    if (done) return;
    done = true; clearTimeout(to); limpiar();
    try { GP_DATA = gpParse((resp && resp.table && resp.table.rows) || []); cb(GP_DATA); }
    catch (e) { cb(null, e.message); }
  };
  var script = document.createElement("script");
  script.id = cbName;
  script.onerror = function () { if (!done) { done = true; clearTimeout(to); limpiar(); cb(null, "error de red"); } };
  script.src = "https://docs.google.com/spreadsheets/d/" + GP_SHEET_ID +
    "/gviz/tq?gid=" + GP_GID + "&headers=0&tqx=out:json;responseHandler:" + cbName;
  document.head.appendChild(script);
}
// ══════ PAGOS DE OBRA ═══════════════════════════════════════
// Armador de lote para transferencias a proveedores de la obra de los
// consultorios nuevos. 3 partes: cola de la semana (lo que se paga el jueves),
// agenda de proveedores (nombre/rubro/Alias-o-CBU/CUIT, editable) e historial
// de lo ya pagado. Exporta un CSV genérico (Proveedor,Alias/CBU,CUIT,Importe,
// Concepto) para cargar a mano en BBVA. Todo en localStorage + syncPush/
// syncPull (claves ceot_obra_agenda / ceot_obra_cola / ceot_obra_hist), sin
// backend nuevo. La agenda se siembra la primera vez con los proveedores
// sacados del histórico de la obra "Casa 14 de julio 2067".

var OBRA_K_AG = "ceot_obra_agenda";
var OBRA_K_CO = "ceot_obra_cola";
var OBRA_K_HI = "ceot_obra_hist";
var _obraPulled = false;
var OBRA_AGENDA_SEED = /*__SEED__*/[
  {n:"Alejandro Ruben silva",r:"Mano de obra / albañilería",a:"ARPA.TANQUE.MAMA",d:"0150524501000132432556",c:"20-24371550-5"},
  {n:"MARCH CERAM SA",r:"Cerámicos / pegamento",a:"CERAMICO.PEGAMENTO",d:"0170090920000042939571",c:"30-71449662-6"},
  {n:"Bertello Luis (1 contenedor)",r:"Volquetes / contenedores",a:"aforo.aleta.edad",d:"aforo.aleta.edad",c:""},
  {n:"zingueria Toletum srl",r:"Zinguería",a:"0140466501619005138383",d:"0140466501619005138383",c:"30-71617563-0"},
  {n:"Materiales aire acondicionado",r:"Aire acondicionado",a:"jony.aire",d:"0000003100084945618270",c:"23-23776118-9"},
  {n:"Honorarios Plomeria",r:"Plomería (mano de obra)",a:"Sur.idea.bozal",d:"0170090940000049793817",c:"23-35233273-9"},
  {n:"Techista: HECTOR MARCELO,FRIAS",r:"Techista",a:"0140323503420072541219",d:"0140323503420072541219",c:"20-17593486-4"},
  {n:"Electricista",r:"Electricidad",a:"SICMAGALICIA",d:"0070078820000016183982",c:"30-70974779-3"},
  {n:"GM SANITARIOS SRL GM SANITARIOS",r:"Sanitarios / grifería / gas",a:"CC $ 0235-004712/8",d:"0170235620000000471286",c:"30-69261774-2"},
  {n:"Electricista",r:"Electricidad",a:"alejandro.1364",d:"0000003100053122363908",c:""},
  {n:"Pablo Daniel Gomez",r:"Durlock / placas",a:"0000003100024631570262",d:"Daniel.gomez.l.d",c:"20-33188990-4"},
  {n:"Marcos Cristobal Asensio (yesero)",r:"Yesería",a:"0000003100064311104471",d:"0000003100064311104471",c:""},
  {n:"Julio Diaz",r:"Fletes",a:"sprinter99",d:"sprinter99",c:"20-13267855-4"},
  {n:"TERMO ATLANTICA S A",r:"Sanitarios / grifería / gas",a:"0070166820000001810451",d:"0070166820000001810451",c:""},
  {n:"Aberturas ANAYA (20%)",r:"Aberturas",a:"0150865702000100676406",d:"0150865702000100676406",c:""},
  {n:"GM Sanitarios Srl",r:"Sanitarios / grifería / gas",a:"0170235620000000471286",d:"0170235620000000471286",c:"30-69261774-2"},
  {n:"Mano de obra Plomeria",r:"Plomería (mano de obra)",a:"lucas.273.ajeno.mp",d:"0170090940000049793817",c:"23-35233273-9"},
  {n:"Héctor Marcelo frías",r:"Techista",a:"Bolsa.china.blonda",d:"0140323503420072541219",c:"20-17593486-4"},
  {n:"materiales tech sider group",r:"Herrería / hierros / acero",a:"0070122420000005950717",d:"0070122420000005950717",c:""},
  {n:"cableado constitución 4901",r:"Cableado Constitución 4901",a:"CC $ 0094-351474/7",d:"CC $ 0094-351474/7",c:""},
  {n:"Hierros FAULE",r:"Herrería / hierros / acero",a:"Cobre.Banana.Grano",d:"0140401601618905093303",c:"30-70971605-7"},
  {n:"Constitucion 4901",r:"Cableado Constitución 4901",a:"30718517733",d:"30718517733",c:""},
  {n:"Alejandro Ruben Silva",r:"Mano de obra / albañilería",a:"0150524501000132432556",d:"0150524501000132432556",c:""},
  {n:"SERVISTEEL MAR DEL PLATA SRL",r:"Herrería / hierros / acero",a:"0720459720000000044604",d:"0720459720000000044604",c:""},
  {n:"SILVA FRANCO EXEQUIEL",r:"Mano de obra / albañilería",a:"0720459788000035986786",d:"0720459788000035986786",c:"20-38831970-5"},
  {n:"Plomeria honorarios",r:"Plomería (mano de obra)",a:"Jmg.flia",d:"Jmg.flia",c:"23-28454510-9"},
  {n:"Honorarios Herrero",r:"Herrería / hierros / acero",a:"walter.annese75",d:"0000003100049304533753",c:""},
  {n:"Instalacion Alarma",r:"Alarma",a:"2850684130094215735601",d:"2850684130094215735601",c:""},
  {n:"PLASTIGAS",r:"Sanitarios / grifería / gas",a:"0140401601618900587649",d:"0140401601618900587649",c:""},
  {n:"Lopez lucas (Jardineria)",r:"Jardinería",a:"Jardineria.sosa17",d:"Jardineria.sosa17",c:""},
  {n:"Durlero",r:"Durlock / placas",a:"daniel.gomez.id",d:"Daniel.gomez.l.d",c:"20-33188990-4"},
  {n:"Marcos Cristobal Asensio (yesos)",r:"Yesería",a:"marcos.yeso.mp",d:"0000003100064311104471",c:""},
  {n:"Honorarios Ingeniero",r:"Honorarios ingeniero",a:"pedropronzati.mp",d:"pedropronzati.mp",c:"20-17029892-7"},
  {n:"MARCOS DANIEL,AGUIRRE (membrana)",r:"Membrana / impermeabilización",a:"0140442903610552049689",d:"MEMBRANASMARDELPLATA",c:"20-22902403-6"},
  {n:"Pérez Rivera maderas",r:"Maderas",a:"0070084920000030433140",d:"0070084920000030433140",c:""},
  {n:"Nuevo Frio (repuestos)",r:"Sanitarios / grifería / gas",a:"CC $ 090-412829/3",d:"CC $ 090-412829/3",c:""},
  {n:"Federico Javier López",r:"Mano de obra",a:"EstiLop",d:"EstiLop",c:"20-31299437-3"},
  {n:"ASERRADERO JESKE SRL",r:"Maderas",a:"0720212620000000481140",d:"0720212620000000481140",c:""},
  {n:"GH construcciones",r:"Herrería / hierros / acero",a:"0720067020000001013522",d:"0720067020000001013522",c:""},
  {n:"Silva Franco",r:"Mano de obra / albañilería",a:"20388319705",d:"0720459788000035986786",c:"20-38831970-5"},
  {n:"Raptor Monocomando Bañera C/T CROMO HIDROMET",r:"Sanitarios / grifería / gas",a:"0110350020035000580450",d:"0110350020035000580450",c:""},
  {n:"Maria Eugenia Matos (arquitecta)",r:"Honorarios arquitecta",a:"",d:"0720722088000036031072",c:"27-35410043-1"}
];

function obraLeer(k, def) {
  try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; }
  catch (e) { return def; }
}
function obraGuardar(k, val) {
  try { localStorage.setItem(k, JSON.stringify(val)); syncPush(k); } catch (e) {}
}
function obraUID() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function obraNorm(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, "");
}
function obraAgenda() {
  var a = obraLeer(OBRA_K_AG, null);
  if (!a) {
    a = OBRA_AGENDA_SEED.map(function (s) {
      return { id: obraUID(), nombre: s.n, rubro: s.r || "", destino: s.d || s.a || "", cuit: s.c || "", nota: "" };
    });
    obraGuardar(OBRA_K_AG, a);
    return a;
  }
  var mig = false;
  a.forEach(function (p) {
    if (p.destino == null) { p.destino = p.cbu || p.alias || ""; delete p.cbu; delete p.alias; mig = true; }
  });
  if (mig) obraGuardar(OBRA_K_AG, a);
  return a;
}
// Rellena Alias/CBU y CUIT vacíos desde OBRA_AGENDA_SEED y agrega los que
// falten. Nunca pisa un dato ya cargado. Match por nombre normalizado o, si
// no, por el alias original del histórico contra el destino actual.
function obraSeedMerge() {
  if (!confirm("Trae Alias/CBU y CUIT de la lista base para los que estén vacíos y agrega los que falten. No pisa lo que ya cargaste. ¿Seguir?")) return;
  var ag = obraAgenda();
  var byName = {}, byDest = {};
  ag.forEach(function (p, i) {
    byName[obraNorm(p.nombre)] = i;
    if (p.destino) byDest[obraNorm(p.destino)] = i;
  });
  var added = 0, filled = 0;
  OBRA_AGENDA_SEED.forEach(function (s) {
    var i = byName[obraNorm(s.n)];
    if (i == null && s.a) i = byDest[obraNorm(s.a)];
    if (i == null) {
      ag.push({ id: obraUID(), nombre: s.n, rubro: s.r || "", destino: s.d || s.a || "", cuit: s.c || "", nota: "" });
      added++;
    } else {
      var p = ag[i];
      if (!p.destino && (s.d || s.a)) { p.destino = s.d || s.a; filled++; }
      if (!p.cuit && s.c) { p.cuit = s.c; filled++; }
      if (!p.rubro && s.r) p.rubro = s.r;
    }
  });
  obraGuardar(OBRA_K_AG, ag);
  renderObraPagos();
  alert("Listo. " + filled + " dato(s) completado(s), " + added + " proveedor(es) agregado(s).");
}
function obraCola() { return obraLeer(OBRA_K_CO, []); }
function obraHist() { return obraLeer(OBRA_K_HI, []); }

function obraNum(s) {
  s = String(s == null ? "" : s).replace(/[^\d,.-]/g, "");
  if (s.indexOf(",") > -1 && s.indexOf(".") > -1) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.indexOf(",") > -1) s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.indexOf(".") > -1 && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "");
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function obraFmt(n) { return "$ " + Math.round(n).toLocaleString("es-AR"); }
function obraEsc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderObraPagos() {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  var b = document.getElementById("adm-sidenav-obrapagos");
  if (b) b.className = "adm-sidenav-btn active";

  if (!_obraPulled) {
    _obraPulled = true;
    [OBRA_K_AG, OBRA_K_CO, OBRA_K_HI].forEach(function (k) {
      syncPull(k, function () { if (document.getElementById("obraPagosRoot")) renderObraPagos(); });
    });
  }

  var ag = obraAgenda(), cola = obraCola(), hist = obraHist();
  var agById = {}; ag.forEach(function (p) { agById[p.id] = p; });
  var opts = ag.slice().sort(function (a, c) { return a.nombre.localeCompare(c.nombre); })
    .map(function (p) {
      return '<option value="' + p.id + '">' + obraEsc(p.nombre) + (p.rubro ? " — " + obraEsc(p.rubro) : "") + '</option>';
    }).join("");

  var totCola = 0, sinDest = 0;
  var filasCola = cola.map(function (it) {
    var p = agById[it.provId] || { nombre: "(proveedor borrado)", rubro: "", destino: "" };
    totCola += obraNum(it.monto);
    var destTxt = p.destino ? obraEsc(p.destino) : '<span class="obra-warn">falta alias/CBU</span>';
    if (!p.destino) sinDest++;
    return '<tr>'
      + '<td>' + obraEsc(p.nombre) + '</td>'
      + '<td>' + obraEsc(p.rubro) + '</td>'
      + '<td><input value="' + obraEsc(it.concepto || "") + '" onchange="obraColaSet(\'' + it.id + '\',\'concepto\',this.value)"></td>'
      + '<td>' + destTxt + '</td>'
      + '<td><input value="' + obraEsc(it.monto || "") + '" onchange="obraColaSet(\'' + it.id + '\',\'monto\',this.value)" style="width:110px;text-align:right"></td>'
      + '<td style="text-align:center"><input type="checkbox"' + (it.urgente ? " checked" : "") + ' onchange="obraColaSet(\'' + it.id + '\',\'urgente\',this.checked)"></td>'
      + '<td style="text-align:center"><button class="obra-x" title="Quitar" onclick="obraColaQuitar(\'' + it.id + '\')">✕</button></td>'
      + '</tr>';
  }).join("");

  var html = '<div id="obraPagosRoot" style="padding:16px">'
    + '<div class="cpsm-header"><div><div class="cpsm-title">🏗️ Pagos de obra</div>'
    + '<div class="cpsm-subtitle">Cola de pagos a proveedores de los consultorios nuevos · descargá el CSV, cargalo a mano en BBVA y marcá pagado al terminar</div></div></div>'
    + '<div class="obra-add">'
    +   '<select id="obraAddProv">' + opts + '</select>'
    +   '<input id="obraAddConcepto" placeholder="Concepto / N° factura">'
    +   '<input id="obraAddMonto" placeholder="Importe" style="max-width:120px;text-align:right">'
    +   '<label class="obra-urg"><input type="checkbox" id="obraAddUrg"> urgente</label>'
    +   '<button class="cpsm-calc-btn" onclick="obraColaAgregar()">+ Agregar</button>'
    + '</div>';

  if (!cola.length) {
    html += '<div style="padding:14px 4px;color:rgba(32,36,31,.4);font-size:.8rem">La cola está vacía. Agregá pagos arriba.</div>';
  } else {
    html += '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>'
      + '<th>Proveedor</th><th>Rubro</th><th>Concepto / factura</th><th>Alias/CBU</th><th>Importe</th><th>Urg.</th><th></th>'
      + '</tr></thead><tbody>' + filasCola + '</tbody><tfoot><tr>'
      + '<td colspan="4" style="text-align:right;font-weight:700">Total cola (' + cola.length + ')</td>'
      + '<td style="text-align:right;font-weight:700">' + obraFmt(totCola) + '</td><td colspan="2"></td>'
      + '</tr></tfoot></table></div>';
    if (sinDest) html += '<div class="obra-warn" style="display:block;margin:6px 2px">⚠ ' + sinDest + ' pago(s) sin alias/CBU — cargalo en la Agenda antes de exportar.</div>';
    html += '<div class="cpsm-btn-row" style="margin-top:10px">'
      + '<button class="cpsm-calc-btn" onclick="obraDescargarCSV()">⬇ Descargar CSV de lote</button>'
      + '<button class="cpsm-calc-btn" onclick="obraMarcarPagado()">✓ Marcar todo como pagado</button>'
      + '</div>';
  }

  var filasAg = ag.slice().sort(function (a, c) { return a.nombre.localeCompare(c.nombre); }).map(function (p) {
    function inp(campo, val, ph) {
      return '<input value="' + obraEsc(val) + '"' + (ph ? ' placeholder="' + ph + '"' : "")
        + ' onchange="obraAgSet(\'' + p.id + '\',\'' + campo + '\',this.value)">';
    }
    return '<tr><td>' + inp("nombre", p.nombre) + '</td><td>' + inp("rubro", p.rubro) + '</td>'
      + '<td>' + inp("destino", p.destino, "alias o CBU") + '</td>'
      + '<td>' + inp("cuit", p.cuit) + '</td><td>' + inp("nota", p.nota) + '</td>'
      + '<td style="text-align:center"><button class="obra-x" title="Borrar" onclick="obraAgBorrar(\'' + p.id + '\')">✕</button></td></tr>';
  }).join("");
  html += '<details class="sd-acc" style="margin-top:18px"><summary class="sd-acc-head">📇 Agenda de proveedores (' + ag.length + ')</summary><div class="sd-acc-body">'
    + '<div style="font-size:.7rem;color:rgba(32,36,31,.45);margin-bottom:8px">Se guarda solo al salir de cada casilla. En Alias/CBU va el alias o el CBU, lo que uses para transferir.</div>'
    + '<button class="cpsm-calc-btn" style="margin-bottom:8px" onclick="obraAgNuevo()">+ Nuevo proveedor</button>'
    + '<button class="cpsm-calc-btn" style="margin:0 0 8px 8px" onclick="obraSeedMerge()">↻ Traer datos de la lista base</button>'
    + '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Nombre</th><th>Rubro</th><th>Alias/CBU</th><th>CUIT</th><th>Nota</th><th></th></tr></thead><tbody>'
    + filasAg + '</tbody></table></div></div></details>';

  var totHi = 0;
  var filasHi = hist.slice().reverse().map(function (h) {
    totHi += obraNum(h.monto);
    return '<tr><td>' + obraEsc(h.fecha) + '</td><td>' + obraEsc(h.nombre) + '</td>'
      + '<td style="text-align:right">' + obraFmt(obraNum(h.monto)) + '</td><td>' + obraEsc(h.concepto) + '</td>'
      + '<td><input value="' + obraEsc(h.comprobante || "") + '" onchange="obraHiSet(\'' + h.id + '\',\'comprobante\',this.value)" style="width:120px"></td>'
      + '<td style="text-align:center"><button class="obra-x" title="Borrar" onclick="obraHiBorrar(\'' + h.id + '\')">✕</button></td></tr>';
  }).join("");
  html += '<details class="sd-acc" style="margin-top:12px"><summary class="sd-acc-head">🧾 Historial de pagos (' + hist.length + ' · ' + obraFmt(totHi) + ')</summary><div class="sd-acc-body">'
    + (hist.length
        ? '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Fecha</th><th>Proveedor</th><th>Importe</th><th>Concepto</th><th>Comprobante</th><th></th></tr></thead><tbody>' + filasHi + '</tbody></table></div>'
        : '<div style="color:rgba(32,36,31,.4);font-size:.8rem">Sin pagos registrados todavía.</div>')
    + '</div></details></div>';

  document.getElementById("adm-content").innerHTML = html;
}

function obraColaAgregar() {
  var sel = document.getElementById("obraAddProv");
  if (!sel || !sel.value) { alert("Elegí un proveedor."); return; }
  var cola = obraCola();
  cola.push({
    id: obraUID(), provId: sel.value,
    concepto: (document.getElementById("obraAddConcepto").value || "").trim(),
    monto: obraNum(document.getElementById("obraAddMonto").value) || "",
    urgente: !!document.getElementById("obraAddUrg").checked, ts: Date.now()
  });
  obraGuardar(OBRA_K_CO, cola);
  renderObraPagos();
}
function obraColaSet(id, campo, val) {
  var cola = obraCola();
  for (var i = 0; i < cola.length; i++) if (cola[i].id === id) {
    cola[i][campo] = (campo === "monto") ? obraNum(val) : val; break;
  }
  obraGuardar(OBRA_K_CO, cola);
  if (campo === "monto") renderObraPagos();
}
function obraColaQuitar(id) {
  obraGuardar(OBRA_K_CO, obraCola().filter(function (x) { return x.id !== id; }));
  renderObraPagos();
}
function obraMarcarPagado() {
  var cola = obraCola();
  if (!cola.length) return;
  if (!confirm("¿Marcar los " + cola.length + " pagos de la cola como pagados y moverlos al historial?")) return;
  var agById = {}; obraAgenda().forEach(function (p) { agById[p.id] = p; });
  var hoy = new Date().toLocaleDateString("es-AR"), hist = obraHist();
  cola.forEach(function (it) {
    var p = agById[it.provId] || { nombre: "(borrado)" };
    hist.push({ id: obraUID(), fecha: hoy, nombre: p.nombre, monto: obraNum(it.monto), concepto: it.concepto || "", comprobante: "", ts: Date.now() });
  });
  obraGuardar(OBRA_K_HI, hist);
  obraGuardar(OBRA_K_CO, []);
  renderObraPagos();
}
function obraDescargarCSV() {
  var cola = obraCola();
  if (!cola.length) { alert("La cola está vacía."); return; }
  var agById = {}; obraAgenda().forEach(function (p) { agById[p.id] = p; });
  var esc = function (v) { v = String(v == null ? "" : v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  var rows = [["Proveedor", "Alias/CBU", "CUIT", "Importe", "Concepto"]];
  cola.forEach(function (it) {
    var p = agById[it.provId] || { nombre: "(borrado)", destino: "", cuit: "" };
    rows.push([p.nombre, p.destino || "", p.cuit || "", Math.round(obraNum(it.monto)), it.concepto || ""]);
  });
  var csv = rows.map(function (r) { return r.map(esc).join(","); }).join("\r\n");
  var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "lote_pagos_obra_" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
}
function obraAgSet(id, campo, val) {
  var ag = obraAgenda();
  for (var i = 0; i < ag.length; i++) if (ag[i].id === id) { ag[i][campo] = val; break; }
  obraGuardar(OBRA_K_AG, ag);
}
function obraAgNuevo() {
  var ag = obraAgenda();
  ag.push({ id: obraUID(), nombre: "Nuevo proveedor", rubro: "", destino: "", cuit: "", nota: "" });
  obraGuardar(OBRA_K_AG, ag);
  renderObraPagos();
}
function obraAgBorrar(id) {
  if (!confirm("¿Borrar este proveedor de la agenda?")) return;
  obraGuardar(OBRA_K_AG, obraAgenda().filter(function (x) { return x.id !== id; }));
  renderObraPagos();
}
function obraHiSet(id, campo, val) {
  var hi = obraHist();
  for (var i = 0; i < hi.length; i++) if (hi[i].id === id) { hi[i][campo] = val; break; }
  obraGuardar(OBRA_K_HI, hi);
}
function obraHiBorrar(id) {
  if (!confirm("¿Borrar este registro del historial?")) return;
  obraGuardar(OBRA_K_HI, obraHist().filter(function (x) { return x.id !== id; }));
  renderObraPagos();
}

function renderGastosPagos() {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  var b = document.getElementById("adm-sidenav-gastospagos");
  if (b) b.className = "adm-sidenav-btn active";
  document.getElementById("adm-content").innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
      '<div class="adm-sec-title" style="margin:0">Gastos y Pagos</div>' +
      '<button id="gpRefreshBtn" onclick="gpRefrescar(this)" style="flex-shrink:0;border:1px solid rgba(32,36,31,.2);background:#fff;border-radius:7px;padding:4px 12px;font-size:.72rem;font-weight:700;cursor:pointer;font-family:inherit;color:rgba(32,36,31,.65)">↻ Actualizar</button>' +
    '</div>' +
    '<div id="gpBody" style="font-size:.8rem;color:rgba(32,36,31,.5);padding:20px 4px">⏳ Trayendo el detalle del sheet…</div>';
  if (GP_DATA) { gpRender(); return; }
  gpTraer();
}
// Trae (o re-trae) el sheet y pinta el body. gpRefrescar fuerza el re-fetch
// descartando el cache; el botón "↻ Actualizar" lo usa para no tener que F5.
function gpTraer() {
  gpFetch(function (data, err) {
    var body = document.getElementById("gpBody");
    var btn = document.getElementById("gpRefreshBtn");
    if (btn) { btn.disabled = false; btn.textContent = "↻ Actualizar"; }
    if (!body) return;
    if (!data) {
      body.innerHTML = '<div style="color:#b13a2c">No se pudo traer el sheet (' + (err || "?") + '). ' +
        '<button onclick="gpRefrescar(this)" style="border:1px solid rgba(32,36,31,.2);background:#fff;border-radius:6px;padding:3px 10px;cursor:pointer;font-family:inherit">Reintentar</button></div>';
      return;
    }
    gpRender();
  });
}
function gpRefrescar(btn) {
  if (btn) { btn.disabled = true; btn.textContent = "⏳ …"; }
  GP_DATA = null;
  gpTraer();
}
function gpRender(mes) {
  if (!GP_DATA) return;
  var body = document.getElementById("gpBody");
  if (!body) return;
  var meses = GP_DATA.meses;
  if (!meses.length) { body.innerHTML = "Sin bloques de mes en el sheet."; return; }
  if (!mes) {
    mes = _gpMesAct;
    if (!mes || meses.indexOf(mes) === -1) {
      mes = meses[meses.length - 1];
      for (var i = meses.length - 1; i >= 0; i--) {
        if (GP_DATA.porMes[meses[i]].filas.some(function (f) { return f.importe != null; })) { mes = meses[i]; break; }
      }
    }
  }
  _gpMesAct = mes;
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var chips = meses.map(function (m) {
    var on = m === mes;
    return '<button onclick="gpRender(\'' + m + '\')" style="flex-shrink:0;font-size:.72rem;padding:4px 12px;border-radius:20px;border:1px solid ' +
      (on ? '#1f3a2e' : 'rgba(32,36,31,.15)') + ';background:' + (on ? '#1f3a2e' : 'rgba(32,36,31,.05)') +
      ';color:' + (on ? '#fff' : 'rgba(32,36,31,.55)') + ';font-weight:600;cursor:pointer;font-family:inherit">' + cap(m) + '</button>';
  }).join("");
  var d = GP_DATA.porMes[mes];
  var stColor = { pagado: "#16a34a", pendiente: "#b13a2c", sindato: "rgba(32,36,31,.35)" };
  var stBg = { pagado: "rgba(22,163,74,.07)", pendiente: "rgba(177,58,44,.07)", sindato: "transparent" };
  var stLbl = { pagado: "Pagado", pendiente: "Pendiente", sindato: "Sin dato" };
  var nPend = d.filas.filter(function (f) { return f.estado === "pendiente"; }).length;
  var nSd = d.filas.filter(function (f) { return f.estado === "sindato"; }).length;
  var rows = d.filas.map(function (f) {
    return '<tr style="background:' + stBg[f.estado] + '">' +
      '<td>' + f.rubro + '</td>' +
      '<td style="color:rgba(32,36,31,.5);font-size:.72rem">' + (f.detalle || "") + '</td>' +
      '<td style="text-align:right;font-weight:700">' + (f.importe != null ? fmt(f.importe) : "—") + '</td>' +
      '<td style="font-size:.72rem;color:rgba(32,36,31,.6)">' + (f.metodo || "") + '</td>' +
      '<td style="text-align:center;font-size:.68rem;font-weight:700;color:' + stColor[f.estado] + '">' + stLbl[f.estado] + '</td>' +
      '</tr>';
  }).join("");
  // ── Totales del mes (todas las secciones del bloque) ──
  var sc = d.sec || {};
  var sueldoTot = sc.sueldoTot != null ? sc.sueldoTot : (((sc.sueldoA || 0) + (sc.sueldoB || 0)) || null);
  var lin = function (lbl, val) {
    return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(32,36,31,.07)">' +
      '<span style="color:rgba(32,36,31,.7)">' + lbl + '</span><span style="font-weight:700">' + (val != null ? fmt(val) : '—') + '</span></div>';
  };
  var totalesHtml =
    '<div style="margin-top:18px"><div class="adm-sec-title" style="font-size:.8rem">Totales del mes</div>' +
    '<div style="background:rgba(32,36,31,.03);border:1px solid rgba(32,36,31,.1);border-radius:8px;padding:10px 12px;font-size:.78rem">' +
    lin('Gastos A (servicios · alquiler · honorarios)', d.total) +
    lin('Sueldos empleados' + ((sc.sueldoA != null || sc.sueldoB != null) ? ' (A ' + fmt(sc.sueldoA || 0) + ' + B ' + fmt(sc.sueldoB || 0) + ')' : ''), sueldoTot) +
    lin('Cargas sociales', sc.cargas) +
    lin('Sindicatos', sc.sindicatos) +
    lin('Fondo caja chica', sc.cajaChica) +
    (sc.divMonto != null
      ? '<div style="display:flex;justify-content:space-between;padding:8px 0 2px;margin-top:4px;border-top:2px solid rgba(32,36,31,.2);font-weight:700"><span>Total mensual ÷ 13</span><span>' + fmt(sc.divMonto) + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:.82rem;color:#1f3a2e;font-weight:700"><span>Por profesional</span><span>' + (sc.divPorProf != null ? fmt(sc.divPorProf) : '—') + '</span></div>'
      : '') +
    '</div></div>';
  var empHtml = '';
  if (d.emp && d.emp.length) {
    empHtml = '<details style="margin-top:14px"><summary style="cursor:pointer;font-size:.78rem;font-weight:700;color:rgba(32,36,31,.65)">Detalle de sueldos (' + d.emp.length + ')</summary>' +
      '<div class="adm-table-wrap" style="margin-top:8px"><table class="adm-table"><thead><tr><th>Empleado</th><th style="text-align:right">Sueldo A</th><th style="text-align:right">Sueldo B</th><th style="text-align:right">Total</th></tr></thead><tbody>' +
      d.emp.map(function (e) {
        return '<tr><td>' + e.nombre + '</td><td style="text-align:right">' + (e.sa != null ? fmt(e.sa) : '—') + '</td><td style="text-align:right">' + (e.sb != null ? fmt(e.sb) : '—') + '</td><td style="text-align:right;font-weight:700">' + (e.tot != null ? fmt(e.tot) : '—') + '</td></tr>';
      }).join('') +
      '</tbody></table></div></details>';
  }

  body.innerHTML =
    '<div style="font-size:.68rem;color:rgba(32,36,31,.45);margin-bottom:8px">Espejo de la pestaña <b>GASTOS MENSUALES</b> del sheet Gastos y Pagos CEOT. Solo lectura — se edita en el sheet. El estado sale del Método de Pago.</div>' +
    '<div class="adm-sf-wrap" id="gpChipsWrap" style="margin-bottom:12px"><div id="gpChipsScroll" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none">' + chips + '</div></div>' +
    '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
    '<th>Rubro</th><th>Detalle</th><th style="text-align:right">Importe</th><th>Método</th><th style="text-align:center">Estado</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:.72rem;color:rgba(32,36,31,.5);margin-top:10px">' +
    '<span>' + d.filas.length + ' gastos' + (nPend ? ' · <span style="color:#b13a2c">' + nPend + ' pendiente' + (nPend > 1 ? 's' : '') + '</span>' : '') + (nSd ? ' · ' + nSd + ' sin dato' : '') + '</span>' +
    '<span><b>Total Gastos A ' + cap(mes) + ': ' + (d.total != null ? fmt(d.total) : "—") + '</b></span>' +
    '</div>' +
    totalesHtml + empHtml;
  coInitScrollFade("gpChipsScroll", "gpChipsWrap");
}

function renderFacturas() {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"].forEach(function(p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });
  var sf = document.getElementById("adm-sidenav-facturas");
  if (sf) sf.className = "adm-sidenav-btn active";

  function tablaFacturas(lista, titulo) {
    var h = '<div class="adm-sec-title" style="margin-top:18px">' + titulo + '</div>';
    if (!lista || lista.length === 0) {
      return h + '<div style="padding:10px;color:rgba(32,36,31,.4);font-size:0.82rem">Sin datos cargados.</div>';
    }
    h += '<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">';
    lista.forEach(function(f) {
      h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--iv1);border-left:3px solid var(--iv3)">';
      h += '<span style="font-size:0.88rem;font-weight:600;color:var(--ink)">' + (f.periodo || '—') + '</span>';
      if (f.link) h += '<a href="' + f.link + '" target="_blank" style="font-size:0.75rem;padding:3px 10px;background:rgba(32,36,31,.08);border:1px solid rgba(32,36,31,.15);text-decoration:none;color:#20241f">Ver PDF</a>';
      else        h += '<span style="font-size:0.75rem;color:#d1d5db">Sin PDF</span>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  var html = tablaFacturas(FACTURAS_DATA.colon, '🏥 Clínica Colón');
  html    += tablaFacturas(FACTURAS_DATA.cem,   '🏨 CEM');
  document.getElementById("adm-content").innerHTML = html;
}

// ══════ LICENCIAS Y ASISTENCIAS ════════════════════════════════
// Fuente: planilla "2026 Horarios secretarias" vía Apps Script ya deployado
// (licencias-secretarias.gs) — clasifica licencias por color de celda.
var LIC_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwAt8sO7iFOQPUL63rahqErTG1unGLJOqtGq9WmWMvjcZN991arZrak8JR7GoU2mRg0Gw/exec';
var LIC_TYPE_STYLE = {
  feriado:    { bg:'rgba(177,58,44,.10)',  fg:'#b13a2c', lbl:'Feriado' },
  licencia:   { bg:'rgba(146,97,15,.10)',  fg:'#92610f', lbl:'Licencia' },
  vacaciones: { bg:'rgba(22,163,74,.10)',  fg:'#16a34a', lbl:'Vacaciones' },
  cumple:     { bg:'rgba(109,40,217,.10)', fg:'#6d28d9', lbl:'Cumpleaños' },
  mudanza:    { bg:'rgba(29,78,216,.10)',  fg:'#1d4ed8', lbl:'Mudanza' }
};
var licEventsByDate = null;
var licMes  = new Date().getMonth();
var licAnio = new Date().getFullYear();

function licPad(n) { return String(n).padStart(2, '0'); }
function licISO(y, m, d) { return y + '-' + licPad(m + 1) + '-' + licPad(d); }

function licCargarDatos(forceRefresh, cb) {
  if (licEventsByDate && !forceRefresh) { cb(); return; }
  var body = document.getElementById('licBody');
  var cbName = '_licJsonp' + Date.now();
  var done = false;

  function limpiar() {
    clearTimeout(timeout);
    delete window[cbName];
    var s = document.getElementById('_licJsonpScript');
    if (s) s.remove();
  }
  function mostrarError(msg) {
    if (body) body.innerHTML = '<div style="padding:24px;text-align:center;color:#b13a2c;font-size:.85rem">' + msg +
      '<br><button onclick="licCargarDatos(true, renderLicenciasBody)" style="margin-top:10px;padding:6px 14px;border:1px solid #1f3a2e;border-radius:7px;background:#fff;cursor:pointer;font-family:inherit">Reintentar</button></div>';
  }

  var timeout = setTimeout(function() {
    if (done) return; done = true;
    limpiar();
    mostrarError('Tiempo de espera agotado — la primera consulta del día puede tardar ~20 segundos. Reintentá.');
  }, 30000);

  window[cbName] = function(data) {
    if (done) return; done = true;
    limpiar();
    if (data.status !== 'ok') { mostrarError(data.message || 'Error al cargar los datos.'); return; }
    licEventsByDate = {};
    (data.events || []).forEach(function(ev) {
      (licEventsByDate[ev.date] = licEventsByDate[ev.date] || []).push(ev);
    });
    cb();
  };

  var script = document.createElement('script');
  script.id = '_licJsonpScript';
  script.onerror = function() {
    if (done) return; done = true;
    limpiar();
    mostrarError('No se pudo conectar con el servidor.');
  };
  script.src = LIC_ENDPOINT + '?callback=' + cbName + (forceRefresh ? '&refresh=1' : '');
  document.head.appendChild(script);
}

function licCambiarMes(delta) {
  licMes += delta;
  if (licMes < 0) { licMes = 11; licAnio--; }
  if (licMes > 11) { licMes = 0; licAnio++; }
  renderLicenciasBody();
}

function renderLicenciasBody() {
  var MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  var hoy = new Date();
  var hoyISO = licISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  var firstDow = new Date(licAnio, licMes, 1).getDay();
  var offset = (firstDow + 6) % 7;
  var dim = new Date(licAnio, licMes + 1, 0).getDate();

  var legend = Object.keys(LIC_TYPE_STYLE).map(function(t) {
    var s = LIC_TYPE_STYLE[t];
    return '<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:.68rem;font-weight:600;background:' +
      s.bg + ';color:' + s.fg + '"><span style="width:7px;height:7px;border-radius:50%;background:' + s.fg + '"></span>' + s.lbl + '</span>';
  }).join(' ');

  var grid = DIAS.map(function(d, i) {
    return '<div style="padding:6px 2px;text-align:center;font-size:.65rem;font-weight:700;color:var(--co-ink-dim,#6b6a5a);background:var(--co-accent-soft,#eef2ea);' +
      (i >= 5 ? 'opacity:.6' : '') + '">' + d + '</div>';
  }).join('');

  for (var i = 0; i < offset; i++) grid += '<div style="background:rgba(32,36,31,.02)"></div>';

  for (var d = 1; d <= dim; d++) {
    var iso = licISO(licAnio, licMes, d);
    var isToday = iso === hoyISO;
    var leaves = (licEventsByDate && licEventsByDate[iso]) || [];
    var avatars = leaves.map(function(l) {
      var s = LIC_TYPE_STYLE[l.type] || { bg: '#eee', fg: '#555' };
      return '<div title="' + String(l.employee).replace(/"/g, '') + ' — ' + (LIC_TYPE_STYLE[l.type] ? LIC_TYPE_STYLE[l.type].lbl : l.type) +
        '" style="width:20px;height:20px;border-radius:50%;background:' + s.bg + ';color:' + s.fg +
        ';display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700;flex-shrink:0">' + l.initials + '</div>';
    }).join('');
    grid += '<div style="min-height:64px;padding:5px;background:var(--co-card,#fbf8f0);' + (isToday ? 'outline:2px solid #1f3a2e;outline-offset:-2px;' : '') + '">'
      + '<div style="font-size:.68rem;font-weight:600;color:' + (isToday ? '#1f3a2e' : 'var(--co-ink-dim,#6b6a5a)') + ';margin-bottom:3px">' + d + '</div>'
      + (avatars ? '<div style="display:flex;flex-wrap:wrap;gap:2px">' + avatars + '</div>' : '')
      + '</div>';
  }

  var html = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px">'
    + '<div style="display:flex;align-items:center;gap:8px">'
    +   '<button onclick="licCambiarMes(-1)" style="width:30px;height:30px;border-radius:7px;border:1px solid var(--co-line,#d9d0b8);background:var(--co-card,#fbf8f0);cursor:pointer;font-size:1rem">‹</button>'
    +   '<span style="font-weight:700;min-width:150px;text-align:center">' + MESES_LARGO[licMes] + ' ' + licAnio + '</span>'
    +   '<button onclick="licCambiarMes(1)" style="width:30px;height:30px;border-radius:7px;border:1px solid var(--co-line,#d9d0b8);background:var(--co-card,#fbf8f0);cursor:pointer;font-size:1rem">›</button>'
    + '</div>'
    + '<button onclick="licCargarDatos(true, renderLicenciasBody)" style="font-size:.72rem;padding:5px 12px;border-radius:7px;border:1px solid var(--co-line,#d9d0b8);background:var(--co-card,#fbf8f0);cursor:pointer">⟳ Actualizar</button>'
    + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">' + legend + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--co-line,#d9d0b8);border:1px solid var(--co-line,#d9d0b8);border-radius:10px;overflow:hidden">' + grid + '</div>';

  document.getElementById('licBody').innerHTML = html;
}

function renderLicencias() {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"].forEach(function(p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });
  var sl = document.getElementById("adm-sidenav-licencias");
  if (sl) sl.className = "adm-sidenav-btn active";

  document.getElementById("adm-content").innerHTML =
    '<div class="adm-sec-title">Licencias y ausencias del personal</div>' +
    '<div id="licBody" style="padding:8px 0"><div style="padding:30px;text-align:center;color:var(--co-ink-dim,#6b6a5a);font-size:.85rem">Cargando…</div></div>';

  licCargarDatos(false, renderLicenciasBody);
}

