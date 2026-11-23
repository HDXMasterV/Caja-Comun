'use strict';
/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CLP = new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP', maximumFractionDigits:0});
const fmt = n => CLP.format(Math.round(n || 0));
const NUM = new Intl.NumberFormat('es-CL', {maximumFractionDigits:0});
const fmtN = n => NUM.format(Math.round(n || 0));
const fmtShort = n => { const a = Math.abs(n); if (a >= 1e6) return '$' + (n/1e6).toLocaleString('es-CL',{maximumFractionDigits:1}) + ' M'; if (a >= 1e3) return '$' + Math.round(n/1e3) + ' mil'; return fmt(n); };
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const curYM = () => todayISO().slice(0, 7);
const ymOf = iso => String(iso || '').slice(0, 7);
const addMonths = (ym, k) => { let [y, m] = ym.split('-').map(Number); m += k; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return `${y}-${pad(m)}`; };
const monthsDiff = (a, b) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };
const daysInMonth = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const addDays = (iso, k) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + k); return isoOf(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000);
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const ymLabel = ym => { const [y, m] = ym.split('-').map(Number); return `${MESES[m-1]} ${y}`; };
const ymShort = ym => { const [y, m] = ym.split('-').map(Number); return MESES[m-1].slice(0, 3); };
const dayLabel = iso => new Date(iso + 'T12:00').toLocaleDateString('es-CL', {weekday:'long', day:'numeric', month:'long'});
const dShort = iso => new Date(iso + 'T12:00').toLocaleDateString('es-CL', {day:'numeric', month:'short'});
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const median = arr => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h-1] + s[h]) / 2; };
const sum = arr => arr.reduce((a, b) => a + (b || 0), 0);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['compra','compras','pago','pagos','pat','pac','cuota','cuotas','nac','int','internacional','nacional','web','pos','tef','transferencia','transf','cargo','abono','en','de','del','la','el','los','las','cl','chile','spa','ltda','sa','www','com','rut','cta','cte','cuenta','tarjeta','credito','debito','redcompra','oneclick','webpay','mercadopago','mp','sumup','klap','getnet','transbank','tbk']);
const merchantKey = s => norm(s).split(' ').filter(w => w.length > 1 && !STOP.has(w) && !/\d/.test(w)).slice(0, 2).join(' ');
const parseMonto = v => {
  if (typeof v === 'number') return Math.round(Math.abs(v));
  let s = String(v ?? '').trim();
  s = s.replace(/,\d{1,2}$/, '');
  const n = Number(s.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const initials = n => (String(n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase();

/* ---------- valores por defecto ---------- */
const DEF_CATS = [
  {id:'super', n:'Supermercado', t:'gasto', g:'necesidad', p:0},
  {id:'vivienda', n:'Arriendo o dividendo', t:'gasto', g:'necesidad', p:0},
  {id:'basicos', n:'Luz, agua y gas', t:'gasto', g:'necesidad', p:0},
  {id:'telecom', n:'Internet y celular', t:'gasto', g:'necesidad', p:0},
  {id:'transporte', n:'Transporte y bencina', t:'gasto', g:'necesidad', p:0},
  {id:'salud', n:'Salud y farmacia', t:'gasto', g:'necesidad', p:0},
  {id:'educacion', n:'Educación', t:'gasto', g:'necesidad', p:0},
  {id:'deudas', n:'Cuotas y créditos', t:'gasto', g:'necesidad', p:0},
  {id:'mascotas', n:'Mascotas', t:'gasto', g:'necesidad', p:0},
  {id:'comisiones', n:'Comisiones e intereses', t:'gasto', g:'necesidad', p:0},
  {id:'comida', n:'Restaurantes y delivery', t:'gasto', g:'deseo', p:0},
  {id:'suscripciones', n:'Suscripciones', t:'gasto', g:'deseo', p:0},
  {id:'hogar', n:'Hogar', t:'gasto', g:'deseo', p:0},
  {id:'ropa', n:'Ropa y cuidado personal', t:'gasto', g:'deseo', p:0},
  {id:'entretencion', n:'Entretención y viajes', t:'gasto', g:'deseo', p:0},
  {id:'regalos', n:'Regalos', t:'gasto', g:'deseo', p:0},
  {id:'otros', n:'Otros gastos', t:'gasto', g:'deseo', p:0},
  {id:'ahorro', n:'Ahorro', t:'gasto', g:'ahorro', p:0},
  {id:'sueldo', n:'Sueldo', t:'ingreso'},
  {id:'honorarios', n:'Honorarios', t:'ingreso'},
  {id:'otros_ing', n:'Otros ingresos', t:'ingreso'},
];
const DEF_RULES = [
  ['uber eats','comida'],['rappi','comida'],['pedidosya','comida'],['pedidos ya','comida'],['justo','comida'],['starbucks','comida'],['mcdonald','comida'],['burger king','comida'],['juan maestro','comida'],['dominos','comida'],
  ['jumbo','super'],['lider','super'],['unimarc','super'],['santa isabel','super'],['tottus','super'],['acuenta','super'],['alvi','super'],['mayorista','super'],['oxxo','super'],['ok market','super'],
  ['copec','transporte'],['shell','transporte'],['aramco','transporte'],['petrobras','transporte'],['autopista','transporte'],['costanera norte','transporte'],['vespucio','transporte'],['autopase','transporte'],['uber','transporte'],['didi','transporte'],['cabify','transporte'],['metro','transporte'],['bip','transporte'],['estacionamiento','transporte'],
  ['enel','basicos'],['cge','basicos'],['chilquinta','basicos'],['aguas andinas','basicos'],['essbio','basicos'],['esval','basicos'],['nuevosur','basicos'],['metrogas','basicos'],['abastible','basicos'],['lipigas','basicos'],['gasco','basicos'],
  ['entel','telecom'],['movistar','telecom'],['wom','telecom'],['claro','telecom'],['vtr','telecom'],['gtd','telecom'],
  ['netflix','suscripciones'],['spotify','suscripciones'],['disney','suscripciones'],['hbo','suscripciones'],['prime video','suscripciones'],['youtube','suscripciones'],['apple com','suscripciones'],['icloud','suscripciones'],['paramount','suscripciones'],['crunchyroll','suscripciones'],['chatgpt','suscripciones'],['claude ai','suscripciones'],['anthropic','suscripciones'],
  ['cruz verde','salud'],['salcobrand','salud'],['ahumada','salud'],['dr simi','salud'],['isapre','salud'],['fonasa','salud'],['clinica','salud'],['integramedica','salud'],
  ['falabella','ropa'],['paris','ropa'],['ripley','ropa'],['h&m','ropa'],['zara','ropa'],['preunic','ropa'],
  ['sodimac','hogar'],['easy','hogar'],['homecenter','hogar'],['ikea','hogar'],
  ['cinemark','entretencion'],['cineplanet','entretencion'],['steam','entretencion'],['playstation','entretencion'],['latam','entretencion'],['sky airline','entretencion'],['jetsmart','entretencion'],
  ['comision','comisiones'],['impuesto timbre','comisiones'],['interes','comisiones'],['mantencion','comisiones'],
  ['superzoo','mascotas'],['veterinaria','mascotas'],
].map(([p, c]) => ({p, c}));
const DEF_MEDIOS = [
  {id:'cc', n:'Cuenta corriente', tipo:'debito', alias:'corriente'},
  {id:'rut', n:'Cuenta RUT', tipo:'debito', alias:'rut'},
  {id:'tc', n:'Tarjeta de crédito', tipo:'credito', alias:'credito', cierre:20, pago:5, cupo:0},
  {id:'efe', n:'Efectivo', tipo:'efectivo', alias:'efectivo cash'},
];
const DEF_CFG = {cats:DEF_CATS, medios:DEF_MEDIOS, reglas:DEF_RULES, miembros:[], reparto:{}, ingresoMensual:0, ahorroMensual:0, compDefault:true, okDup:[]};
const ARTIFACT_URL = 'https://claude.ai/artifact/5jmt1fk1VGtxwUiL2fvmsk';
const TIPO_MEDIO = {credito:'Crédito', debito:'Débito', efectivo:'Efectivo', otro:'Otro'};
const VIEWS = [['inicio','Inicio'],['movimientos','Movimientos'],['tarjetas','Tarjetas'],['importar','Importar'],['presupuesto','Presupuesto'],['fijos','Pagos fijos'],['deudas','Deudas y cuotas'],['metas','Metas'],['entre-nosotros','Entre nosotros'],['asesor','Asesor'],['ajustes','Ajustes']];
const MONTH_VIEWS = new Set(['inicio','movimientos','presupuesto','entre-nosotros']);

/* ---------- estado ---------- */
const S = {
  db:null, user:null, sample:null, limits:null, downloads:null, me:null, ro:false, noDb:false, slow:false,
  config:null, movs:[], recs:[], deudas:[], metas:[], refs:new Set(),
  ready:{cfg:false, movs:false, recs:false, deudas:false, metas:false},
  view:'inicio', ym:curYM(), names:{}, avatars:{},
  f:{q:'', cat:'', quien:'', tipo:'', cuenta:''},
  imp:{rows:[], status:'', busy:false, cuenta:'', quien:'', comp:null, paste:'', note:''},
  chat:[], chatBusy:false, analisis:'', analisisBusy:false, presSug:null, presBusy:false,
  autoDone:false, joined:false, pendingRender:false, _st:{},
};
const cfg = () => {
  const c = S.config || {};
  const medios = Array.isArray(c.medios) && c.medios.length ? c.medios
    : Array.isArray(c.cuentas) && c.cuentas.length ? c.cuentas.map((n, i) => DEF_MEDIOS.find(d => d.n === n) || {id:'m' + i, n, tipo: /tarjeta|cr[eé]dito|cmr|visa|master|ripley|lider/i.test(n) ? 'credito' : /efectivo/i.test(n) ? 'efectivo' : 'debito'})
    : DEF_MEDIOS;
  return {...DEF_CFG, ...c,
    cats: Array.isArray(c.cats) && c.cats.length ? c.cats : DEF_CATS,
    reglas: Array.isArray(c.reglas) ? c.reglas : DEF_RULES,
    medios, cuentas: medios.map(m => m.n),
    reparto: c.reparto || {}, miembros: Array.isArray(c.miembros) ? c.miembros : [], okDup: Array.isArray(c.okDup) ? c.okDup : []};
};
const medioByName = n => cfg().medios.find(m => m.n === n);
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const catsOf = t => cfg().cats.filter(c => (c.t || 'gasto') === t);
const catObj = id => cfg().cats.find(c => c.id === id);
const catName = id => (catObj(id) || {}).n || (id ? 'Sin categoría' : 'Sin categoría');
const applyRules = desc => {
  const n = ' ' + norm(desc) + ' ';
  let best = null;
  for (const r of cfg().reglas) { const p = norm(r.p); if (p && n.includes(p) && (!best || p.length > norm(best.p).length)) best = r; }
  return best && catObj(best.c) ? best.c : null;
};

/* ---------- personas ---------- */
const members = () => {
  const set = new Set(cfg().miembros.filter(Boolean));
  for (const m of S.movs) if (m.quien) set.add(m.quien);
  if (S.me && S.me.id) set.add(S.me.id);
  return [...set];
};
const isMe = id => !!(S.me && S.me.id && id === S.me.id);
const nameOf = id => {
  if (!id) return 'Sin asignar';
  if (id === 'ej-a') return 'Ejemplo A';
  if (id === 'ej-b') return 'Ejemplo B';
  const n = S.names[id];
  if (isMe(id)) return n ? `${n.split(' ')[0]} (tú)` : 'Tú';
  return n ? n.split(' ')[0] : 'Otra persona';
};
const avatar = id => {
  const src = S.avatars[id];
  const col = id === 'ej-b' ? 'var(--s2)' : id === 'ej-a' ? 'var(--s1)' : 'var(--accent)';
  return src ? `<span class="av"><img alt="" src="${esc(src)}"></span>` : `<span class="av" style="background:${col}" aria-hidden="true">${esc(initials(nameOf(id).replace(' (tú)', '')))}</span>`;
};
let namesBusy = false;
async function refreshNames() {
  if (!S.user || namesBusy) return;
  const ids = members().filter(id => !id.startsWith('ej-'));
  if (!ids.length) return;
  namesBusy = true;
  try {
    const ps = await S.user.profiles(ids);
    let changed = false;
    for (const id of ids) {
      const p = ps[id] || {};
      const n = p.name || '';
      const a = p.avatarUrl && /^(https:|data:image\/|\/)/.test(p.avatarUrl) && p.name ? p.avatarUrl : '';
      if (S.names[id] !== n || S.avatars[id] !== a) { S.names[id] = n; S.avatars[id] = a; changed = true; }
    }
    if (changed) scheduleRender();
  } catch (e) { /* lectura de perfiles nunca debería fallar */ }
  namesBusy = false;
}

