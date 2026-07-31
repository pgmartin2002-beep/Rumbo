# Diseño de Feature: Rumbo — Onboarding, agenda e interacciones durante el evento

**Ramas**: `001-onboarding-agenda-personalizada` (`spec.md`) y `002-preparar-interacciones-vivir-evento` (`spec-interacciones-y-evento.md`)
**Creada**: 2026-07-30
**Actualizada**: 2026-07-31 — el documento pasa a cubrir las dos specs a la vez. Se añaden las pantallas 5-8 (Preguntas, Ahora, Notas, Personas), correspondientes a las cuatro Historias de Usuario de `spec-interacciones-y-evento.md`, ya maquetadas en `rumbo-mockup.html`. Se mantiene también la pantalla 0 (Mis eventos, Historia 5 de `spec.md`) incorporada en la actualización anterior.
**Estado**: Borrador
**Depende de**: `spec.md` (rama 001) y `spec-interacciones-y-evento.md` (rama 002)
**Alcance**: diseño visual y de interacción de las 9 pantallas del MVP — Mis eventos, Importar, Objetivos, Agenda y Logística (spec 001), más Preguntas, Ahora, Notas y Personas (spec 002). No decide arquitectura, stack ni modelo de datos.
**Nota de numeración**: cada spec numera sus FR de forma independiente, así que este documento indica entre paréntesis a qué spec pertenece un FR siempre que pueda haber ambigüedad — por ejemplo, "FR-001 (spec 001)" frente a "FR-001 (spec 002)".

## Principio de diseño

La app se llama **Rumbo**: la metáfora central es la tarjeta de embarque. Un evento es un viaje con hora de salida, y cada sesión de la agenda es un trayecto con su propio billete. Esta metáfora se eligió porque encaja con la promesa de la spec — "no solo entender el evento, sino aprovecharlo" — y porque las cuatro historias del MVP siguen literalmente el orden de un viaje: facturar (importar), decir a qué vas (objetivos), embarque por prioridad (agenda), y logística de salida (ruta).

Consecuencia directa para el diseño: la clasificación de cada sesión (imprescindible / opcional / descartable, FR-012) no se muestra como una etiqueta de estado genérica, sino como un **sello** — el mismo lenguaje visual que un pasaporte o un billete usan para certificar algo. Esto hace que la prioridad se lea de un vistazo, sin tener que abrir cada sesión para entender por qué está ahí.

La metáfora se extiende un nivel por encima de la agenda: si cada sesión es un billete, cada **evento** es también un billete — de ahí que la pantalla de inicio (Historia 5) no sea una lista genérica, sino una **billetera de tarjetas de embarque**, una por evento. Es la misma pieza visual (`pass`) que ya usa la Agenda, aplicada un nivel arriba: primero eliges qué viaje (evento) haces, luego qué trayecto (sesión) tomas dentro de él.

Las cuatro pantallas de `spec-interacciones-y-evento.md` (Preguntas, Ahora, Notas, Personas) no inventan una metáfora nueva; cubren lo que un viajero hace *durante* el trayecto una vez ya tiene el billete en la mano: repasar el guion antes de la reunión (Preguntas), mirar el panel de puertas de embarque para saber qué toca ahora (Ahora, con el mismo panel oscuro tipo "boarding call" que ya usa `now-board`), y guardar en el bolsillo lo que se recoge por el camino — notas y contactos — para no perderlo (Notas, Personas). Siguen usando los mismos tres colores de acento con el mismo significado que en la agenda: nunca se introduce un cuarto color ni un componente visual sin precedente.

## Sistema de diseño

### Color

