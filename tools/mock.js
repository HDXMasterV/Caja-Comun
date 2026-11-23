// Mock local de window.claude para probar el render sin claude.ai
(function () {
  const store = {
    recs: [
      {id:'ej-arriendo', tipo:'gasto', nombre:'Arriendo', monto:520000, frec:'mensual', dia:5, cat:'vivienda', quien:'ej-a', auto:true, comp:true, activo:true, desde:'2026-09', ej:true},
      {id:'ej-netflix', tipo:'gasto', nombre:'Netflix', monto:9990, frec:'mensual', dia:12, cat:'suscripciones', quien:'ej-b', auto:true, sus:true, comp:true, activo:true, desde:'2026-09', ej:true},
      {id:'ej-entel', tipo:'gasto', nombre:'Entel internet hogar', monto:24990, frec:'mensual', dia:28, cat:'telecom', quien:'ej-b', auto:false, comp:true, activo:true, desde:'2026-09', ej:true},
      {id:'ej-sueldo-a', tipo:'ingreso', nombre:'Sueldo A', monto:1450000, frec:'mensual', dia:30, cat:'sueldo', quien:'ej-a', auto:true, activo:true, desde:'2026-09', ej:true},
    ],
    deudas: [
      {id:'ej-notebook', tipo:'cuotas', nombre:'Notebook', cuota:54990, total:12, primera:'2026-06', dia:10, tasa:0, quien:'ej-b', comp:true, ej:true},
      {id:'ej-consumo', tipo:'credito', nombre:'Crédito de consumo', cuota:185000, total:36, primera:'2025-09', dia:15, tasa:1.6, quien:'ej-a', ej:true},
    ],
    metas: [{id:'ej-emergencia', nombre:'Fondo de emergencia', objetivo:3000000, ahorrado:850000, limite:'2027-12', aportes:[{f:'2026-10-30', m:200000, q:'ej-b'}], ej:true}],
    movs: [
      {id:'a1', fecha:'2026-10-05', monto:520000, tipo:'gasto', desc:'Arriendo', cat:'vivienda', quien:'ej-a', comp:true, ref:'r:ej-arriendo:2026-10', ej:true},
      {id:'a2', fecha:'2026-10-30', monto:1450000, tipo:'ingreso', desc:'Sueldo A', cat:'sueldo', quien:'ej-a', ref:'r:ej-sueldo-a:2026-10', ej:true},
      {id:'a3', fecha:'2026-10-15', monto:4290, tipo:'gasto', desc:'YouTube Premium', comercio:'YouTube Premium', cat:'suscripciones', quien:'ej-a', ej:true},
      {id:'a4', fecha:'2026-11-15', monto:4290, tipo:'gasto', desc:'YouTube Premium', comercio:'YouTube Premium', cat:'suscripciones', quien:'ej-a', ej:true},
      {id:'a5', fecha:'2026-11-15', monto:14990, tipo:'gasto', desc:'PedidosYa', comercio:'PedidosYa', cat:'comida', quien:'ej-a', comp:true, ej:true},
      {id:'a6', fecha:'2026-11-15', monto:14990, tipo:'gasto', desc:'PedidosYa', comercio:'PedidosYa', cat:'comida', quien:'ej-a', comp:true, ej:true},
      {id:'a7', fecha:'2026-11-02', monto:104300, tipo:'gasto', desc:'Jumbo', comercio:'Jumbo', cat:'super', quien:'ej-a', comp:true, ej:true},
      {id:'a8', fecha:'2026-11-12', monto:81990, tipo:'gasto', desc:'Lider', comercio:'Lider', cat:'super', quien:'ej-b', comp:true, ej:true},
      {id:'a9', fecha:'2026-11-19', monto:33330, tipo:'gasto', desc:'Falabella sillón cuota 1/3', comercio:'Falabella sillón', cat:'hogar', cuota:'1/3', quien:'ej-a', comp:true, ej:true},
    ],
  };
  const snapOf = arr => ({docs: arr.map(o => { const {id, ...d} = o; return {id, exists:true, data: () => d, metadata:{fromCache:false}}; }), metadata:{fromCache:false}});
  const coll = name => {
    const q = {where: () => q, orderBy: () => q, limit: () => q, onSnapshot: (cb) => { setTimeout(() => cb(snapOf(store[name] || [])), 50); return () => {}; }, doc: id => docRef(name + '/' + id)};
    return q;
  };
  const docRef = path => ({path, onSnapshot: cb => { setTimeout(() => cb({exists:false, data: () => undefined, metadata:{fromCache:false}}), 30); return () => {}; }, set: async d => console.log('SET', path, d), update: async d => console.log('UPDATE', path, d), delete: async () => console.log('DEL', path)});
  const db = {collection: coll, doc: docRef};
  const user = {me: async () => ({id:'u_me', name:'Prueba Local', avatarUrl:'', color:'#888', email:null, isOwner:true, canEdit:true}), can: async () => true, profiles: async ids => Object.fromEntries((Array.isArray(ids) ? ids : [ids]).map(i => [i, {id:i, name: i === 'u_me' ? 'Prueba Local' : '', avatarUrl:''}]))};
  window.claude = {use: async n => n === 'db' ? db : n === 'user' ? user : null};
})();
