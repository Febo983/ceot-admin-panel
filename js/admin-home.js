// ═══════════════════════════════════════════════════════════════════
// admin-home.js — extraído de index.html.
// Home de accesos del admin + fondo animado retro + checklist mensual
// + pendientes admin. Solo definiciones (se carga antes del principal).
// ═══════════════════════════════════════════════════════════════════

// ══════ ADMIN HOME ═══════════════════════════════════════════════

var homeSearchQ = "";
var homeSearchCat = "Todos";
var USAGE_COUNT = {};

// ── Las categorías del panel ──────────────────────────────────────
// Una sola taxonomía para módulos Y accesos. Antes convivían tres: el `cat`
// de cada módulo (que solo pintaba el color del mosaico), los grupos
// Honorarios/Gestión de la home, y el `cat` de los accesos — que era el único
// que filtraba, así que tocar "Finanzas" escondía los 7 módulos financieros.
// Las cinco de aca valen para todo: agrupan, filtran y dan el color.
// "El mes" es el circuito del checklist (01-10, 10-20, 20-30). Transferencias,
// Débitos y Facturas caen en los tres tramos, por eso la categoría es el mes
// entero y no un tramo.
var ADM_HOME_CATS = [
  { k:"mes",     t:"El mes",        c:"rgba(29,158,117,0.9)",  tile:"rgba(29,158,117,0.22)" },
  { k:"gente",   t:"Personal",        c:"rgba(127,119,221,0.9)", tile:"rgba(127,119,221,0.22)" },
  { k:"casa",    t:"Casa y gastos", c:"rgba(216,90,48,0.9)",   tile:"rgba(216,90,48,0.22)" },
  { k:"clinica", t:"Clínica",       c:"rgba(55,138,221,0.9)",  tile:"rgba(55,138,221,0.22)" },
  { k:"sistema", t:"Sistema",       c:"rgba(32,36,31,0.45)",   tile:"rgba(32,36,31,0.1)" }
];
// Lo que no se reconoce cae en Sistema en vez de desaparecer de la home.
function admHomeCat(k) {
  for (var i = 0; i < ADM_HOME_CATS.length; i++) if (ADM_HOME_CATS[i].k === k) return ADM_HOME_CATS[i];
  return ADM_HOME_CATS[ADM_HOME_CATS.length - 1];
}
function admHomeCatColor(k) { return admHomeCat(k).tile; }

// ── Sub-pestañas ──────────────────────────────────────────────────
// Los módulos del mismo tema comparten una tira arriba del contenido en vez de
// un mosaico cada uno en la home. Cada uno conserva su propia función de
// render y su botón del menú lateral: lo que se unifica es cómo se llega.
// La tira vive en #adm-subtabs, fuera de #adm-content, así no se la lleva
// puesta el innerHTML de cada módulo; admDesactivarSidebar la limpia y los
// módulos del grupo la vuelven a poner.
var ADM_SUBTABS = {
  liquidaciones: [
    { k:"liquidaciones", lbl:"Del mes",    fn:"renderAdminPanelPage(tabMesActual())" },
    { k:"cpsm",          lbl:"CPSM",       fn:"renderCpsm()" },
    { k:"totalceot",     lbl:"Total CEOT", fn:"renderTotalCeot()" },
    { k:"redsom",        lbl:"REDSOM",     fn:"renderSeguimientoRedsom()" }
  ],
  licencias: [
    { k:"licenciashon", lbl:"Honorarios",   fn:"renderLicenciasHon()" },
    { k:"licencias",    lbl:"Del personal", fn:"renderLicencias()" }
  ]
};
function admSubtabs(grupo, activa) {
  var el = document.getElementById("adm-subtabs");
  if (!el) return;
  el.innerHTML = '<div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:12px 16px 0">'
    + (ADM_SUBTABS[grupo] || []).map(function(s) {
        var on = s.k === activa;
        return '<span onclick="' + s.fn + '" style="flex-shrink:0;cursor:pointer;font-size:0.72rem;padding:5px 13px;border-radius:20px;white-space:nowrap;font-weight:700;border:1px solid '
          + (on ? '#1f3a2e;background:#1f3a2e;color:#fff' : 'rgba(32,36,31,.15);background:rgba(32,36,31,.04);color:rgba(32,36,31,.55)')
          + '">' + s.lbl + '</span>';
      }).join("")
    + '</div>';
}
function admSubtabsLimpiar() {
  var el = document.getElementById("adm-subtabs");
  if (el) el.innerHTML = "";
}
function admHomeCatLabel(k) { return k === "Todos" ? "Todos" : admHomeCat(k).t; }
// Los módulos con home:false no tienen mosaico propio: se llega a ellos por el
// menú lateral o por la tira de sub-pestañas del módulo con el que comparten
// tema (ver ADM_SUBTABS). Siguen en ADM_HOME_MODULOS para que el renombrado y
// la búsqueda los sigan encontrando: admHomeRenderResults filtra sobre la lista
// completa, no sobre admHomeModulosEnHome().
function admHomeModulosEnHome() {
  return ADM_HOME_MODULOS.filter(function(m) { return m.home !== false; });
}

var ADM_HOME_MODULOS = [
  { key:"liquidaciones",    ico:"bar-chart-3",     lbl:"Liquidaciones", cat:"mes", fn:"renderAdminPanelPage(tabMesActual())" },
  { key:"sueldodirector",   ico:"banknote",        lbl:"Transferencias del Mes", cat:"mes", fn:"abrirSueldoDirectorMesActual()" },
  // Antes eran secciones plegables dentro de "Transferencias del Mes" (ver SD_VISTAS en index.html).
  { key:"gastosa",          ico:"file-text",       lbl:"Gastos A",      cat:"mes", fn:"abrirSdVista('gastosa')" },
  { key:"inv",              ico:"piggy-bank",      lbl:"Inversiones",   cat:"mes", fn:"abrirSdVista('inv')" },
  { key:"prestamoscasa",    ico:"building-2",      lbl:"Préstamos Casa", cat:"casa", fn:"abrirSdVista('prestamos')" },
  { key:"fondoceot",        ico:"landmark",        lbl:"Fondo CEOT",    cat:"mes", fn:"abrirSdVista('fondoceot')" },
  { key:"gastoequipo",      ico:"settings",        lbl:"Gasto de Equipos", cat:"clinica", fn:"abrirSdVista('gastoequipo')" },
  { key:"aporteceot",       ico:"percent",         lbl:"Retención Ganancias",   cat:"mes", fn:"renderAporteCeot()" },
  { key:"cpsm",             ico:"landmark",        lbl:"CPSM",          cat:"mes", home:false, fn:"renderCpsm()" },
  { key:"redsom",           ico:"stethoscope",     lbl:"Seguimiento REDSOM", cat:"mes", home:false, fn:"renderSeguimientoRedsom()" },
  { key:"debitos",          ico:"alert-triangle",  lbl:"Débitos",       cat:"mes", fn:"renderDebitos()" },
  { key:"facturas",         ico:"receipt",         lbl:"Facturas",      cat:"mes", fn:"renderFacturas()" },
  { key:"presentacion",     ico:"presentation",    lbl:"Presentación",  cat:"mes", fn:"renderPresentacion()" },
  { key:"sueldob",          ico:"briefcase",       lbl:"Sueldo B",      cat:"gente", fn:"renderSueldoB()" },
  { key:"premios",          ico:"award",           lbl:"Premios",       cat:"gente", fn:"renderPremios()" },
  { key:"licenciashon",     ico:"plane-takeoff",   lbl:"Licencias (Honorarios)", cat:"gente", fn:"renderLicenciasHon()" },
  { key:"licencias",        ico:"calendar-heart",  lbl:"Licencias",     cat:"gente", home:false, fn:"renderLicencias()" },
  { key:"gastoscasa",       ico:"home",            lbl:"Gastos Casa",   cat:"casa", fn:"renderGastosCasa()" },
  { key:"gastospagos",      ico:"wallet",          lbl:"Gastos y Pagos",cat:"casa", fn:"renderGastosPagos()" },
  { key:"estadisticas",     ico:"line-chart",      lbl:"Estadísticas CEOT", cat:"clinica", fn:"renderEstadisticasCeot()" },
  { key:"totalceot",        ico:"trending-up",     lbl:"Total CEOT",    cat:"sistema", home:false, fn:"renderTotalCeot()" },
  { key:"faqasistente",     ico:"bot",             lbl:"FAQ del asistente", cat:"sistema", home:false, fn:"renderFaqAsistente()" },
  { key:"correos",          ico:"mail",            lbl:"Correos",       cat:"sistema", home:false, fn:"renderCorreos()" },
];

var LUCIDE_ACC_ICON = {
  "Liquidaciones Clínica":"file-spreadsheet","Liquidaciones CEM":"file-spreadsheet","Gastos y Sueldos":"wallet",
  "Caja Gerling":"piggy-bank","Liquidaciones Detalles":"file-text","Valores Convenios":"file-check",
  "Normas Convenios OOSS":"book-text",
  "Liquidaciones 2026":"bar-chart-3","CC Clínica Colón":"building-2","CC CEM MDP":"building-2",
  "Programación CX (Sheet)":"calendar-days","Estadísticas CX":"line-chart","Órdenes CX":"clipboard-list",
  "Fichas CX":"folder","Programación CX v2":"calendar-days","Evoluciones":"edit-3",
  "Cirugías Programadas":"calendar-clock","Estadísticas CX 2026":"bar-chart-3","Historial CX":"history",
  "Estadísticas CX 26 v2":"line-chart","Portal Profesionales":"stethoscope","Panel Mensajes WA":"message-circle",
  "Admin Liquidaciones":"settings","Admin Panel CEOT":"settings-2","Agendas CEOT":"calendar",
  "Permisos ART":"shield-check","Panel Adm. Marce":"user-cog","Horarios y Asistencias":"clock",
  "Documentación CEOT":"folder-open","Archivos Reuniones":"file-text","Encuesta Secretarias":"star",
  "Encuesta Satisfacción":"smile","Caja de Médicos":"landmark","Banco Francés CEOT":"landmark",
  "WhatsApp Web":"message-circle","Mi Google Calendar":"calendar-days"
};

var homeEditMode = false;
var modHomeEditingKey = null;
var MOD_LABELS_CUSTOM = {};
var admHomeTheme = "clasico";

