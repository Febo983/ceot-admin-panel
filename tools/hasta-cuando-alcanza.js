// Hasta qué mes le alcanza a cada profesional el fondo de Retención Ganancias.
// Pegar en la consola de Chrome (F12 → Console) con el panel admin abierto y la
// sesión iniciada. Imprime el listado y lo deja copiado al portapapeles.
// Misma cuenta que "Reparto del fondo": acreditado + intereses PF − pagados.
(function () {
  var f = function (n) { return '$ ' + Math.round(n).toLocaleString('es-AR'); };
  var plan = incidenciaPlanCargar(), pagos = incidenciaPagosCargar();
  var inv = (typeof invAcumuladoProfesionalData === 'function') ? invAcumuladoProfesionalData() : { acum: {} };
  var nom = function (d) {
    var k = d.junioKey || '', i = k.indexOf(',');
    return i < 0 ? d.nombre : k.slice(i + 1).trim() + ' ' + k.slice(0, i).trim();
  };
  var filas = [];
  incidenciaApellidos().forEach(function (ap) {
    var d = DOCTORES.filter(function (x) { return x.apellido === ap; })[0];
    if (!d) return;
    var pct = INCIDENCIA_FONDO_PCT[ap] || 0, pctAnt = incidenciaAnticipoPct(ap);
    var cal = incidenciaCalendario(Math.round((plan.inm || 0) * pct), Math.round((plan.d30 || 0) * pct),
      Math.round((plan.cuota || 0) * pct), plan.nc || 0, Math.round((plan.ant || 0) * pctAnt), plan.na || 0);
    var acum = (getAporteCeotAcumuladoPorApellido([ap])[ap] || 0) + ((inv.acum[ap] || {}).interes || 0);
    cal = cal.map(function (v, i) { if (pagos[i]) { acum -= v; return 0; } return v; });
    var pend = 0;
    APORTE_CEOT_DESDE.forEach(function (p) {
      var c = calcularNetoLocal(p, d);
      if (c) pend += (c.aporteCeot || 0) - aporteCeotAcreditadoHoy(c);
    });
    var n = incidenciaMesesQueCubre(acum, cal), nT = incidenciaMesesQueCubre(acum + pend, cal);
    var saldo = acum; for (var i = 0; i < n; i++) saldo -= cal[i];
    var cubre = 0; for (var j = 0; j < n; j++) if (!pagos[j]) cubre++;
    var hasta = n >= cal.length ? 'todo el plan (hasta ' + incidenciaMesCorto(cal.length - 1) + ')'
      : cubre === 0 ? 'NO alcanza para ' + incidenciaMesCorto(n) : incidenciaMesCorto(n - 1);
    var t = nom(d) + ' — le alcanza hasta: ' + hasta + ' · disponible ' + f(acum);
    if (n < cal.length) t += ' · ' + incidenciaMesCorto(n) + ' faltan ' + f(cal[n] - saldo);
    if (nT > n) t += ' · con lo pendiente (' + f(pend) + '): hasta ' + (nT >= cal.length ? 'todo el plan' : incidenciaMesCorto(nT - 1));
    filas.push({ n: n, t: t });
  });
  filas.sort(function (a, b) { return a.n - b.n; });
  var txt = filas.map(function (x) { return x.t; }).join('\n');
  console.log(txt);
  try { copy(txt); console.log('(copiado al portapapeles)'); } catch (e) {}
})();
