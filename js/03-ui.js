'use strict';
/* ---------- escritura ---------- */
let toastT;
function toast(msg, act) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT);
  if (act) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tbtn'; b.textContent = act.l; b.onclick = () => { t.hidden = true; act.fn(); }; t.append(b); }
  toastT = setTimeout(() => { t.hidden = true; }, act ? 7000 : 3200);
}
async function w(fn, ok) {
  if (!S.db) { toast('Abre esta página en claude.ai con tu sesión iniciada para guardar.'); return false; }
  if (S.ro) { toast('Solo puedes ver: pide acceso de colaborador para guardar cambios.'); return false; }
  try { await fn(); if (ok) toast(ok); return true; }
  catch (e) {
    console.error(e);
    const c = e && e.code;
    if (c === 'invalid_argument') toast('No se pudo guardar este cambio. Si no tienes permiso de colaborador, pídelo.');
    else if (c === 'quota_exceeded') toast('Se llenó el espacio de datos. Borra movimientos antiguos para seguir.');
    else if (c === 'revoked') toast('Perdiste el acceso a esta página.');
    else toast('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
    return false;
  }
}
async function saveConfig(patch) {
  return w(async () => {
    const ref = S.db.doc('config/main');
    if (S.config) await ref.update(patch);
    else { const base = {...DEF_CFG, ...patch}; await ref.set(base); }
  });
}
const movDoc = (o) => ({creado: new Date().toISOString(), ...o, hash: `${o.fecha}|${o.monto}|${merchantKey(o.comercio || o.desc)}`});

/* ---------- modal ---------- */
let modalClose = null;
function openModal(title, html, mount) {
  const sh = $('#sheet');
  sh.innerHTML = `<div class="sheet-h"><h2 id="mtitle">${esc(title)}</h2><button class="x" type="button" data-act="cerrar" aria-label="Cerrar">×</button></div>${html}`;
  $('#modal').hidden = false;
  modalClose = null;
  if (mount) modalClose = mount(sh) || null;
  const f = sh.querySelector('input,select,textarea'); if (f && window.matchMedia('(min-width:600px)').matches) f.focus();
}
function closeModal() { $('#modal').hidden = true; $('#sheet').innerHTML = ''; if (typeof modalClose === 'function') modalClose(); modalClose = null; if (S.pendingRender) render(); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

const catOptions = (t, sel) => catsOf(t).map(c => `<option value="${esc(c.id)}"${c.id === sel ? ' selected' : ''}>${esc(c.n)}</option>`).join('');
const allCatOptions = sel => `<optgroup label="Gastos">${catOptions('gasto', sel)}</optgroup><optgroup label="Ingresos">${catOptions('ingreso', sel)}</optgroup>`;
const memberOptions = sel => members().map(id => `<option value="${esc(id)}"${id === sel ? ' selected' : ''}>${esc(nameOf(id))}</option>`).join('') || '<option value="">Tú</option>';
const cuentaOptions = sel => ['', ...cfg().cuentas].map(c => `<option value="${esc(c)}"${c === sel ? ' selected' : ''}>${esc(c || 'Sin cuenta')}</option>`).join('');
function bindMonto(el) {
  el.addEventListener('input', () => { const n = parseMonto(el.value); el.value = n ? fmtN(n) : ''; });
}

/* Movimiento: crear y editar */
function movForm(m) {
  const nuevo = !m;
  m = m || {tipo:'gasto', fecha:todayISO(), quien:yo(), comp:cfg().compDefault, cat:'', cuenta:''};
  const tipo = ['ingreso', 'transf', 'liq'].includes(m.tipo) ? m.tipo : 'gasto';
  openModal(nuevo ? 'Anotar movimiento' : 'Editar movimiento', `
    <form id="mf" class="fgrid" autocomplete="off">
      <div class="full"><div class="seg" role="group" aria-label="Tipo"${tipo === 'liq' ? ' hidden' : ''}>
        <button type="button" data-t="gasto" aria-pressed="${tipo === 'gasto'}">Gasto</button>
        <button type="button" data-t="ingreso" aria-pressed="${tipo === 'ingreso'}">Ingreso</button>
        <button type="button" data-t="transf" aria-pressed="${tipo === 'transf'}">Traspaso</button></div>${tipo === 'liq' ? '<p class="small muted">Pago entre ustedes para saldar gastos compartidos.</p>' : ''}</div>
      <label class="field"><span>Monto</span><input id="mf-monto" type="text" inputmode="numeric" placeholder="$0" value="${m.monto ? fmtN(m.monto) : ''}" required></label>
      <label class="field"><span>Fecha</span><input id="mf-fecha" type="date" value="${esc(m.fecha)}" required></label>
      <label class="field full"><span>Descripción</span><input id="mf-desc" type="text" placeholder="Ej: Jumbo, bencina, almuerzo" value="${esc(m.desc || '')}" required></label>
      <label class="field"><span>Categoría</span><select id="mf-cat">${catOptions(tipo, m.cat)}</select></label>
      <label class="field"><span>Cuenta o tarjeta</span><select id="mf-cuenta">${cuentaOptions(m.cuenta || '')}</select></label>
      <label class="field"><span>${tipo === 'ingreso' ? 'Recibido por' : 'Pagado por'}</span><select id="mf-quien">${memberOptions(m.quien)}</select></label>
      <label class="check" style="align-self:end;padding-bottom:8px"><input id="mf-comp" type="checkbox"${m.comp ? ' checked' : ''}> Gasto compartido</label>
      <label class="field full"><span>Nota (opcional)</span><input id="mf-nota" type="text" value="${esc(m.nota || '')}"></label>
      <label class="check full" id="mf-learn-w" hidden><input id="mf-learn" type="checkbox" checked> Recordar esta categoría para movimientos parecidos</label>
      <div class="full row">${nuevo ? '' : '<button type="button" class="btn danger" id="mf-del">Borrar</button>'}<span class="sp"></span><button type="button" class="btn" data-act="cerrar">Cancelar</button><button class="btn pri" type="submit">${nuevo ? 'Guardar' : 'Guardar cambios'}</button></div>
    </form>`, sh => {
    let t = tipo; let catTouched = !nuevo; const origCat = m.cat;
    const cat = $('#mf-cat', sh), desc = $('#mf-desc', sh);
    bindMonto($('#mf-monto', sh));
    $$('.seg button', sh).forEach(b => b.onclick = () => { t = b.dataset.t; $$('.seg button', sh).forEach(x => x.setAttribute('aria-pressed', x === b)); cat.innerHTML = catOptions(t, ''); catTouched = false; desc.dispatchEvent(new Event('input')); });
    if (nuevo && !m.cat) cat.value = t === 'gasto' ? 'otros' : 'sueldo';
    desc.addEventListener('input', () => { if (catTouched) return; const c = applyRules(desc.value); if (c && catObj(c) && (catObj(c).t || 'gasto') === t) cat.value = c; });
    cat.addEventListener('change', () => { catTouched = true; $('#mf-learn-w', sh).hidden = cat.value === origCat || merchantKey(desc.value).length < 3; });
    const del = $('#mf-del', sh);
    if (del) del.onclick = async () => {
      if (del.dataset.c !== '1') { del.dataset.c = '1'; del.textContent = 'Toca otra vez para borrar'; return; }
      if (await w(() => S.db.doc('movs/' + m.id).delete(), 'Movimiento borrado')) closeModal();
    };
    $('#mf', sh).onsubmit = async e => {
      e.preventDefault();
      const monto = parseMonto($('#mf-monto', sh).value);
      if (!monto) { toast('Escribe un monto mayor a cero.'); return; }
      const d = {fecha: $('#mf-fecha', sh).value || todayISO(), monto, tipo: t, desc: desc.value.trim() || catName(cat.value), cat: cat.value, cuenta: $('#mf-cuenta', sh).value, quien: $('#mf-quien', sh).value, comp: $('#mf-comp', sh).checked, nota: $('#mf-nota', sh).value.trim()};
      d.comercio = m.comercio || '';
      const learn = !$('#mf-learn-w', sh).hidden && $('#mf-learn', sh).checked;
      const ok = await w(async () => {
        if (nuevo) await S.db.collection('movs').doc(uid()).set(movDoc({...d, origen: 'manual'}));
        else { const {id, ...rest} = m; await S.db.doc('movs/' + m.id).set(movDoc({...rest, ...d})); }
      }, nuevo ? 'Movimiento guardado' : 'Cambios guardados');
      if (ok && learn) await learnRule(d.comercio || d.desc, d.cat);
      if (ok) closeModal();
    };
  });
}
async function learnRule(text, cat) {
  const k = merchantKey(text); if (k.length < 3) return;
  const reglas = cfg().reglas.filter(r => norm(r.p) !== k);
  reglas.unshift({p: k, c: cat});
  await saveConfig({reglas: reglas.slice(0, 400)});
}

