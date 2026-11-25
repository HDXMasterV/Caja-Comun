'use strict';
/* ---------- anotar rápido ---------- */
const NUMW = {un:1, uno:1, una:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9, diez:10, once:11, doce:12, trece:13, catorce:14, quince:15, dieciseis:16, diecisiete:17, dieciocho:18, diecinueve:19, veinte:20, veinticinco:25, treinta:30, cuarenta:40, cincuenta:50, sesenta:60, setenta:70, ochenta:80, noventa:90, cien:100, doscientos:200, trescientos:300, quinientos:500};
const QSTOP = new Set(['gaste','gastamos','pague','pagamos','compre','compramos','en','el','la','los','las','con','de','del','por','para','un','una','mil','lucas','luca','k','pesos','peso','clp','ayer','hoy','anteayer','antes','tarjeta','cuotas','cuota','y','a','al','mi','me','que','fue','es','lo','palo','palos','millon','millones','monto','importe','pagaron','depositaron','recibi','transfirieron','abono','ingreso']);
function medioMatch(t) {
  let best = null, bl = 0;
  for (const m of cfg().medios) {
    const words = norm(m.n + ' ' + (m.alias || '')).split(' ').filter(w => w.length > 2 && !['tarjeta', 'cuenta', 'del', 'los', 'banco'].includes(w));
    for (const w of words) if (new RegExp('\\b' + w + '\\b').test(t) && w.length > bl) { best = m; bl = w.length; }
  }
  return best;
}
function quickLocal(text) {
  const raw = ' ' + String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ';
  let monto = 0; const used = [];
  for (const m of raw.matchAll(/(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)\s*(mil|lucas?|k|palos?|millones?|millon)?(?![\d])/g)) {
    let v = parseFloat(m[1].replace(/\./g, '').replace(',', '.')); const u = m[2] || '';
    if (/^(mil|luca|lucas|k)$/.test(u)) v *= 1000; else if (u) v *= 1e6;
    if (new RegExp('\\b' + m[1].replace(/\./g, '\\.') + '\\s*cuotas').test(raw)) continue;
    if (v > monto) monto = Math.round(v); used.push(m[0]);
  }
  if (!monto) { const m = raw.match(/\b([a-z]+)\s+(mil|lucas?)\b/); if (m && NUMW[m[1]]) monto = NUMW[m[1]] * 1000; }
  const t = norm(raw);
  const cu = t.match(/\b(\d{1,2}) cuotas\b/);
  const fecha = /\b(anteayer|antes de ayer)\b/.test(t) ? addDays(todayISO(), -2) : /\bayer\b/.test(t) ? addDays(todayISO(), -1) : todayISO();
  const tipo = /\b(me pagaron|sueldo|recibi|me depositaron|me transfirieron|ingreso|abono)\b/.test(t) ? 'ingreso' : 'gasto';
  const medio = medioMatch(t);
  const mw = medio ? new Set(norm(medio.n + ' ' + (medio.alias || '')).split(' ')) : new Set();
  let rest = t; used.forEach(u => { rest = rest.replace(norm(u), ' '); });
  const desc = rest.split(' ').filter(w => w && !QSTOP.has(w) && !mw.has(w) && !/^\d+$/.test(w) && !NUMW[w]).join(' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 80);
  const cat = applyRules(desc) || null;
  return {monto, desc, cat, cuenta: medio ? medio.n : '', fecha, tipo, cuotas: cu ? +cu[1] : null};
}
async function quickClaude(text) {
  const c = cfg();
  const personas = members().map(id => `${id} = ${nameOf(id).replace(' (tú)', '')}${isMe(id) ? ' (quien escribe)' : ''}`).join('; ');
  const res = await S.sample.json(`Convierte esta nota de gasto, escrita o dictada en Chile, en movimientos de dinero. Hoy es ${todayISO()} (${new Date().toLocaleDateString('es-CL', {weekday:'long'})}).
Nota: """${String(text).slice(0, 800)}"""
Categorías (id = nombre): ${c.cats.map(x => `${x.id} = ${x.n}`).join('; ')}
Medios de pago (usa el nombre exacto): ${c.medios.map(m => `${m.n}${m.alias ? ' (dicen: ' + m.alias + ')' : ''}`).join('; ')}
Personas del hogar: ${personas || 'solo quien escribe'}
Preferencias de categoría (texto -> id): ${c.reglas.slice(0, 80).map(r => r.p + '->' + r.c).join(', ')}
En Chile "luca(s)" = mil pesos y "palo" = un millón. El texto puede venir sin tildes y con guiones en vez de espacios.
Responde SOLO un arreglo JSON, un elemento por compra:
[{"monto":12990,"descripcion":"Jumbo","categoria":"super","tipo":"gasto","medio":"nombre exacto o vacío","fecha":"AAAA-MM-DD","quien":"id o vacío","cuotas":null}]
tipo es "gasto" o "ingreso". Si no se entiende el monto, usa 0.`, {modelTier: 'quick'});
  const arr = Array.isArray(res) ? res : [];
  const valid = new Set(c.cats.map(x => x.id)), mnames = new Set(c.cuentas), mem = new Set(members());
  return arr.filter(x => x && typeof x === 'object').map(x => ({monto: parseMonto(x.monto), desc: String(x.descripcion || '').slice(0, 80), cat: valid.has(x.categoria) ? x.categoria : null, cuenta: mnames.has(x.medio) ? x.medio : '', fecha: parseDateAny(x.fecha) || todayISO(), tipo: x.tipo === 'ingreso' ? 'ingreso' : 'gasto', quien: mem.has(x.quien) ? x.quien : '', cuotas: Number(x.cuotas) > 1 ? Number(x.cuotas) : null}));
}
let sampleReady; const sampleWait = new Promise(r => { sampleReady = r; });
function quickAdd(initial) {
  const Q = {items: [], busy: false};
  const me = yo();
  const lastCard = lsGet('cc-medio') || '';
  const norm1 = it => {
    const tipo = it.tipo === 'ingreso' ? 'ingreso' : 'gasto';
    let cat = it.cat && catObj(it.cat) && (catObj(it.cat).t || 'gasto') === tipo ? it.cat : (applyRules(it.desc) || (tipo === 'ingreso' ? 'sueldo' : 'otros'));
    if (it.cuotas) cat = cat || 'otros';
    const cuenta = it.cuenta || (tipo === 'gasto' ? lastCard : '');
    const dueno = (medioByName(cuenta) || {}).usa;
    return {monto: it.monto || 0, desc: it.desc || '', cat, cuenta, fecha: it.fecha || todayISO(), tipo, quien: it.quien || (dueno && personaOf(dueno) ? dueno : me), comp: tipo === 'gasto' ? cfg().compDefault : false, cuotas: it.cuotas || null};
  };
  openModal('Anotar rápido', `
    <form id="qa-f" style="display:grid;gap:10px" autocomplete="off">
      <div class="row" style="flex-wrap:nowrap;gap:8px"><input id="qa-t" type="text" enterkeyhint="go" placeholder="Ej: 12 lucas jumbo con la cmr" value="${esc(initial || '')}" style="flex:1;font-size:1.05rem;padding:12px" aria-label="Qué gastaste">${S.dict ? '<button type="button" class="btn" id="qa-mic">Dictar</button>' : ''}<button class="btn pri" type="submit">Listo</button></div>
      <p class="hint">Escribe como hablas: "15 mil uber ayer", "farmacia 8.990 débito", "me pagaron 1.450.000". En el iPhone puedes usar el micrófono del teclado.</p>
      <div class="row"><label class="btn sm" for="qa-foto">Foto de boleta</label><input id="qa-foto" type="file" accept="image/*" hidden><button type="button" class="btn sm ghost" id="qa-full">Formulario completo</button></div>
    </form>
    <div id="qa-prev" style="display:grid;gap:10px"></div>`, sh => {
    const inp = $('#qa-t', sh), prev = $('#qa-prev', sh);
    const draw = () => {
      if (Q.busy) { prev.innerHTML = `<div class="status"><span class="spin"></span>${esc(Q.busy)}</div>`; return; }
      if (!Q.items.length) { prev.innerHTML = ''; return; }
      prev.innerHTML = Q.items.map((it, i) => `<div class="qa-item" data-i="${i}">
        <div class="row" style="flex-wrap:nowrap;gap:8px"><input data-q="monto" type="text" inputmode="numeric" value="${it.monto ? fmtN(it.monto) : ''}" placeholder="$0" style="width:120px;font-weight:700;font-size:1.05rem" aria-label="Monto"><input data-q="desc" type="text" value="${esc(it.desc)}" placeholder="Descripción" style="flex:1" aria-label="Descripción">${Q.items.length > 1 ? `<button type="button" class="x" data-q="del" aria-label="Quitar">×</button>` : ''}</div>
        <div class="qa-grid">
          <select data-q="cat" aria-label="Categoría">${catOptions(it.tipo, it.cat)}</select>
          <select data-q="cuenta" aria-label="Medio de pago">${cuentaOptions(it.cuenta)}</select>
          <input data-q="fecha" type="date" value="${esc(it.fecha)}" aria-label="Fecha">
          <select data-q="quien" aria-label="Quién">${memberOptions(it.quien)}</select>
        </div>
        <div class="row small">${it.tipo === 'gasto' ? `<label class="check"><input data-q="comp" type="checkbox"${it.comp ? ' checked' : ''}> Compartido</label>` : '<span class="chip acc">Ingreso</span>'}${it.cuotas ? `<span class="chip">en ${it.cuotas} cuotas · se registra como deuda</span>` : ''}${medioByName(it.cuenta) && medioByName(it.cuenta).adicional ? `<span class="chip">adicional de ${esc(medioByName(it.cuenta).titular || 'la titular')}</span>` : ''}</div>
      </div>`).join('') + `<div class="row"><span class="small muted">${Q.items.length > 1 ? Q.items.length + ' movimientos' : 'Revisa y guarda'}</span><span class="sp"></span><button type="button" class="btn pri" id="qa-save">Guardar${Q.items.length > 1 ? ' ' + Q.items.length : ''}</button></div>`;
      $('#qa-save', sh).onclick = save;
    };
    prev.addEventListener('input', e => { const t = e.target, box = t.closest('.qa-item'); if (!box) return; const it = Q.items[+box.dataset.i]; if (!it) return; if (t.dataset.q === 'monto') { it.monto = parseMonto(t.value); t.value = it.monto ? fmtN(it.monto) : ''; } else if (t.dataset.q === 'desc') it.desc = t.value; });
    prev.addEventListener('change', e => { const t = e.target, box = t.closest('.qa-item'); if (!box) return; const it = Q.items[+box.dataset.i]; if (!it) return; const q = t.dataset.q; if (q === 'comp') it.comp = t.checked; else if (q === 'cat') { it.cat = t.value; it.catUser = true; } else if (q && q !== 'monto' && q !== 'desc') it[q] = t.value; });
    prev.addEventListener('click', e => { const b = e.target.closest('[data-q="del"]'); if (b) { Q.items.splice(+b.closest('.qa-item').dataset.i, 1); draw(); } });
    const interpret = async () => {
      const text = inp.value.trim(); if (!text) return;
      const loc = quickLocal(text);
      const multi = (text.match(/\d+/g) || []).length > 2 || /\b(y|mas|además)\b.*\d/.test(norm(text));
      const sure = loc.monto > 0 && loc.desc && loc.cat && !multi;
      Q.items = [norm1(loc)]; draw();
      if (sure) { $('#qa-save', sh) && $('#qa-save', sh).focus(); return; }
      if (!S.sample) await Promise.race([sampleWait, new Promise(r => setTimeout(r, 3000))]);
      if (!S.sample) { draw(); return; }
      Q.busy = 'Claude está interpretando…'; draw();
      try { const items = await quickClaude(text); if (items.length && items.some(i => i.monto)) Q.items = items.map(norm1); }
      catch (e) { if (e && e.code !== 'not_granted') toast(aiErr(e)); }
      Q.busy = false; draw();
    };
    $('#qa-f', sh).onsubmit = e => { e.preventDefault(); interpret(); };
    $('#qa-full', sh).onclick = () => { closeModal(); movForm(null); };
    $('#qa-foto', sh).onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      if (!S.sample || !(S.limits && S.limits.images)) { toast('Para leer fotos hay que permitir que la página use Claude.'); return; }
      Q.busy = 'Claude está leyendo la boleta…'; draw();
      try { const rows = await claudeExtract('', [f]); Q.items = rows.map(x => norm1({monto: parseMonto(x.monto), desc: String(x.comercio || x.descripcion || ''), cat: x.categoria, fecha: parseDateAny(x.fecha) || todayISO(), tipo: x.tipo === 'ingreso' ? 'ingreso' : 'gasto'})).filter(i => i.monto); if (!Q.items.length) toast('No encontré un monto en la foto.'); }
      catch (err) { toast(aiErr(err)); }
      Q.busy = false; draw();
    };
    const mic = $('#qa-mic', sh);
    if (mic) mic.onclick = () => {
      if (S.dictOn) { S.dict.stop().catch(() => {}); return; }
      S.dict.start().catch(err => { if (err && err.code === 'not_granted') { mic.hidden = true; } });
    };
    async function save() {
      const items = Q.items.filter(i => i.monto > 0);
      if (!items.length) { toast('Falta el monto.'); return; }
      const ids = [];
      const ok = await w(async () => {
        for (const it of items) {
          if (it.cuotas && it.tipo === 'gasto') {
            const did = 'm' + uid(), cuota = Math.round(it.monto / it.cuotas);
            await S.db.doc('deudas/' + did).set({tipo:'cuotas', nombre: it.desc || 'Compra en cuotas', cuota, total: it.cuotas, primera: ymOf(it.fecha), dia: Number(it.fecha.slice(8)), tasa: 0, cuenta: it.cuenta, quien: it.quien, comp: !!it.comp});
            const id = `pago-d-${did}-${ymOf(it.fecha)}`; ids.push('movs/' + id, 'deudas/' + did);
            await S.db.doc('movs/' + id).set(movDoc({fecha: it.fecha, monto: cuota, tipo:'gasto', desc: `${it.desc || 'Compra'} · cuota 1 de ${it.cuotas}`, comercio: it.desc, cat: it.cat, cuenta: it.cuenta, quien: it.quien, comp: !!it.comp, origen:'rapido', cuota:`1/${it.cuotas}`, ref:`d:${did}:${ymOf(it.fecha)}`}));
            continue;
          }
          const id = uid(); ids.push('movs/' + id);
          await S.db.doc('movs/' + id).set(movDoc({fecha: it.fecha, monto: it.monto, tipo: it.tipo, desc: it.desc || catName(it.cat), comercio: it.desc, cat: it.cat, cuenta: it.cuenta, quien: it.quien, comp: it.tipo === 'gasto' && !!it.comp, origen:'rapido'}));
        }
      });
      if (!ok) return;
      const lc = items.find(i => i.tipo === 'gasto' && i.cuenta); if (lc) lsSet('cc-medio', lc.cuenta);
      for (const it of items.filter(i => i.catUser)) await learnRule(it.desc, it.cat);
      closeModal();
      toast(items.length > 1 ? `${items.length} movimientos guardados` : `Guardado: ${fmt(items[0].monto)} ${items[0].desc}`, {l:'Deshacer', fn: async () => { await w(async () => { for (const p of ids) await S.db.doc(p).delete(); }, 'Deshecho'); }});
    }
    if (initial) interpret(); else setTimeout(() => inp.focus(), 60);
  });
}

