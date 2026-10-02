// redsom.js — Seguimiento liquidaciones REDSOM: detalle completo (consultas,
// cirugías, etc.) de todo lo facturado a REDSOM, por profesional y paciente.
// Se completa solo como efecto secundario del import de CEOT.xlsx/.txt (ver
// extraerRedsomDeRegistros()/guardarRedsomImportados() en
// importar-liquidacion.js) — no hay carga manual, subir el archivo por
// "Importar" alcanza.

var redsomPeriodoActual = '';

function redsomGetGuardados() {
  try { return JSON.parse(localStorage.getItem('redsom_guardados') || '[]'); } catch (e) { return []; }
}

function redsomCargarPeriodo(key) {
  try { return JSON.parse(localStorage.getItem('redsom_imp_' + key) || '[]') || []; } catch (e) { return []; }
}

function renderSeguimientoRedsom(periodo) {
  cerrarAdmSidenav();
  admDesactivarSidebar();
  var btn = document.getElementById('adm-sidenav-redsom');
  if (btn) btn.className = 'adm-sidenav-btn active';

  var guardados = redsomGetGuardados();
  if (periodo) redsomPeriodoActual = periodo;
  if (!redsomPeriodoActual || guardados.indexOf(redsomPeriodoActual) === -1) {
    redsomPeriodoActual = guardados[0] || '';
  }

  var html = '<div class="deb-toolbar" style="flex-wrap:wrap;gap:6px">'
    + (guardados.length
        ? '<select class="deb-mes-sel" id="redsomMesSel" onchange="renderSeguimientoRedsom(this.value)">'
          + guardados.map(function(g) {
              return '<option value="' + g + '"' + (g === redsomPeriodoActual ? ' selected' : '') + '>' + g + '</option>';
            }).join('')
          + '</select>'
        : '')
    + '<button class="deb-btn deb-btn-pri" onclick="actionFeedback(this); imprimirRedsom()" style="margin-left:4px">🖨 Imprimir</button>'
    + '</div>';

  if (!guardados.length) {
    html += '<div style="padding:20px;text-align:center;color:rgba(32,36,31,.45);font-style:italic">'
      + 'Todavía no se importó ningún archivo con registros de REDSOM — se completa solo al subir el CEOT.xlsx/.txt por "Importar".</div>';
    document.getElementById('adm-content').innerHTML = html;
    return;
  }

  var items = redsomCargarPeriodo(redsomPeriodoActual);

  var porProf = {};
  items.forEach(function(it) { porProf[it.prof || '—'] = (porProf[it.prof || '—'] || 0) + (it.imp || 0); });
  var profs = Object.keys(porProf).sort(function(a, b) { return porProf[b] - porProf[a]; });
  var total = items.reduce(function(s, it) { return s + (it.imp || 0); }, 0);

  html += '<div class="deb-stats">'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Registros</div><div class="deb-stat-val">' + items.length + '</div></div>'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Profesionales</div><div class="deb-stat-val">' + profs.length + '</div></div>'
    + '<div class="deb-stat"><div class="deb-stat-lbl">Total facturado</div><div class="deb-stat-val">' + fmtImp(total) + '</div></div>'
    + '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin-bottom:14px">'
    + profs.map(function(p) {
        return '<div style="padding:8px 10px;background:rgba(32,36,31,.05);border-radius:8px">'
          + '<div style="font-size:.62rem;color:rgba(32,36,31,.5);text-transform:uppercase;letter-spacing:.03em">' + p + '</div>'
          + '<div style="font-size:.95rem;font-weight:800">' + fmtImp(porProf[p]) + '</div></div>';
      }).join('')
    + '</div>';

  html += '<div class="deb-table-wrap"><table class="deb-table" style="font-size:0.71rem;color:#222">'
    + '<thead><tr>'
    + '<th>#</th><th>Factura</th><th>Per.</th>'
    + '<th>Profesional</th><th>ROL</th>'
    + '<th>DNI</th><th>Paciente</th>'
    + '<th>Práctica</th><th>Tipo</th>'
    + '<th style="text-align:right">Importe</th>'
    + '</tr></thead><tbody>';

  items.forEach(function(it, i) {
    var tipoColor = it.tipo === 'DÉBITO' ? '#b13a2c' : (it.tipo === 'GASTOS' ? '#c2410c' : '#1f3a2e');
    html += '<tr>'
      + '<td style="color:rgba(32,36,31,.35);text-align:center;font-size:0.67rem">' + (i + 1) + '</td>'
      + '<td style="font-family:monospace;color:rgba(32,36,31,.6);white-space:nowrap;font-size:0.67rem">' + (it.factura || '—') + '</td>'
      + '<td style="color:rgba(32,36,31,.6);white-space:nowrap">' + (it.periodo || '—') + '</td>'
      + '<td style="color:#20241f;white-space:nowrap">' + (it.prof || '—') + '</td>'
      + '<td style="color:rgba(32,36,31,.45);font-size:0.67rem">' + (it.rol || '') + '</td>'
      + '<td style="font-family:monospace;color:rgba(32,36,31,.5);font-size:0.67rem">' + (it.dni || '') + '</td>'
      + '<td style="color:#20241f">' + (it.paciente || '—') + '</td>'
      + '<td style="font-size:0.65rem;color:rgba(32,36,31,.5)">' + (it.practica || '') + '</td>'
      + '<td style="color:' + tipoColor + ';font-weight:700;white-space:nowrap">' + it.tipo + '</td>'
      + '<td style="font-weight:600;text-align:right;white-space:nowrap">' + fmtImp(it.imp) + '</td>'
      + '</tr>';
  });

  html += '<tr class="deb-total-row">'
    + '<td colspan="9">TOTAL</td>'
    + '<td style="text-align:right;font-weight:700">' + fmtImp(total) + '</td></tr>';
  html += '</tbody></table></div>';

  document.getElementById('adm-content').innerHTML = html;
}

function imprimirRedsom() { window.print(); }
