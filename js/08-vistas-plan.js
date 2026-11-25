'use strict';
function vPresupuesto() {
  const ym = S.ym, s = st(ym), c = cfg();
  const cats = catsOf('gasto');
  const pres = presTotal();
  const ingRef = Math.max(Number(c.ingresoMensual) || 0, s.ing);
  const grupos = {necesidad:0, deseo:0, ahorro:0};
  for (const k of Object.keys(s.byCat)) { const g = (catObj(k) || {}).g || 'deseo'; grupos[g] = (grupos[g] || 0) + s.byCat[k]; }
  const tot = Math.max(1, ingRef || (grupos.necesidad + grupos.deseo + grupos.ahorro));
  const g5 = (k, ideal, label) => { const v = grupos[k] || 0, p = Math.round(v / tot * 100); return `<div class="cbar"><div class="cbar-h"><span>${label}</span><span class="num">${fmt(v)} <small>${p}% · ideal ${ideal}%</small></span></div><div class="track"><div class="fill acc" style="width:${Math.min(100, p)}%"></div><div class="mark" style="left:calc(${ideal}% - 1px)"></div></div></div>`; };
  return `<div class="grid">
  <section class="card"><div class="card-h"><h2>Base del mes</h2></div>
    <div class="fgrid">
      <label class="field"><span>Ingreso mensual del hogar</span><input id="p-ing" type="text" inputmode="numeric" value="${c.ingresoMensual ? fmtN(c.ingresoMensual) : ''}" placeholder="$0"></label>
      <label class="field"><span>Meta de ahorro mensual</span><input id="p-aho" type="text" inputmode="numeric" value="${c.ahorroMensual ? fmtN(c.ahorroMensual) : ''}" placeholder="$0"></label>
    </div>
    <div class="stat3"><div class="stat"><span class="lbl">Presupuestado</span><b class="num">${fmt(pres)}</b></div><div class="stat"><span class="lbl">Gastado</span><b class="num">${fmt(s.gas)}</b></div><div class="stat"><span class="lbl">Sin asignar</span><b class="num">${fmt((Number(c.ingresoMensual) || 0) - pres - (Number(c.ahorroMensual) || 0))}</b></div></div>
    <p class="hint">Sin asignar = ingreso − presupuesto − ahorro. Si es negativo, el presupuesto no alcanza.</p>
    <div class="row">${S.sample ? `<button class="btn" type="button" data-act="pres-ia"${S.presBusy ? ' disabled' : ''}>${S.presBusy ? 'Claude está calculando…' : 'Proponer presupuesto con Claude'}</button>` : ''}<button class="btn" type="button" data-act="pres-prom">Usar promedio de 3 meses</button></div>
  </section>
  <section class="card"><div class="card-h"><h2>Regla 50/30/20</h2><span class="sub">${esc(ymLabel(ym))}</span></div>
    <p class="small muted">Una guía simple: 50% a lo necesario, 30% a gustos y 20% a ahorro o pagar deudas antes.</p>
    ${g5('necesidad', 50, 'Necesidades')}${g5('deseo', 30, 'Gustos')}${g5('ahorro', 20, 'Ahorro')}
  </section>
  ${S.presSug ? `<section class="card span2"><div class="card-h"><h2>Propuesta de Claude</h2><div class="row"><button class="btn sm" type="button" data-act="pres-desc">Descartar</button><button class="btn sm pri" type="button" data-act="pres-apl">Aplicar propuesta</button></div></div>
    ${S.presSug.nota ? `<div class="ai-out">${md(S.presSug.nota)}</div>` : ''}
    <div class="tblwrap"><table class="tbl"><thead><tr><th>Categoría</th><th class="r">Actual</th><th class="r">Propuesto</th></tr></thead><tbody>${cats.filter(x => S.presSug.m[x.id] != null).map(x => `<tr><td>${esc(x.n)}</td><td class="r">${fmt(x.p)}</td><td class="r"><b>${fmt(S.presSug.m[x.id])}</b></td></tr>`).join('')}</tbody></table></div></section>` : ''}
  <section class="card span2"><div class="card-h"><h2>Presupuesto por categoría</h2><span class="sub">Escribe el monto y sale del campo para guardar</span></div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>Categoría</th><th class="r">Presupuesto</th><th class="r">Gastado</th><th class="r">Queda</th><th style="min-width:120px">Avance</th><th class="r">Prom. 3 meses</th></tr></thead><tbody>
    ${cats.map(x => { const g = s.byCat[x.id] || 0, p = Number(x.p) || 0, av = avgCat(x.id); const pc = p ? g / p : 0; return `<tr><td>${esc(x.n)}</td><td class="r"><input type="text" inputmode="numeric" data-pres="${esc(x.id)}" value="${p ? fmtN(p) : ''}" placeholder="$0" style="width:110px;text-align:right" aria-label="Presupuesto ${esc(x.n)}"></td><td class="r">${fmt(g)}</td><td class="r"${p && g > p ? ' style="color:var(--crit-ink);font-weight:600"' : ''}>${p ? fmt(p - g) : '—'}</td><td>${p ? `<div class="track"><div class="fill${pc > 1 ? ' over' : ''}" style="width:${Math.min(100, pc * 100)}%"></div></div>` : ''}</td><td class="r muted">${av ? fmt(av) : '—'}</td></tr>`; }).join('')}
    </tbody></table></div></section></div>`;
}
function vFijos() {
  const gastos = S.recs.filter(r => r.tipo === 'gasto'), ings = S.recs.filter(r => r.tipo === 'ingreso');
  const mensual = r => r.frec === 'anual' ? r.monto / 12 : r.monto;
  const sus = gastos.filter(r => r.sus && r.activo !== false);
  const sug = detectSus();
  const row = r => `<div class="li clickable" data-act="rec-edit" data-v="${esc(r.id)}" role="button" tabindex="0"><div class="main"><div class="t">${esc(r.nombre)}${r.activo === false ? ' <span class="chip">pausado</span>' : ''}${r.ej ? ' <span class="chip ej">ejemplo</span>' : ''}</div><div class="m"><span>${r.frec === 'anual' ? `cada ${esc(MESES[(Number(r.mesAnual) || 1) - 1])}` : `día ${Number(r.dia) || 1}`}</span><span>· ${esc(catName(r.cat))}</span>${r.auto ? '<span class="chip acc">se anota solo</span>' : ''}${r.sus ? '<span class="chip">suscripción</span>' : ''}</div></div><span class="amt${r.tipo === 'ingreso' ? ' in' : ''}">${fmt(r.monto)}</span></div>`;
  return `<div class="grid">
    <section class="card"><div class="card-h"><h2>Gastos fijos</h2><button class="btn sm pri" type="button" data-act="rec-new" data-v="gasto">Agregar</button></div>
      <div class="stat3"><div class="stat"><span class="lbl">Al mes</span><b class="num">${fmt(sum(gastos.filter(r => r.activo !== false).map(mensual)))}</b></div><div class="stat"><span class="lbl">Suscripciones</span><b class="num">${fmt(sum(sus.map(mensual)))}</b></div><div class="stat"><span class="lbl">Suscripciones al año</span><b class="num">${fmt(sum(sus.map(mensual)) * 12)}</b></div></div>
      <div class="list">${gastos.length ? gastos.map(row).join('') : '<p class="muted small">Arriendo, dividendo, luz, internet, colegio, seguros, streaming…</p>'}</div></section>
    <section class="card"><div class="card-h"><h2>Ingresos fijos</h2><button class="btn sm pri" type="button" data-act="rec-new" data-v="ingreso">Agregar</button></div>
      <div class="list">${ings.length ? ings.map(row).join('') : '<p class="muted small">Sueldos, pensión de alimentos, arriendo que recibes…</p>'}</div>
      <p class="hint">Si marcas "se anota solo", el movimiento aparece el día que corresponde, sin que lo escribas.</p></section>
    ${sug.length ? `<section class="card span2"><div class="card-h"><h2>Encontramos cobros que se repiten</h2><span class="sub">Según tus movimientos de los últimos meses</span></div>
      <div class="list">${sug.map(x => `<div class="li"><div class="main"><div class="t">${esc(x.nombre)}</div><div class="m">${x.meses} meses seguidos · ${esc(catName(x.cat))}</div></div><span class="amt">${fmt(x.monto)}</span><button class="btn sm" type="button" data-act="sus-add" data-v="${esc(x.k)}">Agregar</button></div>`).join('')}</div></section>` : ''}
  </div>`;
}
function recForm(r, tipo) {
  const nuevo = !r;
  r = r || {tipo, nombre:'', monto:0, dia:Number(todayISO().slice(8)), frec:'mensual', mesAnual:Number(todayISO().slice(5, 7)), cat: tipo === 'ingreso' ? 'sueldo' : 'vivienda', auto: true, sus:false, cuenta:'', quien:yo(), comp:cfg().compDefault, activo:true};
  openModal(nuevo ? (r.tipo === 'ingreso' ? 'Nuevo ingreso fijo' : 'Nuevo gasto fijo') : 'Editar pago fijo', `
    <form id="rf" class="fgrid" autocomplete="off">
      <label class="field full"><span>Nombre</span><input id="rf-n" type="text" value="${esc(r.nombre)}" placeholder="${r.tipo === 'ingreso' ? 'Ej: Sueldo' : 'Ej: Arriendo, Netflix, Enel'}" required></label>
      <label class="field"><span>Monto</span><input id="rf-m" type="text" inputmode="numeric" value="${r.monto ? fmtN(r.monto) : ''}" required></label>
      <label class="field"><span>Frecuencia</span><select id="rf-f"><option value="mensual"${r.frec !== 'anual' ? ' selected' : ''}>Mensual</option><option value="anual"${r.frec === 'anual' ? ' selected' : ''}>Una vez al año</option></select></label>
      <label class="field"><span>Día del mes</span><input id="rf-d" type="number" min="1" max="31" value="${Number(r.dia) || 1}"></label>
      <label class="field" id="rf-ma-w"${r.frec === 'anual' ? '' : ' hidden'}><span>Mes</span><select id="rf-ma">${MESES.map((m, i) => `<option value="${i + 1}"${Number(r.mesAnual) === i + 1 ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="field"><span>Categoría</span><select id="rf-c">${catOptions(r.tipo, r.cat)}</select></label>
      <label class="field"><span>Cuenta o tarjeta</span><select id="rf-cu">${cuentaOptions(r.cuenta || '')}</select></label>
      <label class="field"><span>${r.tipo === 'ingreso' ? 'Lo recibe' : 'Lo paga'}</span><select id="rf-q">${memberOptions(r.quien)}</select></label>
      <div class="full" style="display:grid;gap:8px">
        <label class="check"><input id="rf-a" type="checkbox"${r.auto ? ' checked' : ''}> Se anota solo cada ${r.frec === 'anual' ? 'año' : 'mes'} el día indicado</label>
        ${r.tipo === 'gasto' ? `<label class="check"><input id="rf-s" type="checkbox"${r.sus ? ' checked' : ''}> Es una suscripción (avisa si sube de precio)</label><label class="check"><input id="rf-co" type="checkbox"${r.comp ? ' checked' : ''}> Gasto compartido</label>` : ''}
        <label class="check"><input id="rf-act" type="checkbox"${r.activo !== false ? ' checked' : ''}> Activo</label>
      </div>
      <div class="full row">${nuevo ? '' : '<button type="button" class="btn danger" id="rf-del">Borrar</button>'}<span class="sp"></span><button type="button" class="btn" data-act="cerrar">Cancelar</button><button class="btn pri" type="submit">Guardar</button></div>
    </form>`, sh => {
    bindMonto($('#rf-m', sh));
    $('#rf-f', sh).onchange = e => { $('#rf-ma-w', sh).hidden = e.target.value !== 'anual'; };
    const del = $('#rf-del', sh);
    if (del) del.onclick = async () => { if (del.dataset.c !== '1') { del.dataset.c = '1'; del.textContent = 'Toca otra vez para borrar'; return; } if (await w(() => S.db.doc('recs/' + r.id).delete(), 'Pago fijo borrado')) closeModal(); };
    $('#rf', sh).onsubmit = async e => {
      e.preventDefault();
      const monto = parseMonto($('#rf-m', sh).value); if (!monto) { toast('Escribe un monto.'); return; }
      const d = {tipo: r.tipo, nombre: $('#rf-n', sh).value.trim(), monto, frec: $('#rf-f', sh).value, dia: Math.min(31, Math.max(1, Number($('#rf-d', sh).value) || 1)), mesAnual: Number($('#rf-ma', sh).value), cat: $('#rf-c', sh).value, cuenta: $('#rf-cu', sh).value, quien: $('#rf-q', sh).value, auto: $('#rf-a', sh).checked, sus: !!($('#rf-s', sh) && $('#rf-s', sh).checked), comp: !!($('#rf-co', sh) && $('#rf-co', sh).checked), activo: $('#rf-act', sh).checked, desde: r.desde || curYM()};
      if (r.ej) d.ej = true;
      const id = r.id || uid();
      if (await w(() => S.db.doc('recs/' + id).set(d), 'Pago fijo guardado')) { S.autoDone = false; closeModal(); setTimeout(autoRecs, 300); }
    };
  });
}
function vDeudas() {
  const cur = curYM();
  const infos = S.deudas.map(d => ({d, i: deudaInfo(d)})).filter(x => x.i.rest > 0 || x.i.fin >= addMonths(cur, -1));
  const carga = []; for (let k = 0; k < 12; k++) { const ym = addMonths(cur, k); carga.push({ym, v: sum(S.deudas.filter(d => { const n = cuotaNum(d, ym); return n >= 1 && n <= d.total; }).map(d => d.cuota))}); }
  const totalRest = sum(infos.map(x => x.i.saldo));
  const lastYM = infos.length ? infos.map(x => x.i.fin).sort().pop() : null;
  const conTasa = infos.filter(x => x.d.tipo === 'credito' && x.i.r > 0 && x.i.rest > 0).sort((a, b) => b.i.r - a.i.r);
  const cuotasDet = detectCuotas();
  return `<div class="grid">
    <section class="card span2"><div class="card-h"><h2>Resumen de deudas</h2><button class="btn sm pri" type="button" data-act="deuda-new">Agregar deuda o compra en cuotas</button></div>
      <div class="stat3"><div class="stat"><span class="lbl">Deuda pendiente</span><b class="num">${fmt(totalRest)}</b></div><div class="stat"><span class="lbl">Cuotas este mes</span><b class="num">${fmt(carga[0].v)}</b></div><div class="stat"><span class="lbl">Libres de cuotas</span><b>${lastYM ? esc(ymLabel(addMonths(lastYM, 1))) : '—'}</b></div></div>
      ${S.deudas.length ? `<div class="card-h"><h3>Cuotas de los próximos 12 meses</h3><span class="sub">Así se va liberando tu sueldo</span></div>${loadSVG(carga)}` : ''}
    </section>
    ${infos.length ? infos.map(({d, i}) => `<section class="card"><div class="card-h"><h3>${esc(d.nombre)}${d.ej ? ' <span class="chip ej">ejemplo</span>' : ''}</h3><button class="btn sm ghost" type="button" data-act="deuda-edit" data-v="${esc(d.id)}">Editar</button></div>
      <div class="row small"><span class="chip">${d.tipo === 'credito' ? 'Crédito' : 'Compra en cuotas'}</span>${d.cuenta ? `<span class="chip">${esc(d.cuenta)}</span>` : ''}${d.tasa ? `<span class="chip">tasa ${esc(String(d.tasa).replace('.', ','))}% mensual</span>` : ''}</div>
      <div class="prog" role="img" aria-label="${i.pagadas} de ${d.total} cuotas pagadas"><div style="width:${i.pagadas / d.total * 100}%"></div></div>
      <div class="stat3"><div class="stat"><span class="lbl">Cuota</span><b class="num">${fmt(d.cuota)}</b></div><div class="stat"><span class="lbl">Pagadas</span><b class="num">${i.pagadas} de ${d.total}</b></div><div class="stat"><span class="lbl">Termina</span><b>${esc(ymLabel(i.fin))}</b></div></div>
      <p class="small muted">${i.rest ? `Te quedan ${i.rest} cuotas: ${fmt(i.totalRest)} por pagar${d.tipo === 'credito' && i.r ? `, de los cuales unos ${fmt(i.totalRest - i.saldo)} son intereses` : ''}.` : 'Pagada por completo.'}</p>
      ${d.tipo === 'credito' && i.r > 0 && i.rest > 0 ? `<button class="btn sm" type="button" data-act="simular" data-v="${esc(d.id)}">Simular prepago</button>` : ''}
    </section>`).join('') : `<section class="card span2"><div class="empty"><b>No tienes deudas registradas</b><span class="small">Agrega créditos y compras en cuotas para saber cuándo terminas de pagarlas y cuánto pagas en intereses.</span></div></section>`}
    ${conTasa.length > 1 ? `<section class="card span2"><h2>¿Cuál pagar primero?</h2><p class="small muted">Si te sobra plata, abonarla al crédito con la tasa más alta es lo que más intereses te ahorra (método avalancha). Este es el orden:</p>
      <div class="list">${conTasa.map((x, n) => `<div class="li"><span class="chip acc">${n + 1}</span><div class="main"><div class="t">${esc(x.d.nombre)}</div><div class="m">${esc(String(x.d.tasa).replace('.', ','))}% mensual · saldo aprox. ${fmt(x.i.saldo)}</div></div></div>`).join('')}</div>
      <p class="hint">Antes de prepagar, pregunta a tu banco si cobra comisión de prepago.</p></section>` : ''}
    ${cuotasDet.length ? `<section class="card span2"><h2>Compras en cuotas en tus movimientos</h2><div class="list">${cuotasDet.map(x => `<div class="li"><div class="main"><div class="t">${esc(x.nombre)}</div><div class="m">cuota ${x.n} de ${x.total}</div></div><span class="amt">${fmt(x.cuota)}</span><button class="btn sm" type="button" data-act="cuota-add" data-v="${esc(x.mov.id)}">Agregar</button></div>`).join('')}</div></section>` : ''}
  </div>`;
}
function deudaForm(d) {
  const nuevo = !d || !d.id;
  d = {tipo:'cuotas', nombre:'', cuota:0, total:12, primera:curYM(), tasa:'', dia:5, cuenta:'', quien:yo(), comp:false, ...(d || {})};
  openModal(nuevo ? 'Nueva deuda' : 'Editar deuda', `
    <form id="df" class="fgrid" autocomplete="off">
      <div class="full"><div class="seg" role="group" aria-label="Tipo"><button type="button" data-t="cuotas" aria-pressed="${d.tipo !== 'credito'}">Compra en cuotas</button><button type="button" data-t="credito" aria-pressed="${d.tipo === 'credito'}">Crédito</button></div></div>
      <label class="field full"><span>Nombre</span><input id="df-n" type="text" value="${esc(d.nombre)}" placeholder="Ej: Notebook, crédito de consumo, auto" required></label>
      <label class="field"><span>Valor de la cuota</span><input id="df-c" type="text" inputmode="numeric" value="${d.cuota ? fmtN(d.cuota) : ''}" required></label>
      <label class="field"><span>Número de cuotas</span><input id="df-t" type="number" min="1" max="480" value="${Number(d.total) || 12}"></label>
      <label class="field"><span>Mes de la primera cuota</span><input id="df-p" type="month" value="${esc(d.primera)}"></label>
      <label class="field"><span>Día de pago</span><input id="df-d" type="number" min="1" max="31" value="${Number(d.dia) || 5}"></label>
      <label class="field" id="df-tasa-w"${d.tipo === 'credito' ? '' : ' hidden'}><span>Tasa de interés mensual (%)</span><input id="df-r" type="text" inputmode="decimal" value="${esc(String(d.tasa || '').replace('.', ','))}" placeholder="Ej: 1,5"></label>
      <label class="field"><span>Cuenta o tarjeta</span><select id="df-cu">${cuentaOptions(d.cuenta || '')}</select></label>
      <label class="field"><span>Lo paga</span><select id="df-q">${memberOptions(d.quien)}</select></label>
      <label class="check" style="align-self:end;padding-bottom:8px"><input id="df-co" type="checkbox"${d.comp ? ' checked' : ''}> Deuda compartida</label>
      <p class="hint full">La tasa mensual sale en tu contrato o en el estado de cuenta (también como CAE, que es anual). Sirve para calcular intereses y simular prepagos.</p>
      <div class="full row">${nuevo ? '' : '<button type="button" class="btn danger" id="df-del">Borrar</button>'}<span class="sp"></span><button type="button" class="btn" data-act="cerrar">Cancelar</button><button class="btn pri" type="submit">Guardar</button></div>
    </form>`, sh => {
    let t = d.tipo === 'credito' ? 'credito' : 'cuotas';
    bindMonto($('#df-c', sh));
    $$('.seg button', sh).forEach(b => b.onclick = () => { t = b.dataset.t; $$('.seg button', sh).forEach(x => x.setAttribute('aria-pressed', x === b)); $('#df-tasa-w', sh).hidden = t !== 'credito'; });
    const del = $('#df-del', sh);
    if (del) del.onclick = async () => { if (del.dataset.c !== '1') { del.dataset.c = '1'; del.textContent = 'Toca otra vez para borrar'; return; } if (await w(() => S.db.doc('deudas/' + d.id).delete(), 'Deuda borrada')) closeModal(); };
    $('#df', sh).onsubmit = async e => {
      e.preventDefault();
      const cuota = parseMonto($('#df-c', sh).value); if (!cuota) { toast('Escribe el valor de la cuota.'); return; }
      const o = {tipo: t, nombre: $('#df-n', sh).value.trim(), cuota, total: Math.max(1, Number($('#df-t', sh).value) || 1), primera: $('#df-p', sh).value || curYM(), dia: Math.min(31, Math.max(1, Number($('#df-d', sh).value) || 1)), tasa: t === 'credito' ? (parseFloat(String($('#df-r', sh).value).replace(',', '.')) || 0) : 0, cuenta: $('#df-cu', sh).value, quien: $('#df-q', sh).value, comp: $('#df-co', sh).checked};
      if (d.ej) o.ej = true;
      if (await w(() => S.db.doc('deudas/' + (d.id || uid())).set(o), 'Deuda guardada')) closeModal();
    };
  });
}
function simular(d) {
  const i = deudaInfo(d);
  openModal(`Simular prepago · ${d.nombre}`, `
    <p class="small muted">Saldo aproximado hoy: <b>${fmt(i.saldo)}</b> · ${i.rest} cuotas de ${fmt(d.cuota)} · tasa ${esc(String(d.tasa).replace('.', ','))}% mensual.</p>
    <label class="field"><span>¿Cuánto podrías abonar hoy?</span><input id="sm-e" type="text" inputmode="numeric" placeholder="$0" data-live="1"></label>
    <div id="sm-out" class="grid" style="grid-template-columns:1fr 1fr"></div>
    <p class="hint">Cálculo aproximado con cuota fija. El banco puede cobrar comisión de prepago: pregúntala antes.</p>`, sh => {
    const inp = $('#sm-e', sh), out = $('#sm-out', sh);
    const calc = () => {
      const E = Math.min(parseMonto(inp.value), i.saldo), r = i.r, C = d.cuota, S2 = i.saldo - E;
      if (!E) { out.innerHTML = '<p class="small muted" style="grid-column:1/-1">Escribe un monto para ver cuánto ahorras.</p>'; return; }
      const n2 = S2 <= 0 ? 0 : Math.ceil(-Math.log(1 - r * S2 / C) / Math.log(1 + r));
      const ahorroPlazo = C * i.rest - (E + C * n2);
      const C2 = S2 <= 0 ? 0 : S2 * r / (1 - Math.pow(1 + r, -i.rest));
      const ahorroCuota = C * i.rest - (E + C2 * i.rest);
      out.innerHTML = `<div class="step"><span class="lbl">Mantener la cuota</span><b class="num">${n2} cuotas</b><span class="small">Terminas ${i.rest - n2} meses antes y ahorras unos ${fmt(ahorroPlazo)} en intereses.</span></div>
        <div class="step"><span class="lbl">Mantener el plazo</span><b class="num">${fmt(C2)} al mes</b><span class="small">Tu cuota baja ${fmt(C - C2)} y ahorras unos ${fmt(ahorroCuota)} en intereses.</span></div>`;
    };
    bindMonto(inp); inp.addEventListener('input', calc); calc();
  });
}
function vMetas() {
  const cur = curYM();
  const nec = [1, 2, 3].map(k => { const s = st(addMonths(cur, -k)); return s.gas; }).filter(v => v > 0);
  const gastoMes = nec.length ? sum(nec) / nec.length : 0;
  const hayEmerg = S.metas.some(m => /emergencia/i.test(m.nombre));
  return `<div class="grid">
    <section class="card span2"><div class="card-h"><h2>Metas de ahorro</h2><button class="btn sm pri" type="button" data-act="meta-new">Nueva meta</button></div>
      ${!hayEmerg && gastoMes ? `<div class="banner"><span class="sp">Un fondo de emergencia de 3 a 6 meses de gastos los protege ante una cesantía o un imprevisto. Para ustedes serían <b>${fmt(gastoMes * 3)}</b> a <b>${fmt(gastoMes * 6)}</b>.</span><button class="btn sm" type="button" data-act="meta-emerg" data-v="${Math.round(gastoMes * 3)}">Crear fondo de emergencia</button></div>` : ''}
    </section>
    ${S.metas.length ? S.metas.map(m => {
      const rest = Math.max(0, m.objetivo - (m.ahorrado || 0)), pc = m.objetivo ? Math.min(1, (m.ahorrado || 0) / m.objetivo) : 0;
      const meses = m.limite ? Math.max(1, monthsDiff(cur, m.limite)) : 0;
      const ap = (m.aportes || []).filter(a => a.f >= addDays(todayISO(), -90));
      const ritmo = ap.length ? sum(ap.map(a => a.m)) / 3 : 0;
      const eta = ritmo > 0 ? addMonths(cur, Math.ceil(rest / ritmo)) : null;
      return `<section class="card"><div class="card-h"><h3>${esc(m.nombre)}${m.ej ? ' <span class="chip ej">ejemplo</span>' : ''}</h3><button class="btn sm ghost" type="button" data-act="meta-edit" data-v="${esc(m.id)}">Editar</button></div>
        <div class="row" style="align-items:baseline"><span class="big num" style="font-size:1.8rem">${fmt(m.ahorrado || 0)}</span><span class="muted">de ${fmt(m.objetivo)}</span></div>
        <div class="prog" role="img" aria-label="${Math.round(pc * 100)}% de la meta"><div style="width:${pc * 100}%"></div></div>
        <p class="small">${rest <= 0 ? '¡Meta cumplida!' : m.limite ? `Para llegar en ${esc(ymLabel(m.limite))} necesitan apartar <b>${fmt(rest / meses)}</b> al mes.` : `Les faltan ${fmt(rest)}.`}</p>
        ${rest > 0 ? `<p class="small muted">${eta ? `A su ritmo de los últimos 3 meses (${fmt(ritmo)} al mes) llegan en ${esc(ymLabel(eta))}${m.limite && eta > m.limite ? ', después de la fecha que se pusieron' : ''}.` : 'Todavía no hay aportes recientes para estimar cuándo llegan.'}</p>` : ''}
        <div class="row"><button class="btn sm pri" type="button" data-act="aporte" data-v="${esc(m.id)}">Agregar aporte</button></div></section>`;
    }).join('') : `<section class="card span2"><div class="empty"><b>Aún no tienen metas</b><span class="small">Vacaciones, el pie de una casa, un auto o el fondo de emergencia. La app calcula cuánto apartar cada mes.</span></div></section>`}
  </div>`;
}
function metaForm(m) {
  const nuevo = !m || !m.id;
  m = {nombre:'', objetivo:0, ahorrado:0, limite:'', aportes:[], ...(m || {})};
  openModal(nuevo ? 'Nueva meta' : 'Editar meta', `
    <form id="gf" class="fgrid" autocomplete="off">
      <label class="field full"><span>Nombre</span><input id="gf-n" type="text" value="${esc(m.nombre)}" placeholder="Ej: Vacaciones, pie depto" required></label>
      <label class="field"><span>Monto objetivo</span><input id="gf-o" type="text" inputmode="numeric" value="${m.objetivo ? fmtN(m.objetivo) : ''}" required></label>
      <label class="field"><span>Ya ahorrado</span><input id="gf-a" type="text" inputmode="numeric" value="${m.ahorrado ? fmtN(m.ahorrado) : ''}" placeholder="$0"></label>
      <label class="field full"><span>¿Para cuándo? (opcional)</span><input id="gf-l" type="month" value="${esc(m.limite || '')}"></label>
      <div class="full row">${nuevo ? '' : '<button type="button" class="btn danger" id="gf-del">Borrar</button>'}<span class="sp"></span><button type="button" class="btn" data-act="cerrar">Cancelar</button><button class="btn pri" type="submit">Guardar</button></div>
    </form>`, sh => {
    bindMonto($('#gf-o', sh)); bindMonto($('#gf-a', sh));
    const del = $('#gf-del', sh);
    if (del) del.onclick = async () => { if (del.dataset.c !== '1') { del.dataset.c = '1'; del.textContent = 'Toca otra vez para borrar'; return; } if (await w(() => S.db.doc('metas/' + m.id).delete(), 'Meta borrada')) closeModal(); };
    $('#gf', sh).onsubmit = async e => {
      e.preventDefault();
      const objetivo = parseMonto($('#gf-o', sh).value); if (!objetivo) { toast('Escribe el monto objetivo.'); return; }
      const o = {nombre: $('#gf-n', sh).value.trim(), objetivo, ahorrado: parseMonto($('#gf-a', sh).value), limite: $('#gf-l', sh).value || '', aportes: m.aportes || []};
      if (m.ej) o.ej = true;
      if (await w(() => S.db.doc('metas/' + (m.id || uid())).set(o), 'Meta guardada')) closeModal();
    };
  });
}
function aporteForm(m) {
  openModal(`Aporte a ${m.nombre}`, `
    <form id="af" class="fgrid" autocomplete="off">
      <label class="field"><span>Monto</span><input id="af-m" type="text" inputmode="numeric" required></label>
      <label class="field"><span>Aporta</span><select id="af-q">${memberOptions(yo())}</select></label>
      <label class="check full"><input id="af-mov" type="checkbox" checked> Anotarlo también como movimiento de ahorro del mes</label>
      <div class="full row"><span class="sp"></span><button type="button" class="btn" data-act="cerrar">Cancelar</button><button class="btn pri" type="submit">Guardar aporte</button></div>
    </form>`, sh => {
    bindMonto($('#af-m', sh));
    $('#af', sh).onsubmit = async e => {
      e.preventDefault();
      const monto = parseMonto($('#af-m', sh).value); if (!monto) { toast('Escribe un monto.'); return; }
      const q = $('#af-q', sh).value, f = todayISO();
      const ok = await w(async () => {
        await S.db.doc('metas/' + m.id).update({ahorrado: (m.ahorrado || 0) + monto, aportes: [...(m.aportes || []), {f, m: monto, q}].slice(-120)});
        if ($('#af-mov', sh).checked) await S.db.collection('movs').doc(uid()).set(movDoc({fecha: f, monto, tipo:'gasto', cat:'ahorro', desc:`Ahorro: ${m.nombre}`, cuenta:'', quien:q, comp:false, origen:'meta', ...(m.ej ? {ej:true} : {})}));
      }, 'Aporte guardado');
      if (ok) closeModal();
    };
  });
}
function balances() {
  const ids = members(); const rep = cfg().reparto;
  const share = id => { const tot = sum(ids.map(x => Number(rep[x]) || 0)); return tot > 0 ? (Number(rep[id]) || 0) / tot : 1 / Math.max(1, ids.length); };
  const comp = S.movs.filter(m => m.tipo === 'gasto' && m.comp && m.cat !== 'ahorro');
  const total = sum(comp.map(m => m.monto));
  const net = {}; ids.forEach(id => net[id] = 0);
  for (const m of comp) net[m.quien] = (net[m.quien] || 0) + m.monto;
  ids.forEach(id => net[id] -= total * share(id));
  for (const m of S.movs.filter(m => m.tipo === 'liq')) { net[m.de] = (net[m.de] || 0) + m.monto; net[m.a] = (net[m.a] || 0) - m.monto; }
  return {ids, net, share, total, comp};
}
function vEntre() {
  const ym = S.ym; const b = balances();
  const mes = b.comp.filter(m => m.fecha.startsWith(ym));
  const pagado = {}; b.ids.forEach(id => pagado[id] = 0); mes.forEach(m => pagado[m.quien] = (pagado[m.quien] || 0) + m.monto);
  const pos = b.ids.filter(id => b.net[id] > 1).sort((x, y) => b.net[y] - b.net[x]);
  const neg = b.ids.filter(id => b.net[id] < -1).sort((x, y) => b.net[x] - b.net[y]);
  let resumen;
  if (b.ids.length < 2) resumen = `<p class="small muted">Cuando la otra persona abra esta página con su cuenta, aparecerá aquí. Compártela desde el menú Compartir de claude.ai con acceso de colaborador.</p>`;
  else if (!pos.length || !neg.length) resumen = `<div class="big" style="font-size:1.6rem">Están a mano</div><p class="small muted">Nadie le debe a nadie por los gastos compartidos.</p>`;
  else resumen = neg.map(n => `<div class="row" style="gap:8px">${avatar(n)}<span><b>${esc(nameOf(n))}</b> le debe <b class="num">${fmt(Math.min(-b.net[n], b.net[pos[0]]))}</b> a <b>${esc(nameOf(pos[0]))}</b></span></div>`).join('') + `<div class="row"><button class="btn pri" type="button" data-act="liq" data-v="${esc(neg[0] + '|' + pos[0])}">Registrar pago entre ustedes</button></div>`;
  return `<div class="grid">
    <section class="card"><div class="card-h"><h2>Cuentas claras</h2><span class="sub">Gastos compartidos de los últimos 12 meses</span></div>${resumen}</section>
    <section class="card"><div class="card-h"><h2>Cómo se reparten</h2></div>
      ${b.ids.map(id => `<div class="li">${avatar(id)}<div class="main"><div class="t">${esc(nameOf(id))}</div><div class="m">pagó ${fmt(pagado[id] || 0)} en ${esc(ymLabel(ym))}</div></div><label class="row small" style="gap:6px"><input type="number" min="0" max="100" data-rep="${esc(id)}" value="${Math.round(b.share(id) * 100)}" style="width:72px;text-align:right" aria-label="Porcentaje de ${esc(nameOf(id))}">%</label></div>`).join('') || '<p class="muted small">Sin personas aún.</p>'}
      <p class="hint">Si uno gana más, pueden repartir en proporción a los sueldos (ej. 60/40). El cambio se guarda al salir del campo.</p></section>
    <section class="card span2"><div class="card-h"><h2>Compartidos de ${esc(ymLabel(ym))}</h2><span class="sub num">${fmt(sum(mes.map(m => m.monto)))}</span></div>
      <div class="list">${mes.length ? mes.map(movRow).join('') : '<p class="small muted">Marca un gasto como compartido al anotarlo o importarlo.</p>'}</div></section>
  </div>`;
}
function vAsesor() {
  const quick = ['¿En qué podemos recortar este mes?', '¿Cómo pagamos nuestras deudas más rápido?', '¿Cuánto deberíamos tener de fondo de emergencia?', 'Arma un presupuesto con nuestros ingresos', '¿Qué gastos subieron respecto al mes pasado?', '¿Qué es el CAE y cómo comparo créditos?'];
  if (!S.sample) return `<section class="card"><h2>Asesor</h2><p class="muted">El asesor usa Claude y funciona cuando abres esta página en claude.ai con tu sesión iniciada.</p></section>`;
  return `<section class="card">
    <div class="card-h"><h2>Pregúntale a Claude por sus finanzas</h2>${S.chat.length ? '<button class="btn sm ghost" type="button" data-act="chat-reset">Nueva conversación</button>' : ''}</div>
    <p class="small muted">Claude ve un resumen de sus números (totales por categoría, pagos fijos, deudas y metas) y puede buscar movimientos puntuales. No recomienda inversiones ni productos financieros específicos.</p>
    <div class="chat" id="chat">${S.chat.map((m, i) => `<div class="msg ${m.role === 'user' ? 'u' : 'a'}"${i === S.chat.length - 1 && m.role === 'assistant' ? ' id="last-a"' : ''}>${m.role === 'user' ? esc(m.content) : md(m.content)}</div>`).join('')}${S.chatBusy ? `<div class="msg a" id="last-a">${S.chatPartial ? md(S.chatPartial) : '<span class="status"><span class="spin"></span>Pensando…</span>'}</div>` : ''}</div>
    ${S.chat.length ? '' : `<div class="chips">${quick.map(q => `<button type="button" data-act="chat-q" data-v="${esc(q)}">${esc(q)}</button>`).join('')}</div>`}
    <form id="chat-f" class="row" style="align-items:flex-end"><textarea id="chat-in" rows="2" placeholder="Escribe tu pregunta…" style="flex:1;min-height:44px" aria-label="Pregunta" data-live="1">${esc(S.chatDraft || '')}</textarea>${S.chatBusy ? '<button class="btn" type="button" data-act="chat-stop">Detener</button>' : '<button class="btn pri" type="submit">Enviar</button>'}</form>
  </section>`;
}