| Token | Uso | Valor |
|---|---|---|
| `--ink` | Fondo del dispositivo, texto principal, botones primarios | `#1c2b3f` |
| `--paper` | Fondo de pantalla (símil papel de billete) | `#eeece0` |
| `--card` | Superficie de tarjetas y filas | `#fbfaf4` |
| `--line` | Bordes y divisores | `#d9d4c2` |
| `--muted` | Texto secundario | `#6d6a5b` |
| `--amber-bg` / `--amber-tx` | Sello "Imprescindible", avisos de dato faltante, retraso o hueco de desplazamiento insuficiente | `#f6ddab` / `#7a4c0c` |
| `--teal-bg` / `--teal-tx` | Sello "Opcional", chip de objetivo seleccionado | `#cfe7dc` / `#0e4a3d` |
| `--plum-bg` / `--plum-tx` | Sello "Conflicto", nota de conflicto de horario | `#e9d3e0` / `#5c2649` |

Regla de uso: el color codifica **prioridad de sesión**, nunca jerarquía de marca. Nunca se usan más de tres colores de acento a la vez en una misma pantalla.

Nota de atribución: el mismo ámbar cubre tres situaciones semánticamente emparentadas ("esto necesita tu atención, pero no es un error"): dato faltante (FR-007), sesión con hueco de desplazamiento insuficiente (FR-020) y aviso de retraso/tráfico (FR-021/FR-022). Se reutiliza el mismo token deliberadamente en vez de crear un cuarto color, para no diluir el significado de "atención" en la paleta.

### Tipografía

- **Space Grotesk** (700) — títulos de pantalla, nombre de sesión, hora de salida, wordmark. Da el carácter "panel de salidas" a la app.
- **IBM Plex Sans** (400/500) — todo el texto de lectura: descripciones, filas de importación, chips de objetivos.
- **IBM Plex Mono** (500) — datos que parecen impresos en un billete: horas, franja de fecha, breadcrumb de sección. Nunca se usa para texto de lectura larga.

### Componentes clave

