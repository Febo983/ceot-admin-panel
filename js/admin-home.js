// ═══════════════════════════════════════════════════════════════════
// admin-home.js — extraído de index.html.
// Home de accesos del admin + fondo animado retro + checklist mensual
// + pendientes admin. Solo definiciones (se carga antes del principal).
// ═══════════════════════════════════════════════════════════════════

// ══════ ADMIN HOME ═══════════════════════════════════════════════

var homeSearchQ = "";
var homeSearchCat = "Todos";
var USAGE_COUNT = {};

var ADM_HOME_MODULOS = [
  { key:"liquidaciones",    ico:"bar-chart-3",     lbl:"Liquidaciones", cat:"cat-fin", fn:"renderAdminPanelPage(tabMesActual())" },
  { key:"totalceot",        ico:"trending-up",     lbl:"Total CEOT",    cat:"cat-fin", fn:"renderTotalCeot()" },
  { key:"debitos",          ico:"alert-triangle",  lbl:"Débitos",       cat:"cat-gst", fn:"renderDebitos()" },
  { key:"gastospagos",      ico:"wallet",          lbl:"Gastos y Pagos",cat:"cat-gst", fn:"renderGastosPagos()" },
  { key:"facturas",         ico:"receipt",         lbl:"Facturas",      cat:"cat-adm", fn:"renderFacturas()" },
  { key:"transferencias",   ico:"arrow-left-right",lbl:"Transferencias",cat:"cat-adm", fn:"renderTransferencias()" },
  { key:"sueldob",          ico:"briefcase",       lbl:"Sueldo B",      cat:"cat-adm", fn:"renderSueldoB()" },
  { key:"cpsm",             ico:"landmark",        lbl:"CPSM",          cat:"cat-fin", fn:"renderCpsm()" },
  { key:"aporteceot",       ico:"percent",         lbl:"Retención Ganancias",   cat:"cat-fin", fn:"renderAporteCeot()" },
  { key:"sueldodirector",   ico:"banknote",        lbl:"Transferencias del Mes", cat:"cat-fin", fn:"renderSueldoDirector()" },
  { key:"licenciashon",     ico:"plane-takeoff",   lbl:"Licencias (Honorarios)", cat:"cat-fin", fn:"renderLicenciasHon()" },
  { key:"accesos",          ico:"link-2",          lbl:"Accesos",       cat:"cat-inf", fn:"renderAccesos(null)" },
  { key:"mensajeswa",       ico:"message-circle",  lbl:"Mensajes WA",   cat:"cat-cli", fn:"" },
  { key:"nomina",           ico:"users",           lbl:"Nómina",        cat:"cat-adm", fn:"renderNomina()" },
  { key:"licencias",        ico:"calendar-heart",  lbl:"Licencias",     cat:"cat-adm", fn:"renderLicencias()" },
  { key:"presentacion",     ico:"presentation",    lbl:"Presentación",  cat:"cat-fin", fn:"renderPresentacion()" },
  { key:"premios",          ico:"award",           lbl:"Premios",       cat:"cat-adm", fn:"renderPremios()" },
  { key:"obrapagos",        ico:"hard-hat",        lbl:"Pagos de obra", cat:"cat-adm", fn:"renderObraPagos()" },
  { key:"estadisticas",     ico:"line-chart",      lbl:"Estadísticas CEOT", cat:"cat-inf", fn:"renderEstadisticasCeot()" },
  { key:"gastoscasa",       ico:"home",            lbl:"Gastos Casa",   cat:"cat-gst", fn:"renderGastosCasa()" },
];
var ADM_HOME_MOD_COLOR = {
  "cat-fin":"rgba(29,158,117,0.22)","cat-cli":"rgba(55,138,221,0.22)",
  "cat-adm":"rgba(127,119,221,0.22)","cat-gst":"rgba(216,90,48,0.22)","cat-inf":"rgba(32,36,31,0.1)"
};
// Módulos del home agrupados por "mundo" (tema retro ordenado).
// Cualquier key que no figure acá cae automáticamente en un grupo "Más".
var ADM_HOME_MOD_GRUPOS = [
  { t:"Honorarios", c:"rgba(29,158,117,0.9)",  keys:["liquidaciones","totalceot","sueldodirector","licenciashon","transferencias","cpsm","aporteceot","debitos","facturas","presentacion"] },
  { t:"Gestión", c:"rgba(127,119,221,0.9)", keys:["sueldob","nomina","licencias","premios","mensajeswa","accesos","estadisticas","obrapagos","gastoscasa"] }
];
var ADM_HOME_ACC_COLOR = {
  "Finanzas":"rgba(29,158,117,0.22)","Clínica":"rgba(55,138,221,0.22)",
  "Admin":"rgba(127,119,221,0.22)","Otros":"rgba(32,36,31,0.1)"
};

