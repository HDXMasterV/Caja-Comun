# Plan de trabajo de Caja Común

Orden acordado el 2026-11-25. Se trabaja una fase a la vez; cada fase termina cuando se cumple su "Listo cuando".
Marcar con `[x]` lo terminado y subir el cambio a GitHub al cerrar cada sesión.

---

## Fase 0: Ponerla en marcha de verdad

Hasta ahora la app solo se probó en el computador con datos simulados. Antes de agregar cosas hay que usarla con datos reales y corregir lo que falle en claude.ai y en los iPhone.

- [x] Abrir la app en claude.ai, aceptar los permisos (Claude, dictado, descargas) y revisar que cargue sin errores.
- [x] Borrar los datos de ejemplo.
- [x] Registrar las tarjetas y cuentas reales en **Tarjetas** (la adicional con su titular, cierre, pago y cupo).
- [x] Cargar los pagos fijos reales: arriendo (incluye cuentas básicas, solo Victor) y suscripciones de Banco Ripley Carito. Los sueldos son variables y se anotan el último día hábil (hay aviso).
- [x] ~~Compartir la página con la pareja~~: Victor y Carol usan la misma cuenta de Claude; cada dispositivo elige "Soy Victor / Soy Carol".
- [ ] Carol abre la app en su iPhone, elige "Soy Carol" y arma sus atajos.
- [x] iPhone de Victor: atajo de voz "Gasto" (`#g-…`) funcionando (2026-11-25).
- [ ] iPhone de Victor: atajo "Anotar gasto" (`#anotar`).
- [x] Importar un estado de cuenta real (Banco Ripley, 111 movimientos) y revisar categorías y duplicados.
- [x] Historial Banco Ripley Carito cargado (2026-11-25): 18 estados de cuenta de may-2024 a oct-2026, 1.649 movimientos con id `rip0001`…`rip1649` y `origen: "cartola"`, cuadrados con los subtotales del banco. Lector: `estados/leer_ripley.py` (fuera del repo). Faltan los estados de jun–nov 2024 y feb–jul 2026. Se agregó de vuelta la categoría Transporte.
- [x] Cargos Mercado Pago a Carol y Victor ("MERPAGO*CAROLGABRIEL", "MERPAGO*VICTORMANUEL"): son retiros de efectivo que se pagan con la tarjeta: gasto compartido en la categoría nueva "Retiros de efectivo" (`cat: "retiros"`, `comp: true`), 94 movimientos. La tarjeta la usan solo ellos aunque la titular sea otra persona; si la titular hace una compra, la reasignan a mano.
- [ ] Anotar todo lo que falle o moleste en la lista de "Problemas encontrados" de abajo.

**Listo cuando:** los dos pueden anotar desde el iPhone y una semana de gastos reales queda bien registrada.

## Fase 1: Base segura para trabajar desde dos equipos

Para que las mejoras no rompan lo que ya funciona, sobre todo trabajando en la oficina y en la casa.

- [ ] Instalar Node.js y Playwright (solo para pruebas; nunca para entrar a bancos).
- [ ] Pruebas automáticas con los datos simulados: cada sección carga sin errores; anotar rápido entiende frases típicas ("12 lucas jumbo con la cmr"); importar un CSV de ejemplo; detectar duplicados; ciclo de cierre y pago de tarjetas.
- [ ] Revisar celular y escritorio en las pruebas (sin scroll horizontal).
- [ ] Rutina fija: al empezar "trae los últimos cambios", al terminar "prueba, publica, guarda y sube".

**Listo cuando:** un solo comando corre todas las pruebas y pasan antes de cada publicación.

## Fase 2: Que los datos no se pierdan ni se pisen