- **Fila de importación** (`import-row`): icono + etiqueta + chevron. Cinco filas fijas, una por canal soportado (FR-001 a FR-005).
- **Tarjeta de vista previa** (`preview-card`): nombre del evento + lista de campos clave/valor. Un campo no extraído se marca con punto ámbar y el texto "Falta esta información" (FR-007), y la tarjeta ofrece "Completar a mano" (FR-008) en vez de bloquear el avance.
- **Chip de objetivo** (`goal-chip`): selección múltiple, estado seleccionado en teal. Cubre las 8 opciones mínimas de FR-010. **Decisión cerrada**: no hay objetivo "principal"; todos los chips seleccionados tienen el mismo peso visual y funcional (FR-010b).
- **Pase de sesión** (`pass`): bloque superior con hora/sala/nombre, línea perforada (con "troqueles" circulares) y bloque inferior con sello de prioridad + motivo en lenguaje llano (FR-013).
- **Nota de conflicto** (`conflict-note`): franja plum bajo el pase afectado, nombra explícitamente la sesión alternativa descartada (FR-014).
- **Aviso de hueco insuficiente** (`gap-warning`): variante del sello con franja ámbar y texto breve ("Poco tiempo para llegar — Xmin"), anclada al pase de la sesión de menor prioridad afectada; nunca oculta el pase, solo lo marca (FR-020). El tiempo mostrado procede del mapa del recinto cuando el evento lo aporta, o de la estimación por defecto (5-10 min) en su ausencia — el componente no distingue visualmente el origen del dato, solo muestra el resultado. **Maquetado** en `rumbo-mockup.html` (pantalla 3): el sello de la sesión afectada pasa a la variante `dim` (contorno en vez de relleno) para diferenciarla visualmente de una sesión imprescindible normal, sin perder la clasificación de prioridad.
- **Tarjeta de ruta** (`route-card`) + **selector de transporte** (`segmented`) + **bloque de salida** (`depart-block`): origen → destino, medio de transporte, hora de salida recomendada con margen (FR-016 a FR-018). Los tiempos y el trazado provienen de Google Maps (FR-021); el pie de la tarjeta incluye un atributo textual discreto ("Rutas y tráfico: Google Maps") por transparencia de origen del dato, sin logotipo de marca para no romper el sistema tipográfico propio. **Maquetado** en `rumbo-mockup.html` (pantalla 4, clase `.data-attr`). Al elegir "Coche" en `segmented` aparece además la **tarjeta de aparcamiento** (`parking-card`, FR-019), también maquetada.
- **Tarjeta de aviso** (`alert-card`): fondo ámbar, icono de aviso, mensaje con la hora propuesta y dos acciones — "Confirmar nueva salida" / "Mantener la mía" — en vez de anunciar un cambio ya aplicado. Nunca es un color de error/rojo porque un retraso detectado con margen no es un fallo del sistema — es el sistema funcionando (FR-021, FR-022). Incluye la misma atribución a Google Maps que `route-card`. Maquetado en `rumbo-mockup.html` (pantalla 4).
- **Tarjeta de confirmación de agenda** (`agenda-diff-card`): resumen de qué sesiones suben, bajan o se incorporan tras un cambio de objetivos o de programa, con "Aplicar nueva agenda" / "Mantener la actual" (FR-015). Reutiliza el mismo patrón de dos acciones que `alert-card`. **Maquetado** en `rumbo-mockup.html` (pantalla 3), detrás de un botón "Cambié mis objetivos → ver agenda recalculada" que la revela.
- **Tarjeta de fuente ilegible** (`illegible-card`): estado de error para la Historia 1 cuando la fuente importada no es legible o no corresponde a un evento; ofrece "Probar con otra fuente" / "Introducir a mano" en vez de bloquear el flujo. **Maquetado** en `rumbo-mockup.html` (pantalla 1), tras un toggle "Vista previa" / "Fuente ilegible".
- **Tarjeta de evento** (`event-pass`): la unidad central de la pantalla de inicio (Historia 5). Reutiliza la estructura del componente `pass` (bloque superior + perforación + bloque inferior), pero a nivel de evento en vez de sesión. El bloque superior lleva nombre, fechas/ubicación y un indicador de estado; el inferior varía según ese estado — un resumen operativo si el evento está en curso o cerrado, o una **checklist de onboarding** (`ep-checklist`, FR-026) si todavía le faltan pasos. Al tocarla, lleva al usuario al punto exacto donde quedó (FR-028), no siempre al mismo sitio.
- **Indicador "en curso"** (`ep-live-dot`): punto teal con animación de pulso, reservado en exclusiva para el evento que se celebra hoy (FR-024, FR-025 de spec 001) — es el único elemento animado de toda la interfaz, para que el ojo lo encuentre primero sin necesidad de leer texto.
- **Fila de pregunta** (`qa-row`): pregunta + etiqueta de origen — `general` (teal), `técnica` (plum) o `tuya` (ámbar) — para que el usuario distinga de un vistazo qué ha sugerido la app y qué ha escrito él mismo (FR-001 a FR-003, spec 002). El botón "Regenerar preguntas" (`regen-btn`) vive siempre debajo de las sugeridas, nunca mezclado con las propias del usuario.
- **Estado "info insuficiente"** (`qa-empty`): sustituye a la lista de preguntas cuando la sesión no tiene tema ni descripción; ofrece directamente el campo para escribir preguntas manuales en vez de un mensaje de error aislado (FR-004, spec 002).
- **Pastilla "ahora"** (`now-pill`) + **panel "ahora"** (`now-board`): la pastilla indica el estado del momento (en sesión / hueco / fuera de horario) con el mismo código de color que el resto de la app (teal / ámbar / gris neutro); el panel oscuro reutiliza el `--ink` del dispositivo para que se lea como un panel de salidas real, con la sesión activa en tipografía de titular (FR-005 a FR-007, spec 002).
- **Tarjeta "próxima actividad"** (`next-up-card`): aparece tanto en huecos libres como fuera de horario, siempre con la misma estructura (etiqueta + nombre + hora/sala), para que "no tienes nada ahora" nunca sea una pantalla vacía sin salida.
- **Acciones rápidas** (`quick-actions`): dos atajos ("Tomar nota" / "Registrar contacto") anclados a la sesión activa en el modo simplificado, para capturar en el momento sin salir del contexto (enlaza Ahora con Notas y Personas).
- **Tarjeta de nota** (`note-card`): contenido + etiqueta de sesión (teal) o "Evento general" (gris neutro, `note-tag.general`) cuando no hay sesión activa en el momento de crearla (FR-008, FR-013, spec 002); si viene de una nota de voz, lleva un indicador discreto "Transcrita de una nota de voz" (FR-009).
- **Barra de composición** (`compose-bar`) + **banner de grabación** (`recording-banner`): la barra de texto se sustituye por completo por el banner (fondo plum, punto pulsante) mientras se dicta una nota de voz, en vez de superponer un modal — la lista de notas de abajo permanece visible en todo momento.
- **Tarjeta de contacto** (`contact-card`): nombre + nota rápida + sesión o momento en que se conoció (FR-011, FR-012, spec 002). El formulario de alta (`add-contact-card`) es una tarjeta con borde grueso, no un modal, coherente con el resto de formularios de Rumbo (`preview-card`, `add-question-row`).
- **Aviso de duplicado** (`dup-warning`): mismo lenguaje ámbar de "atención sin ser error" que `gap-warning` y los campos faltantes; ofrece "Fusionar" / "Guardar como distinto" en vez de decidir por el usuario (FR-016, spec 002).
- **Fila "Trae tu próximo evento"** (`home-add`): borde discontinuo, siempre ancla superior de la lista; visualmente es "un talón en blanco todavía sin sellar", coherente con la metáfora, y lleva directo al flujo de importación (FR-027).
- **Estado de bienvenida** (`home-empty`): sustituye a la lista entera cuando no hay ningún evento guardado (FR-029); la pantalla de llegada es la propia acción de traer el primer evento, no una lista vacía con un aviso aparte.

