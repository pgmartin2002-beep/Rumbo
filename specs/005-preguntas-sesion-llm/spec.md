# Feature Specification: Generación de preguntas para sesiones con LLM

**Feature Branch**: `005-preguntas-sesion-llm`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Crear una spec 005 para que el apartado de preguntas use el LLM (Anthropic API / Claude). En la feature 002 se usó un stub determinista como decisión de diseño explícita (Principio VI y R2 de research.md de 002), difiriendo la integración con el motor real de IA a esta spec de backend/integración."

## Clarifications

### Session 2026-08-14

- Q: ¿Qué modelo de IA y configuración de credenciales se utiliza? → A: Se reutiliza el motor Anthropic (Claude) ya configurado en el backend con `ANTHROPIC_API_KEY` y el modelo configurado en `RUMBO_AI_MODEL` (con fallback controlado si no está configurada la clave).
- Q: ¿Qué información de la sesión se pasa al LLM para formular las preguntas? → A: Título de la sesión, tema/descripción de la sesión, nombre y empresa/bio del ponente (si están disponibles), y el contexto/nombre del evento. Si el usuario ha definido objetivos en su perfil, se pueden considerar para orientar el enfoque.
- Q: ¿Qué estructura y tipos de preguntas debe devolver el motor? → A: Un conjunto equilibrado de preguntas categorizadas (generales/estratégicas y técnicas/profundas), formuladas de forma directa y concisa para que el asistente pueda usarlas en vivo durante el Q&A o en networking.
- Q: ¿Qué ocurre si la llamada a la IA falla, supera el tiempo límite o no hay API key? → A: Se devuelve un error controlado con mensaje claro ("No se pudieron generar preguntas en este momento") y se mantiene la posibilidad de escribir preguntas manualmente sin bloquear la pantalla (Principio VIII).
- Q: ¿Cuántas preguntas sugeridas debe generar el LLM por cada sesión? → A: Exactamente 4 preguntas por sesión (2 generales/estratégicas y 2 técnicas/de profundización) para una lectura ágil en pantalla móvil.


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar preguntas inteligentes para una sesión antes de asistir (Priority: P1)

Como asistente a un evento que revisa una sesión en su agenda, quiero que la aplicación genere automáticamente preguntas interesantes (tanto generales/estratégicas como técnicas) basadas en el contenido de la sesión y el perfil del ponente, para llegar preparado al turno de preguntas y al networking posterior sin tener que investigar desde cero.

**Why this priority**: Es el valor diferencial de la Actividad 3 ("Preparar las interacciones") del producto. Sustituye el stub estático por preguntas de calidad contextual generadas por un LLM real, cumpliendo el propósito de Rumbo de ayudar a aprovechar el evento (Principio I).

**Independent Test**: Puede probarse de forma aislada seleccionando una sesión con título y tema importados y solicitando generar preguntas, comprobando que se reciben preguntas generales y técnicas relevantes para esa sesión.

**Acceptance Scenarios**:

1. **Given** una sesión con título y descripción/tema definidos, **When** el usuario solicita preparar preguntas, **Then** el sistema utiliza el LLM en el backend para generar un conjunto de preguntas divididas en generales y técnicas adaptadas a la temática.
2. **Given** una sesión que incluye ponente y su empresa, **When** se generan las preguntas, **Then** las preguntas incorporan contexto relevante sobre el ponente o su organización cuando aporta valor a la conversación.
3. **Given** una sesión generada con éxito, **When** el usuario consulta la sesión, **Then** las preguntas quedan persistidas y asociadas a la sesión para consultarlas en cualquier momento.

---

### User Story 2 - Regenerar preguntas para explorar nuevos ángulos (Priority: P1)

Como asistente, cuando las preguntas generadas inicialmente no me convencen o quiero explorar otros enfoques (por ejemplo, más aplicados a negocio o más centrados en retos de implementación), quiero pulsar "regenerar" y obtener un nuevo conjunto de preguntas sugeridas sin perder las preguntas manuales que yo haya añadido.