function admHomeCargarModLabels() {
  try {
    var raw = localStorage.getItem("ceot_home_mod_labels");
    MOD_LABELS_CUSTOM = raw ? (JSON.parse(raw) || {}) : {};
  } catch (e) { MOD_LABELS_CUSTOM = {}; }
  syncPull("ceot_home_mod_labels", function() {
    admHomeCargarModLabels();
    admHomeRenderResults();
  });
}

function admHomeCargarUsage() {
  try {
    var raw = localStorage.getItem("ceot_usage_count");
    USAGE_COUNT = raw ? (JSON.parse(raw) || {}) : {};
  } catch (e) { USAGE_COUNT = {}; }
  syncPull("ceot_usage_count", function() {
    admHomeCargarUsage();
    admHomeRenderResults();
  });
}

// ── Fijados ─────────────────────────────────────────────────────────
// "Lo que más usás" sale solo del contador de aperturas, así que un módulo
// nuevo (o uno que se abre poco pero importa) queda detrás de "Ver todo".
// Con la estrella del modo edición se lo fija arriba a mano: los fijados van
// primero y el resto de la franja se completa por uso. Se guarda como
// { "mod:clave": 1, "acc:id": 1 } y se sincroniza igual que los nombres.
var HOME_FIJADOS = {};
function admHomeCargarFijados() {
  try {
    var raw = localStorage.getItem("ceot_home_fijados");
    HOME_FIJADOS = raw ? (JSON.parse(raw) || {}) : {};
  } catch (e) { HOME_FIJADOS = {}; }
  syncPull("ceot_home_fijados", function() {
    try { HOME_FIJADOS = JSON.parse(localStorage.getItem("ceot_home_fijados") || "{}") || {}; } catch (e) {}
    admHomeRenderResults();
  });
}
function admHomeEsFijado(key) { return !!HOME_FIJADOS[key]; }
function admHomeToggleFijado(key) {
  if (HOME_FIJADOS[key]) delete HOME_FIJADOS[key]; else HOME_FIJADOS[key] = 1;
  try { localStorage.setItem("ceot_home_fijados", JSON.stringify(HOME_FIJADOS)); } catch (e) {}
  syncPush("ceot_home_fijados");
  admHomeRenderResults();
}

function admHomeRegistrarUso(key) {
  try {
    USAGE_COUNT[key] = (USAGE_COUNT[key] || 0) + 1;
    localStorage.setItem("ceot_usage_count", JSON.stringify(USAGE_COUNT));
    syncPush("ceot_usage_count");
  } catch (e) {}
}

// Orden estable, más usado primero; sin uso registrado mantiene el orden original.
function admHomeOrdenarPorUso(lista, keyFn) {
  return lista.map(function(item, i) { return { item: item, i: i }; })
    .sort(function(a, b) {
      var ua = USAGE_COUNT[keyFn(a.item)] || 0;
      var ub = USAGE_COUNT[keyFn(b.item)] || 0;
      if (ub !== ua) return ub - ua;
      return a.i - b.i;
    })
    .map(function(x) { return x.item; });
}

// La vista clásica quedó retirada (Marcelo solo usa la retro). Se fuerza retro
// siempre; el código de la rama clásica sigue en el archivo pero es inalcanzable.
function admHomeCargarTema() {
  admHomeTheme = "retro";
  try { localStorage.setItem("ceot_home_theme", "retro"); } catch (e) {}
}

function admHomeToggleTema() {
  admHomeTheme = "retro";
  renderAdmHome();
}

function admHomeModLabel(m) {
  return MOD_LABELS_CUSTOM[m.key] || m.lbl;
}

function admHomeToggleEdit() {
  homeEditMode = !homeEditMode;
  var btn = document.getElementById("admHomeEditBtn");
  if (btn) {
    btn.style.background = homeEditMode ? "#dc2626" : "rgba(32,36,31,.06)";
    btn.style.borderColor = homeEditMode ? "#dc2626" : "rgba(32,36,31,.12)";
    btn.style.color = homeEditMode ? "#fff" : "rgba(32,36,31,.6)";
    btn.innerHTML = homeEditMode ? "✕ Listo" : "✏ Editar nombres";
  }
  admHomeRenderResults();
}

function admHomeTile(ico, lbl, colorRgba, opts) {
  opts = opts || {};
  var editing = homeEditMode && opts.editFn;
  var tag = (opts.href && !editing) ? "a" : "div";
  var track = (!editing && opts.usageKey) ? "admHomeRegistrarUso('" + opts.usageKey + "');" : "";
  var attrs;
  if (editing) attrs = ' onclick="' + opts.editFn + '"';
  else if (opts.href) attrs = ' href="' + opts.href + '" target="_blank" onclick="' + track + '"';
  else if (opts.fn) attrs = ' onclick="' + track + opts.fn + '"';
  else attrs = "";
  var cursor = (opts.href || opts.fn || editing) ? "pointer" : "default";
  var retro = admHomeTheme === "retro";

  if (!retro) {
    var del = (editing && opts.delFn)
      ? '<span onclick="event.stopPropagation();' + opts.delFn + '" title="Eliminar" style="position:absolute;top:6px;right:6px;width:18px;height:18px;border-radius:5px;background:rgba(177,72,63,.12);color:var(--co-margin,#b1483f);font-size:10px;line-height:18px;text-align:center;cursor:pointer;flex-shrink:0">✕</span>'
      : "";
    var pencil = editing ? '<i data-lucide="pencil" style="position:absolute;top:7px;right:' + (opts.delFn ? '28px' : '7px') + ';width:12px;height:12px;color:var(--co-gold,#c9933a);flex-shrink:0" stroke-width="2"></i>' : "";
    return "<" + tag + attrs + " class=\"adm-home-tile\" style=\"position:relative;text-decoration:none;display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:11px;min-height:64px;background:var(--co-card,#fbf8f0);border:1px solid var(--co-line,#d9d0b8);border-radius:10px;cursor:" + cursor + "\">"
      + pencil + del
      + '<span style="width:26px;height:26px;border-radius:7px;background:' + colorRgba + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--co-accent,#1f3a2e)"><i data-lucide="' + ico + '" style="width:13px;height:13px" stroke-width="1.75"></i></span>'
      + '<span style="font-size:0.76rem;font-weight:600;color:var(--co-ink,#20241f);line-height:1.25">' + lbl + '</span>'
      + "</" + tag + ">";
  }

  // Mosaico retro: bloque compacto y horizontal (ícono a la izquierda, nombre
  // al lado). El contenedor es flex-wrap y cada bloque crece (flex:1 1 178px),
  // así cada fila se llena entera y no queda ninguno suelto ni huecos al final.
  var boxBg      = "#fffaf1";
  var boxBgHover = "#ffffff";
  var border      = editing ? "2px dashed #b8447a" : "2px solid #0f1c28";
  var labelStyle = "flex:1;min-width:0;font-size:12.5px;color:#1c2b3a;text-align:left;font-weight:700;line-height:1.25;overflow-wrap:break-word";

  var del = (editing && opts.delFn)
    ? '<div onclick="event.stopPropagation();' + opts.delFn + '" title="Eliminar" style="position:absolute;top:3px;right:3px;width:16px;height:16px;border-radius:4px;background:rgba(220,38,38,.85);color:#fff;font-size:9px;line-height:16px;text-align:center;cursor:pointer">✕</div>'
    : "";
  var pencil = editing ? '<div style="position:absolute;top:2px;left:4px;font-size:9px;opacity:.6">✏</div>' : "";
  // Estrella: en modo edición es el botón para fijar/soltar; fuera de él, una
  // marca chica en los que están fijados.
  var fijado = opts.usageKey && admHomeEsFijado(opts.usageKey);
  var estrella = "";
  if (editing && opts.usageKey) {
    estrella = '<div onclick="event.stopPropagation();event.preventDefault();admHomeToggleFijado(\'' + opts.usageKey + '\')" title="' + (fijado ? 'Soltar de arriba' : 'Fijar arriba') + '" style="flex-shrink:0;width:26px;height:26px;border-radius:8px;border:2px solid #0f1c28;background:' + (fijado ? '#f5c542' : '#fffaf1') + ';color:#0f1c28;font-size:14px;line-height:22px;text-align:center;cursor:pointer;margin-right:' + (opts.delFn ? '14px' : '0') + '">' + (fijado ? '★' : '☆') + '</div>';
  } else if (fijado) {
    estrella = '<span aria-label="Fijado" title="Fijado arriba" style="flex-shrink:0;font-size:12px;color:#c9933a">★</span>';
  }
  var afuera = (opts.href && !editing) ? '<span aria-hidden="true" style="flex-shrink:0;font-size:12px;font-weight:700;color:rgba(28,43,58,.4)">↗</span>' : "";
  return "<" + tag + attrs + " class=\"adm-home-tile-retro\" style=\"position:relative;flex:1 1 178px;min-width:0;text-decoration:none;background:" + boxBg + ";border:" + border + ";border-radius:12px;box-shadow:0 3px 0 #0f1c28;padding:8px 10px;min-height:54px;box-sizing:border-box;display:flex;align-items:center;gap:10px;cursor:" + cursor + "\" onmouseover=\"this.style.background='" + boxBgHover + "'\" onmouseout=\"this.style.background='" + boxBg + "'\">"
    + pencil + del
    + '<div style="flex-shrink:0;width:36px;height:36px;border-radius:9px;background:' + colorRgba + ';border:2px solid #0f1c28;display:flex;align-items:center;justify-content:center"><i data-lucide="' + ico + '" style="width:18px;height:18px;color:#1c2b3a" stroke-width="1.9"></i></div>'
    + '<div style="' + labelStyle + '">' + lbl + '</div>'
    + estrella
    + afuera
    + "</" + tag + ">";
}

function admHomeEditarModulo(key) {
  var m = ADM_HOME_MODULOS.find(function(x){ return x.key === key; });
  if (!m) return;
  modHomeEditingKey = key;
  document.getElementById("modHomeFormNombre").value = admHomeModLabel(m);
  document.getElementById("modHomeModalBg").classList.add("open");
}

function admHomeCerrarModModal() {
  document.getElementById("modHomeModalBg").classList.remove("open");
  modHomeEditingKey = null;
}

