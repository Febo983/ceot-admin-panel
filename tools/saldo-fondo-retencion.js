// Saldo esperado en el banco del fondo de Retención Ganancias.
// Pegar en la consola de Chrome (F12 → Console) con el panel admin abierto y
// la sesión iniciada. Imprime el detalle y lo deja copiado al portapapeles.
//   banco = retención ya acreditada − vencimientos tildados como pagados
//           − retiros − capital de plazos fijos sin vencer
//           + intereses de plazos fijos ya vencidos
(function () {
  var hoy = new Date().toISOString().slice(0, 10);
  var f = function (n) { return '$ ' + Math.round(n).toLocaleString('es-AR'); };
  var aps = incidenciaApellidos();
  var acr = getAporteCeotAcumuladoPorApellido(aps);
  var plan = incidenciaPlanCargar(), pagos = incidenciaPagosCargar();

  var devengado = 0;
  APORTE_CEOT_DESDE.forEach(function (p) {
    DOCTORES.forEach(function (d) { var c = calcularNetoLocal(p, d); if (c) devengado += c.aporteCeot || 0; });
  });

  var totAcr = 0, totPag = 0, porMes = {};
  aps.forEach(function (ap) {
    totAcr += acr[ap] || 0;
    var pct = INCIDENCIA_FONDO_PCT[ap] || 0, pctAnt = incidenciaAnticipoPct(ap);
    var cal = incidenciaCalendario(Math.round((plan.inm || 0) * pct), Math.round((plan.d30 || 0) * pct),
      Math.round((plan.cuota || 0) * pct), plan.nc || 0, Math.round((plan.ant || 0) * pctAnt), plan.na || 0);
    cal.forEach(function (v, i) {
      if (!pagos[i]) return;
      totPag += v;
      porMes[i] = (porMes[i] || 0) + v;
    });
  });

  var invs = invCargar(), capActivo = 0, intVencido = 0, intPendiente = 0, pfTxt = [];
  invs.forEach(function (r) {
    var activo = String(r.fechaVencimiento || '') > hoy;
    if (activo) { capActivo += r.montoTotal || 0; intPendiente += r.interesTotal || 0; }
    else intVencido += r.interesTotal || 0;
    pfTxt.push('  ' + (r.tipo || 'PF') + ' ' + r.fechaInicio + ' → ' + r.fechaVencimiento + ': capital ' + f(r.montoTotal) +
      ', interés ' + f(r.interesTotal) + (activo ? ' (SIN VENCER)' : ' (vencido)'));
  });

  var retiros = invRetirosCargar(), totRet = 0, retTxt = [];
  retiros.forEach(function (r) {
    var m = Object.keys(r.porProfesional || {}).reduce(function (s, k) { return s + (r.porProfesional[k] || 0); }, 0);
    totRet += m;
    retTxt.push('  ' + r.fecha + ' ' + f(m) + ' — ' + (r.motivo || ''));
  });

  var banco = totAcr - totPag - totRet - capActivo + intVencido;
  var out = [
    'FONDO RETENCIÓN GANANCIAS — ' + hoy,
    'Retención devengada (en papel, referencia):   ' + f(devengado),
    'Retención ya acreditada en el banco:        + ' + f(totAcr),
    'Vencimientos de Ganancias tildados pagados: − ' + f(totPag),
  ].concat(Object.keys(porMes).map(function (i) { return '  ' + incidenciaMesCorto(+i) + ' (' + pagos[i] + '): ' + f(porMes[i]); }))
   .concat(['Retiros registrados:                        − ' + f(totRet)]).concat(retTxt)
   .concat(['Capital en plazos fijos sin vencer:         − ' + f(capActivo),
            'Intereses de plazos fijos ya vencidos:      + ' + f(intVencido),
            '(intereses de plazos fijos sin vencer, todavía no cobrados: ' + f(intPendiente) + ')'])
   .concat(pfTxt)
   .concat(['', 'SALDO ESPERADO EN EL BANCO: ' + f(banco),
            'Plazos fijos registrados en esta PC: ' + invs.length + ' · Retiros: ' + retiros.length]).join('\n');
  console.log(out);
  try { copy(out); console.log('(copiado al portapapeles)'); } catch (e) {}
  return out;
})();
