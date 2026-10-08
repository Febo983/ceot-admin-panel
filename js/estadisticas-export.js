// ═══════════════════════════════════════════════════════════════════
// estadisticas-export.js — exporta el módulo "Estadísticas CEOT".
//
//   Panel admin     → PDF (una hoja de Consultas + una de Cirugías)
//                     JPG (la vista que se está mirando).
//   Portal del prof → PDF / JPG con UNA hoja, solo con sus números.
//                     La hoja del profesional NO lleva nada del total
//                     del servicio (ni su participación ni su puesto en
//                     el ranking): eso lo sigue viendo en pantalla, pero
//                     no viaja en un archivo descargado.
//
// Cómo funciona: se captura con html2canvas el mismo bloque que ya está
// en pantalla. Antes de la captura se ocultan los controles y lo que no
// va al documento ([data-est-skip]), se agrega un encabezado de
// comprobante, se fija el ancho de hoja y la grilla de gráficos a dos
// columnas. Al terminar queda todo como estaba.
// La orientación de cada hoja sale de la proporción de lo capturado, así
// entra en UNA hoja usando el máximo de papel posible.
// Solo definiciones — se carga DESPUÉS de js/estadisticas.js.
// ═══════════════════════════════════════════════════════════════════

var EST_EXP_ANCHO  = 1100;   // ancho de "hoja" en px para la captura
var EST_EXP_ESCALA = 2;      // 2x: el texto no sale borroso al imprimir
var EST_EXP_MARGEN = 8;      // margen de la hoja, en mm
var estExpEnCurso  = false;

// ── helpers ───────────────────────────────────────────────────────
function estExpDosDig(n) { return (n < 10 ? "0" : "") + n; }

function estExpHoy() {
  var d = new Date();
  return estExpDosDig(d.getDate()) + "/" + estExpDosDig(d.getMonth() + 1) + "/" + d.getFullYear();
}

function estExpSelloArchivo() {
  var d = new Date();
  return d.getFullYear() + "-" + estExpDosDig(d.getMonth() + 1) + "-" + estExpDosDig(d.getDate());
}

function estExpTitulo(vista) { return vista === "cirugias" ? "Cirugías" : "Consultas"; }

// "DR. DE LA COLINA" → "Dr. De La Colina"
function estExpNombreLindo(s) {
  return String(s || "").toLowerCase().replace(/(^|[\s.])([a-záéíóúñ])/g, function (m, pre, letra) {
    return pre + letra.toUpperCase();
  });
}

