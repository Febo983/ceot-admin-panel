// ══════ ASISTENTE — WIDGET DEL PORTAL PROFESIONAL ═══════════════════
// El profesional pregunta; el cliente arma un contexto acotado (FAQ + estado de
// licencia; en Fase 2 se suma su liquidación) y lo manda al worker ceot-asistente.
// SOLO LECTURA: no ejecuta acciones, no marca nada. La FAQ vive en
// ASISTENTE_FAQ_FALLBACK / localStorage["ceot_faq_asistente"] (ver faq-asistente.js).

// Worker ceot-asistente (deployado 2026-09-08). Falta que el worker tenga el
// secret ANTHROPIC_API_KEY para que responda; hasta entonces devuelve error y el
// widget muestra "No pude responder ahora".
var ASISTENTE_ENDPOINT = "https://ceot-asistente.marcelo-aime74.workers.dev/preguntar";
var ASISTENTE_TOKEN    = "24329406395628a29005a882d6eb07a3c71f96cb8a95f9c5";  // mismo secret que el worker (queda público en el cliente: es un freno menor, no auth real)

var _asistDoctor   = null;
var _asistHist     = [];      // [{role:"user"|"assistant", text, err?}]
var _asistEnviando = false;
var _asistAbierto  = false;

function asistFaqObj() {
  try {
    var raw = localStorage.getItem("ceot_faq_asistente");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return (typeof ASISTENTE_FAQ_FALLBACK !== "undefined") ? ASISTENTE_FAQ_FALLBACK : { categorias: [], licencia: { texto: "" } };
}
function asistFaqTexto() {
  var f = asistFaqObj();
  var out = [];
  (f.categorias || []).forEach(function (c) {
    out.push("## " + (c.titulo || c.id || ""));
    (c.items || []).forEach(function (it) { out.push("P: " + it.q + "\nR: " + it.a); });
  });
  return out.join("\n\n");
}
function asistLicenciaTexto() {
  var f = asistFaqObj();
  return (f.licencia && f.licencia.texto) ? f.licencia.texto : "";
}
function asistChipsSugeridos() {
  var f = asistFaqObj(), chips = [];
  (f.categorias || []).forEach(function (c) {
    (c.items || []).forEach(function (it) { if (it.q && chips.length < 4) chips.push(it.q); });
  });
  return chips;
}

function asistMontar(doctor) {
  _asistDoctor = doctor;
  _asistHist = [];
  if (typeof syncPull === "function") syncPull("ceot_faq_asistente", function () {});
  if (document.getElementById("asistFab")) return;

  var fab = document.createElement("button");
  fab.id = "asistFab";
  fab.className = "asist-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "Abrir asistente");
  fab.textContent = "💬";
  fab.onclick = asistToggle;
  document.body.appendChild(fab);

  var panel = document.createElement("div");
  panel.id = "asistPanel";
  panel.className = "asist-panel";
  panel.hidden = true;
  panel.innerHTML = ''
    + '<div class="asist-head">'
    +   '<div class="asist-head-t"><b>Asistente CEOT</b><span>responde sobre tu liquidación y las normas</span></div>'
    +   '<span class="asist-ro">solo lectura</span>'
    +   '<button class="asist-x" type="button" aria-label="Cerrar" onclick="asistToggle()">✕</button>'
    + '</div>'
    + '<div class="asist-body" id="asistBody"></div>'
    + '<div class="asist-foot">'
    +   '<input id="asistInput" type="text" placeholder="Escribí tu pregunta…" autocomplete="off" onkeydown="if(event.key===\'Enter\')asistEnviar()">'
    +   '<button type="button" class="asist-send" aria-label="Enviar" onclick="asistEnviar()">➤</button>'
    + '</div>'
    + '<div class="asist-disc">No modifica datos ni recalcula montos: lee tu liquidación ya calculada y las FAQ. Ante diferencias, vale la liquidación oficial.</div>';
  document.body.appendChild(panel);

  asistRender();
}

function asistDesmontar() {
  ["asistFab", "asistPanel"].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); });
  _asistDoctor = null; _asistHist = []; _asistAbierto = false;
}

function asistToggle() {
  var p = document.getElementById("asistPanel"), fab = document.getElementById("asistFab");
  if (!p) return;
  _asistAbierto = p.hidden;
  p.hidden = !p.hidden;
  if (fab) fab.classList.toggle("open", _asistAbierto);
  if (_asistAbierto) {
    asistRender();
    var i = document.getElementById("asistInput");
    if (i) setTimeout(function () { i.focus(); }, 40);
  }
}

function asistChip(q) {
  var i = document.getElementById("asistInput");
  if (i) i.value = q;
  asistEnviar();
}

function asistEnviar(texto) {
  var i = document.getElementById("asistInput");
  texto = (texto || (i ? i.value : "") || "").trim();
  if (!texto || _asistEnviando) return;
  if (i) i.value = "";
  _asistHist.push({ role: "user", text: texto });
  _asistEnviando = true;
  asistRender();

  var body = {
    pregunta: texto,
    profesional: _asistDoctor ? (_asistDoctor.nombre || _asistDoctor.apellido || "") : "",
    contexto: { faq: asistFaqTexto(), licencia: asistLicenciaTexto() },
    historial: _asistHist.slice(0, -1).slice(-10).map(function (m) { return { role: m.role, text: m.text }; })
  };
  var headers = { "Content-Type": "application/json" };
  if (ASISTENTE_TOKEN) headers["X-Asistente-Token"] = ASISTENTE_TOKEN;

  fetch(ASISTENTE_ENDPOINT, { method: "POST", headers: headers, body: JSON.stringify(body) })
    .then(function (r) { return r.json().catch(function () { return { ok: false, error: "respuesta no válida (" + r.status + ")" }; }); })
    .then(function (d) {
      _asistEnviando = false;
      if (d && d.ok && d.respuesta) {
        _asistHist.push({ role: "assistant", text: d.respuesta });
      } else {
        _asistHist.push({ role: "assistant", err: true, text: "No pude responder ahora (" + ((d && d.error) || "sin detalle") + "). Probá de nuevo, o escribile a administración." });
      }
      asistRender();
    })
    .catch(function () {
      _asistEnviando = false;
      _asistHist.push({ role: "assistant", err: true, text: "No hay conexión con el asistente. Probá de nuevo en un rato." });
      asistRender();
    });
}

function asistEscHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function asistRender() {
  var b = document.getElementById("asistBody");
  if (!b) return;
  var html = "";

  if (!_asistHist.length) {
    html += '<div class="asist-msg bot">Hola. Preguntame sobre tu liquidación, tus cheques, los descuentos o las normas de la clínica.</div>';
    var chips = asistChipsSugeridos();
    if (chips.length) {
      html += '<div class="asist-chips">' + chips.map(function (q) {
        return '<button type="button" class="asist-chip" onclick="asistChip(' + JSON.stringify(q).replace(/"/g, "&quot;") + ')">' + asistEscHtml(q) + '</button>';
      }).join("") + '</div>';
    }
  }

  _asistHist.forEach(function (m) {
    var cls = m.role === "user" ? "user" : (m.err ? "bot err" : "bot");
    html += '<div class="asist-msg ' + cls + '">' + asistEscHtml(m.text).replace(/\n/g, "<br>") + '</div>';
  });
  if (_asistEnviando) html += '<div class="asist-msg bot asist-typing">escribiendo…</div>';

  b.innerHTML = html;
  b.scrollTop = b.scrollHeight;
}
