'use strict';
/* ---------- importación ---------- */
const scripts = {};
function loadScript(src) { return scripts[src] || (scripts[src] = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { delete scripts[src]; ko(new Error('No se pudo cargar ' + src)); }; document.head.appendChild(s); })); }
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const PDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFW_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
async function sheetRead(file) {
  await loadScript(XLSX_URL);
  const wb = window.XLSX.read(await file.arrayBuffer(), {type:'array', cellDates:true});
  let csv = '', aoa = [];
  for (const n of wb.SheetNames) {
    const ws = wb.Sheets[n];
    const a = window.XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:''}).filter(r => r.some(c => String(c).trim() !== ''));
    if (!a.length) continue;
    aoa = aoa.concat(a);
    csv += (wb.SheetNames.length > 1 ? `# Hoja ${n}\n` : '') + a.map(r => r.map(c => c instanceof Date ? isoOf(c) : String(c).replace(/[;\n\r]+/g, ' ')).join(';')).join('\n') + '\n';
  }
  return {csv, aoa};
}
async function pdfRead(file, wantImages) {
  await loadScript(PDF_URL); await loadScript(PDFW_URL);
  const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = PDFW_URL;
  const doc = await lib.getDocument({data: new Uint8Array(await file.arrayBuffer()), isEvalSupported:false}).promise;
  let text = '';
  for (let p = 1; p <= Math.min(doc.numPages, 30); p++) {
    const page = await doc.getPage(p); const tc = await page.getTextContent();
    const rows = {};
    for (const it of tc.items) { if (!it.str || !it.str.trim()) continue; const y = Math.round(it.transform[5] / 3) * 3; (rows[y] = rows[y] || []).push({x: it.transform[4], s: it.str}); }
    text += Object.keys(rows).map(Number).sort((a, b) => b - a).map(y => rows[y].sort((a, b) => a.x - b.x).map(o => o.s).join('  ')).join('\n') + '\n';
  }
  const images = [];
  if (text.replace(/\s/g, '').length < 80 && wantImages) {
    for (let p = 1; p <= Math.min(doc.numPages, wantImages); p++) {
      const page = await doc.getPage(p); const vp = page.getViewport({scale: 1.7});
      const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      await page.render({canvasContext: cv.getContext('2d'), viewport: vp}).promise;
      images.push(await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.85)));
    }
  }
  return {text, images};
}
function parseDelimited(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const sample = lines.slice(0, 10).join('\n');
  const delim = [['\t', (sample.match(/\t/g) || []).length], [';', (sample.match(/;/g) || []).length], [',', (sample.match(/,/g) || []).length]].sort((a, b) => b[1] - a[1])[0];
  if (!delim[1]) return null;
  const d = delim[0];
  return lines.map(l => { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === d && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); });
}
function parseDateAny(v) {
  if (v instanceof Date && !isNaN(v)) return isoOf(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/) || s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (m) {
    const dd = +m[1], mm = +m[2]; if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    let y = m[3] ? +m[3] : new Date().getFullYear(); if (y < 100) y += 2000;
    let iso = `${y}-${pad(mm)}-${pad(dd)}`; if (!m[3] && iso > todayISO()) iso = `${y - 1}-${pad(mm)}-${pad(dd)}`;
    return iso;
  }
  return null;
}
function localParse(aoa) {
  if (!aoa || !aoa.length) return [];
  let hi = aoa.findIndex(r => r.some(c => /fecha/i.test(String(c))));
  if (hi < 0) hi = -1;
  const H = hi >= 0 ? aoa[hi].map(c => norm(c)) : [];
  const find = re => H.findIndex(h => re.test(h));
  let iF = find(/fecha/), iD = find(/descrip|detalle|glosa|movimiento|comercio|concepto/), iC = find(/cargo|debe|giro|debito|egreso/), iA = find(/abono|haber|deposito|credito|ingreso/), iM = find(/monto|importe|valor/);
  const out = [];
  for (const r of aoa.slice(hi + 1)) {
    const fecha = parseDateAny(r[iF >= 0 ? iF : 0]); if (!fecha) continue;
    const desc = String(r[iD >= 0 ? iD : 1] || '').trim(); if (!desc || /saldo/i.test(desc) && !/pago/i.test(desc)) continue;
    let monto = 0, tipo = 'gasto';
    const cargo = iC >= 0 ? parseMonto(r[iC]) : 0, abono = iA >= 0 ? parseMonto(r[iA]) : 0;
    if (cargo) { monto = cargo; tipo = 'gasto'; }
    else if (abono) { monto = abono; tipo = 'ingreso'; }
    else if (iM >= 0) { const raw = r[iM]; monto = parseMonto(raw); tipo = (typeof raw === 'number' ? raw < 0 : /^\s*-|\(.*\)/.test(String(raw))) ? 'gasto' : 'ingreso'; }
    if (!monto) continue;
    const cu = desc.match(/(\d{1,2})\s*\/\s*(\d{1,2})\b/);
    out.push({fecha, descripcion: desc, comercio: '', monto, tipo: /pago (tarjeta|tc)|traspaso/i.test(desc) ? 'transf' : tipo, categoria: null, cuota: cu && +cu[2] > 1 ? `${+cu[1]}/${+cu[2]}` : null});
  }
  return out;
}
function claudePrompt(text, isImg, name) {
  const cats = cfg().cats.map(c => `${c.id} = ${c.n} (${c.t === 'ingreso' ? 'ingreso' : 'gasto'})`).join('\n');
  const reglas = cfg().reglas.slice(0, 120).map(r => `"${r.p}" -> ${r.c}`).join('; ');
  return `Extrae los movimientos de dinero de ${isImg ? 'estas imágenes (capturas de una app bancaria, una cartola o una boleta)' : 'este documento bancario chileno'}${name ? ` (${name})` : ''}.
Hoy es ${todayISO()}. Si una fecha no trae año, usa el año más reciente que no quede en el futuro.

Categorías permitidas (usa solo estos id):
${cats}

Preferencias del usuario (si la descripción contiene el texto, usa esa categoría): ${reglas}

Responde SOLO con un arreglo JSON. Cada elemento:
{"fecha":"AAAA-MM-DD","descripcion":"texto original resumido","comercio":"nombre limpio del comercio o la persona","monto":12990,"tipo":"gasto","categoria":"super","cuota":null,"emisor":"Banco Ripley"}
- emisor: el banco o la tarjeta dueña del documento (no el comercio), o vacío si no se sabe.
- fecha: la fecha de la operación tal como aparece en el documento.
Reglas:
- monto: número entero positivo en pesos chilenos. En Chile 1.234.567 son pesos con punto de miles.
- tipo "gasto" para compras, cargos, giros y comisiones; "ingreso" para abonos, depósitos, sueldos y transferencias recibidas de terceros; "transf" para pagos de tarjeta de crédito, traspasos entre cuentas propias o pagos recibidos en la tarjeta.
- Compras en cuotas: usa el valor de la cuota cobrada en este período y pon "cuota":"n/total" (ej "3/12").
- Ignora saldos, totales, subtotales, cupos, encabezados, intereses proyectados y filas que no sean movimientos.
${isImg ? '- Si es una boleta o comprobante de una compra, devuelve un solo movimiento con el total pagado.\n' : ''}- Si no hay movimientos, responde [].
${text ? `\nDocumento:\n"""\n${text}\n"""` : ''}`;
}
async function claudeExtract(text, images, name) {
  const res = await S.sample.json(claudePrompt(text, !!(images && images.length), name), images && images.length ? {images} : {});
  return Array.isArray(res) ? res : (res && Array.isArray(res.movimientos) ? res.movimientos : []);
}
async function handleFiles(list) {
  const files = [...(list || [])]; if (!files.length) return;
  const imgs = [], texts = []; S.imp.note = '';
  S.imp.busy = true; S.imp.status = 'Leyendo archivos…'; render();
  const maxImg = (S.limits && S.limits.images && S.limits.images.maxCount) || 0;
  try {
    for (const f of files) {
      const n = f.name.toLowerCase();
      if (/^image\//.test(f.type)) { imgs.push(f); continue; }
      S.imp.status = `Abriendo ${f.name}…`; render();
      if (n.endsWith('.pdf')) { const r = await pdfRead(f, maxImg ? Math.min(maxImg, 6) : 0); if (r.text.replace(/\s/g, '').length >= 80) texts.push({name: f.name, text: r.text, aoa: null}); else if (r.images.length) imgs.push(...r.images); else S.imp.note = `${f.name} parece escaneado y no se pudo leer sin Claude.`; }
      else if (/\.(xlsx|xls|ods)$/.test(n)) { const r = await sheetRead(f); texts.push({name: f.name, text: r.csv, aoa: r.aoa}); }
      else { const t = await f.text(); texts.push({name: f.name, text: t, aoa: parseDelimited(t)}); }
    }
  } catch (e) { console.error(e); S.imp.note = 'No se pudo abrir uno de los archivos. Prueba exportando la cartola en Excel o CSV.'; }
  await processTexts(texts, imgs);
}
async function processTexts(texts, imgs) {
  S.imp.busy = true; render();
  let rows = [], origen = 'cartola';
  const maxImg = (S.limits && S.limits.images && S.limits.images.maxCount) || 0;
  let useClaude = !!S.sample;
  for (const t of texts) {
    if (useClaude) {
      const lines = t.text.split('\n'); const head = lines.slice(0, 4).join('\n'); const chunks = []; let cur = '';
      for (const l of lines) { if (cur.length + l.length > 18000) { chunks.push(cur); cur = head + '\n'; } cur += l + '\n'; }
      if (cur.trim()) chunks.push(cur);
      try {
        for (let i = 0; i < chunks.length; i++) { S.imp.status = `Claude está leyendo ${t.name}${chunks.length > 1 ? ` (parte ${i + 1} de ${chunks.length})` : ''}…`; render(); rows.push(...await claudeExtract(chunks[i], null, t.name)); }
        continue;
      } catch (e) {
        console.warn(e);
        if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e && e.code)) useClaude = false;
        else if (e && e.code === 'rate_limited') S.imp.note = 'Claude está ocupado o llegaste al límite de uso. Usé la lectura básica.';
        else S.imp.note = 'Claude no pudo leer el archivo; usé la lectura básica.';
      }
    }
    if (t.aoa) rows.push(...localParse(t.aoa));
    else S.imp.note = `Sin Claude solo puedo leer Excel o CSV con columnas. ${t.name} necesita que permitas usar Claude.`;
  }
  if (imgs.length) {
    if (!useClaude || !maxImg) S.imp.note = 'Para leer fotos y capturas necesitas permitir que la página use Claude.';
    else {
      origen = texts.length ? 'cartola' : 'foto';
      try { for (let i = 0; i < imgs.length; i += maxImg) { S.imp.status = `Claude está mirando ${imgs.length > 1 ? 'las imágenes' : 'la imagen'}…`; render(); rows.push(...await claudeExtract('', imgs.slice(i, i + maxImg))); } }
      catch (e) { console.warn(e); S.imp.note = e && e.code === 'image_rejected' ? 'Una imagen no se pudo leer. Prueba con otra captura más nítida.' : 'Claude no pudo leer las imágenes.'; }
    }
  }
  let detectada = '';
  if (!S.imp.cuenta && rows.length) {
    const pistas = [...new Set(rows.map(x => x && x.emisor).filter(Boolean))].join(' ') + ' ' + texts.map(t => t.text.slice(0, 1500)).join(' ');
    const m = medioMatch(norm(pistas));
    if (m) { S.imp.cuenta = m.n; detectada = m.n; if (m.usa && personaOf(m.usa)) S.imp.quien = m.usa; }
  }
  addImportRows(rows, origen);
  S.imp.busy = false;
  S.imp.status = rows.length ? `Se encontraron ${rows.length} movimientos.${detectada ? ` Parecen ser de ${detectada}; cámbiala arriba si no corresponde.` : ''}` : (S.imp.note ? '' : 'No se encontraron movimientos en lo que subiste.');
  render();
}
function fixCuotaDates() {
  for (const r of S.imp.rows) if (r.fechaCompra) { r.fecha = r.fechaCompra; delete r.fechaCompra; }
  const card = medioByName(S.imp.cuenta);
  if (!card || card.tipo !== 'credito' || !Number(card.cierre)) return 0;
  const normales = S.imp.rows.filter(r => !r.cuota && r.tipo === 'gasto').map(r => r.fecha).sort();
  const ref = normales.length ? normales[normales.length - 1] : S.imp.rows.map(r => r.fecha).sort().pop();
  if (!ref) return 0;
  const cy = cardCycle(card, ref), inicio = addDays(cy.ult, 1);
  let n = 0;
  for (const r of S.imp.rows) if (r.cuota && r.fecha < inicio) { r.fechaCompra = r.fecha; r.fecha = cy.prox; n++; }
  S.imp.cierre = n ? cy.prox : '';
  return n;
}
function sameMerchant(a, b) {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a) || a.split(' ')[0] === b.split(' ')[0];
}
function recheckDups() {
  for (const r of S.imp.rows) {
    const key = merchantKey(r.comercio || r.desc);
    const d = S.movs.find(m => m.monto === r.monto && Math.abs(daysBetween(m.fecha, r.fecha)) <= 3 && (m.ref || sameMerchant(merchantKey(m.comercio || m.desc), key) || (S.imp.cuenta && m.cuenta === S.imp.cuenta && Math.abs(daysBetween(m.fecha, r.fecha)) <= 1)));
    const was = !!r.dup; r.dup = d ? `${d.desc} · ${dShort(d.fecha)}` : '';
    if (!was && r.dup) r.sel = false;
  }
}
function cuadratura() {
  const I = S.imp; if (!I.cuenta || !I.rows.length) return null;
  const fechas = I.rows.map(r => r.fecha).sort();
  const desde = addDays(fechas[0], -1), hasta = addDays(fechas[fechas.length - 1], 1);
  const anotadas = S.movs.filter(m => m.cuenta === I.cuenta && m.tipo === 'gasto' && m.fecha >= desde && m.fecha <= hasta);
  const faltanEnArchivo = anotadas.filter(m => !I.rows.some(r => r.monto === m.monto && Math.abs(daysBetween(r.fecha, m.fecha)) <= 3));
  return {desde: fechas[0], hasta: fechas[fechas.length - 1], ya: I.rows.filter(r => r.dup).length, nuevas: I.rows.filter(r => !r.dup).length, faltanEnArchivo};
}
function addImportRows(rows, origen) {
  const valid = new Set(cfg().cats.map(c => c.id));
  for (const x of rows) {
    if (!x || typeof x !== 'object') continue;
    const fecha = parseDateAny(x.fecha); const monto = parseMonto(x.monto);
    if (!fecha || !monto) continue;
    let tipo = ['gasto', 'ingreso', 'transf'].includes(x.tipo) ? x.tipo : 'gasto';
    const desc = String(x.descripcion || x.comercio || 'Movimiento').slice(0, 140).trim();
    const comercio = String(x.comercio || '').slice(0, 80).trim();
    let cat = applyRules(comercio + ' ' + desc) || (valid.has(x.categoria) ? x.categoria : null);
    const co = catObj(cat);
    if (!cat || (tipo !== 'transf' && co && (co.t || 'gasto') !== tipo)) cat = tipo === 'ingreso' ? 'otros_ing' : 'otros';
    const r = {k: uid() + Math.random().toString(36).slice(2, 5), sel: true, fecha, desc, comercio, monto, tipo, cat, cuota: x.cuota ? String(x.cuota).slice(0, 8) : null, origen};
    const key = merchantKey(comercio || desc);
    const dup = S.movs.find(m => m.monto === monto && Math.abs(daysBetween(m.fecha, fecha)) <= 3 && (m.ref || sameMerchant(merchantKey(m.comercio || m.desc), key) || (S.imp.cuenta && m.cuenta === S.imp.cuenta && Math.abs(daysBetween(m.fecha, fecha)) <= 1)))
      || S.imp.rows.find(o => o.monto === monto && o.fecha === fecha && merchantKey(o.comercio || o.desc) === key);
    if (dup) { r.dup = `${dup.desc} · ${dShort(dup.fecha)}`; r.sel = false; }
    S.imp.rows.push(r);
  }
  if (fixCuotaDates()) recheckDups();
  S.imp.rows.sort((a, b) => b.fecha.localeCompare(a.fecha));
}
async function saveImport() {
  const sel = S.imp.rows.filter(r => r.sel && r.monto > 0); if (!sel.length) return;
  if (!S.imp.cuenta) {
    toast('Elige la tarjeta o cuenta de estos movimientos antes de guardar.');
    const s = $('#imp-cuenta'); if (s) { s.scrollIntoView({block:'center'}); s.focus(); }
    return;
  }
  S.imp.busy = true; S.imp.status = 'Guardando…'; render();
  const I = S.imp;
  const ok = await w(async () => {
    for (let i = 0; i < sel.length; i += 10) await Promise.all(sel.slice(i, i + 10).map(r => S.db.collection('movs').doc(uid() + i + Math.random().toString(36).slice(2, 5)).set(movDoc({fecha: r.fecha, monto: r.monto, tipo: r.tipo, desc: r.desc, comercio: r.comercio, cat: r.tipo === 'transf' ? '' : r.cat, cuenta: I.cuenta, quien: I.quien, comp: r.tipo === 'gasto' && !!I.comp, origen: r.origen || 'cartola', ...(r.cuota ? {cuota: r.cuota} : {}), ...(r.fechaCompra ? {fechaCompra: r.fechaCompra} : {})}))));
  });
  if (ok) {
    const learned = sel.filter(r => r.catUser && r.tipo !== 'transf');
    if (learned.length) {
      let reglas = [...cfg().reglas];
      for (const r of learned) { const k = merchantKey(r.comercio || r.desc); if (k.length < 3) continue; reglas = reglas.filter(x => norm(x.p) !== k); reglas.unshift({p: k, c: r.cat}); }
      await saveConfig({reglas: reglas.slice(0, 400)});
    }
    toast(`${sel.length} movimientos guardados`);
    S.imp.rows = S.imp.rows.filter(r => !r.sel);
  }
  S.imp.busy = false; S.imp.status = ''; render();
}

