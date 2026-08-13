# Investigación: Extracción de eventos desde fuentes reales con IA

Las ambigüedades funcionales ya se resolvieron en `spec.md` (`## Clarifications`: HTML crudo sin
render JS, límite de 30s, bloqueo de SSRF). Lo que queda aquí son decisiones **técnicas** para
pasar de la spec al diseño (Fase 1), tomadas sobre el código ya existente de la feature 001
(`backend/src/integrations/event-extraction.ts`, `backend/src/services/import-service.ts`).

## R1 — Obtención del contenido de la URL (FR-001, FR-002)

- **Decisión**: usar el `fetch` nativo de Node 20 (sin cliente HTTP de terceros), método `GET`,
  cabecera `Accept: text/html`. Los redirects se gestionan manualmente (`redirect: 'manual'`) en un
  bucle de hasta 3 saltos, revalidando esquema y SSRF (R2) en **cada** salto antes de seguirlo — no
  basta con validar la URL original si el servidor redirige a un destino interno. La lectura del
  cuerpo se corta a un tamaño máximo (`RUMBO_AI_MAX_HTML_BYTES`, por defecto 2 MB) aunque el
  servidor no envíe `Content-Length`, para acotar memoria y tiempo. Cualquier estado que no sea
  `2xx` tras seguir redirects se trata como fuente ilegible (FR-006).
- **Rationale**: evita añadir una dependencia HTTP nueva para un `GET` con timeout; mantiene la
  obtención en el backend (Principio VI).
- **Alternativas consideradas**: `axios`/`got` — descartadas, no aportan nada que `fetch` nativo con
  redirects manuales no resuelva ya para este caso de uso.

## R2 — Prevención de SSRF (FR-013)

- **Decisión**: solo se aceptan esquemas `http`/`https` (cualquier otro, ilegible directo). Antes de
  conectar, se resuelve el host con `dns.lookup` (todas las direcciones) y se rechaza si alguna
  dirección resuelta es privada/reservada (rangos RFC1918 `10/8`, `172.16/12`, `192.168/16`,
  loopback `127/8`/`::1`, link-local `169.254/16` — incluye el endpoint de metadatos de nube
  `169.254.169.254` — y `fc00::/7`/`fe80::/10`). Para evitar TOCTOU por *DNS rebinding* (el nombre
  resuelve a una IP pública en el check pero a una privada al conectar de verdad), la conexión real
  se fija a la IP ya validada usando un `Agent` de `undici` con `connect`/`lookup` personalizado,
  pasado como `dispatcher` a la llamada `fetch` — así el socket solo puede abrirse contra la
  dirección que superó el check. La misma validación se repite en cada salto de redirect (R1).
- **Rationale**: cumple FR-013 de forma robusta ante el vector de ataque más común contra un simple
  check "resuelve y compara" (rebinding entre el check y la conexión).
- **Alternativas consideradas**: validar solo la URL de entrada sin fijar la IP de conexión —
  descartado, deja abierta la ventana de *rebinding*.

## R3 — Motor de IA para estructurar el evento (FR-003, FR-004, FR-011)

- **Decisión**: nueva dependencia `@anthropic-ai/sdk` y un nuevo adaptador
  `AnthropicEventExtractionAdapter implements EventExtractionAdapter` (mismo contrato ya usado por
  `StubEventExtractionAdapter`, así que `ImportService` no cambia). Se fuerza salida estructurada
  con *tool use*: una tool `registrar_evento` cuyo JSON Schema coincide con
  `DatosEventoExtraidos`, `tool_choice` fijado a esa tool, `temperature: 0` y modelo configurable
  vía `RUMBO_AI_MODEL` (por defecto un modelo Claude rápido/económico apto para extracción). El
  *system prompt* instruye a no inventar datos ausentes (usar `null`) y a normalizar fechas a
  ISO 8601 (edge case de zonas horarias de la spec).
- **Rationale**: el *tool use* obliga al proveedor a devolver un JSON con la forma esperada en vez
  de texto libre a parsear, reduciendo el riesgo del edge case "la IA devuelve datos con formato
  inesperado". El adaptador implementa la misma interfaz que el stub (FR-011: motor reemplazable
  sin tocar el contrato del servicio de importación).
- **Alternativas consideradas**: pedir JSON por prompt libre y parsearlo a mano — descartado, más
  frágil ante el edge case de formato inesperado que ya identifica la spec.

## R4 — De HTML a texto de entrada para la IA (FR-008, edge case de contenido largo)

- **Decisión**: función pura `htmlATexto(html): string` sin dependencias de parsing DOM: elimina
  por completo `<script>`, `<style>` y `<noscript>`, quita el resto de etiquetas, decodifica
  entidades HTML comunes y colapsa espacios en blanco. El resultado se recorta a un máximo de
  caracteres configurable (`RUMBO_AI_MAX_CHARS`, por defecto 20 000) priorizando el inicio del
  documento. Es una heurística simple, no una detección semántica de "la sección de agenda"; el
  edge case correspondiente de la spec acepta esta aproximación para el MVP.
- **Rationale**: evita añadir una dependencia de parsing HTML (`cheerio` u otra) para un MVP en el
  que el texto plano tras quitar etiquetas ya es una entrada razonable para el modelo de IA.
- **Alternativas consideradas**: `cheerio` con selectores heurísticos ("agenda", "schedule") para
  aislar la sección relevante — mejora futura razonable, descartada ahora para no añadir una
  dependencia nueva solo para una heurística que tampoco sería fiable de forma genérica.

## R5 — Presupuesto único de 30 s para fetch + IA (FR-008, SC-003)

