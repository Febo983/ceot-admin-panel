// protocolos-nun.js — Verificador de adicionales NUN 6ª ed. sobre protocolos quirúrgicos.
// Se importa el PDF del protocolo, se extrae el texto (pdf.js), se detectan los datos
// que disparan adicionales (Normas Primarias y Secundarias) y se dictamina qué % corresponde.
// Todo lo detectado se puede corregir a mano: el motor recalcula con lo que quede tildado.
// Depende de: nun-data.js (nunBuscar, NUN_REGIONES), pdf.js (window.pdfjsLib).
// Motor (pnParsear / pnEvaluar) sin DOM, para poder probarlo en node.

// ══════ FERIADOS NACIONALES (AR) ═════════════════════════════════
// Lista base; se pueden agregar más desde la UI (quedan en localStorage).
var PN_FERIADOS_BASE = [
  // 2025
  "2025-01-01","2025-03-03","2025-03-04","2025-03-24","2025-04-02","2025-04-18","2025-05-01","2025-05-02",
  "2025-05-25","2025-06-16","2025-06-20","2025-07-09","2025-08-15","2025-08-17","2025-11-21","2025-11-24",
  "2025-12-08","2025-12-25",
  // 2026
  "2026-01-01","2026-02-16","2026-02-17","2026-03-23","2026-03-24","2026-04-02","2026-04-03","2026-05-01",
  "2026-05-25","2026-06-15","2026-06-20","2026-07-09","2026-07-10","2026-08-17","2026-10-12","2026-11-23",
  "2026-12-07","2026-12-08","2026-12-25",
  // 2027
  "2027-01-01","2027-02-08","2027-02-09","2027-03-24","2027-03-26","2027-04-02","2027-05-01","2027-05-25",
  "2027-06-17","2027-06-20","2027-07-09","2027-08-16","2027-10-11","2027-11-22","2027-12-08","2027-12-25"
];
var PN_FERIADOS_KEY = "ceot_pn_feriados_extra";
var PN_HIST_KEY = "ceot_pn_historial";

function pnFeriados() {
  var extra = [];
  try { extra = JSON.parse((typeof localStorage !== "undefined" && localStorage.getItem(PN_FERIADOS_KEY)) || "[]"); } catch (e) {}
  return PN_FERIADOS_BASE.concat(extra);
}

