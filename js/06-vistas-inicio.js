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
  return '';
}
function vInicio() {
  const ym = S.ym, cur = curYM(), isCur = ym === cur, s = st(ym);
  if (!S.ready.movs && !S.noDb) return `<div class="card"><div class="status"><span class="spin"></span>Cargando tus finanzas…</div></div>`;
  if (!S.movs.length && !S.recs.length) return `
    <section class="card"><h2>Bienvenidos a Caja Común</h2><p class="muted">Aquí van a ver en qué se va la plata, cuánto pueden gastar cada día, qué pagos vienen y cómo van sus deudas y metas. Para empezar:</p>
    <div class="steps">
      <div class="step"><b>1. Importa una cartola</b><span class="small muted">Sube el Excel, CSV o PDF de tu banco, o una captura de la app. Claude lee y ordena los movimientos.</span><a class="btn pri" href="#importar">Importar</a></div>
      <div class="step"><b>2. Registra tus pagos fijos</b><span class="small muted">Arriendo, cuentas, suscripciones y sueldo. Se anotan solos cada mes.</span><a class="btn" href="#fijos">Pagos fijos</a></div>
      <div class="step"><b>3. Define el presupuesto</b><span class="small muted">Un monto por categoría. La app te dice cuánto puedes gastar hoy.</span><a class="btn" href="#presupuesto">Presupuesto</a></div>
    </div></section>`;
  let hero;
  if (isCur) {
    const d = disponible(), pr = proyeccion();
    const exp = d.modo === 'pres'
      ? `De tu presupuesto de ${fmt(d.pres)} te quedan ${fmt(d.restante)} después de apartar ${fmt(d.pendM)} en pagos pendientes, para ${d.dl} días.`
      : d.ingRef > 0 ? `Calculado con ingresos de ${fmt(d.ingRef)}, lo ya gastado y ${fmt(d.pendM)} en pagos pendientes, para ${d.dl} días.${cfg().ahorroMensual ? ` Ya descuenta tu ahorro de ${fmt(cfg().ahorroMensual)}.` : ''}`
      : 'Anota tus ingresos del mes o define un presupuesto para calcular cuánto puedes gastar al día.';
    hero = `<section class="hero"><div style="display:grid;gap:8px;align-content:center"><span class="lbl">Pueden gastar hoy</span><div class="big num">${fmt(d.porDia)}</div><p class="exp">${esc(exp)}</p></div>
      <div class="kpis">
        <div class="kpi"><span class="lbl">Ingresos</span><b class="num">${fmt(s.ing)}</b><span class="d">${esc(ymLabel(ym))}</span></div>
        <div class="kpi"><span class="lbl">Gastos</span><b class="num">${fmt(s.gas)}</b><span class="d">Proyección a fin de mes: ${fmt(pr)}</span></div>
        <div class="kpi"><span class="lbl">Por pagar este mes</span><b class="num">${fmt(d.pendM)}</b><span class="d">${pendientes(cur).filter(p => !p.paid).length} pagos pendientes</span></div>
        <div class="kpi"><span class="lbl">Ahorro</span><b class="num">${fmt(s.aho)}</b><span class="d">${s.ing ? Math.round((s.ing - s.gas) / s.ing * 100) + '% de los ingresos sin gastar' : 'Sin ingresos anotados'}</span></div>
      </div></section>`;
  } else {
    hero = `<section class="hero"><div style="display:grid;gap:8px;align-content:center"><span class="lbl">Resultado de ${esc(ymLabel(ym))}</span><div class="big num">${fmt(s.ing - s.gas - s.aho)}</div><p class="exp">${s.ing - s.gas - s.aho >= 0 ? 'Les sobró este monto después de gastos y ahorro.' : 'Gastaron más de lo que entró este mes.'}</p></div>
      <div class="kpis"><div class="kpi"><span class="lbl">Ingresos</span><b class="num">${fmt(s.ing)}</b></div><div class="kpi"><span class="lbl">Gastos</span><b class="num">${fmt(s.gas)}</b></div><div class="kpi"><span class="lbl">Ahorro</span><b class="num">${fmt(s.aho)}</b></div><div class="kpi"><span class="lbl">Movimientos</span><b class="num">${s.ms.length}</b></div></div></section>`;
  }
  const al = isCur ? alertas() : [];
  const pend = pendientes(ym);
  const cats = catsOf('gasto').map(c => ({n: c.n, v: s.byCat[c.id] || 0, p: Number(c.p) || 0})).filter(i => i.v || i.p).sort((a, b) => b.v - a.v);
  const months = []; for (let i = 5; i >= 0; i--) { const y = addMonths(ym, -i), x = st(y); months.push({ym: y, ing: x.ing, gas: x.gas, cur: y === ym}); }
  return `${hero}
  <div class="grid">
    ${isCur ? `<section class="card"><div class="card-h"><h2>Avisos</h2><span class="sub">${al.length ? al.length + ' para revisar' : 'Todo en orden'}</span></div>
      <div class="list">${al.length ? al.slice(0, 7).map(alertHTML).join('') : '<p class="muted small">No hay nada urgente. La app revisa presupuestos, vencimientos, cobros duplicados, suscripciones y gastos raros.</p>'}</div>
      ${al.length > 7 ? `<details><summary>Ver ${al.length - 7} más</summary><div class="list">${al.slice(7).map(alertHTML).join('')}</div></details>` : ''}</section>` : ''}
    <section class="card"><div class="card-h"><h2>Pagos del mes</h2><a class="btn sm ghost" href="#fijos">Administrar</a></div>
      <div class="list">${pend.length ? pend.map(p => `<div class="li"><div class="main"><div class="t">${esc(p.nombre)}</div><div class="m">${esc(dShort(p.fecha))} · ${esc(catName(p.cat))}${p.auto ? ' · se anota solo' : ''}</div></div><span class="amt">${fmt(p.monto)}</span>${p.paid ? '<span class="pill ok">Pagado</span>' : `<button class="btn sm" type="button" data-act="pagar" data-v="${esc(p.key)}">Pagar</button>`}</div>`).join('') : '<p class="muted small">Agrega tus pagos fijos y cuotas para verlos aquí cada mes.</p>'}</div></section>
    <section class="card"><div class="card-h"><h2>Gasto por categoría</h2><span class="sub">La línea marca el presupuesto</span></div>
      ${cats.length ? catBars(cats.slice(0, 10)) : '<p class="muted small">Sin gastos este mes.</p>'}</section>
    <section class="card"><div class="card-h"><h2>Últimos 6 meses</h2><div class="legend"><span><i style="background:var(--s1)"></i>Ingresos</span><span><i style="background:var(--s2)"></i>Gastos</span></div></div>${trendSVG(months)}</section>
    <section class="card span2"><div class="card-h"><h2>Análisis del mes con Claude</h2>${S.sample ? `<button class="btn sm" type="button" data-act="analizar"${S.analisisBusy ? ' disabled' : ''}>${S.analisis ? 'Volver a analizar' : 'Analizar ' + esc(ymLabel(ym))}</button>` : ''}</div>
      ${!S.sample ? '<p class="muted small">El análisis con Claude se activa cuando abres la página en claude.ai.</p>' : S.analisisBusy ? '<div class="status"><span class="spin"></span>Claude está revisando el mes…</div>' : S.analisis ? `<div class="ai-out" id="ai-out">${md(S.analisis)}</div>` : '<p class="muted small">Claude revisa tus números del mes y te dice qué cambió, dónde recortar y qué viene.</p>'}</section>
  </div>`;
}
function vMovimientos() {
  const ym = S.ym, f = S.f;
  const q = norm(f.q);
  let ms = st(ym).ms.filter(m => (!f.cat || m.cat === f.cat) && (!f.quien || m.quien === f.quien) && (!f.tipo || m.tipo === f.tipo) && (!f.cuenta || m.cuenta === f.cuenta) &&(!q || norm(m.desc + ' ' + (m.comercio || '') + ' ' + (m.nota || '') + ' ' + catName(m.cat)).includes(q)));
  const g = sum(ms.filter(m => m.tipo === 'gasto').map(m => m.monto)), i = sum(ms.filter(m => m.tipo === 'ingreso').map(m => m.monto));
  const byDay = {}; for (const m of ms) (byDay[m.fecha] = byDay[m.fecha] || []).push(m);
  const days = Object.keys(byDay).sort().reverse();
  return `<section class="card">
    <div class="card-h"><h2>Movimientos de ${esc(ymLabel(ym))}</h2><span class="sub num">${ms.length} movimientos · gastos ${fmt(g)} · ingresos ${fmt(i)}</span></div>
    <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))">
      <input id="f-q" type="search" placeholder="Buscar comercio o nota" value="${esc(f.q)}" data-live="1" aria-label="Buscar">
      <select id="f-cat" aria-label="Categoría"><option value="">Todas las categorías</option>${allCatOptions(f.cat)}</select>
      <select id="f-quien" aria-label="Persona"><option value="">Todas las personas</option>${members().map(id => `<option value="${esc(id)}"${id === f.quien ? ' selected' : ''}>${esc(nameOf(id))}</option>`).join('')}</select>
      <select id="f-tipo" aria-label="Tipo"><option value="">Gastos e ingresos</option><option value="gasto"${f.tipo === 'gasto' ? ' selected' : ''}>Solo gastos</option><option value="ingreso"${f.tipo === 'ingreso' ? ' selected' : ''}>Solo ingresos</option><option value="transf"${f.tipo === 'transf' ? ' selected' : ''}>Traspasos</option></select>
      <select id="f-cuenta" aria-label="Tarjeta o cuenta"><option value="">Todas las tarjetas</option>${cfg().cuentas.map(c => `<option value="${esc(c)}"${c === f.cuenta ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
    </div>
    <div class="list">${days.length ? days.map(d => `<div class="day"><span>${esc(dayLabel(d))}</span><span class="num">${fmt(sum(byDay[d].filter(m => m.tipo === 'gasto').map(m => m.monto)))}</span></div>` + byDay[d].map(movRow).join('')).join('') : `<div class="empty"><b>No hay movimientos${f.q || f.cat || f.quien || f.tipo || f.cuenta ? ' con estos filtros' : ' este mes'}</b><span class="small">Anota uno con el botón + o importa tu cartola.</span></div>`}</div>
  </section>`;
}
function movRow(m) {
  const sign = m.tipo === 'ingreso' ? '+' : m.tipo === 'gasto' ? '' : '';
  const tipoTxt = m.tipo === 'transf' ? 'Traspaso' : m.tipo === 'liq' ? 'Pago entre ustedes' : catName(m.cat);
  return `<div class="li clickable" data-act="editar" data-v="${esc(m.id)}" role="button" tabindex="0">${avatar(m.quien)}<div class="main"><div class="t">${esc(m.desc)}</div><div class="m"><span>${esc(tipoTxt)}</span>${m.cuenta ? `<span>· ${esc(m.cuenta)}</span>` : ''}${m.cuota ? `<span>· cuota ${esc(m.cuota)}</span>` : ''}${m.comp ? '<span class="chip acc">compartido</span>' : ''}${m.ej ? '<span class="chip ej">ejemplo</span>' : ''}</div></div><span class="amt${m.tipo === 'ingreso' ? ' in' : ''}">${sign}${fmt(m.monto)}</span></div>`;
}
function vImportar() {
  const I = S.imp, sel = I.rows.filter(r => r.sel);
  const canImg = !!(S.limits && S.limits.images);
  const me = (S.me && S.me.id) || '';
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
    ${I.rows.some(r => r.dup) ? '<p class="small muted">Las filas marcadas en amarillo parecen estar ya registradas, por eso quedaron sin seleccionar.</p>' : ''}
    <div class="tblwrap"><table class="tbl"><thead><tr><th><input type="checkbox" id="imp-all" aria-label="Seleccionar todo"${sel.length === I.rows.length ? ' checked' : ''}></th><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Tipo</th><th class="r">Monto</th></tr></thead><tbody>
    ${I.rows.map(r => `<tr class="${r.dup ? 'dup' : ''}" data-k="${esc(r.k)}">
      <td><input type="checkbox" data-f="sel"${r.sel ? ' checked' : ''} aria-label="Incluir"></td>
      <td><input type="date" data-f="fecha" value="${esc(r.fecha)}" style="min-width:130px"></td>
      <td style="min-width:180px"><input type="text" data-f="desc" value="${esc(r.desc)}">${r.cuota ? `<div class="small muted">cuota ${esc(r.cuota)}</div>` : ''}${r.dup ? `<div class="small muted">Parecido a: ${esc(r.dup)}</div>` : ''}</td>
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
