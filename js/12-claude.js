'use strict';
/* ---------- Claude: contexto, análisis, presupuesto, chat ---------- */
function contexto(ym = curYM()) {
  const lines = [];
  const c = cfg();
  lines.push(`Hoy: ${todayISO()}. Mes analizado: ${ymLabel(ym)}. Hogar de ${Math.max(1, members().length)} persona(s).`);
  if (c.ingresoMensual) lines.push(`Ingreso mensual declarado: ${fmt(c.ingresoMensual)}. Meta de ahorro mensual: ${fmt(c.ahorroMensual || 0)}.`);
  lines.push('Últimos 6 meses (ingresos / gastos / ahorro):');
  for (let i = 5; i >= 0; i--) { const y = addMonths(ym, -i), s = st(y); lines.push(`- ${ymLabel(y)}: ${fmt(s.ing)} / ${fmt(s.gas)} / ${fmt(s.aho)}`); }
  const s = st(ym), sp = st(addMonths(ym, -1));
  lines.push(`Gasto por categoría en ${ymLabel(ym)} (mes anterior; promedio 3 meses; presupuesto):`);
  for (const x of catsOf('gasto')) { const v = s.byCat[x.id] || 0, pv = sp.byCat[x.id] || 0, av = avgCat(x.id, 3, ym); if (v || pv || av || x.p) lines.push(`- ${x.n}: ${fmt(v)} (${fmt(pv)}; ${fmt(av)}; ${x.p ? fmt(x.p) : 'sin presupuesto'})`); }
  const top = {}; for (const m of s.ms) if (m.tipo === 'gasto') { const k = m.comercio || m.desc; top[k] = (top[k] || 0) + m.monto; }
  lines.push('Comercios con más gasto en el mes: ' + Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${fmt(v)}`).join('; '));
  if (S.recs.length) lines.push('Pagos fijos: ' + S.recs.filter(r => r.activo !== false).map(r => `${r.nombre} ${fmt(r.monto)} ${r.tipo}${r.frec === 'anual' ? ' anual' : ''}${r.sus ? ' (suscripción)' : ''}`).join('; '));
  if (S.deudas.length) lines.push('Deudas: ' + S.deudas.map(d => { const i = deudaInfo(d); return `${d.nombre}: cuota ${fmt(d.cuota)}, quedan ${i.rest} de ${d.total}, termina ${ymLabel(i.fin)}${d.tasa ? `, tasa ${d.tasa}% mensual, saldo aprox ${fmt(i.saldo)}` : ''}`; }).join('; '));
  if (S.metas.length) lines.push('Metas: ' + S.metas.map(m => `${m.nombre}: ${fmt(m.ahorrado || 0)} de ${fmt(m.objetivo)}${m.limite ? ' para ' + ymLabel(m.limite) : ''}`).join('; '));
  if (ym === curYM()) { const d = disponible(); lines.push(`Disponible por día hoy: ${fmt(d.porDia)} (${d.dl} días restantes, pagos pendientes ${fmt(d.pendM)}). Proyección de gasto a fin de mes: ${fmt(proyeccion())}.`); const al = alertas(); if (al.length) lines.push('Avisos activos: ' + al.slice(0, 8).map(a => a.t).join('; ')); }
  return lines.join('\n');
}
const REGLAS_ASESOR = `Eres el asesor de finanzas personales de un hogar en Chile dentro de la app Caja Común. Responde en español de Chile, claro y cercano, tuteando en plural ("ustedes") cuando hables del hogar. Usa montos en pesos con formato chileno ($12.990). Básate en los datos entregados y dilo cuando falte información. Puedes ayudar con presupuesto, ahorro, ordenar y prepagar deudas, recortar gastos y explicar conceptos (CAE, tasa de interés, UF, fondo de emergencia). No recomiendes inversiones, acciones, fondos, criptomonedas ni bancos o productos financieros específicos; si preguntan por eso, explica conceptos generales y sugiere hablar con un asesor financiero certificado. Sé breve: máximo unas 180 palabras, con viñetas cuando ayuden y negritas solo para los números clave.`;
function aiErr(e) {
  const c = e && e.code;
  if (c === 'not_granted') return 'No diste permiso para usar Claude en esta página. Puedes activarlo desde el menú de permisos de la página.';
  if (c === 'rate_limited') return 'Claude está ocupado o llegaste a tu límite de uso. Inténtalo en un rato.';
  if (c === 'sampling_disabled') return 'Claude no está disponible para esta cuenta.';
  if (c === 'refused') return 'Claude no pudo responder esa pregunta. Prueba planteándola de otra forma.';
  return 'No se pudo obtener respuesta. Inténtalo de nuevo.';
}
async function analizarMes() {
  if (!S.sample || S.analisisBusy) return;
  S.analisisBusy = true; render();
  try {
    const {text} = await S.sample(`${REGLAS_ASESOR}\n\nDatos del hogar:\n${contexto(S.ym)}\n\nHaz un análisis de ${ymLabel(S.ym)} en 4 a 6 viñetas: qué cambió respecto al mes anterior, dónde se fue la plata, qué categoría vigilar, una acción concreta para el resto del mes y cómo van deudas y metas. Termina con una frase de ánimo corta.`, {cache: {gcTime: 600000}});
    S.analisis = text;
  } catch (e) { S.analisis = aiErr(e); }
  S.analisisBusy = false; render();
}
async function proponerPresupuesto() {
  if (!S.sample || S.presBusy) return;
  S.presBusy = true; render();
  try {
    const ids = catsOf('gasto').filter(c => c.id !== 'ahorro').map(c => c.id);
    const res = await S.sample.json(`${REGLAS_ASESOR}\n\nDatos del hogar:\n${contexto()}\n\nPropón un presupuesto mensual realista por categoría para el próximo mes, basado en el gasto real promedio, los pagos fijos y el ingreso. Si el ingreso no alcanza, recorta primero los gustos. Deja espacio para la meta de ahorro si existe. Montos redondeados a miles.\nResponde SOLO con JSON: {"montos":{"id_categoria":numero,...},"nota":"2 o 3 frases explicando la propuesta"}\nIds válidos: ${ids.join(', ')}`);
    const m = {}; if (res && res.montos) for (const id of ids) if (res.montos[id] != null && Number.isFinite(Number(res.montos[id]))) m[id] = Math.round(Number(res.montos[id]));
    S.presSug = {m, nota: res && typeof res.nota === 'string' ? res.nota : ''};
  } catch (e) { toast(aiErr(e)); }
  S.presBusy = false; render();
}
async function sendChat(text) {
  if (!S.sample || S.chatBusy) return;
  S.chat.push({role:'user', content: text}); S.chatBusy = true; S.chatStick = true; S.chatPartial = ''; S.chatDraft = '';
  const ci = $('#chat-in'); if (ci) { ci.value = ''; ci.blur(); }
  render();
  const ctl = new AbortController(); S.chatCtl = ctl;
  const intro = `${REGLAS_ASESOR}\n\nDatos actuales del hogar:\n${contexto()}`;
  const turns = [{role:'user', content: intro}, ...S.chat.slice(-12)];
  const tools = S.limits && S.limits.tools ? [{
    name: 'buscar_movimientos',
    description: 'Busca movimientos del hogar de los últimos 12 meses por texto (comercio, descripción o categoría) y rango de fechas. Devuelve hasta 60 filas con fecha, descripción, categoría, tipo y monto, más el total.',
    inputSchema: {type:'object', properties: {texto: {type:'string', description:'Texto a buscar; vacío para todos'}, desde: {type:'string', description:'AAAA-MM-DD'}, hasta: {type:'string', description:'AAAA-MM-DD'}}},
    execute: input => {
      const q = norm(String(input.texto || '')), de = String(input.desde || '0000'), ha = String(input.hasta || '9999');
      const r = S.movs.filter(m => m.fecha >= de && m.fecha <= ha && (!q || norm(`${m.desc} ${m.comercio || ''} ${catName(m.cat)}`).includes(q)));
      return {total: sum(r.filter(m => m.tipo === 'gasto').map(m => m.monto)), cantidad: r.length, filas: r.slice(0, 60).map(m => ({fecha: m.fecha, desc: m.desc, cat: catName(m.cat), tipo: m.tipo, monto: m.monto}))};
    }}] : undefined;
  let answer = '';
  try {
    const {text: out} = await S.sample(turns, {cache: false, signal: ctl.signal, ...(tools ? {tools} : {}), onText: ({text: t}) => { answer = t; S.chatPartial = t; const el = $('#last-a'); if (el) { el.innerHTML = md(t); const ch = $('#chat'); if (ch) ch.scrollTop = ch.scrollHeight; } }});
    answer = out;
  } catch (e) {
    if (e && e.code === 'cancelled') answer = e.text || '(Detenido)';
    else answer = (e && e.text ? e.text + '\n\n' : '') + aiErr(e);
  }
  S.chat.push({role:'assistant', content: answer || '(Sin respuesta)'}); S.chatBusy = false; S.chatCtl = null;
  render(); S.chatStick = false;
}
async function exportCSV() {
  const head = ['fecha', 'tipo', 'descripcion', 'comercio', 'categoria', 'monto', 'cuenta', 'persona', 'compartido', 'cuota', 'origen'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [...S.movs].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(m => [m.fecha, m.tipo, m.desc, m.comercio || '', catName(m.cat), m.monto, m.cuenta || '', nameOf(m.quien).replace(' (tú)', ''), m.comp ? 'sí' : 'no', m.cuota || '', m.origen || ''].map(q).join(';'));
  try { await S.downloads.save({filename: `caja-comun-${todayISO()}.csv`, data: '﻿' + head.join(';') + '\n' + rows.join('\n')}); toast('Respaldo descargado'); }
  catch (e) { if (e && e.code !== 'declined') toast('No se pudo descargar el archivo aquí.'); }
}

