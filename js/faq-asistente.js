// ══════ FAQ DEL ASISTENTE ════════════════════════════════════════
// Base de conocimiento del bot del Portal Profesionales (ver js/asistente.js).
// Se guarda en localStorage["ceot_faq_asistente"] y se sincroniza (SYNC_ENDPOINT)
// para que todos vean lo mismo. Marcelo la edita desde el panel admin
// (renderFaqAsistente). Si no hay nada guardado, se usa ASISTENTE_FAQ_FALLBACK.

var ASISTENTE_FAQ_FALLBACK = {
  actualizado: "2026-09-08",
  licencia: {
    texto: "Marcelo está de licencia del 9 al 27 de octubre de 2026 (vuelve el 28). "
      + "Durante ese período: (1) el procesamiento de la liquidación mensual (OSDE + ART + Colón) se hace recién al regreso — solo lo puede correr Marcelo — así que el circuito de pagos se atrasa unos 5 días hábiles y cae a principios de noviembre; esto arrastra el cheque de OSDE, los diferidos a 60 días, el descuento de CPSM y el cálculo del % de retenciones. "
      + "(2) Los honorarios del 4º y 5º cheque se acumulan y se transfieren al regreso: si tu cobro de octubre está demorado, es una demora prevista, no un error. "
      + "(3) El depósito de cheques semanal lo hace Marcela con el cadete, sin interrupción. "
      + "(4) La CC de Clínica Colón y la facturación quedan a cargo de Elizabeth. "
      + "(5) Sueldos, cargas y sindicatos se pagaron antes del 9, con el estudio contable (Lorena). "
      + "Para algo urgente que no pueda esperar al 28, contactá a administración (Marcela)."
  },
  categorias: [
    {
      id: "descuentos",
      titulo: "Descuentos de la liquidación",
      items: [
        { q: "¿Qué es el descuento de Gastos A?", a: "Es el aporte de cada profesional a los gastos de estructura del CEOT. Se calcula como el total de Gastos A del mes dividido por la cantidad de socios, y se descuenta del cheque del mes para cubrir los gastos del mes siguiente. El monto exacto sale de tu liquidación." },
        { q: "¿Qué es IIBB y de qué cheque sale?", a: "Ingresos Brutos: retención impositiva provincial del 3,5% sobre el bruto del mes. Se reserva del 4º cheque del mes. El monto figura en tu liquidación." },
        { q: "¿Qué es CPSM?", a: "Aporte obligatorio a la Caja de Previsión y Seguro Médico de la Provincia de Buenos Aires. La clínica lo retiene y lo deposita en tu nombre. Se descuenta del 5º cheque. Algunos profesionales están exentos (figura como EXENTO en la liquidación)." },
        { q: "¿Qué es la Retención Ganancias que aparece desde agosto?", a: "Es un porcentaje que se reserva de cada acreditación (cheques Colón, OSDE y CEM) para impuestos y previsión. El porcentaje es propio de cada profesional. Se aplica desde agosto de 2026. El monto y el % figuran en tu liquidación." },
        { q: "¿Qué es el Préstamo Casa 14 de Julio 2067?", a: "Para los socios del grupo B es una cuota que se descuenta del primer cheque del mes. Para los socios del grupo A es un reintegro (se suma). El número de cuota y el monto figuran en tu liquidación." }
      ]
    },
    {
      id: "cheques",
      titulo: "Cheques y fechas de cobro",
      items: [
        { q: "¿Cuántos cheques cobro por mes y en qué orden?", a: "5 cheques Colón, más la acreditación de Centro Médico (CEM) y el cheque de OSDE. Orden real: primero CEM (liquidación del mes anterior), después los cheques Colón 1 a 4, el de OSDE se intercala entre el 4º y el 5º, y por último el cheque 5." },
        { q: "¿Cuándo se acredita cada cheque?", a: "Aproximadamente 48 horas después de la fecha indicada en tu liquidación. El cheque de OSDE es al día (del mes que se cobra). Los de ART y los diferidos van al mes de vencimiento (60 días)." },
        { q: "¿Qué significa 'en la cuenta del CEOT' vs 'transferido'?", a: "En la cuenta del CEOT: el cheque ya se acreditó en la cuenta de la clínica y está listo para transferirte. Transferido: la plata ya está en tu cuenta. El estado por mes lo marca administración." },
        { q: "¿Por qué mi cobro de octubre está demorado?", a: "Por la licencia de Marcelo (9 al 27 de octubre). El procesamiento de la liquidación mensual solo lo puede hacer él y se corre al regreso, así que el circuito completo (OSDE, diferidos, CPSM, retenciones) se atrasa unos 5 días hábiles y cae a principios de noviembre. Es una demora prevista." }
      ]
    },
    {
      id: "familiares",
      titulo: "Transferencias a familiares",
      items: [
        { q: "¿Puedo pedir que parte de mi honorario vaya a un familiar?", a: "Sí. Administración carga el alias/CBU del familiar y el importe, y en tu liquidación ves el detalle: cuánto va a tu cuenta y cuánto a tu familiar, cheque por cheque. Se puede combinar el importe de varios cheques en una sola transferencia." }
      ]
    },
    {
      id: "contacto",
      titulo: "A quién recurrir",
      items: [
        { q: "¿Con quién hablo si el asistente no sabe la respuesta?", a: "Con administración. Durante la licencia de octubre: Marcela (cuenta, transferencias, depósitos), Elizabeth (facturación y CC Clínica Colón). Marcelo vuelve el 28 de octubre para lo que requiera su intervención directa." }
      ]
    }
  ]
};