// ══════ UTILIDADES DE TEXTO ══════════════════════════════════════
function pnSinAcentos(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function pnNorm(s) { return pnSinAcentos(s).toLowerCase().replace(/[ \t]+/g, " "); }

// ¿El match en la posición idx está negado ("sin radioscopia", "no se utilizó …")?
function pnNegado(txt, idx) {
  var antes = txt.slice(Math.max(0, idx - 40), idx);
  // corta en el último signo de puntuación para no tomar negaciones de otra frase
  var corte = Math.max(antes.lastIndexOf("."), antes.lastIndexOf(";"), antes.lastIndexOf("\n"), antes.lastIndexOf(":"));
  if (corte >= 0) antes = antes.slice(corte + 1);
  return /\b(sin|no|niega|descarta|ni)\b[^,]*$/.test(antes);
}

// Busca la primera ocurrencia NO negada de cualquiera de los patrones; devuelve {frag} o null.
function pnBuscarTermino(txt, patrones) {
  for (var i = 0; i < patrones.length; i++) {
    var re = new RegExp(patrones[i].source, "g");
    var m;
    while ((m = re.exec(txt))) {
      if (!pnNegado(txt, m.index)) return { frag: pnFragmento(txt, m.index, m[0].length), idx: m.index };
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return null;
}
function pnFragmento(txt, idx, len) {
  var a = Math.max(0, idx - 50), b = Math.min(txt.length, idx + len + 50);
  return (a > 0 ? "…" : "") + txt.slice(a, b).replace(/\s+/g, " ").trim() + (b < txt.length ? "…" : "");
}

// Valor después de una etiqueta ("Edad: 72", "Fecha de cirugía: 12/03/2026")
function pnCampo(txt, etiquetas, valorRe) {
  for (var i = 0; i < etiquetas.length; i++) {
    var re = new RegExp(etiquetas[i] + "\\s*[:\\-]?\\s*(" + valorRe + ")", "i");
    var m = txt.match(re);
    if (m) return { valor: m[1], frag: pnFragmento(txt, m.index, m[0].length) };
  }
  return null;
}

function pnParseFecha(s) {
  if (!s) return null;
  var m = String(s).match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    var y = +m[3]; if (y < 100) y += 2000;
    var d = new Date(y, +m[2] - 1, +m[1]);
    if (d.getMonth() === +m[2] - 1) return d;
  }
  m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}
function pnIso(d) {
  return d ? d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) : "";
}
function pnParseHora(s) {
  var m = String(s || "").match(/(\d{1,2})\s*[:.hH]\s*(\d{2})/);
  if (!m) { m = String(s || "").match(/^(\d{1,2})\s*(hs|h)?$/i); if (m) return ("0" + m[1]).slice(-2) + ":00"; return ""; }
  var h = +m[1], mi = +m[2];
  if (h > 23 || mi > 59) return "";
  return ("0" + h).slice(-2) + ":" + ("0" + mi).slice(-2);
}
function pnEdadEnFecha(nac, ref) {
  if (!nac || !ref) return null;
  var e = ref.getFullYear() - nac.getFullYear();
  if (ref.getMonth() < nac.getMonth() || (ref.getMonth() === nac.getMonth() && ref.getDate() < nac.getDate())) e--;
  return e;
}

// ══════ PARSER: texto del protocolo → datos ══════════════════════
// Devuelve { datos:{...}, evid:{campo: fragmento} }
function pnParsear(textoOriginal) {
  // OCR: corrige O/o leídas en lugar de 0 cuando están pegadas a dígitos (MS.O6.O2, 22:4O)
  textoOriginal = String(textoOriginal || "").replace(/(?<![A-Za-z])[Oo](?=[.:\/]?\d)|(?<=\d[.:\/]?)[Oo](?![A-Za-z])/g, "0")
    .replace(/\b(CO|MS|PC|RO|PP)\s*[.\-]?\s*[Oo](\d)/gi, "$1.0$2");
  var txt = pnNorm(textoOriginal);
  var datos = {}, evid = {};
  var F = "(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4})";

  // Fecha de la cirugía
  var c = pnCampo(txt, ["fecha de (?:la )?(?:cirugia|intervencion|operacion|cx)", "fecha de realizacion", "fecha qx", "fecha"], F.slice(1, -1));
  if (c) { datos.fecha = pnIso(pnParseFecha(c.valor)); evid.fecha = c.frag; }

  // Hora de inicio (y fin, informativa)
  var H = "\\d{1,2}\\s*[:.hH]\\s*\\d{2}";
  c = pnCampo(txt, ["hora de inicio", "hora inicio", "hora de comienzo", "comienzo", "inicio(?: de (?:la )?(?:cirugia|anestesia))?", "hora de ingreso a quirofano", "hora"], H);
  if (c) { datos.horaInicio = pnParseHora(c.valor); evid.horaInicio = c.frag; }
  c = pnCampo(txt, ["hora de (?:finalizacion|fin|terminacion)", "hora fin", "finalizacion", "termino", "fin"], H);
  if (c) { datos.horaFin = pnParseHora(c.valor); evid.horaFin = c.frag; }

  // Edad: directa o por fecha de nacimiento
  c = pnCampo(txt, ["edad"], "\\d{1,3}");
  if (c) { datos.edad = +c.valor; evid.edad = c.frag; }
  var cn = pnCampo(txt, ["fecha de nacimiento", "f\\.? ?de nac\\.?", "f\\.? ?nac\\.?", "nacimiento"], F.slice(1, -1));
  if (cn) {
    datos.fechaNac = pnIso(pnParseFecha(cn.valor));
    if (datos.edad == null && datos.fecha) {
      datos.edad = pnEdadEnFecha(pnParseFecha(cn.valor), pnParseFecha(datos.fecha));
      evid.edad = cn.frag + " (edad calculada a la fecha de cirugía)";
    }
  }
  if (datos.edad == null) {
    var me = txt.match(/(\d{1,3})\s*(?:anos|a\.)\s*(?:de edad)?/);
    if (me && +me[1] < 110) { datos.edad = +me[1]; evid.edad = pnFragmento(txt, me.index, me[0].length); }
  }

  // Emergencia / urgencia
  var r = pnBuscarTermino(txt, [/\b(cirugia|intervencion|caracter|tipo)\s*(de\s*)?[:\-]?\s*(urgencia|emergencia)/, /\bemergencia\b/, /\burgencia\b/, /\burgente\b/]);
  if (r && !/\b(programada|electiva|programado)\b/.test(txt.slice(Math.max(0, r.idx - 30), r.idx + 40))) { datos.emergencia = true; evid.emergencia = r.frag; }
  var prog = pnBuscarTermino(txt, [/\b(programada|electiva|cirugia programada)\b/]);
  if (prog) evid.programada = prog.frag;

  // Radioscopía
  r = pnBuscarTermino(txt, [/radioscop\w*/, /intensificador( de imagen(es)?)?/, /arco en c\b/, /fluoroscop\w*/, /control (radiologico|radioscopico|rx) intra ?operatorio/, /\brx intra ?operatori\w*/, /bajo (control )?(de )?(radioscopia|intensificador|tv|rx)/, /control con tv\b/]);
  if (r) { datos.radioscopia = true; evid.radioscopia = r.frag; }

  // Injerto óseo (tipo)
  r = pnBuscarTermino(txt, [/(injerto|aloinjerto|hueso)[^.]{0,30}banco( de tejidos)?/, /aloinjerto/, /injerto (oseo )?(homologo|heterologo|cadaverico)/, /banco de (tejidos|huesos)/]);
  if (r) { datos.injerto = "banco"; evid.injerto = r.frag; }
  else {
    r = pnBuscarTermino(txt, [/(auto)?injerto (oseo )?autologo/, /autoinjerto/, /injerto (oseo )?(de|del) (cresta|iliaco|peron[eé]|tibia|radio|olecranon)/, /cresta iliaca/, /hueso autologo/]);
    if (r) { datos.injerto = "autologo"; evid.injerto = r.frag; }
    else {
      r = pnBuscarTermino(txt, [/sustituto oseo/, /hidroxiapatita/, /fosfato (tri)?calcico/, /sulfato de calcio/, /matriz osea desmineralizada/, /\bdbm\b/, /biovidrio|vidrio bioactivo/, /cemento oseo (sintetico|inyectable)/, /\bchronos\b|\bcerament\b|\bosteoset\b/]);
      if (r) { datos.injerto = "sustituto"; evid.injerto = r.frag; }
    }
  }

  // Reintervención
  r = pnBuscarTermino(txt, [/reintervencion/, /re-?operacion/, /recidiva/, /\brevision (de|del)\b/, /\brecambio\b/, /complicacion (de|post)/, /(pseudoartrosis|seudoartrosis)/, /\bretiro de (material|osteosintesis|implante|protesis)/, /toilette (quirurgica )?por infeccion/, /infeccion (de|del) (sitio quirurgico|material|protesis|herida)/]);
  if (r) { datos.reintervencion = true; evid.reintervencion = r.frag; }

  // Doble vía / bilateral
  r = pnBuscarTermino(txt, [/doble (via|abordaje|incision)/, /dos (vias|abordajes|incisiones)/, /\bbilateral\b/, /abordaje (anterior|medial|lateral) y (posterior|lateral|medial)/, /segundo abordaje/]);
  if (r) { datos.dobleVia = true; evid.dobleVia = r.frag; }

  // Ayudantes: cuenta líneas "ayudante" con un nombre
  var ay = 0, ayFr = [];
  var reAy = /(\d(?:er|do|ro|°|º)?\s*)?ayudante(s)?\s*(\d(?:er|do|ro|°|º)?)?\s*[:\-]\s*([a-z][a-z .,']{2,60})/g, ma;
  while ((ma = reAy.exec(txt))) {
    var nombres = ma[4].split(/\s+(?:y|e)\s+|,|\/|\n/).filter(function(x){ return /[a-z]{3,}/.test(x) && !/^(no|sin|ninguno|no hubo|-)/.test(x.trim()); });
    var nFila = ma[2] ? Math.max(1, nombres.length) : 1;
    if (nombres.length) { ay += nFila; ayFr.push(pnFragmento(txt, ma.index, ma[0].length)); }
  }
  if (ay) { datos.ayudantes = Math.min(ay, 4); evid.ayudantes = ayFr.join(" | "); }

  // Códigos NUN que aparezcan en el texto (MS.04.02, MS 04 02, MS0402)
  var cods = [], reC = /\b(co|ms|pc|ro|pp)\s?[.\-]?\s?(\d{2})\s?[.\-]?\s?(\d{2})\b/g, mc;
  while ((mc = reC.exec(txt))) {
    var cod = mc[1].toUpperCase() + "." + mc[2] + "." + mc[3];
    if (cods.indexOf(cod) < 0 && (typeof NUN_INDEX === "undefined" || NUN_INDEX[cod])) cods.push(cod);
  }
  if (cods.length) { datos.codigos = cods; evid.codigos = cods.join(", "); }

  // Bloques narrativos (para mostrar)
  var dx = pnCampo(txt, ["diagnostico(?: pre ?operatorio| post ?operatorio)?"], "[^\\n]{5,160}");
  if (dx) datos.diagnostico = dx.valor.trim();
  var op = pnCampo(txt, ["(?:operacion|cirugia|procedimiento|intervencion) (?:realizad[ao]|efectuad[ao])", "procedimiento", "operacion"], "[^\\n]{5,200}");
  if (op) datos.operacion = op.valor.trim();
  var pac = pnCampo(String(textoOriginal || ""), ["Paciente", "PACIENTE", "Apellido y nombre", "Nombre"], "[^\\n:]{3,60}");
  if (pac) datos.paciente = pac.valor.replace(/\s+(Edad|DNI|HC|Fecha|Obra).*$/i, "").trim();

  return { datos: datos, evid: evid };
}

// ══════ HORARIO: nocturno / fin de semana / feriado ═════════════
// Devuelve {aplica, motivo} según la fecha y hora de INICIO de la cirugía.
function pnHorario(fechaIso, hora, feriados) {
  if (!fechaIso || !hora) return { aplica: null, motivo: "Falta fecha u hora de inicio" };
  var p = fechaIso.split("-"), hh = hora.split(":");
  var d = new Date(+p[0], +p[1] - 1, +p[2], +hh[0], +hh[1]);
  var h = d.getHours() + d.getMinutes() / 60, dow = d.getDay(); // 0 dom … 6 sáb
  var fer = feriados || pnFeriados();
  // Feriado: de las 7 h del feriado a las 7 h del día siguiente
  var diaFer = new Date(d); if (h < 7) diaFer.setDate(diaFer.getDate() - 1);
  if (fer.indexOf(pnIso(diaFer)) >= 0) return { aplica: true, motivo: "Feriado (" + pnIso(diaFer).split("-").reverse().join("/") + ")" };
  if (h >= 21 || h < 7) return { aplica: true, motivo: "Horario nocturno (" + hora + " h, franja 21 a 7 h)" };
  if (dow === 0) return { aplica: true, motivo: "Fin de semana (domingo)" };
  if (dow === 6 && h >= 12) return { aplica: true, motivo: "Fin de semana (sábado desde las 12 h)" };
  if (dow === 1 && h < 7) return { aplica: true, motivo: "Fin de semana (lunes antes de las 7 h)" };
  var dias = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  return { aplica: false, motivo: "Día y horario hábil (" + dias[dow] + " " + hora + " h)" };
}

// ══════ MOTOR: datos → adicionales ═══════════════════════════════
// overrides: {clave: true|false} — decisión manual que pisa lo detectado.
function pnEvaluar(datos, overrides, opts) {
  datos = datos || {}; overrides = overrides || {}; opts = opts || {};
  var codInfo = (datos.codigos || []).map(function(c){ return (typeof nunBuscar === "function" && nunBuscar(c)) || { codigo: c, texto: "", complejidad: null }; });
  var cod = codInfo[0] || null;
  var txtCod = pnNorm(codInfo.map(function(x){ return x.texto; }).join(" "));
  var compl = datos.complejidad || (cod && cod.complejidad) || null;
  var items = [];
  function add(it) {
    if (overrides[it.clave] === true || overrides[it.clave] === false) { it.manual = true; it.aplica = overrides[it.clave]; }
    items.push(it);
  }

  // ── Primaria 3: Reintervención +30%
  var reEsp = /revision|recambio|reconversion|segundo tiempo|retiro|extraccion de|pseudoartrosis|seudoartrosis|infectad|recidiva/.test(txtCod);
  add({ clave: "reint", norma: "NP 3", titulo: "Reintervención (recidiva o complicación)", pct: 30,
    aplica: !!datos.reintervencion && !reEsp,
    detalle: datos.reintervencion ? (reEsp ? "El código ya contempla la revisión/reintervención en su texto → no corresponde el +30%." : "El protocolo describe una reintervención; el +30% va sobre la complejidad original.") : "No se detectó reintervención." });

  // ── Primaria 4: Injerto óseo
  var injEsp = /injerto|aloinjerto|autoinjerto|sustituto|relleno oseo|banco de tejidos/.test(txtCod);
  var INJ = { autologo: { pct: 25, t: "autólogo" }, banco: { pct: 15, t: "de Banco de Tejidos" }, sustituto: { pct: 5, t: "sustituto óseo" } };
  var tipoInj = overrides.injTipo || datos.injerto || null;
  add({ clave: "injerto", norma: "NP 4", titulo: "Injerto óseo" + (tipoInj ? " " + INJ[tipoInj].t : ""), pct: tipoInj ? INJ[tipoInj].pct : 0,
    aplica: !!tipoInj && !injEsp, tipoInj: tipoInj,
    detalle: tipoInj ? (injEsp ? "El texto del código ya incluye el injerto → no corresponde adicional." : "Injerto " + INJ[tipoInj].t + " no especificado en el código: +" + INJ[tipoInj].pct + "%.") : "No se detectó injerto óseo." });

  // ── Primaria 2: Doble vía / segunda patología
  add({ clave: "doblevia", norma: "NP 2b/2d", titulo: "Doble vía o 2ª patología en el mismo acto", pct: 50,
    aplica: !!datos.dobleVia && (datos.codigos || []).length <= 1, revisar: true,
    detalle: datos.dobleVia ? ((datos.codigos || []).length > 1 ? "Hay más de un código: si son intervenciones múltiples (NP 2a) se facturan al 100% c/u, no +50%. Revisar." : "Se detectó doble vía / bilateralidad. Si es la misma patología por doble vía, mismo tiempo quirúrgico: +50%. Si es bilateral por patologías distintas, cada lado al 100% (NP 2a). Confirmar.") : "No se detectó doble vía ni bilateralidad." });

  // ── Secundarias 1, 2 y 3 (emergencia no acumula con 1 ni 2)
  var edadAp = datos.edad != null ? (datos.edad <= 10 || datos.edad > 65) : null;
  var hor = pnHorario(datos.fecha, datos.horaInicio, opts.feriados);
  var itEdad = { clave: "edad", norma: "NS 1", titulo: "Edad extrema (≤10 o >65 años)", pct: 20, aplica: !!edadAp,
    detalle: datos.edad == null ? "No se encontró la edad del paciente — cargala a mano." : "Paciente de " + datos.edad + " años → " + (edadAp ? "corresponde." : "no corresponde.") };
  var itHor = { clave: "horario", norma: "NS 2", titulo: "Nocturno / fin de semana / feriado", pct: 20, aplica: !!hor.aplica, detalle: hor.motivo };
  var itEme = { clave: "emergencia", norma: "NS 3", titulo: "Cirugía de emergencia", pct: 20, aplica: !!datos.emergencia,
    detalle: datos.emergencia ? "El protocolo indica urgencia/emergencia. Debe ser cirugía que no podía postergarse (riesgo de vida, viabilidad o función del miembro)." : "No se detectó carácter de emergencia." };
  add(itEdad); add(itHor); add(itEme);
  if (itEme.aplica && (itEdad.aplica || itHor.aplica)) {
    var sumaOtras = (itEdad.aplica ? 20 : 0) + (itHor.aplica ? 20 : 0);
    if (sumaOtras >= 20) {
      itEme.excluida = true;
      itEme.detalle += " No acumula con NS 1 ni NS 2: se toma " + (sumaOtras > 20 ? "edad + horario (+40%), que es mayor." : "la otra norma (mismo +20%).");
    }
  }

  // ── Secundaria 4: Radioscopía +5%
  add({ clave: "radio", norma: "NS 4", titulo: "Uso de radioscopía", pct: 5, aplica: !!datos.radioscopia,
    detalle: datos.radioscopia ? "Se usó radioscopía/intensificador: +5%." : "No se menciona radioscopía." });

  // ── Total de recargos sobre el código
  var total = 0;
  items.forEach(function(it){ if (it.aplica && !it.excluida) total += it.pct; });

  // ── Ayudantes (se facturan aparte: +20% del valor del cirujano c/u)
  var ayEsperados = compl ? (compl <= 4 ? 1 : 2) : null;
  var ayudantes = { cantidad: datos.ayudantes || 0, esperados: ayEsperados,
    detalle: compl ? "Complejidad " + compl + " → " + ayEsperados + " ayudante" + (ayEsperados > 1 ? "s" : "") + " (cada uno factura el 20% del valor del cirujano)." : "Sin código/complejidad no se puede saber cuántos ayudantes corresponden." };
  if (compl && datos.ayudantes > ayEsperados) ayudantes.alerta = "El protocolo tiene " + datos.ayudantes + " ayudantes y la complejidad admite " + ayEsperados + ": el excedente requiere pedido fundado a la OS.";

  return { items: items, totalPct: total, codigo: cod, codigos: codInfo, complejidad: compl, ayudantes: ayudantes, horario: hor };
}

// Compara lo esperado con lo facturado (en % de recargo sobre el código).
function pnComparar(totalPct, facturadoPct) {
  if (facturadoPct === "" || facturadoPct == null || isNaN(+facturadoPct)) return null;
  var dif = totalPct - (+facturadoPct);
  if (Math.abs(dif) < 0.01) return { tipo: "ok", txt: "Facturado correcto (+" + totalPct + "%)." };
  if (dif > 0) return { tipo: "falta", txt: "Faltó facturar +" + dif + "% (corresponde +" + totalPct + "%, se facturó +" + (+facturadoPct) + "%)." };
  return { tipo: "exceso", txt: "Se facturó " + (-dif) + "% de más (corresponde +" + totalPct + "%, se facturó +" + (+facturadoPct) + "%). Riesgo de débito." };
}

// ══════════════════════════════════════════════════════════════════
// UI
// ══════════════════════════════════════════════════════════════════
var pnActual = null; // { nombre, texto, datos, evid, ov:{}, facturado, valor, escaneado }

function pnEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]; }); }