var LUCIDE_ACC_ICON = {
  "Liquidaciones Clínica":"file-spreadsheet","Liquidaciones CEM":"file-spreadsheet","Gastos y Sueldos":"wallet",
  "Caja Gerling":"piggy-bank","Liquidaciones Detalles":"file-text","Valores Convenios":"file-check",
  "Liquidaciones 2026":"bar-chart-3","CC Clínica Colón":"building-2","CC CEM MDP":"building-2",
  "Programación CX (Sheet)":"calendar-days","Estadísticas CX":"line-chart","Órdenes CX":"clipboard-list",
  "Fichas CX":"folder","Programación CX v2":"calendar-days","Evoluciones":"edit-3",
  "Cirugías Programadas":"calendar-clock","Estadísticas CX 2026":"bar-chart-3","Historial CX":"history",
  "Estadísticas CX 26 v2":"line-chart","Portal Profesionales":"stethoscope","Panel Mensajes WA":"message-circle",
  "Admin Liquidaciones":"settings","Admin Panel CEOT":"settings-2","Agendas CEOT":"calendar",
  "Permisos ART":"shield-check","Panel Adm. Marce":"user-cog","Horarios y Asistencias":"clock",
  "Documentación CEOT":"folder-open","Archivos Reuniones":"file-text","Encuesta Secretarias":"star",
  "Encuesta Satisfacción":"smile","Caja de Médicos":"landmark","Banco Francés CEOT":"landmark",
  "WhatsApp Web":"message-circle"
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

  var boxBg      = "#fffaf1";
  var boxBgHover = "#ffffff";
  var border      = editing ? "2px dashed #b8447a" : "2px solid #0f1c28";
  var boxShadow  = "box-shadow:0 3px 0 #0f1c28;";
  var boxRadius  = "16px";
  var icoRadius  = "12px";
  var icoBorder  = "border:2px solid #0f1c28;";
  var icoColor   = "#1c2b3a";
  var labelStyle = "font-size:10.5px;color:#1c2b3a;text-align:center;font-weight:700;letter-spacing:0.2px;line-height:1.3;min-height:27px;display:flex;align-items:center;justify-content:center";

  var del = (editing && opts.delFn)
    ? '<div onclick="event.stopPropagation();' + opts.delFn + '" title="Eliminar" style="position:absolute;top:3px;right:3px;width:16px;height:16px;border-radius:4px;background:rgba(220,38,38,.85);color:#fff;font-size:9px;line-height:16px;text-align:center;cursor:pointer">✕</div>'
    : "";
  var pencil = editing ? '<div style="position:absolute;top:3px;left:3px;font-size:9px;opacity:.6">✏</div>' : "";
  return "<" + tag + attrs + " class=\"adm-home-tile-retro\" style=\"position:relative;text-decoration:none;background:" + boxBg + ";border:" + border + ";border-radius:" + boxRadius + ";" + boxShadow + "padding:22px 10px 16px;min-height:127px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:10px;cursor:" + cursor + "\" onmouseover=\"this.style.background='" + boxBgHover + "'\" onmouseout=\"this.style.background='" + boxBg + "'\">"
    + pencil + del
    + '<div style="width:52px;height:52px;border-radius:' + icoRadius + ';background:' + colorRgba + ';' + icoBorder + 'display:flex;align-items:center;justify-content:center"><i data-lucide="' + ico + '" style="width:24px;height:24px;color:' + icoColor + '" stroke-width="1.75"></i></div>'
    + '<div style="' + labelStyle + '">' + lbl + '</div>'
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

function admHomeRenderResults() {
  var root = document.getElementById("admHomeDynamic");
  if (!root) return;
  var q = homeSearchQ.trim().toLowerCase();

  var retroChips = admHomeTheme === "retro";
  var tileWrap = retroChips
    ? "display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px"
    : "display:grid;grid-template-columns:repeat(auto-fill,minmax(126px,1fr));gap:8px";
  var cats = ["Todos","Módulos","Finanzas","Clínica","Admin","Otros"];
  var chips = cats.map(function(c) {
    var on = homeSearchCat === c;
    var onBg     = retroChips ? '#ef6fa2' : '#1f3a2e';
    var onText   = retroChips ? '#1c2b3a' : '#fff';
    var onBorder = retroChips ? '2px solid #0f1c28' : ('1px solid ' + onBg);
    var offBg     = retroChips ? '#fffaf1' : 'rgba(32,36,31,.04)';
    var offText   = retroChips ? 'rgba(28,43,58,.6)' : 'rgba(32,36,31,.55)';
    var offBorder = retroChips ? '2px solid #0f1c28' : '1px solid rgba(32,36,31,.15)';
    return '<span onclick="admHomeSetCat(\'' + c + '\')" style="flex-shrink:0;cursor:pointer;font-size:0.7rem;padding:5px 12px;border-radius:20px;border:' + (on ? onBorder : offBorder) + ';background:' + (on ? onBg : offBg) + ';color:' + (on ? onText : offText) + ';font-weight:700;white-space:nowrap">' + c + '</span>';
  }).join("");

  var modMatch = admHomeOrdenarPorUso(ADM_HOME_MODULOS.filter(function(m) {
    return (homeSearchCat === "Todos" || homeSearchCat === "Módulos") && (!q || m.lbl.toLowerCase().indexOf(q) !== -1);
  }), function(m) { return "mod:" + m.key; });
  var accMatch = admHomeOrdenarPorUso(ACCESOS_DATA.filter(function(a) {
    return (homeSearchCat === "Todos" || homeSearchCat === a.cat) && (!q || a.title.toLowerCase().indexOf(q) !== -1 || a.desc.toLowerCase().indexOf(q) !== -1);
  }), function(a) { return "acc:" + a.id; });

  var flatMode = !!q || homeSearchCat !== "Todos";
  var html = '<div class="adm-sf-wrap" id="admCatChipsWrap" style="margin-bottom:12px"><div id="admCatChipsScroll" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none">' + chips + '</div></div>';

  if (homeEditMode) {
    html += '<div style="font-size:0.68rem;color:rgba(31,58,46,.85);margin-bottom:12px;padding:8px 10px;background:rgba(31,58,46,.08);border:1px solid rgba(31,58,46,.25);border-radius:8px">✏ Modo edición: tocá cualquier tile para renombrarlo' + (flatMode ? '' : ' o eliminarlo') + '.</div>';
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
        return admHomeTile(m.ico, admHomeModLabel(m), ADM_HOME_MOD_COLOR[m.cat] || "rgba(32,36,31,0.1)", { fn: m.fn, editFn: "admHomeEditarModulo('" + m.key + "')", usageKey: "mod:" + m.key });
      }).concat(accMatch.map(function(a) {
        var ico = LUCIDE_ACC_ICON[a.title] || "link";
        var nav = a.fn ? { fn: a.fn } : { href: a.url };
        return admHomeTile(ico, a.title, ADM_HOME_ACC_COLOR[a.cat] || "rgba(32,36,31,0.1)", Object.assign(nav, { editFn: "admHomeEditarAcceso(" + a.id + ")", delFn: "admHomeEliminarAcceso(" + a.id + ")", usageKey: "acc:" + a.id }));
      }));
      html += '<div style="' + tileWrap + ';margin-bottom:6px">' + tiles.join("") + '</div>';
    }
  } else {
    // Módulos separados por "mundo" (Plata / Gestión / Más), cada uno con
    // divisor pixel y su color de categoría en el borde izquierdo.
    var _modEnGrupos = ADM_HOME_MOD_GRUPOS.reduce(function(a, g) { return a.concat(g.keys); }, []);
    var _modSueltos = ADM_HOME_MODULOS.filter(function(m) { return _modEnGrupos.indexOf(m.key) === -1; });
    var _modGrupos = ADM_HOME_MOD_GRUPOS.concat(_modSueltos.length ? [{ t:"Más", c:"rgba(32,36,31,0.4)", keys:_modSueltos.map(function(m){ return m.key; }) }] : []);
    _modGrupos.forEach(function(g) {
      var mods = admHomeOrdenarPorUso(ADM_HOME_MODULOS.filter(function(m) { return g.keys.indexOf(m.key) !== -1; }), function(m) { return "mod:" + m.key; });
      if (!mods.length) return;
      html += '<div style="display:flex;align-items:center;gap:7px;margin:0 0 7px">'
        + '<span style="width:9px;height:9px;border-radius:3px;background:' + g.c + ';border:2px solid #0f1c28;flex-shrink:0"></span>'
        + '<span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(32,36,31,.42)">' + g.t + ' <span style="color:rgba(32,36,31,.2);font-weight:500">· ' + mods.length + '</span></span>'
        + '</div>';
      html += '<div style="' + tileWrap + ';margin-bottom:16px;border-left:3px solid ' + g.c + ';padding-left:10px">'
        + mods.map(function(m) { return admHomeTile(m.ico, admHomeModLabel(m), ADM_HOME_MOD_COLOR[m.cat] || "rgba(32,36,31,0.1)", { fn: m.fn, editFn: "admHomeEditarModulo('" + m.key + "')", usageKey: "mod:" + m.key }); }).join("")
        + '</div>';
    });

    ["Finanzas","Clínica","Admin","Otros"].forEach(function(cat) {
      var items = admHomeOrdenarPorUso(ACCESOS_DATA.filter(function(a) { return a.cat === cat; }), function(a) { return "acc:" + a.id; });
      if (!items.length && !homeEditMode) return;
      var tiles = items.map(function(a) {
        var ico = LUCIDE_ACC_ICON[a.title] || "link";
        var nav = a.fn ? { fn: a.fn } : { href: a.url };
        return admHomeTile(ico, a.title, ADM_HOME_ACC_COLOR[cat], Object.assign(nav, { editFn: "admHomeEditarAcceso(" + a.id + ")", delFn: "admHomeEliminarAcceso(" + a.id + ")", usageKey: "acc:" + a.id }));
      });
      if (homeEditMode) {
        tiles.push('<div onclick="admHomeNuevoAcceso(\'' + cat + '\')" style="cursor:pointer;background:rgba(32,36,31,0.03);border:1px dashed rgba(32,36,31,.3);border-radius:10px;padding:12px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:8px;min-height:64px">'
          + '<i data-lucide="plus" style="width:18px;height:18px;color:rgba(31,58,46,.8)" stroke-width="1.75"></i>'
          + '<div style="font-size:11px;color:rgba(31,58,46,.8);font-weight:500">Nuevo</div>'
          + '</div>');
      }
      html += '<div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(32,36,31,.32);margin:0 0 6px">' + cat + ' <span style="color:rgba(32,36,31,.18);font-weight:500">· ' + items.length + '</span></div>';
      html += '<div style="' + tileWrap + ';margin-bottom:14px">' + tiles.join("") + '</div>';
    });
  }

  root.innerHTML = html;
  coInitScrollFade("admCatChipsScroll", "admCatChipsWrap");
  if (window.lucide) lucide.createIcons();
}