function faqAsistCargar() {
  try {
    var raw = localStorage.getItem("ceot_faq_asistente");
    return raw ? (JSON.parse(raw) || ASISTENTE_FAQ_FALLBACK) : ASISTENTE_FAQ_FALLBACK;
  } catch (e) { return ASISTENTE_FAQ_FALLBACK; }
}
function faqAsistGuardar(obj) {
  obj.actualizado = new Date().toISOString().slice(0, 10);
  try { localStorage.setItem("ceot_faq_asistente", JSON.stringify(obj)); } catch (e) {}
  if (typeof syncPush === "function") syncPush("ceot_faq_asistente");
}

var _faqAsistEdit = null;
var _faqAsistPulled = false;

function renderFaqAsistente() {
  if (typeof cerrarAdmSidenav === "function") cerrarAdmSidenav();
  if (typeof admDesactivarSidebar === "function") admDesactivarSidebar();
  var btn = document.getElementById("adm-sidenav-faqasistente");
  if (btn) btn.className = "adm-sidenav-btn active";

  if (!_faqAsistEdit) _faqAsistEdit = JSON.parse(JSON.stringify(faqAsistCargar()));
  if (!_faqAsistPulled && typeof syncPull === "function") {
    _faqAsistPulled = true;
    syncPull("ceot_faq_asistente", function () {
      _faqAsistEdit = JSON.parse(JSON.stringify(faqAsistCargar()));
      if (document.getElementById("faqAsistRoot")) renderFaqAsistente();
    });
  }

  var e = _faqAsistEdit;
  if (!e.categorias) e.categorias = [];
  if (!e.licencia) e.licencia = { texto: "" };

  var inp = "width:100%;padding:7px 9px;border:1px solid rgba(32,36,31,.2);border-radius:7px;font-size:0.82rem;font-family:inherit;background:#fff;color:#20241f;box-sizing:border-box";
  var ta = inp + ";min-height:70px;line-height:1.5;resize:vertical";

  var html = '<div id="faqAsistRoot" style="padding:16px;max-width:820px;margin:0 auto">'
    + '<h2 style="margin:0 0 4px">🤖 FAQ del asistente</h2>'
    + '<div style="font-size:.8rem;color:rgba(32,36,31,.55);margin-bottom:16px">La base de conocimiento del bot del Portal Profesionales. El bot responde con esto y con los datos de la liquidación de cada profesional; lo que no está acá lo deriva a administración.</div>';

  html += '<div style="background:#fff;border:1px solid rgba(32,36,31,.14);border-radius:10px;padding:14px;margin-bottom:14px">'
    + '<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:rgba(32,36,31,.5);margin-bottom:8px">Estado de la licencia</div>'
    + '<div style="font-size:.7rem;color:rgba(32,36,31,.45);margin-bottom:8px">Se le pasa al bot en cada consulta. Dejalo vacío cuando no haya licencia en curso.</div>'
    + '<textarea data-faq="licencia" style="' + ta + ';min-height:120px">' + faqAsistEsc(e.licencia.texto || "") + '</textarea>'
    + '</div>';

  e.categorias.forEach(function (c, ci) {
    html += '<div style="background:#fff;border:1px solid rgba(32,36,31,.14);border-radius:10px;padding:14px;margin-bottom:12px">'
      + '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">'
      + '<input data-faq="cat-titulo" data-ci="' + ci + '" value="' + faqAsistEsc(c.titulo || "") + '" placeholder="Título de la categoría" style="' + inp + ';font-weight:700">'
      + '<button onclick="faqAsistQuitarCat(' + ci + ')" title="Quitar categoría" style="flex-shrink:0;background:rgba(177,72,63,.12);color:#b1483f;border:none;border-radius:7px;width:30px;height:32px;cursor:pointer;font-size:0.9rem">✕</button>'
      + '</div>';
    (c.items || []).forEach(function (it, ii) {
      html += '<div style="border-top:1px solid rgba(32,36,31,.08);padding:10px 0">'
        + '<div style="display:flex;gap:8px;align-items:flex-start">'
        + '<div style="flex:1">'
        + '<input data-faq="q" data-ci="' + ci + '" data-ii="' + ii + '" value="' + faqAsistEsc(it.q || "") + '" placeholder="Pregunta" style="' + inp + ';margin-bottom:6px">'
        + '<textarea data-faq="a" data-ci="' + ci + '" data-ii="' + ii + '" placeholder="Respuesta" style="' + ta + '">' + faqAsistEsc(it.a || "") + '</textarea>'
        + '</div>'
        + '<button onclick="faqAsistQuitarItem(' + ci + ',' + ii + ')" title="Quitar" style="flex-shrink:0;background:rgba(177,72,63,.1);color:#b1483f;border:none;border-radius:7px;width:28px;height:30px;cursor:pointer;margin-top:2px">✕</button>'
        + '</div></div>';
    });
    html += '<button onclick="faqAsistAgregarItem(' + ci + ')" style="margin-top:8px;background:rgba(29,158,117,.12);color:#0f7a4f;border:none;border-radius:7px;padding:6px 12px;font-size:0.75rem;font-weight:600;cursor:pointer">+ Agregar pregunta</button>'
      + '</div>';
  });

  html += '<button onclick="faqAsistAgregarCat()" style="background:rgba(32,36,31,.06);border:1px dashed rgba(32,36,31,.25);color:rgba(32,36,31,.6);border-radius:9px;padding:9px 14px;font-size:0.78rem;font-weight:600;cursor:pointer;margin-bottom:16px">+ Agregar categoría</button>';

  html += '<div style="display:flex;gap:8px;border-top:1px solid rgba(32,36,31,.12);padding-top:14px">'
    + '<button onclick="faqAsistGuardarUI(this)" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.82rem;cursor:pointer">Guardar</button>'
    + '<button onclick="faqAsistRestablecer()" style="background:none;border:1px solid rgba(32,36,31,.2);color:rgba(32,36,31,.6);border-radius:8px;padding:9px 14px;font-size:0.78rem;cursor:pointer">Restablecer al borrador</button>'
    + '<span id="faqAsistMsg" style="font-size:0.78rem;color:#0f7a4f;align-self:center"></span>'
    + '</div>';

  html += '</div>';
  document.getElementById("adm-content").innerHTML = html;
}

