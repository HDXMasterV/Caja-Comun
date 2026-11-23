'use strict';
/* ---------- cálculos ---------- */
const st = ym => {
  if (S._st[ym]) return S._st[ym];
  const ms = S.movs.filter(m => m.fecha && m.fecha.startsWith(ym));
  let ing = 0, gas = 0, aho = 0; const byCat = {};
  for (const m of ms) {
    if (m.tipo === 'ingreso') ing += m.monto;
    else if (m.tipo === 'gasto') { if (m.cat === 'ahorro') aho += m.monto; else gas += m.monto; byCat[m.cat] = (byCat[m.cat] || 0) + m.monto; }
  }
  return (S._st[ym] = {ms, ing, gas, aho, byCat});
};
const recOccurs = (r, ym) => r.activo !== false && (!r.desde || ym >= r.desde) && (r.frec !== 'anual' || Number(ym.slice(5)) === Number(r.mesAnual || 1));
const cuotaNum = (d, ym) => monthsDiff(d.primera, ym) + 1;
function pendientes(ym) {
  const out = [];
  for (const r of S.recs) {
    if (r.tipo !== 'gasto' || !recOccurs(r, ym)) continue;
    const dia = Math.min(Number(r.dia) || 1, daysInMonth(ym)); const key = `r:${r.id}:${ym}`;
    out.push({key, kind:'r', id:r.id, nombre:r.nombre, monto:r.monto, dia, fecha:`${ym}-${pad(dia)}`, cat:r.cat, paid:S.refs.has(key), auto:!!r.auto, sus:!!r.sus, src:r});
  }
  for (const d of S.deudas) {
    const k = cuotaNum(d, ym); if (k < 1 || k > d.total) continue;
    const dia = Math.min(Number(d.dia) || 1, daysInMonth(ym)); const key = `d:${d.id}:${ym}`;
    out.push({key, kind:'d', id:d.id, nombre:`${d.nombre} · cuota ${k} de ${d.total}`, monto:d.cuota, dia, fecha:`${ym}-${pad(dia)}`, cat:'deudas', paid:S.refs.has(key), src:d});
  }
  return out.sort((a, b) => a.dia - b.dia);
}
const presTotal = () => sum(catsOf('gasto').filter(c => c.id !== 'ahorro').map(c => Number(c.p) || 0));
function disponible() {
  const ym = curYM(), s = st(ym), pend = pendientes(ym).filter(p => !p.paid);
  const pendM = sum(pend.map(p => p.monto));
  const pres = presTotal();
  const dl = daysInMonth(ym) - Number(todayISO().slice(8)) + 1;
  const ingFijo = sum(S.recs.filter(r => r.tipo === 'ingreso' && recOccurs(r, ym)).map(r => r.monto));
  const ingRef = Math.max(s.ing, Number(cfg().ingresoMensual) || 0, ingFijo);
  let base, modo;
  if (pres > 0) { base = pres - s.gas - pendM; modo = 'pres'; }
  else { base = ingRef - s.gas - s.aho - pendM - (Number(cfg().ahorroMensual) || 0); modo = 'ing'; }
  return {porDia: Math.max(0, base) / dl, restante: base, dl, pendM, pres, ingRef, modo, s};
}
function proyeccion() {
  const ym = curYM(), s = st(ym), d = Number(todayISO().slice(8)), dim = daysInMonth(ym);
  const variable = sum(s.ms.filter(m => m.tipo === 'gasto' && m.cat !== 'ahorro' && !m.ref).map(m => m.monto));
  const pend = sum(pendientes(ym).filter(p => !p.paid).map(p => p.monto));
  return s.gas + (variable / Math.max(1, d)) * (dim - d) + pend;
}
function avgCat(catId, n = 3, upto = curYM()) {
  const vals = []; for (let i = 1; i <= n; i++) vals.push(st(addMonths(upto, -i)).byCat[catId] || 0);
  const used = vals.filter((v, i) => S.movs.some(m => m.fecha && m.fecha.startsWith(addMonths(upto, -(i + 1)))));
  return used.length ? sum(used) / used.length : 0;
}
function deudaInfo(d) {
  const cur = curYM();
  const pagadasAntes = Math.max(0, Math.min(d.total, monthsDiff(d.primera, cur)));
  const pagadaEste = S.refs.has(`d:${d.id}:${cur}`) && cuotaNum(d, cur) >= 1 && cuotaNum(d, cur) <= d.total;
  const pagadas = Math.min(d.total, pagadasAntes + (pagadaEste ? 1 : 0));
  const rest = d.total - pagadas;
  const r = (Number(d.tasa) || 0) / 100;
  const saldo = d.tipo === 'credito' && r > 0 ? d.cuota * (1 - Math.pow(1 + r, -rest)) / r : d.cuota * rest;
  return {pagadas, rest, saldo, fin: addMonths(d.primera, d.total - 1), r, totalRest: d.cuota * rest};
}
function detectSus() {
  const from = addMonths(curYM(), -5) + '-01'; const g = {};
  for (const m of S.movs) {
    if (m.tipo !== 'gasto' || m.ref || m.fecha < from) continue;
    const k = merchantKey(m.comercio || m.desc); if (!k || k.length < 3) continue;
    (g[k] = g[k] || []).push(m);
  }
  const recKeys = S.recs.map(r => merchantKey(r.nombre)).filter(Boolean);
  const out = [];
  for (const [k, arr] of Object.entries(g)) {
    const months = new Set(arr.map(m => ymOf(m.fecha)));
    if (months.size < 2 || arr.length > months.size + 1) continue;
    const med = median(arr.map(m => m.monto));
    if (['super', 'comida', 'transporte', 'salud'].includes(arr[0].cat)) continue;
    if (!arr.every(m => Math.abs(m.monto - med) <= Math.max(100, med * 0.02))) continue;
    if (recKeys.some(rk => rk.includes(k) || k.includes(rk))) continue;
    const last = arr[0];
    out.push({k, nombre: last.comercio || last.desc, monto: Math.round(med), meses: months.size, cat: last.cat, dia: Number(last.fecha.slice(8))});
  }
  return out;
}
function detectDup() {
  const from = addDays(todayISO(), -60);
  const rec = S.movs.filter(m => m.tipo === 'gasto' && m.fecha >= from && m.monto >= 2000);
  const ok = new Set(cfg().okDup); const out = [];
  for (let i = 0; i < rec.length; i++) for (let j = i + 1; j < rec.length; j++) {
    const a = rec[i], b = rec[j];
    if (a.monto !== b.monto || Math.abs(daysBetween(a.fecha, b.fecha)) > 2) continue;
    if (merchantKey(a.comercio || a.desc) !== merchantKey(b.comercio || b.desc)) continue;
    const id = [a.id, b.id].sort().join('~'); if (ok.has(id)) continue;
    out.push({a, b, id});
  }
  return out;
}
function detectCuotas() {
  const known = S.deudas.map(d => merchantKey(d.nombre));
  const seen = {}; const out = [];
  for (const m of S.movs) {
    if (!m.cuota || m.ref) continue;
    const mm = String(m.cuota).match(/(\d+)\s*\/\s*(\d+)/); if (!mm) continue;
    const n = +mm[1], t = +mm[2]; if (t < 2 || n > t) continue;
    const k = merchantKey(m.comercio || m.desc) + '|' + m.monto;
    if (seen[k] || known.some(x => x && k.startsWith(x))) continue;
    seen[k] = 1;
    out.push({nombre: m.comercio || m.desc, cuota: m.monto, total: t, primera: addMonths(ymOf(m.fecha), -(n - 1)), n, mov: m});
  }
  return out.filter(x => cuotaNum(x, curYM()) <= x.total);
}
function cardCycle(c, ref = todayISO()) {
  const C = Number(c.cierre); if (c.tipo !== 'credito' || !C) return null;
  const at = (ym, d) => `${ym}-${pad(Math.min(d, daysInMonth(ym)))}`;
  const ym = ref.slice(0, 7);
  let prox = at(ym, C); if (prox < ref) prox = at(addMonths(ym, 1), C);
  const ult = at(addMonths(ymOf(prox), -1), C), ant = at(addMonths(ymOf(prox), -2), C);
  let venc = null; const P = Number(c.pago);
  if (P) { const v1 = at(ymOf(ult), P); venc = v1 > ult ? v1 : at(addMonths(ymOf(ult), 1), P); }
  return {ant, ult, prox, venc};
}
function cardInfo(c) {
  const ms = S.movs.filter(m => m.cuenta === c.n && m.tipo === 'gasto');
  const cy = cardCycle(c), r = {cy, ms};
  if (cy) {
    r.actual = sum(ms.filter(m => m.fecha > cy.ult).map(m => m.monto));
    r.facturado = sum(ms.filter(m => m.fecha > cy.ant && m.fecha <= cy.ult).map(m => m.monto));
    r.key = `t:${c.id}:${cy.ult}`; r.pagada = S.refs.has(r.key);
  } else { r.actual = sum(ms.filter(m => m.fecha.startsWith(curYM())).map(m => m.monto)); r.facturado = 0; }
  r.cuotasFut = sum(S.deudas.filter(d => d.cuenta === c.n).map(d => deudaInfo(d).totalRest));
  r.usado = (cy && !r.pagada ? r.facturado : 0) + r.actual + r.cuotasFut;
  return r;
}
function alertas() {
  const out = []; const cur = curYM(); const today = todayISO(); const s = st(cur);
  for (const c of cfg().medios) {
    const i = cardInfo(c); if (!i.cy || !i.cy.venc || i.pagada || i.facturado <= 0) continue;
    const dd = daysBetween(today, i.cy.venc), quien = c.adicional ? `pagarle a ${c.titular || 'la titular'}` : 'pagar';
    if (dd < 0) out.push({sev:'serious', t:`¿Pagaron ${c.n}?`, d:`El estado de cuenta (${fmt(i.facturado)} anotados) vencía el ${dShort(i.cy.venc)}.`, act:{l:'Marcar pagada', a:'card-pay', v:c.id}, w:2});
    else if (dd <= 5) out.push({sev:'warning', t:`${c.n}: hay que ${quien} ${dd === 0 ? 'hoy' : dd === 1 ? 'mañana' : 'en ' + dd + ' días'}`, d:`${fmt(i.facturado)} anotados en el período que cerró el ${dShort(i.cy.ult)}. Vence el ${dShort(i.cy.venc)}.`, act:{l:'Marcar pagada', a:'card-pay', v:c.id}, w:2});
  }
  const dNow = Number(today.slice(8)), dim = daysInMonth(cur), frac = dNow / dim;
  for (const c of catsOf('gasto')) {
    const p = Number(c.p) || 0; if (!p || c.id === 'ahorro') continue;
    const g = s.byCat[c.id] || 0;
    if (g > p) out.push({sev:'critical', t:`Te pasaste en ${c.n}`, d:`Llevas ${fmt(g)} de ${fmt(p)} (${Math.round(g / p * 100)}%).`, w:1});
    else if (g >= p * 0.8) out.push({sev:'warning', t:`${c.n} va en ${Math.round(g / p * 100)}%`, d:`Te quedan ${fmt(p - g)} para ${dim - dNow + 1} días.`, w:3});
    else if (frac > 0.2 && g / frac > p * 1.15) out.push({sev:'warning', t:`A este ritmo te pasas en ${c.n}`, d:`Proyección: ${fmt(g / frac)} contra ${fmt(p)} presupuestado.`, w:4});
  }
  for (const p of pendientes(cur)) {
    if (p.paid) continue;
    const dd = p.dia - dNow;
    if (dd < 0) out.push({sev:'serious', t:`¿Pagaste ${p.nombre}?`, d:`Vencía el ${dShort(p.fecha)} · ${fmt(p.monto)}. Si ya está pagado, márcalo.`, act:{l:'Marcar pagado', a:'pagar', v:p.key}, w:2});
    else if (dd <= 5) out.push({sev:'warning', t:`${p.nombre} vence ${dd === 0 ? 'hoy' : dd === 1 ? 'mañana' : 'en ' + dd + ' días'}`, d:`${fmt(p.monto)} el ${dShort(p.fecha)}.`, act:{l:'Marcar pagado', a:'pagar', v:p.key}, w:3});
  }
  for (const x of detectDup()) out.push({sev:'serious', t:`Posible cobro duplicado: ${x.a.comercio || x.a.desc}`, d:`Dos cargos de ${fmt(x.a.monto)} el ${dShort(x.a.fecha)} y el ${dShort(x.b.fecha)}. Revisa con tu banco si no reconoces uno.`, act:{l:'No es duplicado', a:'okdup', v:x.id}, w:2});
  const hist = {};
  for (const m of S.movs) if (m.tipo === 'gasto' && !m.ref && m.fecha < cur && m.fecha >= addMonths(cur, -6)) (hist[m.cat] = hist[m.cat] || []).push(m.monto);
  for (const m of s.ms) {
    if (m.tipo !== 'gasto' || m.ref || m.monto < 30000) continue;
    const h = hist[m.cat] || []; if (h.length < 5) continue;
    const md = median(h); if (m.monto > md * 3) out.push({sev:'warning', t:`Gasto poco habitual: ${m.comercio || m.desc}`, d:`${fmt(m.monto)} el ${dShort(m.fecha)}. Lo normal en ${catName(m.cat)} es cerca de ${fmt(md)}.`, w:5});
  }
  for (const x of detectSus()) out.push({sev:'info', t:`Parece una suscripción: ${x.nombre}`, d:`${fmt(x.monto)} al mes, visto en ${x.meses} meses. Agrégala a pagos fijos para que la app la siga.`, act:{l:'Agregar a pagos fijos', a:'sus-add', v:x.k}, w:6});
  for (const r of S.recs.filter(r => r.sus && r.tipo === 'gasto')) {
    const k = merchantKey(r.nombre);
    const last = S.movs.find(m => m.tipo === 'gasto' && !m.ref && k && merchantKey(m.comercio || m.desc) === k);
    if (last && last.monto > r.monto * 1.05) out.push({sev:'warning', t:`${r.nombre} subió de precio`, d:`Pagabas ${fmt(r.monto)} y el último cobro fue ${fmt(last.monto)}.`, w:4});
  }
  for (const x of detectCuotas()) out.push({sev:'info', t:`Compra en cuotas sin registrar: ${x.nombre}`, d:`${fmt(x.cuota)} en cuota ${x.n} de ${x.total}. Regístrala para ver cuánto te queda.`, act:{l:'Agregar a deudas', a:'cuota-add', v:x.mov.id}, w:6});
  for (const d of S.deudas) if (d.primera && addMonths(d.primera, d.total - 1) === cur) out.push({sev:'good', t:`Este mes terminas de pagar ${d.nombre}`, d:`Desde ${ymLabel(addMonths(cur, 1))} liberas ${fmt(d.cuota)} al mes.`, w:7});
  if (s.ing > 0 && s.gas + s.aho > s.ing) out.push({sev:'critical', t:'Este mes gastas más de lo que entra', d:`Ingresos ${fmt(s.ing)} y gastos ${fmt(s.gas + s.aho)}.`, w:1});
  const sevW = {critical:0, serious:1, warning:2, info:3, good:4};
  return out.sort((a, b) => sevW[a.sev] - sevW[b.sev] || a.w - b.w);
}