function renderAdmHome() {
  admDesactivarSidebar();
  var hb = document.getElementById("admHomeBtn");
  if (hb) hb.style.display = "none";
  var sn = document.getElementById("admSidenav");
  if (sn) sn.style.display = "none";
  var hbg = document.getElementById("admHamburgerBtn");
  if (hbg) hbg.style.display = "none";
  ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"].forEach(function(p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });

  homeSearchQ = "";
  homeSearchCat = "Todos";
  homeEditMode = false;
  admHomeCargarModLabels();
  admHomeCargarUsage();
  admHomeCargarTema();
  checklistActualizarBadge();
  var retro = admHomeTheme === "retro";

  var h = new Date().getHours();
  var saludo = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  var mesAct = tabMesActual();
  var MESES_CORTO = {enero:"Ene",febrero:"Feb",marzo:"Mar",abril:"Abr",mayo:"May",junio:"Jun",julio:"Jul",agosto:"Ago",septiembre:"Sep",octubre:"Oct",noviembre:"Nov",diciembre:"Dic"};

  var mesStrip = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"].map(function(m) {
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
    html = '<div class="adm-home-retro adm-home-retro-wrap"><canvas id="admHomeBg" aria-hidden="true"></canvas><div class="adm-home-retro-inner">'
      + '<div id="admHeroCard" style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#fffaf1;border:3px solid #0f1c28;border-radius:18px;padding:12px 18px;box-shadow:0 5px 0 #0f1c28,0 10px 18px rgba(15,28,40,.18);margin-bottom:24px">'
      +   '<div style="display:flex;align-items:center;gap:12px">'
      +     '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(160deg,#2f7de0 0%,#1f5cab 100%);border:3px solid #0f1c28;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18);flex-shrink:0">'
      +       '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M12 3v18M3 12h18" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>'
      +     '</div>'
      +     '<div>'
      +       '<div style="font-family:\'PixelDisplay\',monospace;font-size:11px;color:#1c2b3a;letter-spacing:.5px">CEOT ADMIN</div>'
      +       '<div style="font-size:8.5px;color:#5b6b7a;margin-top:4px;letter-spacing:.3px">Ortopedia y Traumatología · Clínica Colón</div>'
      +     '</div>'
      +   '</div>'
      +   '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
      +     '<div style="display:flex;align-items:center;gap:8px;background:rgba(63,151,201,.12);border:2px solid #0f1c28;border-radius:999px;padding:6px 12px 6px 6px">'
      +       '<div style="width:26px;height:26px;border-radius:50%;background:#ef6fa2;border:2px solid #0f1c28;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#0f1c28">M</div>'
      +       '<div><div style="font-size:12px;font-weight:700;color:#1c2b3a">MARCELO</div><div style="font-size:9.5px;color:#5b6b7a;text-transform:uppercase;letter-spacing:.4px">Administrador</div></div>'
      +     '</div>'
      +     toggleBtn
      +   '</div>'
      + '</div>'

      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px">'
      +   '<h1 style="font-family:\'PixelDisplay\',monospace;font-size:15px;letter-spacing:1px;color:#1c2b3a;margin:0">DASH BOARD</h1>'
      +   '<div style="font-size:0.72rem;color:#5b6b7a">' + saludo + ', Marcelo</div>'
      + '</div>'

      + '<div class="adm-sf-wrap" id="admMesStripWrap" style="margin-bottom:14px"><div id="admMesStripScroll" style="display:flex;gap:5px;overflow-x:auto;scrollbar-width:none">' + mesStrip + '</div></div>'

      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">'
      +   '<div style="flex:1;display:flex;align-items:center;gap:10px;background:#fffaf1;border:2px solid #0f1c28;border-radius:14px;padding:10px 14px">'
      +     '<span style="opacity:.5">🔍</span>'
      +     '<input id="admHomeSearchInput" oninput="admHomeBuscar(this.value)" placeholder="Buscar módulos, liquidaciones, accesos…" style="background:none;border:none;outline:none;color:#1c2b3a;font-size:0.85rem;font-family:inherit;flex:1">'
      +   '</div>'
      +   '<button id="admHomeEditBtn" onclick="admHomeToggleEdit()" style="flex-shrink:0;background:#fffaf1;border:2px solid #0f1c28;color:#1c2b3a;font-size:0.72rem;font-weight:700;padding:0 14px;border-radius:14px;cursor:pointer;font-family:inherit;height:41px">✏ Editar nombres</button>'
      + '</div>'

      + '<div id="admHomeDynamic"></div>'

      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'
      +   '<div style="background:#fffaf1;border:2px solid #0f1c28;border-radius:14px;padding:12px 14px;box-shadow:0 3px 0 #0f1c28">'
      +     '<div style="font-size:9px;color:#5b6b7a;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px">Total CEOT · ' + mesAct + '</div>'
      +     statNeto
      +   '</div>'
      +   '<div onclick="renderPendientes()" style="background:#fffaf1;border:2px solid #0f1c28;border-radius:14px;padding:12px 14px;box-shadow:0 3px 0 #0f1c28;cursor:pointer">'
      +     '<div style="font-size:9px;color:#5b6b7a;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px">Socios activos</div>'
      +     '<span style="font-size:1.2rem;font-weight:800;color:#1c2b3a">10</span>'
      +     '<div style="font-size:9.5px;color:#5b6b7a;margin-top:2px">Garmendia: 1er mes</div>'
      +   '</div>'
      + '</div>'

      + '<div style="display:flex;justify-content:space-between;font-size:9.5px;color:#5b6b7a;padding-top:10px;border-top:2px solid #0f1c28">'
      +   '<span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2f9e63;border:1.5px solid #0f1c28;margin-right:5px;vertical-align:1px"></span>Conectado</span>'
      +   '<span>Admin CEOT · 2026</span>'
      + '</div>'

      + '</div></div>';
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
      + '<span style="font-size:1.2rem;font-weight:800;color:#20241f">10</span>'
      + '<div style="font-size:9.5px;color:rgba(32,36,31,0.3);margin-top:2px">Garmendia: 1er mes</div>'
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
  admHomeRenderResults();
  coInitScrollFade("admMesStripScroll", "admMesStripWrap");
  if (retro) initAdmHomeBg(); else stopAdmHomeBg();
}