## Pantallas

### 0 — Mis eventos (Historia 5, P1)

**Objetivo de la pantalla**: saber en dos segundos cuál de mis eventos importa ahora mismo, y retomar cualquiera exactamente donde lo dejé.

- **Alternativas consideradas**: se evaluaron tres direcciones — (A) un panel de salidas tipo aeropuerto (lista densa con sello de estado), (B) una billetera de tarjetas de embarque (reutilizando el componente `pass` a nivel de evento) y (C) pestañas Próximos/En curso/Pasados con grid y botón flotante. **Se eligió B** porque no introduce ningún lenguaje visual nuevo — es la lectura más honesta de la metáfora que ya fija el resto de este documento — y porque una checklist de progreso encaja mejor dentro de una tarjeta que dentro de una fila densa. La opción C queda descartada por introducir un patrón (FAB) que el resto de la app no usa; la opción A queda como alternativa válida si en el futuro el número de eventos por usuario crece mucho y la densidad de A se vuelve necesaria.
- El evento en curso siempre encabeza la lista, con el punto `ep-live-dot` como único elemento animado de la interfaz (FR-024, FR-025). Esto responde a que, de los tres estados posibles, es el único con urgencia real — "próximo" y "cerrado" pueden esperar a que el usuario los busque.
- La tarjeta de un evento a medio configurar no repite el patrón de resumen: muestra su `ep-checklist` (importado / objetivos / agenda) para que el usuario sepa exactamente qué le falta sin tener que entrar (FR-026). Al tocarla, la app no lo lleva Home → Importar → Objetivos desde cero, sino directamente al primer paso pendiente (FR-028).
- **Decisión cerrada**: el estado de "usuario nuevo, sin eventos" no es una lista vacía con un mensaje adicional — sustituye por completo la lista por un estado de bienvenida centrado en la única acción posible: traer el primer evento (FR-029). **Maquetado** en `rumbo-mockup.html` (pantalla 00), con un toggle "Con eventos" / "Usuario nuevo" para poder inspeccionar ambos estados.
- **Pendiente**: el caso de dos eventos con fechas solapadas el mismo día (cuál se destaca como "en curso") queda como aclaración abierta heredada de la spec — ver Casos límite de `spec.md`.

### 1 — Importar (Historia 1, P1)

**Objetivo de la pantalla**: llegar de "tengo algo del evento" a "el evento está en la app" en el menor número de decisiones.

