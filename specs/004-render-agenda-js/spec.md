# Feature Specification: Extracción de agendas generadas con JavaScript (render en backend)

**Feature Branch**: `004-render-agenda-js`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Al importar por URL eventos cuya agenda se genera con
JavaScript en el navegador (p. ej. https://london.theaisummit.com/conference-agenda/full-agenda/
o https://aws.amazon.com/es/events/summits/madrid/agenda/), la app siempre responde 'No hemos
podido extraer datos de esta fuente' porque el HTML crudo no contiene las sesiones. Queremos que
la importación obtenga el contenido tal como lo vería un navegador (renderizando la página en el
backend) para poder extraer la agenda de estas webs dinámicas, sin romper lo que ya funciona en
la feature 003."

## Clarifications

### Session 2026-08-14

- Q: Para las webs cuya agenda solo aparece tras ejecutar JavaScript, ¿ampliamos el alcance del
  MVP para renderizarlas en el backend (mejora que 003 dejó aplazada) o mantenemos esas fuentes
  como ilegibles? → A: Ampliar el alcance: se renderiza la página en el backend para obtener el
  contenido dinámico y poder extraer la agenda (esta feature 004).
- Q: ¿Cuánto tiempo total máximo (obtención + render + extracción con IA) antes de dar la
  importación por fallida? → A: 45 segundos (amplía los 30 s de la feature 003 para dar margen al
  render de un navegador sin espera excesiva).
- Q: ¿Qué profundidad de interacción hace el sistema para revelar la agenda? → A: Además de
  esperar a que cargue, realiza interacciones acotadas comunes: aceptar/descartar el banner de
  cookies/consentimiento, desplegar las pestañas por día y hacer scroll / pulsar "ver más" hasta
  un límite, para revelar toda la agenda.
- Q: Al ejecutar el JavaScript real de la página se reintroduce el riesgo de SSRF que 003
  neutralizaba fijando la conexión a una IP pública validada. ¿Cómo se preserva esa garantía? →
  A: Se filtra el tráfico que origina la página renderizada para seguir bloqueando destinos
  internos/privados/de metadatos de nube; el render solo puede alcanzar destinos públicos.
- Q: ¿Qué resultado de la vía ligera (HTML crudo de la 003) dispara el escalado al renderizado?
  → A: Escalar cuando la vía ligera no extrae ninguna sesión (0 sesiones), tanto si resulta
  ilegible (no devuelve nada — el caso actual del error "No hemos podido extraer datos") como si
  obtiene nombre/fechas pero sin agenda; si ya extrae al menos una sesión, no se renderiza.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Importar un evento cuya agenda se genera con JavaScript (Priority: P1)

Como asistente a un evento, quiero pegar la URL de una web de evento moderna cuya agenda se
carga dinámicamente en el navegador (no está en el HTML inicial) y que Rumbo la extraiga igual
que si fuera una página estática, para no depender de que la web tenga un formato "amigable" ni
tener que introducir la agenda a mano.

**Why this priority**: Es el fallo real que hoy bloquea la importación por URL. Las dos fuentes
que el usuario probó (The AI Summit London y AWS Summit Madrid) son páginas de este tipo: el
HTML crudo solo trae menú y texto de marketing, y la agenda llega con una llamada de red
posterior a la hidratación. La feature 003 documentó esto como limitación conocida y lo dejó
como "fuente ilegible"; sin cubrirlo, la importación por URL falla en una gran parte de las
webs de eventos actuales.

**Independent Test**: Se puede probar de forma aislada pegando la URL pública de un evento cuya
agenda se genera con JavaScript y verificando que se crea un borrador con nombre, fechas y al
menos una sesión, sin intervención manual.

**Acceptance Scenarios**:

1. **Given** una URL pública cuya agenda solo aparece tras ejecutar JavaScript, **When** el
   usuario la importa, **Then** el sistema obtiene el contenido ya renderizado, extrae el
   evento y crea un borrador con nombre, fecha de inicio y fin, ubicación (si está disponible) y
   las sesiones detectadas con su franja horaria.
2. **Given** una URL cuya agenda se reparte en pestañas por día o requiere pulsar "ver más",
   **When** se importa, **Then** el sistema revela y extrae las sesiones de esas secciones en la
   medida acordada en las clarificaciones, y marca como faltantes los datos que no logre obtener.
3. **Given** un evento importado desde una web dinámica con datos incompletos, **When** el
   usuario revisa el borrador, **Then** los campos no extraídos aparecen marcados como faltantes
   para completarlos a mano (continuidad con FR-008 del 001 y FR-005 del 003).

### User Story 2 - No degradar la robustez ni la seguridad cuando el render falla (Priority: P2)

Como usuario, cuando una web no se puede renderizar o extraer (tarda demasiado, exige login,
nunca termina de cargar, o el sistema de render no está disponible), quiero el mismo mensaje
claro de "fuente ilegible" con la opción de probar otra fuente o introducir los datos a mano,
en lugar de un error opaco o una espera indefinida.

**Why this priority**: Preserva los estados de error visibles (Principio VIII) y la degradación
controlada que ya garantizaba la feature 003 (FR-006, FR-012); ampliar la capacidad no debe
introducir cuelgues, datos a medio crear ni nuevos vectores de seguridad.

**Independent Test**: Se puede probar con una URL que nunca termina de cargar o con el subsistema
de render deshabilitado, verificando que la app muestra "fuente ilegible" con acciones de
recuperación dentro del límite de tiempo, sin crear un borrador vacío.

**Acceptance Scenarios**:

1. **Given** una URL que no termina de cargar su agenda dentro del límite de tiempo, **When** se
   importa, **Then** el sistema informa de que no se pudieron extraer datos y ofrece probar otra
   fuente o introducirlos manualmente, sin dejar datos a medio crear.
2. **Given** el subsistema de render no disponible o no configurado, **When** se importa una URL,
   **Then** el sistema recae en la vía de HTML crudo de la feature 003 y, si esta tampoco basta,
   trata la fuente como ilegible con mensaje claro.
3. **Given** una página cuyo JavaScript intenta acceder a un destino interno/privado, **When** se
   renderiza, **Then** el sistema no permite ese acceso y mantiene la protección frente a SSRF.

### User Story 3 - Mantener sin cambios lo que ya funciona (Priority: P3)

Como usuario avanzado o en pruebas, quiero que las páginas estáticas (server-rendered) y los
datos ya estructurados sigan importándose exactamente igual que hoy, sin pasar por el
renderizado, para no penalizar el tiempo, el coste ni la fiabilidad de los casos que ya
funcionan.

**Why this priority**: No debe romperse el comportamiento de las features 001, 002 y 003, del
que dependen las pruebas E2E existentes y las demos. El render es un escalón adicional, no un
reemplazo.

**Independent Test**: Importar un payload estructurado o una URL server-rendered cuyo HTML crudo
ya contiene la agenda sigue creando el evento igual que antes, sin invocar el renderizado.

**Acceptance Scenarios**:

1. **Given** un payload con datos estructurados válidos, **When** se importa, **Then** el evento
   se crea sin invocar ni el motor de IA ni el renderizado.
2. **Given** una URL cuyo HTML crudo (incluidos los bloques `<script>` de datos, FR-014 del 003)
   ya contiene la agenda, **When** se importa, **Then** el sistema la extrae con la vía existente
   sin escalar al renderizado.

### Edge Cases

- ¿Qué ocurre si la página muestra un banner de cookies/consentimiento que tapa la agenda? →
  El sistema lo acepta/descarta de forma acotada (FR-006) para poder acceder a la agenda; si aun
  así no queda accesible, se trata como contenido no accesible (fuente ilegible).
- ¿Qué ocurre si la agenda usa scroll infinito o un botón "cargar más"? → Se intenta cargar el
  contenido hasta un límite acotado; lo no cargado queda como campo faltante.
- ¿Qué ocurre si la página nunca deja de hacer peticiones de red (no llega a "inactiva")? → Se
  aplica el límite de tiempo total y se trata como fuente ilegible recuperable.
- ¿Qué ocurre si la web requiere login, captcha o muro de pago? → Fuente ilegible con mensaje de
  recuperación (igual que 003).
- ¿Qué ocurre si el JavaScript de la página intenta contactar con destinos internos/privados o
  de metadatos de nube? → El sistema lo impide; la garantía anti-SSRF del 003 debe preservarse.
- ¿Qué ocurre si el subsistema de render se cae o agota memoria/recursos? → Degradación
  controlada: se recae en HTML crudo (003) y, si no basta, fuente ilegible; nunca datos parciales.
- ¿Qué ocurre con webs muy pesadas (muchos scripts, vídeos)? → Se acotan tiempo y recursos; si se
  supera el presupuesto, fuente ilegible.
- ¿Qué ocurre si tras renderizar el contenido sigue sin contener una agenda reconocible? → Se
  trata como ilegible; el usuario completa a mano (continuidad con 003).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE poder obtener el contenido de una URL pública tal como lo vería un
  navegador tras ejecutar el JavaScript de la página (contenido renderizado), para poder extraer
  agendas que no están presentes en el HTML crudo.
- **FR-002**: La obtención y el renderizado DEBEN realizarse en la capa de backend/servicios,
  nunca desde el cliente móvil (Principio VI).
- **FR-003**: El sistema DEBE reutilizar el mismo motor de IA y la misma validación de estructura
  de la feature 003 sobre el contenido renderizado, sin redefinir cómo se estructura, valida ni
  persiste el evento (Principio VII).
- **FR-004**: El sistema DEBE intentar primero la vía ligera de la feature 003 (HTML crudo +
  bloques `<script>` con datos) y SOLO escalar al renderizado cuando esa vía no extraiga ninguna
  sesión (0 sesiones), ya sea porque resulta ilegible (no devuelve nada) o porque obtiene
  nombre/fechas pero sin agenda. Si la vía ligera ya extrae al menos una sesión, el sistema NO
  DEBE renderizar, para no penalizar tiempo ni coste en las webs que ya funcionan.
- **FR-005**: Al renderizar, el sistema DEBE esperar a que el contenido dinámico relevante esté
  disponible (p. ej. hasta que el contenido de agenda aparezca o deje de crecer tras cada
  interacción) antes de extraer, dentro de un límite de tiempo. La señal de finalización NO se
  basa en la inactividad total de la red, que muchas webs nunca alcanzan por analítica o polling.
- **FR-006**: El sistema DEBE manejar, con una profundidad acotada, los patrones comunes que
  ocultan la agenda dinámica: DEBE aceptar/descartar el banner de cookies/consentimiento,
  desplegar las pestañas por día y hacer scroll o pulsar "ver más" hasta un límite razonable de
  interacciones, para revelar toda la agenda. Lo que no logre revelar dentro de ese límite queda
  como campo faltante.
- **FR-007**: El sistema DEBE preservar la protección frente a SSRF de la feature 003: el tráfico
  de red que origine la página renderizada DEBE filtrarse de modo que solo pueda alcanzar
  destinos públicos, bloqueando destinos internos, privados y de metadatos de nube, aun cuando el
  JavaScript de la página lo intente.
- **FR-008**: El sistema DEBE aplicar un límite de tiempo total de 45 segundos (obtención +
  render + extracción) y un límite de recursos; superado cualquiera, la importación se trata como
  fallo recuperable ("fuente ilegible") sin crear datos parciales.
- **FR-009**: El sistema NO DEBE exponer al cliente ni las credenciales del motor de IA ni el
  subsistema de renderizado; ambos residen solo en el backend (Principio VI).
- **FR-010**: El sistema DEBE seguir soportando, sin regresiones, la importación de datos ya
  estructurados y de URLs server-rendered cuyo HTML crudo ya contiene la agenda, sin invocar el
  renderizado en esos casos (continuidad con 001, 002 y 003).
- **FR-011**: Cuando el subsistema de renderizado no esté disponible o configurado, el sistema
  DEBE degradar de forma controlada: recae en la vía de HTML crudo (003) y, si no basta, trata la
  fuente como ilegible con mensaje claro, en lugar de fallar de forma opaca (continuidad con
  FR-012 del 003).
- **FR-012**: El sistema DEBE registrar de forma trazable el origen (URL) y si la extracción usó
  renderizado, sin almacenar contenido sensible innecesario (continuidad con FR-010 del 003).

### Key Entities *(include if feature involves data)*

- **Fuente de importación (URL)**: Reutiliza la entidad del 003; atributos: tipo (url), valor de
  la dirección, momento de importación. Esta feature no la redefine.
- **Contenido renderizado**: Representación textual del contenido de la página tal como queda
  tras ejecutar su JavaScript en el backend; es la entrada al motor de IA cuando la vía de HTML
  crudo no basta. Es transitorio, no requiere persistencia a largo plazo.
- **Datos de evento extraídos / Evento / Sesión / Ponente**: Entidades existentes (001/003); esta
  feature solo cambia el origen del contenido (renderizado en vez de HTML crudo), no su forma ni
  cómo se revisan y corrigen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede importar un evento cuya agenda se genera con JavaScript pegando
  únicamente su URL y obtener un borrador con nombre, fechas y al menos una sesión, sin introducir
  datos a mano, en al menos el 70% de webs de eventos con agenda dinámica pública y accesible sin
  login. Este porcentaje se valida con un smoke manual sobre un conjunto de webs reales, no en CI
  (quickstart.md).
- **SC-002**: El 100% de los intentos que no se pueden extraer (incluidos los que superan el
  límite de tiempo o de recursos) terminan en estado de "fuente ilegible" con acciones de
  recuperación, sin crear eventos vacíos ni mostrar errores genéricos.
- **SC-003**: La importación desde URL devuelve un resultado (éxito o fallo controlado) en 45
  segundos o menos, sin dejar al usuario esperando indefinidamente.
- **SC-004**: La importación de datos ya estructurados y de URLs server-rendered que ya
  funcionaban sigue comportándose exactamente igual que antes (sin regresiones en las pruebas de
  las features 001, 002 y 003).
- **SC-005**: El renderizado no introduce ningún acceso del servidor a destinos internos/privados
  ni filtra credenciales al cliente (se mantienen las garantías de SSRF y de aislamiento de
  credenciales de la feature 003).

## Assumptions

- El alcance cubre URLs públicas accesibles sin autenticación; páginas tras login, captchas o
  muros de pago quedan fuera y se tratan como ilegibles (igual que 003).
- Esta feature amplía la feature 003: no la reemplaza. La vía de HTML crudo + `<script>` de datos
  (FR-014 del 003) sigue siendo el primer intento y el camino por defecto; el renderizado es un
  escalón adicional solo cuando esa vía no basta.
- Se reutilizan el motor de IA, la validación de estructura y el flujo de borrador del onboarding
  (001/003); esta feature solo cambia cómo se obtiene el contenido de la página.
- La persistencia sigue siendo la del MVP (almacenamiento local en ficheros); esta feature no
  introduce base de datos.
- El coste y los límites de recursos del subsistema de renderizado se asumen aceptables para el
  MVP y se controlan mediante límites de tiempo y de recursos.
- El seguimiento de enlaces internos y la paginación completa más allá de la profundidad acotada
  de interacción quedan fuera del MVP.
- Las decisiones de límite de tiempo total (45 s), profundidad de interacción (cookies + días +
  scroll/"ver más" acotado) y mecanismo de seguridad del render (filtrado del tráfico a destinos
  públicos) quedaron fijadas en la sesión de clarificación 2026-08-14.
