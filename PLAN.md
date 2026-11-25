# Plan de trabajo de Caja Común

Orden acordado el 2026-11-25. Se trabaja una fase a la vez; cada fase termina cuando se cumple su "Listo cuando".
Marcar con `[x]` lo terminado y subir el cambio a GitHub al cerrar cada sesión.

---

## Fase 0: Ponerla en marcha de verdad

Hasta ahora la app solo se probó en el computador con datos simulados. Antes de agregar cosas hay que usarla con datos reales y corregir lo que falle en claude.ai y en los iPhone.

- [ ] Abrir la app en claude.ai, aceptar los permisos (Claude, dictado, descargas) y revisar que cargue sin errores.
- [ ] Borrar los datos de ejemplo.
- [ ] Registrar las tarjetas y cuentas reales en **Tarjetas** (la adicional con su titular, cierre, pago y cupo).
- [ ] Cargar los pagos fijos reales (arriendo, cuentas, suscripciones, sueldos).
- [ ] Compartir la página con la pareja como **Colaborador** y confirmar que aparece en "Entre nosotros".
- [ ] Armar el atajo "Anotar gasto" (`#anotar`) en los dos iPhone y probar el de voz (`#g-…`).
- [ ] Importar una cartola real y un estado de cuenta real, y revisar categorías y duplicados.
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