- Las cinco vías de entrada se muestran como lista, no como grid de iconos grandes, porque no son intercambiables en frecuencia de uso: enlace y PDF son los canales que más se van a usar y encabezan la lista.
- La vista previa aparece siempre al final, incluso con datos incompletos: el estado "faltan ponentes" es una pantalla válida de llegada, no un error. Esto responde directamente al escenario de aceptación de fuente incompleta.
- **Maquetado**: el estado de fuente ilegible/no reconocida (el otro escenario de aceptación de la Historia 1) ya tiene pantalla propia en `rumbo-mockup.html`, accesible mediante un toggle "Vista previa" / "Fuente ilegible" en la parte superior de la pantalla 1 — en producción este toggle no existiría; el estado se activaría automáticamente cuando la extracción falle.

### 2 — Objetivos (Historia 2, P1)

**Objetivo de la pantalla**: decisión rápida, sin jerarquía forzada entre objetivos.

- Selección múltiple mediante chips, no radio buttons. **Decisión cerrada**: la spec confirma que se permite seleccionar varios objetivos a la vez y que no existe un objetivo principal por evento (FR-010b). El diseño con chips independientes, sin desempate ni jerarquía, queda validado tal cual está — no se necesita la variante alternativa de "objetivo principal con desempate visual" que se dejaba abierta antes.
- El contador ("3 objetivos seleccionados") existe para que el usuario sienta que su elección quedó registrada antes de generar la agenda, cubriendo el requisito de guardar el perfil de objetivos (FR-009).

### 3 — Agenda (Historia 3, P1)

**Objetivo de la pantalla**: decidir a qué ir sin leer el programa completo.

- Los pases se ordenan cronológicamente, no por prioridad: el usuario ya sabe que lo ámbar es lo importante gracias al sello, así que ordenar por hora es lo que de verdad necesita para su día.
- La nota de conflicto se ancla debajo del segundo pase en conflicto (no como modal ni pantalla aparte) para que la alternativa descartada quede visible en el mismo scroll, nunca oculta.
- **Decisión cerrada y maquetada (FR-020)**: cuando el desplazamiento entre dos sesiones recomendadas no da tiempo suficiente, la sesión con menor prioridad no se oculta ni se descarta de la agenda — se sigue mostrando, con el componente `gap-warning` y el sello en variante `dim`. El origen del tiempo de desplazamiento (mapa del recinto o estimación por defecto) es un detalle de datos, no de interfaz: la pantalla no necesita comunicar cuál de los dos se está usando, aunque en el mockup el texto del aviso lo menciona a modo ilustrativo ("mapa del recinto").
- **Decisión cerrada y maquetada (FR-015)**: cuando la agenda se recalcula tras un cambio de objetivos o de programa del evento, la nueva agenda se presenta mediante una `agenda-diff-card` — un resumen de qué cambia (sesiones que suben/bajan de prioridad, nuevas incorporaciones) con dos acciones, "Aplicar nueva agenda" / "Mantener la actual", replicando el mismo patrón de confirmación explícita que ya usa el `alert-card` de la pantalla de Logística. En el mockup se accede mediante un botón "Cambié mis objetivos → ver agenda recalculada" que simula el disparador; en producción se activaría automáticamente tras confirmar el cambio en la pantalla de Objetivos.

### 4 — Logística (Historia 4, P2)

**Objetivo de la pantalla**: una sola cifra que importa — la hora de salida — con el resto como contexto de apoyo.

- La hora de salida se muestra en tamaño de titular (34px), más grande que cualquier otro dato de la pantalla, porque es la única acción real que el usuario tiene que recordar.
- **Decisión cerrada e implementada (FR-022)**: el aviso de retraso ya no anuncia un ajuste hecho en silencio. Propone la nueva hora de salida y ofrece dos acciones — "Confirmar nueva salida" y "Mantener la mía" — dejando la decisión en manos del usuario; maquetado en `rumbo-mockup.html`.
- **Decisión cerrada y maquetada (FR-021)**: los tiempos de ruta, transporte y tráfico en tiempo real proceden de Google Maps. En la interfaz esto se traduce en una atribución textual discreta al pie de `route-card` y `alert-card` ("Rutas y tráfico: Google Maps" / "Tráfico en tiempo real: Google Maps"), sin logotipo ni elementos de marca ajenos que rompan la identidad visual de Rumbo.
- **Maquetado (FR-019)**: al elegir "Coche" en el selector de transporte aparece la tarjeta de aparcamiento con opciones cercanas y su distancia a pie. No se diseñó el estado de varias sedes el mismo día — queda pendiente.

