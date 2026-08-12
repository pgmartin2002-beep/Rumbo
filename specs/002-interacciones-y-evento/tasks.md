---

description: "Task list template for feature implementation"
---

# Tasks: Preparar interacciones y vivir el evento

**Input**: Design documents from `/specs/002-interacciones-y-evento/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md (todos presentes)

**Tests**: este repo no usa tests unitarios (no hay `*.test.ts` en `backend/` ni `frontend/` para la
feature 001); la validación se hace con Playwright end-to-end sobre los escenarios de
`quickstart.md`, como ya hace `e2e/tests/onboarding.spec.ts`. Por eso cada historia incluye una
tarea de e2e al final de su fase, no tests unitarios previos a la implementación.

**Organization**: Tareas agrupadas por historia de usuario (spec.md). Las 4 historias son P1; se
implementan en el orden de la spec, pero son independientes entre sí.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1–US4)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Monorepo existente (ver plan.md → Project Structure): `backend/src/`, `frontend/src/`, `e2e/tests/`.
No se crean paquetes nuevos.

---

## Phase 1: Setup

**Purpose**: Confirmar una base limpia antes de tocar código (sin dependencias nuevas, ver research.md).

- [ ] T001 Ejecutar `cd backend && npm run typecheck && npm run lint` y
      `cd frontend && npm run typecheck && npm run lint` para confirmar que el estado actual del
      repo (feature 001) está limpio antes de empezar

**Checkpoint**: Baseline verde. No hay tareas de instalación porque plan.md no añade dependencias.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura de cliente compartida por 3 de las 4 historias (US2, US3, US4); ninguna
historia la duplica.

**⚠️ CRITICAL**: US2, US3 y US4 no deben empezar hasta que esta fase esté completa. US1 no depende
de esta fase y podría empezar en paralelo si hay más de una persona trabajando.

- [ ] T002 [P] Crear `frontend/src/services/active-session.ts`: función pura
      `sesionActiva(agenda: AgendaVista, ahora: Date)` que calcula la sesión activa, el hueco o el
      "evento no activo" (FR-005–FR-007) y resuelve solapes quedándose con la de mayor `prioridad`
      entre las que no están marcadas `es_alternativa_de` (FR-018), según research.md R5
- [ ] T003 [P] Crear `frontend/src/services/offline-store.ts`: envoltorio de IndexedDB nativo con
      (a) cola de notas/contactos pendientes de sincronizar con `id` generado en cliente, (b) cache
      de la última `AgendaVista` obtenida, (c) almacenamiento de audio pendiente de transcripción, y
      una función `sincronizarPendientes()` que se dispara en `window.addEventListener('online', …)`
      y al cargar la app, según research.md R6

**Checkpoint**: Infraestructura de cliente lista — US2, US3 y US4 pueden empezar.

---

## Phase 3: User Story 1 - Preparar preguntas antes de cada sesión (Priority: P1)

**Goal**: cada sesión de la agenda muestra preguntas generales y técnicas sugeridas, regenerables, y
permite añadir preguntas manuales propias; si falta información, lo indica y permite crear a mano.

**Independent Test**: con un evento importado y una agenda ya generada, comprobar que cada sesión
muestra preguntas sugeridas, sin depender de notas ni contactos (spec.md Historia 1).

### Implementation for User Story 1

- [ ] T004 [P] [US1] Añadir `interface PreguntaPreparada` y `type OrigenPregunta = 'sugerida' | 'manual'`
      en `backend/src/models/index.ts` (data-model.md)
- [ ] T005 [P] [US1] Añadir `validarTextoPregunta` (no vacío) en `backend/src/models/validation.ts`
- [ ] T006 [US1] Añadir `preguntas: JsonRepository<PreguntaPreparada>` a `createRepositories` en
      `backend/src/repositories/index.ts` (depende de T004)
- [ ] T007 [P] [US1] Crear `QuestionGenerationAdapter` (interfaz) y `StubQuestionGenerationAdapter`
      en `backend/src/integrations/question-generation.ts`: devuelve `null` si la sesión no tiene
      `tema`; si tiene, devuelve un conjunto determinista de preguntas generales y técnicas
      (research.md R2)
- [ ] T008 [US1] Crear `QuestionsService` en `backend/src/services/questions-service.ts` con
      `listar(sesionId)`, `generar(sesionId)` (borra las `origen: 'sugerida'` anteriores de esa
      sesión, llama al adaptador, lanza `ApiError(422, 'informacion_insuficiente', …)` si el
      adaptador devuelve `null`) y `agregarManual(sesionId, texto)` (depende de T006, T007)
- [ ] T009 [US1] Crear rutas en `backend/src/api/routes/sessions-questions.ts`:
      `GET /api/events/:id/sesiones/:sesionId/preguntas`,
      `POST /api/events/:id/sesiones/:sesionId/preguntas/generar`,
      `POST /api/events/:id/sesiones/:sesionId/preguntas` (contracts/api.md; depende de T008)
- [ ] T010 [US1] Registrar `QuestionsService` y el adaptador en `backend/src/context.ts`, y las
      rutas nuevas en `backend/src/api/app.ts` (depende de T009)
- [ ] T011 [P] [US1] Crear `frontend/src/pages/SessionQuestions.tsx`: lista de preguntas
      (sugeridas + manuales), botón "Regenerar", formulario de pregunta manual, y tarjeta de aviso
      cuando el backend responde `informacion_insuficiente` (reutilizar `.illegible-card` de
      `tokens.css` como referencia visual de aviso)
- [ ] T012 [US1] Añadir la ruta `/eventos/:id/agenda/:sesionId` en `frontend/src/App.tsx` y enlazar
      cada tarjeta `.pass` de `frontend/src/pages/Agenda.tsx` a `SessionQuestions` (depende de T011)
- [ ] T013 [P] [US1] Crear `e2e/tests/preguntas.spec.ts` cubriendo el Escenario 1 de quickstart.md
      (generar, regenerar, manual, información insuficiente) (depende de T010, T012)

**Checkpoint**: US1 completa y comprobable de forma independiente.

---

## Phase 4: User Story 2 - Saber qué toca ahora y dónde es (Priority: P1)

**Goal**: modo simplificado que muestra la actividad actual y su ubicación, se actualiza solo, y
cubre huecos y momentos fuera de horario — funciona también sin conexión.

**Independent Test**: con un evento y agenda ya generados, simular distintas horas del día y
comprobar que el modo simplificado siempre muestra la actividad correspondiente, sin depender de
notas ni contactos (spec.md Historia 2). No requiere endpoint de backend nuevo (research.md R5).

### Implementation for User Story 2

- [ ] T014 [P] [US2] Crear `frontend/src/pages/SimplifiedMode.tsx`: usa `active-session.ts` (T002)
      sobre la agenda cacheada por `offline-store.ts` (T003); un `setInterval` de 30s reevalúa la
      sesión activa sin red; renderiza los 4 estados de la Historia 2 (sesión activa con sala, hueco
      con próxima actividad, evento no activo con primera/última actividad, y el caso de solape
      resuelto por prioridad de FR-018)
- [ ] T015 [US2] En `SimplifiedMode.tsx`, al montar: si hay conexión, pedir
      `GET /api/events/:id/agenda` y guardar el resultado con `offline-store.ts`; si no hay
      conexión, usar la última agenda cacheada (depende de T014, T003)
- [ ] T016 [US2] Añadir la ruta `/eventos/:id/ahora` en `frontend/src/App.tsx` y un CTA destacado
      "Modo simplificado →" en `frontend/src/pages/EventReview.tsx` cuando `estado_derivado` sea
      `en_curso` (depende de T014)
- [ ] T017 [P] [US2] Crear `e2e/tests/modo-simplificado.spec.ts` cubriendo el Escenario 2 de
      quickstart.md, incluido el caso de solape (depende de T016)

**Checkpoint**: US1 y US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Tomar notas vinculadas a la sesión activa (Priority: P1)

**Goal**: crear notas de texto o voz que quedan vinculadas a la sesión activa (o al evento en
general), consultables, editables, eliminables y reasignables — con captura sin conexión.

**Independent Test**: con una sesión activa en el modo simplificado, crear notas de texto y de voz y
comprobar que quedan asociadas a esa sesión, sin depender de contactos (spec.md Historia 3).

### Implementation for User Story 3

- [ ] T018 [P] [US3] Añadir `interface Nota`, `type OrigenNota = 'texto' | 'voz'` y
      `type EstadoTranscripcion = 'pendiente' | 'completada'` en `backend/src/models/index.ts`
      (data-model.md)
- [ ] T019 [P] [US3] Añadir `validarContenidoNota` (no vacío para texto/transcripción completada) en
      `backend/src/models/validation.ts`
- [ ] T020 [US3] Añadir `notas: JsonRepository<Nota>` a `createRepositories` en
      `backend/src/repositories/index.ts` (depende de T018)
- [ ] T021 [P] [US3] Crear `VoiceTranscriptionAdapter` (interfaz) y
      `StubVoiceTranscriptionAdapter` en `backend/src/integrations/voice-transcription.ts`: recibe
      el payload de audio y devuelve el texto transcrito o `null` si no es fiable (research.md R3)
- [ ] T022 [US3] Crear `NotesService` en `backend/src/services/notes-service.ts` con
      `listar(eventoId)`, `crear({evento_id, sesion_id, origen, contenido?, audio?})` (si
      `origen: 'voz'`, llama al adaptador; si devuelve `null`, guarda con `contenido: ''` y
      `estado_transcripcion: 'pendiente'` y responde 422 `transcripcion_no_fiable`),
      `editar(notaId, {contenido?, sesion_id?})` y `eliminar(notaId)` (depende de T020, T021)
- [ ] T023 [US3] Crear rutas en `backend/src/api/routes/events-notes.ts`:
      `GET/POST /api/events/:id/notas`, `PATCH/DELETE /api/events/:id/notas/:notaId`
      (contracts/api.md; depende de T022)
- [ ] T024 [US3] Registrar `NotesService` y el adaptador en `backend/src/context.ts`, y las rutas en
      `backend/src/api/app.ts` (depende de T023)
- [ ] T025 [P] [US3] Crear `frontend/src/pages/Notes.tsx`: lista de notas con su sesión o "evento en
      general", crear nota de texto, grabar nota de voz con la Web API `MediaRecorder`, editar,
      eliminar y reasignar la sesión de una nota vinculada al evento en general
- [ ] T026 [US3] Integrar `offline-store.ts` (T003) en `Notes.tsx`: si `api-client.ts` lanza un
      error de red (`ApiClientError` con `codigo: 'red'`) al crear, encolar la nota localmente y
      mostrarla como "pendiente de sincronizar"; sincronizar la cola al reconectar (depende de T025, T003)
- [ ] T027 [US3] Añadir la ruta `/eventos/:id/notas` en `frontend/src/App.tsx` y un enlace desde
      `EventReview.tsx` y `SimplifiedMode.tsx` (depende de T025)
- [ ] T028 [P] [US3] Crear `e2e/tests/notas.spec.ts` cubriendo el Escenario 3 de quickstart.md,
      incluido el caso offline (modo avión) (depende de T024, T027)

**Checkpoint**: US1, US2 y US3 funcionan de forma independiente.

---

## Phase 6: User Story 4 - Registrar un contacto en el momento (Priority: P1)

**Goal**: registrar contactos con nombre obligatorio y nota opcional, vinculados a la sesión o al
evento en general, editables, con detección de posibles duplicados y fusión explícita — con captura
sin conexión.

**Independent Test**: registrar un contacto durante el evento y comprobar que queda guardado con su
nota y su contexto, sin depender de notas de sesión ni de seguimiento (spec.md Historia 4).

### Implementation for User Story 4

- [ ] T029 [P] [US4] Añadir `interface Contacto` en `backend/src/models/index.ts` (`nombre`
      obligatorio, `nota: string | null` opcional; data-model.md)
- [ ] T030 [P] [US4] Añadir `validarNombreContacto` (no vacío) en `backend/src/models/validation.ts`
- [ ] T031 [US4] Añadir `contactos: JsonRepository<Contacto>` a `createRepositories` en
      `backend/src/repositories/index.ts` (depende de T029)
- [ ] T032 [P] [US4] Crear `backend/src/services/name-matching.ts` con `normalizar(nombre)`,
      `tokensOrdenados(nombre)`, `distanciaLevenshtein(a, b)` y `esPosibleDuplicado(a, b)` según el
      algoritmo de research.md R4
- [ ] T033 [US4] Crear `ContactsService` en `backend/src/services/contacts-service.ts` con
      `listar(eventoId)`, `crear({evento_id, sesion_id, nombre, nota?})` (calcula
      `posibles_duplicados` contra los contactos existentes del evento con T032, sin bloquear el
      guardado), `editar(contactoId, {nombre?, nota?})` y `fusionar(destinoId, origenId)` (combina
      notas no vacías, conserva `nombre`/`sesion_id` del destino, elimina el origen) (depende de
      T031, T032)
- [ ] T034 [US4] Crear rutas en `backend/src/api/routes/events-contacts.ts`:
      `GET/POST /api/events/:id/contactos`, `PATCH /api/events/:id/contactos/:contactoId`,
      `POST /api/events/:id/contactos/:contactoId/fusionar` (contracts/api.md; depende de T033)
- [ ] T035 [US4] Registrar `ContactsService` en `backend/src/context.ts` y las rutas en
      `backend/src/api/app.ts` (depende de T034)
- [ ] T036 [P] [US4] Crear `frontend/src/components/DuplicateContactModal.tsx`: tras crear un
      contacto, si `posibles_duplicados` no está vacío, ofrece fusionar con uno de ellos o guardarlo
      como distinto (Principio IV: nunca fusiona sin confirmación explícita)
- [ ] T037 [P] [US4] Crear `frontend/src/pages/People.tsx`: lista de contactos con nombre, nota y
      sesión/momento; formulario de registro rápido (solo nombre obligatorio); edición de nota;
      integra `DuplicateContactModal` (T036)
- [ ] T038 [US4] Integrar `offline-store.ts` (T003) en `People.tsx`: mismo patrón de cola offline
      que T026 pero para contactos (depende de T037, T003)
- [ ] T039 [US4] Añadir la ruta `/eventos/:id/personas` en `frontend/src/App.tsx` y un enlace desde
      `EventReview.tsx` y `SimplifiedMode.tsx` (depende de T037)
- [ ] T040 [P] [US4] Crear `e2e/tests/contactos.spec.ts` cubriendo el Escenario 4 de quickstart.md,
      incluido duplicado + fusión y contacto sin nota (depende de T035, T039)

**Checkpoint**: Las 4 historias de usuario funcionan de forma independiente.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras que afectan a varias historias a la vez.

- [ ] T041 [P] Actualizar `README.md`: mencionar la feature 002 junto a la 001 y las nuevas
      pantallas (Preguntas, Ahora, Notas, Personas)
- [ ] T042 [P] Ejecutar `cd backend && npm run typecheck && npm run lint` y
      `cd frontend && npm run typecheck && npm run lint` sobre todos los archivos nuevos/modificados
- [ ] T043 Ejecutar manualmente los 4 escenarios de `quickstart.md` de punta a punta sobre el
      entorno local (backend + frontend), confirmando SC-001 a SC-006
- [ ] T044 [P] Revisión visual de las 4 pantallas nuevas contra `frontend/src/styles/tokens.css`
      (Principio III: sin cuarto color de acento, `.state-loading`/`.state-error`/`.state-empty`
      usados de forma consistente, Principio VIII)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: no depende de Setup salvo el baseline limpio; **bloquea a US2, US3 y
  US4** (no a US1, que no usa `active-session.ts` ni `offline-store.ts`).
- **User Stories (Phase 3–6)**: US1 puede empezar tras Setup. US2, US3, US4 necesitan Foundational.
  Las 4 son independientes entre sí (pueden ir en paralelo o en el orden P1→P1→P1→P1 de la spec).
- **Polish (Phase 7)**: depende de que todas las historias que se vayan a entregar estén completas.

### User Story Dependencies

- **US1 (P1)**: sin dependencias de otras historias.
- **US2 (P1)**: depende de Foundational (T002, T003); no depende de US1, US3 ni US4.
- **US3 (P1)**: depende de Foundational (T003 para offline; usa `sesion_id` que el cliente ya
  calculó con T002 en la pantalla de modo simplificado, pero la API de notas no exige que US2 exista
  — se puede probar pasando cualquier `sesion_id` válido directamente).
- **US4 (P1)**: igual que US3, depende de Foundational (T003) pero no de US2 ni US3.

### Parallel Opportunities

- T002 y T003 (Foundational) en paralelo.
- Dentro de cada historia, el modelo/validador backend (`[P]`) en paralelo con el adaptador (`[P]`)
  y con la página frontend (`[P]`), antes de que las tareas de wiring/integración las unan.
- US1, US2, US3 y US4 se pueden repartir entre distintas personas en paralelo una vez completada la
  fase Foundational (con la salvedad de que US2 no bloquea a US3/US4 pero comparten los archivos
  `repositories/index.ts`, `context.ts` y `api/app.ts`, así que conviene coordinar esas ediciones
  puntuales aunque el resto de cada historia sea independiente).

---

## Parallel Example: User Story 1

```bash
# En paralelo, antes del wiring:
Task: "Añadir PreguntaPreparada/OrigenPregunta en backend/src/models/index.ts"          # T004
Task: "Añadir validarTextoPregunta en backend/src/models/validation.ts"                  # T005
Task: "Crear QuestionGenerationAdapter + Stub en backend/src/integrations/question-generation.ts"  # T007
Task: "Crear frontend/src/pages/SessionQuestions.tsx"                                    # T011
```

---

## Implementation Strategy

### MVP First

La spec marca las 4 historias como P1, pero Historia 2 (modo simplificado) es la que la propia spec
llama "imprescindible para el walking skeleton del MVP" — sin saber qué toca ahora, notas y
contactos pierden el contexto de sesión. Recomendación:

1. Completar Phase 1 (Setup) y Phase 2 (Foundational).
2. Completar Phase 3 (US1) y Phase 4 (US2) — con esto ya se puede llegar a una sesión con preguntas
   preparadas y saber dónde estar. **Validar y, si se quiere, demostrar aquí.**
3. Añadir Phase 5 (US3) y Phase 6 (US4) para cerrar el flujo completo de "vivir el evento".
4. Phase 7 (Polish) al final.

### Incremental Delivery

Setup + Foundational → US1 → US2 → US3 → US4 → Polish, validando cada historia con su propio
escenario de `quickstart.md` antes de pasar a la siguiente.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Las tareas que tocan `backend/src/repositories/index.ts`, `backend/src/context.ts` o
  `backend/src/api/app.ts` en más de una historia (T006/T020/T031, T010/T024/T035) nunca llevan
  `[P]` entre sí: son ediciones aditivas al mismo archivo compartido, secuenciales por historia.
- No hay tareas de test unitario porque el proyecto no las usa en la feature 001; se sigue el mismo
  patrón de validación por Playwright + `quickstart.md`.
- Confirmar cada checkpoint antes de pasar a la siguiente historia.
