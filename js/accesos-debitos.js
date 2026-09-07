// accesos-debitos.js — extraído de index.html.
// Accesos (hub de links), WA Gastos A, Débitos (importador + tabla) y
// Nota constancia CEM (% de acreditación CEM por profesional, para CPSM).
// Solo definiciones.

// ══════ ACCESOS ══════════════════════════════════════════════

// Semilla de Accesos — se resincronizó con lo real (04/09/2026, revisión módulo
// por módulo con Marcelo usando ceot_usage_count) porque había divergido bastante
// de lo guardado en ceot_accesos_all: 9 accesos agregados por Marcelo con el
// tiempo no estaban acá, 2 títulos estaban desactualizados, y el id 35 ni
// coincidía (acá decía "Normas Convenios OOSS", en producción es "Contable").
// Van 13 fuera (confirmados con Marcelo uno por uno: la mayoría paneles/apps
// viejas reemplazadas por este mismo panel u otra versión más nueva) y 2
// renombrados. Si volvés a desincronizar esto de ceot_accesos_all, ojo: la
// semilla es la que gana en cualquier id que ceot_accesos_all ya NO tenga
// (accCargarCustom la vuelve a agregar) — así que un id sacado en producción
// pero dejado acá, resucita solo la próxima vez que cargue el panel.
var ACCESOS_DATA = [
  // ── Finanzas
  { id:1, cat:"Finanzas", title:"Gastos casa y liquidaciones Clínica", desc:"Control de liquidaciones y estado de cheques",               url:"https://docs.google.com/spreadsheets/d/1NjHxZTUy3hVinrhR09Cq22gjcMiHQuSG8P4sSIPJa98/edit?usp=sharing" },
  { id:3, cat:"Finanzas", title:"Gastos y Sueldos",         desc:"Gastos fijos y planillas de sueldos del personal",           url:"https://docs.google.com/spreadsheets/d/1BjKNOWI4TpijG_56XFbSVz1u5QNWVQE53SD5gA1LPAc/edit?usp=sharing" },
  { id:4, cat:"Finanzas", title:"Caja Gerling",             desc:"Seguimiento y control de la caja Gerling",                   url:"https://docs.google.com/spreadsheets/d/13IYGUkv2FjZ8aGUxVuly7uL14b6MyQI4C9YiISXxHUY/edit?usp=drive_link" },
  { id:6, cat:"Finanzas", title:"Valores Convenios",        desc:"Aranceles y valores por convenio y obra social",             url:"https://valores-convenios-ceot.netlify.app/" },
  // ── Clínica
  { id:8,  cat:"Clínica", title:"CC Clínica Colón",         desc:"Sistema interno de la Clínica Colón",                        url:"https://coloncc.com.ar/" },
  { id:9,  cat:"Clínica", title:"CC CEM MDP",               desc:"Sistema privado del Centro Médico MDP",                     url:"https://privado.centromedicomdp.org.ar/" },
  { id:10, cat:"Clínica", title:"Programación CX (Sheet)",  desc:"Calendario de cirugías — Google Sheets",                    url:"https://docs.google.com/spreadsheets/d/1VYIarOpfCgqinj5Uy2dAYCSsx6c5GL9J7YbAYKvCbdk/edit?usp=sharing" },
  { id:12, cat:"Clínica", title:"Ordenes CX",               desc:"Gestión de órdenes de cirugías",                             url:"https://ordenes-ceot-cx.netlify.app/" },
  { id:15, cat:"Clínica", title:"Evoluciones",              desc:"Registro de evoluciones clínicas CEOT",                     url:"https://evoluciones-ceot.netlify.app/" },
  { id:16, cat:"Clínica", title:"Cirugías Programadas",     desc:"Agenda de cirugías programadas",                            url:"https://cirugias-progamadas.netlify.app/" },
  { id:19, cat:"Clínica", title:"Estadísticas CX 26 v2",    desc:"Estadísticas de cirugías CEOT 2026 — versión actualizada", url:"https://ceot-estadisticas-cx-26.netlify.app/" },
  // ── Administración
  { id:24, cat:"Admin", title:"App para caja GACI",         desc:"Agendas y calendario de actividades CEOT",                  url:"https://ceot-agendas.netlify.app/" },
  { id:25, cat:"Admin", title:"Permisos ART",               desc:"Gestión de permisos de ART para cirugías",                  url:"https://permiso-art-ceot.netlify.app/" },
  { id:27, cat:"Admin", title:"Horarios y Asistencias",     desc:"Registro de horarios, asistencias y licencias",             url:"https://docs.google.com/spreadsheets/d/1M-l1KHAoRRFL7MLpmQY4tXCtY0SLj14Dm0ucQWsR5fA/edit?usp=sharing" },
  { id:28, cat:"Admin", title:"Documentación CEOT",         desc:"Documentos y archivos generales del CEOT",                  url:"https://drive.google.com/drive/folders/1eOUfTKOEkFZTsgsctzwNhq0IJ-Wdp3N7?usp=drive_link" },
  { id:29, cat:"Admin", title:"Archivos Reuniones",         desc:"Minutas y acuerdos de reuniones del equipo",                url:"https://drive.google.com/drive/folders/1jnwuKnJaNdR45_QfGvqOmURQL7yrLdTA?usp=drive_link" },
  { id:35, cat:"Admin", title:"Contable",                   desc:"Datos contables",                                           url:"https://claude.ai/code/artifact/e7c9f19e-d865-4574-9adb-56279cb542df" },
  // ── Otros
  { id:30, cat:"Otros", title:"Encuesta Secretarias",       desc:"Evaluación y premios a secretarias",                        url:"https://docs.google.com/spreadsheets/d/19ITME1mzL2eIYX4YIudIGwP7yeGBDP93XM6Y2gfperw/edit?usp=sharing" },
  { id:31, cat:"Otros", title:"Encuesta Satisfacción",      desc:"Encuesta de satisfacción de pacientes CEOT",                url:"https://docs.google.com/spreadsheets/d/1T9Rck2IdVg-aYDnjZo3sQJ_0dZ0MvhDBrlWFE1EVAvs/edit?usp=sharing" },
  { id:32, cat:"Otros", title:"Caja de Médicos",            desc:"Autogestión Caja de Médicos",                               url:"https://www.cajademedicos.com.ar/aplicaciones/jsp/m.EntidadesAutogestion/ent_principal.jsp?mensaje=S" },
  { id:33, cat:"Otros", title:"BBVA CEOT",                  desc:"Home banking BBVA — cuenta CEOT",                           url:"https://www.bbva.com.ar/empresas.html" },
];

var accNextId = 37;
var accFilterActual = "Todos";
var accEditLinkMode = false;

function toggleEditLinks() {
  accEditLinkMode = !accEditLinkMode;
  var btn = document.getElementById("btnEditLinks");
  var add = document.getElementById("btnAddLink");
  var search = document.getElementById("accSearch");
  if (btn) btn.style.color = accEditLinkMode ? "#dc2626" : "#9a8c78";
  if (add) add.style.display = accEditLinkMode ? "block" : "none";
  if (search) search.style.display = accEditLinkMode ? "none" : "block";
  renderSidenavLinks(accEditLinkMode ? "" : (document.getElementById("accSearch")||{}).value);
}

var ACC_CAT_CLASS = {"Finanzas":"cat-fin","Clínica":"cat-cli","Admin":"cat-adm","Otros":"cat-otros"};