function admHomeGuardarModulo() {
  var val = document.getElementById("modHomeFormNombre").value.trim();
  if (!val) { alert("El nombre no puede estar vacío."); return; }
  if (modHomeEditingKey) {
    MOD_LABELS_CUSTOM[modHomeEditingKey] = val;
    localStorage.setItem("ceot_home_mod_labels", JSON.stringify(MOD_LABELS_CUSTOM));
    syncPush("ceot_home_mod_labels");
  }
  admHomeCerrarModModal();
  admHomeRenderResults();
}

function admHomeRestablecerModulo() {
  if (modHomeEditingKey) {
    delete MOD_LABELS_CUSTOM[modHomeEditingKey];
    localStorage.setItem("ceot_home_mod_labels", JSON.stringify(MOD_LABELS_CUSTOM));
    syncPush("ceot_home_mod_labels");
  }
  admHomeCerrarModModal();
  admHomeRenderResults();
}

function admHomeEditarAcceso(id) {
  var item = ACCESOS_DATA.find(function(a){ return a.id === id; });
  if (!item) return;
  accModalOrigin = "home";
  accAbrirModal(item);
}

function admHomeNuevoAcceso(catDefault) {
  accModalOrigin = "home";
  accAbrirModal(null);
  var sel = document.getElementById("accFormCat");
  if (sel && catDefault) sel.value = catDefault;
}

function admHomeEliminarAcceso(id) {
  if (!confirm("¿Eliminar este acceso?")) return;
  ACCESOS_DATA = ACCESOS_DATA.filter(function(a){ return a.id !== id; });
  accGuardarTodo();
  admHomeRenderResults();
}

function admHomeBuscar(q) {
  homeSearchQ = q || "";
  admHomeRenderResults();
}

function admHomeSetCat(cat) {
  homeSearchCat = cat;
  admHomeRenderResults();
  var inp = document.getElementById("admHomeSearchInput");
  if (inp) inp.focus();
}

// ── Home: franja fija con lo más usado + el resto plegado ───────────
// La home mostraba los 17 módulos y los 26 accesos juntos (43 tiles). El
// contador de uso real (USAGE_COUNT, sincronizado entre equipos) dice que 2
// módulos concentran más de la mitad de las aperturas, así que arriba va una
// franja con los más usados y lo demás queda detrás de "Ver todo": no se
// esconde nada ni se borra nada, se ordena por lo que Marcelo realmente abre.
var ADM_HOME_DESTACADOS_N = 6;
var homeVerTodo = false;
try { homeVerTodo = localStorage.getItem("ceot_home_ver_todo") === "1"; } catch (e) {}

function admHomeToggleVerTodo() {
  homeVerTodo = !homeVerTodo;
  try { localStorage.setItem("ceot_home_ver_todo", homeVerTodo ? "1" : "0"); } catch (e) {}
  admHomeRenderResults();
}

// Los accesos (links externos) más abiertos. Van en una tira aparte abajo de
// los módulos: con todo plegado quedaban detrás de "Ver todo" aunque el Sheet
// de liquidaciones o Valores Convenios se abran más que varios módulos.
var ADM_HOME_ATAJOS_N = 5;
function admHomeAtajos() {
  var fijos = ACCESOS_DATA.filter(function(a) { return admHomeEsFijado("acc:" + a.id); });
  var conUso = ACCESOS_DATA.filter(function(a) { return (USAGE_COUNT["acc:" + a.id] || 0) > 0 && !admHomeEsFijado("acc:" + a.id); });
  var porUso = (conUso.length + fijos.length) <= ADM_HOME_ATAJOS_N ? []
    : admHomeOrdenarPorUso(conUso, function(a) { return "acc:" + a.id; }).slice(0, Math.max(0, ADM_HOME_ATAJOS_N - fijos.length));
  return fijos.concat(porUso);
}

// Los N módulos con más aperturas reales. Devuelve [] —y la home queda como
// estaba, con todos los grupos a la vista— mientras no haya uso suficiente
// registrado: navegador nuevo, contador todavía sin llegar del Sheet, o tan
// pocos módulos usados que separarlos no ordenaría nada.
function admHomeDestacados() {
  // Los fijados van siempre, primero y aunque no tengan uso (pueden ser
  // home:false). El resto de la franja se completa por uso, como antes.
  var fijos = ADM_HOME_MODULOS.filter(function(m) { return admHomeEsFijado("mod:" + m.key); });
  var conUso = admHomeModulosEnHome().filter(function(m) { return (USAGE_COUNT["mod:" + m.key] || 0) > 0 && !admHomeEsFijado("mod:" + m.key); });
  var porUso = (conUso.length + fijos.length) <= ADM_HOME_DESTACADOS_N ? []
    : admHomeOrdenarPorUso(conUso, function(m) { return "mod:" + m.key; }).slice(0, Math.max(0, ADM_HOME_DESTACADOS_N - fijos.length));
  return fijos.concat(porUso);
}

