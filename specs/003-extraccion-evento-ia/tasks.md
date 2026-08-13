---

description: "Task list template for feature implementation"
---

# Tasks: Extracción de eventos desde fuentes reales con IA

**Input**: Design documents from `/specs/003-extraccion-evento-ia/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: research.md R10 pide explícitamente tests unitarios (primeros de `backend/`, dado el
riesgo de seguridad de SSRF y el presupuesto de tiempo) y un spec E2E determinista sin red externa;
se incluyen como tareas propias.

**Organization**: Tareas agrupadas por historia de usuario para poder implementarlas y probarlas de
forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Monorepo web existente (`backend/`, `frontend/`, `e2e/`); esta feature no toca `frontend/`
(plan.md, Structure Decision).

## Phase 1: Setup

**Purpose**: Preparar dependencias y configuración antes de tocar el pipeline de extracción.

- [X] T001 [P] Añadir `@anthropic-ai/sdk`, `undici` y `dotenv` a `backend/package.json` y ejecutar
      `cd backend && npm install` (research.md R1–R3, R7)
- [X] T002 [P] Crear `backend/.env.example` con `ANTHROPIC_API_KEY`, `RUMBO_AI_MODEL`,
      `RUMBO_AI_MAX_HTML_BYTES` (por defecto `2097152`) y `RUMBO_AI_MAX_CHARS` (por defecto
      `20000`) (research.md R4, R7)
- [X] T003 Cargar `dotenv` al inicio de `backend/src/api/server.ts` (`import 'dotenv/config'` antes
      de cualquier lectura de `process.env`) para que `backend/.env` esté disponible en desarrollo
      (research.md R7)

**Checkpoint**: Dependencias y configuración listas.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Punto de entrada compartido que decide, a partir del `payload`, si una importación usa
el camino estructurado existente o el nuevo camino de URL real — sin esto ninguna historia es
comprobable de forma independiente sobre el endpoint real.

**⚠️ CRITICAL**: US1, US2 y US3 no pueden completarse ni probarse de punta a punta hasta que esta
fase esté cerrada (aunque T009–T014 de US1 sí pueden empezarse en paralelo).

- [X] T004 [P] Añadir `fuente_valor: string | null` a `interface Evento` en
      `backend/src/models/index.ts` (data-model.md)
- [X] T005 [P] Añadir `esUrlPublicaCandidata(payload: string): boolean` en
      `backend/src/integrations/event-extraction.ts` (recorta espacios, `new URL(...)` no lanza y
      el esquema es `http`/`https`), exportada para reutilizarla desde `ImportService`
      (research.md R8)
- [X] T006 Crear `CompositeEventExtractionAdapter implements EventExtractionAdapter` en
      `backend/src/integrations/event-extraction.ts`: si `payload` recortado parsea como JSON de un
      objeto, delega en `StubEventExtractionAdapter` (sin cambios, preserva FR-007); si no y
      `esUrlPublicaCandidata(payload)` (T005), llama a un método `extraerDeUrl(payload, deadline)`
      (placeholder que devuelve `null` hasta que US1 lo implemente); en cualquier otro caso,
      devuelve `null` (research.md R8) (depende de T005)
- [X] T007 Actualizar `backend/src/services/import-service.ts`: tras una extracción exitosa
      (`datos !== null`), fijar `fuente_valor: esUrlPublicaCandidata(payload) ? payload : null` al
      crear el `Evento` (data-model.md, research.md R9) (depende de T004, T005)

**Checkpoint**: El endpoint decide correctamente entre JSON estructurado y URL candidata; el camino
de URL real aún no hace nada (US1 lo completa).

---

## Phase 3: User Story 1 - Importar un evento pegando la URL de su web (Priority: P1) 🎯 MVP

**Goal**: pegar la URL pública de un evento crea un borrador con nombre, fechas, ubicación y
sesiones (con ponentes cuando el contenido los expone), sin introducir nada a mano.

**Independent Test**: pegar la URL pública de un evento con agenda accesible y comprobar que se
crea un borrador de evento con nombre, fechas y al menos una sesión, sin intervención manual
(spec.md, Historia 1).

### Implementation for User Story 1

- [X] T008 [P] [US1] Crear `backend/src/integrations/ssrf-guard.ts`: `esIpPrivada(ip: string)`
      (RFC1918, loopback, link-local incl. `169.254.169.254`, `::1`, `fc00::/7`, `fe80::/10`) y
      `resolverYValidar(hostname: string)` que resuelve con `dns.lookup` (todas las direcciones) y
      rechaza si alguna es privada (research.md R2)
- [X] T009 [P] [US1] Crear `backend/tests/ssrf-guard.test.ts`: casos de IP pública, privada,
      loopback y metadatos de nube para `esIpPrivada`/`resolverYValidar` (research.md R10)
- [X] T010 [US1] Crear `backend/src/integrations/http-fetch.ts`: `obtenerHtml(url, deadline)` con el
      `fetch` nativo de Node, un `Agent` de `undici` cuyo `lookup` solo devuelve la IP ya validada
      por `resolverYValidar` (T008) — fija la conexión a esa IP para evitar DNS rebinding —,
      `redirect: 'manual'` con hasta 3 saltos revalidando esquema y SSRF en cada uno, corte de
      lectura a `RUMBO_AI_MAX_HTML_BYTES`, y `AbortSignal` calculado a partir de `deadline`
      (research.md R1, R2, R5) (depende de T008)
- [X] T011 [P] [US1] Crear `backend/src/services/html-to-text.ts`: `htmlATexto(html: string): string`
      — elimina `<script>`/`<style>`/`<noscript>`, quita el resto de etiquetas, decodifica entidades
      comunes, colapsa espacios y recorta a `RUMBO_AI_MAX_CHARS` (research.md R4)
- [X] T012 [P] [US1] Crear `backend/tests/html-to-text.test.ts`: limpieza de etiquetas/entidades y
      recorte al límite de caracteres (research.md R10)
- [X] T013 [P] [US1] Añadir `esDatosExtraidosValidos(datos: unknown): datos is DatosEventoExtraidos`
      en `backend/src/models/validation.ts`: tipos, fechas ISO 8601 parseables y coherentes
      (`fecha_fin >= fecha_inicio` si ambas existen), sesiones con `titulo`/`inicio`/`fin` no vacíos
      (research.md R6)
- [X] T014 [US1] Crear `AnthropicEventExtractionAdapter implements EventExtractionAdapter` en
      `backend/src/integrations/event-extraction.ts`: usa `@anthropic-ai/sdk` con *tool use*
      (`tool_choice` fijo a una tool `registrar_evento` cuyo JSON Schema coincide con
      `DatosEventoExtraidos`), `temperature: 0`, modelo desde `RUMBO_AI_MODEL`, timeout derivado del
      `deadline` recibido; valida la respuesta con `esDatosExtraidosValidos` (T013) y devuelve `null`
      ante cualquier fallo (sin *tool call*, JSON inválido, validación fallida, timeout)
      (research.md R3, R5, R6) (depende de T013)
- [X] T015 [US1] Completar `CompositeEventExtractionAdapter.extraerDeUrl` (placeholder de T006):
      calcular `deadline = Date.now() + 30_000` al entrar, llamar a `obtenerHtml` (T010) →
      `htmlATexto` (T011) → `AnthropicEventExtractionAdapter.extraer` (T014), propagando el mismo
      `deadline` a cada etapa; cualquier excepción o `null` intermedio se traduce en `null`
      (research.md R5) (depende de T006, T010, T011, T014)
- [X] T016 [US1] Actualizar `backend/src/context.ts`: leer `ANTHROPIC_API_KEY`/`RUMBO_AI_MODEL` de
      `process.env`; si la clave está presente, instanciar `AnthropicEventExtractionAdapter` y
      pasarlo a `CompositeEventExtractionAdapter`; cablear este último (no `StubEventExtractionAdapter`
      directamente) como `extractor` de `ImportService` (depende de T015)
- [X] T017 [P] [US1] Crear `backend/tests/event-extraction.test.ts`: `AnthropicEventExtractionAdapter`
      con el cliente de Anthropic mockeado — caso de extracción válida (research.md R10) (depende de
      T014)

**Checkpoint**: US1 completa — importar por URL real funciona de punta a punta (validar a mano con
`quickstart.md` Escenario 1, que requiere `ANTHROPIC_API_KEY`).

---

## Phase 4: User Story 2 - Saber cuándo una fuente no se puede extraer, sin bloquearme (Priority: P2)

**Goal**: cualquier fallo de obtención o extracción responde con "fuente ilegible" y opciones de
recuperación, sin crear eventos vacíos ni errores opacos.

**Independent Test**: importar desde una URL inaccesible o no relacionada con un evento y comprobar
que la app muestra "fuente ilegible" con acciones de recuperación, sin crear un borrador vacío
(spec.md, Historia 2).

### Implementation for User Story 2

- [X] T018 [P] [US2] Ampliar `backend/tests/event-extraction.test.ts` (T017):
      `AnthropicEventExtractionAdapter` devuelve `null` ante una respuesta sin *tool call*, JSON
      malformado, datos que no pasan `esDatosExtraidosValidos`, y ante un `deadline` ya vencido
      (research.md R6, R10) (depende de T017)
- [X] T019 [P] [US2] Ampliar `backend/tests/ssrf-guard.test.ts` (T009): `obtenerHtml` (T010)
      revalida SSRF en cada salto de redirect, incluido un redirect hacia una IP privada
      (research.md R2, R10) (depende de T010)
- [X] T020 [US2] En `backend/src/context.ts` (T016): cuando `ANTHROPIC_API_KEY` no está definida, no
      instanciar el cliente de Anthropic — cablear un adaptador que devuelve `null` de inmediato
      para `extraerDeUrl` sin llamar a red, y registrar un único `app.log.warn` al arrancar
      (research.md R7) (depende de T016)
- [X] T021 [P] [US2] Crear `e2e/tests/importar-url.spec.ts` cubriendo el Escenario 2 (pasos 2–4) de
      `quickstart.md`: bloqueo SSRF contra `http://127.0.0.1:...` y contra
      `http://169.254.169.254/...`, y degradación sin `ANTHROPIC_API_KEY` — sin red externa ni clave
      real (research.md R10) (depende de T016, T020)