function renderSidenavLinks(q) {
  var cats = ["Finanzas","Clínica","Admin","Otros"];
  var html = "";
  var query = accEditLinkMode ? "" : (q || "").toLowerCase().trim();
  var hayResultados = false;
  cats.forEach(function(cat) {
    var items = ACCESOS_DATA.filter(function(a){
      return a.cat === cat && (!query || a.title.toLowerCase().includes(query) || a.desc.toLowerCase().includes(query));
    });
    if (!items.length) return;
    hayResultados = true;
    if (!query || accEditLinkMode) html += '<div class="adm-sidenav-sep" style="font-size:0.6rem">' + cat + '</div>';
    items.forEach(function(a) {
      if (accEditLinkMode) {
        html += '<div style="display:flex;align-items:center;gap:3px;padding:2px 6px">'
          + '<span style="flex:1;font-size:0.7rem;color:var(--color-text,#3d2b1f);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+a.title+'">'+a.title+'</span>'
          + '<button onclick="accSidenavEditar('+a.id+')" title="Editar" style="background:none;border:none;cursor:pointer;font-size:0.65rem;color:rgba(32,36,31,.45);padding:2px 3px;flex-shrink:0">✏</button>'
          + '<button onclick="accSidenavEliminar('+a.id+')" title="Eliminar" style="background:none;border:none;cursor:pointer;font-size:0.65rem;color:#dc2626;padding:2px 3px;flex-shrink:0">✕</button>'
          + '</div>';
      } else {
        var ico = LUCIDE_ACC_ICON[a.title] || 'link';
        var cls = ACC_CAT_CLASS[a.cat] || 'cat-otros';
        html += '<a class="adm-sidenav-link" href="' + a.url + '" target="_blank" title="' + a.desc + '">'
          + '<div class="acc-ico ' + cls + '"><i data-lucide="' + ico + '" style="width:14px;height:14px" stroke-width="2"></i></div>'
          + '<span class="acc-lbl">' + a.title + '</span>'
          + '</a>';
      }
    });
  });
  if (!hayResultados) html = '<div style="font-size:0.71rem;color:#9a8c78;padding:6px 10px">Sin resultados</div>';
  var el = document.getElementById("adm-sidenav-links");
  if (el) el.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

function filtrarSidenavLinks(q) { renderSidenavLinks(q); }

function accSidenavEliminar(id) {
  if (!confirm("¿Eliminar este link del sidebar?")) return;
  ACCESOS_DATA = ACCESOS_DATA.filter(function(a) { return a.id !== id; });
  accGuardarTodo();
  renderSidenavLinks();
}

function accSidenavEditar(id) {
  var item = ACCESOS_DATA.find(function(a){ return a.id === id; });
  if (!item) return;
  accModalOrigin = "accesos";
  accAbrirModal(item);
}

function accStorageKey() { return "ceot_accesos_custom"; }

function accCargarCustom() {
  syncPull("ceot_accesos_all", function() {
    accCargarCustom();
    admHomeRenderResults();
  });
  try {
    var rawAll = localStorage.getItem("ceot_accesos_all");
    if (rawAll) {
      var saved = JSON.parse(rawAll);
      // Acceso #36 "Premios por Desempeño" se retiró del código (quedó sólo el
      // tile del módulo en Gestión) — sacarlo también de lo ya guardado en localStorage.
      saved = saved.filter(function(a) { return a.id !== 36; });
      // Agregar defaults que no estén en el localStorage (nuevos accesos agregados en el código)
      var savedIds = saved.map(function(a) { return a.id; });
      ACCESOS_DATA.forEach(function(def) {
        var idx = savedIds.indexOf(def.id);
        if (idx === -1) { saved.push(def); return; }
        // re-sincronizar el "wiring" interno (fn) desde el código, aunque el acceso ya esté guardado
        if (def.fn) saved[idx].fn = def.fn; else delete saved[idx].fn;
      });
      ACCESOS_DATA = saved;
      accNextId = Math.max.apply(null, ACCESOS_DATA.map(function(a){return a.id;}))+1;
      return;
    }
    var raw = localStorage.getItem(accStorageKey());
    if (raw) { var custom = JSON.parse(raw); custom.forEach(function(c){ ACCESOS_DATA.push(c); }); }
  } catch(e) {}
}

function accGuardarCustom() {
  var custom = ACCESOS_DATA.filter(function(a) { return a.id >= 34; });
  localStorage.setItem(accStorageKey(), JSON.stringify(custom));
}

function renderAccesos(filtro) {
  cerrarAdmSidenav();
  if (filtro) accFilterActual = filtro;
  // desactivar tabs de período
  ["mayo","junio","julio","agosto"].forEach(function(p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });
  // activar sidebar
  admDesactivarSidebar();
  var sa = document.getElementById("adm-sidenav-accesos");
  if (sa) sa.className = "adm-sidenav-btn active";

  var cats = ["Todos","Finanzas","Clínica","Admin","Otros"];
  var filtros = cats.map(function(c) {
    return '<button class="acc-filter-btn'+(accFilterActual===c?' active':'')+'" onclick="renderAccesos(\''+c+'\')">' + c + '</button>';
  }).join('');

  var items = accFilterActual === "Todos"
    ? ACCESOS_DATA
    : ACCESOS_DATA.filter(function(a) { return a.cat === accFilterActual; });

  var cards = items.map(function(a) {
    return '<div class="acc-card" data-id="'+a.id+'">'
      + '<div class="acc-card-cat">'+a.cat+'</div>'
      + '<div class="acc-card-title">'+a.title+'</div>'
      + '<div class="acc-card-desc">'+a.desc+'</div>'
      + '<div class="acc-card-actions">'
      + (a.fn
          ? '<button class="acc-open-btn" onclick="'+a.fn+'">↗ Abrir</button>'
          : '<a href="'+a.url+'" target="_blank" class="acc-open-btn">↗ Abrir</a>')
      + '<button class="acc-del-btn" onclick="accModalOrigin=\'accesos\';accAbrirModal(ACCESOS_DATA.find(function(x){return x.id==='+a.id+';}))" title="Editar" style="border-color:rgba(32,36,31,.2);background:rgba(32,36,31,.06);color:#20241f">✏</button>'
      + '<button class="acc-del-btn" onclick="accEliminar('+a.id+')" title="Eliminar">✕</button>'
      + '</div></div>';
  }).join('');

  var html = '<div class="acc-toolbar">'
    + filtros
    + '<button class="acc-add-btn" onclick="accModalOrigin=\'accesos\';accAbrirModal()">+ Agregar</button>'
    + '</div>'
    + '<div class="acc-grid">' + (cards || '<div style="color:rgba(32,36,31,.35);padding:20px;text-align:center">Sin accesos en esta categoría.</div>') + '</div>';

  document.getElementById("adm-content").innerHTML = html;
}

function accEliminar(id) {
  if (!confirm("¿Eliminar este acceso?")) return;
  ACCESOS_DATA = ACCESOS_DATA.filter(function(a) { return a.id !== id; });
  accGuardarTodo();
  renderAccesos();
}

var accEditingId = null;
var accModalOrigin = "accesos";

function accAbrirModal(item) {
  accEditingId = item ? item.id : null;
  document.getElementById("accModalBg").classList.add("open");
  document.getElementById("accFormTitle").value = item ? item.title : "";
  document.getElementById("accFormUrl").value   = item ? item.url   : "";
  document.getElementById("accFormDesc").value  = item ? item.desc  : "";
  document.getElementById("accFormCat").value   = item ? item.cat   : "Admin";
  var tit = document.getElementById("accModalTitulo");
  if (tit) tit.textContent = item ? "Editar acceso" : "Nuevo acceso";
}

function accCerrarModal() {
  document.getElementById("accModalBg").classList.remove("open");
  accEditingId = null;
}

function accGuardarNuevo() {
  var title = document.getElementById("accFormTitle").value.trim();
  var url   = document.getElementById("accFormUrl").value.trim();
  var desc  = document.getElementById("accFormDesc").value.trim();
  var cat   = document.getElementById("accFormCat").value;
  if (!title || !url) { alert("Título y URL son obligatorios."); return; }
  if (accEditingId !== null) {
    var item = ACCESOS_DATA.find(function(a){ return a.id === accEditingId; });
    if (item) { item.title = title; item.url = url; item.desc = desc || "—"; item.cat = cat; }
  } else {
    ACCESOS_DATA.push({ id: accNextId++, cat: cat, title: title, desc: desc || "—", url: url });
  }
  accGuardarTodo();
  accCerrarModal();
  if (accModalOrigin === "home") { admHomeRenderResults(); accModalOrigin = "accesos"; }
  else if (accEditLinkMode) renderSidenavLinks();
  else renderAccesos(cat);
}

function accGuardarTodo() {
  localStorage.setItem("ceot_accesos_all", JSON.stringify(ACCESOS_DATA));
  syncPush("ceot_accesos_all");
}

// ══════ WA GASTOS A ══════════════════════════════════════════

function abrirWAGastosA(periodo) {
  var _gaSig = {febrero:"marzo",marzo:"abril",abril:"mayo",mayo:"junio",junio:"julio",julio:"agosto",agosto:"septiembre",septiembre:"octubre",octubre:"noviembre",noviembre:"diciembre"};
  var gaTotal = GASTOS_A[_gaSig[periodo]] || null;
  if (!gaTotal) { alert("No hay datos de Gastos A para " + periodo + "."); return; }
  var gaInd = Math.round(gaTotal / 13);
  var mesLabel = periodo.charAt(0).toUpperCase() + periodo.slice(1) + " 2026";
  var sigMes = { mayo:"Junio", junio:"Julio", julio:"Agosto", agosto:"Septiembre",
                 septiembre:"Octubre", octubre:"Noviembre", noviembre:"Diciembre" };
  var gaLabel = (sigMes[periodo] || mesLabel) + " 2026";

  var sub = document.getElementById("waModalSub");
  if (sub) sub.textContent = "OSDE " + mesLabel + " · Gastos A " + gaLabel + " · $" + fmt(gaInd) + " p/persona";

  var listado = document.getElementById("waListado");
  if (!listado) return;

  var osdeExtra = PERIOD_EXTRAS[periodo] && PERIOD_EXTRAS[periodo].osde;

  var rows = [];
  DOCTORES.forEach(function(doc) {
    if (!doc.wapp) return;
    var nombre = doc.nombre.replace(/^DR[A]?\. /i, "");

    var osdeVal = 0;
    if (osdeExtra && !osdeExtra.pendiente && osdeExtra.m) {
      osdeVal = osdeExtra.m[doc.apellido] || 0;
    }

    var diff = osdeVal - gaInd;
    var mensaje;
    if (osdeVal > 0 && diff >= 0) {
      mensaje = "Hola Dr./Dra. " + nombre
        + "! El Gastos A de " + gaLabel + " es *" + fmt(gaInd) + "*."
        + " Tu cheque de OSDE es *" + fmt(osdeVal) + "*,"
        + " te transferimos la diferencia de *$" + fmt(diff) + "*."
        + " Saludos, Marcelo.";
    } else if (osdeVal > 0 && diff < 0) {
      mensaje = "Hola Dr./Dra. " + nombre
        + "! El Gastos A de " + gaLabel + " es *" + fmt(gaInd) + "*."
        + " Tu cheque de OSDE es *" + fmt(osdeVal) + "*,"
        + " por favor transferi *$" + fmt(Math.abs(diff)) + "* a @cuenta.ceot."
        + " Saludos, Marcelo.";
    } else {
      mensaje = "Hola Dr./Dra. " + nombre
        + "! El Gastos A de " + gaLabel + " es *" + fmt(gaInd) + "*."
        + " El cheque de OSDE esta pendiente, te avisamos cuando este disponible."
        + " Saludos, Marcelo.";
    }    rows.push({ doc: doc, nombre: nombre, osdeVal: osdeVal, diff: diff, mensaje: mensaje });
  });

  listado.innerHTML = rows.map(function(r) {
    var url = "https://wa.me/" + r.doc.wapp + "?text=" + encodeURIComponent(r.mensaje);
    var preview = r.mensaje.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    var tagColor = r.osdeVal <= 0 ? '#9a8c78' : (r.diff >= 0 ? '#16a34a' : '#dc2626');
    var tagTxt   = r.osdeVal <= 0 ? 'OSDE pendiente' : (r.diff >= 0 ? '+ Te transferimos ' + fmt(r.diff) : '- Debe transferir ' + fmt(Math.abs(r.diff)));
    return '<div style="background:#fff;border:1px solid #e2dbd0;border-radius:8px;padding:10px 12px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
      + '<span style="font-size:0.78rem;font-weight:700;color:#20241f">' + r.doc.nombre + '</span>'
      + '<span style="font-size:0.65rem;font-weight:700;color:' + tagColor + ';background:' + tagColor + '18;padding:2px 7px;border-radius:4px">' + tagTxt + '</span>'
      + '</div>'
      + '<div style="font-size:0.7rem;color:rgba(32,36,31,.45);line-height:1.5;margin-bottom:8px">' + preview + '</div>'
      + '<a href="' + url + '" target="_blank" style="display:inline-flex;align-items:center;gap:5px;background:#25d366;color:#fff;border-radius:6px;padding:6px 14px;font-size:0.74rem;font-weight:700;text-decoration:none">↗ Enviar por WhatsApp</a>'
      + '</div>';
  }).join('');

  var bg = document.getElementById("waModalBg");
  if (bg) bg.style.display = "flex";
}

function cerrarWAModal() {
  var bg = document.getElementById("waModalBg");
  if (bg) bg.style.display = "none";
}

// ══════ DÉBITOS ══════════════════════════════════════════════

const DEBITOS = {
  "diciembre-2026": [], "noviembre-2026": [], "octubre-2026": [],
  "septiembre-2026": [], "agosto-2026": [], "julio-2026": [],
  "junio-2026": [
    {f:"0028-00030425", os:"Swiss Medi", hon:1254789,  dh:1254789, dg:0,      total:1254789, pag:9},
    {f:"0048-00006532", os:"PROV.ART",   hon:16709110, dh:1886276, dg:0,      total:1886276, pag:21, nota_fija:"★ valores reconstruidos manualmente (PDF mergeado)"},
    {f:"0021-00016440", os:"OAM",        hon:1174273,  dh:1174273, dg:0,      total:1174273, pag:89},
    {f:"0048-00006571", os:"Swiss Medi", hon:4344540,  dh:962967,  dg:0,      total:962967,  pag:47},
    {f:"0021-00016322", os:"ASOCIART",   hon:2811700,  dh:648264,  dg:0,      total:648264,  pag:80},
    {f:"0048-00006533", os:"PROV.ART",   hon:9582509,  dh:642915,  dg:0,      total:642915,  pag:23},
    {f:"0048-00006522", os:"MEDICUS",    hon:3608191,  dh:533206,  dg:0,      total:533206,  pag:14},
    {f:"0048-00006630", os:"OSDE",       hon:5549554,  dh:346371,  dg:0,      total:346371,  pag:49},
    {f:"0048-00006547", os:"SEGUROS",    hon:1031135,  dh:154533,  dg:0,      total:154533,  pag:28},
    {f:"0048-00006444", os:"U.PERSONAL", hon:718508,   dh:0,       dg:141770, total:141770,  pag:11, nota_fija:"débito en gastos de equipos"},
    {f:"0048-00006569", os:"Swiss Medi", hon:2529610,  dh:136900,  dg:0,      total:136900,  pag:46},
    {f:"0021-00016150", os:"OAM",        hon:305361,   dh:97024,   dg:0,      total:97024,   pag:75},
    {f:"0048-00006568", os:"Swiss Medi", hon:1498041,  dh:93810,   dg:0,      total:93810,   pag:39},
    {f:"0028-00030356", os:"PROV.ART",   hon:351745,   dh:87830,   dg:0,      total:87830,   pag:7},
    {f:"0048-00006572", os:"Swiss Medi", hon:7055885,  dh:48089,   dg:1598,   total:49687,   pag:47},
    {f:"0028-00030424", os:"Swiss Medi", hon:35111,    dh:35111,   dg:18372,  total:53483,   pag:9},
    {f:"0048-00006581", os:"OSDE",       hon:2919156,  dh:35410,   dg:0,      total:35410,   pag:48},
    {f:"0048-00006565", os:"AVALIAN",    hon:1293961,  dh:35694,   dg:0,      total:35694,   pag:35},
    {f:"0048-00006556", os:"SEGUROS",    hon:3361985,  dh:0,       dg:51387,  total:51387,   pag:30},
    {f:"0021-00016408", os:"SANCORMED",  hon:214624,   dh:13227,   dg:0,      total:13227,   pag:81},
    {f:"0021-00016409", os:"SANCORMED",  hon:2200998,  dh:18234,   dg:0,      total:18234,   pag:85},
    {f:"0021-00016338", os:"DA.SU.TEN.", hon:62704,    dh:41803,   dg:0,      total:41803,   pag:80},
    {f:"0028-00030278", os:"Swiss Medi", hon:35447,    dh:35447,   dg:21909,  total:57356,   pag:2},
    {f:"0021-00016225", os:"PREVEN ART", hon:1639745,  dh:23141,   dg:0,      total:23141,   pag:77},
    {f:"0028-00030286", os:"Swiss Medi", hon:25378,    dh:25378,   dg:0,      total:25378,   pag:3},
    {f:"0028-00030288", os:"Swiss Medi", hon:22352,    dh:22352,   dg:0,      total:22352,   pag:3},
    {f:"0028-00030353", os:"MEDICUS",    hon:57299,    dh:17847,   dg:0,      total:17847,   pag:6},
    {f:"0028-00030279", os:"Swiss Medi", hon:16561,    dh:16561,   dg:0,      total:16561,   pag:2},
    {f:"0048-00006543", os:"MEDIFEASOC", hon:616950,   dh:11349,   dg:0,      total:11349,   pag:26},
    {f:"0048-00006525", os:"GALENO",     hon:3448760,  dh:9781,    dg:0,      total:9781,    pag:15},
    {f:"0028-00030277", os:"Swiss Medi", hon:9746,     dh:9746,    dg:0,      total:9746,    pag:1},
    {f:"0048-00006548", os:"SEGUROS",    hon:171066,   dh:7445,    dg:0,      total:7445,    pag:28},
    {f:"0021-00016410", os:"SANCORMED",  hon:1752647,  dh:4052,    dg:0,      total:4052,    pag:88},
    {f:"0048-00006535", os:"PREVENCION", hon:768584,   dh:1564,    dg:0,      total:1564,    pag:25},
    {f:"0021-00016154", os:"OAM",        hon:166312,   dh:17,      dg:0,      total:17,      pag:77},
    {f:"0021-00016155", os:"OAM",        hon:95560,    dh:10,      dg:0,      total:10,      pag:77},
    {f:"0048-00006631", os:"OSDE",       hon:1204752,  dh:448,     dg:0,      total:448,     pag:49},
    {f:"0048-00006580", os:"OSDE",       hon:6741728,  dh:0,       dg:0,      total:0,       pag:48, nota_fija:"DEB.HON $0,44 — redondeo, sin impacto real"},
  ]
};

function debStorageKey(mes, factura) {
  return "ceot_deb_nota_" + mes + "_" + factura;
}

function debGuardarNota(mes, factura, valor) {
  localStorage.setItem(debStorageKey(mes, factura), valor);
}

function debLeerNota(mes, factura) {
  return localStorage.getItem(debStorageKey(mes, factura)) || "";
}

function fmtDeb(n) {
  if (!n) return "—";
  return "$ " + n.toLocaleString("es-AR");
}

var debMesActual = "junio-2026";
var debImportData = null;

function debFmtPeriodo(p) {
  var s = String(p || '').trim();
  if (s.length === 6) return s.slice(4,6) + '/' + s.slice(0,4);
  return s;
}

async function debCargarXLSX(file) {
  if (!file) return;
  var rows;
  try { rows = await leerXLSX(file); } catch(e) { alert("Error al leer el archivo: " + e.message); return; }
  var lista = [];
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row || row.length < 16) continue;
    var obs = String(row[15] || '').trim().toUpperCase();
    if (obs.indexOf('DEB') === -1) continue;
    var imp = typeof row[3] === 'number' ? row[3] : (parseFloat(String(row[3]).replace(/\./g,'').replace(',','.')) || 0);
    if (imp < 50000) continue;
    var nroRaw = String(row[1] || '').trim();
    var parts = nroRaw.split(/\s+/).filter(Boolean);
    var fact = parts.length >= 2
      ? String(parts[0]).padStart(4,'0') + '-' + String(parts[1]).padStart(8,'0')
      : nroRaw;
    lista.push({
      fact:     fact,
      periodo:  debFmtPeriodo(row[5]),
      os:       String(row[7]  || '').trim(),
      prof:     String(row[12] || '').trim(),
      prac:     String(row[9]  || '').trim(),
      dni:      String(row[13] || '').trim(),
      paciente: String(row[14] || '').trim(),
      rol:      String(row[10] || '').trim(),
      nprest:   String(row[6]  || '').trim(),
      imp:      imp,
      tipo:     obs === 'DEB. GASTOS' ? 'GAS' : 'HON'
    });
  }
  debImportData = lista.sort(function(a,b){ return b.imp - a.imp; });
  renderDebitos();
}

