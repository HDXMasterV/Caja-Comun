# Caja Común

App web de finanzas del hogar (dos personas, Chile, pesos CLP) publicada como Artifact de claude.ai:
**https://claude.ai/artifact/5jmt1fk1VGtxwUiL2fvmsk**. Siempre publicar sobre esa URL: los atajos del iPhone apuntan a ella.

## Plan
El orden de trabajo y lo pendiente están en `PLAN.md`. Al empezar una sesión, revisar en qué fase vamos; al terminar, marcar lo hecho.

## Reglas
- Responder y escribir la interfaz en español de Chile. Montos con formato `$12.990`.
- Los datos reales viven en la base de datos del artifact (capacidad `db`), nunca en este repositorio. No agregar estados de cuenta, cartolas, respaldos CSV ni capturas al repo (ver `.gitignore`).
- Para un cambio, leer solo los archivos que tocan esa sección (mapa abajo), no todo el proyecto.

## Estructura
- `index.html`: marcado base y orden de carga de los scripts. Sin `<!doctype>`, `<html>` ni `<body>` (los pone el publicador).
- `css/app.css`: estilos y tokens de color (claro y oscuro).
- `js/`: scripts clásicos (no módulos) que comparten el ámbito global y se cargan en orden:
  - `01-base.js`: utilidades, valores por defecto (categorías, reglas, medios de pago), estado `S`, `cfg()`, personas.
  - `02-calculos.js`: totales por mes `st()`, pendientes, disponible por día, deudas, detección de suscripciones/duplicados/cuotas, ciclos de tarjetas `cardCycle()`/`cardInfo()`, `alertas()`.
  - `03-ui.js`: escritura `w()`, `saveConfig()`, `toast()`, modal, formulario de movimiento, `learnRule()`.
  - `04-anotar.js`: anotar rápido (parser local `quickLocal`, Claude `quickClaude`, `quickAdd`).
  - `05-graficos.js`: gráficos SVG, tooltip y markdown mínimo `md()`.
  - `06-vistas-inicio.js`: Inicio, Movimientos, Importar.
  - `07-vistas-tarjetas.js`: Tarjetas, formulario de medio de pago, pago de tarjeta.
  - `08-vistas-plan.js`: Presupuesto, Pagos fijos, Deudas (simulador), Metas, Entre nosotros, Asesor.
  - `09-vistas-ajustes.js`: Ajustes y guía de Atajos del iPhone.
  - `10-render-eventos.js`: `render()`, rutas por hash, acciones `ACT`, eventos, pagos y pagos fijos automáticos.
  - `11-importar.js`: lectura de Excel/CSV/PDF/imágenes, extracción con Claude, duplicados, cuadratura.
  - `12-claude.js`: contexto para Claude, análisis del mes, propuesta de presupuesto, chat del asesor.
  - `13-arranque.js`: conexión con `claude.use(...)` y suscripciones a la base de datos; llama `boot()`.
- `tools/mock.js` y `tools/probar.ps1`: prueba local con datos simulados.

## Datos (capacidad db)
- `config/main`: `cats`, `reglas` ({p, c}), `medios` (tarjetas/cuentas: id, n, tipo, alias, adicional, titular, cierre, pago, cupo, usa = persona dueña), `personas` ({id, n}), `alias` ({idCuentaClaude: idPersona}), `miembros`, `reparto`, `ingresoMensual`, `ahorroMensual`, `compDefault`, `okDup`.
- **Personas:** Victor y Carol usan la misma cuenta de Claude, así que las personas no salen de la cuenta: están en `config.personas` y cada dispositivo elige quién es (`localStorage` "cc-yo", función `yo()`). `quien` en los datos es el id de persona (`victor`, `carol`); los ids de cuenta antiguos se traducen con `config.alias` al cargar (`remap()`).
- `movs/*`: fecha, monto (entero positivo), tipo (`gasto`|`ingreso`|`transf`|`liq`), desc, comercio, cat, cuenta (nombre del medio), quien (id de usuario), comp, origen, ref (pagos: `r:`, `d:`, `t:`), cuota, ej (ejemplo).
- `recs/*` pagos fijos, `deudas/*`, `metas/*`. Datos de ejemplo llevan `ej: true`.
- Rutas por hash: `#anotar` y `#g-texto-con-guiones` abren el registro rápido (usado por Atajos del iPhone).

## Probar
```
powershell -ExecutionPolicy Bypass -File tools\probar.ps1
```
Abrir http://localhost:8765/ (en el navegador del panel). Revisar la consola sin errores y que no haya scroll horizontal.

## Publicar
Artifact tool, `action: publish`, `url` = la URL de arriba, `file_path` = `index.html` de esta carpeta, y `files` con cada archivo a su misma ruta publicada (`css/app.css`, `js/01-base.js` … `js/13-arranque.js`). No publicar `tools/`, `CLAUDE.md` ni `.gitignore`.
Capacidades (solo si cambian): `{"db": {}, "user": {"scopes": ["profile"]}, "sample": {"images": true}, "downloads": true, "dictation": {}}`.