- [ ] Guardar tarjetas, reglas y categorías como documentos separados para que dos personas editando a la vez no se pisen los cambios (hoy todo va en `config/main`).
- [x] Ver movimientos de más de 12 meses (2026-11-25): se carga todo el historial y el nombre del mes abre un selector de año y mes. Si con los años la carga se pone lenta, volver a cargar por rangos.
- [ ] Respaldo mensual en CSV con recordatorio.
- [ ] Arreglar que la pantalla de fondo quede en "Cargando…" mientras hay una ventana abierta.
- [ ] Seleccionar varios movimientos para cambiar categoría o borrarlos de una vez.

**Listo cuando:** dos personas pueden usar la app al mismo tiempo sin perder cambios y hay respaldo.

## Fase 3: Mejoras del día a día

- [ ] Gastos favoritos: botones de un toque para lo que se repite (café, Uber, pan).
- [ ] Recordatorio diario en el iPhone (automatización de Atajos por hora: "¿Anotaron los gastos de hoy?" con el enlace).
- [ ] Cuenta con la titular de la tarjeta adicional: cuánto le deben acumulado y historial de pagos.
- [ ] Resumen semanal hecho por Claude (qué gastaron, qué viene, alertas).
- [ ] Ajustes según lo anotado en "Problemas encontrados".

**Listo cuando:** anotar un gasto toma menos de 10 segundos y no se olvidan de hacerlo.

## Fase 4: Subida de boletas (al final, según lo acordado)

- [ ] Botón que abre la **cámara directo** en el iPhone.
- [ ] Varias boletas en una subida (por ejemplo, las del fin de semana).
- [ ] Si la boleta coincide con un gasto ya anotado (mismo monto y fecha cercana), **asociarla** en vez de duplicarla.
- [ ] Evaluar leer el **timbre electrónico** (código de barras PDF417) de las boletas chilenas, que trae monto total, fecha y RUT del emisor exactos, sin depender de que Claude lea la foto.
- [ ] Decidir si guardar la foto (útil para garantías y devoluciones) o solo los datos. Guardar fotos ocupa espacio y quedan en la nube de Claude.
- [ ] Estado de cuenta mensual de la adicional: subirlo en un paso desde Tarjetas → Cuadrar.

**Listo cuando:** una boleta queda registrada con una foto y un toque, sin duplicados.

---

## Rediseño visual (acordado y aplicado 2026-11-25, versión 13)

- [x] Paleta Grafito y ámbar con modo oscuro, menú lateral en el computador y barra inferior con "+" y "Más" en el celular.
- [x] Panel tipo Power BI con filtros por persona y tarjeta (los ingresos cuentan el sueldo del último día hábil anterior, igual que "pueden gastar hoy").
- [x] Movimientos: lista sin totales por día, ícono de color por categoría y panel de detalle (cambiar categoría, persona y reparto ahí mismo; presupuesto de la categoría; historial del comercio en 6 meses). En celular y pantallas angostas, tocar un movimiento abre el editor.
- [ ] Revisarlo con datos reales en claude.ai y en los iPhone.

## Correcciones pedidas después del rediseño (2026-11-25)

- [ ] **Cuotas que vienen en meses futuros.** Al avanzar a diciembre (o a cualquier mes siguiente) deben aparecer las cuotas pendientes de ese mes: las de compras en cuotas de los estados de cuenta (ej. "cuota 3/6" → la 4/6 cae en el mes siguiente) y las de Deudas y cuotas, como pagos por venir en el Panel y en Movimientos.
- [ ] **Sin división de gastos.** Victor y Carol funcionan como una sola cuenta: quitar "Entre nosotros" (quién le debe a quién), la marca "compartido", el reparto y el filtro "Compartidos". Mantener solo quién hizo cada gasto, como dato informativo.
- [ ] **Diseño elegido para el Panel (maqueta aprobada 2026-11-25, pendiente de aplicar):** estilo Binance con la paleta Grafito y ámbar (claro y oscuro) y el menú lateral actual.
  - Fuente IBM Plex Sans con números tabulares.
  - Fila de 4 indicadores pegados ("Pueden gastar hoy" destacado en grafito con número ámbar; gastado, ingresos y % sin gastar), cada uno con su variación vs el mes anterior con signo y porcentaje (ej. "+12,40 % vs oct").
  - Colores de variación: gasto que sube en rojo ladrillo (`--crit-ink`), que baja en verde oliva (`--good-ink`). En movimientos, cargos en rojo con "−" y abonos en verde con "+".
  - Gráfico principal "Gasto diario" con Lightweight Charts: barras grises por día + línea ámbar del promedio de 7 días, cursor con fecha y montos, botones 1M / 3M / 6M.
  - Tabla "Categorías": gastado, variación vs mes anterior y mini gráfico de 6 meses por categoría.
  - Tabla compacta "Últimos movimientos" (día, comercio, monto con signo).
  - Descartado: gráfico de velas del saldo.