// Importador de débitos en formato "crudo" (tal como llega de la ART, ej. debitos.xlsx),
// distinto del formato ya preparado "CEOT.xlsx" que usa debCargarXLSX().
// Encabezados reales vienen partidos raro al exportar (ej. "PRACTI"+"CA" = "PRACTICA",
// "PROF"+".Q.REALIZA" = "PROFESIONAL QUE REALIZA"), por eso se matchea por nombre de columna
// en vez de posición fija — más robusto si el orden de columnas cambia.
async function debCargarXLSXCrudo(file) {
  if (!file) return;
  var rows;
  try { rows = await leerXLSX(file); } catch(e) { alert("Error al leer el archivo: " + e.message); return; }
  if (!rows.length) { alert("Archivo vacío."); return; }

  var headers = rows[0].map(function(h){ return String(h || '').replace(/\s+/g,'').toUpperCase(); });
  function idxOf(needle) {
    for (var i = 0; i < headers.length; i++) if (headers[i].indexOf(needle) !== -1) return i;
    return -1;
  }

  var iFact     = idxOf('NROF.MOV');
  var iImp      = idxOf('IMPORTE');
  var iPPer     = idxOf('P.PERIO');
  var iNprest   = idxOf('NPREST');
  var iInst     = idxOf('INST.');
  var iPracti   = idxOf('PRACTI');       // la descripción de práctica está en la columna siguiente
  var iRol      = headers.indexOf('ROL');
  var iProf     = idxOf('.Q.REALIZA');   // nombre del profesional que realizó la práctica
  var iPaciente = idxOf('PACIENTE');     // OJO: esta columna trae el DNI, no el nombre
  var iNombre   = idxOf('NOMBREYAPELLIDO');
  var iObs      = idxOf('OBSERVACIONES');

  if (iFact === -1 || iImp === -1 || iObs === -1) {
    alert("No reconozco las columnas de este archivo (falta NRO F.MOV, IMPORTE u OBSERVACIONES). ¿Es el formato crudo de la ART?");
    return;
  }

  var lista = [];
  var incompletos = 0;
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row || !row.length) continue;
    var obs = String(row[iObs] || '').trim().toUpperCase();
    if (obs.indexOf('DEB') === -1) continue;

    var nroRaw = String(row[iFact] || '').trim();
    var parts = nroRaw.split(/\s+/).filter(Boolean);
    var fact = parts.length >= 2
      ? String(parts[0]).padStart(4,'0') + '-' + String(parts[1]).padStart(8,'0')
      : nroRaw;

    var impRaw = row[iImp];
    var imp = typeof impRaw === 'number' ? impRaw : (parseFloat(String(impRaw).replace(/\./g,'').replace(',','.')) || 0);

    var item = {
      fact:     fact,
      periodo:  debFmtPeriodo(iPPer !== -1 ? row[iPPer] : ''),
      os:       String(row[iInst] || '').trim(),
      prof:     String(row[iProf] || '').trim(),
      prac:     String(row[iPracti + 1] || '').trim(),
      dni:      String(row[iPaciente] || '').trim(),
      paciente: String(row[iNombre] || '').trim(),
      rol:      String(row[iRol] || '').trim(),
      nprest:   String(row[iNprest] || '').trim(),
      imp:      imp,
      tipo:     obs === 'DEB. GASTOS' ? 'GAS' : 'HON'
    };
    if (!item.paciente || !item.dni || !imp) incompletos++;
    lista.push(item);
  }

  if (!lista.length) {
    alert("No se encontraron filas con observación \"DEB...\" en este archivo.");
    return;
  }
  if (incompletos) {
    alert("Se importaron " + lista.length + " registros; " + incompletos + " quedaron con algún dato vacío (importe, paciente o DNI) — revisalos en la tabla antes de guardar.");
  }

  debImportData = (debImportData || []).concat(lista).sort(function(a,b){ return b.imp - a.imp; });
  renderDebitos();
}