### 5 — Preguntas (Historia 1 de spec 002, P1)

**Objetivo de la pantalla**: que el usuario llegue a cada sesión con algo que decir, sin depender de improvisar en el momento.

- Las preguntas se agrupan por origen (Generales / Técnicas / Tuyas) en vez de mezclarse en una sola lista, porque el usuario necesita distinguir de un vistazo qué ha sugerido la app de lo que ha escrito él mismo — de ahí la etiqueta de color por fila en `qa-row` en lugar de un simple bullet.
- El contexto de sesión (`qa-context`) se repite arriba del todo, igual que el `crumb` del resto de pantallas, para que nunca haya duda de a qué sesión pertenecen las preguntas que se están viendo — relevante porque el usuario puede llegar aquí desde varias sesiones distintas de su agenda.
- "Regenerar preguntas" es un botón secundario, discreto, colocado *después* de las preguntas sugeridas y *antes* de las propias del usuario: regenerar no debe poder borrar por accidente una pregunta que el usuario ya escribió a mano (FR-002, FR-003).
- **Decisión cerrada y maquetada**: cuando la sesión no tiene tema ni descripción suficiente (FR-004), la pantalla no muestra una lista vacía con un aviso aparte — sustituye la sección de preguntas sugeridas por el estado `qa-empty` y deja el campo de pregunta manual como única acción disponible. Maquetado en `rumbo-mockup.html` (pantalla 05), tras un toggle "Con preguntas" / "Info insuficiente".
- **Pendiente**: no se ha diseñado el estado en el que el usuario pide preguntas para una sesión que aún no ha empezado, muy por adelantado (caso límite de la spec).

### 6 — Ahora (Historia 2 de spec 002, P1)

**Objetivo de la pantalla**: responder "¿qué toca ahora y dónde es?" en menos de un segundo, sin tener que abrir la agenda completa.

- El panel `now-board` reutiliza el `--ink` del dispositivo como fondo — el mismo color que ya usan `pass` y `event-pass` como marco — para que se lea de inmediato como "el dato que manda ahora mismo", igual que la hora de salida en tamaño de titular de la pantalla de Logística.
- **Decisión cerrada y maquetada**: los tres estados posibles (en sesión, en hueco, fuera de horario — FR-005 a FR-007) no son variantes menores de una misma pantalla, sino tres composiciones distintas, porque cada uno responde a una pregunta distinta del usuario ("¿qué toca?", "¿qué hago mientras tanto?", "¿cuándo empieza?"). Maquetado en `rumbo-mockup.html` (pantalla 06), con un toggle de tres estados para poder inspeccionarlos todos.
- Las acciones rápidas ("Tomar nota" / "Registrar contacto") viven siempre en el estado "en sesión", nunca en los otros dos — no tiene sentido registrar un contacto vinculado a una sesión que no está ocurriendo.
- **Pendiente**: el comportamiento sin conexión a internet (FR-017 de spec 002 y su aclaración pendiente sobre si aplica también a este modo) no está maquetado; de momento se asume conexión disponible.

### 7 — Notas (Historia 3 de spec 002, P1)

**Objetivo de la pantalla**: que capturar una idea en el momento cueste menos que olvidarla.

