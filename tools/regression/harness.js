// Harness de regresión de render. NO se carga en la app — es para verificar
// refactors sin backend.
//
// Uso (con `python3 -m http.server 8781` corriendo en la raíz del repo):
//   1. abrir http://localhost:8781 en un navegador
//   2. en la consola:
//        const c = await (await fetch('/tools/regression/harness.js')).text(); eval(c);
//        const g = await (await fetch('/tools/regression/golden.json')).text();
//        window.__check2(g)
//   3. esperar { diffCount: 0, errs: [], nofn: [] }
//
// Renderiza 147 pantallas (portal de los 13 profesionales x meses con datos
// locales, Historial, Mi Panel, builders de admin, y los render*() de admin
// que son deterministas) y compara el hash del HTML contra golden.json.
//
// EXCLUIDAS de golden (traen datos async de endpoints y el hash varía entre
// corridas — el harness igual avisa si TIRAN error via `errs`):
//   renderGastosPagos, renderPresentacion, renderLicencias
//
// Regenerar golden tras un cambio intencional de UI: ver README.md.
(function () {
  window.__hash = function (s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(16); };
  function snap() {
    const out = {};
    const meses = ['febrero', 'marzo', 'abril', 'junio', 'julio'];
    const rawMap = { febrero: FEBRERO_RAW, marzo: MARZO_RAW, abril: ABRIL_RAW, junio: JUNIO_RAW, julio: JULIO_RAW };
    const fecMap = { febrero: FEBRERO_FECHAS, marzo: MARZO_FECHAS, abril: ABRIL_FECHAS, junio: JUNIO_FECHAS, julio: JULIO_FECHAS };
    const host = document.createElement('div'); document.body.appendChild(host);
    for (const d of DOCTORES.slice()) {
      try { const e = document.createElement('div'); e.id = 'se_' + d.user; host.appendChild(e); renderEnero(e.id, d); out['enero|' + d.apellido] = e.innerHTML; } catch (err) { out['enero|' + d.apellido] = 'ERR ' + err; }
      try { const e = document.createElement('div'); e.id = 'sm_' + d.user; host.appendChild(e); renderMayo(e.id, d); out['mayo|' + d.apellido] = e.innerHTML; } catch (err) { out['mayo|' + d.apellido] = 'ERR ' + err; }
      for (const m of meses) { try { const e = document.createElement('div'); e.id = 'si_' + d.user + '_' + m; host.appendChild(e); renderIndividual(rawMap[m], fecMap[m], m, e.id, d); out['ind|' + d.apellido + '|' + m] = e.innerHTML; } catch (err) { out['ind|' + d.apellido + '|' + m] = 'ERR ' + err; } }
      try { renderHistorial(d); out['hist|' + d.apellido] = document.getElementById('pane-historial').innerHTML; } catch (err) { out['hist|' + d.apellido] = 'ERR ' + err; }
      try { renderMiPanel(d); out['mipanel|' + d.apellido] = document.getElementById('pane-mipanel').innerHTML; } catch (err) { out['mipanel|' + d.apellido] = 'ERR ' + err; }
    }
    host.remove();
    for (const p of ['junio', 'julio', 'agosto', 'septiembre']) {
      for (const fn of ['sueldoDirectorTabHtml', 'restoProfesionalesTabHtml', 'sueldoDirectorResumenHtml', 'gastosASectionHtml', 'inversionesSectionHtml']) {
        try { out['adm|' + fn + '|' + p] = (typeof window[fn] === 'function') ? String(window[fn](p)) : 'NOFN'; } catch (err) { out['adm|' + fn + '|' + p] = 'ERR ' + err; }
      }
    }
    const ac = document.getElementById('adm-content');
    const admFns = [['renderAdmHome'], ['renderChecklist'], ['renderChecklistBody'], ['renderPendientes'], ['renderPresentacion', 'julio'], ['renderSueldoB'], ['renderLicencias'], ['renderGastosPagos'], ['renderFacturas'], ['renderTotalCeot'], ['renderAdminPanel', 'julio'], ['renderSueldoDirector']];
    for (const [fn, arg] of admFns) {
      try { if (typeof window[fn] !== 'function') { out['admR|' + fn] = 'NOFN'; continue; } if (ac) ac.innerHTML = ''; window[fn](arg); out['admR|' + fn] = ac ? ac.innerHTML : '(no #adm-content)'; }
      catch (err) { out['admR|' + fn] = 'ERR ' + err; }
    }
    return out;
  }
  window.__check2 = function (goldenJSON) {
    const golden = JSON.parse(goldenJSON);
    snap(); snap(); snap(); // warm
    const s = snap();
    // golden es la lista blanca: solo se comparan las claves que están en golden.
    // Las 4 pantallas async excluidas no están y se ignoran acá (pero sí cuentan
    // para errs/nofn más abajo).
    const diffs = [];
    for (const k of Object.keys(golden)) {
      const h = s[k] === undefined ? 'MISSING' : window.__hash(s[k]);
      if (h !== golden[k]) diffs.push({ k, golden: golden[k], now: h, sample: String(s[k]).slice(0, 160) });
    }
    return {
      total: Object.keys(s).length,
      diffCount: diffs.length,
      diffs,
      errs: Object.entries(s).filter(([k, v]) => String(v).startsWith('ERR')).map(([k, v]) => k + ': ' + String(v).slice(0, 100)),
      nofn: Object.entries(s).filter(([k, v]) => v === 'NOFN').map(([k]) => k),
    };
  };
  return 'check2 ready';
})();