**Checkpoint**: US1 y US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Mantener la importación manual/estructurada existente (Priority: P3)

**Goal**: pegar un payload ya estructurado sigue creando el evento exactamente igual que antes, sin
invocar el motor de IA.

**Independent Test**: pegar un payload con datos estructurados válidos y comprobar que el evento se
crea sin pasar por la IA (spec.md, Historia 3).

### Implementation for User Story 3

- [X] T022 [P] [US3] Añadir a `backend/tests/event-extraction.test.ts` (T017) un caso que llame a
      `CompositeEventExtractionAdapter.extraer` con un payload JSON y compruebe (con un spy sobre el
      cliente de Anthropic) que nunca se invoca la IA, delegando en el mismo comportamiento que
      `StubEventExtractionAdapter` ya tenía (research.md R8, R10) (depende de T006, T017)
- [X] T023 [US3] Ejecutar sin modificar la suite E2E existente de 001/002
      (`e2e/tests/onboarding.spec.ts` y el resto) y confirmar que sigue en verde — sin regresión por
      el nuevo enrutado de `CompositeEventExtractionAdapter` (SC-004) (depende de T016)

**Checkpoint**: Las 3 historias de usuario funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras que afectan a la feature en conjunto.

- [X] T024 [P] Actualizar `README.md`: mencionar la feature 003, las variables de entorno nuevas del
      backend (`ANTHROPIC_API_KEY`, `RUMBO_AI_MODEL`, etc.) y el escenario E2E nuevo