function renderDebitos(mes) {
  if (mes) debMesActual = mes;
  cerrarAdmSidenav();
  // desactivar tabs de período y activar sidebar
  ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"].forEach(function(p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });
  admDesactivarSidebar();
  var sd = document.getElementById("adm-sidenav-debitos");
  if (sd) sd.className = "adm-sidenav-btn active";

  var modoImport = debImportData !== null;

  // toolbar
  var guardados = debGetGuardados();
  var opsMesGuard = guardados.length
    ? '<optgroup label="── Guardados ──">' + guardados.map(function(g){
        return '<option value="__g__' + g + '"' + (debMesActual==='__g__'+g?' selected':'') + '>' + g + '</option>';
      }).join('') + '</optgroup>'
    : '';
  var meses = Object.keys(DEBITOS);
  var opsMes = '<optgroup label="── Histórico ──">' + meses.map(function(m) {
    return '<option value="' + m + '"' + (m === debMesActual ? " selected" : "") + ">" + m + "</option>";
  }).join('') + '</optgroup>';

  var html = '<div class="deb-toolbar" style="flex-wrap:wrap;gap:6px">'
    + '<select class="deb-mes-sel" id="debMesSel" onchange="debSelMes(this.value)">' + opsMesGuard + opsMes + '</select>'
    + (modoImport && debMesActual.indexOf('__g__') !== 0
        ? '<input id="debPeriodoKey" type="text" placeholder="ej: julio-2026" value="' + debSugerirPeriodo() + '"'
          + ' style="font-size:0.76rem;padding:4px 8px;border-radius:6px;border:1px solid rgba(32,36,31,.15);background:rgba(32,36,31,.05);color:#20241f;width:110px">'
          + '<button class="deb-btn deb-btn-pri" onclick="actionFeedback(this); debGuardarImport()" style="padding:4px 10px">💾 Guardar</button>'
          + '<button class="deb-btn" style="font-size:0.72rem;padding:4px 8px;background:rgba(220,80,60,.15);color:#c44" onclick="debImportData=null;debMesActual=\'\';renderDebitos()">✕ Descartar</button>'
        : '')
    + (modoImport && debMesActual.indexOf('__g__') === 0
        ? '<button class="deb-btn" style="font-size:0.72rem;padding:4px 8px;background:rgba(220,80,60,.15);color:#c44" onclick="debEliminarGuardado(\'' + debMesActual.replace('__g__','') + '\')">🗑 Eliminar período</button>'
        : '')
    + '<label class="deb-btn" style="cursor:pointer;position:relative">📂 Importar CEOT.xlsx<input type="file" accept=".xlsx,.xls" style="position:absolute;opacity:0;width:100%;height:100%;top:0;left:0;cursor:pointer" onchange="debCargarXLSX(this.files[0]);this.value=\'\'"></label>'
    + '<button class="deb-btn deb-btn-pri" onclick="actionFeedback(this); imprimirDebitos()" style="margin-left:4px">🖨 Imprimir</button>'
    + '<span class="deb-saved-msg" id="debSavedMsg">Guardado ✓</span>'
    + '</div>';

  // ── MODO IMPORT: tabla detallada por registro ──
  if (modoImport) {
    var totH = 0, totG = 0;
    debImportData.forEach(function(d) { if (d.tipo === 'HON') totH += d.imp; else totG += d.imp; });
    var totT = totH + totG;

    html += '<div class="deb-stats">'
      + '<div class="deb-stat"><div class="deb-stat-lbl">Registros</div><div class="deb-stat-val">' + debImportData.length + '</div></div>'
      + '<div class="deb-stat"><div class="deb-stat-lbl">Déb. Honorarios</div><div class="deb-stat-val deb-neg">' + fmtDeb(Math.round(totH)) + '</div></div>'
      + '<div class="deb-stat"><div class="deb-stat-lbl">Déb. Gastos</div><div class="deb-stat-val deb-neg">' + fmtDeb(Math.round(totG)) + '</div></div>'
      + '<div class="deb-stat"><div class="deb-stat-lbl">Total debitado</div><div class="deb-stat-val deb-neg">' + fmtDeb(Math.round(totT)) + '</div></div>'
      + '</div>';

    html += '<div class="deb-table-wrap"><table class="deb-table" style="font-size:0.71rem;color:#222">'
      + '<thead><tr>'
      + '<th>#</th><th>Factura</th><th>Per.</th><th>O.Social</th>'
      + '<th>Profesional</th><th>ROL</th>'
      + '<th>DNI</th><th>Paciente</th>'
      + '<th>Práctica</th>'
      + '<th>Tipo</th><th style="text-align:right">Importe</th>'
      + '<th style="min-width:140px">Estado</th>'
      + '</tr></thead><tbody>';

    var DEB_ESTADOS = {
      '':    { bg:'',         label:'—' },
      'P':   { bg:'rgba(220,38,38,.14)',  label:'🔴 Procedente' },
      'R':   { bg:'rgba(34,197,94,.12)',  label:'🟢 Se refactura' },
      'A':   { bg:'rgba(234,179,8,.14)',  label:'🟡 Auditoría médica' }
    };

    debImportData.forEach(function(d, i) {
      var stKey = 'deb_est_' + d.fact + '_' + d.nprest;
      var estado = localStorage.getItem(stKey) || '';
      var bg = DEB_ESTADOS[estado] ? DEB_ESTADOS[estado].bg : '';
      var tieneAnalisis = !!localStorage.getItem(debAnalisisKey(d.fact, d.nprest));
      var tipoStyle = d.tipo === 'GAS' ? 'color:#c2410c;font-weight:700' : 'color:#b13a2c;font-weight:700';
      var rowBg = bg ? 'background:' + bg + ';' : '';
      html += '<tr style="' + rowBg + '">'
        + '<td style="color:rgba(32,36,31,.35);text-align:center;font-size:0.67rem">' + (i+1) + '</td>'
        + '<td style="font-family:monospace;color:rgba(32,36,31,.6);white-space:nowrap;font-size:0.67rem">' + (d.fact||'—') + '</td>'
        + '<td style="color:rgba(32,36,31,.6);white-space:nowrap">' + (d.periodo||'—') + '</td>'
        + '<td style="color:rgba(32,36,31,.75);white-space:nowrap;font-weight:600">' + (d.os||'—') + '</td>'
        + '<td style="color:#20241f;white-space:nowrap">' + (d.prof||'—') + '</td>'
        + '<td style="color:rgba(32,36,31,.45);font-size:0.67rem">' + (d.rol||'') + '</td>'
        + '<td style="font-family:monospace;color:rgba(32,36,31,.5);font-size:0.67rem">' + (d.dni||'') + '</td>'
        + '<td style="color:#20241f">' + (d.paciente||'—') + '</td>'
        + '<td style="font-size:0.65rem;color:rgba(32,36,31,.5)">' + (d.prac||'') + '</td>'
        + '<td style="' + tipoStyle + ';white-space:nowrap">' + d.tipo + '</td>'
        + '<td style="color:#b13a2c;font-weight:600;text-align:right;white-space:nowrap">' + fmtDeb(Math.round(d.imp)) + '</td>'
        + '<td>'
        + '<button type="button" class="deb-btn" style="font-size:0.66rem;padding:2px 6px;margin-bottom:3px;width:100%;background:' + (tieneAnalisis?'rgba(31,58,46,.14)':'rgba(32,36,31,.06)') + ';color:#1f3a2e" onclick="debAbrirAuditor(' + i + ')">🩺 ' + (tieneAnalisis?'Ver análisis':'Analizar') + '</button>'
        + '<select class="deb-est-sel" data-stkey="' + stKey + '" onchange="debSetEstado(this)" style="font-size:0.72rem;padding:2px 4px;border-radius:5px;border:1px solid rgba(32,36,31,.15);background:rgba(32,36,31,.06);color:#20241f;cursor:pointer;width:100%">'
        + Object.keys(DEB_ESTADOS).map(function(k){
            return '<option value="' + k + '"' + (estado===k?' selected':'') + '>' + DEB_ESTADOS[k].label + '</option>';
          }).join('')
        + '</select></td>'
        + '</tr>';
    });

    html += '<tr class="deb-total-row">'
      + '<td colspan="10">TOTAL</td>'
      + '<td style="text-align:right;color:#b00000;font-weight:700">' + fmtDeb(Math.round(totT)) + '</td>'
      + '<td></td></tr>';
    html += '</tbody></table></div>';

    document.getElementById("adm-content").innerHTML = html;
    return;
  }

  // ── MODO NORMAL: tabla por factura ──
  var filas = DEBITOS[debMesActual] || [];
  var totDH = 0, totDG = 0, totT2 = 0;
  filas.forEach(function(d) { totDH += d.dh; totDG += d.dg; totT2 += d.total; });

  html += '<div class="deb-stats">'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Facturas</div><div class="deb-stat-val">' + filas.length + '</div></div>'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Déb. Honorarios</div><div class="deb-stat-val deb-neg">' + fmtDeb(totDH) + '</div></div>'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Déb. Gastos</div><div class="deb-stat-val deb-neg">' + fmtDeb(totDG) + '</div></div>'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Total debitado</div><div class="deb-stat-val deb-neg">' + fmtDeb(totT2) + '</div></div>'
    + '</div>';

  html += '<div class="deb-table-wrap"><table class="deb-table">'
    + '<thead><tr>'
    + '<th>#</th><th>Factura</th><th>O.Social</th>'
    + '<th>Deb.Hon.</th><th>Deb.Gas.</th><th>Total deb.</th>'
    + '<th style="text-align:center">Pág.</th>'
    + '<th class="th-nota" style="min-width:180px">Anotaciones</th>'
    + '</tr></thead><tbody>';

  filas.forEach(function(d, i) {
    var notaKey = d.f + "_" + i;
    var notaGuardada = debLeerNota(debMesActual, notaKey);
    var tieneNota = notaGuardada.trim().length > 0;
    var placeholderBase = d.nota_fija || "";
    var totalClass = d.total === 0 ? "deb-zero" : "deb-neg";

    html += '<tr>'
      + '<td style="color:rgba(32,36,31,.35);font-size:0.68rem;text-align:center">' + (i+1) + '</td>'
      + '<td style="font-family:monospace;font-size:0.72rem">' + d.f + '</td>'
      + '<td>' + d.os + '</td>'
      + '<td class="deb-neg">' + (d.dh > 0 ? fmtDeb(d.dh) : '—') + '</td>'
      + '<td class="deb-neg">' + (d.dg > 0 ? fmtDeb(d.dg) : '—') + '</td>'
      + '<td class="' + totalClass + '">' + (d.total > 0 ? fmtDeb(d.total) : '—') + '</td>'
      + '<td style="text-align:center">' + (d.pag || '—') + '</td>'
      + '<td>'
      + (placeholderBase ? '<div style="font-size:0.65rem;color:rgba(32,36,31,.35);margin-bottom:3px">' + placeholderBase + '</div>' : '')
      + '<textarea class="deb-nota-inp' + (tieneNota ? ' tiene-nota' : '') + '" rows="2"'
      + ' data-mes="' + debMesActual + '" data-key="' + notaKey + '"'
      + ' placeholder="Agregar anotación…">' + notaGuardada + '</textarea>'
      + '</td>'
      + '</tr>';
  });

  html += '<tr class="deb-total-row">'
    + '<td colspan="3">TOTAL</td>'
    + '<td class="deb-neg">' + fmtDeb(totDH) + '</td>'
    + '<td class="deb-neg">' + fmtDeb(totDG) + '</td>'
    + '<td class="deb-neg">' + fmtDeb(totT2) + '</td>'
    + '<td></td><td></td></tr>';

  html += '</tbody></table></div>';

  document.getElementById("adm-content").innerHTML = html;

  document.querySelectorAll(".deb-nota-inp").forEach(function(el) {
    el.addEventListener("input", function() {
      debGuardarNota(this.dataset.mes, this.dataset.key, this.value);
      this.className = "deb-nota-inp" + (this.value.trim().length > 0 ? " tiene-nota" : "");
      var msg = document.getElementById("debSavedMsg");
      if (msg) { msg.style.display = "inline"; clearTimeout(msg._t); msg._t = setTimeout(function(){ msg.style.display="none"; }, 1800); }
    });
  });
}

function debGetGuardados() {
  try { return JSON.parse(localStorage.getItem('deb_guardados') || '[]'); } catch(e) { return []; }
}

function debSugerirPeriodo() {
  var meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  var d = new Date();
  return meses[d.getMonth()] + '-' + d.getFullYear();
}

function debGuardarImport() {
  var inp = document.getElementById('debPeriodoKey');
  var key = inp ? inp.value.trim().toLowerCase().replace(/ /g,'-') : '';
  if (!key || !debImportData) return;
  localStorage.setItem('deb_imp_' + key, JSON.stringify(debImportData));
  var guardados = debGetGuardados();
  if (guardados.indexOf(key) === -1) { guardados.unshift(key); localStorage.setItem('deb_guardados', JSON.stringify(guardados)); }
  debImportData = null;
  debMesActual = '__g__' + key;
  var msg = document.getElementById('debSavedMsg');
  if (msg) { msg.style.display='inline'; setTimeout(function(){ msg.style.display='none'; }, 2000); }
  renderDebitos();
}

function debSelMes(val) {
  debImportData = null;
  debMesActual = val;
  if (val.indexOf('__g__') === 0) {
    var key = val.replace('__g__','');
    try { debImportData = JSON.parse(localStorage.getItem('deb_imp_' + key) || 'null'); } catch(e) {}
  }
  renderDebitos();
}

function debEliminarGuardado(key) {
  if (!confirm('¿Eliminar ' + key + '?')) return;
  localStorage.removeItem('deb_imp_' + key);
  var guardados = debGetGuardados().filter(function(g){ return g !== key; });
  localStorage.setItem('deb_guardados', JSON.stringify(guardados));
  debImportData = null; debMesActual = '';
  renderDebitos();
}

function debSetEstado(sel) {
  var key = sel.dataset.stkey;
  var val = sel.value;
  if (val) localStorage.setItem(key, val); else localStorage.removeItem(key);
  var bgMap = { 'P':'#fde8e8', 'R':'#e6f9ec', 'A':'#fffbe6', '':'' };
  var tr = sel.closest('tr');
  if (tr) tr.style.background = bgMap[val] || '';
}

function imprimirDebitos() {
  window.print();
}

/* ── AUDITOR DE DÉBITOS (NUN) ──────────────────────────────────
   Analiza un débito de auditoría médica contra el Nomenclador Único
   Nacional (6ª ed.) y dictamina: procedente / refacturar / auditoría.
   Backend: worker ceot-debitos-auditor (Claude API). Ver README de ese repo.
   No reemplaza el criterio de un médico matriculado.                */

// Completar tras deployar el worker (wrangler deploy):
var DEBITOS_AUDITOR_ENDPOINT = "https://ceot-debitos-auditor.marcelo-aime74.workers.dev/analizar";
var DEBITOS_AUDITOR_TOKEN    = "ceot-e6e347f65a8bfad548b64e2b8f7269d240391b59";  // igual al secret AUDITOR_TOKEN del worker (si se configuró)

function debAnalisisKey(fact, nprest) { return "deb_analisis_" + fact + "_" + nprest; }
function debAuditorFormKey(fact, nprest) { return "deb_auditor_form_" + fact + "_" + nprest; }

var debAuditorActual = null; // índice en debImportData de la fila abierta
var debAudImagenes = [];     // [{media_type, data}] — páginas del protocolo escaneado a enviar como imagen

