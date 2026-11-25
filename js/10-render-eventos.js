'use strict';
/* ---------- render ---------- */
let rq = false;
function scheduleRender() { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; render(); }); }
function render() {
  const ae = document.activeElement;
  const v = $('#view');
  if (!$('#modal').hidden || (ae && v.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && !ae.dataset.live)) { S.pendingRender = true; return; }
  S.pendingRender = false; S._st = {};
  const keep = ae && v.contains(ae) && ae.id ? {id: ae.id, s: ae.selectionStart, e: ae.selectionEnd} : null;
  const chatScroll = $('#chat') ? $('#chat').scrollTop : null;
  $('#tabs').innerHTML = VIEWS.map(([k, l]) => `<a href="#${k}"${k === S.view ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  $('#mlabel').textContent = ymLabel(S.ym);
  $('#who').textContent = whoText();
  $('#monthbox').style.visibility = MONTH_VIEWS.has(S.view) ? 'visible' : 'hidden';
  const fn = {inicio:vInicio, movimientos:vMovimientos, tarjetas:vTarjetas, importar:vImportar, presupuesto:vPresupuesto, fijos:vFijos, deudas:vDeudas, metas:vMetas, 'entre-nosotros':vEntre, asesor:vAsesor, ajustes:vAjustes}[S.view] || vInicio;
  const banners = statusBanner() + (S.view !== 'importar' && S.view !== 'asesor' ? exampleBanner() : '');
  v.innerHTML = banners + fn();
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (e) {} } }
  const ch = $('#chat'); if (ch) ch.scrollTop = S.chatStick || chatScroll == null ? ch.scrollHeight : chatScroll;
  mountView();
  refreshNames();
}
function mountView() {
  if (S.view === 'importar') {
    const drop = $('#drop'), file = $('#imp-file');
    if (file) file.onchange = () => { handleFiles(file.files); file.value = ''; };
    if (drop) {
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); handleFiles(e.dataTransfer.files); };
    }
  }
  const cf = $('#chat-f');
  if (cf) {
    cf.onsubmit = e => { e.preventDefault(); const t = $('#chat-in').value.trim(); if (t) sendChat(t); };
    $('#chat-in').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); cf.requestSubmit(); } };
  }
  const cuf = $('#cu-f');
  if (cuf) cuf.onsubmit = async e => { e.preventDefault(); const n = $('#cu-n').value.trim(); if (!n) return; if (cfg().cuentas.includes(n)) return; $('#cu-n').value = ''; await saveConfig({cuentas: [...cfg().cuentas, n]}); };
}
function route() {
  let h = location.hash.replace('#', '');
  try { h = decodeURIComponent(h); } catch (e) {}
  if (h === 'anotar' || /^g-/.test(h)) {
    const txt = h === 'anotar' ? '' : h.slice(2).replace(/-+/g, ' ').trim();
    try { history.replaceState(null, '', '#inicio'); } catch (e) {}
    S.view = 'inicio'; render();
    setTimeout(() => quickAdd(txt), 60);
    return;
  }
  S.view = VIEWS.some(([k]) => k === h) ? h : 'inicio';
  window.scrollTo(0, 0);
  render();
}
window.addEventListener('hashchange', route);
document.addEventListener('focusout', () => setTimeout(() => { if (S.pendingRender && $('#modal').hidden) render(); }, 0));

/* ---------- eventos ---------- */
const ACT = {
  mes: el => { S.ym = addMonths(S.ym, Number(el.dataset.d)); S.analisis = ''; render(); },
  nuevo: () => quickAdd(''),
  cerrar: () => closeModal(),
  editar: el => { const m = S.movs.find(x => x.id === el.dataset.v); if (m) movForm(m); },
  pagar: el => marcarPagado(el.dataset.v),
  okdup: async el => { await saveConfig({okDup: [...cfg().okDup, el.dataset.v].slice(-200)}); },
  'sus-add': el => { const x = detectSus().find(s => s.k === el.dataset.v); if (x) recForm(null, 'gasto'), setTimeout(() => { $('#rf-n').value = x.nombre; $('#rf-m').value = fmtN(x.monto); $('#rf-d').value = x.dia; $('#rf-c').value = catObj(x.cat) ? x.cat : 'suscripciones'; $('#rf-s').checked = true; $('#rf-a').checked = false; }, 0); },
  'cuota-add': el => { const x = detectCuotas().find(c => c.mov.id === el.dataset.v); if (x) deudaForm({tipo:'cuotas', nombre: x.nombre, cuota: x.cuota, total: x.total, primera: x.primera, dia: Number(x.mov.fecha.slice(8)), cuenta: x.mov.cuenta || '', quien: x.mov.quien, comp: !!x.mov.comp}); },
  'borrar-ej': async el => {
    if (el.dataset.c !== '1') { el.dataset.c = '1'; el.textContent = 'Toca otra vez para confirmar'; return; }
    const docs = [...S.movs.filter(m => m.ej).map(m => 'movs/' + m.id), ...S.recs.filter(m => m.ej).map(m => 'recs/' + m.id), ...S.deudas.filter(m => m.ej).map(m => 'deudas/' + m.id), ...S.metas.filter(m => m.ej).map(m => 'metas/' + m.id)];
    await w(async () => { for (let i = 0; i < docs.length; i += 8) await Promise.all(docs.slice(i, i + 8).map(p => S.db.doc(p).delete())); }, 'Datos de ejemplo borrados');
  },
  analizar: () => analizarMes(),
  pegar: () => openModal('Pegar movimientos', `<p class="small muted">Copia los movimientos desde tu banco en línea (selecciona la tabla y copia) y pégalos aquí.</p><textarea id="pg-t" rows="10" placeholder="Fecha  Descripción  Cargo  Abono…"></textarea><div class="row"><span class="sp"></span><button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn pri" type="button" id="pg-ok">Leer movimientos</button></div>`, sh => { $('#pg-ok', sh).onclick = () => { const t = $('#pg-t', sh).value.trim(); if (!t) return; closeModal(); processTexts([{name:'texto pegado', text:t, aoa: parseDelimited(t)}], []); }; }),
  soy: el => { setYo(el.dataset.v); toast(`Este dispositivo queda como ${nameOf(el.dataset.v).replace(' (tú)', '')}`); render(); },
  'persona-add': async () => { const n = ($('#pn-new') || {}).value; if (!n || !n.trim()) { toast('Escribe un nombre.'); return; } const id = 'p' + uid(); await saveConfig({personas: [...personas(), {id, n: n.trim()}]}); },
  'imp-limpiar': () => { S.imp.rows = []; S.imp.status = ''; S.imp.note = ''; S.imp.cierre = ''; render(); },
  'imp-guardar': () => saveImport(),
  'pres-prom': async () => { const cats = cfg().cats.map(c => { if (c.t === 'ingreso' || c.id === 'ahorro') return c; const av = avgCat(c.id); return av > 0 ? {...c, p: Math.round(av / 1000) * 1000} : c; });await saveConfig({cats}); toast('Presupuesto actualizado con el promedio'); },
  'pres-ia': () => proponerPresupuesto(),
  'pres-desc': () => { S.presSug = null; render(); },
  'pres-apl': async () => { const m = S.presSug.m; const cats = cfg().cats.map(c => m[c.id] != null && c.t !== 'ingreso' ? {...c, p: Math.max(0, Math.round(Number(m[c.id]) || 0))} : c); if (await saveConfig({cats})) { S.presSug = null; toast('Presupuesto aplicado'); } },
  'rec-new': el => recForm(null, el.dataset.v),
  'rec-edit': el => { const r = S.recs.find(x => x.id === el.dataset.v); if (r) recForm(r); },
  'deuda-new': () => deudaForm(null),
  'deuda-edit': el => { const d = S.deudas.find(x => x.id === el.dataset.v); if (d) deudaForm(d); },
  simular: el => { const d = S.deudas.find(x => x.id === el.dataset.v); if (d) simular(d); },
  'meta-new': () => metaForm(null),
  'meta-emerg': el => metaForm({nombre:'Fondo de emergencia', objetivo: Math.round(Number(el.dataset.v) / 10000) * 10000}),
  'meta-edit': el => { const m = S.metas.find(x => x.id === el.dataset.v); if (m) metaForm(m); },
  aporte: el => { const m = S.metas.find(x => x.id === el.dataset.v); if (m) aporteForm(m); },
  liq: el => { const [de, a] = el.dataset.v.split('|'); liqForm(de, a); },
  'chat-q': el => sendChat(el.dataset.v),
  'chat-stop': () => { if (S.chatCtl) S.chatCtl.abort(); },
  'chat-reset': () => { S.chat = []; render(); },
  'cat-new': () => openModal('Nueva categoría', `<form id="cn-f" class="fgrid"><label class="field full"><span>Nombre</span><input id="cn-n" type="text" required></label><label class="field"><span>Tipo</span><select id="cn-t"><option value="gasto">Gasto</option><option value="ingreso">Ingreso</option></select></label><label class="field"><span>Grupo</span><select id="cn-g"><option value="necesidad">Necesidad</option><option value="deseo">Gusto</option><option value="ahorro">Ahorro</option></select></label><div class="full row"><span class="sp"></span><button class="btn pri" type="submit">Agregar</button></div></form>`, sh => { $('#cn-f', sh).onsubmit = async e => { e.preventDefault(); const n = $('#cn-n', sh).value.trim(); if (!n) return; const id = 'c' + uid(); const t = $('#cn-t', sh).value; const cats = [...cfg().cats]; const nc = {id, n, t, ...(t === 'gasto' ? {g: $('#cn-g', sh).value, p: 0} : {})}; const idx = t === 'gasto' ? cats.findIndex(c => c.id === 'otros') : cats.length; cats.splice(idx < 0 ? cats.length : idx, 0, nc); if (await saveConfig({cats})) closeModal(); }; }),
  'cat-del': async el => { if (el.dataset.c !== '1') { el.dataset.c = '1'; el.textContent = '¿Seguro?'; return; } await saveConfig({cats: cfg().cats.filter(c => c.id !== el.dataset.v)}); toast('Categoría quitada. Sus movimientos quedan como "Sin categoría".'); },
  'cuenta-del': async el => { await saveConfig({cuentas: cfg().cuentas.filter(c => c !== el.dataset.v)}); },
  'regla-del': async el => { const r = [...cfg().reglas]; r.splice(Number(el.dataset.v), 1); await saveConfig({reglas: r}); },
  exportar: () => exportCSV(),
  'medio-new': () => medioForm(null),
  'medio-edit': el => { const c = cfg().medios.find(m => m.id === el.dataset.v); if (c) medioForm(c); },
  'card-pay': el => { const c = cfg().medios.find(m => m.id === el.dataset.v); if (c) cardPayForm(c); },
  cuadrar: el => { const c = cfg().medios.find(m => m.id === el.dataset.v); if (!c) return; S.imp.cuenta = c.n; S.imp.cuadra = true; location.hash = 'importar'; toast(`Sube el estado de cuenta o cartola de ${c.n}`); },
  'ver-medio': el => { S.f = {q:'', cat:'', quien:'', tipo:'', cuenta: el.dataset.v}; location.hash = 'movimientos'; },
  copiar: async el => { const t = el.dataset.v; try { await navigator.clipboard.writeText(t); toast('Copiado'); } catch (e) { const i = el.parentElement.querySelector('input'); if (i) { i.focus(); i.select(); } toast('Selecciona el texto y cópialo'); } },
  'qa-open': () => quickAdd(''),
  'qa-sueldo': el => quickAdd('me pagaron el sueldo ', {prefill: true, quien: el.dataset.v}),
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  e.preventDefault(); fn(el, e);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'f-q') { S.f.q = t.value; render(); }
  if (t.id === 'chat-in') S.chatDraft = t.value;
  if (t.dataset.pres !== undefined || t.id === 'p-ing' || t.id === 'p-aho') { const n = parseMonto(t.value); t.value = n ? fmtN(n) : ''; }
  const tr = t.closest && t.closest('tr[data-k]');
  if (tr && t.dataset.f === 'monto') { const n = parseMonto(t.value); t.value = n ? fmtN(n) : ''; }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'f-cat') { S.f.cat = t.value; t.blur(); render(); return; }
  if (t.id === 'f-quien') { S.f.quien = t.value; t.blur(); render(); return; }
  if (t.id === 'f-tipo') { S.f.tipo = t.value; t.blur(); render(); return; }
  if (t.id === 'f-cuenta') { S.f.cuenta = t.value; t.blur(); render(); return; }
  if (t.id === 'imp-cuenta') { S.imp.cuenta = t.value; const du = (medioByName(t.value) || {}).usa; if (du && personaOf(du)) S.imp.quien = du; fixCuotaDates(); recheckDups(); S.imp.rows.sort((a, b) => b.fecha.localeCompare(a.fecha)); t.blur(); render(); return; }
  if (t.id === 'imp-quien') { S.imp.quien = t.value; return; }
  if (t.id === 'imp-comp') { S.imp.comp = t.checked; return; }
  if (t.id === 'imp-all') { S.imp.rows.forEach(r => r.sel = t.checked); t.blur(); render(); return; }
  const tr = t.closest && t.closest('tr[data-k]');
  if (tr) {
    const r = S.imp.rows.find(x => x.k === tr.dataset.k); if (!r) return;
    const f = t.dataset.f;
    if (f === 'sel') r.sel = t.checked;
    else if (f === 'monto') r.monto = parseMonto(t.value);
    else if (f === 'cat') { r.cat = t.value; r.catUser = true; const c = catObj(t.value); if (c && c.t === 'ingreso') r.tipo = 'ingreso'; }
    else r[f] = t.value;
    const sel = S.imp.rows.filter(x => x.sel);
    const tot = $('#imp-tot'); if (tot) tot.textContent = `${sel.length} de ${S.imp.rows.length} seleccionados · ${fmt(sum(sel.filter(x => x.tipo === 'gasto').map(x => x.monto)))} en gastos`;
    const btn = $('[data-act="imp-guardar"]'); if (btn) { btn.textContent = `Guardar ${sel.length} movimientos`; btn.disabled = !sel.length; }
    return;
  }
  if (t.dataset.pres !== undefined) { const id = t.dataset.pres, n = parseMonto(t.value); const cats = cfg().cats.map(c => c.id === id ? {...c, p: n} : c); await saveConfig({cats}); return; }
  if (t.id === 'p-ing') { await saveConfig({ingresoMensual: parseMonto(t.value)}); return; }
  if (t.id === 'p-aho') { await saveConfig({ahorroMensual: parseMonto(t.value)}); return; }
  if (t.dataset.rep !== undefined) { const rep = {...cfg().reparto}; members().forEach(id => { const el = document.querySelector(`[data-rep="${CSS.escape(id)}"]`); if (el) rep[id] = Math.max(0, Number(el.value) || 0); }); await saveConfig({reparto: rep}); return; }
  if (t.dataset.catn !== undefined) { const v = t.value.trim(); if (!v) return; await saveConfig({cats: cfg().cats.map(c => c.id === t.dataset.catn ? {...c, n: v} : c)}); return; }
  if (t.dataset.catg !== undefined) { await saveConfig({cats: cfg().cats.map(c => c.id === t.dataset.catg ? {...c, g: t.value} : c)}); return; }
  if (t.id === 'pf-comp') { await saveConfig({compDefault: t.checked}); return; }
  if (t.dataset.pn !== undefined) { const v = t.value.trim(); if (!v) return; await saveConfig({personas: personas().map(p => p.id === t.dataset.pn ? {...p, n: v} : p)}); return; }
  if (t.id === 'dev-yo') { setYo(t.value); t.blur(); render(); return; }
  if (t.id === 'alias-me') { if (!S.me || !S.me.id) return; await saveConfig({alias: {...(cfg().alias || {}), [S.me.id]: t.value}}); return; }
});