function admHomeRenderResults() {
  var root = document.getElementById("admHomeDynamic");
  if (!root) return;
  var q = homeSearchQ.trim().toLowerCase();

  var retroChips = admHomeTheme === "retro";
  var tileWrap = retroChips
    ? "display:flex;flex-wrap:wrap;gap:10px 9px"
    : "display:grid;grid-template-columns:repeat(auto-fill,minmax(126px,1fr));gap:8px";
  var cats = ["Todos"].concat(ADM_HOME_CATS.map(function(x) { return x.k; }));
  var chips = cats.map(function(c) {
    var on = homeSearchCat === c;
    var onBg     = retroChips ? '#ef6fa2' : '#1f3a2e';
    var onText   = retroChips ? '#1c2b3a' : '#fff';
    var onBorder = retroChips ? '2px solid #0f1c28' : ('1px solid ' + onBg);
    var offBg     = retroChips ? '#fffaf1' : 'rgba(32,36,31,.04)';
    var offText   = retroChips ? 'rgba(28,43,58,.6)' : 'rgba(32,36,31,.55)';
    var offBorder = retroChips ? '2px solid #0f1c28' : '1px solid rgba(32,36,31,.15)';
    return '<span onclick="admHomeSetCat(\'' + c + '\')" style="flex-shrink:0;cursor:pointer;font-size:0.74rem;padding:' + (retroChips ? '7px 13px' : '5px 12px') + ';border-radius:20px;border:' + (on ? onBorder : offBorder) + ';background:' + (on ? onBg : offBg) + ';color:' + (on ? onText : offText) + ';font-weight:700;white-space:nowrap">' + admHomeCatLabel(c) + '</span>';
  }).join("");

  // Buscar y filtrar por categoría miran TODOS los módulos, también los
  // home:false: lo que no tiene mosaico propio igual tiene que aparecer cuando
  // se lo escribe. Antes "redsom", "cpsm" o "correos" no daban resultados y el
  // único camino era acordarse del menú lateral. La franja de destacados sigue
  // saliendo de admHomeModulosEnHome(), así un home:false no se gana un mosaico
  // en la home por mucho que se lo busque.
  var modMatch = admHomeOrdenarPorUso(ADM_HOME_MODULOS.filter(function(m) {
    return (homeSearchCat === "Todos" || homeSearchCat === m.cat) && (!q || admHomeModLabel(m).toLowerCase().indexOf(q) !== -1);
  }), function(m) { return "mod:" + m.key; });
  var accMatch = admHomeOrdenarPorUso(ACCESOS_DATA.filter(function(a) {
    return (homeSearchCat === "Todos" || homeSearchCat === admHomeCat(a.cat).k) && (!q || a.title.toLowerCase().indexOf(q) !== -1 || (a.desc || "").toLowerCase().indexOf(q) !== -1);
  }), function(a) { return "acc:" + a.id; });

  var flatMode = !!q || homeSearchCat !== "Todos";
  // En la home retro los filtros comparten fila con el buscador: van a
  // #admHomeChips (lo arma renderAdmHome) y envuelven en vez de scrollear.
  var chipsSlot = document.getElementById("admHomeChips");
  var html = "";
  if (chipsSlot) chipsSlot.innerHTML = chips;
  else html = '<div class="adm-sf-wrap" id="admCatChipsWrap" style="margin-bottom:12px"><div id="admCatChipsScroll" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none">' + chips + '</div></div>';

  if (homeEditMode) {
    html += '<div style="font-size:0.68rem;color:rgba(31,58,46,.85);margin-bottom:12px;padding:8px 10px;background:rgba(31,58,46,.08);border:1px solid rgba(31,58,46,.25);border-radius:8px">✏ Modo edición: tocá cualquier bloque para renombrarlo' + (flatMode ? '' : ' o eliminarlo') + '. Con la ☆ lo fijás arriba, en "Lo que más usás".</div>';
  }

  if (flatMode) {
    var total = modMatch.length + accMatch.length;
    html += '<div style="font-size:0.68rem;color:rgba(31,58,46,.8);margin-bottom:10px">'
      + (q ? (total + ' resultado' + (total === 1 ? '' : 's') + ' para "' + homeSearchQ.trim() + '"') : (total + ' resultado' + (total === 1 ? '' : 's')))
      + '</div>';
    if (!total) {
      html += '<div style="padding:26px 10px;text-align:center;color:rgba(32,36,31,.3);font-size:0.8rem">Sin resultados.</div>';
    } else {
      var tiles = modMatch.map(function(m) {
        return admHomeTile(m.ico, admHomeModLabel(m), admHomeCatColor(m.cat), { fn: m.fn, editFn: "admHomeEditarModulo('" + m.key + "')", usageKey: "mod:" + m.key });
      }).concat(accMatch.map(function(a) {
        var ico = LUCIDE_ACC_ICON[a.title] || "link";
        var nav = a.fn ? { fn: a.fn } : { href: a.url };
        return admHomeTile(ico, a.title, admHomeCatColor(a.cat), Object.assign(nav, { editFn: "admHomeEditarAcceso(" + a.id + ")", delFn: "admHomeEliminarAcceso(" + a.id + ")", usageKey: "acc:" + a.id }));
      }));
      html += '<div style="' + tileWrap + ';margin-bottom:6px">' + tiles.join("") + '</div>';
    }
  } else {
    // Franja fija de arriba: los módulos más abiertos, sin encabezado de grupo
    // ni nada alrededor. En modo edición no se arma (hay que poder renombrar y
    // borrar todo desde su grupo, sin tiles duplicados).
    var destacados = homeEditMode ? [] : admHomeDestacados();
    var destKeys = destacados.map(function(m) { return m.key; });
    if (destacados.length) {
      html += '<div style="display:flex;align-items:center;gap:7px;margin:0 0 7px">'
        + '<span style="width:9px;height:9px;border-radius:3px;background:#ef6fa2;border:2px solid #0f1c28;flex-shrink:0"></span>'
        + '<span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(32,36,31,.42)">Lo que más usás</span>'
        + '</div>';
      html += '<div style="' + tileWrap + ';margin-bottom:16px">'
        + destacados.map(function(m) { return admHomeTile(m.ico, admHomeModLabel(m), admHomeCatColor(m.cat), { fn: m.fn, editFn: "admHomeEditarModulo('" + m.key + "')", usageKey: "mod:" + m.key }); }).join("")
        + '</div>';
    }

    var hayAccFijos = ACCESOS_DATA.some(function(a) { return admHomeEsFijado("acc:" + a.id); });
    var atajos = (homeEditMode || (!destacados.length && !hayAccFijos)) ? [] : admHomeAtajos();
    var atajoIds = atajos.map(function(a) { return a.id; });
    if (atajos.length) {
      html += '<div style="display:flex;align-items:center;gap:7px;margin:0 0 7px">'
        + '<span style="width:9px;height:9px;border-radius:3px;background:rgba(55,138,221,0.9);border:2px solid #0f1c28;flex-shrink:0"></span>'
        + '<span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(32,36,31,.42)">Atajos</span>'
        + '</div>';
      html += '<div style="' + tileWrap + ';margin-bottom:16px">'
        + atajos.map(function(a) {
            var ico = LUCIDE_ACC_ICON[a.title] || "link";
            var nav = a.fn ? { fn: a.fn } : { href: a.url };
            return admHomeTile(ico, a.title, admHomeCatColor(a.cat), Object.assign(nav, { editFn: "admHomeEditarAcceso(" + a.id + ")", delFn: "admHomeEliminarAcceso(" + a.id + ")", usageKey: "acc:" + a.id }));
          }).join("")
        + '</div>';
    }

    // Todo lo demás (el resto de los módulos y los accesos) se arma igual que
    // siempre, pero en su propia variable para poder plegarlo entero.
    var resto = "";
    // Una sola pasada por las categorías: cada una trae primero sus módulos y
    // después sus accesos. Antes eran dos listas separadas — los módulos por
    // grupo (Honorarios/Gestión) y más abajo los accesos por su propio cat —
    // así que lo del mismo tema quedaba en dos lugares distintos de la home.
    ADM_HOME_CATS.forEach(function(g) {
      var mods = admHomeOrdenarPorUso(admHomeModulosEnHome().filter(function(m) { return m.cat === g.k && destKeys.indexOf(m.key) === -1; }), function(m) { return "mod:" + m.key; });
      var accs = admHomeOrdenarPorUso(ACCESOS_DATA.filter(function(a) { return admHomeCat(a.cat).k === g.k && atajoIds.indexOf(a.id) === -1; }), function(a) { return "acc:" + a.id; });
      if (!mods.length && !accs.length && !homeEditMode) return;
      var tiles = mods.map(function(m) {
        return admHomeTile(m.ico, admHomeModLabel(m), admHomeCatColor(m.cat), { fn: m.fn, editFn: "admHomeEditarModulo('" + m.key + "')", usageKey: "mod:" + m.key });
      }).concat(accs.map(function(a) {
        var ico = LUCIDE_ACC_ICON[a.title] || "link";
        var nav = a.fn ? { fn: a.fn } : { href: a.url };
        return admHomeTile(ico, a.title, admHomeCatColor(a.cat), Object.assign(nav, { editFn: "admHomeEditarAcceso(" + a.id + ")", delFn: "admHomeEliminarAcceso(" + a.id + ")", usageKey: "acc:" + a.id }));
      }));
      if (homeEditMode) {
        tiles.push('<div onclick="admHomeNuevoAcceso(\'' + g.k + '\')" style="flex:1 1 178px;cursor:pointer;background:rgba(32,36,31,0.03);border:1px dashed rgba(32,36,31,.3);border-radius:10px;padding:12px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:8px;min-height:64px">'
          + '<i data-lucide="plus" style="width:18px;height:18px;color:rgba(31,58,46,.8)" stroke-width="1.75"></i>'
          + '<div style="font-size:11px;color:rgba(31,58,46,.8);font-weight:500">Nuevo</div>'
          + '</div>');
      }
      resto += '<div style="display:flex;align-items:center;gap:7px;margin:0 0 7px">'
        + '<span style="width:9px;height:9px;border-radius:3px;background:' + g.c + ';border:2px solid #0f1c28;flex-shrink:0"></span>'
        + '<span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(32,36,31,.42)">' + g.t + ' <span style="color:rgba(32,36,31,.2);font-weight:500">· ' + (mods.length + accs.length) + '</span></span>'
        + '</div>';
      resto += '<div style="' + tileWrap + ';margin-bottom:16px;border-left:3px solid ' + g.c + ';padding-left:10px">' + tiles.join("") + '</div>';
    });

    // El resto va plegado mientras haya franja de destacados: un botón en vez
    // de 37 tiles más abajo. El estado es por navegador (localStorage), no se
    // sincroniza — es una preferencia de pantalla, no un dato del panel.
    var hayFranja = destacados.length || atajos.length;
    if (!hayFranja || homeVerTodo) {
      html += resto;
      if (hayFranja) {
        html += '<div onclick="admHomeToggleVerTodo()" style="cursor:pointer;text-align:center;font-size:0.68rem;font-weight:700;color:rgba(32,36,31,.45);padding:9px;margin-bottom:6px">Ver menos ▲</div>';
      }
    } else {
      var ocultos = (admHomeModulosEnHome().length - destacados.length) + (ACCESOS_DATA.length - atajos.length);
      html += '<div onclick="admHomeToggleVerTodo()" style="cursor:pointer;background:#fffaf1;border:2px solid #0f1c28;border-radius:12px;box-shadow:0 3px 0 #0f1c28;padding:10px;text-align:center;font-size:0.76rem;font-weight:700;color:#1c2b3a;margin-bottom:6px">Ver todo · ' + ocultos + ' más ▼</div>';
    }
  }

  root.innerHTML = html;
  coInitScrollFade("admCatChipsScroll", "admCatChipsWrap");
  if (window.lucide) lucide.createIcons();
}

// La Dra. Garmendia se incorporó en agosto 2026. El cartel de "Socios
// activos" decía "1er mes" fijo y quedó viejo apenas pasó septiembre, así que
// el mes se cuenta desde el alta. Pasado el año deja de ser novedad y el
// renglón no se dibuja (devuelve "").
var GARMENDIA_ALTA = { anio: 2026, mes: 8 };
function admHomeGarmendiaNota() {
  var hoy = new Date();
  var n = (hoy.getFullYear() - GARMENDIA_ALTA.anio) * 12 + (hoy.getMonth() + 1 - GARMENDIA_ALTA.mes) + 1;
  if (n < 1 || n > 12) return "";
  return "Garmendia: " + (n === 1 ? "1er" : n + "º") + " mes";
}

