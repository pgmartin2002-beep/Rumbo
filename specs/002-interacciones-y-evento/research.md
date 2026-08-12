# Investigación: Preparar interacciones y vivir el evento

Todas las ambigüedades funcionales ya se resolvieron en `spec.md` (`## Clarifications`). Lo que
queda aquí son decisiones **técnicas** necesarias para pasar de la spec al diseño (Fase 1), tomadas
a partir del código ya existente de la feature 001 (`backend/`, `frontend/`, `e2e/`).

## R1 — Persistencia de las nuevas entidades

- **Decisión**: reutilizar `JsonRepository<T>` (`backend/src/repositories/json-repository.ts`) sin
  modificarlo. Tres colecciones nuevas: `preguntas.json`, `notas.json`, `contactos.json` en el
  mismo `RUMBO_DATA_DIR`.
- **Rationale**: es la interfaz de persistencia ya validada por la feature 001; añadir un motor
  distinto para esta feature rompería la Suposición de la spec de que la elección técnica de
  almacenamiento no cambia entre specs de producto, y el Principio VII (continuidad).
- **Alternativas consideradas**: SQLite embebido (descartado: volumen de datos trivial para un MVP
  de un usuario por dispositivo, no justifica la complejidad ni migrar 001 a la vez).

## R2 — Generación de preguntas (FR-001–FR-004)

- **Decisión**: nuevo adaptador `QuestionGenerationAdapter` en
  `backend/src/integrations/question-generation.ts`, con una implementación `Stub` análoga a
  `StubEventExtractionAdapter`: determinista para pruebas/demo, decide "información insuficiente"
  cuando la sesión no tiene `tema`. La elección del motor real (LLM, plantillas, etc.) se difiere a
  una spec de backend/integración, igual que la extracción de eventos en 001.
- **Rationale**: Principio VI (IA a través de capas controladas) — el cliente nunca llama
  directamente a un motor de generación; solo pide `/api/.../preguntas/generar` al backend.
- **Alternativas consideradas**: generar preguntas en el cliente con una librería JS de plantillas
  (descartado: viola Principio VI y acopla el cliente a la lógica de generación).

## R3 — Transcripción de voz a texto (FR-009)

- **Decisión**: el cliente grava el audio con la Web API `MediaRecorder` (nativa del navegador, sin
  librería nueva) y lo envía como payload al backend solo cuando hay conexión. Nuevo adaptador
  `VoiceTranscriptionAdapter` en `backend/src/integrations/voice-transcription.ts`, con una
  implementación `Stub` que interpreta el payload como texto ya transcrito (mismo patrón de stub
  determinista que `StubEventExtractionAdapter`, útil para pruebas). El motor real de voz-a-texto
  se decide en una spec de backend/integración (Suposición de la spec).
- **Rationale**: Principio VI; consistente con la aclaración de sesión 2026-08-12 de que la
  transcripción requiere conexión (a diferencia de notas de texto, contactos y modo simplificado).
- **Alternativas consideradas**: Web Speech API del navegador (reconocimiento en el propio
  dispositivo) — descartada para el MVP porque su soporte y calidad varían mucho entre navegadores
  móviles y rompería el Principio VI (el cliente resolvería la transcripción sin pasar por una capa
  controlada); queda como alternativa a evaluar en la spec de backend/integración.

## R4 — Detección de contactos posiblemente duplicados (FR-016)

- **Decisión**: función pura sin dependencias nuevas en
  `backend/src/services/name-matching.ts`:
  1. Normalizar cada nombre (minúsculas, quitar acentos/diacríticos vía `NFD`, recortar espacios,
     colapsar espacios internos).
  2. Separar en tokens (palabras), ordenarlos alfabéticamente y volver a unirlos — esto hace que
     "Juan Pérez" y "Pérez Juan" se comparen igual.
  3. Calcular la distancia de Levenshtein entre las dos cadenas de tokens ordenados.
  4. Marcar como posible duplicado si la distancia ≤ `max(1, round(0.2 × longitud de la cadena más
     larga))` — tolera erratas y variaciones menores sin disparar falsos positivos con nombres muy
     distintos.
  - El resultado se calcula al vuelo (no se persiste como campo fijo) para no quedar desactualizado
    si se editan nombres más adelante.