// ══════ FONDO ANIMADO — VISTA RETRO (nodos flotando en el cielo) ═════
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

  // Sprites 8-bit propios (no son de Nintendo): 5px de ancho, 7 de alto, 2 cuadros de caminata.
  var WALK_FRAMES = [
    [".###.",".###.","#####",".###.",".###.",".#.#.","#...#"],
    [".###.",".###.","#####",".###.",".###.",".###.",".#.#."]
  ];
  function makeWalkers() {
    var n = width < 520 ? 1 : 2;
    walkers = [];
    for (var i = 0; i < n; i++) {
      walkers.push({
        x: Math.random() * Math.max(width, 1),
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: 0.13 + Math.random() * 0.12,
        phase: Math.floor(Math.random() * 100),
        kind: i % 2
      });
    }
  }
  function updateGroundY() {
    var card = document.getElementById("admHeroCard");
    if (!card) { groundY = Math.min(120, height - 14); return; }
    var cy = card.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top;
    // Caminan en el hueco entre la tarjeta hero y el título "DASH BOARD".
    groundY = Math.max(18, Math.min(cy + 22, height - 14));
  }
  function drawWalker(w) {
    var s = 3;
    var frame = WALK_FRAMES[Math.floor(w.phase / 7) % 2];
    var topY = groundY - frame.length * s;
    var px = Math.round(w.x);
    ctx.fillStyle = "rgba(" + (w.kind ? "31,58,46" : INK) + ",0.82)";
    for (var r = 0; r < frame.length; r++) {
      var row = frame[r];
      for (var c = 0; c < row.length; c++) {
        if (row[c] === ".") continue;
        var cx = w.dir > 0 ? c : (row.length - 1 - c);
        ctx.fillRect(px + cx * s, topY + r * s, s, s);
      }
    }
    ctx.fillStyle = "rgba(" + GOLD + ",0.9)";       // cabecita rosa (2 filas de alto)
    ctx.fillRect(px + s, topY, 3 * s, 2 * s);
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
      w.phase += w.speed * 4;   // cadencia del paso atada a la velocidad
      if (w.x < -24) w.x = width + 12;
      else if (w.x > width + 24) w.x = -12;
      if (Math.random() < 0.0009) w.dir *= -1;
    }
    draw();
    _admHomeBgRaf = requestAnimationFrame(tick);
  }
  _admHomeBgRaf = requestAnimationFrame(tick);
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