// ── Tablero del mes en la home ──────────────────────────────────────
// El checklist pasa a ser lo primero que se ve: hechas/total, un casillero por
// tarea agrupado en los tres tramos (se prenden como monedas al tildar; en rojo
// las atrasadas) y las próximas pendientes para tildar sin salir de la home.
var ADM_HOME_HUD_PROX = 3;
function admHomeHudEsc(t) {
  return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function admHomeHudRender() {
  var el = document.getElementById("admHomeHud");
  if (!el) return;
  var hoy = new Date(), dia = hoy.getDate();
  var mesNombre = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][hoy.getMonth()];
  var total = CHECKLIST_ITEMS.length;
  var done = CHECKLIST_ITEMS.filter(function(it) { return checklistItemDone(it.id); }).length;
  var vencidos = checklistVencidos().length;

  var tramoActual = null;
  var tramos = Object.keys(CHECKLIST_RANGOS).map(function(rk) {
    var r = CHECKLIST_RANGOS[rk];
    var ahora = tramoActual === null && dia <= r.diaHasta;
    if (ahora) tramoActual = rk;
    var cells = CHECKLIST_ITEMS.filter(function(it) { return it.rango === rk; }).map(function(it) {
      var ok = checklistItemDone(it.id);
      var cls = ok ? " on" : (dia > r.diaHasta ? " late" : "");
      return '<i class="adm-home-hud-c' + cls + '" title="' + admHomeHudEsc(it.texto) + '"></i>';
    }).join("");
    return '<div class="adm-home-hud-tramo' + (ahora ? ' now' : '') + '"><span>' + r.label.replace("Del ", "").replace(" al ", "–") + (ahora ? ' · ahora' : '') + '</span><div class="adm-home-hud-cells">' + cells + '</div></div>';
  }).join("");

  // Todas las pendientes (no solo las 3 primeras), en una lista con scroll.
  var prox = CHECKLIST_ITEMS.filter(function(it) { return !checklistItemDone(it.id); });
  var proxHtml = prox.length
    ? '<div style="display:flex;flex-direction:column;gap:5px;max-height:170px;overflow-y:auto;padding-right:4px">'
      + prox.map(function(it) {
        return '<label class="adm-home-hud-task" title="' + admHomeHudEsc(it.texto) + '">'
          + '<input type="checkbox" onchange="admHomeChecklistToggle(\'' + it.id + '\')">'
          + '<span>' + admHomeHudEsc(it.texto) + '</span>' + checklistIrHtml(it.id) + '</label>';
      }).join("") + '</div>'
    : '<div style="font-size:0.82rem;font-weight:700;color:#1c2b3a">¡Todo listo este mes! 🎉</div>';

  el.innerHTML =
      '<div class="adm-home-hud-cell" onclick="renderChecklist()" style="cursor:pointer">'
    +   '<div class="adm-home-hud-lab">Checklist · ' + mesNombre + '</div>'
    +   '<div style="font-size:1.7rem;font-weight:800;line-height:1;color:#1c2b3a;font-variant-numeric:tabular-nums;white-space:nowrap">' + done + '/' + total + '</div>'
    +   (vencidos ? '<div style="font-size:10.5px;font-weight:700;color:#c0392b;margin-top:3px">' + vencidos + ' atrasada' + (vencidos === 1 ? '' : 's') + '</div>' : '')
    + '</div>'
    + '<div class="adm-home-hud-cell">'
    +   '<div class="adm-home-hud-lab">Avance por tramo</div>'
    +   '<div class="adm-home-hud-tramos">' + tramos + '</div>'
    + '</div>'
    + '<div class="adm-home-hud-cell adm-home-hud-prox">'
    +   '<div class="adm-home-hud-lab">Pendientes · ' + prox.length + '</div>'
    +   proxHtml
    +   '<span onclick="renderChecklist()" style="cursor:pointer;font-size:0.74rem;font-weight:700;color:#1c2b3a;text-decoration:underline;text-underline-offset:3px;margin-top:3px;align-self:flex-start">Ver las ' + total + ' tareas</span>'
    + '</div>';
}
// ── Google Calendar arriba de la home ───────────────────────────────
// Calendario embebido (vista agenda). La cuenta/ID del calendario NO va escrita
// en el código (el repo es público): se carga una vez con "Conectar" y queda en
// ceot_gcal_src, que se sincroniza para verlo igual en cualquier PC. El embed
// de un calendario privado solo se ve si en ese navegador estás con la sesión
// de Google de esa cuenta iniciada.
var GCAL_KEY = "ceot_gcal_src", GCAL_ABIERTO_KEY = "ceot_gcal_abierto";
var _gcalPulled = false;
function admHomeCalRender() {
  var el = document.getElementById("admHomeCal");
  if (!el) return;
  if (!_gcalPulled) {
    _gcalPulled = true;
    syncPull(GCAL_KEY, function() { admHomeCalRender(); });
  }
  var src = "", abierto = true;
  try { src = localStorage.getItem(GCAL_KEY) || ""; } catch (e) {}
  try { abierto = localStorage.getItem(GCAL_ABIERTO_KEY) !== "0"; } catch (e) {}
  var btn = "border:2px solid #0f1c28;background:#fffaf1;color:#1c2b3a;font-size:0.72rem;font-weight:700;padding:4px 11px;border-radius:16px;cursor:pointer;font-family:inherit";
  var cab = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 14px">'
    + '<div class="adm-home-hud-lab">Google Calendar</div><div style="display:flex;gap:6px">'
    + (src ? '<button style="' + btn + '" onclick="admHomeCalToggle()">' + (abierto ? 'Ocultar' : 'Mostrar') + '</button>' : '')
    + '<button style="' + btn + '" onclick="admHomeCalConfigurar()">' + (src ? 'Cambiar' : 'Conectar') + '</button>'
    + '</div></div>';
  var cuerpo = '';
  if (!src) {
    cuerpo = '<div style="padding:4px 14px 14px;font-size:0.82rem;color:#4d5b68">Conectá tu calendario para ver la agenda acá arriba.</div>';
  } else if (abierto) {
    var url = "https://calendar.google.com/calendar/embed?src=" + encodeURIComponent(src)
      + "&mode=AGENDA&showTitle=0&showNav=0&showDate=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&hl=es&ctz=America%2FArgentina%2FBuenos_Aires";
    cuerpo = '<iframe title="Google Calendar" src="' + url + '" style="width:100%;height:230px;border:0;border-top:2px dashed rgba(15,28,40,.14);display:block;background:#fff"></iframe>';
  }
  el.innerHTML = '<div class="adm-home-hud" style="display:block">' + cab + cuerpo + '</div>';
}
function admHomeCalToggle() {
  var abierto = true;
  try { abierto = localStorage.getItem(GCAL_ABIERTO_KEY) !== "0"; localStorage.setItem(GCAL_ABIERTO_KEY, abierto ? "0" : "1"); } catch (e) {}
  admHomeCalRender();
}
function admHomeCalConfigurar() {
  var actual = ""; try { actual = localStorage.getItem(GCAL_KEY) || ""; } catch (e) {}
  var v = prompt("Mail de la cuenta de Google (o ID del calendario) que querés ver arriba.\nDejalo vacío para desconectar.", actual);
  if (v === null) return;
  v = v.trim();
  try { if (v) localStorage.setItem(GCAL_KEY, v); else localStorage.removeItem(GCAL_KEY); } catch (e) {}
  if (v) syncPush(GCAL_KEY);
  admHomeCalRender();
}

// Tildar desde la home: mismo guardado que toggleChecklistItem(), pero sin
// renderChecklistBody() — que pisa #adm-content con la pantalla del checklist.
function admHomeChecklistToggle(itemId) {
  var estado = checklistCargarEstado();
  var mk = checklistMesKey();
  if (!estado[mk]) estado[mk] = {};
  estado[mk][itemId] = !estado[mk][itemId];
  try { localStorage.setItem("ceot_checklist_done", JSON.stringify(estado)); } catch (e) {}
  syncPush("ceot_checklist_done");
  checklistActualizarBadge();
  admHomeHudRender();
}

// Cantidad de socios activos: se cuenta de la nómina (los DOCTORES con % de
// aporte a CEOT, igual que en "Retención Ganancias") en vez de estar escrita a
// mano — decía "10" fijo y quedó viejo cuando se sumó Garmendia.
function admHomeSociosActivos() {
  try {
    return DOCTORES.filter(function(d) { return APORTE_CEOT_PCT[d.apellido] !== null; }).length;
  } catch (e) { return "—"; }
}