function debAuditorInject() {
  if (document.getElementById("debAuditorBg")) return;
  var bg = document.createElement("div");
  bg.id = "debAuditorBg";
  bg.style.cssText = "display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:var(--z-modal-top,4000);align-items:flex-start;justify-content:center;padding:18px 10px;overflow-y:auto";
  bg.onclick = function(e){ if (e.target === bg) debCerrarAuditor(); };
  bg.innerHTML =
      '<div style="background:#fdf8f0;border-radius:12px;width:100%;max-width:720px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.3)">'
    +   '<div style="background:#1f3a2e;padding:13px 16px;display:flex;align-items:center;justify-content:space-between">'
    +     '<div><div style="color:#fff;font-size:0.9rem;font-weight:700">🩺 Auditor de débitos — NUN 6ª ed.</div>'
    +     '<div id="debAudSub" style="color:rgba(255,255,255,.45);font-size:0.66rem;margin-top:2px"></div></div>'
    +     '<button onclick="debCerrarAuditor()" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:4px 11px;border-radius:5px;cursor:pointer;font-family:inherit;font-size:0.8rem">✕</button>'
    +   '</div>'
    +   '<div style="padding:14px 16px;max-height:78vh;overflow-y:auto">'
    +     '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px 12px">'
    +       debAudField("Obra social / ART", '<input id="debAudOS" type="text" style="'+debAudInp()+'">')
    +       debAudField("Fecha cirugía", '<input id="debAudFecha" type="text" placeholder="mm/aaaa o dd/mm/aaaa" style="'+debAudInp()+'">')
    +       debAudField("Código NUN facturado por CEOT", '<input id="debAudCodFact" type="text" placeholder="MS.06.02" oninput="debAudDesc(\'Fact\')" style="'+debAudInp()+'"><div id="debAudDescFact" style="font-size:0.63rem;color:#6b5f4d;margin-top:2px;min-height:12px"></div>')
    +       debAudField("Código NUN que pretende el auditor", '<input id="debAudCodAud" type="text" placeholder="MS.04.02" oninput="debAudDesc(\'Aud\')" style="'+debAudInp()+'"><div id="debAudDescAud" style="font-size:0.63rem;color:#6b5f4d;margin-top:2px;min-height:12px"></div>')
    +       debAudField("Importe facturado ($)", '<input id="debAudImpFact" type="text" inputmode="decimal" style="'+debAudInp()+'">')
    +       debAudField("Importe debitado ($)", '<input id="debAudImpDeb" type="text" inputmode="decimal" style="'+debAudInp()+'">')
    +       debAudField("Edad del paciente", '<input id="debAudEdad" type="text" inputmode="numeric" placeholder="opcional — habilita Norma Sec. 1" style="'+debAudInp()+'">')
    +       '<div></div>'
    +     '</div>'
    +     debAudFieldWide("Motivo / fundamento del auditor para el débito", '<textarea id="debAudMotivo" rows="2" style="'+debAudInp()+';resize:vertical"></textarea>')
    +     debAudFieldWide("Diagnóstico (opcional)", '<input id="debAudDx" type="text" style="'+debAudInp()+'">')
    +     debAudFieldWide("Protocolo operatorio — subí el PDF o la foto (opcional)", '<input id="debAudFile" type="file" accept=".pdf,image/*" multiple onchange="debAudCargarArchivoParte(this)" style="font-size:0.74rem;color:#20241f"><div id="debAudFileMsg" style="font-size:0.66rem;color:#6b5f4d;margin-top:3px;min-height:12px"></div><div style="font-size:0.6rem;color:#9a8c78;margin-top:2px">PDF digital &rarr; extrae el texto al campo de abajo. PDF escaneado o foto &rarr; se manda como imagen para que el modelo lo lea.</div>')
    +     debAudFieldWide("Parte quirúrgico / protocolo operatorio <span style=\'color:#b13a2c\'>*</span>", '<textarea id="debAudParte" rows="7" placeholder="Pegá el protocolo, o subí el PDF/foto arriba. Es lo más importante: sin esto el análisis es de baja confianza." style="'+debAudInp()+';resize:vertical;font-size:0.78rem"></textarea>')
    +     '<div style="display:flex;gap:8px;margin-top:12px">'
    +       '<button id="debAudBtn" class="deb-btn deb-btn-pri" style="flex:1;padding:9px" onclick="debAuditorAnalizar()">Analizar débito</button>'
    +       '<button class="deb-btn" style="padding:9px 14px" onclick="debCerrarAuditor()">Cerrar</button>'
    +     '</div>'
    +     '<div id="debAudMsg" style="font-size:0.72rem;color:#b13a2c;margin-top:8px;min-height:14px"></div>'
    +     '<div id="debAudResultado" style="margin-top:12px"></div>'
    +     '<div style="font-size:0.6rem;color:#9a8c78;margin-top:14px;border-top:1px solid rgba(32,36,31,.1);padding-top:8px">Análisis asistido por IA anclado al NUN 6ª edición. No sustituye el criterio de un médico matriculado — un profesional de CEOT debe validar antes de responder al auditor.</div>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(bg);
}
function debAudInp() { return "width:100%;padding:6px 9px;border:1px solid rgba(32,36,31,.18);border-radius:6px;font-size:0.8rem;font-family:inherit;background:rgba(32,36,31,.05);color:#20241f"; }
function debAudField(lbl, inner) { return '<div><label style="display:block;font-size:0.63rem;font-weight:700;color:rgba(32,36,31,.5);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">'+lbl+'</label>'+inner+'</div>'; }
function debAudFieldWide(lbl, inner) { return '<div style="margin-top:9px"><label style="display:block;font-size:0.63rem;font-weight:700;color:rgba(32,36,31,.5);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">'+lbl+'</label>'+inner+'</div>'; }

function debAudDesc(which) {
  var inp = document.getElementById("debAudCod" + (which === "Fact" ? "Fact" : "Aud"));
  var out = document.getElementById("debAudDesc" + which);
  if (!inp || !out) return;
  var d = (typeof nunDescribir === "function") ? nunDescribir(inp.value) : null;
  out.textContent = d || (inp.value.trim() ? "código NUN no reconocido" : "");
  out.style.color = d ? "#1a7a52" : "#b45309";
}

// ── Carga del protocolo operatorio: PDF (texto o escaneado) o foto ──
// PDF con capa de texto → vuelca el texto al textarea.
// PDF escaneado o imagen → guarda las páginas como JPEG en debAudImagenes,
// que debAuditorAnalizar() manda al worker para que Claude las lea (visión).
var DEB_AUD_MAX_PAG = 12;
var DEB_AUD_MAX_DIM = 1600;

async function debAudCargarArchivoParte(input) {
  var files = Array.prototype.slice.call(input.files || []);
  if (!files.length) return;
  var msg = document.getElementById("debAudFileMsg");
  msg.style.color = "#6b5f4d";
  msg.textContent = "Procesando archivo…";
  debAudImagenes = [];
  try {
    var textos = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (/^image\//.test(f.type)) {
        debAudImagenes.push(await debImagenAJpeg(f));
      } else if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
        var r = await debPDFExtraer(f);
        if (r.texto && r.texto.replace(/\s/g, "").length >= 200) textos.push(r.texto);
        else r.imagenes.forEach(function(im) { debAudImagenes.push(im); });
      }
    }
    if (debAudImagenes.length > DEB_AUD_MAX_PAG) debAudImagenes = debAudImagenes.slice(0, DEB_AUD_MAX_PAG);

    var ta = document.getElementById("debAudParte");
    if (textos.length) ta.value = (ta.value ? ta.value + "\n\n" : "") + textos.join("\n\n");

    var n = debAudImagenes.length;
    if (n && textos.length) { msg.style.color = "#1a7a52"; msg.textContent = "✓ Texto extraído + " + n + " pág(s) escaneada(s) como imagen."; }
    else if (n)             { msg.style.color = "#1a7a52"; msg.textContent = "✓ " + n + " imagen(es) — se envían al análisis (protocolo escaneado)."; }
    else if (textos.length) { msg.style.color = "#1a7a52"; msg.textContent = "✓ Texto del PDF extraído al campo de abajo — revisalo."; }
    else                    { msg.style.color = "#b45309"; msg.textContent = "No pude extraer texto ni imágenes del archivo."; }
  } catch (e) {
    debAudImagenes = [];
    msg.style.color = "#b13a2c";
    msg.textContent = "Error leyendo el archivo: " + e.message;
  }
}

function debCanvasAJpeg(canvas) {
  var out = canvas;
  var sc = Math.min(1, DEB_AUD_MAX_DIM / Math.max(canvas.width, canvas.height));
  if (sc < 1) {
    out = document.createElement("canvas");
    out.width = Math.round(canvas.width * sc);
    out.height = Math.round(canvas.height * sc);
    out.getContext("2d").drawImage(canvas, 0, 0, out.width, out.height);
  }
  return { media_type: "image/jpeg", data: out.toDataURL("image/jpeg", 0.82).split(",")[1] };
}

function debImagenAJpeg(file) {
  return new Promise(function(resolve, reject) {
    var rd = new FileReader();
    rd.onload = function() {
      var im = new Image();
      im.onload = function() {
        var c = document.createElement("canvas");
        c.width = im.width; c.height = im.height;
        c.getContext("2d").drawImage(im, 0, 0);
        resolve(debCanvasAJpeg(c));
      };
      im.onerror = function() { reject(new Error("imagen inválida")); };
      im.src = rd.result;
    };
    rd.onerror = function() { reject(new Error("no se pudo leer la imagen")); };
    rd.readAsDataURL(file);
  });
}

async function debPDFExtraer(file) {
  if (!window.pdfjsLib) throw new Error("pdf.js no está disponible");
  var buf = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  var maxP = Math.min(pdf.numPages, DEB_AUD_MAX_PAG);
  var texto = "";
  for (var p = 1; p <= maxP; p++) {
    var page = await pdf.getPage(p);
    var tc = await page.getTextContent();
    texto += tc.items.map(function(it) { return it.str; }).join(" ") + "\n";
  }
  if (texto.replace(/\s/g, "").length >= 200) return { texto: texto.trim(), imagenes: [] };

  var imagenes = [];
  for (var q = 1; q <= maxP; q++) {
    var pg = await pdf.getPage(q);
    var vp = pg.getViewport({ scale: 2 });
    var cv = document.createElement("canvas");
    cv.width = vp.width; cv.height = vp.height;
    await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    imagenes.push(debCanvasAJpeg(cv));
  }
  return { texto: "", imagenes: imagenes };
}

function debAbrirAuditor(i) {
  debAuditorInject();
  debAuditorActual = i;
  var d = (debImportData || [])[i];
  if (!d) return;
  var bg = document.getElementById("debAuditorBg");
  document.getElementById("debAudSub").textContent =
    (d.fact || "") + "  ·  " + (d.os || "") + "  ·  " + fmtDeb(Math.round(d.imp)) + "  ·  " + (d.prof || "");

  // prefill: primero lo guardado en el form, luego los datos de la fila
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(debAuditorFormKey(d.fact, d.nprest)) || "{}"); } catch (e) {}
  var val = function(id, v) { var el = document.getElementById(id); if (el) el.value = (v == null ? "" : v); };
  val("debAudOS",      saved.obraSocial      || d.os || "");
  val("debAudFecha",   saved.fecha           || d.periodo || "");
  val("debAudCodFact", saved.codigoFacturado || "");
  val("debAudCodAud",  saved.codigoAuditor   || "");
  val("debAudImpFact", saved.importeFacturado || "");
  val("debAudImpDeb",  saved.importeDebitado != null && saved.importeDebitado !== "" ? saved.importeDebitado : Math.round(d.imp || 0));
  val("debAudEdad",    saved.edadPaciente    || "");
  val("debAudMotivo",  saved.motivoAuditor   || "");
  val("debAudDx",      saved.diagnostico     || d.prac || "");
  val("debAudParte",   saved.parteQuirurgico || "");
  debAudDesc("Fact"); debAudDesc("Aud");

  debAudImagenes = [];
  var fileInp = document.getElementById("debAudFile"); if (fileInp) fileInp.value = "";
  var fileMsg = document.getElementById("debAudFileMsg"); if (fileMsg) fileMsg.textContent = "";

  document.getElementById("debAudMsg").textContent = "";
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(debAnalisisKey(d.fact, d.nprest)) || "null"); } catch (e) {}
  document.getElementById("debAudResultado").innerHTML = cached ? debAuditorResultadoHtml(cached) : "";

  bg.style.display = "flex";
}

function debCerrarAuditor() {
  var bg = document.getElementById("debAuditorBg");
  if (bg) bg.style.display = "none";
  debAuditorActual = null;
}

function debAuditorLeerForm() {
  var g = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; };
  return {
    obraSocial: g("debAudOS"),
    fecha: g("debAudFecha"),
    codigoFacturado: g("debAudCodFact"),
    codigoAuditor: g("debAudCodAud"),
    importeFacturado: g("debAudImpFact"),
    importeDebitado: g("debAudImpDeb"),
    edadPaciente: g("debAudEdad"),
    motivoAuditor: g("debAudMotivo"),
    diagnostico: g("debAudDx"),
    parteQuirurgico: g("debAudParte")
  };
}