- La lista de notas se ordena cronológicamente, igual que la Agenda, y cada nota lleva su etiqueta de sesión (o "Evento general" en gris neutro cuando no había sesión activa, FR-013) directamente visible, sin tener que abrir la nota para saber de dónde viene.
- **Decisión cerrada y maquetada**: dictar una nota de voz no abre un modal ni una pantalla aparte — la barra de composición (`compose-bar`) se transforma en un banner de grabación (`recording-banner`, fondo plum con punto pulsante) que ocupa el mismo espacio, y la lista de notas ya capturadas sigue visible detrás. El objetivo es que grabar se sienta como una continuación de escribir, no como una acción distinta (FR-008, FR-009). Maquetado en `rumbo-mockup.html` (pantalla 07).
- Una nota transcrita de voz lleva un indicador discreto (icono + "Transcrita de una nota de voz") en vez de mezclarse sin distinción con las notas de texto — por transparencia, no porque el usuario deba desconfiar de la transcripción.
- **Pendiente**: el caso límite de vincular manualmente una nota creada en un hueco a la sesión anterior o posterior (aclaración abierta en la spec) no está maquetado; hoy la nota simplemente queda etiquetada como "Evento general". Tampoco está maquetado el aviso de sincronización tras recuperar la conexión (FR-017).

### 8 — Personas (Historia 4 de spec 002, P1)

**Objetivo de la pantalla**: registrar a alguien en segundos, sin que se sienta como rellenar un formulario de CRM.

- El formulario de alta (`add-contact-card`) pide solo nombre y nota rápida — ningún campo más — porque el escenario de éxito (SC-003 de spec 002) exige que registrar un contacto tome menos de 15 segundos.
- **Decisión cerrada y maquetada**: el aviso de posible duplicado (`dup-warning`, FR-016) usa el mismo ámbar de "atención sin ser error" que el resto de la app, y ofrece "Fusionar" / "Guardar como distinto" sin decidir por el usuario ni bloquear el alta del nuevo contacto. Maquetado en `rumbo-mockup.html` (pantalla 08).
- **Pendiente**: el criterio exacto para detectar un posible duplicado (coincidencia exacta de nombre, aproximada, u otra señal) es una aclaración abierta de la spec que no se resuelve en este documento — el mockup asume coincidencia de nombre a modo ilustrativo. Tampoco está maquetado el caso de un contacto registrado sin ninguna nota.

## Estados pendientes de diseñar

Con el mockup HTML actualizado, la cobertura de ambas specs queda casi completa. Faltan por maquetar únicamente:

**De `spec.md` (001)**:
- Aviso de agenda sin objetivos definidos (caso límite de la spec).
- Gestión de un evento en varias sedes distintas el mismo día (Historia 4, caso límite).
- Estado "sin sesiones suficientes para priorizar" (caso límite de la Historia 3, cuando el evento importado no aporta datos suficientes).
- Qué evento se destaca como "en curso" si dos eventos tienen fechas solapadas (Historia 5, caso límite).

**De `spec-interacciones-y-evento.md` (002)**:
- Preguntas sugeridas para una sesión que aún no ha empezado, muy por adelantado (Historia 1, caso límite).
- Comportamiento sin conexión a internet, tanto en el modo simplificado como en la captura de notas y contactos, y el aviso de sincronización al recuperarla (FR-017 y su aclaración pendiente sobre alcance).
- Transcripción de voz poco fiable en entornos ruidosos (Historia 3, caso límite).
- Vincular manualmente una nota creada en un hueco a la sesión anterior o posterior (aclaración pendiente de la Historia 3).
- Contacto registrado sin ninguna nota, solo con el nombre (Historia 4, caso límite).

## Decisiones cerradas