function renderAdmHome() {
  admDesactivarSidebar();
  var hb = document.getElementById("admHomeBtn");
  if (hb) hb.style.display = "none";
  var sn = document.getElementById("admSidenav");
  if (sn) sn.style.display = "none";
  var hbg = document.getElementById("admHamburgerBtn");
  if (hbg) hbg.style.display = "none";
  PERIODOS_TODOS.forEach(function(p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });

  homeSearchQ = "";
  homeSearchCat = "Todos";
  homeEditMode = false;
  admHomeCargarModLabels();
  admHomeCargarUsage();
  admHomeCargarFijados();
  admHomeCargarTema();
  checklistSincronizar();
  checklistActualizarBadge();
  waHorariosCheck();
  var retro = admHomeTheme === "retro";

  var h = new Date().getHours();
  var saludo = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  var mesAct = tabMesActual();
  var garmNota = admHomeGarmendiaNota();
  var MESES_CORTO = {};
  PERIODOS_TODOS.forEach(function(id) { var i = periodoInfo(id); MESES_CORTO[id] = i.corto + " " + String(i.anio).slice(2); });

  var mesStrip = PERIODOS_TODOS.map(function(m) {
    var act = m === mesAct;
    var chipClass = retro ? "adm-home-mes-chip-retro" : "adm-home-mes-chip";
    var style = retro
      ? (act ? "flex-shrink:0;font-size:10px;padding:5px 12px;border-radius:20px;border:2px solid #0f1c28;background:#ef6fa2;color:#1c2b3a;font-weight:800;cursor:pointer;font-family:inherit"
             : "flex-shrink:0;font-size:10px;padding:5px 12px;border-radius:20px;border:2px solid #0f1c28;background:#fffaf1;color:rgba(28,43,58,.55);cursor:pointer;font-family:inherit")
      : (act ? "flex-shrink:0;font-size:10px;padding:4px 11px;border-radius:20px;border:0.5px solid #1f3a2e;background:#1f3a2e;color:#fff;font-weight:600;cursor:pointer;font-family:inherit"
             : "flex-shrink:0;font-size:10px;padding:4px 11px;border-radius:20px;border:0.5px solid rgba(32,36,31,0.15);background:rgba(32,36,31,0.06);color:rgba(32,36,31,0.45);cursor:pointer;font-family:inherit");
    return '<button class="' + chipClass + '" onclick="renderAdminPanelPage(\'' + m + '\')" style="' + style + '">' + MESES_CORTO[m] + '</button>';
  }).join("");

  // Stats de totalCeot para el mes actual
  var tc = liquidacionData.totalCeot;
  var totalMes = 0;
  if (tc && tc[mesAct]) {
    Object.values(tc[mesAct]).forEach(function(v){ totalMes += (v||0); });
  }
  var statNetoColor = retro ? '#1c2b3a' : '#20241f';
  var statNeto = totalMes ? ('<span style="font-size:1.2rem;font-weight:800;color:' + statNetoColor + '">' + fmt(totalMes) + '</span><div style="font-size:9px;color:rgba(29,158,117,0.85);margin-top:2px">total socios · ' + mesAct + '</div>') : ('<span style="font-size:1.2rem;color:rgba(32,36,31,0.3)">—</span>');

  var toggleBtn = '';  // toggle de tema retirado — solo queda la vista retro

  var html;

  if (retro) {
    // Una sola cabecera (la barra negra de arriba ya dice CEOT ADMIN y la tira
    // de meses ya está en las pestañas): acá van el título, el tablero del mes
    // (checklist + totales), buscador y filtros en una fila, los bloques y el piso.
    html = '<div class="adm-home-retro adm-home-retro-wrap"><canvas id="admHomeBg" aria-hidden="true"></canvas><div class="adm-home-retro-inner">'
      + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px 12px;flex-wrap:wrap;margin-bottom:10px">'
      +   '<h1 style="font-size:20px;font-weight:800;letter-spacing:.2px;color:#1c2b3a;margin:0">Inicio</h1>'
      +   '<div style="font-size:0.78rem;color:#4d5b68">' + saludo + ', Marcelo</div>'
      + '</div>'

      + '<div id="admHomeCal" style="position:relative;z-index:1;margin-bottom:14px"></div>'
      + '<div class="adm-home-hud" id="admHeroCard">'
      +   '<div id="admHomeHud" style="display:contents"></div>'
      +   '<div class="adm-home-hud-cell">'
      +     '<div class="adm-home-hud-lab">Total CEOT · ' + mesAct + '</div>'
      +     statNeto
      +   '</div>'
      +   '<div class="adm-home-hud-cell" onclick="renderPendientes()" style="cursor:pointer">'
      +     '<div class="adm-home-hud-lab">Socios activos</div>'
      +     '<span style="font-size:1.2rem;font-weight:800;color:#1c2b3a">' + admHomeSociosActivos() + '</span>'
      +     (garmNota ? '<div style="font-size:10.5px;color:#4d5b68;margin-top:2px">' + garmNota + '</div>' : '')
      +   '</div>'
      + '</div>'

      + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px">'
      +   '<div style="flex:1 1 260px;min-width:0;display:flex;align-items:center;gap:10px;background:#fffaf1;border:2px solid #0f1c28;border-radius:12px;padding:9px 14px;box-shadow:0 3px 0 #0f1c28">'
      +     '<span style="opacity:.5">🔍</span>'
      +     '<input id="admHomeSearchInput" oninput="admHomeBuscar(this.value)" placeholder="Buscar módulos, liquidaciones, accesos…" style="background:none;border:none;outline:none;color:#1c2b3a;font-size:16px;font-family:inherit;flex:1;min-width:0">'
      +   '</div>'
      +   '<div id="admHomeChips" style="display:flex;gap:6px;flex-wrap:wrap"></div>'
      +   '<button id="admHomeEditBtn" onclick="admHomeToggleEdit()" style="flex-shrink:0;background:#fffaf1;border:2px solid #0f1c28;color:#1c2b3a;font-size:0.74rem;font-weight:700;padding:7px 13px;border-radius:20px;cursor:pointer;font-family:inherit">✏ Editar nombres</button>'
      + '</div>'

      + '<div id="admHomeDynamic"></div>'

      + '<div style="display:flex;justify-content:space-between;font-size:10.5px;color:#4d5b68;padding-top:10px;margin-top:8px">'
      +   '<span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2f9e63;border:1.5px solid #0f1c28;margin-right:5px;vertical-align:1px"></span>Conectado</span>'
      +   '<span>Admin CEOT · 2026</span>'
      + '</div>'

      + '</div><div class="adm-home-ground" id="admHomeGround" aria-hidden="true"></div></div>';
  } else {
    html = '<div style="border-radius:0;padding:14px 16px 16px;min-height:200px">'
      + '<div style="max-width:1600px;margin:0 auto">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">'
      +   '<div style="font-size:0.78rem;color:rgba(32,36,31,0.38);font-weight:500;letter-spacing:.3px">' + saludo + ', Marcelo</div>'
      +   toggleBtn
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
      + '<div style="background:rgba(32,36,31,0.05);border:0.5px solid rgba(32,36,31,0.1);border-radius:10px;padding:11px 12px">'
      + '<div style="font-size:9px;color:rgba(32,36,31,0.35);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px">Total CEOT · ' + mesAct + '</div>'
      + statNeto
      + '</div>'
      + '<div style="background:rgba(32,36,31,0.05);border:0.5px solid rgba(32,36,31,0.1);border-radius:10px;padding:11px 12px">'
      + '<div style="font-size:9px;color:rgba(32,36,31,0.35);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px">Socios activos</div>'
      + '<span style="font-size:1.2rem;font-weight:800;color:#20241f">' + admHomeSociosActivos() + '</span>'
      + (garmNota ? '<div style="font-size:9.5px;color:rgba(32,36,31,0.3);margin-top:2px">' + garmNota + '</div>' : '')
      + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:5px;overflow-x:auto;margin-bottom:10px;scrollbar-width:none">' + mesStrip + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'
      + '<div style="flex:1;display:flex;align-items:center;gap:8px;border-bottom:1.5px dashed var(--co-line,#d9d0b8);padding:6px 4px">'
      + '<i data-lucide="search" style="width:14px;height:14px;color:var(--co-ink-dim,#6b6a5a);flex-shrink:0" stroke-width="2"></i>'
      + '<input id="admHomeSearchInput" oninput="admHomeBuscar(this.value)" placeholder="Buscar módulos, liquidaciones, accesos…" style="background:none;border:none;outline:none;color:#20241f;font-size:0.85rem;font-family:inherit;flex:1">'
      + '</div>'
      + '<button id="admHomeEditBtn" onclick="admHomeToggleEdit()" style="flex-shrink:0;background:rgba(32,36,31,.06);border:1px solid rgba(32,36,31,.12);color:rgba(32,36,31,.6);font-size:0.72rem;font-weight:600;padding:0 14px;border-radius:10px;cursor:pointer;font-family:inherit;height:38px"><i data-lucide="pencil" style="width:12px;height:12px;vertical-align:-2px;margin-right:3px" stroke-width="2"></i>Editar nombres</button>'
      + '</div>'
      + '<div id="admHomeDynamic"></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:9.5px;color:rgba(32,36,31,0.2);padding-top:8px;margin-top:2px;border-top:0.5px solid rgba(32,36,31,0.07)">'
      + '<span><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:rgba(29,158,117,.8);margin-right:4px;vertical-align:1px"></span>Conectado</span>'
      + '<span>Admin CEOT · 2026</span>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  document.getElementById("adm-content").innerHTML = html;
  admHomeHudRender();
  admHomeCalRender();
  admHomeRenderResults();
  coInitScrollFade("admMesStripScroll", "admMesStripWrap");
  if (retro) initAdmHomeBg(); else stopAdmHomeBg();
}

// ══════ FONDO ANIMADO — VISTA RETRO (constelación de nodos + emojis que cruzan) ═════
// El home admin se re-renderiza seguido (cambio de mes, editar nombres,
// toggle clásico/retro), asi que el canvas se recrea cada vez — hay que
// cortar el rAF previo antes de arrancar uno nuevo o se acumulan loops.
var _admHomeBgRaf = null;
function stopAdmHomeBg() {
  if (_admHomeBgRaf) { cancelAnimationFrame(_admHomeBgRaf); _admHomeBgRaf = null; }
}
function initAdmHomeBg() {
  stopAdmHomeBg();
  var canvas = document.getElementById("admHomeBg");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduceMotion = !window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  var INK = "15,28,40";     // #0f1c28 — borde navy del tema retro
  var GOLD = "239,111,162"; // #ef6fa2 — acento rosa del avatar retro

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var width = 0, height = 0, nodes = [], walkers = [], groundY = 110;

  // Personajes que cruzan el fondo del Home retro — emojis dibujados con
  // ctx.fillText a baja opacidad. Cada uno: el glifo y su tipo de movimiento:
  //   walk  → camina por el piso con un balanceo mínimo
  //   hop   → avanza dando saltitos (rebote sinusoidal)
  //   float → flota por encima del piso, con vaivén suave
  var SPRITES = [
    { e: "🍄", move: "walk" },
    { e: "🐢", move: "walk" },
    { e: "🐿️", move: "walk" },
    { e: "🦔", move: "walk" },
    { e: "🔥", move: "hop" },
    { e: "🌱", move: "hop" },
    { e: "⭐", move: "float" },
    { e: "🪙", move: "float" },
    { e: "☁️", move: "float" }
  ];
  var EMOJI_FONT = "23px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

  function makeWalkers() {
    var n = width < 420 ? 2 : (width < 620 ? 3 : 4);
    walkers = [];
    var pool = SPRITES.slice();
    for (var i = 0; i < n; i++) {
      var pick = pool.length
        ? pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
        : SPRITES[Math.floor(Math.random() * SPRITES.length)];
      walkers.push({
        e: pick.e, move: pick.move,
        x: Math.random() * Math.max(width, 1),
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: 0.11 + Math.random() * 0.14,
        phase: Math.floor(Math.random() * 100)
      });
    }
  }
  function updateGroundY() {
    var piso = document.getElementById("admHomeGround");
    if (piso) { groundY = piso.getBoundingClientRect().top - canvas.getBoundingClientRect().top + 2; return; }
    var card = document.getElementById("admHeroCard");
    if (!card) { groundY = Math.min(120, height - 14); return; }
    var cy = card.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top;
    // Línea de piso en el hueco (46px) entre la tarjeta hero y "DASH BOARD",
    // bien despegada del borde de la tarjeta para que no los tape.
    groundY = Math.max(24, Math.min(cy + 32, height - 14));
  }
  function drawWalker(w) {
    var px = Math.round(w.x);
    var yOff;
    if (w.move === "hop")        yOff = -Math.abs(Math.sin(w.phase * 0.13)) * 8;
    else if (w.move === "float") yOff = -12 - Math.sin(w.phase * 0.06) * 3;
    else                         yOff = -Math.abs(Math.sin(w.phase * 0.10)) * 2; // balanceo mínimo al caminar
    var y = groundY + yOff;

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.font = EMOJI_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    if (w.move !== "float" && w.dir < 0) {   // mira hacia donde camina
      ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0);
    }
    ctx.fillText(w.e, px, y);
    ctx.restore();
  }

  function makeNodes() {
    var count = Math.max(14, Math.min(45, Math.round((width * height) / 15000)));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
        r: 1.8 + Math.random() * 2, pink: Math.random() < 0.25
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    var i, j;
    for (i = 0; i < nodes.length; i++) {
      for (j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) {
          ctx.strokeStyle = "rgba(" + INK + "," + (0.12 * (1 - d / 100)) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      ctx.fillStyle = "rgba(" + (n.pink ? GOLD : INK) + "," + (n.pink ? 0.55 : 0.25) + ")";
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }
    updateGroundY();
    for (i = 0; i < walkers.length; i++) drawWalker(walkers[i]);
  }

  function resize(w, h) {
    if (!(w > 20) || !(h > 20)) return;
    width = w; height = h;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeNodes();
    makeWalkers();
    draw();
  }

  var parent = canvas.parentElement;
  resize(parent.clientWidth, parent.clientHeight);
  if (window.ResizeObserver) {
    new ResizeObserver(function (entries) {
      var box = entries[0].contentRect;
      resize(box.width, box.height);
    }).observe(parent);
  }

  if (reduceMotion) return;

  function tick() {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;
    }
    for (var k = 0; k < walkers.length; k++) {
      var w = walkers[k];
      w.x += w.dir * w.speed;
      w.phase += 0.7 + w.speed * 3;   // animación siempre viva; algo atada a la velocidad
      if (w.x < -30) w.x = width + 16;
      else if (w.x > width + 30) w.x = -16;
      if (Math.random() < 0.0009) w.dir *= -1;
    }
    draw();
    _admHomeBgRaf = requestAnimationFrame(tick);
  }
  _admHomeBgRaf = requestAnimationFrame(tick);
}

// ══════ RECORDATORIO WHATSAPP — HORARIOS Y ASISTENCIA ═══════════
// Del 24 al fin de mes, Marce le pasa por WhatsApp al estudio (2236796006) el
// Sheet de horarios y asistencia (r3-1 del checklist). Esto no manda nada solo
// —WhatsApp Web no deja adjuntar un archivo por link—, pero deja todo servido:
// un botón abre el Sheet ya exportado como .xlsx, otro abre el chat de
// WhatsApp con el mensaje escrito. Se descarta solo al mes siguiente.
var WA_HORARIOS_NUMERO = "5492236796006"; // 54 + 9 (celular AR) + 223 (Mar del Plata) + 6796006
var WA_HORARIOS_SHEET_ID = "1M-l1KHAoRRFL7MLpmQY4tXCtY0SLj14Dm0ucQWsR5fA";