function debAuditorAnalizar() {
  var d = (debImportData || [])[debAuditorActual];
  if (!d) return;
  var msg = document.getElementById("debAudMsg");
  var btn = document.getElementById("debAudBtn");
  var form = debAuditorLeerForm();

  if (!form.parteQuirurgico && !form.motivoAuditor && !debAudImagenes.length) {
    msg.textContent = "Cargá el parte quirúrgico (texto o PDF/foto) o al menos el motivo del auditor.";
    return;
  }
  if (!/^https?:\/\//.test(DEBITOS_AUDITOR_ENDPOINT)) {
    msg.textContent = "Falta configurar DEBITOS_AUDITOR_ENDPOINT en js/accesos-debitos.js (deployá el worker primero).";
    return;
  }

  // el form cacheado NO lleva imágenes (pesan y no valen para reintentar)
  try { localStorage.setItem(debAuditorFormKey(d.fact, d.nprest), JSON.stringify(form)); } catch (e) {}

  if (debAudImagenes.length) {
    var b64 = debAudImagenes.reduce(function(s, im) { return s + im.data.length; }, 0);
    if (b64 > 22 * 1024 * 1024) {
      msg.style.color = "#b13a2c";
      msg.textContent = "Las imágenes pesan demasiado (" + Math.round(b64 / 1048576) + " MB). Subí menos páginas o un PDF más liviano.";
      return;
    }
    form.imagenesParte = debAudImagenes;
  }

  msg.style.color = "#6b5f4d";
  msg.textContent = debAudImagenes.length ? "Leyendo el protocolo y analizando… (20–45 s)" : "Analizando con el NUN… (10–30 s)";
  btn.disabled = true; btn.textContent = "Analizando…";

  var headers = { "Content-Type": "application/json" };
  if (DEBITOS_AUDITOR_TOKEN) headers["X-Auditor-Token"] = DEBITOS_AUDITOR_TOKEN;

  fetch(DEBITOS_AUDITOR_ENDPOINT, { method: "POST", headers: headers, body: JSON.stringify(form) })
    .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
    .then(function(res){
      btn.disabled = false; btn.textContent = "Analizar débito";
      if (!res.ok || !res.j || res.j.ok === false) {
        msg.style.color = "#b13a2c";
        msg.textContent = "Error: " + ((res.j && (res.j.error || res.j.detalle)) || "respuesta inválida del servidor");
        return;
      }
      msg.textContent = "";
      try { localStorage.setItem(debAnalisisKey(d.fact, d.nprest), JSON.stringify(res.j)); } catch (e) {}
      document.getElementById("debAudResultado").innerHTML = debAuditorResultadoHtml(res.j);
    })
    .catch(function(err){
      btn.disabled = false; btn.textContent = "Analizar débito";
      msg.style.color = "#b13a2c";
      msg.textContent = "No se pudo contactar el auditor: " + err.message;
    });
}

var DEB_VEREDICTO = {
  procedente:    { lbl: "🔴 Débito PROCEDENTE", bg: "#fde8e8", bd: "#dc2626", est: "P", estLbl: "🔴 Procedente" },
  refacturar:    { lbl: "🟢 Hay que REFACTURAR", bg: "#e6f9ec", bd: "#16a34a", est: "R", estLbl: "🟢 Se refactura" },
  auditoria:     { lbl: "🟡 Requiere AUDITORÍA médica", bg: "#fffbe6", bd: "#ca8a04", est: "A", estLbl: "🟡 Auditoría médica" },
  indeterminado: { lbl: "⚪ Indeterminado", bg: "#f1f0ec", bd: "#9a8c78", est: "", estLbl: "" }
};

function debAuditorResultadoHtml(res) {
  var v = DEB_VEREDICTO[res.veredicto] || DEB_VEREDICTO.indeterminado;
  var d = (debImportData || [])[debAuditorActual] || {};
  var li = function(arr) {
    if (!arr || !arr.length) return "";
    return '<ul style="margin:4px 0 0 16px;padding:0;font-size:0.74rem;color:#3a352c;line-height:1.5">'
      + arr.map(function(x){ return '<li style="margin-bottom:3px">' + debEsc(x) + '</li>'; }).join("") + '</ul>';
  };
  var anal = function(a, titulo) {
    if (!a) return "";
    return '<div style="font-size:0.72rem;color:#3a352c;margin-top:5px"><strong>' + titulo + ':</strong> '
      + debEsc(a.codigo || "—") + (a.corresponde ? ' <span style="color:#16a34a">✓ corresponde</span>' : ' <span style="color:#b13a2c">✗ no corresponde</span>')
      + (a.descripcionNUN ? '<br><span style="color:#6b5f4d">' + debEsc(a.descripcionNUN) + '</span>' : "")
      + (a.comentario ? '<br>' + debEsc(a.comentario) : "") + '</div>';
  };
  var h = '<div style="border:1px solid ' + v.bd + ';border-left:4px solid ' + v.bd + ';background:' + v.bg + ';border-radius:8px;padding:11px 13px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'
    +   '<div style="font-weight:800;font-size:0.86rem;color:#20241f">' + v.lbl + '</div>'
    +   '<div style="font-size:0.66rem;color:#6b5f4d">confianza: <strong>' + debEsc(res.confianza || "—") + '</strong></div>'
    + '</div>'
    + (res.imagenesRecibidas ? '<div style="font-size:0.63rem;color:#6b5f4d;margin-top:4px">📄 protocolo leído de ' + res.imagenesRecibidas + ' imagen(es)</div>' : "")
    + (res.resumen ? '<div style="font-size:0.8rem;color:#20241f;margin-top:6px">' + debEsc(res.resumen) + '</div>' : "")
    + (res.codigoCorrecto ? '<div style="font-size:0.74rem;color:#20241f;margin-top:6px">Código que correspondería: <strong>' + debEsc(res.codigoCorrecto) + '</strong>'
        + (typeof nunDescribir === "function" && nunDescribir(res.codigoCorrecto) ? ' <span style="color:#6b5f4d">— ' + debEsc(nunDescribir(res.codigoCorrecto).split(" — ").slice(2).join(" — ")) + '</span>' : "") + '</div>' : "")
    + (res.esDiferenciaDeValor ? '<div style="font-size:0.72rem;color:#b45309;margin-top:6px">⚠ Parece un débito por diferencia de <em>valor</em>, no de código/complejidad: se resuelve contra la grilla del convenio, no con este análisis.</div>' : "")
    + anal(res.analisisFacturado, "Código facturado")
    + anal(res.analisisAuditor, "Código del auditor")
    + (res.modificadoresNorma && res.modificadoresNorma.length ? '<div style="font-size:0.72rem;color:#3a352c;margin-top:6px"><strong>Modificadores de norma:</strong>' + li(res.modificadoresNorma) + '</div>' : "")
    + (res.fundamentos && res.fundamentos.length ? '<div style="margin-top:7px"><strong style="font-size:0.72rem;color:#3a352c">Fundamentos</strong>' + li(res.fundamentos) + '</div>' : "")
    + (res.faltaInfo && res.faltaInfo.length ? '<div style="margin-top:7px"><strong style="font-size:0.72rem;color:#b45309">Falta para ser concluyente</strong>' + li(res.faltaInfo) + '</div>' : "")
    + (res.textoSugeridoDescargo ? '<div style="margin-top:8px"><strong style="font-size:0.72rem;color:#3a352c">Borrador de descargo al auditor</strong>'
        + '<div style="font-size:0.74rem;color:#20241f;background:rgba(255,255,255,.6);border:1px solid rgba(32,36,31,.12);border-radius:6px;padding:8px;margin-top:3px;white-space:pre-wrap">' + debEsc(res.textoSugeridoDescargo) + '</div>'
        + '<button class="deb-btn" style="font-size:0.66rem;padding:3px 8px;margin-top:4px" onclick="debAudCopiar(this)">Copiar</button></div>' : "")
    + '<div style="display:flex;gap:6px;margin-top:11px;flex-wrap:wrap">'
    +   (v.est ? '<button class="deb-btn deb-btn-pri" style="font-size:0.7rem;padding:5px 10px" onclick="debAuditorAplicar(\'' + v.est + '\')">Aplicar estado &laquo;' + v.estLbl + '&raquo; a la fila</button>' : "")
    +   '<button class="deb-btn" style="font-size:0.7rem;padding:5px 10px" onclick="debAuditorBorrar()">Borrar análisis</button>'
    + '</div>'
    + '</div>';
  return h;
}

function debEsc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]; });
}

function debAudCopiar(btn) {
  var box = btn.parentNode.querySelector("div");
  if (!box) return;
  var t = box.textContent || "";
  if (navigator.clipboard) navigator.clipboard.writeText(t);
  var o = btn.textContent; btn.textContent = "Copiado ✓";
  setTimeout(function(){ btn.textContent = o; }, 1400);
}

function debAuditorAplicar(estado) {
  var d = (debImportData || [])[debAuditorActual];
  if (!d || !estado) return;
  var stKey = "deb_est_" + d.fact + "_" + d.nprest;
  localStorage.setItem(stKey, estado);
  debCerrarAuditor();
  renderDebitos();
}

function debAuditorBorrar() {
  var d = (debImportData || [])[debAuditorActual];
  if (!d) return;
  localStorage.removeItem(debAnalisisKey(d.fact, d.nprest));
  document.getElementById("debAudResultado").innerHTML = "";
  renderDebitos();
}

/* ── CPSM ── */
var CPSM_PROF = [
  { ap:"BRUNI",        nombre:"Maximiliano Ezequiel",  mat:"94435", mape:"40796362", notaNombre:"DR. BRUNI MAXIMILIANO",       cuit:"23-27940042-9" },
  { ap:"CORELICH",     nombre:"Daniel Oscar",           mat:"92859", mape:"41796362", notaNombre:"DR. CORELICH DANIEL",         cuit:"20-18129265-3" },
  { ap:"DE LA COLINA", nombre:"Juan Pablo",             mat:"95943", mape:"46796362", notaNombre:"DR. DE LA COLINA JUAN PABLO", cuit:"24-36384171-2" },
  { ap:"DEGANUTTI",    nombre:"Cristian Gabriel",       mat:"94391", mape:"42796362", notaNombre:"DR. DEGANUTTI CRISTIAN",      cuit:"20-27466325-2" },
  { ap:"LABAYEN",      nombre:"Daniel Guillermo",       mat:"18863", mape:"43796362", notaNombre:"DR. LABAYEN DANIEL",          cuit:"20-13704461-8", exento:true },
  { ap:"LEON",         nombre:"Joaquin Eduardo",        mat:"96521", mape:"48796362", notaNombre:"DR. JOAQUIN LEON",            cuit:"20-37405582-9" },
  { ap:"MAZZOLA",      nombre:"Maximiliano Tomas",      mat:"95178", mape:"45796362", notaNombre:"DR. MAZZOLA MAXIMILIANO",     cuit:"20-29593564-3" },
  { ap:"PERLASCO",     nombre:"Camilo Nicolas",         mat:"95074", mape:"47796362", notaNombre:"DR. PERLASCO CAMILO",         cuit:"20-29593933-9" },
  { ap:"SOULE",        nombre:"Ivan",                   mat:"96211", mape:"49796362", notaNombre:"DR. IVAN SOULÉ",              cuit:"20-35296127-3" },
  { ap:"TRIVELLINI",   nombre:"Amilcar",                mat:"93078", mape:"44796362", notaNombre:"DR. TRIVELLINI AMILCAR",      cuit:"20-20654988-3" },
];
var MESES_CPSM = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function cpsmMesFuente(mesLiqNum) {
  var idx = mesLiqNum - 3; // M-2 → idx = mesLiqNum-1 - 2
  if (idx < 0) idx += 12;
  return MESES_CPSM[idx];
}

function cpsmCalc(honor) {
  return Math.floor(honor * 0.05);
}

function cpsmFmt(n) {
  return n.toLocaleString("es-AR", { minimumFractionDigits:0, maximumFractionDigits:0 });
}

function cpsmLeerInputs() {
  var vals = {};
  CPSM_PROF.forEach(function(p) {
    var el = document.getElementById("cpsm-in-" + p.ap.replace(/ /g,"_"));
    var raw = el ? el.value.replace(/\./g,"").replace(",",".").trim() : "0";
    vals[p.ap] = parseFloat(raw) || 0;
  });
  return vals;
}