- **Rationale**: cumple la aclaración de sesión 2026-08-12 ("coincidencia aproximada... tolera
  errores de escritura, orden de nombre/apellido y variaciones menores") sin añadir una dependencia
  de NLP para un MVP de bajo volumen de contactos por evento.
- **Alternativas consideradas**: librería de fuzzy-matching (p. ej. `fuse.js`) — descartada: el
  backend de esta feature no tenía dependencias de terceros más allá de `fastify` y el volumen de
  contactos por evento no lo justifica.

## R5 — "Qué toca ahora" y resolución de solapes (FR-005–FR-007, FR-018)

- **Decisión**: cálculo puramente de cliente sobre la `AgendaVista` ya devuelta por
  `GET /api/events/:id/agenda` (que ya incluye `prioridad`, `en_conflicto` y `es_alternativa_de` por
  sesión, calculados por `AgendaService`). Una función pura en
  `frontend/src/services/active-session.ts` recibe `(agenda, ahora)` y devuelve la sesión activa,
  aplicando estas reglas en orden:
  1. Sesiones cuyo rango `[inicio, fin)` contiene `ahora`.
  2. Si hay más de una (solape, FR-018), excluir las marcadas `es_alternativa_de !== null` y quedarse
     con la de mayor `prioridad` (imprescindible > opcional > descartable); si persiste el empate,
     la de `inicio` más temprano.
  3. Si no hay ninguna, buscar la próxima sesión futura (hueco, US2 AC3) o indicar "evento no
     activo" si `ahora` está fuera de `[primera sesión, última sesión]` (US2 AC4).
  - Un `setInterval` de 30s en el componente de modo simplificado vuelve a evaluar la función sin
    pedir red, por lo que funciona también sin conexión reutilizando la última agenda cacheada.
- **Rationale**: no duplica en el backend una lógica de prioridad que `AgendaService` ya calculó en
  la feature 001 (Principio VII); mantiene el modo simplificado disponible offline sin sincronizar
  reloj de servidor.
- **Alternativas consideradas**: endpoint dedicado `GET /api/events/:id/modo-simplificado` que
  recalcula en el servidor — descartado: obligaría a tener red para algo que la aclaración de sesión
  2026-08-12 exige que funcione sin conexión, y duplicaría lógica ya resuelta en el cliente.

## R6 — Captura y sincronización sin conexión (FR-017)

- **Decisión**: cola de pendientes en IndexedDB del navegador (API nativa, sin librería), gestionada
  por `frontend/src/services/offline-store.ts`:
  - Cada nota/contacto creado offline se guarda con un `id` generado en cliente (`crypto.randomUUID()`)
    y se muestra de inmediato en la UI (optimista) con una etiqueta "pendiente de sincronizar".
  - Un listener de `window.addEventListener('online', …)` y un intento al cargar la app disparan el
    envío secuencial de la cola al backend; cada item se retira de la cola solo tras una respuesta
    `2xx` (reintentable de forma segura porque el `id` es idempotente para el repositorio).
  - Las notas de voz creadas offline guardan el audio localmente (Blob en IndexedDB) y quedan como
    `estado_transcripcion: 'pendiente'` hasta que haya conexión para transcribirlas (R3).
  - La última `AgendaVista` obtenida con éxito se cachea en IndexedDB para que el modo simplificado
    (R5) siga funcionando offline.
- **Rationale**: cumple SC-006 (0% de pérdida) y la aclaración de que notas/contactos/modo
  simplificado funcionan sin conexión; reutiliza el manejo de errores ya existente en
  `api-client.ts` (distingue error de red `'red'` de errores de negocio) para decidir cuándo encolar
  en vez de mostrar un error.
- **Alternativas consideradas**: Service Worker con `Background Sync API` — descartada para el MVP
  por soporte desigual entre navegadores móviles; el enfoque de cola manual con reintento en foreground
  cubre el mismo caso de uso con menos riesgo de incompatibilidad.

## R7 — Quién decide la "sesión activa" al crear una nota/contacto (FR-012, FR-013)

- **Decisión**: el cliente envía explícitamente `sesion_id` (o `null`) en el body de creación,
  calculado con la misma función de R5 que ya está mostrando en pantalla. El backend no vuelve a
  derivar la sesión activa a partir de la hora del servidor.
- **Rationale**: evita discrepancias entre lo que el usuario ve en pantalla y lo que el backend
  decide, y es indispensable para que la captura funcione offline (el backend no puede recalcular
  nada si no hay conexión en el momento de la creación real).
- **Alternativas consideradas**: recalcular en el servidor con la hora de creación — descartado por
  el motivo offline anterior.