- [X] T025 [P] Ejecutar `cd backend && npm run typecheck && npm run lint` sobre todos los archivos
      nuevos/modificados
- [ ] T026 Ejecutar manualmente el Escenario 1 de `quickstart.md` (URL pública real + IA) de punta a
      punta, confirmando SC-001, SC-002, SC-003 y SC-005
- [X] T027 [P] Revisar los logs de una importación fallida y una exitosa para confirmar que ninguna
      credencial de la IA aparece en logs ni en la respuesta de la API (FR-009)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato.
- **Foundational (Phase 2)**: depende de Setup (necesita `undici`/`@anthropic-ai/sdk` instalados
  para que el proyecto compile una vez T006/T014 existan); **bloquea** la finalización de US1, US2 y
  US3, aunque T008–T013 de US1 pueden desarrollarse en paralelo con T004–T007.
- **User Stories (Phase 3–5)**: US1 (P1) es el camino crítico (implementa `extraerDeUrl`); US2 y US3
  dependen de que US1 exista para tener algo que probar en negativo/regresión, pero no reimplementan
  su lógica.
- **Polish (Phase 6)**: depende de que las historias que se vayan a entregar estén completas.

### User Story Dependencies

- **US1 (P1)**: depende de Foundational (T004–T007). Sin dependencias de US2/US3.
- **US2 (P2)**: depende de Foundational y de US1 (reutiliza `obtenerHtml`, `AnthropicEventExtractionAdapter`
  y el wiring de `context.ts` que US1 deja listos); sus tareas son deterministas y no requieren red
  real ni clave de IA.
