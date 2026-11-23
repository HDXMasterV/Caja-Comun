'use strict';
function vTarjetas() {
  const ms = cfg().medios;
  const infos = ms.map(c => ({c, i: cardInfo(c)}));
  const porPagar = sum(infos.filter(x => x.i.cy && !x.i.pagada).map(x => x.i.facturado));
  const enCurso = sum(infos.filter(x => x.i.cy).map(x => x.i.actual));
  return `<div class="grid">
    <section class="card span2"><div class="card-h"><h2>Tarjetas y cuentas</h2><button class="btn sm pri" type="button" data-act="medio-new">Agregar</button></div>
      <div class="stat3"><div class="stat"><span class="lbl">Estados de cuenta por pagar</span><b class="num">${fmt(porPagar)}</b></div><div class="stat"><span class="lbl">Gastado en períodos abiertos</span><b class="num">${fmt(enCurso)}</b></div><div class="stat"><span class="lbl">Medios de pago</span><b class="num">${ms.length}</b></div></div>
      <p class="hint">Para las tarjetas de crédito indica el día de cierre (facturación) y el día de pago. Así la app sabe qué compras entran en cada estado de cuenta y te avisa antes del vencimiento.</p></section>
    ${infos.map(({c, i}) => `<section class="card"><div class="card-h"><h3>${esc(c.n)}</h3><button class="btn sm ghost" type="button" data-act="medio-edit" data-v="${esc(c.id)}">Editar</button></div>
      <div class="row small"><span class="chip">${esc(TIPO_MEDIO[c.tipo] || 'Otro')}</span>${c.adicional ? `<span class="chip acc">Adicional · titular ${esc(c.titular || 'otra persona')}</span>` : ''}${c.alias ? `<span class="chip">reconoce: ${esc(c.alias)}</span>` : ''}</div>
      ${i.cy ? `<div class="stat3">
          <div class="stat"><span class="lbl">Período actual</span><b class="num">${fmt(i.actual)}</b><span class="small muted">cierra el ${esc(dShort(i.cy.prox))}</span></div>
          <div class="stat"><span class="lbl">Último estado</span><b class="num">${fmt(i.facturado)}</b><span class="small muted">${i.cy.venc ? 'vence el ' + esc(dShort(i.cy.venc)) : 'cerró el ' + esc(dShort(i.cy.ult))}</span></div>
          <div class="stat"><span class="lbl">Cupo usado aprox.</span><b class="num">${fmt(i.usado)}</b><span class="small muted">${c.cupo ? 'de ' + fmt(c.cupo) : 'incluye cuotas futuras'}</span></div></div>
        ${c.cupo ? `<div class="track" role="img" aria-label="Cupo usado"><div class="fill${i.usado > c.cupo * 0.9 ? ' over' : ''}" style="width:${Math.min(100, i.usado / c.cupo * 100)}%"></div></div>` : ''}
        <div class="row">${i.facturado > 0 ? (i.pagada ? '<span class="pill ok">Estado pagado</span>' : `<button class="btn sm pri" type="button" data-act="card-pay" data-v="${esc(c.id)}">${c.adicional ? 'Le pagamos a la titular' : 'Marcar pagada'}</button>`) : ''}<button class="btn sm" type="button" data-act="cuadrar" data-v="${esc(c.id)}">Cuadrar estado de cuenta</button><button class="btn sm ghost" type="button" data-act="ver-medio" data-v="${esc(c.n)}">Ver movimientos</button></div>`
      : `<div class="stat"><span class="lbl">Gastado en ${esc(ymLabel(curYM()))}</span><b class="num">${fmt(i.actual)}</b></div>
        <div class="row">${c.tipo === 'credito' ? '<span class="small muted">Agrega el día de cierre para ver los estados de cuenta.</span>' : `<button class="btn sm" type="button" data-act="cuadrar" data-v="${esc(c.id)}">Cuadrar cartola</button>`}<button class="btn sm ghost" type="button" data-act="ver-medio" data-v="${esc(c.n)}">Ver movimientos</button></div>`}
      ${c.adicional ? `<p class="hint">Los avisos y el estado de cuenta le llegan a ${esc(c.titular || 'la titular')}. Pídanle el estado de cuenta (PDF o foto) cada mes y súbanlo con "Cuadrar" para ver qué faltó anotar.</p>` : ''}
    </section>`).join('')}
  </div>`;
}
function medioForm(c) {
  const nuevo = !c;
  c = c || {id:'', n:'', tipo:'credito', alias:'', adicional:false, titular:'', cierre:'', pago:'', cupo:0};
  openModal(nuevo ? 'Nueva tarjeta o cuenta' : 'Editar ' + c.n, `
    <form id="tf" class="fgrid" autocomplete="off">
      <label class="field full"><span>Nombre</span><input id="tf-n" type="text" value="${esc(c.n)}" placeholder="Ej: CMR Falabella, Visa Santander, Cuenta RUT" required></label>
      <label class="field"><span>Tipo</span><select id="tf-t">${Object.entries(TIPO_MEDIO).map(([k, v]) => `<option value="${k}"${c.tipo === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field"><span>Palabras para reconocerla</span><input id="tf-a" type="text" value="${esc(c.alias || '')}" placeholder="Ej: cmr falabella"></label>
      <div class="full fgrid" id="tf-cred"${c.tipo === 'credito' ? '' : ' hidden'}>
        <label class="field"><span>Día de cierre (facturación)</span><input id="tf-c" type="number" min="1" max="31" value="${esc(c.cierre || '')}" placeholder="Ej: 20"></label>
        <label class="field"><span>Día de pago</span><input id="tf-p" type="number" min="1" max="31" value="${esc(c.pago || '')}" placeholder="Ej: 5"></label>
        <label class="field"><span>Cupo total (opcional)</span><input id="tf-cu" type="text" inputmode="numeric" value="${c.cupo ? fmtN(c.cupo) : ''}" placeholder="$0"></label>
      </div>
      <label class="check full"><input id="tf-ad" type="checkbox"${c.adicional ? ' checked' : ''}> Es una tarjeta adicional (la titular es otra persona)</label>
      <label class="field full" id="tf-ti-w"${c.adicional ? '' : ' hidden'}><span>Nombre de la titular</span><input id="tf-ti" type="text" value="${esc(c.titular || '')}" placeholder="Ej: Mamá de Pía"></label>
      <p class="hint full">El cierre y el pago salen en el estado de cuenta ("fecha de facturación" y "pagar hasta").</p>
      <div class="full row">${nuevo ? '' : '<button type="button" class="btn danger" id="tf-del">Quitar</button>'}<span class="sp"></span><button type="button" class="btn" data-act="cerrar">Cancelar</button><button class="btn pri" type="submit">Guardar</button></div>
    </form>`, sh => {
    bindMonto($('#tf-cu', sh));
    $('#tf-t', sh).onchange = e => { $('#tf-cred', sh).hidden = e.target.value !== 'credito'; };
    $('#tf-ad', sh).onchange = e => { $('#tf-ti-w', sh).hidden = !e.target.checked; };
    const del = $('#tf-del', sh);
    if (del) del.onclick = async () => { if (del.dataset.c !== '1') { del.dataset.c = '1'; del.textContent = 'Toca otra vez (los movimientos se mantienen)'; return; } if (await saveConfig({medios: cfg().medios.filter(m => m.id !== c.id)})) closeModal(); };
    $('#tf', sh).onsubmit = async e => {
      e.preventDefault();
      const n = $('#tf-n', sh).value.trim(); if (!n) return;
      if (cfg().medios.some(m => m.n === n && m.id !== c.id)) { toast('Ya existe una con ese nombre.'); return; }
      const o = {id: c.id || 'm' + uid(), n, tipo: $('#tf-t', sh).value, alias: norm($('#tf-a', sh).value), adicional: $('#tf-ad', sh).checked, titular: $('#tf-ti', sh).value.trim(), cierre: Number($('#tf-c', sh).value) || 0, pago: Number($('#tf-p', sh).value) || 0, cupo: parseMonto($('#tf-cu', sh).value)};
      const medios = nuevo ? [...cfg().medios, o] : cfg().medios.map(m => m.id === c.id ? o : m);
      if (!(await saveConfig({medios}))) return;
      if (!nuevo && c.n !== n) {
        const afect = S.movs.filter(m => m.cuenta === c.n);
        await w(async () => { for (let i = 0; i < afect.length; i += 8) await Promise.all(afect.slice(i, i + 8).map(m => S.db.doc('movs/' + m.id).update({cuenta: n}))); });
      }
      toast('Guardado'); closeModal();
    };
  });
}
function cardPayForm(c) {
  const i = cardInfo(c); if (!i.cy) return;
  openModal(c.adicional ? `Pago a ${c.titular || 'la titular'}` : `Pagar ${c.n}`, `
    <form id="cp" class="fgrid" autocomplete="off">
      <p class="small muted full">Estado de cuenta que cerró el ${esc(dShort(i.cy.ult))}${i.cy.venc ? `, vence el ${esc(dShort(i.cy.venc))}` : ''}. Las compras ya se contaron como gasto; este pago queda como traspaso para no contarlo dos veces.</p>
      <label class="field"><span>Monto pagado</span><input id="cp-m" type="text" inputmode="numeric" value="${fmtN(i.facturado)}"></label>
      <label class="field"><span>Pagado desde</span><select id="cp-d">${cuentaOptions('')}</select></label>
      <label class="field"><span>Pagó</span><select id="cp-q">${memberOptions((S.me && S.me.id) || '')}</select></label>
      <div class="full row"><span class="sp"></span><button type="button" class="btn" data-act="cerrar">Cancelar</button><button class="btn pri" type="submit">Registrar pago</button></div>
    </form>`, sh => {
    bindMonto($('#cp-m', sh));
    $('#cp', sh).onsubmit = async e => {
      e.preventDefault(); const monto = parseMonto($('#cp-m', sh).value); if (!monto) return;
      const ok = await w(() => S.db.doc(`movs/pago-t-${c.id}-${i.cy.ult}`).set(movDoc({fecha: todayISO(), monto, tipo:'transf', desc: c.adicional ? `Pago a ${c.titular || 'titular'} por ${c.n}` : `Pago ${c.n}`, comercio: c.n, cat:'', cuenta: $('#cp-d', sh).value, quien: $('#cp-q', sh).value, comp: false, origen:'pago', ref: i.key})), 'Pago registrado');
      if (ok) closeModal();
    };
  });
}
