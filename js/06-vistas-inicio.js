'use strict';
/* ---------- vistas ---------- */
const sevIcon = {critical:'!', serious:'!', warning:'!', good:'✓', info:'i'};
const sevLabel = {critical:'Urgente', serious:'Revisar', warning:'Atención', good:'Buena noticia', info:'Sugerencia'};
const alertHTML = a => `<div class="sev ${a.sev}"><span class="ic" aria-hidden="true">${sevIcon[a.sev]}</span><div class="body"><b>${esc(a.t)}</b><span>${esc(a.d)}</span>${a.act ? `<div><button class="btn sm ghost" type="button" data-act="${esc(a.act.a)}" data-v="${esc(a.act.v)}">${esc(a.act.l)}</button></div>` : ''}</div><span class="chip">${sevLabel[a.sev]}</span></div>`;
function exampleBanner() {
  const n = S.movs.filter(m => m.ej).length + S.recs.filter(m => m.ej).length + S.deudas.filter(m => m.ej).length + S.metas.filter(m => m.ej).length;
  if (!n) return '';
  return `<div class="banner"><span class="chip ej">ejemplo</span><span class="sp">Estás viendo datos de ejemplo para conocer la app. Bórralos cuando empieces con los tuyos.</span><button class="btn sm" type="button" data-act="borrar-ej">Borrar ejemplos</button></div>`;
}
function statusBanner() {
  if (S.noDb) return `<div class="banner">Para guardar y compartir datos abre esta página en claude.ai con tu sesión iniciada.</div>`;
  if (S.slow && !S.ready.movs) return `<div class="banner">Todavía no se pudo conectar con tus datos. Revisa tu conexión; la página seguirá intentando.</div>`;
  if (S.ro) return `<div class="banner">Puedes ver los datos, pero no guardar cambios. Pide a quien te compartió la página acceso de colaborador.</div>`;
  if (personas().length > 1 && !(S.yo && personaOf(S.yo))) return `<div class="banner"><b>¿Quién usa este dispositivo?</b><span class="sp small muted">Así lo que anotes queda a tu nombre. Se recuerda en este navegador.</span>${personas().map(p => `<button class="btn sm pri" type="button" data-act="soy" data-v="${esc(p.id)}">Soy ${esc(p.n)}</button>`).join('')}</div>`;
  return '';
}
const cap = s => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const avatarSm = id => avatar(id).replace('class="av"', 'class="av sm"');
const quienMatch = (m, q) => !q || (q === '__comp' ? !!m.comp : m.quien === q);
const pfMatch = m => quienMatch(m, S.pf.quien) && (!S.pf.cuenta || m.cuenta === S.pf.cuenta);
// Totales del mes con los filtros del panel. hasta: fecha tope (para comparar contra el mismo día del mes anterior).
function stP(ym, hasta) {
  const key = `p|${ym}|${hasta || ''}|${S.pf.quien}|${S.pf.cuenta}`;
  if (S._st[key]) return S._st[key];
  const ms = st(ym).ms.filter(m => pfMatch(m) && (!hasta || m.fecha <= hasta));
  let gas = 0, aho = 0, ingO = 0; const byCat = {}, byQ = {}, byC = {}, byM = {};
  for (const m of ms) {
    if (m.tipo === 'ingreso' && m.cat !== 'sueldo') ingO += m.monto;
    else if (m.tipo === 'gasto') {
      if (m.cat === 'ahorro') { aho += m.monto; continue; }
      gas += m.monto; byCat[m.cat] = (byCat[m.cat] || 0) + m.monto;
      const q = m.comp ? '__comp' : (m.quien || ''); byQ[q] = (byQ[q] || 0) + m.monto;
      const c = m.cuenta || 'Sin tarjeta'; byC[c] = (byC[c] || 0) + m.monto;
      const k = merchantKey(m.comercio || m.desc) || norm(m.desc);
      if (k) { const o = byM[k] || (byM[k] = {n: m.comercio || m.desc, k, v: 0, c: 0}); o.v += m.monto; o.c++; }
    }
  }
  const ing = ingO + sum(sueldosPeriodo(ym).filter(pfMatch).filter(m => !hasta || m.fecha <= hasta || ymOf(m.fecha) < ym).map(m => m.monto));
  return (S._st[key] = {ms, gas, aho, ing, byCat, byQ, byC, byM});
}
function hbars(items) {
  const max = Math.max(1, ...items.map(i => i.v)), tot = sum(items.map(i => i.v));
  return items.map(i => `<div class="cbar"><div class="cbar-h"><span>${esc(i.n)}</span><span class="num">${fmt(i.v)} <small>${tot ? Math.round(i.v / tot * 100) : 0} %</small></span></div><div class="track"><div class="fill" style="width:${i.v / max * 100}%;background:${i.c}"></div></div></div>`).join('');
}
function personaChips(act, cur) {
  const opts = [['', 'Todos'], ...personas().map(p => [p.id, p.n]), ['__comp', 'Compartidos']];
  return opts.map(([v, l]) => `<button type="button" class="pchip" data-act="${act}" data-v="${esc(v)}" aria-pressed="${cur === v}">${esc(l)}</button>`).join('');
}
const cuentaSel = (id, cur, todas) => `<select id="${id}" class="psel${cur ? ' on' : ''}" aria-label="Tarjeta o cuenta"><option value="">${todas}</option>${cfg().cuentas.map(c => `<option value="${esc(c)}"${c === cur ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>`;
const qName = q => q === '__comp' ? 'Compartido' : q ? nameOf(q).replace(' (tú)', '') : 'Sin asignar';

function vInicio() {
  const ym = S.ym, cur = curYM(), isCur = ym === cur;
  if (!S.ready.movs && !S.noDb) return `<div class="card"><div class="status"><span class="spin"></span>Cargando tus finanzas…</div></div>`;
  if (!S.movs.length && !S.recs.length) return `
    <section class="card"><h2>Bienvenidos a Caja Común</h2><p class="muted">Aquí van a ver en qué se va la plata, cuánto pueden gastar cada día, qué pagos vienen y cómo van sus deudas y metas. Para empezar:</p>
    <div class="steps">
      <div class="step"><b>1. Importa una cartola</b><span class="small muted">Sube el Excel, CSV o PDF de tu banco, o una captura de la app. Claude lee y ordena los movimientos.</span><a class="btn pri" href="#importar">Importar</a></div>
      <div class="step"><b>2. Registra tus pagos fijos</b><span class="small muted">Arriendo, cuentas, suscripciones y sueldo. Se anotan solos cada mes.</span><a class="btn" href="#fijos">Pagos fijos</a></div>
      <div class="step"><b>3. Define el presupuesto</b><span class="small muted">Un monto por categoría. La app te dice cuánto puedes gastar hoy.</span><a class="btn" href="#presupuesto">Presupuesto</a></div>
    </div></section>`;
  const p = stP(ym), prevYM = addMonths(ym, -1);
  const hasta = isCur ? `${prevYM}-${pad(Math.min(Number(todayISO().slice(8)), daysInMonth(prevYM)))}` : '';
  const pv = stP(prevYM, hasta);
  const filtro = S.pf.quien || S.pf.cuenta;

  let t1;
  if (isCur) {
    const d = disponible();
    t1 = `<div class="tile hl c3"><span class="lbl">Pueden gastar hoy</span><span class="v num">${fmt(d.porDia)}</span><span class="d">${d.restante > 0 ? `Quedan ${fmt(d.restante)} para ${d.dl} días` : 'Ya no queda margen este mes'}${filtro ? ' · todo el hogar' : ''}</span></div>`;
  } else {
    const r = p.ing - p.gas - p.aho;
    t1 = `<div class="tile hl c3"><span class="lbl">Resultado del mes</span><span class="v num">${fmt(r)}</span><span class="d">${r >= 0 ? 'Les sobró después de gastos y ahorro' : 'Gastaron más de lo que entró'}</span></div>`;
  }
  const dl = pv.gas ? (p.gas - pv.gas) / pv.gas : null;
  const deltaTxt = dl == null ? 'Sin gastos el mes anterior' : `<span class="delta ${dl > 0 ? 'up' : 'down'}">${dl > 0 ? '▲' : '▼'} ${Math.abs(Math.round(dl * 100))} %</span> vs ${esc(MESES[Number(prevYM.slice(5)) - 1])}${isCur ? ' a la misma fecha' : ''}`;
  const pct = p.ing ? Math.round((p.ing - p.gas) / p.ing * 100) : null;
  const kpis = `${t1}
    <div class="tile c3"><span class="lbl">Gastado</span><span class="v num">${fmt(p.gas)}</span><span class="d">${deltaTxt}</span></div>
    <div class="tile c3"><span class="lbl">Ingresos</span><span class="v num">${fmt(p.ing)}</span><span class="d">Incluye el sueldo del último día hábil anterior</span></div>
    <div class="tile c3"><span class="lbl">Sin gastar</span><span class="v num">${pct == null ? '—' : pct + ' %'}</span><span class="d">${pct == null ? 'Sin ingresos anotados' : pct >= 0 ? 'de los ingresos del mes' : 'Gastaron más de lo que entró'}</span></div>`;

  const months = []; for (let i = 11; i >= 0; i--) { const y = addMonths(ym, -i), x = stP(y); months.push({ym: y, ing: x.ing, gas: x.gas, cur: y === ym}); }
  const catsArr = Object.entries(p.byCat).map(([id, v]) => ({id, n: catName(id), v, c: catColor(id)})).sort((a, b) => b.v - a.v);
  const top = catsArr.slice(0, 6); const rest = sum(catsArr.slice(6).map(c => c.v));
  if (rest) top.push({n: 'Otras categorías', v: rest, c: '#b4b2a9'});
  const qCol = q => q === '__comp' ? '#ba7517' : q === (personas()[0] || {}).id ? '#5f5e5a' : q === (personas()[1] || {}).id ? '#1d9e75' : '#888780';
  const porQ = Object.entries(p.byQ).map(([q, v]) => ({n: qName(q), v, c: qCol(q)})).sort((a, b) => b.v - a.v);
  const porC = Object.entries(p.byC).map(([n, v]) => ({n, v, c: '#5f5e5a'})).sort((a, b) => b.v - a.v).slice(0, 6);
  const topM = Object.values(p.byM).sort((a, b) => b.v - a.v).slice(0, 6);
  const al = isCur ? alertas() : [];
  const pend = pendientes(ym);

  return `
  <div class="fbar"><span class="lbl">Ver</span>${personaChips('pf', S.pf.quien)}${cuentaSel('pf-cuenta', S.pf.cuenta, 'Todas las tarjetas')}</div>
  <div class="dash">
    ${kpis}
    <section class="card c8"><div class="card-h"><h2>Ingresos y gastos por mes</h2><div class="legend"><span><i style="background:var(--s1)"></i>Ingresos</span><span><i style="background:var(--s2)"></i>Gastos</span></div></div>${trendSVG(months)}</section>
    <section class="card c4"><div class="card-h"><h2>Por categoría</h2><a class="btn sm ghost" href="#presupuesto">Presupuesto</a></div>
      ${p.gas ? `<div class="donut">${donutSVG(top, p.gas)}<div class="dleg">${top.map(c => `<div><i style="background:${c.c}"></i><span>${esc(c.n)}</span><b>${esc(fmtShort(c.v))}<small>${Math.round(c.v / p.gas * 100)} %</small></b></div>`).join('')}</div></div>` : '<p class="muted small">Sin gastos este mes.</p>'}</section>
    <section class="card c4"><div class="card-h"><h2>Por persona</h2></div>${porQ.length ? hbars(porQ) : '<p class="muted small">Sin gastos este mes.</p>'}</section>
    <section class="card c4"><div class="card-h"><h2>Por tarjeta</h2><a class="btn sm ghost" href="#tarjetas">Tarjetas</a></div>${porC.length ? hbars(porC) : '<p class="muted small">Sin gastos este mes.</p>'}</section>
    <section class="card c4"><div class="card-h"><h2>Dónde más gastan</h2></div>${topM.length ? `<div class="rank">${topM.map((m, i) => `<div class="r1 clickable" data-act="ver-comercio" data-v="${esc(m.k.split(' ')[0])}" role="button" tabindex="0"><span class="n">${i + 1}</span><span>${esc(m.n)} <small class="muted">· ${m.c} ${m.c === 1 ? 'compra' : 'compras'}</small></span><b class="num">${fmt(m.v)}</b></div>`).join('')}</div>` : '<p class="muted small">Sin gastos este mes.</p>'}</section>
    ${isCur ? `<section class="card c6"><div class="card-h"><h2>Avisos</h2><span class="sub">${al.length ? al.length + ' para revisar' : 'Todo en orden'}</span></div>
      <div class="list">${al.length ? al.slice(0, 6).map(alertHTML).join('') : '<p class="muted small">No hay nada urgente. La app revisa presupuestos, vencimientos, cobros duplicados, suscripciones y gastos raros.</p>'}</div>
      ${al.length > 6 ? `<details><summary>Ver ${al.length - 6} más</summary><div class="list">${al.slice(6).map(alertHTML).join('')}</div></details>` : ''}</section>` : ''}
    <section class="card ${isCur ? 'c6' : 'c12'}"><div class="card-h"><h2>Pagos del mes</h2><a class="btn sm ghost" href="#fijos">Administrar</a></div>
      <div class="list">${pend.length ? pend.map(x => `<div class="li"><div class="main"><div class="t">${esc(x.nombre)}</div><div class="m">${esc(dShort(x.fecha))} · ${esc(catName(x.cat))}${x.auto ? ' · se anota solo' : ''}</div></div><span class="amt">${fmt(x.monto)}</span>${x.paid ? '<span class="pill ok">Pagado</span>' : `<button class="btn sm" type="button" data-act="pagar" data-v="${esc(x.key)}">Pagar</button>`}</div>`).join('') : '<p class="muted small">Agrega tus pagos fijos y cuotas para verlos aquí cada mes.</p>'}</div></section>
    <section class="card c12"><div class="card-h"><h2>Análisis del mes con Claude</h2>${S.sample ? `<button class="btn sm" type="button" data-act="analizar"${S.analisisBusy ? ' disabled' : ''}>${S.analisis ? 'Volver a analizar' : 'Analizar ' + esc(ymLabel(ym))}</button>` : ''}</div>
      ${!S.sample ? '<p class="muted small">El análisis con Claude se activa cuando abres la página en claude.ai.</p>' : S.analisisBusy ? '<div class="status"><span class="spin"></span>Claude está revisando el mes…</div>' : S.analisis ? `<div class="ai-out" id="ai-out">${md(S.analisis)}</div>` : '<p class="muted small">Claude revisa los números del mes y les dice qué cambió, dónde recortar y qué viene.</p>'}</section>
  </div>`;
}

function vMovimientos() {
  const ym = S.ym, f = S.f, q = norm(f.q);
  const ms = st(ym).ms.filter(m => (!f.cat || m.cat === f.cat) && quienMatch(m, f.quien) && (!f.tipo || m.tipo === f.tipo) && (!f.cuenta || m.cuenta === f.cuenta) && (!q || norm(m.desc + ' ' + (m.comercio || '') + ' ' + (m.nota || '') + ' ' + catName(m.cat)).includes(q)))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || String(b.creado || '').localeCompare(String(a.creado || '')));
  const g = sum(ms.filter(m => m.tipo === 'gasto').map(m => m.monto)), i = sum(ms.filter(m => m.tipo === 'ingreso').map(m => m.monto));
  if (!ms.some(m => m.id === S.sel)) S.sel = ms.length ? ms[0].id : '';
  const byDay = {}; for (const m of ms) (byDay[m.fecha] = byDay[m.fecha] || []).push(m);
  const days = Object.keys(byDay).sort().reverse();
  const filtrado = f.q || f.cat || f.quien || f.tipo || f.cuenta;
  return `
  <div class="mv-head"><h2>${esc(cap(ymLabel(ym)))}</h2><span class="muted num">${ms.length} ${ms.length === 1 ? 'movimiento' : 'movimientos'} · ${fmt(g)} en gastos${i ? ` · ${fmt(i)} en ingresos` : ''}</span></div>
  <div class="fbar">${personaChips('fq', f.quien)}
    ${cuentaSel('f-cuenta', f.cuenta, 'Tarjeta')}
    <select id="f-cat" class="psel${f.cat ? ' on' : ''}" aria-label="Categoría"><option value="">Categoría</option>${allCatOptions(f.cat)}</select>
    <select id="f-tipo" class="psel${f.tipo ? ' on' : ''}" aria-label="Tipo"><option value="">Gastos e ingresos</option><option value="gasto"${f.tipo === 'gasto' ? ' selected' : ''}>Solo gastos</option><option value="ingreso"${f.tipo === 'ingreso' ? ' selected' : ''}>Solo ingresos</option><option value="transf"${f.tipo === 'transf' ? ' selected' : ''}>Traspasos</option></select>
    <input id="f-q" type="search" placeholder="Buscar comercio o nota" value="${esc(f.q)}" data-live="1" aria-label="Buscar">
  </div>
  <div class="mv">
    <section class="card mv-list"><div class="list">${days.length ? days.map(d => `<div class="day"><span>${esc(cap(dayLabel(d)))}</span></div>` + byDay[d].map(m => movRow(m, m.id === S.sel)).join('')).join('') : `<div class="empty"><b>No hay movimientos${filtrado ? ' con estos filtros' : ' este mes'}</b><span class="small">Anota uno con el botón + o importa tu cartola.</span></div>`}</div></section>
    <aside class="card mv-det" aria-label="Detalle del movimiento">${movDetail(S.movs.find(m => m.id === S.sel))}</aside>
  </div>`;
}
// sel: undefined = lista común (abre el editor); true/false = lista de Movimientos con panel de detalle.
function movRow(m, sel) {
  const ic = movIcon(m);
  const tipoTxt = m.tipo === 'transf' ? 'Traspaso' : m.tipo === 'liq' ? 'Pago entre ustedes' : catName(m.cat);
  const act = sel === undefined ? 'editar' : 'sel-mov';
  return `<div class="li mrow clickable${sel ? ' sel' : ''}" data-act="${act}" data-v="${esc(m.id)}" role="button" tabindex="0"${sel ? ' aria-current="true"' : ''}>${cicHTML(ic.k, ic.c)}<div class="main"><div class="t">${esc(m.desc)}</div><div class="m">${avatarSm(m.quien)}<span>${esc(tipoTxt)}</span>${m.cuenta ? `<span>· ${esc(m.cuenta)}</span>` : ''}${m.cuota ? `<span>· cuota ${esc(m.cuota)}</span>` : ''}${m.comp ? '<span class="chip acc">compartido</span>' : ''}${m.ej ? '<span class="chip ej">ejemplo</span>' : ''}</div></div><span class="amt${m.tipo === 'ingreso' ? ' in' : ''}">${m.tipo === 'ingreso' ? '+' : ''}${fmt(m.monto)}</span></div>`;
}
const ORIGEN = {cartola:'Importado de un estado de cuenta', importar:'Importado', manual:'Anotado a mano', rapido:'Anotado rápido', pago:'Pago registrado desde la app', recurrente:'Pago fijo que se anota solo', foto:'Leído de una foto o captura'};
function movDetail(m) {
  if (!m) return '<div class="empty"><b>Sin movimientos</b><span class="small">Cuando elijas uno, aquí verás su detalle.</span></div>';
  const ic = movIcon(m), c = catObj(m.cat), mym = ymOf(m.fecha), isG = m.tipo === 'gasto';
  const extra = [m.comercio && norm(m.comercio) !== norm(m.desc) ? esc(m.comercio) : '', m.cuota ? `Cuota ${esc(m.cuota)}${m.fechaCompra ? `, compra del ${esc(dShort(m.fechaCompra))}` : ''}` : '', m.nota ? esc(m.nota) : '', ORIGEN[m.origen] || ''].filter(Boolean);
  let campos = '';
  if (isG || m.tipo === 'ingreso') campos = `<div class="dgrid">
      <span>Categoría</span><select id="md-cat">${catOptions(isG ? 'gasto' : 'ingreso', m.cat)}</select>
      <span>${isG ? 'Pagado por' : 'Recibido por'}</span><select id="md-quien">${memberOptions(m.quien)}</select>
      ${isG ? `<span>Reparto</span><label class="check"><input id="md-comp" type="checkbox"${m.comp ? ' checked' : ''}> Gasto compartido</label>` : ''}
    </div>`;
  let pres = '';
  if (isG && c) {
    const gastado = st(mym).byCat[m.cat] || 0, tope = Number(c.p) || 0;
    pres = tope ? `<div style="display:grid;gap:6px"><div class="cbar-h small"><span>${esc(c.n)} en ${esc(MESES[Number(mym.slice(5)) - 1])}</span><span class="num">${Math.round(gastado / tope * 100)} %</span></div>
      <div class="track"><div class="fill${gastado > tope ? ' over' : ' acc'}" style="width:${Math.min(100, gastado / tope * 100)}%"></div></div>
      <span class="hint num">${fmt(gastado)} de ${fmt(tope)} · ${gastado > tope ? `se pasaron por ${fmt(gastado - tope)}` : `quedan ${fmt(tope - gastado)}`}</span></div>`
      : `<p class="hint num">${esc(c.n)} en ${esc(MESES[Number(mym.slice(5)) - 1])}: ${fmt(gastado)}. Sin presupuesto definido.</p>`;
  }
  let hist = '';
  const k = merchantKey(m.comercio || m.desc);
  if (isG && k.length >= 3) {
    const meses = []; for (let i = 5; i >= 0; i--) meses.push(addMonths(mym, -i));
    const pm = {}; meses.forEach(x => pm[x] = {v: 0, c: 0});
    for (const x of S.movs) { if (x.tipo !== 'gasto') continue; const y = ymOf(x.fecha); if (!pm[y] || merchantKey(x.comercio || x.desc) !== k) continue; pm[y].v += x.monto; pm[y].c++; }
    const tot = sum(meses.map(x => pm[x].v)), n = sum(meses.map(x => pm[x].c)), max = Math.max(1, ...meses.map(x => pm[x].v));
    if (n > 1) hist = `<div style="display:grid;gap:6px"><span class="lbl">${esc(cap(k))}, últimos 6 meses</span>
      <div class="hist">${meses.map(x => `<div class="${x === mym ? 'on' : ''}" data-tip="${esc(`${cap(ymLabel(x))}\n${pm[x].c} ${pm[x].c === 1 ? 'compra' : 'compras'} · ${fmt(pm[x].v)}`)}"><i style="height:${Math.max(3, pm[x].v / max * 46)}px"></i><small>${esc(ymShort(x))}</small></div>`).join('')}</div>
      <span class="hint num">${pm[mym].c} ${pm[mym].c === 1 ? 'compra' : 'compras'} en ${esc(MESES[Number(mym.slice(5)) - 1])} · promedio ${fmt(tot / n)} por compra</span></div>`;
  }
  return `<div class="det">
    <div class="row" style="gap:12px;flex-wrap:nowrap">${cicHTML(ic.k, ic.c)}<span class="lbl" style="min-width:0">${esc(cap(dayLabel(m.fecha)))}${m.cuenta ? ` · ${esc(m.cuenta)}` : ''}</span></div>
    <div><div class="big2 num">${m.tipo === 'ingreso' ? '+' : ''}${fmt(m.monto)}</div><div style="font-weight:600;margin-top:4px">${esc(m.desc)}</div>${extra.length ? `<div class="hint">${extra.join(' · ')}</div>` : ''}</div>
    ${campos}
    ${pres || hist ? '<hr class="sep">' : ''}${pres}${hist}
    <div class="row"><button class="btn" type="button" data-act="editar-sel">Editar</button><span class="sp"></span><button class="btn danger" type="button" data-act="borrar-sel">Borrar</button></div>
  </div>`;
}
function vImportar() {
  const I = S.imp, sel = I.rows.filter(r => r.sel);
  const canImg = !!(S.limits && S.limits.images);
  const me = yo();
  if (!I.quien) I.quien = me;
  if (I.comp === null) I.comp = cfg().compDefault;
  return `<section class="card">
    <div class="card-h"><h2>Importar movimientos</h2><span class="sub">${S.sample ? 'Claude lee el archivo y propone categorías' : 'Lectura básica de Excel y CSV'}</span></div>
    <div class="drop" id="drop">
      <b>Arrastra aquí tu cartola o una captura</b>
      <span class="small muted">Excel, CSV o PDF del banco${canImg ? ', o fotos y capturas de la app del banco o de una boleta' : ''}. Puedes subir varios a la vez.</span>
      <div class="row" style="justify-content:center"><label class="btn pri" for="imp-file">Elegir archivos</label><button class="btn" type="button" data-act="pegar">Pegar texto</button></div>
      <input id="imp-file" type="file" multiple accept=".csv,.txt,.xlsx,.xls,.ods,.pdf${canImg ? ',image/*' : ''}" hidden>
    </div>
    <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))">
      <label class="field"><span>Cuenta o tarjeta</span><select id="imp-cuenta">${cuentaOptions(I.cuenta)}</select></label>
      <label class="field"><span>Movimientos de</span><select id="imp-quien">${memberOptions(I.quien)}</select></label>
      <label class="check" style="align-self:end;padding-bottom:8px"><input id="imp-comp" type="checkbox"${I.comp ? ' checked' : ''}> Marcar como compartidos</label>
    </div>
    ${I.busy ? `<div class="status"><span class="spin"></span><span>${esc(I.status)}</span></div>` : I.status ? `<p class="small muted">${esc(I.status)}</p>` : ''}
    ${I.note ? `<p class="small" style="color:var(--crit-ink)">${esc(I.note)}</p>` : ''}
  </section>
  ${(() => { const q = cuadratura(); if (!q) return ''; return `<section class="card"><div class="card-h"><h2>Cuadratura de ${esc(I.cuenta)}</h2><span class="sub">${esc(dShort(q.desde))} al ${esc(dShort(q.hasta))}</span></div>
    <div class="stat3"><div class="stat"><span class="lbl">Ya estaban anotadas</span><b class="num">${q.ya}</b></div><div class="stat"><span class="lbl">Faltaba anotar</span><b class="num">${q.nuevas}</b></div><div class="stat"><span class="lbl">Anotadas que no aparecen</span><b class="num">${q.faltanEnArchivo.length}</b></div></div>
    ${q.nuevas ? '<p class="small">Las que faltaban quedan seleccionadas abajo. Guárdalas y la tarjeta queda al día.</p>' : '<p class="small">Todo lo del archivo ya estaba anotado.</p>'}
    ${q.faltanEnArchivo.length ? `<details><summary>Ver ${q.faltanEnArchivo.length} anotadas que no están en el archivo</summary><p class="hint">Puede que se hayan anotado con otro monto, en otra tarjeta, o que entren en el próximo estado de cuenta.</p><div class="list">${q.faltanEnArchivo.map(movRow).join('')}</div></details>` : ''}</section>`; })()}
  ${I.rows.length ? `<section class="card">
    <div class="card-h"><h2>Revisa antes de guardar</h2><span class="sub num" id="imp-tot">${sel.length} de ${I.rows.length} seleccionados · ${fmt(sum(sel.filter(r => r.tipo === 'gasto').map(r => r.monto)))} en gastos</span></div>
    ${!I.cuenta ? '<p class="small" style="color:var(--crit-ink);font-weight:600">Elige arriba la tarjeta o cuenta de estos movimientos; sin eso no se pueden guardar.</p>' : ''}
    ${I.cierre ? `<p class="small muted">Las cuotas de compras anteriores quedaron con fecha ${esc(dShort(I.cierre))}, el cierre de ${esc(I.cuenta)}, para que cuenten en este estado de cuenta.</p>` : ''}
    ${I.rows.some(r => r.dup) ? '<p class="small muted">Las filas marcadas en amarillo parecen estar ya registradas, por eso quedaron sin seleccionar.</p>' : ''}
    <div class="tblwrap"><table class="tbl"><thead><tr><th><input type="checkbox" id="imp-all" aria-label="Seleccionar todo"${sel.length === I.rows.length ? ' checked' : ''}></th><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Tipo</th><th class="r">Monto</th></tr></thead><tbody>
    ${I.rows.map(r => `<tr class="${r.dup ? 'dup' : ''}" data-k="${esc(r.k)}">
      <td><input type="checkbox" data-f="sel"${r.sel ? ' checked' : ''} aria-label="Incluir"></td>
      <td><input type="date" data-f="fecha" value="${esc(r.fecha)}" style="min-width:130px"></td>
      <td style="min-width:180px"><input type="text" data-f="desc" value="${esc(r.desc)}">${r.cuota ? `<div class="small muted">cuota ${esc(r.cuota)}${r.fechaCompra ? ` · compra del ${esc(dShort(r.fechaCompra))}` : ''}</div>` : ''}${r.dup ? `<div class="small muted">Parecido a: ${esc(r.dup)}</div>` : ''}</td>
      <td><select data-f="cat" style="min-width:150px">${allCatOptions(r.cat)}</select></td>
      <td><select data-f="tipo"><option value="gasto"${r.tipo === 'gasto' ? ' selected' : ''}>Gasto</option><option value="ingreso"${r.tipo === 'ingreso' ? ' selected' : ''}>Ingreso</option><option value="transf"${r.tipo === 'transf' ? ' selected' : ''}>Traspaso</option></select></td>
      <td class="r"><input type="text" inputmode="numeric" data-f="monto" value="${fmtN(r.monto)}" style="width:110px;text-align:right"></td></tr>`).join('')}
    </tbody></table></div>
    <p class="hint">Los traspasos (pago de la tarjeta, movimientos entre tus cuentas) no se cuentan como gasto, así no se duplican. Si cambias una categoría, la app la recuerda para la próxima.</p>
    <div class="row"><button class="btn" type="button" data-act="imp-limpiar">Descartar</button><span class="sp"></span><button class="btn pri" type="button" data-act="imp-guardar"${sel.length && !I.busy ? '' : ' disabled'}>Guardar ${sel.length} movimientos</button></div>
  </section>` : `<section class="card"><h2>Lo más cerca de automático</h2>
    <div class="steps">
      <div class="step"><b>Cartola del banco</b><span class="small muted">En tu banco en línea busca Cartola o Últimos movimientos y descarga en Excel. Si solo hay PDF, también sirve.</span></div>
      <div class="step"><b>Captura del celular</b><span class="small muted">Saca un pantallazo de los movimientos en la app del banco y súbelo aquí desde el teléfono.</span></div>
      <div class="step"><b>Pagos fijos que se anotan solos</b><span class="small muted">Sueldo, arriendo y suscripciones se registran cada mes sin que hagas nada.</span></div>
      <div class="step"><b>Reglas que aprenden</b><span class="small muted">Cada vez que corriges una categoría, la próxima importación ya viene bien.</span></div>
    </div></section>`}`;
}