function pnInyectarEstilos() {
  if (document.getElementById("pnStyles")) return;
  var st = document.createElement("style");
  st.id = "pnStyles";
  st.textContent = ""
    + ".pn-drop{border:2px dashed rgba(32,36,31,.25);border-radius:10px;padding:26px 16px;text-align:center;background:rgba(251,248,240,.6);cursor:pointer;transition:background .2s}"
    + ".pn-drop.on,.pn-drop:hover{background:rgba(31,58,46,.07);border-color:#1f3a2e}"
    + ".pn-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:10px 0}"
    + ".pn-grid label{display:block;font-size:.62rem;font-weight:700;color:rgba(32,36,31,.55);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px}"
    + ".pn-inp{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid rgba(32,36,31,.18);border-radius:6px;font-size:.8rem;font-family:inherit;background:#fbf8f0;color:#20241f}"
    + ".pn-tab{width:100%;border-collapse:collapse;font-size:.78rem;margin-top:6px}"
    + ".pn-tab th{text-align:left;font-size:.62rem;text-transform:uppercase;letter-spacing:.4px;color:rgba(32,36,31,.55);border-bottom:2px solid #1f3a2e;padding:5px 6px}"
    + ".pn-tab td{border-bottom:1px solid #d9d0b8;padding:7px 6px;vertical-align:top}"
    + ".pn-tab td.num{font-family:ui-monospace,Menlo,Consolas,monospace;text-align:right;white-space:nowrap}"
    + ".pn-chip{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.66rem;font-weight:700;white-space:nowrap}"
    + ".pn-si{background:#eef2ea;color:#16a34a}.pn-no{background:rgba(32,36,31,.06);color:#6b6a5a}.pn-ex{background:#f6ecd6;color:#92610f}"
    + ".pn-ev{font-size:.66rem;color:#6b6a5a;margin-top:3px;font-style:italic}"
    + ".pn-total{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:12px 14px;border:2px solid #1f3a2e;border-radius:8px;background:#fbf8f0;margin:12px 0}"
    + ".pn-total .big{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:1.5rem;font-weight:800;color:#16a34a}"
    + ".pn-aviso{padding:8px 12px;border-radius:7px;font-size:.78rem;margin:8px 0}"
    + ".pn-exceso-chip{background:#f7e6e2;color:#b13a2c}"
    + ".pn-ok{background:#eef2ea;color:#166534}.pn-falta{background:#f6ecd6;color:#92610f}.pn-exceso,.pn-err{background:#f7e6e2;color:#b13a2c}"
    + ".pn-sel{font-size:.72rem;padding:3px 4px;border:1px solid rgba(32,36,31,.18);border-radius:5px;background:#fbf8f0;color:#20241f;font-family:inherit}"
    + "[data-theme=dark] .pn-drop{background:#26221a;border-color:#3a362c}"
    + "[data-theme=dark] .pn-inp,[data-theme=dark] .pn-sel,[data-theme=dark] .pn-total{background:#26221a;color:#f1ede2;border-color:#3a362c}"
    + "[data-theme=dark] .pn-tab td{border-color:#3a362c}[data-theme=dark] .pn-tab th,[data-theme=dark] .pn-grid label,[data-theme=dark] .pn-ev{color:#a39c88}"
    + "[data-theme=dark] .pn-total .big{color:#4ade80}";
  document.head.appendChild(st);
}

function renderProtocolosNun() {
  if (typeof cerrarAdmSidenav === "function") cerrarAdmSidenav();
  if (typeof admDesactivarSidebar === "function") admDesactivarSidebar();
  if (typeof PERIODOS_TODOS !== "undefined") PERIODOS_TODOS.forEach(function (p) { var t = document.getElementById("adm-tab-" + p); if (t) t.className = "adm-tab"; });
  var sb = document.getElementById("adm-sidenav-protocolos");
  if (sb) sb.className = "adm-sidenav-btn active";
  pnInyectarEstilos();
  document.getElementById("adm-content").innerHTML = '<div id="pnRoot"></div>';
  pnRepintar();
}

