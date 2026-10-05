// ═══════════════════════════════════════════════════════════════════
// estadisticas-export.js — exporta el módulo "Estadísticas CEOT".
//   · PDF  → una hoja por vista: Consultas y Cirugías.
//   · JPG  → la vista que se está mirando, en una sola imagen.
// Cada hoja se arma con el mismo #estRoot que ya está en pantalla: se
// ocultan los controles (botones de vista, importador), se le pone un
// encabezado de comprobante, se le fija el ancho de hoja y se captura
// con html2canvas. Al terminar queda todo como estaba.
// La orientación de cada hoja (apaisada o vertical) sale de la
// proporción de lo capturado, así siempre entra en UNA hoja usando el
// máximo de papel posible.
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

// Último mes de 2026 con dato cargado, para el encabezado.
function estExpUltimoMes(vista) {
  try {
    var mat = (vista === "cirugias") ? estCxMatriz2026() : estConsMatriz2026();
    var meses = estMesesConDato(estTotalPorMes(mat));
    if (!meses.length) return "";
    return estCap(EST_MESES[meses[meses.length - 1]]) + " 2026";
  } catch (e) { return ""; }
}

// ── botones (van en el encabezado del módulo) ─────────────────────
function estExpBotones() {
  var base = "padding:7px 13px;border-radius:9px;border:1px solid var(--co-line,#d9d0b8);"
    + "background:var(--co-card,#fbf8f0);color:var(--co-ink,#20241f);"
    + "font-size:0.78rem;font-weight:700;cursor:pointer";
  return '<button onclick="estExportar(\'pdf\')" title="Las dos vistas: una hoja de Consultas y una de Cirugías" style="' + base + '">PDF</button>'
    + '<button onclick="estExportar(\'jpg\')" title="La vista que estás mirando, como imagen" style="' + base + '">JPG</button>';
}

// ── encabezado de la hoja exportada ───────────────────────────────
function estExpCabecera(vista) {
  var ultimo = estExpUltimoMes(vista);
  var d = document.createElement("div");
  d.setAttribute("data-est-cab", "1");
  d.style.cssText = "margin:0 0 18px;padding:0 0 10px;border-bottom:2px solid #20241f";
  d.innerHTML =
    '<div style="font-family:Georgia,\'Iowan Old Style\',\'Times New Roman\',serif;'
    + 'font-size:1.5rem;font-weight:700;letter-spacing:.01em;color:#1f3a2e">'
    + 'Estadísticas CEOT &mdash; ' + estExpTitulo(vista) + '</div>'
    + '<div style="margin-top:4px;font-size:0.78rem;color:#6b6a5a">Año 2026'
    + (ultimo ? ' &middot; datos hasta ' + ultimo : '')
    + ' &middot; emitido el ' + estExpHoy() + '</div>';
  return d;
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
function estExpEsperarPintado(cb) {
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { setTimeout(cb, 200); });
  });
}

// ── captura de una vista ──────────────────────────────────────────
// Devuelve (por callback) un <canvas> con la hoja, o null si falló.
function estExpCapturar(vista, cb) {
  estVista = vista;
  estPintarAdmin();

  var root = document.getElementById("estRoot");
  if (!root) { cb(null); return; }

  // Lo que no va al documento: título con los botones, aviso de Chart,
  // y el bloque de importación.
  var ocultos = root.querySelectorAll("[data-est-skip]");
  for (var i = 0; i < ocultos.length; i++) ocultos[i].style.display = "none";

  root.insertBefore(estExpCabecera(vista), root.firstChild);

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

// ── descarga de un dataURL ────────────────────────────────────────
function estExpBajar(dataUrl, nombre) {
  var a = document.createElement("a");
  a.href = dataUrl;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── punto de entrada ──────────────────────────────────────────────
// formato: "pdf" (las dos vistas, una hoja cada una) | "jpg" (la vista actual)
function estExportar(formato) {
  if (estExpEnCurso) return;

  if (typeof html2canvas !== "function") {
    alert("La librería de captura todavía se está cargando. Esperá un segundo y volvé a intentar.");
    return;
  }
  if (formato === "pdf" && !window.jspdf) {
    alert("La librería PDF todavía se está cargando. Esperá un segundo y volvé a intentar.");
    return;
  }

  estExpEnCurso = true;
  var vistaOriginal = estVista;
  var temaOriginal = document.documentElement.getAttribute("data-theme");
  var animOriginal = (window.Chart && Chart.defaults) ? Chart.defaults.animation : null;

  // El documento se imprime en papel: siempre tema claro y sin animación
  // (si no, html2canvas captura los gráficos a mitad de dibujo).
  document.documentElement.setAttribute("data-theme", "light");
  if (window.Chart && Chart.defaults) Chart.defaults.animation = false;
  window.scrollTo(0, 0);

  var vistas = (formato === "pdf") ? ["consultas", "cirugias"] : [vistaOriginal];
  var hojas = [];

  var terminar = function () {
    if (temaOriginal) document.documentElement.setAttribute("data-theme", temaOriginal);
    else document.documentElement.removeAttribute("data-theme");
    if (window.Chart && Chart.defaults) Chart.defaults.animation = animOriginal;
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
      if (formato === "pdf") estExpArmarPDF(hojas);
      else estExpBajar(hojas[0].canvas.toDataURL("image/jpeg", 0.92),
        "CEOT-estadisticas-" + hojas[0].vista + "-" + estExpSelloArchivo() + ".jpg");
      terminar();
      return;
    }
    estExpTapar("Generando " + estExpTitulo(vistas[i]) + "…");
    estExpCapturar(vistas[i], function (canvas) {
      if (canvas) hojas.push({ vista: vistas[i], canvas: canvas });
      siguiente(i + 1);
    });
  };

  estExpTapar("Generando…");
  // Un respiro para que el cartel se pinte antes de empezar a trabajar.
  estExpEsperarPintado(function () { siguiente(0); });
}

// ── PDF: una hoja A4 por vista, orientación según la proporción ───
function estExpArmarPDF(hojas) {
  var jsPDF = window.jspdf.jsPDF;
  var doc = null;

  for (var i = 0; i < hojas.length; i++) {
    var c = hojas[i].canvas;
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

  doc.save("CEOT-estadisticas-" + estExpSelloArchivo() + ".pdf");
}