function checklistMesKey(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function checklistCargarEstado() {
  try { return JSON.parse(localStorage.getItem("ceot_checklist_done") || "{}"); }
  catch (e) { return {}; }
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
  var ringColor  = vencidos > 0 ? (retro ? "#e05252" : "#b13a2c") : (retro ? "#2f7de0" : "#1f3a2e");
  var trackColor = retro ? "rgba(15,28,40,.18)" : "rgba(31,58,46,.18)";
  var textColor  = retro ? "#1c2b3a" : "#1f3a2e";

  if (retro) {
    btn.style.cssText = "background:#fffaf1;color:" + textColor + ";border:2px solid #0f1c28;border-radius:8px;padding:5px 11px;font-weight:700;box-shadow:0 2px 0 #0f1c28;font-family:inherit;cursor:pointer";
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
  cerrarAdmSidenav();
  admDesactivarSidebar();
  ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"].forEach(function(p) {
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
  ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"].forEach(function(p) {
    var t = document.getElementById("adm-tab-" + p);
    if (t) t.className = "adm-tab";
  });
  var sp = document.getElementById("adm-sidenav-pendientes");
  if (sp) sp.className = "adm-sidenav-btn active";

  var periodos = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  var labels   = {enero:"Ene",febrero:"Feb",marzo:"Mar",abril:"Abr",mayo:"Mayo",junio:"Jun",julio:"Jul",agosto:"Ago",septiembre:"Sep",octubre:"Oct",noviembre:"Nov",diciembre:"Dic"};
  var rawMap   = {febrero:FEBRERO_RAW,marzo:MARZO_RAW,abril:ABRIL_RAW,mayo:MAYO_RAW,junio:JUNIO_RAW,julio:JULIO_RAW,agosto:AGOSTO_RAW,
                  septiembre:SEPTIEMBRE_RAW,octubre:OCTUBRE_RAW,noviembre:NOVIEMBRE_RAW,diciembre:DICIEMBRE_RAW};

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
    html += '<td style="font-weight:700">' + labels[pid] + ' 2026</td>';
    html += cel3(colonN, ref) + cel3(osdeN, ref) + cel3(cmN, ref) + cel(tieneIIBB) + cel(tieneCPSM) + cel(tieneGA);
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  html += '<div style="font-size:0.7rem;color:rgba(32,36,31,.4);margin-top:10px">✓ completo &nbsp;·&nbsp; <span style="color:#92610f">◐</span> parcial (faltan profesionales) &nbsp;·&nbsp; · sin cargar</div>';
  document.getElementById("adm-content").innerHTML = html;
}