**Why this priority**: Permite flexibilidad y control al usuario (Principio IV), asegurando que siempre pueda afinar la preparación según sus intereses concretos.

**Independent Test**: Solicitar la regeneración de preguntas sobre una sesión y verificar que se sustituyen las sugerencias anteriores por nuevas sin eliminar las preguntas creadas manualmente por el usuario.

**Acceptance Scenarios**:

1. **Given** una sesión con preguntas sugeridas previas y preguntas manuales del usuario, **When** el usuario pulsa "regenerar preguntas", **Then** el sistema invoca al LLM para obtener una nueva tanda de preguntas sugeridas y conserva intactas las preguntas manuales.

---

### User Story 3 - Degradación controlada y fallback cuando el LLM no está disponible (Priority: P2)

Como asistente, si no hay conexión, si no está configurada la clave del motor de IA o si el servicio externo no responde a tiempo, quiero recibir un mensaje informativo claro y poder seguir redactando mis propias preguntas a mano sin que la aplicación falle ni quede bloqueada.

**Why this priority**: Garantiza la robustez de la experiencia móvil (Principio VIII) y evita que un fallo de terceros impida al usuario trabajar con sus notas o preguntas.

**Independent Test**: Desconectar la clave de IA o simular un timeout en el backend y verificar que la interfaz responde con un estado comprensible y permite añadir preguntas manualmente.

**Acceptance Scenarios**:

1. **Given** el backend sin clave `ANTHROPIC_API_KEY` configurada o con el servicio de IA no disponible, **When** el usuario solicita generar preguntas, **Then** el sistema devuelve un estado claro de servicio no disponible y habilita el formulario de creación manual.
2. **Given** una sesión con información totalmente insuficiente (ej. sin título ni descripción), **When** se intenta generar preguntas, **Then** el sistema informa de que los datos son insuficientes para generar preguntas automáticas y ofrece redactarlas manualmente.

---

### User Story 4 - Coexistencia con preguntas manuales del usuario (Priority: P3)

Como usuario, quiero combinar preguntas sugeridas por la IA con mis propias preguntas redactadas a mano, distinguiendo claramente el origen de cada una en la vista de la sesión.

**Why this priority**: Preserva la continuidad con la spec 002 (Principio VII) y da protagonismo al criterio del asistente.

**Independent Test**: Crear una pregunta manual en una sesión que tiene preguntas de IA y comprobar que ambas coexisten y se muestran con su origen identificado.

**Acceptance Scenarios**:

1. **Given** una sesión con preguntas generadas por IA, **When** el usuario añade una pregunta manual, **Then** ambas aparecen en la lista de la sesión indicando si son sugeridas o propias.

### Edge Cases