function pnRepintar() {
  var root = document.getElementById("pnRoot");
  if (!root) return;
  var h = '<div class="adm-sec-title">Protocolos · adicionales NUN 6ª ed.</div>'
    + '<div class="deb-toolbar" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">'
    +   '<button class="deb-btn deb-btn-pri" onclick="pnModoAgregar=false;document.getElementById(\'pnFile\').click()">⬆ Importar protocolo (capturas o PDF)</button>'
    +   (pnActual ? '<button class="deb-btn" onclick="pnModoAgregar=true;document.getElementById(\'pnFile\').click()" title="Si el protocolo ocupa más de una captura">＋ Agregar otra captura</button>' : '')
    +   '<button class="deb-btn" onclick="pnPegarTexto()">⌨ Pegar texto</button>'
    +   '<button class="deb-btn" onclick="pnVerPlanilla()" title="Revisar los % adicionales pedidos en la planilla de Cirugías (generador de órdenes)">📋 Planilla de Cirugías</button>'
    +   (pnActual ? '<button class="deb-btn" onclick="pnGuardarHist()">💾 Guardar en historial</button>' : '')
    +   '<span style="flex:1"></span>'
    +   '<button class="deb-btn" onclick="pnVerHistorial()">🗂 Historial (' + pnHist().length + ')</button>'
    +   (typeof debAbrirNormas === "function" ? '<button class="deb-btn" onclick="debAbrirNormas()">📖 Normas</button>' : '')
    + '</div>'
    + '<input type="file" id="pnFile" accept="image/*,application/pdf,.pdf,.txt" multiple style="display:none" onchange="pnCargarArchivos(this.files);this.value=\'\'">';

  if (!pnActual) {
    h += '<div class="pn-drop" id="pnDrop" onclick="pnModoAgregar=false;document.getElementById(\'pnFile\').click()" ondragover="event.preventDefault();this.classList.add(\'on\')" ondragleave="this.classList.remove(\'on\')" ondrop="event.preventDefault();this.classList.remove(\'on\');pnCargarArchivos(event.dataTransfer.files)">'
      + '<div style="font-size:1.6rem">📸</div><div style="font-weight:700;margin-top:4px">Arrastrá acá las capturas del protocolo quirúrgico — o pegalas con Ctrl+V</div>'
      + '<div style="font-size:.72rem;color:#6b6a5a;margin-top:4px">Podés subir varias capturas juntas (se leen en orden). También acepta PDF. Se lee en tu navegador (no se sube a ningún lado). Detecta edad, fecha/hora, urgencia, radioscopía, injerto, reintervención, doble vía, ayudantes y códigos NUN.</div></div>'
      + '<div id="pnMsg"></div>';
    root.innerHTML = h;
    return;
  }

  var d = pnActual.datos, ev = pnActual.evid;
  var res = pnEvaluar(d, pnActual.ov);
  h += '<div style="font-size:.78rem;margin-bottom:4px"><b>' + pnEsc(pnActual.nombre) + '</b>'
    + (d.paciente ? ' · Paciente: ' + pnEsc(d.paciente) : '') + '</div>'
    + (pnActual.fila ? pnFilaResumenHtml(pnActual.fila)
        : '<div style="font-size:.72rem;margin-bottom:6px"><button class="deb-btn" style="font-size:.7rem;padding:3px 9px" onclick="pnVincularPlanilla()">🔗 Vincular con la planilla de Cirugías</button> <span style="color:#6b6a5a">trae edad, código, urgencia y el % que se pidió en la orden</span></div>')
    + (pnActual.base && !pnActual.texto ? '<div class="pn-aviso pn-falta">Datos tomados de la planilla. Para confirmar horario, radioscopía, injerto y ayudantes, pegá (Ctrl+V) o subí las capturas del protocolo quirúrgico.</div>' : '')
    + (pnActual.ocr ? '<div class="pn-aviso" style="background:rgba(32,36,31,.05);font-size:.7rem">Leído de ' + pnActual.ocr + ' captura(s) con reconocimiento de texto (OCR): revisá que fecha, hora, edad y código estén bien leídos.</div>' : '')
    + (pnActual.escaneado ? '<div class="pn-aviso pn-err">No se pudo leer texto (captura borrosa o muy chica). Probá con una captura más grande/nítida, o completá los datos a mano abajo.</div>' : '')
    + '<div id="pnMsg"></div>';

  // Datos editables
  h += '<div class="pn-grid">'
    + pnInp("Código(s) NUN", "codigos", (d.codigos || []).join(", "), "MS.04.02", ev.codigos)
    + pnInp("Fecha cirugía", "fecha", d.fecha || "", "", ev.fecha, "date")
    + pnInp("Hora inicio", "horaInicio", d.horaInicio || "", "", ev.horaInicio, "time")
    + pnInp("Edad", "edad", d.edad != null ? d.edad : "", "años", ev.edad, "number")
    + pnInp("Ayudantes", "ayudantes", d.ayudantes || "", "0", ev.ayudantes, "number")
    + '</div>';
  if (res.codigos.length) {
    h += '<div style="font-size:.72rem;color:#6b6a5a;margin:-2px 0 6px">' + res.codigos.map(function(c){
      return c.texto ? '<div><b>' + c.codigo + '</b> · C' + c.complejidad + ' ' + (NUN_REGIONES[c.codigo.slice(0,2)] || '') + ' — ' + pnEsc(c.texto) + '</div>' : '<div style="color:#b13a2c">' + pnEsc(c.codigo) + ': no existe en el NUN 6ª ed.</div>';
    }).join("") + '</div>';
  } else {
    h += '<div class="pn-aviso pn-falta">No se encontró código NUN en el protocolo. Cargalo arriba: sin código no se puede saber si el injerto/reintervención ya está incluido ni cuántos ayudantes corresponden.</div>';
  }
  if (d.diagnostico || d.operacion) h += '<div style="font-size:.72rem;color:#6b6a5a;margin-bottom:6px">' + (d.diagnostico ? '<div><b>Dx:</b> ' + pnEsc(d.diagnostico) + '</div>' : '') + (d.operacion ? '<div><b>Op:</b> ' + pnEsc(d.operacion) + '</div>' : '') + '</div>';

  // Tabla de adicionales
  h += '<table class="pn-tab"><thead><tr><th>Norma</th><th>Adicional</th><th style="text-align:right">%</th><th>¿Corresponde?</th><th>Decisión</th></tr></thead><tbody>';
  res.items.forEach(function(it) {
    var chip = it.excluida ? '<span class="pn-chip pn-ex">No acumula</span>' : (it.aplica ? '<span class="pn-chip pn-si">✓ Sí</span>' : '<span class="pn-chip pn-no">No</span>');
    if (it.revisar && it.aplica && !it.manual) chip += ' <span class="pn-chip pn-ex">Revisar</span>';
    var evTxt = pnEvidencia(it.clave, ev);
    var ovVal = pnActual.ov[it.clave] === true ? "si" : (pnActual.ov[it.clave] === false ? "no" : "auto");
    var sel = '<select class="pn-sel" onchange="pnSetOv(\'' + it.clave + '\',this.value)">'
      + '<option value="auto"' + (ovVal === "auto" ? " selected" : "") + '>Automático</option>'
      + '<option value="si"' + (ovVal === "si" ? " selected" : "") + '>Sí corresponde</option>'
      + '<option value="no"' + (ovVal === "no" ? " selected" : "") + '>No corresponde</option></select>';
    if (it.clave === "injerto") {
      var t = pnActual.ov.injTipo || d.injerto || "";
      sel += '<div style="margin-top:3px"><select class="pn-sel" onchange="pnSetInjTipo(this.value)">'
        + '<option value=""' + (!t ? " selected" : "") + '>Sin injerto</option>'
        + '<option value="autologo"' + (t === "autologo" ? " selected" : "") + '>Autólogo (25%)</option>'
        + '<option value="banco"' + (t === "banco" ? " selected" : "") + '>Banco (15%)</option>'
        + '<option value="sustituto"' + (t === "sustituto" ? " selected" : "") + '>Sustituto (5%)</option></select></div>';
    }
    h += '<tr><td style="white-space:nowrap;font-weight:700">' + it.norma + '</td>'
      + '<td><div style="font-weight:600">' + pnEsc(it.titulo) + '</div><div class="pn-ev" style="font-style:normal">' + pnEsc(it.detalle) + (it.manual ? ' <b>(decisión manual)</b>' : '') + '</div>'
      + (evTxt ? '<div class="pn-ev">“' + pnEsc(evTxt) + '”</div>' : '') + '</td>'
      + '<td class="num">+' + it.pct + '%</td><td>' + chip + '</td><td>' + sel + '</td></tr>';
  });
  h += '</tbody></table>';

  // Total + comparación con facturado
  var cmp = pnComparar(res.totalPct, pnActual.facturado);
  var valor = +pnActual.valor || 0;
  h += '<div class="pn-total"><div><div style="font-size:.62rem;font-weight:700;text-transform:uppercase;color:#6b6a5a">Recargo que corresponde</div><div class="big">+' + res.totalPct + '%</div></div>'
    + '<div><label style="display:block;font-size:.62rem;font-weight:700;text-transform:uppercase;color:#6b6a5a">% facturado / pedido</label><input class="pn-inp" style="width:90px" type="number" step="1" value="' + pnEsc(pnActual.facturado == null ? "" : pnActual.facturado) + '" onchange="pnActual.facturado=this.value;pnRepintar()"></div>'
    + '<div><label style="display:block;font-size:.62rem;font-weight:700;text-transform:uppercase;color:#6b6a5a">Valor del código $ (opcional)</label><input class="pn-inp" style="width:130px" type="number" step="0.01" value="' + pnEsc(pnActual.valor || "") + '" onchange="pnActual.valor=this.value;pnRepintar()"></div>'
    + (valor ? '<div style="font-family:ui-monospace,Menlo,monospace;font-size:.8rem">Código $' + pnFmt(valor) + '<br>Recargo $' + pnFmt(valor * res.totalPct / 100) + '<br><b>Total $' + pnFmt(valor * (1 + res.totalPct / 100)) + '</b>'
        + (res.ayudantes.esperados ? '<br>Ayudante c/u $' + pnFmt(valor * 0.2) : '') + '</div>' : '')
    + '</div>';
  if (cmp) h += '<div class="pn-aviso pn-' + cmp.tipo + '">' + pnEsc(cmp.txt) + '</div>';
  h += '<div class="pn-aviso" style="background:rgba(32,36,31,.05)"><b>Ayudantes:</b> ' + pnEsc(res.ayudantes.detalle)
    + (res.ayudantes.cantidad ? ' En el protocolo figuran ' + res.ayudantes.cantidad + '.' : ' No se detectaron ayudantes en el protocolo.')
    + (res.ayudantes.alerta ? '<div style="color:#b13a2c;margin-top:3px">⚠ ' + pnEsc(res.ayudantes.alerta) + '</div>' : '') + '</div>';
  h += '<div style="font-size:.62rem;color:#9a8c78;margin-top:10px">Los recargos se suman sobre el valor del código. Detección automática por palabras clave: revisá siempre la evidencia y corregí con “Decisión”. Las normas NP 1 (una sola complejidad) y NS 5 (visitas en internación) no se evalúan acá.</div>'
    + '<details style="margin-top:10px"><summary style="cursor:pointer;font-size:.72rem;color:#6b6a5a">Ver texto extraído del protocolo</summary><pre style="white-space:pre-wrap;font-size:.68rem;max-height:320px;overflow:auto;background:rgba(32,36,31,.04);padding:8px;border-radius:6px">' + pnEsc(pnActual.texto || "(sin texto)") + '</pre></details>';
  root.innerHTML = h;
}