- **FR-010b**: selección múltiple de objetivos sin jerarquía; el diseño de chips independientes (pantalla 2) queda confirmado tal cual, sin variante de "objetivo principal". Maquetado desde el mockup original.
- **FR-019**: tarjeta de aparcamiento con opciones cercanas, visible al elegir "Coche" en el selector de transporte. Maquetado en `rumbo-mockup.html`.
- **FR-020**: las sesiones de menor prioridad afectadas por un desplazamiento insuficiente se muestran igualmente, con el componente `gap-warning` (ámbar) y sello en variante `dim`, en lugar de ocultarse. El tiempo de desplazamiento se basa en el mapa del recinto cuando existe, o en una estimación por defecto (5-10 min) en su ausencia; la interfaz no distingue entre ambos orígenes. Maquetado en `rumbo-mockup.html`.
- **FR-021**: Google Maps es el proveedor de datos de tráfico y transporte en tiempo real; se refleja en la interfaz con una atribución textual discreta, sin elementos de marca. Maquetado en `rumbo-mockup.html`.
- **FR-022**: el recálculo de ruta pide confirmación explícita al usuario antes de aplicarse; nunca es automático ni silencioso. Maquetado en `rumbo-mockup.html` (pantalla 4).
- **FR-015**: el recálculo de agenda sigue el mismo principio de confirmación explícita que FR-022, mediante la `agenda-diff-card` (pantalla 3). Maquetado en `rumbo-mockup.html`, accesible tras un botón que simula el disparador de recálculo.
- **Historia 1, escenario 7**: estado de fuente ilegible/no reconocida, con reintento u opción de introducir el evento a mano. Maquetado en `rumbo-mockup.html` (pantalla 1), tras un toggle de estado.
- **Historia 5**: pantalla de inicio ("Mis eventos") con el patrón de billetera de tarjetas de embarque (`event-pass`), evento en curso destacado con indicador animado, checklist de onboarding para eventos incompletos y estado de bienvenida dedicado para usuarios sin eventos. Maquetado en `rumbo-mockup.html` (pantalla 00).
- **Historia 1 (spec 002)**: preguntas agrupadas por origen (general / técnica / tuya) con etiqueta de color, botón de regenerar independiente de las preguntas propias, y estado dedicado para sesiones sin información suficiente. Maquetado en `rumbo-mockup.html` (pantalla 05).
- **Historia 2 (spec 002)**: modo simplificado con tres composiciones distintas (en sesión / en hueco / fuera de horario) en vez de variantes de una misma pantalla, panel oscuro tipo "boarding call" para la sesión activa, y acciones rápidas ancladas solo al estado "en sesión". Maquetado en `rumbo-mockup.html` (pantalla 06).
- **Historia 3 (spec 002)**: la grabación de una nota de voz sustituye la barra de composición por un banner de grabación en el mismo espacio, en vez de abrir un modal; las notas transcritas llevan un indicador discreto de origen. Maquetado en `rumbo-mockup.html` (pantalla 07).
- **Historia 4 (spec 002)**: alta de contacto con solo nombre y nota rápida, y aviso de posible duplicado no bloqueante con "Fusionar" / "Guardar como distinto". Maquetado en `rumbo-mockup.html` (pantalla 08).

## Decisiones abiertas heredadas de la spec

- **Historia 5 (spec 001), caso límite**: qué evento se destaca como "en curso" si dos eventos tienen fechas solapadas el mismo día. No se resuelve en este documento — depende de la aclaración pendiente en `spec.md`.
- **Historia 1 (spec 002)**: preguntas sugeridas para una sesión que aún no ha empezado, muy por adelantado — caso límite sin resolver en `spec-interacciones-y-evento.md`.
- **Historia 3 (spec 002)**: si una nota creada en un hueco debe poder vincularse manualmente a la sesión anterior o posterior — aclaración pendiente en la spec [NECESITA ACLARACIÓN].
- **Historia 4 (spec 002)**: criterio exacto para detectar un posible contacto duplicado (coincidencia exacta, aproximada u otra señal) — aclaración pendiente en la spec [NECESITA ACLARACIÓN]. El mockup asume coincidencia de nombre solo a modo ilustrativo.
- **FR-017 (spec 002)**: alcance del modo sin conexión — si aplica solo a notas y contactos o también al modo simplificado y a la generación de preguntas — aclaración pendiente en la spec [NECESITA ACLARACIÓN].

Las tres aclaraciones que dependían de `spec.md` en la versión anterior de este documento (selección múltiple de objetivos, origen de los tiempos de desplazamiento entre salas, proveedor de tráfico/transporte) quedaron resueltas el 2026-07-30 y están incorporadas en las secciones anteriores.