- [ ] **Tipografía al estilo Binance.** Binance usa su fuente propia (BinancePlex), que no se puede copiar a la app; la alternativa libre es **IBM Plex Sans**, en la que se basa, con números tabulares. Revisar también cómo muestran los símbolos (+/−, %, $) y los colores de subida/bajada.
- [ ] **Gráficos al estilo Binance.** Usan gráficos de TradingView; la versión libre es **Lightweight Charts** (licencia Apache 2.0), que se puede cargar desde cdnjs. Evaluar usarla para la evolución de ingresos y gastos (línea o área con cursor y tooltip) en vez de los gráficos SVG hechos a mano.

- Computador: menú lateral oscuro con "Anotar" arriba; secciones Panel, Gastos, Tarjetas, Plan (presupuesto, fijos, deudas, metas), Entre nosotros, Asesor, Ajustes. Celular: barra inferior de 5 con "+" al centro.
- Inicio como panel tipo Power BI: filtros (mes, persona, tarjeta), 4 indicadores (pueden gastar hoy, gastado vs mes anterior, ingresos, % ahorro), barras ingresos/gastos por mes, dona por categoría, gasto por persona, tarjetas y top comercios.
- Paleta elegida: **Grafito y ámbar** (gris oscuro #2C2C2A/#444441, ámbar #BA7517/#EF9F27, resalte #FAEEDA/#633806), con modo oscuro.
- Descartado: gráfico de gasto acumulado vs presupuesto.

## Descartado por ahora

- **Leer avisos del banco por correo:** los avisos de la tarjeta adicional le llegan a la titular. Se puede retomar si ella reenvía solo esos avisos con un filtro.
- **Playwright para entrar al banco:** requiere guardar claves (incluidas las de la titular), choca con la clave dinámica y con las condiciones de uso de los bancos.
- **Conexión directa con bancos (Finanzas Abiertas):** la CMF la aplazó a 2027. Revisar cuando esté funcionando.

## Problemas encontrados

(Anotar aquí lo que falle durante la Fase 0 y después.)

- [x] **2026-11-25 · Importar deja guardar sin elegir tarjeta.** Se subió el estado de cuenta de Banco Ripley (111 movimientos) con "Cuenta o tarjeta" vacío; se corrigió a mano a "Banco Ripley Carito". Arreglado: ahora detecta la tarjeta por el banco del documento y no deja guardar sin tarjeta.
- [x] **2026-11-25 · Las cuotas del estado de cuenta quedan con la fecha de la compra original.** Arreglado: al importar con una tarjeta de crédito, las cuotas de compras anteriores al período se fechan en el cierre. Ej.: "MP *MERCADO LIBR cuota 10/12" quedó en febrero y "RIPLEY CUOTA REPROG. 10/10" ($286.138) también en febrero. Así se cuentan en meses pasados y no en el estado de cuenta actual. Arreglo: en estados de cuenta, fechar las cuotas en el período facturado. Datos ya corregidos: 25 cuotas movidas al 2026-11-18 (cierre), con la fecha original guardada en `fechaCompra`. Falta corregir la importación.
- [ ] **2026-11-25 · La regla "ripley" manda todo a Ropa,** incluidas compras de Ripley que no son ropa (sábanas). Revisar reglas de tiendas por departamento.