function cpsmActualizarResultados() {
  var vals = cpsmLeerInputs();
  var total = 0;
  CPSM_PROF.forEach(function(p) {
    var el = document.getElementById("cpsm-res-" + p.ap.replace(/ /g,"_"));
    if (!el) return;
    var cpsm = p.exento ? 10 : cpsmCalc(vals[p.ap]);
    el.textContent = "$ " + cpsmFmt(cpsm);
    total += cpsm;
  });
  var totEl = document.getElementById("cpsm-total");
  if (totEl) totEl.textContent = "$ " + cpsmFmt(total);
  var dlBtn = document.getElementById("cpsm-dl-btn");
  if (dlBtn) dlBtn.style.display = "inline-block";
}

function cpsmDescargarExcel() {
  var mesLiqSel = document.getElementById("cpsm-mes-liq");
  var anioSel   = document.getElementById("cpsm-anio");
  if (!mesLiqSel || !anioSel) return;
  var mesLiqStr = mesLiqSel.value;
  var anio      = anioSel.value;
  var vals      = cpsmLeerInputs();

  // El portal de CPSM calcula el 5% él mismo — exportamos los honorarios M-2
  // crudos, no el "CPSM a pagar" que ya calculamos acá.
  // Sin fila de TOTAL y CUIT sin guiones: el portal de carga no toma el archivo si no matchea ese formato exacto.
  var rows = [["Apellido","Nombre","Matricula","CUIT","Honorarios"]];
  CPSM_PROF.forEach(function(p) {
    var honor = p.exento ? 0 : Math.round(vals[p.ap] || 0);
    if (!honor) honor = 10; // el portal de carga no acepta filas con importe 0
    rows.push([p.ap, p.nombre.toUpperCase(), p.mat, p.cuit.replace(/-/g,""), honor]);
  });

  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{wch:18},{wch:26},{wch:12},{wch:18},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws, mesLiqStr);
  XLSX.writeFile(wb, "CPSM_" + mesLiqStr + "_" + anio + ".xlsx");
}

function cpsmRenderTabla(honorariosData) {
  var filas = CPSM_PROF.map(function(p) {
    var id    = "cpsm-in-" + p.ap.replace(/ /g,"_");
    var resId = "cpsm-res-" + p.ap.replace(/ /g,"_");
    var valor = honorariosData ? Math.round(honorariosData[p.ap] || 0) : 0;
    var inputCell = p.exento
      ? '<td><span class="cpsm-exento">exento</span></td>'
      : '<td><input class="cpsm-input" id="' + id + '" type="text" value="' + valor + '" oninput="cpsmActualizarResultados()" onblur="this.value=this.value.trim()"></td>';
    return '<tr>'
      + '<td><strong>' + p.ap + '</strong></td>'
      + inputCell
      + '<td><span class="cpsm-result" id="' + resId + '">$ 0</span></td>'
      + '</tr>';
  }).join("");
  var tbody = document.getElementById("cpsm-tbody");
  if (tbody) tbody.innerHTML = filas;

  var statusEl = document.getElementById("cpsm-fetch-status");
  if (statusEl) {
    statusEl.textContent = honorariosData ? "Honorarios cargados desde RESUMEN." : "Sin datos del Sheet — ingresá los importes manualmente.";
    statusEl.style.color = honorariosData ? "#1a7a52" : "#b45309";
  }
  cpsmActualizarResultados();
}

async function cpsmFetchHonorarios(mesFuente) {
  var statusEl = document.getElementById("cpsm-fetch-status");
  if (statusEl) { statusEl.textContent = "Cargando desde RESUMEN..."; statusEl.style.color = "#888"; }
  try {
    var url  = LIQUIDACION_ENDPOINT + "?action=honorarios&mes=" + mesFuente;
    var resp = await fetch(authURL(url));
    var data = await resp.json();
    if (data.ok && data.data) {
      cpsmRenderTabla(data.data);
    } else {
      cpsmRenderTabla(null);
    }
  } catch(e) {
    cpsmRenderTabla(null);
  }
}

function renderCpsm() {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  var btn = document.getElementById("adm-sidenav-cpsm");
  if (btn) btn.className = "adm-sidenav-btn active";

  var hoy = new Date();
  var mesActNum = hoy.getMonth() + 1;
  var anioAct   = hoy.getFullYear();
  var fuenteStr = cpsmMesFuente(mesActNum);

  var opsMes = MESES_CPSM.map(function(m, i) {
    var sel = (i+1 === mesActNum) ? " selected" : "";
    return '<option value="' + m + '"' + sel + '>' + m.charAt(0).toUpperCase() + m.slice(1) + '</option>';
  }).join("");

  var html = '<div style="padding:16px">'
    + '<div class="cpsm-header">'
    +   '<div><div class="cpsm-title">🏦 CPSM Mensual</div>'
    +   '<div class="cpsm-subtitle">5% de honorarios Colón+OSDE de M-2 · Labayen = $10</div></div>'
    + '</div>'
    + '<div class="cpsm-periodo-row">'
    +   '<div class="sb-field"><label>Mes de liquidación</label>'
    +     '<select id="cpsm-mes-liq" style="background:rgba(32,36,31,.05);border:1px solid rgba(32,36,31,.15);color:#20241f;border-radius:6px;padding:7px 10px;font-size:0.9rem;width:100%" onchange="cpsmCambiarPeriodo()">' + opsMes + '</select></div>'
    +   '<div class="sb-field"><label>Año</label>'
    +     '<input type="number" id="cpsm-anio" value="' + anioAct + '" style="background:rgba(32,36,31,.05);border:1px solid rgba(32,36,31,.15);color:#20241f;border-radius:6px;padding:7px 10px;font-size:0.9rem;width:100%" onchange="cpsmCambiarPeriodo()"></div>'
    + '</div>'
    + '<div style="margin-bottom:10px;font-size:0.8rem;color:rgba(32,36,31,.55)">Honorarios fuente: <span class="cpsm-fuente-badge" id="cpsm-fuente-label">' + fuenteStr.charAt(0).toUpperCase()+fuenteStr.slice(1) + ' ' + anioAct + '</span>'
    + '  <span id="cpsm-fetch-status" style="margin-left:8px;font-size:0.72rem">Cargando...</span></div>'
    + '<table class="cpsm-tabla">'
    +   '<thead><tr><th>Profesional</th><th>Honorarios (M-2)</th><th>CPSM a pagar</th></tr></thead>'
    +   '<tbody id="cpsm-tbody"></tbody>'
    +   '<tfoot><tr class="cpsm-total-row"><td colspan="2">TOTAL</td><td><span id="cpsm-total">$ 0</span></td></tr></tfoot>'
    + '</table>'
    + '<div class="cpsm-btn-row">'
    +   '<button class="cpsm-calc-btn" onclick="actionFeedback(this); cpsmActualizarResultados()">Recalcular</button>'
    +   '<button class="cpsm-dl-btn" id="cpsm-dl-btn" onclick="actionFeedback(this); cpsmDescargarExcel()" style="display:none">⬇ Descargar Excel</button>'
    + '</div>'
    + '<div style="margin-top:26px;border-top:1px solid rgba(32,36,31,.12);padding-top:18px">'
    +   '<div class="cpsm-title" style="font-size:1rem">📄 Nota constancia CEM</div>'
    +   '<div class="cpsm-subtitle">% de la acreditación CEM de cada profesional sobre el total del mes — para la nota que se manda a CEM. Mes: <strong id="cemnota-mes-lbl">' + (MESES_CPSM[mesActNum-1].charAt(0).toUpperCase()+MESES_CPSM[mesActNum-1].slice(1)) + ' ' + anioAct + '</strong>'
    +   '  <span id="cemnota-status" style="margin-left:8px;font-size:0.72rem">Cargando...</span></div>'
    +   '<table class="cpsm-tabla" style="margin-top:10px">'
    +     '<thead><tr><th>MAPE</th><th>Profesional</th><th>Importe acred. CEM</th><th>%</th></tr></thead>'
    +     '<tbody id="cemnota-tbody"></tbody>'
    +     '<tfoot><tr class="cpsm-total-row"><td colspan="2">TOTAL</td><td><span id="cemnota-tot-imp">$ 0</span></td><td><span id="cemnota-tot-pct">0,00%</span></td></tr></tfoot>'
    +   '</table>'
    +   '<div class="cpsm-btn-row">'
    +     '<button class="cpsm-calc-btn" onclick="actionFeedback(this); cemNotaActualizar()">Recalcular</button>'
    +     '<button class="cpsm-dl-btn" id="cemnota-pdf-btn" style="display:none" onclick="actionFeedback(this); cemNotaGenerarPDF()">📄 Generar nota (PDF)</button>'
    +   '</div>'
    + '</div>'
    + '</div>';

  document.getElementById("adm-content").innerHTML = html;

  // Render tabla vacía mientras carga
  cpsmRenderTabla(null);
  cemNotaRenderTabla(null);
  // Fetch automático
  cpsmFetchHonorarios(fuenteStr);
  cemNotaFetch(MESES_CPSM[mesActNum-1]);
}

function cpsmCambiarPeriodo() {
  cpsmActualizarFuente();
  var lbl = document.getElementById("cpsm-fuente-label");
  var fuente = lbl ? lbl.textContent.split(" ")[0].toLowerCase() : "";
  if (fuente) cpsmFetchHonorarios(fuente);
  // La nota CEM usa el MES DE LIQUIDACIÓN (no M-2)
  var mesLiqEl = document.getElementById("cpsm-mes-liq");
  var anioEl   = document.getElementById("cpsm-anio");
  if (mesLiqEl) {
    var lbl2 = document.getElementById("cemnota-mes-lbl");
    if (lbl2) lbl2.textContent = mesLiqEl.value.charAt(0).toUpperCase() + mesLiqEl.value.slice(1)
      + (anioEl ? " " + anioEl.value : "");
    cemNotaFetch(mesLiqEl.value);
  }
}

function cpsmActualizarFuente() {
  var mesEl  = document.getElementById("cpsm-mes-liq");
  var anioEl = document.getElementById("cpsm-anio");
  var lbl    = document.getElementById("cpsm-fuente-label");
  if (!mesEl || !anioEl || !lbl) return;
  var mesLiqNum = MESES_CPSM.indexOf(mesEl.value) + 1;
  var anio      = parseInt(anioEl.value) || new Date().getFullYear();
  var fuenteIdx = mesLiqNum - 3;
  var anioFuente = anio;
  if (fuenteIdx < 0) { fuenteIdx += 12; anioFuente = anio - 1; }
  var fuente = MESES_CPSM[fuenteIdx];
  lbl.textContent = fuente.charAt(0).toUpperCase() + fuente.slice(1) + " " + anioFuente;
}

// ══════ Nota constancia CEM — % de acreditación CEM por profesional (para CPSM) ═════
// Nota que CEOT manda a CEM los primeros días de cada mes: cada profesional con
// su MAPE (matrícula CEM) y el % que representa su acreditación CEM del mes sobre
// el total acreditado. pct = importe / total * 100 — mismo criterio que la preview
// del importador de CEM (procesarCentroMedico). Importes precargados desde
// ?action=leer&tipo=cm; editables a mano si el Sheet no los tiene.
var CEM_NOTA_EMPRESA = {
  razon:  "CEOT Traumatología Mar del Plata S.A.",
  cuit:   "30-71911954-5",
  cierre: "CEOT - Traumatología Clínica Colon"
};

function cemNotaProfsOrdenados() {
  return CPSM_PROF.slice().sort(function(a, b) {
    return String(a.mape || "").localeCompare(String(b.mape || ""));
  });
}

function cemNotaLeerImportes() {
  var vals = {};
  CPSM_PROF.forEach(function(p) {
    var el = document.getElementById("cemnota-in-" + p.ap.replace(/ /g, "_"));
    var raw = el ? el.value.replace(/\./g, "").replace(",", ".").trim() : "0";
    vals[p.ap] = parseFloat(raw) || 0;
  });
  return vals;
}

function cemNotaPct(imp, total) {
  if (!total || !imp) return null;
  return Math.round(imp / total * 10000) / 100; // 2 decimales
}

