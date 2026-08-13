# Feature Specification: Extracción de eventos desde fuentes reales con IA

**Feature Branch**: `003-extraccion-evento-ia`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Al importar un evento por enlace de web externo (p. ej. https://london.theaisummit.com/conference-agenda/full-agenda/) la app responde 'No hemos podido extraer datos de esta fuente'. Queremos que la importación lea de verdad una URL pública, obtenga su contenido y use IA para estructurar el evento (nombre, fechas, ubicación, sesiones, ponentes) en lugar del stub actual que sólo acepta JSON."

## Clarifications

### Session 2026-08-12

- Q: Para webs cuya agenda se genera con JavaScript en el navegador, ¿render JS o sólo HTML crudo? → A: MVP sólo HTML crudo; si no hay datos suficientes, fuente ilegible con recuperación manual (render JS queda como mejora futura).
- Q: ¿Tiempo máximo total de la importación desde URL (fetch + extracción IA) antes de darla por fallida? → A: 30 segundos.
- Q: ¿Restringir las URLs a http/https públicos y bloquear destinos internos/privados (SSRF)? → A: Sí; sólo http/https público, bloquear localhost/IPs privadas/metadatos de nube y tratarlas como fuente ilegible.

### Session 2026-08-13

- Q: Para webs cuya agenda se genera con JavaScript, en vez de renderizar JS (descartado por coste/riesgo), ¿el sistema debe aprovechar los datos que el propio HTML crudo ya incluye dentro de bloques `<script>` (p. ej. el payload de hidratación de frameworks como Next.js), y si es así, buscando solo patrones de frameworks conocidos o de forma genérica? → A: Sí, de forma genérica: cualquier bloque `<script>` sin `src` cuyo contenido parezca JSON se conserva como texto candidato para la IA, sin acoplarse a un framework concreto. Sigue sin ejecutarse JavaScript en ningún momento; esto no sustituye ni contradice el render JS descartado arriba, es una fuente adicional de datos ya presente en el HTML crudo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Importar un evento pegando la URL de su web (Priority: P1)

Como asistente a un evento, quiero pegar la dirección de la web del evento (o de su
página de agenda) y que Rumbo extraiga automáticamente el nombre, las fechas, la
ubicación y el listado de sesiones con sus ponentes, para no tener que introducir
nada a mano ni buscar un formato estructurado.

**Why this priority**: Es el flujo de entrada real al producto. Hoy la importación
sólo funciona pegando JSON preparado, lo que ningún usuario final hará. Sin esta
capacidad el onboarding (spec 001) no es utilizable con fuentes reales.

**Independent Test**: Se puede probar de forma aislada pegando la URL pública de un
evento y verificando que se crea un borrador de evento con nombre, fechas y al menos
una sesión, sin intervención manual.

**Acceptance Scenarios**:

1. **Given** una URL pública de un evento con su agenda accesible, **When** el usuario
   la importa, **Then** el sistema crea un borrador de evento con nombre, fecha de
   inicio y fin, ubicación (si está disponible) y las sesiones detectadas con su
   franja horaria.
2. **Given** una URL cuya página lista varias sesiones con ponentes, **When** se
   importa, **Then** cada sesión queda asociada a sus ponentes cuando el contenido los
   expone.
3. **Given** un evento importado desde URL con datos incompletos, **When** el usuario
   revisa el borrador, **Then** los campos que no se pudieron extraer aparecen
   marcados como faltantes para completarlos a mano (continuidad con FR-008 del 001).

### User Story 2 - Saber cuándo una fuente no se puede extraer, sin bloquearme (Priority: P2)

Como usuario, cuando una URL no se puede leer (no es un evento, requiere login, está
caída o la IA no logra estructurar nada fiable), quiero un mensaje claro y la opción de
probar otra fuente o introducir los datos a mano, en lugar de un error opaco.

**Why this priority**: Preserva la robustez del onboarding (Principio VIII: estados de
error visibles) y evita que un fallo de extracción deje al usuario "a oscuras".

**Independent Test**: Se puede probar con una URL inaccesible o no relacionada con un
evento y verificar que la app muestra el estado de "fuente ilegible" con acciones de
recuperación, sin crear un borrador vacío ni caer en un error genérico.

**Acceptance Scenarios**:

1. **Given** una URL que no responde o no contiene un evento reconocible, **When** se
   importa, **Then** el sistema informa de que no se pudieron extraer datos y ofrece
   probar otra fuente o introducirlos manualmente.
2. **Given** un fallo temporal del motor de extracción, **When** ocurre, **Then** el
   usuario recibe un mensaje comprensible y la operación no deja datos a medio crear.

### User Story 3 - Mantener la importación manual/estructurada existente (Priority: P3)

Como usuario avanzado o en pruebas, quiero seguir pudiendo importar pegando datos ya
estructurados, para casos de demo, test o cuando ya tengo la información preparada.

**Why this priority**: No debe romperse el comportamiento actual del que dependen las
pruebas E2E del 001 y las demos.

**Independent Test**: Pegar un payload estructurado sigue creando el evento igual que
antes, sin pasar por el motor de IA.

**Acceptance Scenarios**:

1. **Given** un payload con datos estructurados válidos, **When** se importa, **Then**
   el evento se crea sin invocar la extracción con IA.

### Edge Cases

- ¿Qué ocurre si la URL requiere autenticación o está detrás de un muro de cookies? →
  Se trata como fuente ilegible con mensaje de recuperación.
- ¿Qué ocurre si la URL apunta a un destino interno o privado (localhost, red interna,
  metadatos de nube)? → Se rechaza y se trata como fuente ilegible; el servidor nunca
  accede a esos destinos (prevención de SSRF).
- ¿Qué ocurre si la agenda está paginada o repartida en varias páginas, o se genera
  dinámicamente con JavaScript? → Para el MVP se extrae del HTML crudo de la URL
  proporcionada, incluyendo los bloques de datos que el propio HTML ya incluya
  embebidos en `<script>` aunque el navegador los use para renderizar con JavaScript
  (FR-014); si ni el texto visible ni esos bloques contienen el contenido dinámico
  (p. ej. porque la página lo pide con una llamada de red posterior, ya en el
  navegador, y no lo trae en el HTML inicial), se trata como ilegible y el usuario
  completa a mano.
- ¿Qué ocurre si el contenido es muy largo y excede el límite del motor de IA? → El
  sistema acota el contenido enviado y prioriza la parte de agenda; lo no extraído
  queda como campo faltante.
- ¿Qué ocurre si la IA devuelve datos con formato inesperado o inventado? → El sistema
  valida la estructura antes de persistir; si no es fiable, se considera ilegible.
- ¿Qué ocurre si la extracción tarda demasiado? → Se aplica un tiempo máximo y, si se
  supera, se informa como fallo recuperable sin crear datos parciales.
- ¿Qué pasa con fechas en zonas horarias o formatos locales distintos? → Se normalizan
  a un formato estándar; si son ambiguas, el campo se marca como faltante para revisión.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE aceptar como fuente de importación una URL pública de un
  evento e intentar obtener su contenido para extraer los datos del evento.
- **FR-002**: El sistema DEBE obtener el contenido de la URL a través de la capa de
  backend/servicios, nunca desde el cliente móvil (Principio VI). Para el MVP se obtiene
  el HTML tal cual devuelve la página, sin renderizar JavaScript en el servidor; las
  webs cuya agenda sólo se genera con JavaScript en el navegador y no exponen sus datos
  de ninguna otra forma dentro del HTML crudo (ver FR-014) quedan como fuente ilegible con
  recuperación manual (render JS es mejora futura, descartada por coste y riesgo de
  seguridad frente al beneficio para este MVP, aclaración de sesión 2026-08-13).
- **FR-003**: El sistema DEBE usar un motor de IA para transformar el contenido obtenido
  en una estructura de evento: nombre, fecha de inicio, fecha de fin, ubicación,
  sesiones (título, inicio, fin, sala, tema) y ponentes por sesión cuando estén
  disponibles.
- **FR-004**: El sistema DEBE validar la estructura devuelta por el motor de IA antes de
  persistir, descartando resultados no fiables o vacíos.
- **FR-005**: El sistema DEBE marcar como campos faltantes aquellos datos que no se
  pudieron extraer, de forma coherente con el borrador de evento del onboarding (001).
- **FR-006**: El sistema DEBE tratar cualquier fallo de obtención o extracción (URL
  inaccesible, sin evento reconocible, error o tiempo de espera del motor, respuesta no
  válida) como "fuente ilegible", devolviendo un mensaje comprensible y sin crear datos
  parciales.
- **FR-007**: El sistema DEBE seguir soportando la importación de datos ya
  estructurados sin invocar el motor de IA, preservando el comportamiento actual.
- **FR-008**: El sistema DEBE aplicar un límite de tiempo total de 30 segundos
  (obtención del contenido + extracción con IA) y un límite de tamaño de contenido al
  proceso de extracción; superado el tiempo, la importación se trata como fallo
  recuperable sin crear datos parciales.
- **FR-009**: El sistema NO DEBE exponer credenciales del motor de IA al cliente; la
  clave y la configuración residen sólo en el backend (Principio VI).
- **FR-010**: El sistema DEBE registrar de forma trazable el origen (URL) desde el que
  se importó un evento, sin almacenar contenido sensible innecesario.
- **FR-011**: El motor de extracción DEBE ser reemplazable/configurable (proveedor de
  IA) sin cambiar el contrato del servicio de importación, para no acoplar el onboarding
  a un proveedor concreto.
- **FR-012**: Cuando falte la clave o configuración del motor de IA, el sistema DEBE
  degradar de forma controlada (comportarse como fuente ilegible con mensaje claro) en
  lugar de fallar de manera opaca.
- **FR-013**: El sistema DEBE aceptar únicamente URLs con esquema http o https y DEBE
  bloquear el acceso a destinos internos o privados (localhost, rangos de IP privados,
  direcciones de metadatos de proveedores de nube), tratándolos como fuente ilegible,
  para prevenir peticiones del servidor a recursos internos (SSRF).
- **FR-014**: Además del texto visible de la página, el sistema DEBE aprovechar los
  bloques de datos estructurados que la propia página incluya embebidos en el HTML
  crudo (p. ej. el payload de datos que algunos frameworks de renderizado modernos
  insertan en un `<script>` para pintar la página en el navegador), como entrada
  adicional para el motor de IA, sin ejecutar JavaScript en ningún momento (aclaración
  de sesión 2026-08-13). Esta búsqueda DEBE ser genérica (cualquier `<script>` sin
  origen externo cuyo contenido parezca JSON), sin acoplarse a un framework concreto.
  Si ni el texto visible ni estos bloques contienen datos suficientes, la fuente se
  sigue tratando como ilegible (FR-006).

### Key Entities *(include if feature involves data)*

- **Fuente de importación (URL)**: Representa la dirección pública desde la que se
  importa; atributos: tipo (url), valor de la dirección, momento de importación.
- **Contenido obtenido**: Representación textual del contenido de la página usada como
  entrada del motor de IA; incluye tanto el texto visible como los bloques de datos
  estructurados embebidos en `<script>` detectados de forma genérica (FR-014); es
  transitorio, no necesita persistencia a largo plazo.
- **Datos de evento extraídos**: Estructura intermedia con nombre, fechas, ubicación,
  requisitos de acceso, sesiones y ponentes; es la misma forma que ya consume el
  servicio de importación del 001.
- **Evento / Sesión / Ponente**: Entidades existentes del 001; esta feature las alimenta
  a partir de la extracción, sin redefinirlas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede importar un evento pegando únicamente la URL de su web y
  obtener un borrador con nombre, fechas y al menos una sesión, sin introducir datos a
  mano, en al menos el 80% de webs de eventos con agenda pública y legible.
- **SC-002**: El 100% de los intentos que no se pueden extraer terminan en un estado de
  "fuente ilegible" con acciones de recuperación, sin crear eventos vacíos ni mostrar
  errores genéricos.
- **SC-003**: La importación desde URL devuelve un resultado (éxito o fallo controlado)
  en 30 segundos o menos, sin dejar al usuario esperando indefinidamente.
- **SC-004**: La importación de datos ya estructurados sigue funcionando exactamente
  igual que antes (sin regresiones en las pruebas del onboarding).
- **SC-005**: Ninguna credencial del motor de IA es accesible desde el cliente.

## Assumptions

- El alcance cubre URLs públicas accesibles sin autenticación; páginas tras login,
  captchas o muros de pago quedan fuera y se tratan como ilegibles.
- Se usa un único proveedor de IA configurado por el equipo (Anthropic Claude, con clave
  propia), pero el diseño permite sustituirlo sin cambiar el contrato de importación.
- La extracción se hace sobre el contenido de la URL proporcionada; el seguimiento de
  enlaces internos o la paginación completa de la agenda quedan fuera del MVP.
- Se reutilizan las entidades y el flujo de borrador del onboarding (spec 001); esta
  feature sólo cambia el origen de los datos, no cómo se revisan ni se corrigen.
- La persistencia sigue siendo la del MVP (almacenamiento local en ficheros); esta
  feature no introduce base de datos.
- El coste y los límites de uso del proveedor de IA se asumen aceptables para el MVP y
  se controlan mediante límites de tamaño y tiempo.
