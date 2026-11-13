// Copia de seguridad del panel: baja TODO el localStorage a un .json y avisa
// a partir del día 21 de cada mes si todavía no se hizo la copia de ese mes.
//
// No restaura nada (eso se hace a mano, ver PUBLICAR.md): solo exporta.
// Un navegador no puede guardar archivos solo, por eso en vez de exportar
// automático se muestra un aviso con el botón.

var BACKUP_DIA_AVISO = 21;
var BACKUP_ULTIMO_KEY = "ceot_backup_ultimo"; // "AAAA-MM" del último mes exportado

function backupMesClave(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function backupUltimoMes() {
  try { return localStorage.getItem(BACKUP_ULTIMO_KEY) || ""; } catch (e) { return ""; }
}

// Aviso si hoy es día 21 o posterior y el mes en curso no se exportó.
// También avisa si quedó pendiente el mes anterior (nunca se hizo desde el 21).
function backupHayQueAvisar(hoy) {
  hoy = hoy || new Date();
  if (hoy.getDate() < BACKUP_DIA_AVISO) return false;
  return backupUltimoMes() !== backupMesClave(hoy);
}

function backupExportar() {
  var datos = {};
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k === BACKUP_ULTIMO_KEY) continue;
      datos[k] = localStorage.getItem(k);
    }
  } catch (e) {
    alert("No pude leer los datos del navegador: " + e.message);
    return;
  }
  var ahora = new Date();
  var pad = function(n) { return String(n).padStart(2, "0"); };
  var fecha = ahora.getFullYear() + "-" + pad(ahora.getMonth() + 1) + "-" + pad(ahora.getDate());
  var paquete = {
    app: "ceot-admin-panel",
    exportado: ahora.toISOString(),
    build: (typeof CURRENT_BUILD !== "undefined" ? CURRENT_BUILD : ""),
    claves: Object.keys(datos).length,
    localStorage: datos
  };
  var blob = new Blob([JSON.stringify(paquete, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "ceot-backup-" + fecha + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
  try { localStorage.setItem(BACKUP_ULTIMO_KEY, backupMesClave(ahora)); } catch (e) {}
  backupAvisoRender();
}

function backupDescartarAviso() {
  var el = document.getElementById("admBackupAviso");
  if (el) el.remove(); // solo hasta que se recargue; no marca el mes como hecho
}

// Banner arriba de la home de admin. Se llama después de armar la home.
function backupAvisoRender() {
  var viejo = document.getElementById("admBackupAviso");
  if (viejo) viejo.remove();
  if (!backupHayQueAvisar()) return;
  var cont = document.getElementById("adm-content");
  if (!cont) return;
  var div = document.createElement("div");
  div.id = "admBackupAviso";
  div.style.cssText = "display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:10px 14px;border-radius:12px;background:#fff4d6;border:1px solid #e8c96a;color:#5a4410;font-size:.82rem";
  div.innerHTML =
    '<span style="flex:1;min-width:200px"><b>Copia de seguridad del mes pendiente.</b> '
    + 'Ya pasó el día ' + BACKUP_DIA_AVISO + ' y todavía no exportaste los datos de este mes.</span>'
    + '<button onclick="backupExportar()" style="cursor:pointer;border:0;border-radius:8px;padding:7px 14px;background:#1f3a2e;color:#fff;font-weight:700;font-size:.8rem">Exportar ahora</button>'
    + '<button onclick="backupDescartarAviso()" style="cursor:pointer;border:1px solid rgba(90,68,16,.35);border-radius:8px;padding:7px 12px;background:transparent;color:#5a4410;font-size:.8rem">Más tarde</button>';
  cont.insertBefore(div, cont.firstChild);
}
