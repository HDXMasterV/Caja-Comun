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
- [ ] Ver movimientos de más de 12 meses cuando se pidan (hoy se cargan solo los últimos 12).
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

## Descartado por ahora

- **Leer avisos del banco por correo:** los avisos de la tarjeta adicional le llegan a la titular. Se puede retomar si ella reenvía solo esos avisos con un filtro.
- **Playwright para entrar al banco:** requiere guardar claves (incluidas las de la titular), choca con la clave dinámica y con las condiciones de uso de los bancos.
- **Conexión directa con bancos (Finanzas Abiertas):** la CMF la aplazó a 2027. Revisar cuando esté funcionando.

## Problemas encontrados

(Anotar aquí lo que falle durante la Fase 0 y después.)

- [x] **2026-11-25 · Importar deja guardar sin elegir tarjeta.** Se subió el estado de cuenta de Banco Ripley (111 movimientos) con "Cuenta o tarjeta" vacío; se corrigió a mano a "Banco Ripley Carito". Arreglado: ahora detecta la tarjeta por el banco del documento y no deja guardar sin tarjeta.
- [x] **2026-11-25 · Las cuotas del estado de cuenta quedan con la fecha de la compra original.** Arreglado: al importar con una tarjeta de crédito, las cuotas de compras anteriores al período se fechan en el cierre. Ej.: "MP *MERCADO LIBR cuota 10/12" quedó en febrero y "RIPLEY CUOTA REPROG. 10/10" ($286.138) también en febrero. Así se cuentan en meses pasados y no en el estado de cuenta actual. Arreglo: en estados de cuenta, fechar las cuotas en el período facturado. Datos ya corregidos: 25 cuotas movidas al 2026-11-18 (cierre), con la fecha original guardada en `fechaCompra`. Falta corregir la importación.
- [ ] **2026-11-25 · La regla "ripley" manda todo a Ropa,** incluidas compras de Ripley que no son ropa (sábanas). Revisar reglas de tiendas por departamento.