function estExpSlug(s) {
  return String(s || "").toLowerCase()
    .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Último mes de 2026 con dato cargado, para el encabezado.
function estExpUltimoMes(vista) {
  try {
    var mat = (vista === "cirugias") ? estCxMatriz2026() : estConsMatriz2026();
    var meses = estMesesConDato(estTotalPorMes(mat));
    if (!meses.length) return "";
    return estCap(EST_MESES[meses[meses.length - 1]]) + " 2026";
  } catch (e) { return ""; }
}

// ── botones ───────────────────────────────────────────────────────
function estExpEstiloBoton() {
  return "padding:7px 13px;border-radius:9px;border:1px solid var(--co-line,#d9d0b8);"
    + "background:var(--co-card,#fbf8f0);color:var(--co-ink,#20241f);"
    + "font-size:0.78rem;font-weight:700;cursor:pointer";
}

function estExpBotones() {
  var e = estExpEstiloBoton();
  return '<button onclick="estExportar(\'pdf\')" title="Las dos vistas: una hoja de Consultas y una de Cirugías" style="' + e + '">PDF</button>'
    + '<button onclick="estExportar(\'jpg\')" title="La vista que estás mirando, como imagen" style="' + e + '">JPG</button>';
}

function estExpBotonesProf() {
  var e = estExpEstiloBoton();
  return '<button onclick="estExportarProf(\'pdf\')" title="Mis estadísticas en una hoja PDF" style="' + e + '">PDF</button>'
    + '<button onclick="estExportarProf(\'jpg\')" title="Mis estadísticas como imagen" style="' + e + '">JPG</button>';
}

// ── encabezado de la hoja exportada ───────────────────────────────
function estExpCabeceraNodo(titulo, bajada) {
  var d = document.createElement("div");
  d.setAttribute("data-est-cab", "1");
  d.style.cssText = "margin:0 0 18px;padding:0 0 10px;border-bottom:2px solid #20241f";
  d.innerHTML =
    '<div style="font-family:Georgia,\'Iowan Old Style\',\'Times New Roman\',serif;'
    + 'font-size:1.5rem;font-weight:700;letter-spacing:.01em;color:#1f3a2e">' + titulo + '</div>'
    + '<div style="margin-top:4px;font-size:0.78rem;color:#6b6a5a">' + bajada + '</div>';
  return d;
}

function estExpCabecera(vista) {
  var ultimo = estExpUltimoMes(vista);
  return estExpCabeceraNodo(
    'Estadísticas CEOT &mdash; ' + estExpTitulo(vista),
    'Año 2026' + (ultimo ? ' &middot; datos hasta ' + ultimo : '') + ' &middot; emitido el ' + estExpHoy()
  );
}

function estExpCabeceraProf(doctor) {
  var ultimo = estExpUltimoMes("consultas");
  return estExpCabeceraNodo(
    'Estadísticas CEOT &mdash; ' + estExpNombreLindo(doctor && doctor.nombre ? doctor.nombre : ""),
    'Mis consultas y cirugías &middot; año 2026'
    + (ultimo ? ' &middot; datos hasta ' + ultimo : '') + ' &middot; emitido el ' + estExpHoy()
  );
}

// ── cartel "generando" (tapa el reacomodo de la pantalla) ──────────
function estExpTapar(texto) {
  var ov = document.getElementById("estExpOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "estExpOverlay";
    ov.style.cssText = "position:fixed;inset:0;z-index:4000;background:#f2ecda;"
      + "display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;"
      + "font-family:Georgia,'Times New Roman',serif;color:#1f3a2e";
    document.body.appendChild(ov);
  }
  ov.innerHTML = '<div style="font-size:1.2rem;font-weight:700">' + texto + '</div>'
    + '<div style="font-family:system-ui,sans-serif;font-size:0.8rem;color:#6b6a5a">'
    + 'No cierres la pestaña.</div>';
  return ov;
}
function estExpDestapar() {
  var ov = document.getElementById("estExpOverlay");
  if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
}

// Dos frames + un respiro: le da tiempo a Chart.js a redibujar.
//
// requestAnimationFrame NO se dispara mientras la pestaña no está visible
// (el usuario se cambió a otra pestaña, minimizó la ventana, cambió de
// escritorio). La exportación tarda unos segundos, así que era muy fácil
// irse a otra pestaña mientras generaba y que quedara colgada para siempre
// en "Generando…", con el cartel tapando toda la pantalla y sin forma de
// salir más que recargando. Se espera el frame igual (cuando se ve, es
// instantáneo) pero con un setTimeout de respaldo: gana el que llegue
// primero y el callback corre una sola vez.
function estExpUnFrame(cb) {
  var corrido = false;
  var una = function () {
    if (corrido) return;
    corrido = true;
    cb();
  };
  requestAnimationFrame(una);
  setTimeout(una, 120);
}

function estExpEsperarPintado(cb) {
  estExpUnFrame(function () {
    estExpUnFrame(function () { setTimeout(cb, 200); });
  });
}

// ── captura de una hoja ───────────────────────────────────────────
// opts = { rootId, cabecera, repintar }
//   repintar: función que deja el bloque en pantalla antes de capturar
//             (el admin la usa para cambiar de vista). Puede faltar.
// Devuelve (por callback) un <canvas> con la hoja, o null si falló.
function estExpCapturar(opts, cb) {
  if (opts.repintar) opts.repintar();

  var root = document.getElementById(opts.rootId);
  if (!root) { cb(null); return; }

  // Lo que no va al documento: títulos con botones, avisos, el bloque de
  // importación y, en la hoja del profesional, todo lo del servicio.
  var ocultos = root.querySelectorAll("[data-est-skip]");
  for (var i = 0; i < ocultos.length; i++) ocultos[i].style.display = "none";

  root.insertBefore(opts.cabecera, root.firstChild);

  // Grilla de gráficos a dos columnas fijas: queda de documento, no
  // depende del ancho de la ventana de quien exporta.
  // min-width:0 en cada tarjeta es imprescindible: por defecto una celda de
  // grid no se achica por debajo de su contenido, y como el <canvas> trae el
  // ancho que tenía en pantalla, la columna no entraría en la hoja y el
  // gráfico saldría cortado.
  var grillas = root.querySelectorAll("[data-est-grid]");
  var celdas = [];
  for (var g = 0; g < grillas.length; g++) {
    grillas[g].style.gridTemplateColumns = "1fr 1fr";
    grillas[g].style.alignItems = "start";
    var hijos = grillas[g].children;
    for (var c = 0; c < hijos.length; c++) {
      celdas.push(hijos[c]);
      hijos[c].style.minWidth = "0";
    }
  }

  var estiloPrevio = root.getAttribute("style") || "";
  root.setAttribute("style", estiloPrevio
    + ";width:" + EST_EXP_ANCHO + "px;max-width:none;box-sizing:border-box;"
    + "padding:26px;background:#f2ecda");

  var restaurar = function () {
    root.setAttribute("style", estiloPrevio);
    var cab = root.querySelector("[data-est-cab]");
    if (cab && cab.parentNode) cab.parentNode.removeChild(cab);
    for (var j = 0; j < ocultos.length; j++) ocultos[j].style.display = "";
    for (var h = 0; h < grillas.length; h++) {
      grillas[h].style.gridTemplateColumns = "";
      grillas[h].style.alignItems = "";
    }
    for (var n = 0; n < celdas.length; n++) celdas[n].style.minWidth = "";
  };

  // Chart.js es responsive, pero el <canvas> conserva el ancho que tenía en
  // pantalla: hay que borrárselo y recién ahí pedirle que se remida.
  var lienzos = root.querySelectorAll("canvas");
  for (var q = 0; q < lienzos.length; q++) {
    lienzos[q].style.width = "";
    lienzos[q].style.height = "";
  }

  estExpEsperarPintado(function () {
    for (var k in estChartInstances) {
      if (estChartInstances[k] && estChartInstances[k].resize) estChartInstances[k].resize();
    }
    estExpEsperarPintado(function () {
      html2canvas(root, {
        scale: EST_EXP_ESCALA,
        backgroundColor: "#f2ecda",
        logging: false,
        useCORS: true,
        scrollX: 0,
        scrollY: -window.scrollY
      }).then(function (canvas) {
        restaurar();
        cb(canvas);
      })["catch"](function (e) {
        console.error("estExpCapturar", e);
        restaurar();
        cb(null);
      });
    });
  });
}

// ── descarga ──────────────────────────────────────────────────────
function estExpBajar(dataUrl, nombre) {
  var a = document.createElement("a");
  a.href = dataUrl;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── librerías listas ──────────────────────────────────────────────
function estExpLibrosListos(formato) {
  if (typeof html2canvas !== "function") {
    alert("La librería de captura todavía se está cargando. Esperá un segundo y volvé a intentar.");
    return false;
  }
  if (formato === "pdf" && !window.jspdf) {
    alert("La librería PDF todavía se está cargando. Esperá un segundo y volvé a intentar.");
    return false;
  }
  return true;
}

// Deja el documento listo para capturar: tema claro (se imprime en papel) y
// sin animación de Chart.js (si no html2canvas agarra los gráficos a mitad
// de dibujo). Devuelve la función que restaura todo.
function estExpModoDocumento() {
  var temaOriginal = document.documentElement.getAttribute("data-theme");
  var animOriginal = (window.Chart && Chart.defaults) ? Chart.defaults.animation : null;
  document.documentElement.setAttribute("data-theme", "light");
  if (window.Chart && Chart.defaults) Chart.defaults.animation = false;
  window.scrollTo(0, 0);
  return function () {
    if (temaOriginal) document.documentElement.setAttribute("data-theme", temaOriginal);
    else document.documentElement.removeAttribute("data-theme");
    if (window.Chart && Chart.defaults) Chart.defaults.animation = animOriginal;
  };
}

// ══════ ADMIN ═════════════════════════════════════════════════════
// formato: "pdf" (las dos vistas, una hoja cada una) | "jpg" (la vista actual)
function estExportar(formato) {
  if (estExpEnCurso || !estExpLibrosListos(formato)) return;
  estExpEnCurso = true;

  var vistaOriginal = estVista;
  var salirModoDoc = estExpModoDocumento();
  var vistas = (formato === "pdf") ? ["consultas", "cirugias"] : [vistaOriginal];
  var hojas = [];

  var terminar = function () {
    salirModoDoc();
    estVista = vistaOriginal;
    estPintarAdmin();
    estExpDestapar();
    estExpEnCurso = false;
  };

  var siguiente = function (i) {
    if (i >= vistas.length) {
      if (!hojas.length) {
        terminar();
        alert("No se pudo generar la exportación. Probá recargar la página.");
        return;
      }
      if (formato === "pdf") {
        estExpArmarPDF(hojas, "CEOT-estadisticas-" + estExpSelloArchivo() + ".pdf");
      } else {
        estExpBajar(hojas[0].toDataURL("image/jpeg", 0.92),
          "CEOT-estadisticas-" + vistas[0] + "-" + estExpSelloArchivo() + ".jpg");
      }
      terminar();
      return;
    }
    estExpTapar("Generando " + estExpTitulo(vistas[i]) + "…");
    (function (vista) {
      estExpCapturar({
        rootId: "estRoot",
        cabecera: estExpCabecera(vista),
        repintar: function () { estVista = vista; estPintarAdmin(); }
      }, function (canvas) {
        if (canvas) hojas.push(canvas);
        siguiente(i + 1);
      });
    })(vistas[i]);
  };

  estExpTapar("Generando…");
  estExpEsperarPintado(function () { siguiente(0); });
}

// ══════ PORTAL DEL PROFESIONAL ════════════════════════════════════
// Una sola hoja, solo con sus números: lo del total del servicio queda
// marcado con data-est-skip en estPintarProf() y no entra en la captura.
function estExportarProf(formato) {
  if (estExpEnCurso || !estExpLibrosListos(formato)) return;

  var doctor = estProfDoctor;
  if (!doctor) { alert("No pudimos identificar al profesional. Recargá la página."); return; }

  estExpEnCurso = true;
  var salirModoDoc = estExpModoDocumento();

  var terminar = function () {
    salirModoDoc();
    estPintarProf(doctor);
    estExpDestapar();
    estExpEnCurso = false;
  };

  estExpTapar("Generando…");
  estExpEsperarPintado(function () {
    estExpCapturar({
      rootId: "estProfRoot",
      cabecera: estExpCabeceraProf(doctor),
      repintar: null
    }, function (canvas) {
      if (!canvas) {
        terminar();
        alert("No se pudo generar la exportación. Probá recargar la página.");
        return;
      }
      var base = "CEOT-estadisticas-" + estExpSlug(doctor.apellido) + "-" + estExpSelloArchivo();
      if (formato === "pdf") estExpArmarPDF([canvas], base + ".pdf");
      else estExpBajar(canvas.toDataURL("image/jpeg", 0.92), base + ".jpg");
      terminar();
    });
  });
}

// ── PDF: una hoja A4 por captura, orientación según la proporción ─
function estExpArmarPDF(hojas, nombre) {
  var jsPDF = window.jspdf.jsPDF;
  var doc = null;

  for (var i = 0; i < hojas.length; i++) {
    var c = hojas[i];
    var apaisada = c.width >= c.height;
    var orient = apaisada ? "landscape" : "portrait";
    var pw = apaisada ? 297 : 210;
    var ph = apaisada ? 210 : 297;

    if (!doc) doc = new jsPDF({ orientation: orient, unit: "mm", format: "a4" });
    else doc.addPage("a4", orient);

    var maxW = pw - EST_EXP_MARGEN * 2;
    var maxH = ph - EST_EXP_MARGEN * 2;
    var k = Math.min(maxW / c.width, maxH / c.height);
    var w = c.width * k;
    var h = c.height * k;

    doc.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG",
      (pw - w) / 2, (ph - h) / 2, w, h, undefined, "FAST");
  }

  doc.save(nombre);
}