function cemNotaFmtPct(pct) {
  if (pct === null) return "–";
  return pct.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

function cemNotaActualizar() {
  var vals = cemNotaLeerImportes();
  var total = 0;
  CPSM_PROF.forEach(function(p) { total += vals[p.ap] || 0; });
  var sumaPct = 0;
  CPSM_PROF.forEach(function(p) {
    var cell = document.getElementById("cemnota-pct-" + p.ap.replace(/ /g, "_"));
    if (!cell) return;
    var pct = cemNotaPct(vals[p.ap] || 0, total);
    if (pct !== null) sumaPct += pct;
    cell.textContent = cemNotaFmtPct(pct);
  });
  var totImpEl = document.getElementById("cemnota-tot-imp");
  if (totImpEl) totImpEl.textContent = "$ " + cpsmFmt(Math.round(total));
  var totPctEl = document.getElementById("cemnota-tot-pct");
  if (totPctEl) totPctEl.textContent = (Math.round(sumaPct * 100) / 100)
    .toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  var btn = document.getElementById("cemnota-pdf-btn");
  if (btn) btn.style.display = total > 0 ? "inline-block" : "none";
}

function cemNotaRenderTabla(importesData) {
  var filas = cemNotaProfsOrdenados().map(function(p) {
    var key = p.ap.replace(/ /g, "_");
    var valor = importesData ? Math.round(importesData[p.ap] || 0) : 0;
    return '<tr>'
      + '<td style="color:rgba(32,36,31,.55)">' + (p.mape || "—") + '</td>'
      + '<td><strong>' + p.ap + '</strong></td>'
      + '<td><input class="cpsm-input" id="cemnota-in-' + key + '" type="text" value="' + valor + '" oninput="cemNotaActualizar()" onblur="this.value=this.value.trim()"></td>'
      + '<td><span class="cpsm-result" id="cemnota-pct-' + key + '">–</span></td>'
      + '</tr>';
  }).join("");
  var tbody = document.getElementById("cemnota-tbody");
  if (tbody) tbody.innerHTML = filas;
  var st = document.getElementById("cemnota-status");
  if (st) {
    st.textContent = importesData ? "Importes cargados desde RESUMEN (Centro Médico)." : "Sin datos del Sheet — cargá los importes de la acreditación CEM a mano.";
    st.style.color = importesData ? "#1a7a52" : "#b45309";
  }
  cemNotaActualizar();
}

async function cemNotaFetch(mesLiq) {
  var st = document.getElementById("cemnota-status");
  if (st) { st.textContent = "Cargando acreditación CEM..."; st.style.color = "#888"; }
  try {
    var url = LIQUIDACION_ENDPOINT + "?action=leer&tipo=cm&mes=" + encodeURIComponent(mesLiq);
    var data = await (await fetch(authURL(url))).json();
    var v = data && data.ok ? (data.valores || {}) : null;
    var sum = v ? Object.keys(v).reduce(function(s, k) { return s + (parseFloat(v[k]) || 0); }, 0) : 0;
    cemNotaRenderTabla(sum > 0 ? v : null);
  } catch (e) {
    cemNotaRenderTabla(null);
  }
}

function cemNotaGenerarPDF() {
  if (!window.jspdf) { alert("La librería PDF aún se está cargando. Esperá un segundo y volvé a intentar."); return; }
  var vals = cemNotaLeerImportes();
  var total = 0;
  CPSM_PROF.forEach(function(p) { total += vals[p.ap] || 0; });
  if (!total) { alert("Cargá primero los importes de la acreditación CEM."); return; }

  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  var LM = 25, RM = 185;
  var hoy = new Date();
  var fechaStr = "Mar del Plata, " + hoy.getDate() + " de " + MESES_CPSM[hoy.getMonth()] + " de " + hoy.getFullYear();

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(fechaStr, RM, 28, { align: "right" });

  var y = 48;
  doc.text("Por medio de la presente, dejamos constancia de los porcentajes a aplicar para la CPSM", LM, y);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text(CEM_NOTA_EMPRESA.razon, LM, y);
  y += 10;
  doc.text("Datos de la Empresa:", LM, y);
  y += 9;
  doc.setFont("helvetica", "normal");
  doc.text("•  Razón Social: " + CEM_NOTA_EMPRESA.razon, LM, y);
  y += 7;
  doc.text("•  CUIT: " + CEM_NOTA_EMPRESA.cuit, LM, y);
  y += 14;
  doc.text("Profesionales que lo integran:", LM, y);
  y += 8;

  var c0 = LM, c1 = LM + 32, c2 = RM - 28, cEnd = RM, rowH = 9;
  function fila(mape, prof, pct, bold) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.rect(c0, y, c1 - c0, rowH);
    doc.rect(c1, y, c2 - c1, rowH);
    doc.rect(c2, y, cEnd - c2, rowH);
    doc.text(String(mape), c0 + 2.5, y + 6);
    doc.text(String(prof), c1 + 2.5, y + 6);
    doc.text(String(pct), (c2 + cEnd) / 2, y + 6, { align: "center" });
    y += rowH;
  }
  fila("MAPE", "PROFESIONAL", "%", true);
  cemNotaProfsOrdenados().forEach(function(p) {
    var pct = cemNotaPct(vals[p.ap] || 0, total);
    fila(p.mape || "", p.notaNombre || ("DR. " + p.ap), cemNotaFmtPct(pct), false);
  });

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Sin más saluda atte.", LM, y);
  y += 12;
  doc.text(CEM_NOTA_EMPRESA.cierre, LM, y);

  var mesLiqEl = document.getElementById("cpsm-mes-liq");
  var mesLiq = mesLiqEl ? mesLiqEl.value : MESES_CPSM[hoy.getMonth()];
  doc.save("Constancia_Porcentajes_CPSM_CEM_" + mesLiq + "_" + hoy.getFullYear() + ".pdf");
}

// ── Reparto del fondo por % de incidencia fija (INCIDENCIA_FONDO_PCT) ──────
// El monto total es lo único editable acá — se persiste en localStorage y se
// espeja entre PCs con syncPush/syncPull (mismo patrón que el resto del panel
// desde el commit "Sync de estado entre PCs", 25/08/2026).
var INCIDENCIA_TOTAL_KEY = "ceot_incidencia_total";
var _incidenciaTotalPulled = false;
function incidenciaTotalCargar() {
  if (!_incidenciaTotalPulled) {
    _incidenciaTotalPulled = true;
    syncPull(INCIDENCIA_TOTAL_KEY, function() {
      if (document.getElementById("incidencia-total-input")) renderIncidenciaFondo();
    });
  }
  var raw = localStorage.getItem(INCIDENCIA_TOTAL_KEY);
  return raw ? (parseFloat(raw) || 0) : 0;
}
function incidenciaTotalGuardar(v) {
  localStorage.setItem(INCIDENCIA_TOTAL_KEY, String(v || 0));
  syncPush(INCIDENCIA_TOTAL_KEY);
}

// Suma, por apellido, el aporteCeot ya cargado en cada período de APORTE_CEOT_DESDE
// — misma lógica que la fila ACUMULADO de "Registro mensual" en renderAporteCeot(),
// factorizada acá para reusarla también en la tabla de Reparto del fondo.
function getAporteCeotAcumuladoPorApellido(apellidos) {
  var acumulado = {};
  apellidos.forEach(function(ap) { acumulado[ap] = 0; });
  APORTE_CEOT_DESDE.forEach(function(p) {
    apellidos.forEach(function(ap) {
      var doc = DOCTORES.filter(function(d) { return d.apellido === ap; })[0];
      if (!doc) return;
      var c = calcularNetoLocal(p, doc);
      if (c) acumulado[ap] += (c.aporteCeot || 0);
    });
  });
  return acumulado;
}

function incidenciaFondoWrapHtml(total) {
  var apellidos = Object.keys(INCIDENCIA_FONDO_PCT);
  var acumulado = getAporteCeotAcumuladoPorApellido(apellidos);
  var filas = apellidos.map(function(ap) {
    var doc = DOCTORES.filter(function(d) { return d.apellido === ap; })[0];
    var pct = INCIDENCIA_FONDO_PCT[ap];
    var monto = Math.round(total * pct);
    var acum = acumulado[ap] || 0;
    var falta = monto - acum;
    var cuota = Math.round(falta / 3);
    return '<tr><td>' + (doc ? doc.nombre : ap) + '</td>'
      + '<td>' + (Math.round(pct * 10000) / 100).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%</td>'
      + '<td>' + fmt(acum) + '</td>'
      + '<td style="color:#b13a2c">' + fmt(falta) + '</td>'
      + '<td style="color:#b13a2c">' + fmt(cuota) + '</td>'
      + '<td style="color:#b13a2c">' + fmt(cuota) + '</td>'
      + '<td style="color:#b13a2c">' + fmt(cuota) + '</td>'
      + '<td style="font-weight:700">' + fmt(monto)
      +   ' <button type="button" title="Copiar importe" onclick="copiarTexto(\'' + numParaPegar(monto) + '\', this)" style="border:none;background:rgba(32,36,31,.06);border-radius:4px;cursor:pointer;font-size:.68rem;padding:1px 4px;vertical-align:middle">📋</button>'
      + '</td>'
      + '</tr>';
  }).join("");
  var totalCalc = apellidos.reduce(function(s, ap) { return s + Math.round(total * INCIDENCIA_FONDO_PCT[ap]); }, 0);
  var totalAcum = apellidos.reduce(function(s, ap) { return s + (acumulado[ap] || 0); }, 0);
  window._incidenciaTexto = apellidos.map(function(ap) {
    var doc = DOCTORES.filter(function(d) { return d.apellido === ap; })[0];
    return (doc ? doc.nombre : ap) + '\t' + numParaPegar(Math.round(total * INCIDENCIA_FONDO_PCT[ap]));
  }).join('\n');
  var totalCuota = Math.round((totalCalc - totalAcum) / 3);
  return '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>'
    + '<th>Profesional</th><th>% de incidencia</th><th>Acumulado</th><th>Falta</th><th>Nov</th><th>Dic</th><th>Ene</th><th>Importe a pagar</th>'
    + '</tr></thead><tbody>' + filas
    + '<tr class="adm-totals"><td>TOTAL</td><td>100,00%</td><td>' + fmt(totalAcum) + '</td><td style="color:#b13a2c">' + fmt(totalCalc - totalAcum) + '</td><td style="color:#b13a2c">' + fmt(totalCuota) + '</td><td style="color:#b13a2c">' + fmt(totalCuota) + '</td><td style="color:#b13a2c">' + fmt(totalCuota) + '</td><td>' + fmt(totalCalc) + '</td></tr>'
    + '</tbody></table></div>';
}

function incidenciaFondoRecalcular() {
  var input = document.getElementById("incidencia-total-input");
  var raw = input ? input.value.trim() : "";
  var total = raw ? (parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0) : 0;
  var wrap = document.getElementById("incidencia-fondo-wrap");
  if (wrap) wrap.innerHTML = incidenciaFondoWrapHtml(total);
  incidenciaTotalGuardar(total);
}

function renderIncidenciaFondo() {
  var wrap = document.getElementById("incidencia-fondo-wrap");
  if (wrap) wrap.innerHTML = incidenciaFondoWrapHtml(incidenciaTotalCargar());
}

function incidenciaFondoHtml() {
  var total = incidenciaTotalCargar();
  return '<div class="adm-sec-title" style="margin-top:20px">Reparto del fondo — importe final por profesional</div>'
    + '<div style="font-size:.68rem;color:rgba(32,36,31,.45);padding:0 2px 8px 2px">% de incidencia fija de cada socio (no cambia con el % de Retención Ganancias de arriba) — solo el total es editable, los importes se acomodan solos. Las columnas Nov · Dic · Ene son la Falta dividida en 3 cuotas iguales (Falta ÷ 3), a pagar de noviembre 2026 a enero 2027.</div>'
    + '<div style="margin-bottom:10px;display:flex;align-items:center;gap:8px">'
    +   '<label for="incidencia-total-input" style="font-size:0.82rem;font-weight:600;color:#20241f">Total a repartir</label>'
    +   '<input type="text" id="incidencia-total-input" value="' + (total || "") + '" '
    +     'placeholder="$ importe total" oninput="incidenciaFondoRecalcular()" '
    +     'style="width:200px;padding:7px 8px;border:1px solid rgba(32,36,31,.2);border-radius:6px;font-family:inherit;font-size:.85rem;text-align:right">'
    + '</div>'
    + '<div id="incidencia-fondo-wrap">' + incidenciaFondoWrapHtml(total) + '</div>';
}

