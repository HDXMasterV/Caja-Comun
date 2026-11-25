'use strict';
/* ---------- gráficos ---------- */
function niceMax(v) { if (v <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); const f = v / e; const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10; return n * e; }
function topRound(x, y, w, h, r) { if (h <= 0) return ''; r = Math.min(r, w / 2, h); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; }
function trendSVG(months) {
  const W = 640, H = 220, L = 58, R = 8, T = 14, B = 26, iw = W - L - R, ih = H - T - B;
  const max = niceMax(Math.max(1, ...months.flatMap(m => [m.ing, m.gas])));
  const gw = iw / months.length, bw = Math.max(6, Math.min(24, (gw - 20) / 2));
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = T + ih - ih * i / 4; g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${i ? 'var(--grid)' : 'var(--axis)'}" stroke-width="1"/><text class="tick" x="${L - 8}" y="${y + 4}" text-anchor="end">${esc(fmtShort(v))}</text>`; }
  months.forEach((m, i) => {
    const cx = L + gw * i + gw / 2, hi = ih * m.ing / max, hg = ih * m.gas / max;
    g += `<path d="${topRound(cx - bw - 1, T + ih - hi, bw, hi, 4)}" fill="var(--s1)"/><path d="${topRound(cx + 1, T + ih - hg, bw, hg, 4)}" fill="var(--s2)"/>`;
    g += `<text x="${cx}" y="${H - 8}" text-anchor="middle"${m.cur ? ' style="font-weight:700;fill:var(--ink)"' : ''}>${esc(ymShort(m.ym))}</text>`;
    const tip = `${ymLabel(m.ym)}\nIngresos: ${fmt(m.ing)}\nGastos: ${fmt(m.gas)}\n${m.ing - m.gas >= 0 ? 'Sobró' : 'Faltó'}: ${fmt(Math.abs(m.ing - m.gas))}`;
    g += `<rect x="${L + gw * i}" y="${T}" width="${gw}" height="${ih}" fill="transparent" data-tip="${esc(tip)}"/>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos de los últimos ${months.length} meses">${g}</svg>`;
}
function loadSVG(points) {
  const W = 640, H = 190, L = 58, R = 8, T = 12, B = 26, iw = W - L - R, ih = H - T - B;
  const max = niceMax(Math.max(1, ...points.map(p => p.v)));
  const gw = iw / points.length, bw = Math.max(6, Math.min(28, gw - 10));
  let g = '';
  for (let i = 0; i <= 3; i++) { const v = max * i / 3, y = T + ih - ih * i / 3; g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${i ? 'var(--grid)' : 'var(--axis)'}"/><text class="tick" x="${L - 8}" y="${y + 4}" text-anchor="end">${esc(fmtShort(v))}</text>`; }
  points.forEach((p, i) => {
    const cx = L + gw * i + gw / 2, h = ih * p.v / max;
    g += `<path d="${topRound(cx - bw / 2, T + ih - h, bw, h, 4)}" fill="var(--s1)"/>`;
    g += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(ymShort(p.ym))}</text>`;
    g += `<rect x="${L + gw * i}" y="${T}" width="${gw}" height="${ih}" fill="transparent" data-tip="${esc(ymLabel(p.ym) + '\nCuotas: ' + fmt(p.v))}"/>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cuotas por pagar los próximos 12 meses">${g}</svg>`;
}
function catBars(items, scaleMax) {
  const max = scaleMax || Math.max(1, ...items.map(i => Math.max(i.v, i.p || 0)));
  return items.map(i => {
    const over = i.p && i.v > i.p;
    return `<div class="cbar"><div class="cbar-h"><span>${esc(i.n)}</span><span class="num">${fmt(i.v)}${i.p ? ` <small>de ${fmt(i.p)}</small>` : ''}${over ? ' <span class="pill late">excedido</span>' : ''}</span></div>
      <div class="track"><div class="fill${over ? ' over' : ''}" style="width:${Math.min(100, i.v / max * 100)}%"></div>${i.p ? `<div class="mark" style="left:calc(${Math.min(100, i.p / max * 100)}% - 1px)" title="Presupuesto ${esc(fmt(i.p))}"></div>` : ''}</div></div>`;
  }).join('');
}
const tip = $('#tip');
document.addEventListener('pointermove', e => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (!t) { tip.hidden = true; return; }
  tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
  const x = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14), y = Math.max(8, e.clientY - tip.offsetHeight - 12);
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
});

/* Markdown mínimo y seguro */
function md(text) {
  const lines = esc(text).split(/\n/); let html = '', inList = false;
  const inline = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  for (const raw of lines) {
    const l = raw.trim();
    if (/^([-•*]|\d+[.)])\s+/.test(l)) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(l.replace(/^([-•*]|\d+[.)])\s+/, ''))}</li>`; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    if (!l) continue;
    html += `<p>${inline(l.replace(/^#+\s*/, ''))}</p>`;
  }
  if (inList) html += '</ul>';
  return html;
}


/* ---------- íconos (trazo, 24x24) ---------- */
const ICONS = {
  panel:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  lista:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  tarjeta:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
  subir:'<path d="M12 15V4M7 9l5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  torta:'<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  repetir:'<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 20v-4.5h4.5"/>',
  boleta:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  meta:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  personas:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a6.5 6.5 0 0 1 3.5 5.7"/>',
  chispa:'<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  ajustes:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  mas:'<path d="M12 5v14M5 12h14"/>',
  puntos:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  carro:'<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.4 11h10.8L21 8H6.2"/>',
  casa:'<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
  rayo:'<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  wifi:'<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
  auto:'<path d="M5 15l1.6-5.2A2 2 0 0 1 8.5 8.4h7a2 2 0 0 1 1.9 1.4L19 15"/><rect x="3" y="15" width="18" height="4" rx="1.5"/><path d="M6 19v2M18 19v2"/>',
  salud:'<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  libro:'<path d="M4 19V5a2 2 0 0 1 2-2h13v14H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h13"/>',
  huella:'<circle cx="6.5" cy="10" r="1.6"/><circle cx="10.5" cy="6.3" r="1.6"/><circle cx="15" cy="6.8" r="1.6"/><circle cx="18" cy="11" r="1.6"/><path d="M8.5 18c0-2.5 1.8-5 4-5s4 2.5 4 5c0 1.5-1.5 2-4 2s-4-.5-4-2z"/>',
  porc:'<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>',
  comida:'<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 0-3.5 2.5-3.5 6.5H17"/>',
  tele:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 21h8M9 2l3 4 3-4"/>',
  polera:'<path d="M8 3L3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
  ticket:'<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10"/>',
  regalo:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8C10.5 4 6 4 6 6.5S12 8 12 8zM12 8c1.5-4 6-4 6-1.5S12 8 12 8z"/>',
  etiqueta:'<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  chanchito:'<path d="M4 12a7 6 0 0 1 12.5-3.5H19v3l2 1v3h-2.4A7 6 0 0 1 16 18v2h-3v-1.5h-3V20H7v-2.7A6 6 0 0 1 4 12z"/><circle cx="14.5" cy="11" r=".8"/>',
  billete:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  traspaso:'<path d="M4 8h15l-3-3M20 16H5l3 3"/>',
};
const ico = (k, cls = '') => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.etiqueta}</svg>`;
const CAT_ICON = {super:'carro', vivienda:'casa', basicos:'rayo', telecom:'wifi', transporte:'auto', salud:'salud', educacion:'libro', deudas:'boleta', mascotas:'huella', comisiones:'porc', comida:'comida', suscripciones:'tele', hogar:'casa', ropa:'polera', entretencion:'ticket', regalos:'regalo', otros:'etiqueta', ahorro:'chanchito', retiros:'billete', sueldo:'billete', honorarios:'billete', otros_ing:'billete'};
const CAT_WORDS = [[/super|almac|feria/, 'carro'], [/arriendo|casa|hogar|dividendo/, 'casa'], [/luz|agua|gas|basic/, 'rayo'], [/internet|celular|telef/, 'wifi'], [/transp|bencina|auto|uber/, 'auto'], [/salud|farmac|medic/, 'salud'], [/educa|curso|colegio/, 'libro'], [/cuota|credito|deuda/, 'boleta'], [/mascota|perro|gato/, 'huella'], [/comision|interes/, 'porc'], [/restaur|comida|delivery/, 'comida'], [/suscrip|stream/, 'tele'], [/ropa|cuidado/, 'polera'], [/entreten|viaje|panorama/, 'ticket'], [/regalo/, 'regalo'], [/ahorro/, 'chanchito'], [/retiro|efectivo|sueldo|ingreso/, 'billete']];
const CAT_PAL = ['#ba7517', '#1d9e75', '#378add', '#d85a30', '#7f77dd', '#d4537e', '#639922', '#0f6e56', '#993c1d', '#185fa5', '#854f0b', '#534ab7'];
function catIcon(id) { if (CAT_ICON[id]) return CAT_ICON[id]; const n = norm(catName(id)); const w = CAT_WORDS.find(([re]) => re.test(n)); return w ? w[1] : 'etiqueta'; }
function catColor(id) {
  const c = catObj(id); if (!c) return '#888780';
  if (c.t === 'ingreso') return '#3b8a1e';
  const i = catsOf('gasto').findIndex(x => x.id === id);
  return i < 0 ? '#888780' : CAT_PAL[i % CAT_PAL.length];
}
function movIcon(m) {
  if (m.tipo === 'transf') return {k:'traspaso', c:'#888780'};
  if (m.tipo === 'liq') return {k:'personas', c:'#888780'};
  if (m.tipo === 'ingreso') return {k: catObj(m.cat) ? catIcon(m.cat) : 'billete', c:'#3b8a1e'};
  return {k: catIcon(m.cat), c: catColor(m.cat)};
}
const cicHTML = (k, c) => `<span class="cic" style="color:${c};background:color-mix(in srgb,${c} 15%,transparent)">${ico(k)}</span>`;
function donutSVG(items, total) {
  const R = 60, r = 40, C = 75; let a = -Math.PI / 2, g = '';
  const pt = (ang, rad) => `${(C + rad * Math.cos(ang)).toFixed(2)},${(C + rad * Math.sin(ang)).toFixed(2)}`;
  if (!total) return `<svg viewBox="0 0 150 150" role="img" aria-label="Sin gastos"><circle cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none" stroke="var(--surface-2)" stroke-width="${R - r}"/></svg>`;
  for (const it of items) {
    const f = it.v / total; if (f <= 0) continue;
    if (f > .9999) { g += `<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none" stroke="${it.c}" stroke-width="${R - r}" data-tip="${esc(it.n + '\n' + fmt(it.v) + ' · 100 %')}"/>`; break; }
    const b = a + f * Math.PI * 2, big = f > .5 ? 1 : 0;
    g += `<path d="M${pt(a, R)}A${R},${R} 0 ${big} 1 ${pt(b, R)}L${pt(b, r)}A${r},${r} 0 ${big} 0 ${pt(a, r)}Z" fill="${it.c}" stroke="var(--surface)" stroke-width="1.5" data-tip="${esc(`${it.n}\n${fmt(it.v)} · ${Math.round(f * 100)} %`)}"/>`;
    a = b;
  }
  g += `<text x="${C}" y="${C - 2}" text-anchor="middle" style="font:600 10px var(--f-body);fill:var(--muted)">Total</text><text x="${C}" y="${C + 14}" text-anchor="middle" style="font:700 13px var(--f-display);fill:var(--ink)">${esc(fmtShort(total))}</text>`;
  return `<svg viewBox="0 0 150 150" role="img" aria-label="Gasto por categoría">${g}</svg>`;
}