function faqAsistEsc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Lee todos los campos del DOM al objeto de edición (antes de guardar o re-render).
function faqAsistLeerUI() {
  var e = _faqAsistEdit;
  var lic = document.querySelector('[data-faq="licencia"]');
  if (lic) e.licencia.texto = lic.value.trim();
  document.querySelectorAll('[data-faq="cat-titulo"]').forEach(function (el) {
    var ci = +el.dataset.ci;
    if (e.categorias[ci]) e.categorias[ci].titulo = el.value.trim();
  });
  document.querySelectorAll('[data-faq="q"]').forEach(function (el) {
    var ci = +el.dataset.ci, ii = +el.dataset.ii;
    if (e.categorias[ci] && e.categorias[ci].items[ii]) e.categorias[ci].items[ii].q = el.value.trim();
  });
  document.querySelectorAll('[data-faq="a"]').forEach(function (el) {
    var ci = +el.dataset.ci, ii = +el.dataset.ii;
    if (e.categorias[ci] && e.categorias[ci].items[ii]) e.categorias[ci].items[ii].a = el.value.trim();
  });
}
function faqAsistAgregarCat() {
  faqAsistLeerUI();
  _faqAsistEdit.categorias.push({ id: "cat" + Date.now(), titulo: "", items: [{ q: "", a: "" }] });
  renderFaqAsistente();
}
function faqAsistQuitarCat(ci) {
  faqAsistLeerUI();
  _faqAsistEdit.categorias.splice(ci, 1);
  renderFaqAsistente();
}
function faqAsistAgregarItem(ci) {
  faqAsistLeerUI();
  if (_faqAsistEdit.categorias[ci]) _faqAsistEdit.categorias[ci].items.push({ q: "", a: "" });
  renderFaqAsistente();
}
function faqAsistQuitarItem(ci, ii) {
  faqAsistLeerUI();
  if (_faqAsistEdit.categorias[ci]) _faqAsistEdit.categorias[ci].items.splice(ii, 1);
  renderFaqAsistente();
}
function faqAsistRestablecer() {
  if (!confirm("Descartar los cambios y volver al borrador original?")) return;
  _faqAsistEdit = JSON.parse(JSON.stringify(ASISTENTE_FAQ_FALLBACK));
  renderFaqAsistente();
}
function faqAsistGuardarUI(btn) {
  faqAsistLeerUI();
  // limpia items vacíos
  _faqAsistEdit.categorias.forEach(function (c) {
    c.items = (c.items || []).filter(function (it) { return (it.q || "").trim() || (it.a || "").trim(); });
  });
  _faqAsistEdit.categorias = _faqAsistEdit.categorias.filter(function (c) { return (c.titulo || "").trim() || (c.items || []).length; });
  faqAsistGuardar(_faqAsistEdit);
  var msg = document.getElementById("faqAsistMsg");
  if (msg) { msg.textContent = "✓ Guardado y sincronizado"; setTimeout(function () { if (msg) msg.textContent = ""; }, 3000); }
  if (typeof actionFeedback === "function") actionFeedback(btn);
}