/* ---------- pagos ---------- */
async function marcarPagado(key) {
  const [kind, id, ym] = key.split(':');
  const p = pendientes(ym).find(x => x.key === key); if (!p || p.paid) return;
  const today = todayISO();
  const fecha = ym === curYM() && p.fecha > today ? today : p.fecha;
  const src = p.src;
  await w(() => S.db.doc(`movs/pago-${kind}-${id}-${ym}`).set(movDoc({fecha, monto: p.monto, tipo:'gasto', desc: p.nombre, comercio: src.nombre, cat: p.cat || 'otros', cuenta: src.cuenta || '', quien: src.quien || yo(), comp: src.comp != null ? !!src.comp : cfg().compDefault, origen:'pago', ref: key, ...(src.ej ? {ej:true} : {})})), 'Pago registrado');
}
async function autoRecs() {
  if (S.autoDone || S.ro || !S.db || !(S.ready.movs && S.ready.recs)) return;
  S.autoDone = true;
  const cur = curYM(), today = todayISO();
  for (const ym of [addMonths(cur, -1), cur]) for (const r of S.recs) {
    if (!r.auto || !recOccurs(r, ym)) continue;
    const dia = Math.min(Number(r.dia) || 1, daysInMonth(ym)); const fecha = `${ym}-${pad(dia)}`;
    if (fecha > today) continue;
    const key = `r:${r.id}:${ym}`; if (S.refs.has(key) || recPagadoPorMov(r, ym)) continue;
    try {
      await S.db.doc(`movs/pago-r-${r.id}-${ym}`).set(movDoc({fecha, monto: r.monto, tipo: r.tipo, desc: r.nombre, comercio: r.nombre, cat: r.cat, cuenta: r.cuenta || '', quien: r.quien || '', comp: r.tipo === 'gasto' && !!r.comp, origen:'recurrente', ref: key, ...(r.ej ? {ej:true} : {})}));
    } catch (e) { if (e && e.code === 'invalid_argument') { S.ro = true; scheduleRender(); return; } }
  }
}
function liqForm(de, a) {
  const b = balances();
  openModal('Pago entre ustedes', `<form id="lf" class="fgrid"><label class="field"><span>Paga</span><select id="lf-de">${memberOptions(de)}</select></label><label class="field"><span>Recibe</span><select id="lf-a">${memberOptions(a)}</select></label><label class="field full"><span>Monto</span><input id="lf-m" type="text" inputmode="numeric" value="${fmtN(Math.min(-(b.net[de] || 0), b.net[a] || 0))}"></label><div class="full row"><span class="sp"></span><button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn pri" type="submit">Registrar</button></div></form>`, sh => {
    bindMonto($('#lf-m', sh));
    $('#lf', sh).onsubmit = async e => {
      e.preventDefault(); const monto = parseMonto($('#lf-m', sh).value); const d1 = $('#lf-de', sh).value, a1 = $('#lf-a', sh).value;
      if (!monto || d1 === a1) { toast('Revisa el monto y las personas.'); return; }
      if (await w(() => S.db.collection('movs').doc(uid()).set(movDoc({fecha: todayISO(), monto, tipo:'liq', de: d1, a: a1, quien: d1, desc:`Pago de ${nameOf(d1).replace(' (tú)', '')} a ${nameOf(a1).replace(' (tú)', '')}`, cat:'', comp:false, origen:'manual'})), 'Pago registrado')) closeModal();
    };
  });
}

