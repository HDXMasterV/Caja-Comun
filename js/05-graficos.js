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