- **Decisión**: al entrar en `extraer()` se calcula `deadline = Date.now() + 30_000`. El fetch (R1)
  recibe un `AbortSignal` con el tiempo restante hasta el `deadline`; tras obtenerlo, el tiempo que
  quede (si es razonable, p. ej. > 1 s) se usa como timeout de la llamada a la IA (R3). Si en
  cualquier punto ya no queda margen, se aborta sin llamar a la siguiente etapa y se devuelve
  ilegible — nunca dos timeouts fijos independientes que sumados podrían superar los 30 s.
- **Rationale**: cumple SC-003 de forma exacta y evita que una etapa lenta consuma el margen de la
  otra de forma injusta.
- **Alternativas consideradas**: timeout fijo por etapa (p. ej. 15 s + 15 s) — descartado, no se
  adapta si una etapa concreta necesita más margen dentro del total.

## R6 — Validación de la estructura devuelta por la IA antes de persistir (FR-004)

- **Decisión**: ampliar `backend/src/models/validation.ts` con `esDatosExtraidosValidos(datos)`:
  comprueba tipos, que las fechas no nulas sean ISO 8601 parseables y coherentes
  (`fecha_fin >= fecha_inicio` cuando ambas existen), y que cada sesión tenga `titulo`/`inicio`/`fin`
  no vacíos. Si la respuesta de la IA no incluye la *tool call* esperada, no parsea, o no pasa esta
  validación, `extraer()` devuelve `null` (mismo contrato que hoy usa el stub para "ilegible").
- **Rationale**: FR-004 exige descartar resultados no fiables antes de persistir; reutiliza el
  mismo patrón de `null = ilegible` que ya consume `ImportService`.

## R7 — Degradación controlada sin clave de IA configurada (FR-012)

- **Decisión**: `AnthropicEventExtractionAdapter` recibe la API key por constructor.
  `backend/src/context.ts` la lee una sola vez de `process.env.ANTHROPIC_API_KEY` al construir el
  contexto; si falta, no se instancia el cliente de Anthropic y el adaptador combinado (R8) devuelve
  directamente `null` para el camino de URL real, sin intentar red, registrando un único
  `log.warn` al arrancar. Se añade `dotenv` (dependencia ligera, ya anticipada por `.gitignore` con
  `.env`/`.env.example`) para cargar `ANTHROPIC_API_KEY` en `backend/.env` en desarrollo local, sin
  tener que exportar variables a mano en cada sesión de terminal.
- **Rationale**: FR-012 exige degradación controlada, no un fallo opaco; mismo mensaje de "fuente
  ilegible" que ya conoce el cliente (Historia 2).

## R8 — Distinguir payload estructurado de URL real sin tocar el contrato existente (FR-001, FR-007)

- **Decisión**: hoy `fuente` vale siempre `'url'` tanto en el frontend (`ImportEvent.tsx`) como en
  los fixtures E2E (`e2e/tests/fixtures.ts`), que envían un payload JSON estructurado; no hay forma
  de distinguir "demo/JSON" de "URL real" a partir de `fuente`. La decisión se toma a partir de la
  **forma del propio `payload`**, dentro del mismo adaptador:
  1. Si `payload` (recortado) empieza por `{` y parsea como JSON de un objeto → camino estructurado
     existente, sin invocar la IA (preserva FR-007 y toda la compatibilidad con 001/002).
  2. Si no, y `payload` recortado es una URL `http`/`https` válida (`new URL(...)` no lanza y el
     esquema es `http`/`https`) → camino real: fetch (R1) + SSRF (R2) + texto (R4) + IA (R3/R5) +
     validación (R6).
  3. Cualquier otro caso (vacío, texto que no es ni JSON ni URL, otro esquema) → `null` (ilegible).
- **Rationale**: no obliga a tocar el frontend, los fixtures E2E ni el contrato de
  `POST /api/events/import` de esta feature; mantiene FR-007 sin invocar la IA para el camino
  estructurado.
- **Alternativas consideradas**: añadir un campo `modo` explícito al body de importación —
  descartado, rompería el contrato ya usado por 001/002 sin necesidad (Principio VII).

## R9 — Trazabilidad del origen (FR-010)

- **Decisión**: añadir `fuente_valor: string | null` a `Evento` — se persiste la URL cuando el
  import fue por el camino real (R8, caso 2); `null` en el resto de casos. Nunca se persiste el HTML
  obtenido ni el texto enviado a la IA (son transitorios, ver `data-model.md`), evitando guardar
  contenido sensible innecesario (FR-010).
- **Rationale**: cumple FR-010 con el mínimo dato necesario, coherente con el resto de campos ya
  persistidos de `Evento`.

## R10 — Estrategia de pruebas para el camino de IA real

- **Decisión**: los tests unitarios de backend (Vitest, primeros de este paquete) cubren
  `AnthropicEventExtractionAdapter` con el cliente de Anthropic mockeado: extracción válida,
  respuesta inválida (→ ilegible), timeout (→ ilegible), sin clave configurada (→ ilegible sin red).
  También cubren `esIpPrivada`/la resolución SSRF (R2) y `htmlATexto` (R4) de forma aislada. La
  cobertura E2E (Playwright) del camino real "URL pública + IA" queda **fuera** de la suite
  automática, por depender de red externa y de una clave de pago (no determinista); se valida a
  mano con el Escenario 1 de `quickstart.md`. La suite E2E sí cubre de forma determinista y sin red:
  el camino estructurado (ya existente, sin cambios), el bloqueo SSRF (URL a `http://127.0.0.1:...`)
  y el caso "IA sin configurar".
- **Rationale**: mismo principio que llevó a los adaptadores `Stub` del resto de features —
  mantener la suite E2E rápida y determinista — sin dejar de cubrir de forma automática el
  comportamiento crítico de seguridad (SSRF) y de degradación (FR-012).