function waHorariosDismissKey(d) {
  d = d || new Date();
  return "wa_horarios_dismiss_" + d.getFullYear() + "-" + (d.getMonth() + 1);
}
function waHorariosDismiss() {
  try { localStorage.setItem(waHorariosDismissKey(), "1"); } catch (e) {}
  var el = document.getElementById("waHorariosBanner");
  if (el) el.remove();
}
function waHorariosCheck() {
  var existing = document.getElementById("waHorariosBanner");
  if (existing) existing.remove();

  var d = new Date();
  if (d.getDate() < 24) return;
  try { if (localStorage.getItem(waHorariosDismissKey(d)) === "1") return; } catch (e) {}

  var MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  var mensaje = "Hola! Te paso el Sheet de horarios y asistencia de " + MESES[d.getMonth()] + ".";
  var waUrl = "https://wa.me/" + WA_HORARIOS_NUMERO + "?text=" + encodeURIComponent(mensaje);
  var sheetUrl = "https://docs.google.com/spreadsheets/d/" + WA_HORARIOS_SHEET_ID + "/export?format=xlsx";

  var div = document.createElement("div");
  div.id = "waHorariosBanner";
  div.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:5000;max-width:300px;"
    + "background:#fbf8f0;border:1.5px solid #92610f;border-radius:10px;padding:13px 15px;"
    + "box-shadow:0 4px 14px rgba(32,36,31,.18);font-family:system-ui,-apple-system,sans-serif";
  div.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">'
    +   '<div style="font-weight:700;font-size:.85rem;color:#92610f">📋 Horarios y asistencia</div>'
    +   '<button onclick="waHorariosDismiss()" title="No mostrar este mes" style="border:none;background:none;cursor:pointer;font-size:.9rem;color:rgba(32,36,31,.4);line-height:1;padding:0">✕</button>'
    + '</div>'
    + '<div style="font-size:.76rem;color:rgba(32,36,31,.65);line-height:1.4;margin-bottom:10px">Toca mandarle al estudio el Sheet de este mes.</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px">'
    +   '<a href="' + sheetUrl + '" target="_blank" rel="noopener" style="display:block;text-align:center;padding:7px 10px;border-radius:6px;border:1px solid rgba(32,36,31,.2);background:#fff;color:#20241f;font-size:.78rem;font-weight:600;text-decoration:none">⬇ Descargar Sheet (.xlsx)</a>'
    +   '<a href="' + waUrl + '" target="_blank" rel="noopener" style="display:block;text-align:center;padding:7px 10px;border-radius:6px;border:none;background:#1f3a2e;color:#fff;font-size:.78rem;font-weight:600;text-decoration:none">💬 Abrir WhatsApp</a>'
    + '</div>'
    + '<div style="font-size:.65rem;color:rgba(32,36,31,.4);margin-top:8px">Descargá el archivo primero y arrastralo al chat — WhatsApp Web no deja adjuntarlo solo.</div>';
  document.body.appendChild(div);
}

// ══════ CHECKLIST MENSUAL ═══════════════════════════════════════
// Rutina administrativa fija (01-10 / 10-20 / 20-30 de cada mes). El estado de
// tildado se guarda en localStorage por año-mes, así se reinicia solo cada mes.

var CHECKLIST_RANGOS = {
  r1: { label: "Del 01 al 10", diaHasta: 10 },
  r2: { label: "Del 10 al 20", diaHasta: 20 },
  r3: { label: "Del 20 al 30", diaHasta: 31 }
};

var CHECKLIST_ITEMS = [
  { id:"r1-1", rango:"r1", texto:"Retiro efectivo del banco (alquiler, Sueldos B, caja chica y servicios) desde la CC 094-351474/7" },
  { id:"r1-2", rango:"r1", texto:"Cargo las horas extras en el panel admin (según Sheet), emito los recibos de Sueldos B" },
  { id:"r1-3", rango:"r1", texto:"Pago Sueldos, cargas y sindicatos (el estudio me envía todo — Lorena)" },
  { id:"r1-4", rango:"r1", texto:"Cargo en el panel los archivos CSV que descargo de la página de CEM, transfiero lo que corresponda a los profesionales" },
  { id:"r1-5", rango:"r1", texto:"Descargo servicios para pagar en efectivo / Pago Fácil" },
  { id:"r1-6", rango:"r1", texto:"Transfiero según facturas recibidas los importes a los distintos proveedores" },
  { id:"r1-7", rango:"r1", texto:"Los miércoles reviso Débitos en la oficina de Convenios/Facturación" },
  { id:"r1-8", rango:"r1", texto:"Transfiero en concepto de dividendos y sueldos honorarios médicos" },
  { id:"r1-9", rango:"r1", texto:"Depósito de cheque semanal" },
  { id:"r1-10", rango:"r1", texto:"Tareas asignadas por profesionales" },

  { id:"r2-1", rango:"r2", texto:"Valores convenio (actualizaciones)" },
  { id:"r2-2", rango:"r2", texto:"Transfiero en concepto de dividendos honorarios médicos — en el 4to cheque descuento IIBB (si correspondiese)" },
  { id:"r2-3", rango:"r2", texto:"Depósito de cheque semanal" },
  { id:"r2-4", rango:"r2", texto:"Tareas asignadas por profesionales" },
  { id:"r2-5", rango:"r2", texto:"Actualizo listado de débitos" },
  { id:"r2-6", rango:"r2", texto:"CC Colón (factura a la Clínica) de CEOT y de Garmendia / Fisser y Guilera (Elizabeth)" },
  { id:"r2-7", rango:"r2", texto:"Desde el Panel Admin, subo archivos CEOT + ART + Factura Colón (FAC) y proceso para obtener los importes a distribuir en el cheque de OSDE y en los diferidos" },

  { id:"r3-1", rango:"r3", texto:"Envío información de horarios e inasistencias al estudio" },
  { id:"r3-2", rango:"r3", texto:"Desde el panel descargo lo que corresponde pagar de CPSM y lo subo al portal de ellos" },
  { id:"r3-3", rango:"r3", texto:"Transfiero en concepto de dividendos honorarios médicos — en el 5to cheque descuento CPSM" },
  { id:"r3-4", rango:"r3", texto:"CC CEM y emito la factura correspondiente" },
  { id:"r3-5", rango:"r3", texto:"Una vez cargadas todas las acreditaciones y calculado el % que guardamos para retenciones (después de la acreditación del cheque de OSDE)" }
];

// ── Atajo de cada tarea al lugar donde se hace ──────────────────────
// Una tarea del checklist dice QUÉ hay que hacer; esto dice DÓNDE: un botón al
// lado que abre el módulo (fn) o el acceso externo (acc = título en
// ACCESOS_DATA). Las tareas que se hacen fuera del panel (banco, estudio,
// depósito de cheques) no llevan atajo. Si un acceso se renombra o se borra,
// su atajo simplemente no se dibuja.
var CHECKLIST_IR = {
  "r1-2": { lbl: "Sueldo B",            fn: "renderSueldoB()" },
  "r1-4": { lbl: "Importar",            fn: "abrirImportModal()" },
  "r1-6": { lbl: "Facturas",            fn: "renderFacturas()" },
  "r1-7": { lbl: "Débitos",             fn: "renderDebitos()" },
  "r1-8": { lbl: "Transferencias",      fn: "abrirSueldoDirectorMesActual()" },
  "r2-1": { lbl: "Valores Convenios",   acc: "Valores Convenios" },
  "r2-2": { lbl: "Transferencias",      fn: "abrirSueldoDirectorMesActual()" },
  "r2-5": { lbl: "Débitos",             fn: "renderDebitos()" },
  "r2-6": { lbl: "CC Clínica Colón",    acc: "CC Clínica Colón" },
  "r2-7": { lbl: "Importar",            fn: "abrirImportModal()" },
  "r3-2": { lbl: "CPSM",                fn: "renderCpsm()" },
  "r3-3": { lbl: "Transferencias",      fn: "abrirSueldoDirectorMesActual()" },
  "r3-4": { lbl: "CC CEM MDP",          acc: "CC CEM MDP" },
  "r3-5": { lbl: "Retención Ganancias", fn: "renderAporteCeot()" }
};
// Va adentro de un <label>: <button>/<a> son contenido interactivo, así que
// tocarlos no tilda la tarea.
function checklistIrHtml(itemId) {
  var ir = CHECKLIST_IR[itemId];
  if (!ir) return "";
  var st = "flex-shrink:0;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;text-decoration:none;cursor:pointer;font-family:inherit;font-size:0.68rem;font-weight:700;line-height:1.2;padding:3px 9px;border-radius:12px;border:1.5px solid #0f1c28;background:#fffaf1;color:#1c2b3a";
  if (ir.fn) return '<button type="button" class="chk-ir" onclick="event.stopPropagation();' + ir.fn + '" style="' + st + '">' + ir.lbl + ' →</button>';
  var acc = (typeof ACCESOS_DATA !== "undefined" ? ACCESOS_DATA : []).filter(function(a) { return a.title === ir.acc && a.url; })[0];
  if (!acc) return "";
  return '<a class="chk-ir" href="' + acc.url + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="' + st + '">' + ir.lbl + ' ↗</a>';
}