function pnFmt(n) { return Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function pnInp(lbl, campo, val, ph, evTxt, type) {
  return '<div><label title="' + pnEsc(evTxt || "No detectado en el protocolo") + '">' + lbl + (evTxt ? ' ✓' : '') + '</label>'
    + '<input class="pn-inp" type="' + (type || "text") + '" value="' + pnEsc(val) + '" placeholder="' + pnEsc(ph || "") + '" onchange="pnSetCampo(\'' + campo + '\',this.value)"></div>';
}

function pnEvidencia(clave, ev) {
  var map = { reint: "reintervencion", injerto: "injerto", doblevia: "dobleVia", edad: "edad", horario: "horaInicio", emergencia: "emergencia", radio: "radioscopia" };
  return ev[map[clave]] || "";
}

function pnSetCampo(campo, v) {
  var val;
  if (campo === "codigos") val = String(v).split(/[,;+]|\s+(?=[a-zA-Z]{2}\s?[.\-]?\d)/).map(function(x){ return nunNormalizarCodigo(x.trim()) || x.trim().toUpperCase(); }).filter(Boolean);
  else if (campo === "edad" || campo === "ayudantes") val = v === "" ? null : +v;
  else val = v;
  pnActual.manualVals = pnActual.manualVals || {};
  pnActual.manualVals[campo] = val;
  pnRecalc(); pnRepintar();
}
function pnSetOv(clave, v) {
  if (v === "auto") delete pnActual.ov[clave]; else pnActual.ov[clave] = (v === "si");
  pnRepintar();
}
function pnSetInjTipo(v) {
  if (v) pnActual.ov.injTipo = v; else { delete pnActual.ov.injTipo; pnActual.datos.injerto = null; }
  pnRepintar();
}

function pnMsg(html, tipo) {
  var el = document.getElementById("pnMsg");
  if (el) el.innerHTML = html ? '<div class="pn-aviso pn-' + (tipo || "ok") + '">' + html + '</div>' : "";
}

async function pnExtraerPdf(file) {
  if (!window.pdfjsLib) throw new Error("pdf.js no está disponible");
  var pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  var texto = "";
  for (var p = 1; p <= Math.min(pdf.numPages, 15); p++) {
    var tc = await (await pdf.getPage(p)).getTextContent();
    // reconstruye líneas por coordenada Y para que "Etiqueta: valor" quede en la misma línea
    var lineas = [], lastY = null;
    tc.items.forEach(function(it) {
      var y = Math.round(it.transform[5]);
      if (lastY === null || Math.abs(y - lastY) > 3) lineas.push(it.str); else lineas[lineas.length - 1] += (it.hasEOL ? "" : " ") + it.str;
      lastY = y;
    });
    texto += lineas.join("\n") + "\n";
  }
  return texto.replace(/[ \t]+/g, " ").trim();
}

// ── OCR (capturas de pantalla) con Tesseract.js, cargado bajo demanda
var PN_TESS_SRC = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
var pnModoAgregar = false;
var pnTessWorker = null;
function pnCargarTesseract() {
  if (window.Tesseract) return Promise.resolve();
  return new Promise(function(ok, ko) {
    var sc = document.createElement("script");
    sc.src = PN_TESS_SRC; sc.onload = ok; sc.onerror = function(){ ko(new Error("no se pudo cargar el lector de texto (OCR) — revisá la conexión")); };
    document.head.appendChild(sc);
  });
}
async function pnOcrWorker() {
  await pnCargarTesseract();
  if (!pnTessWorker) pnTessWorker = await Tesseract.createWorker("spa");
  return pnTessWorker;
}
// Imagen/canvas → canvas agrandado en escala de grises (mejora mucho el OCR de capturas chicas)
async function pnPrepararImagen(src) {
  var img = src;
  if (src instanceof Blob) {
    img = await new Promise(function(ok, ko) {
      var im = new Image(); im.onload = function(){ ok(im); }; im.onerror = function(){ ko(new Error("imagen inválida")); };
      im.src = URL.createObjectURL(src);
    });
  }
  var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  var k = w < 1600 ? Math.min(3, 1600 / w) : 1;
  var cv = document.createElement("canvas");
  cv.width = Math.round(w * k); cv.height = Math.round(h * k);
  var cx = cv.getContext("2d");
  cx.imageSmoothingQuality = "high";
  cx.drawImage(img, 0, 0, cv.width, cv.height);
  var px = cx.getImageData(0, 0, cv.width, cv.height), dd = px.data;
  for (var i = 0; i < dd.length; i += 4) { var g = 0.299 * dd[i] + 0.587 * dd[i+1] + 0.114 * dd[i+2]; dd[i] = dd[i+1] = dd[i+2] = g; }
  cx.putImageData(px, 0, 0);
  return cv;
}
async function pnOcr(src, etiqueta) {
  pnMsg("Leyendo " + pnEsc(etiqueta) + " (OCR)… la primera vez tarda unos segundos más.", "falta");
  var wk = await pnOcrWorker();
  var r = await wk.recognize(await pnPrepararImagen(src));
  return r.data.text || "";
}
// PDF escaneado: renderiza cada página y la pasa por OCR
async function pnOcrPdf(file) {
  var pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise, out = "";
  for (var p = 1; p <= Math.min(pdf.numPages, 6); p++) {
    var pg = await pdf.getPage(p), vp = pg.getViewport({ scale: 2.5 });
    var cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
    await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    out += (await pnOcr(cv, file.name + " pág. " + p)) + "\n";
  }
  return out;
}

async function pnCargarArchivos(files) {
  files = Array.prototype.slice.call(files || []);
  if (!files.length) return;
  var agregar = pnModoAgregar && pnActual; pnModoAgregar = false;
  try {
    var textos = [], nOcr = 0;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (/^image\//.test(f.type)) { textos.push(await pnOcr(f, f.name || "captura " + (i + 1))); nOcr++; }
      else if (/\.txt$/i.test(f.name)) textos.push(await f.text());
      else {
        pnMsg("Leyendo " + pnEsc(f.name) + "…", "falta");
        var t = await pnExtraerPdf(f);
        if (t.replace(/\s/g, "").length < 80) { t = await pnOcrPdf(f); nOcr++; }
        textos.push(t);
      }
    }
    var nombre = files.length === 1 ? (files[0].name || "Captura") : files.length + " capturas";
    if (agregar || (pnActual && pnActual.base && !pnActual.texto)) pnAgregarTexto(textos.join("\n"), nOcr);
    else pnAnalizarTexto(nombre, textos.join("\n"), nOcr);
  } catch (e) {
    pnMsg("Error leyendo el archivo: " + pnEsc(e.message), "err");
  }
}

// Ctrl+V de una captura (recorte de Windows / Mac) mientras el módulo está abierto
if (typeof document !== "undefined") document.addEventListener("paste", function(e) {
  if (!document.getElementById("pnRoot") || !e.clipboardData) return;
  var t = e.target; if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
  var imgs = Array.prototype.slice.call(e.clipboardData.items || []).filter(function(it){ return /^image\//.test(it.type); }).map(function(it){ return it.getAsFile(); }).filter(Boolean);
  if (!imgs.length) return;
  e.preventDefault();
  pnModoAgregar = !!pnActual && confirm("¿Agregar esta captura al protocolo actual?\n\nAceptar = es la continuación del mismo protocolo\nCancelar = es un protocolo nuevo");
  pnCargarArchivos(imgs);
});

// datos = planilla (base) ⊕ protocolo (texto) ⊕ correcciones manuales
function pnRecalc() {
  var a = pnActual, p = pnParsear(a.texto || ""), b = a.base || {}, d = {}, ev = p.evid;
  var k;
  for (k in b) d[k] = b[k];
  for (k in p.datos) {
    var v = p.datos[k];
    if (k === "edad" || k === "codigos" || k === "paciente") { if (d[k] == null || (k === "codigos" && !d[k].length)) d[k] = v; }
    else if (v === true || (v != null && v !== "")) d[k] = v;
  }
  // de la planilla, sin evidencia en el texto: lo indicamos
  if (a.base) ["edad","codigos","emergencia","injerto","dobleVia","reintervencion","radioscopia"].forEach(function(c){
    if (b[c] != null && b[c] !== false && !(c in p.datos && p.datos[c] === b[c] && ev[c])) ev[c] = (ev[c] ? ev[c] + " · " : "") + "Planilla: " + (a.baseEvid && a.baseEvid[c] || String(b[c]));
  });
  var mv = a.manualVals || {};
  for (k in mv) { d[k] = mv[k]; ev[k] = (ev[k] ? ev[k] + " · " : "") + "cargado a mano"; }
  a.datos = d; a.evid = ev;
  a.escaneado = !a.base && (a.texto || "").replace(/\s/g, "").length < 80 && !Object.keys(mv).length;
}
function pnAnalizarTexto(nombre, texto, nOcr) {
  pnActual = { nombre: nombre, texto: texto, base: null, fila: null, manualVals: {}, ov: {}, facturado: null, valor: "", ocr: nOcr || 0, ts: Date.now() };
  pnRecalc(); pnRepintar();
}
// Suma texto de otra captura al protocolo actual (conserva planilla, decisiones y correcciones)
function pnAgregarTexto(texto, nOcr) {
  var a = pnActual;
  a.texto = (a.texto ? a.texto + "\n" : "") + texto;
  a.ocr = (a.ocr || 0) + (nOcr || 0);
  if (!/captura/.test(a.nombre)) a.nombre += " + captura";
  pnRecalc(); pnRepintar();
}
function pnPegarTexto() {
  var t = prompt("Pegá el texto del protocolo quirúrgico:");
  if (t && t.trim()) pnAnalizarTexto("Texto pegado", t);
}

// ── Historial (localStorage)
function pnHist() { try { return JSON.parse(localStorage.getItem(PN_HIST_KEY) || "[]"); } catch (e) { return []; } }
function pnGuardarHist() {
  if (!pnActual) return;
  var res = pnEvaluar(pnActual.datos, pnActual.ov);
  var h = pnHist().filter(function(x){ return x.ts !== pnActual.ts; });
  h.unshift({ ts: pnActual.ts, nombre: pnActual.nombre, paciente: pnActual.datos.paciente || "", fecha: pnActual.datos.fecha || "",
    codigos: pnActual.datos.codigos || [], totalPct: res.totalPct, facturado: pnActual.facturado,
    datos: pnActual.datos, evid: pnActual.evid, ov: pnActual.ov, valor: pnActual.valor, texto: (pnActual.texto || "").slice(0, 20000),
    base: pnActual.base, baseEvid: pnActual.baseEvid, fila: pnActual.fila, manualVals: pnActual.manualVals });
  try { localStorage.setItem(PN_HIST_KEY, JSON.stringify(h.slice(0, 200))); pnMsg("Guardado en el historial.", "ok"); }
  catch (e) { pnMsg("No se pudo guardar: " + pnEsc(e.message), "err"); }
  var b = document.querySelector('[onclick="pnVerHistorial()"]'); if (b) b.textContent = "🗂 Historial (" + h.length + ")";
}
function pnVerHistorial() {
  var h = pnHist(), root = document.getElementById("pnRoot");
  var html = '<div class="adm-sec-title">Protocolos analizados</div><div class="deb-toolbar" style="margin-bottom:8px"><button class="deb-btn" onclick="pnRepintar()">← Volver</button></div>';
  if (!h.length) html += '<div style="color:#6b6a5a;font-size:.8rem">Todavía no hay protocolos guardados.</div>';
  else {
    html += '<table class="pn-tab"><thead><tr><th>Fecha cx</th><th>Paciente</th><th>Código</th><th style="text-align:right">Corresponde</th><th style="text-align:right">Facturado</th><th></th></tr></thead><tbody>';
    h.forEach(function(x, i) {
      var cmp = pnComparar(x.totalPct, x.facturado);
      html += '<tr><td>' + pnEsc(x.fecha ? x.fecha.split("-").reverse().join("/") : "—") + '</td><td>' + pnEsc(x.paciente || x.nombre) + '</td><td>' + pnEsc((x.codigos || []).join(", ")) + '</td>'
        + '<td class="num">+' + x.totalPct + '%</td><td class="num">' + (x.facturado != null && x.facturado !== "" ? "+" + pnEsc(x.facturado) + "%" : "—") + (cmp && cmp.tipo !== "ok" ? ' <span class="pn-chip ' + (cmp.tipo === "falta" ? "pn-ex" : "pn-ex") + '">' + (cmp.tipo === "falta" ? "falta" : "exceso") + '</span>' : '') + '</td>'
        + '<td style="white-space:nowrap"><button class="deb-btn" onclick="pnAbrirHist(' + i + ')">Abrir</button> <button class="deb-btn" onclick="pnBorrarHist(' + i + ')">✕</button></td></tr>';
    });
    html += '</tbody></table>';
  }
  root.innerHTML = html;
}
function pnAbrirHist(i) {
  var x = pnHist()[i]; if (!x) return;
  pnActual = { nombre: x.nombre, texto: x.texto || "", base: x.base || null, baseEvid: x.baseEvid, fila: x.fila || null, manualVals: x.manualVals || {}, ov: x.ov || {}, facturado: x.facturado, valor: x.valor, ts: x.ts };
  if (!x.manualVals && !x.base) pnActual.manualVals = { codigos: x.datos.codigos, edad: x.datos.edad, fecha: x.datos.fecha, horaInicio: x.datos.horaInicio };
  pnRecalc(); pnRepintar();
}
function pnBorrarHist(i) {
  if (!confirm("¿Borrar este protocolo del historial?")) return;
  var h = pnHist(); h.splice(i, 1);
  localStorage.setItem(PN_HIST_KEY, JSON.stringify(h));
  pnVerHistorial();
}


// ══════════════════════════════════════════════════════════════════
// PLANILLA DE CIRUGÍAS (la del generador de órdenes)
// "Cirugias" → hoja "Respuestas de formulario 1". El formulario se escribió en dos
// bloques de columnas: B..T (viejo) y W..AM (actual). Se toma el que tenga paciente.
// ══════════════════════════════════════════════════════════════════
var PN_CX_SHEET_ID = "1VYIarOpfCgqinj5Uy2dAYCSsx6c5GL9J7YbAYKvCbdk";
var PN_CX_SHEET = "Respuestas de formulario 1";
var PN_BLOQUE_NUEVO = { paciente:22, entidad:23, afiliado:24, dx:25, materiales:26, nn:27, nun:28, fecha:29, dr:30, dni:31, edad:33, lado:34, obs:38 };
var PN_BLOQUE_VIEJO = { paciente:1, entidad:2, afiliado:3, dx:4, materiales:5, nn:6, nun:7, dni:8, dr:9, fecha:10, edad:12, lado:13, obs:19 };
var pnPlan = null;       // { filas:[...], ts }
var pnPlanFiltro = { q: "", dr: "", soloDif: true, desde: "" };

var PN_MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
// "6/11/2025", "6 11 2025", "25/11", "20/11/25", "18 noviembre", "13 de noviembre", "11/11/2025 URGENTE!"
function pnFechaLibre(s, ref) {
  var t = pnNorm(s), y0 = ref ? ref.getFullYear() : new Date().getFullYear(), m;
  var arma = function(d, mes, y) {
    if (y == null) { y = y0; if (ref && mes < ref.getMonth() - 6) y++; }
    if (y < 100) y += 2000;
    var f = new Date(y, mes, d);
    return f.getMonth() === mes ? pnIso(f) : "";
  };
  if ((m = t.match(/(\d{1,2})\s*[\/\-. ]\s*(\d{1,2})\s*[\/\-. ]\s*(\d{2,4})/))) return arma(+m[1], +m[2] - 1, +m[3]);
  if ((m = t.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\b/))) return arma(+m[1], +m[2] - 1, null);
  if ((m = t.match(/(\d{1,2})\s*(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s*(?:de\s*)?(\d{4}))?/))) {
    var mi = m[2] === "setiembre" ? 8 : PN_MESES.indexOf(m[2]);
    return arma(+m[1], mi, m[3] ? +m[3] : null);
  }
  return "";
}

// Texto de la columna "NUN + % adicional" → códigos, % pedido y qué conceptos menciona
function pnPedidoParse(txt) {
  var t = pnNorm(txt), pct = 0, m, re = /(\d{1,3}(?:[.,]\d+)?)\s*%|%\s*(\d{1,3})/g;
  while ((m = re.exec(t))) pct += parseFloat((m[1] || m[2]).replace(",", "."));
  return {
    codigos: pnParsear(txt).datos.codigos || [],
    pct: pct,
    x2: /\bx\s?2\b|ambas|ambos|bilateral/.test(t),
    conc: { edad: /edad|extrema/.test(t), rx: /\brx\b|radiosc|intensif|\brayos\b/.test(t), injerto: /injerto|banco|sustituto/.test(t),
            urg: /urgen|emergen/.test(t), doble: /doble|2 vias|dos vias|abordaje/.test(t), reint: /reinterv|recidiva|complicacion/.test(t),
            horario: /noctur|feriado|fin de semana|sabado|domingo/.test(t) }
  };
}

// Fila de la planilla (array de celdas en texto) → registro
function pnFilaPlanilla(cel, idx) {
  var B = (cel[PN_BLOQUE_NUEVO.paciente] || "").trim() ? PN_BLOQUE_NUEVO : PN_BLOQUE_VIEJO;
  var g = function(k){ return String(cel[B[k]] == null ? "" : cel[B[k]]).trim(); };
  var r = { idx: idx, marca: String(cel[0] || ""), paciente: g("paciente"), entidad: g("entidad"), afiliado: g("afiliado"), dx: g("dx"),
    materiales: g("materiales"), nn: g("nn"), nunTxt: g("nun"), fechaTxt: g("fecha"), dr: g("dr"), dni: g("dni"), lado: g("lado"), obs: g("obs") };
  if (!r.paciente || /^apellido y nombre/i.test(r.paciente)) return null;
  var ref = pnParseFecha(r.marca);
  r.fecha = pnFechaLibre(r.fechaTxt, ref);
  var e = parseInt(g("edad"), 10); r.edad = isNaN(e) || e > 110 ? null : e;
  var ped = pnPedidoParse(r.nunTxt);
  r.codigos = ped.codigos; r.pedidoPct = ped.pct; r.pedidoConc = ped.conc; r.x2 = ped.x2;
  return r;
}

// Registro de planilla → datos base para el motor (+ de dónde salió cada uno)
function pnBaseDesdeFila(r) {
  var b = { paciente: r.paciente, edad: r.edad, codigos: r.codigos.slice(), fecha: r.fecha }, ev = {};
  if (r.edad != null) ev.edad = "edad " + r.edad;
  if (r.codigos.length) ev.codigos = r.nunTxt;
  var todo = pnNorm([r.dx, r.fechaTxt, r.obs, r.nunTxt].join(" | "));
  var mat = pnNorm(r.materiales + " | " + r.dx);
  if (/urgen|emergen/.test(todo)) { b.emergencia = true; ev.emergencia = "marcada URGENTE en la orden"; }
  if (/aloinjerto|banco de (hueso|tejido)|injerto (oseo )?(de )?banco|hueso (de )?banco|chips? (oseos? )?(de )?banco/.test(mat) && !/aloinjerto de tendon/.test(mat)) { b.injerto = "banco"; ev.injerto = "materiales: " + r.materiales; }
  else if (/injerto (oseo )?autologo|autoinjerto oseo|cresta iliaca/.test(mat)) { b.injerto = "autologo"; ev.injerto = "materiales: " + r.materiales; }
  else if (/sustituto|hidroxiapatita|fosfato (tri)?calcico|sulfato de calcio|\bdbm\b|matriz osea|chronos|cerament|biovidrio/.test(mat)) { b.injerto = "sustituto"; ev.injerto = "materiales: " + r.materiales; }
  if (/doble (abordaje|via|incision)|dos (abordajes|vias)/.test(todo) && !r.x2) { b.dobleVia = true; ev.dobleVia = r.nunTxt; }
  if (/\bre ?-?ruptura|rerruptura|recidiva|reinterv|revision|recambio|infeccion (protesica|de protesis|del material)|aflojamiento|pseudoartrosis|seudoartrosis|refractura/.test(pnNorm(r.dx))) r.reintSosp = true; // solo como observación: se confirma con el protocolo
  if (r.pedidoConc.rx) { b.radioscopia = true; ev.radioscopia = "la orden pide +5% rx (confirmar en el protocolo)"; }
  return { base: b, baseEvid: ev };
}

// Evalúa una fila: lo que corresponde según la planilla vs lo pedido
function pnEvaluarFila(r) {
  var bb = pnBaseDesdeFila(r), res = pnEvaluar(bb.base, {}), notas = [], c = r.pedidoConc;
  var it = {}; res.items.forEach(function(x){ it[x.clave] = x; });
  if (r.edad != null) {
    if (c.edad && !it.edad.aplica) notas.push("Pidió edad extrema con " + r.edad + " años: corresponde solo hasta 10 o MAYORES de 65.");
    if (!c.edad && it.edad.aplica && !(it.emergencia.aplica && c.urg)) notas.push("Paciente de " + r.edad + " años: corresponde +20% edad extrema y no figura.");
  } else if (c.edad) notas.push("Pidió edad extrema pero la orden no tiene la edad.");
  if (it.emergencia.aplica && !c.urg && !it.emergencia.excluida && !c.edad) notas.push("Orden marcada URGENTE: puede corresponder +20% emergencia (si cumple la definición del NUN).");
  if (c.urg && c.edad) notas.push("Pidió urgencia y edad extrema juntas: no son acumulables (NS 3).");
  if (bb.base.injerto && !c.injerto && it.injerto.aplica) notas.push("Materiales con injerto (" + bb.base.injerto + "): puede corresponder +" + it.injerto.pct + "%.");
  var txCod = pnNorm(res.codigos.map(function(x){ return x.texto; }).join(" "));
  if (r.reintSosp && !c.reint && !/revision|recambio|reconversion|segundo tiempo|infectad|recidiva|biopsia|punci/.test(txCod)) notas.push("El diagnóstico sugiere reintervención: si lo es, corresponde +30% (NP 3). Confirmar con el protocolo.");
  if (c.reint && !r.reintSosp) notas.push("Pidió reintervención: confirmar en el protocolo que sea revisión de recidiva o complicación.");
  if (r.x2) notas.push("Bilateral / x2: cada lado se factura al 100% (NP 2a), no +50%.");
  if (!r.codigos.length) notas.push("Sin código NUN reconocible en la orden.");
  if (c.horario) notas.push("Pidió recargo horario: confirmar la hora en el protocolo.");
  var cmp = pnComparar(res.totalPct, r.pedidoPct);
  var estado = cmp.tipo === "ok" && !notas.length ? "ok" : (cmp.tipo === "ok" ? "nota" : cmp.tipo);
  return { res: res, esperado: res.totalPct, cmp: cmp, notas: notas, estado: estado };
}

// gviz JSONP (igual que CPSM): la planilla tiene que estar compartida "cualquiera con el link"
function pnCargarPlanilla(cb) {
  var cbName = "__pnCx" + Date.now(), done = false;
  var fin = function(x, err) { if (done) return; done = true; clearTimeout(to); window[cbName] = function(){}; var sc0 = document.getElementById(cbName); if (sc0) sc0.remove(); cb(x, err); };
  var to = setTimeout(function(){ fin(null, "La planilla no respondió (15 s)."); }, 15000);
  window[cbName] = function(resp) {
    try {
      if (!resp || resp.status === "error") return fin(null, "Google devolvió error: " + ((resp && resp.errors && resp.errors[0] && resp.errors[0].detailed_message) || "sin acceso — ¿la planilla está compartida con el link?"));
      var txt = function(c) { return c ? String(c.f != null ? c.f : (c.v != null ? c.v : "")) : ""; };
      var filas = [];
      (resp.table.rows || []).forEach(function(row, i) {
        var r = pnFilaPlanilla((row.c || []).map(txt), i + 2);
        if (r) { r.ev = pnEvaluarFila(r); filas.push(r); }
      });
      filas.reverse(); // más nuevas primero
      fin({ filas: filas, ts: Date.now() });
    } catch (e) { fin(null, "No pude interpretar la planilla: " + e.message); }
  };
  var sc = document.createElement("script");
  sc.id = cbName;
  sc.onerror = function(){ fin(null, "No se pudo conectar con Google Sheets."); };
  sc.src = "https://docs.google.com/spreadsheets/d/" + PN_CX_SHEET_ID + "/gviz/tq?sheet=" + encodeURIComponent(PN_CX_SHEET)
    + "&headers=1&tq=" + encodeURIComponent("select *") + "&tqx=out:json;responseHandler:" + cbName + "&_=" + Date.now();
  document.head.appendChild(sc);
}

function pnConPlanilla(fn, forzar) {
  if (pnPlan && !forzar) return fn();
  var root = document.getElementById("pnRoot");
  if (root) root.innerHTML = '<div class="adm-sec-title">Planilla de Cirugías</div><div style="padding:20px;color:#6b6a5a">Leyendo la planilla de Cirugías…</div>';
  pnCargarPlanilla(function(x, err) {
    if (!x) { if (root) root.innerHTML = '<div class="adm-sec-title">Planilla de Cirugías</div><div class="pn-aviso pn-err">' + pnEsc(err) + '</div><button class="deb-btn" onclick="pnRepintar()">← Volver</button>'; return; }
    pnPlan = x; fn();
  });
}

function pnVerPlanilla(forzar) { pnConPlanilla(pnPintarPlanilla, forzar); }

var PN_ESTADO = { ok: ["pn-si", "✓ OK"], nota: ["pn-ex", "Revisar"], falta: ["pn-ex", "Falta %"], exceso: ["pn-exceso-chip", "Pidió de más"] };
function pnPintarPlanilla() {
  var root = document.getElementById("pnRoot"); if (!root) return;
  var f = pnPlanFiltro, q = pnNorm(f.q), todas = pnPlan.filas;
  var drs = {}; todas.forEach(function(r){ if (r.dr) drs[r.dr.trim()] = 1; });
  var lista = todas.filter(function(r) {
    if (f.dr && r.dr.trim() !== f.dr) return false;
    if (f.desde && (!r.fecha || r.fecha < f.desde)) return false;
    if (f.soloDif && r.ev.estado === "ok") return false;
    if (q && pnNorm([r.paciente, r.dni, r.dr, r.nunTxt, r.dx].join(" ")).indexOf(q) < 0) return false;
    return true;
  });
  var nDif = todas.filter(function(r){ return r.ev.estado !== "ok"; }).length;
  var h = '<div class="adm-sec-title">Planilla de Cirugías · % adicionales pedidos</div>'
    + '<div class="deb-toolbar" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">'
    +   '<button class="deb-btn" onclick="pnRepintar()">← Volver</button>'
    +   '<input class="pn-inp" style="width:200px" placeholder="Buscar paciente, DNI, código…" value="' + pnEsc(f.q) + '" oninput="pnPlanFiltro.q=this.value;clearTimeout(window._pnQ);window._pnQ=setTimeout(pnPintarPlanilla,250)">'
    +   '<select class="pn-sel" style="padding:6px" onchange="pnPlanFiltro.dr=this.value;pnPintarPlanilla()"><option value="">Todos los Dr.</option>'
    +     Object.keys(drs).sort().map(function(d){ return '<option' + (d === f.dr ? ' selected' : '') + '>' + pnEsc(d) + '</option>'; }).join("") + '</select>'
    +   '<label style="font-size:.72rem">Cirugías desde <input class="pn-inp" style="width:140px" type="date" value="' + f.desde + '" onchange="pnPlanFiltro.desde=this.value;pnPintarPlanilla()"></label>'
    +   '<label style="font-size:.72rem;display:flex;align-items:center;gap:4px"><input type="checkbox"' + (f.soloDif ? ' checked' : '') + ' onchange="pnPlanFiltro.soloDif=this.checked;pnPintarPlanilla()"> Solo con observaciones</label>'
    +   '<span style="flex:1"></span><button class="deb-btn" onclick="pnVerPlanilla(true)">↻ Recargar</button>'
    + '</div>'
    + '<div style="font-size:.72rem;color:#6b6a5a;margin-bottom:6px">' + todas.length + ' órdenes · <b>' + nDif + '</b> con observaciones · mostrando ' + Math.min(lista.length, 300) + (lista.length > 300 ? ' de ' + lista.length : '') + '. La planilla no tiene la hora ni el detalle de la cirugía: horario, radioscopía y ayudantes se confirman con el protocolo (botón Analizar).</div>';
  h += '<table class="pn-tab"><thead><tr><th>Fecha cx</th><th>Paciente</th><th>Dr</th><th style="text-align:right">Edad</th><th>NUN pedido</th><th style="text-align:right">Pedido</th><th style="text-align:right">Corresponde</th><th>Estado</th><th></th></tr></thead><tbody>';
  lista.slice(0, 300).forEach(function(r) {
    var es = PN_ESTADO[r.ev.estado] || PN_ESTADO.nota;
    h += '<tr><td style="white-space:nowrap">' + pnEsc(r.fecha ? r.fecha.split("-").reverse().join("/") : r.fechaTxt) + '</td>'
      + '<td>' + pnEsc(r.paciente) + '<div class="pn-ev" style="font-style:normal">' + pnEsc(r.entidad) + ' · ' + pnEsc(r.dx) + '</div></td>'
      + '<td>' + pnEsc(r.dr) + '</td><td class="num">' + (r.edad != null ? r.edad : '—') + '</td>'
      + '<td>' + pnEsc(r.nunTxt) + '</td><td class="num">' + (r.pedidoPct ? '+' + r.pedidoPct + '%' : '—') + '</td>'
      + '<td class="num">' + (r.ev.esperado ? '+' + r.ev.esperado + '%' : '—') + '</td>'
      + '<td><span class="pn-chip ' + es[0] + '">' + es[1] + '</span>'
      + (r.ev.cmp.tipo !== "ok" ? '<div class="pn-ev" style="font-style:normal">' + pnEsc(r.ev.cmp.txt) + '</div>' : '')
      + r.ev.notas.map(function(n){ return '<div class="pn-ev" style="font-style:normal">• ' + pnEsc(n) + '</div>'; }).join("") + '</td>'
      + '<td><button class="deb-btn" style="font-size:.7rem;padding:3px 8px" onclick="pnAbrirFila(' + r.idx + ')">Analizar</button></td></tr>';
  });
  h += '</tbody></table>';
  root.innerHTML = h;
}

function pnFilaPorIdx(idx) { return (pnPlan && pnPlan.filas || []).filter(function(r){ return r.idx === idx; })[0] || null; }
function pnFilaCompacta(r) {
  return { idx: r.idx, paciente: r.paciente, entidad: r.entidad, dx: r.dx, materiales: r.materiales, nunTxt: r.nunTxt, fechaTxt: r.fechaTxt, fecha: r.fecha, dr: r.dr, dni: r.dni, edad: r.edad, pedidoPct: r.pedidoPct };
}
function pnAbrirFila(idx) {
  var r = pnFilaPorIdx(idx); if (!r) return;
  var bb = pnBaseDesdeFila(r);
  pnActual = { nombre: "Orden de " + r.paciente, texto: "", base: bb.base, baseEvid: bb.baseEvid, fila: pnFilaCompacta(r), manualVals: {}, ov: {}, facturado: r.pedidoPct, valor: "", ocr: 0, ts: Date.now() };
  pnRecalc(); pnRepintar(); window.scrollTo(0, 0);
}
function pnFilaResumenHtml(r) {
  return '<div class="pn-aviso" style="background:rgba(31,58,46,.07);font-size:.72rem">📋 <b>Planilla de Cirugías</b> (fila ' + r.idx + '): ' + pnEsc(r.paciente) + ' · ' + pnEsc(r.entidad) + ' · Dr ' + pnEsc(r.dr)
    + ' · edad ' + (r.edad != null ? r.edad : '—') + ' · cx ' + pnEsc(r.fechaTxt) + '<br>Dx: ' + pnEsc(r.dx) + (r.materiales ? ' · Materiales: ' + pnEsc(r.materiales) : '')
    + '<br>Pedido en la orden: <b>' + pnEsc(r.nunTxt) + '</b> <button class="deb-btn" style="font-size:.65rem;padding:1px 7px;margin-left:6px" onclick="pnDesvincular()">desvincular</button></div>';
}
function pnDesvincular() { pnActual.base = null; pnActual.baseEvid = null; pnActual.fila = null; pnRecalc(); pnRepintar(); }

// Busca en la planilla la orden del paciente del protocolo actual
function pnVincularPlanilla() {
  pnConPlanilla(function() {
    pnRepintar();
    var root = document.getElementById("pnRoot");
    var pac = (pnActual.datos && pnActual.datos.paciente) || "";
    var div = document.createElement("div");
    div.id = "pnVinc";
    div.className = "pn-aviso";
    div.style.background = "rgba(32,36,31,.05)";
    div.innerHTML = '<b>Elegí la orden de la planilla:</b> <input class="pn-inp" style="width:240px;margin:0 6px" id="pnVincQ" value="' + pnEsc(pac.split(/[ ,]+/)[0] || "") + '" oninput="pnVincListar()" placeholder="Apellido o DNI"> <button class="deb-btn" style="font-size:.7rem;padding:3px 8px" onclick="pnRepintar()">Cancelar</button><div id="pnVincList" style="margin-top:6px"></div>';
    root.insertBefore(div, root.children[2] || null);
    pnVincListar();
  });
}
function pnVincListar() {
  var q = pnNorm((document.getElementById("pnVincQ") || {}).value || ""), el = document.getElementById("pnVincList");
  if (!el) return;
  var toks = q.split(/\s+/).filter(function(t){ return t.length > 1; });
  var m = pnPlan.filas.filter(function(r){ var t = pnNorm(r.paciente + " " + r.dni.replace(/\D/g, "")); return toks.length && toks.every(function(k){ return t.indexOf(k) >= 0; }); }).slice(0, 12);
  el.innerHTML = m.length ? m.map(function(r){
    return '<div style="padding:4px 0;border-bottom:1px solid #d9d0b8;font-size:.74rem"><button class="deb-btn" style="font-size:.68rem;padding:2px 8px;margin-right:6px" onclick="pnVincularFila(' + r.idx + ')">Usar</button>'
      + pnEsc(r.paciente) + ' · ' + pnEsc(r.fechaTxt) + ' · Dr ' + pnEsc(r.dr) + ' · ' + pnEsc(r.nunTxt) + '</div>';
  }).join("") : '<div style="font-size:.72rem;color:#6b6a5a">Sin coincidencias.</div>';
}
function pnVincularFila(idx) {
  var r = pnFilaPorIdx(idx); if (!r) return;
  var bb = pnBaseDesdeFila(r);
  pnActual.base = bb.base; pnActual.baseEvid = bb.baseEvid; pnActual.fila = pnFilaCompacta(r);
  if (pnActual.facturado == null || pnActual.facturado === "") pnActual.facturado = r.pedidoPct;
  pnRecalc(); pnRepintar();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { pnParsear: pnParsear, pnEvaluar: pnEvaluar, pnHorario: pnHorario, pnComparar: pnComparar, pnFilaPlanilla: pnFilaPlanilla, pnEvaluarFila: pnEvaluarFila, pnFechaLibre: pnFechaLibre };
}
