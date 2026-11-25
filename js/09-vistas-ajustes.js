'use strict';
function copyBox(id, text) {
  return `<div class="row" style="flex-wrap:nowrap"><input id="${id}" type="text" readonly value="${esc(text)}" style="flex:1;font-size:.8rem" aria-label="Texto para copiar"><button class="btn sm" type="button" data-act="copiar" data-v="${esc(text)}">Copiar</button></div>`;
}
function iphoneGuide() {
  return `<div class="steps">
    <div class="step"><b>1. Atajo "Anotar gasto"</b>
      <span class="small">En la app Atajos toca <b>+</b>, agrega la acción <b>Abrir URL</b> y pega este enlace:</span>${copyBox('ip-u1', ARTIFACT_URL + '#anotar')}
      <span class="small">Ponle de nombre "Anotar gasto". Después puedes decir <b>"Oye Siri, anotar gasto"</b>, dejarlo en la pantalla de inicio (Compartir → Agregar a pantalla de inicio) o asignarlo a <b>Tocar atrás</b> (Ajustes → Accesibilidad → Tocar → Tocar atrás).</span></div>
    <div class="step"><b>2. Anotar hablando con Siri</b>
      <span class="small">Crea otro atajo con estas acciones, en orden:</span>
      <span class="small">a) <b>Dictar texto</b>.<br>b) <b>Reemplazar texto</b>: activa "Expresión regular", busca lo de abajo y reemplaza por un guion (-):</span>${copyBox('ip-r1', '[^A-Za-z0-9]+')}
      <span class="small">c) <b>Texto</b>: pega esto y al final inserta la variable "Texto actualizado":</span>${copyBox('ip-u2', ARTIFACT_URL + '#g-')}
      <span class="small">d) <b>Abrir URL</b> con ese texto.</span>
      <span class="small">e) Ponle de nombre <b>Quiero agregar un nuevo gasto</b>. Dices <b>"Oye Siri, quiero agregar un nuevo gasto"</b>, luego por ejemplo "doce lucas en el jumbo con la ripley", y se abre la app con el gasto listo para guardar.</span></div>
    <div class="step"><b>3. Automático al pagar con Apple Pay</b>
      <span class="small">Solo si la tarjeta está en Wallet y pagan con el iPhone o el reloj. En Atajos → Automatización → <b>Transacción</b>, elige las tarjetas y "Ejecutar de inmediato". Acciones:</span>
      <span class="small">a) <b>Texto</b> con las variables Comercio, Importe y Tarjeta.<br>b) <b>Reemplazar texto</b> de <code>[.,$]</code> por nada (con expresión regular).<br>c) <b>Reemplazar texto</b> de <code>[^A-Za-z0-9]+</code> por un guion.<br>d) <b>Texto</b>: el enlace del paso 2 más el resultado.<br>e) <b>Abrir URL</b>.</span>
      <span class="small">Al pagar se abre la app con la compra escrita; revisas y tocas Guardar.</span></div>
  </div>
  <p class="hint">La primera vez que se abra el enlace puede pedirte iniciar sesión en claude.ai. Si el enlace abre la app de Claude en vez de Safari y no muestra la página, mantén presionado el enlace y elige "Abrir en Safari".</p>`;
}
function vAjustes() {
  const c = cfg();
  const ps = personas();
  return `<div class="grid">
    <section class="card span2"><div class="card-h"><h2>Personas del hogar</h2></div>
      <p class="small muted">Cada persona tiene su nombre en la app aunque usen la misma cuenta de Claude. En cada celular o computador se elige quién lo usa.</p>
      <div class="list">${ps.map(p => `<div class="li">${avatar(p.id)}<div class="main"><input type="text" data-pn="${esc(p.id)}" value="${esc(p.n)}" aria-label="Nombre"></div>${isMe(p.id) ? '<span class="chip acc">este dispositivo</span>' : ''}</div>`).join('') || '<p class="small muted">Todavía no hay personas definidas.</p>'}</div>
      <div class="row" style="flex-wrap:nowrap"><input id="pn-new" type="text" placeholder="Agregar persona" style="flex:1" aria-label="Nombre de la nueva persona"><button class="btn sm" type="button" data-act="persona-add">Agregar</button></div>
      ${ps.length ? `<div class="fgrid">
        <label class="field"><span>Este dispositivo es de</span><select id="dev-yo">${ps.map(p => `<option value="${esc(p.id)}"${p.id === S.yo ? ' selected' : ''}>${esc(p.n)}</option>`).join('')}${S.yo && personaOf(S.yo) ? '' : '<option value="" selected>Elegir…</option>'}</select></label>
        ${S.me && S.me.id ? `<label class="field"><span>Lo anotado antes con esta cuenta es de</span><select id="alias-me">${ps.map(p => `<option value="${esc(p.id)}"${aliasOf(S.me.id) === p.id ? ' selected' : ''}>${esc(p.n)}</option>`).join('')}${aliasOf(S.me.id) === S.me.id ? '<option value="" selected>Elegir…</option>' : ''}</select></label>` : ''}
      </div>` : ''}</section>
    <section class="card span2"><div class="card-h"><h2>Categorías</h2><button class="btn sm" type="button" data-act="cat-new">Agregar categoría</button></div>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>Nombre</th><th>Tipo</th><th>Grupo</th><th></th></tr></thead><tbody>
      ${c.cats.map(x => `<tr><td><input type="text" data-catn="${esc(x.id)}" value="${esc(x.n)}" aria-label="Nombre"></td><td>${x.t === 'ingreso' ? 'Ingreso' : 'Gasto'}</td><td>${x.t === 'ingreso' ? '—' : `<select data-catg="${esc(x.id)}" aria-label="Grupo"><option value="necesidad"${x.g === 'necesidad' ? ' selected' : ''}>Necesidad</option><option value="deseo"${x.g === 'deseo' ? ' selected' : ''}>Gusto</option><option value="ahorro"${x.g === 'ahorro' ? ' selected' : ''}>Ahorro</option></select>`}</td><td class="r">${['otros', 'ahorro', 'sueldo', 'otros_ing', 'deudas'].includes(x.id) ? '' : `<button class="btn sm danger" type="button" data-act="cat-del" data-v="${esc(x.id)}">Quitar</button>`}</td></tr>`).join('')}
      </tbody></table></div></section>
    <section class="card"><div class="card-h"><h2>Tarjetas y cuentas</h2><a class="btn sm" href="#tarjetas">Administrar</a></div>
      <p class="small muted">${c.medios.length} medios de pago: ${esc(c.medios.map(m => m.n).join(', '))}.</p></section>
    <section class="card span2"><div class="card-h"><h2>Botón para anotar en el iPhone</h2></div>
      ${iphoneGuide()}</section>
    <section class="card"><div class="card-h"><h2>Preferencias</h2></div>
      <label class="check"><input id="pf-comp" type="checkbox"${c.compDefault ? ' checked' : ''}> Los gastos nuevos son compartidos por defecto</label>
      <div class="row">${S.downloads ? '<button class="btn" type="button" data-act="exportar">Descargar respaldo en CSV</button>' : ''}<button class="btn danger" type="button" data-act="borrar-ej">Borrar datos de ejemplo</button></div></section>
    <section class="card span2"><div class="card-h"><h2>Reglas de categorías</h2><span class="sub">${c.reglas.length} reglas · si la descripción contiene el texto, se usa esa categoría</span></div>
      <details><summary>Ver y editar reglas</summary><div class="list" style="margin-top:8px">${c.reglas.map((r, i) => `<div class="li"><div class="main"><div class="t">${esc(r.p)}</div><div class="m">${esc(catName(r.c))}</div></div><button class="btn sm danger" type="button" data-act="regla-del" data-v="${i}">Quitar</button></div>`).join('')}</div></details></section>
  </div>`;
}