function checklistMesKey(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function checklistCargarEstado() {
  try { return JSON.parse(localStorage.getItem("ceot_checklist_done") || "{}"); }
  catch (e) { return {}; }
}
// Estado compartido entre dispositivos (y legible por el recordatorio diario):
// se trae del Sheet al abrir el home/checklist y se sube con cada tildado.
// La primera vez sube lo que ya había en este navegador para sembrar el Sheet.
var _checklistSincronizado = false;
function checklistSincronizar() {
  if (_checklistSincronizado) return;
  _checklistSincronizado = true;
  syncPull("ceot_checklist_done", function() {
    checklistActualizarBadge();
    admHomeHudRender();
    if (document.getElementById("adm-content") && document.querySelector("#adm-content .adm-sec-title") &&
        /Checklist mensual/.test(document.querySelector("#adm-content .adm-sec-title").textContent)) renderChecklistBody();
  });
  try {
    if (!localStorage.getItem("ceot_checklist_seeded") && localStorage.getItem("ceot_checklist_done")) {
      setTimeout(function() {
        syncPush("ceot_checklist_done");
        try { localStorage.setItem("ceot_checklist_seeded", "1"); } catch (e) {}
      }, 4000);
    }
  } catch (e) {}
}
function checklistItemDone(itemId) {
  var estado = checklistCargarEstado();
  var mk = checklistMesKey();
  return !!(estado[mk] && estado[mk][itemId]);
}
function toggleChecklistItem(itemId) {
  var estado = checklistCargarEstado();
  var mk = checklistMesKey();
  if (!estado[mk]) estado[mk] = {};
  estado[mk][itemId] = !estado[mk][itemId];
  try { localStorage.setItem("ceot_checklist_done", JSON.stringify(estado)); } catch (e) {}
  syncPush("ceot_checklist_done");
  renderChecklistBody();
  checklistActualizarBadge();
}
function checklistVencidos() {
  var dia = new Date().getDate();
  return CHECKLIST_ITEMS.filter(function(it) {
    return dia > CHECKLIST_RANGOS[it.rango].diaHasta && !checklistItemDone(it.id);
  });
}
// Botón "Checklist" del header — aro de progreso (hechas/total del mes), con el
// mismo lenguaje visual del tema Home activo (papel/verde vs. pixel/retro). El
// aro se pone rojo si hay tareas atrasadas — es el "aviso" pedido.
function checklistActualizarBadge() {
  var btn = document.getElementById("btnChecklist");
  var inner = document.getElementById("checklistBtnInner");
  if (!btn || !inner) return;

  var total = CHECKLIST_ITEMS.length;
  var done = CHECKLIST_ITEMS.filter(function(it) { return checklistItemDone(it.id); }).length;
  var vencidos = checklistVencidos().length;
  var pct = total ? done / total : 0;
  var r = 7, circ = 2 * Math.PI * r;
  var offset = circ * (1 - pct);

  var retro = (typeof admHomeTheme !== "undefined") && admHomeTheme === "retro";
  var ringColor  = vencidos > 0 ? (retro ? "#c0392b" : "#b13a2c") : (retro ? "#0f1c28" : "#1f3a2e");
  var trackColor = retro ? "rgba(15,28,40,.25)" : "rgba(31,58,46,.18)";
  var textColor  = retro ? "#1c2b3a" : "#1f3a2e";

  if (retro) {
    btn.style.cssText = "background:#f5c542;color:" + textColor + ";border:2px solid #0f1c28;border-radius:16px;padding:4px 12px;font-weight:700;font-family:inherit;cursor:pointer";
  } else {
    btn.style.cssText = "background:#fbf8f0;color:" + textColor + ";border:none;border-radius:8px;padding:6px 12px;font-weight:500;font-family:inherit;cursor:pointer";
  }

  inner.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 18 18">' +
      '<circle cx="9" cy="9" r="' + r + '" fill="none" stroke="' + trackColor + '" stroke-width="3"></circle>' +
      '<circle cx="9" cy="9" r="' + r + '" fill="none" stroke="' + ringColor + '" stroke-width="3" stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' + offset.toFixed(2) + '" stroke-linecap="round" transform="rotate(-90 9 9)"></circle>' +
    '</svg>' +
    '<span style="font-size:12px">Checklist · ' + done + '/' + total + '</span>';
}

function renderChecklist() {
  checklistSincronizar();
  cerrarAdmSidenav();
  admDesactivarSidebar();
  PERIODOS_TODOS.forEach(function(p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });
  renderChecklistBody();
}

// Solo redibuja el contenido (sin tocar sidebar/scroll) — la usa toggleChecklistItem()
// para que tildar un ítem no dispare el scrollTo(0,0) de admDesactivarSidebar().
function renderChecklistBody() {
  var dia = new Date().getDate();
  var html = '<div class="adm-sec-title">Checklist mensual</div>'
    + '<div style="font-size:.72rem;color:rgba(32,36,31,.45);margin:-6px 0 14px">Se reinicia solo cada mes — lo tildado acá no afecta lo tildado el mes pasado.</div>';

  Object.keys(CHECKLIST_RANGOS).forEach(function(rk) {
    var r = CHECKLIST_RANGOS[rk];
    var vencidoRango = dia > r.diaHasta;
    var items = CHECKLIST_ITEMS.filter(function(it) { return it.rango === rk; });
    html += '<div style="margin-bottom:18px">'
      + '<div style="background:#1f3a2e;color:#fff;font-weight:700;font-size:.85rem;padding:8px 12px;border-radius:8px 8px 0 0">' + r.label + ' de cada mes</div>'
      + '<div style="border:1px solid rgba(32,36,31,.12);border-top:none;border-radius:0 0 8px 8px;overflow:hidden">';
    items.forEach(function(it) {
      var done = checklistItemDone(it.id);
      var atrasada = vencidoRango && !done;
      html += '<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(32,36,31,.08);cursor:pointer;'
        + (atrasada ? 'background:#fef2f2' : '') + '">'
        + '<input type="checkbox" ' + (done ? 'checked' : '') + ' onchange="toggleChecklistItem(\'' + it.id + '\')" style="margin-top:3px;flex-shrink:0">'
        + '<span style="flex:1;font-size:.85rem;' + (done ? 'text-decoration:line-through;color:rgba(32,36,31,.4)' : 'color:#20241f') + '">' + it.texto + '</span>'
        + (atrasada ? '<span style="font-size:.65rem;color:#b13a2c;font-weight:700;white-space:nowrap;flex-shrink:0">⚠ atrasada</span>' : '')
        + checklistIrHtml(it.id)
        + '</label>';
    });
    html += '</div></div>';
  });

  document.getElementById("adm-content").innerHTML = html;
}

// ══════ PENDIENTES ADMIN ═══════════════════════════════════════

function renderPendientes() {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  PERIODOS_TODOS.forEach(function(p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });
  var sp = document.getElementById("adm-sidenav-pendientes");
  if (sp) sp.className = "adm-sidenav-btn active";

  var periodos = PERIODOS_TODOS;
  var rawMap   = {febrero:FEBRERO_RAW,marzo:MARZO_RAW,abril:ABRIL_RAW,mayo:MAYO_RAW,junio:JUNIO_RAW,julio:JULIO_RAW,agosto:AGOSTO_RAW,
                  septiembre:SEPTIEMBRE_RAW,octubre:OCTUBRE_RAW,noviembre:NOVIEMBRE_RAW,diciembre:DICIEMBRE_RAW,
                  enero2027:ENERO2027_RAW,febrero2027:FEBRERO2027_RAW,marzo2027:MARZO2027_RAW,abril2027:ABRIL2027_RAW,mayo2027:MAYO2027_RAW,junio2027:JUNIO2027_RAW,julio2027:JULIO2027_RAW,agosto2027:AGOSTO2027_RAW,septiembre2027:SEPTIEMBRE2027_RAW,octubre2027:OCTUBRE2027_RAW,noviembre2027:NOVIEMBRE2027_RAW,diciembre2027:DICIEMBRE2027_RAW};

  function cel(ok, txt) {
    return ok
      ? '<td style="text-align:center;color:#16a34a;font-weight:700">' + (txt||'✓') + '</td>'
      : '<td style="text-align:center;color:#d1d5db">·</td>';
  }
  // Celda de 3 estados para Colón/OSDE/CEM: cargado completo / parcial (faltan
  // profesionales) / nada. El parcial es el que antes pasaba silencioso — la
  // celda daba ✓ aunque faltara la mitad de los profesionales.
  function cel3(cargados, ref) {
    if (!cargados) return '<td style="text-align:center;color:#d1d5db">·</td>';
    if (ref && cargados < ref) return '<td style="text-align:center;color:#92610f;font-weight:700" title="Parcial: ' + cargados + '/' + ref + ' profesionales">◐</td>';
    return '<td style="text-align:center;color:#16a34a;font-weight:700">✓</td>';
  }
  function contarMap(m) {
    if (!m) return 0;
    return Object.keys(m).filter(function(k){ return m[k]; }).length;
  }

  var html = '<div class="adm-sec-title">Estado de carga por período</div>';
  html += '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>';
  html += '<th>Período</th><th>Colón</th><th>OSDE</th><th>CEM</th><th>IIBB</th><th>CPSM</th><th>Gastos A</th></tr></thead><tbody>';

  periodos.forEach(function(pid) {
    var raw        = rawMap[pid];
    var colonN     = raw ? raw.filter(function(r){ return (r.f1||r.f2||r.f3||r.f4||r.f5); }).length : 0;
    var ref        = colonN || 10;   // universo de referencia del mes (los que tienen cheque Colón)
    var pe         = PERIOD_EXTRAS[pid];
    var osdeN      = (pe && pe.osde && !pe.osde.pendiente) ? contarMap(pe.osde.m) : 0;
    var cmN        = (pe && pe.cm   && !pe.cm.pendiente)   ? contarMap(pe.cm.m)   : 0;
    var tieneColon = colonN > 0;
    var tieneOsde  = osdeN > 0;
    var tieneCM    = cmN > 0;
    var tieneIIBB  = PERIODO_IIBB[pid] !== null;
    var tieneCPSM  = PERIODO_CPSM[pid] !== null;
    var tieneGA    = GASTOS_A[pid] != null;
    var todo       = tieneColon && colonN >= ref && osdeN >= ref && cmN >= ref && tieneIIBB && tieneCPSM && tieneGA;
    html += '<tr' + (todo ? ' style="background:rgba(74,222,128,.08)"' : '') + '>';
    html += '<td style="font-weight:700">' + periodoInfo(pid).label + '</td>';
    html += cel3(colonN, ref) + cel3(osdeN, ref) + cel3(cmN, ref) + cel(tieneIIBB) + cel(tieneCPSM) + cel(tieneGA);
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  html += '<div style="font-size:0.7rem;color:rgba(32,36,31,.4);margin-top:10px">✓ completo &nbsp;·&nbsp; <span style="color:#92610f">◐</span> parcial (faltan profesionales) &nbsp;·&nbsp; · sin cargar</div>';
  document.getElementById("adm-content").innerHTML = html;
}