- **US3 (P3)**: depende de Foundational (T006) y de que US1 haya cableado
  `CompositeEventExtractionAdapter` en `context.ts` (T016) para poder correr la suite E2E completa;
  no depende de la lógica interna de US1/US2.

### Parallel Opportunities

- T001 y T002 (Setup) en paralelo.
- T004 y T005 (Foundational) en paralelo.
- Dentro de US1: T008/T009 (SSRF), T011/T012 (html-to-text) y T013 (validación) en paralelo entre sí
  antes de que T010, T014, T015 los integren.
- T018, T019, T021 (US2) en paralelo entre sí una vez cerrado US1.
- T022 (US3) en paralelo con las tareas de US2.

---

## Parallel Example: User Story 1

```bash
# En paralelo, antes de integrar el pipeline:
Task: "Crear backend/src/integrations/ssrf-guard.ts (T008)"
Task: "Crear backend/tests/ssrf-guard.test.ts (T009)"
Task: "Crear backend/src/services/html-to-text.ts (T011)"
Task: "Crear backend/tests/html-to-text.test.ts (T012)"
Task: "Añadir esDatosExtraidosValidos en backend/src/models/validation.ts (T013)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational (bloquea el resto)
3. Completar Fase 3: User Story 1
4. **STOP and VALIDATE**: probar el Escenario 1 de `quickstart.md` con una URL real
5. Desplegar/demo si está listo

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → importar por URL real funciona (MVP)
3. US2 → todos los fallos degradan a "fuente ilegible" de forma controlada y testeada
4. US3 → confirmado que la importación estructurada de 001/002 no tiene regresiones
5. Polish → documentación y verificación final

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes entre sí
- La etiqueta [Story] traza cada tarea a su historia de usuario
- research.md R10 justifica por qué el camino real "URL + IA" no tiene cobertura E2E automática
  (red externa + clave de pago); se valida a mano (T026)
- Confirmar que los tests fallan antes de implementar cuando se sigue TDD en T009/T012/T017/T018/T019
- Hacer commit tras cada tarea o grupo lógico de tareas

## Desviaciones respecto al plan durante la implementación

Pequeños ajustes de diseño resueltos durante `/speckit-implement`, documentados aquí por
transparencia (no cambian el contrato de `spec.md` ni `contracts/api.md`):

- **T013 (`esDatosExtraidosValidos`)**: vive en `backend/src/integrations/event-extraction.ts`, no
  en `models/validation.ts` — moverla allí habría creado un import circular
  (`validation.ts` → tipo `DatosEventoExtraidos` de `event-extraction.ts` → `validation.ts`).
- **T014 (`AnthropicEventExtractionAdapter`)**: implementa una interfaz más estrecha,
  `MotorExtraccionIA.estructurar(texto, deadline)`, en vez de `EventExtractionAdapter` completo.
  Solo `CompositeEventExtractionAdapter` (T006) implementa `EventExtractionAdapter` y es el único
  que ve `ImportService` — FR-011 (motor reemplazable sin tocar el contrato del servicio de
  importación) queda igual de satisfecho, con una frontera de interfaz más correcta.
- **T019**: las pruebas de revalidación SSRF en cada salto de redirect quedaron en un archivo nuevo,
  `backend/tests/http-fetch.test.ts` (con un servidor HTTP local real), en vez de ampliar
  `ssrf-guard.test.ts` — permite probar `obtenerHtml` de punta a punta sin mockear `fetch`.
- **T020 / research.md R7**: el aviso de "IA sin configurar" usa `console.warn` en vez de
  `app.log.warn`, porque `createContext()` se construye antes de que exista la instancia de
  Fastify (no hay logger disponible en ese punto).
- **T026**: no se ejecutó — requiere una `ANTHROPIC_API_KEY` real y una URL pública de un evento;
  queda pendiente para quien configure una clave (ver `quickstart.md` Escenario 1).
- **Modelo de IA por defecto**: se fijó `claude-haiku-4-5-20251001` en `RUMBO_AI_MODEL` (research.md
  U1 del informe de `/speckit-analyze`), en vez de dejarlo sin pinear.