- ¿Qué ocurre si la llamada al LLM tarda más de lo previsto? → Se establece un timeout en el backend (ej. 15 segundos) y si se supera, se devuelve un error controlado sin bloquear la app.
- ¿Qué ocurre si la sesión está en otro idioma (ej. inglés)? → El LLM detecta el idioma de la sesión y genera las preguntas en el idioma correspondiente (o en español si el contexto lo requiere).
- ¿Qué ocurre si el usuario solicita regenerar preguntas repetidamente? → Cada petición genera una nueva llamada al backend; si hay una petición en curso, se muestra el estado de carga y se previene el spam de clics en la interfaz.
- ¿Qué ocurre si el LLM devuelve una respuesta en formato no estructurado o corrupto? → El backend valida y sanea la salida del modelo; si no cumple el esquema esperado, se devuelve un fallo controlado en lugar de renderizar contenido roto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE proporcionar un adaptador en backend que se comunique con el LLM (Anthropic Claude) para generar preguntas estructuradas a partir de los datos de una sesión.
- **FR-002**: El backend NO DEBE exponer claves ni credenciales de IA al cliente móvil; la integración reside íntegramente en la capa de servicios del backend (Principio VI).
- **FR-003**: El prompt de generación DEBE incluir como contexto mínimo el título de la sesión, la descripción/tema disponible, el ponente y empresa (si existen) y el nombre del evento.
- **FR-004**: El sistema DEBE generar exactamente 4 preguntas por sesión: 2 generales/estratégicas y 2 técnicas/de profundización.
- **FR-005**: El sistema DEBE permitir regenerar las preguntas sugeridas de una sesión bajo demanda del usuario, sustituyendo las sugerencias anteriores.
- **FR-006**: El sistema DEBE preservar las preguntas manuales creadas por el usuario al generar o regenerar preguntas sugeridas por IA.
- **FR-007**: El sistema DEBE aplicar un límite de tiempo (timeout de 15 segundos) a las llamadas al proveedor de IA, cancelando la operación de forma segura si se supera.
- **FR-008**: El sistema DEBE validar que la respuesta del LLM cumple la estructura esperada (lista de preguntas con texto y categoría) antes de persistirlas o devolverlas.
- **FR-009**: Cuando no esté configurada la API key de Anthropic o falle la comunicación con el modelo, el sistema DEBE degradar de forma controlada informando del estado sin interrumpir el resto de funciones de la sesión (Principio VIII).
- **FR-010**: El sistema DEBE permitir al usuario introducir preguntas manuales en cualquier momento, incluso si la generación automática ha fallado o no está disponible.
- **FR-011**: Las preguntas generadas DEBEN persistirse en el repositorio de preguntas existente (`preguntas.json`) respetando el modelo de datos de la feature 002 (Principio VII).
- **FR-012**: El sistema DEBE ser extensible para admitir stubs deterministas en entornos de prueba o CI sin requerir llamadas reales a la API externa.

### Key Entities *(include if feature involves data)*

- **Pregunta**: Entidad persistida existente (spec 002); atributos: `id`, `sesion_id`, `texto`, `tipo` (`general` | `tecnica`, opcional), `origen` (`sugerida` | `manual`), `creado_en`.
- **Sesión**: Entidad de contexto (specs 001/002); proporciona `titulo`, `tema`/descripción, `ponentes` para contextualizar la generación.
- **Contexto de Generación**: Objeto transitorio que agrupa los metadatos de la sesión y del evento para alimentar el prompt del LLM.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 85% de las sesiones con título y tema generan preguntas sugeridas relevantes en menos de 5 segundos.
- **SC-002**: El 100% de los fallos de IA (falta de clave, error de red, timeout) devuelven una respuesta controlada con mensaje explicativo en menos de 15 segundos sin causar errores 500 no controlados.
- **SC-003**: El 100% de las preguntas manuales del usuario se mantienen intactas tras una o más operaciones de regeneración de preguntas con IA.
- **SC-004**: Las pruebas unitarias y de integración de generación de preguntas pueden ejecutarse en entornos sin clave externa usando adaptadores stub.
- **SC-005**: Ninguna credencial de IA ni detalle interno de prompts es accesible desde el cliente frontend.

## Assumptions

- Se utiliza el SDK de Anthropic ya instalado en el backend (`@anthropic-ai/sdk`) y las variables de entorno existentes (`ANTHROPIC_API_KEY`, `RUMBO_AI_MODEL`).
- La UI existente de la feature 002 (botones de "Generar preguntas", "Regenerar" y formulario de preguntas manuales) se reutiliza sin requerir cambios estructurales de navegación.
- La generación de preguntas requiere conexión a internet; si el dispositivo está offline, la solicitud informa de la falta de conexión y se puede usar la creación manual.
- El coste por llamada a la API de IA se asume asumible dentro de los límites de un asistente de eventos y se optimiza con prompts concisos y limitación de tokens de salida.
