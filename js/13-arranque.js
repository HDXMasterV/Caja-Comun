'use strict';
/* ---------- conexión ---------- */
const docsOf = snap => snap.docs.map(d => ({id: d.id, ...d.data()}));
const raw = {movs: [], recs: [], deudas: []};
// Aplica config.alias (cuentas de Claude antiguas -> persona del hogar) sobre los datos recibidos.
function remap() { S.movs = conAlias(raw.movs); S.recs = conAlias(raw.recs); S.deudas = conAlias(raw.deudas); }
async function boot() {
  S.yo = lsGet('cc-yo');
  route();
  const c = window.claude;
  if (!c || typeof c.use !== 'function') { S.noDb = true; Object.keys(S.ready).forEach(k => S.ready[k] = true); render(); return; }
  c.use('user').then(async u => {
    S.user = u; if (!u) return;
    S.me = await u.me();
    const can = await u.can('data.write'); if (can === false) S.ro = true;
    joinHousehold(); render();
  });
  c.use('sample').then(async s => { S.sample = s; if (s) { try { S.limits = await s.limits(); } catch (e) { S.limits = null; } } sampleReady(); render(); });
  c.use('dictation').then(d => {
    S.dict = d; if (!d) return;
    try {
      d.onFinal(({text}) => { const el = $('#qa-t'); if (el && text) el.value = (el.value + ' ' + text).trim(); });
      d.onState(({state}) => { S.dictOn = state === 'listening'; const b = $('#qa-mic'); if (b) b.textContent = S.dictOn ? 'Detener' : 'Dictar'; if (!S.dictOn) { const f = $('#qa-f'); const el = $('#qa-t'); if (f && el && el.value.trim()) f.requestSubmit(); } });
    } catch (e) { S.dict = null; }
  });
  c.use('downloads').then(d => { S.downloads = d; if (S.view === 'ajustes') render(); });
  const db = await c.use('db');
  if (!db) { S.noDb = true; Object.keys(S.ready).forEach(k => S.ready[k] = true); render(); return; }
  S.db = db;
  const slowT = setTimeout(() => { S.slow = true; render(); }, 10000);
  const onErr = e => { console.error(e); if (e && e.code === 'unavailable') toast('Se perdió la conexión con los datos. Recarga la página.'); };
  const done = k => { S.ready[k] = true; if (Object.values(S.ready).every(Boolean)) { clearTimeout(slowT); S.slow = false; } };
  db.doc('config/main').onSnapshot(snap => { S.config = snap.exists ? snap.data() : null; remap(); if (!snap.metadata.fromCache) done('cfg'); joinHousehold(); scheduleRender(); }, onErr);
  db.collection('movs').where('fecha', '>=', addMonths(curYM(), -12) + '-01').onSnapshot(snap => {
    raw.movs = docsOf(snap).filter(m => m.fecha && Number.isFinite(m.monto)).sort((a, b) => b.fecha.localeCompare(a.fecha) || String(b.creado || '').localeCompare(String(a.creado || '')));
    remap();
    S.refs = new Set(S.movs.map(m => m.ref).filter(Boolean));
    if (!snap.metadata.fromCache) { done('movs'); autoRecs(); }
    scheduleRender();
  }, onErr);
  for (const k of ['recs', 'deudas', 'metas']) db.collection(k).onSnapshot(snap => { const lista = docsOf(snap).sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''))); if (k === 'metas') S.metas = lista; else { raw[k] = lista; remap(); } if (!snap.metadata.fromCache) { done(k); if (k === 'recs') autoRecs(); } scheduleRender(); }, onErr);
}
async function joinHousehold() {
  if (S.joined || S.ro || !S.db || !S.me || !S.me.id || !S.ready.cfg) return;
  S.joined = true;
  const mem = cfg().miembros;
  if (mem.includes(S.me.id)) return;
  try {
    if (S.config) await S.db.doc('config/main').update({miembros: [...mem, S.me.id]});
    else await S.db.doc('config/main').set({...DEF_CFG, miembros: [S.me.id]});
  } catch (e) { if (e && e.code === 'invalid_argument') { S.ro = true; scheduleRender(); } }
}
boot();
