---

description: "Task list for feature 001 - Onboarding del evento y Agenda personalizada por objetivos"
---

# Tasks: Onboarding del evento y Agenda personalizada por objetivos

**Input**: Design documents from `/specs/001-onboarding-agenda-personalizada/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: No se solicitó TDD en la spec. No se generan tareas de test unitario/contrato por historia; la validación funcional end-to-end se realiza mediante `quickstart.md` en la fase de pulido (Playwright/E2E).

**Organization**: Tareas agrupadas por historia de usuario para permitir implementación y validación independientes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1–US5)
- Rutas de fichero exactas incluidas en cada descripción

## Path Conventions

Estructura **web application** (de plan.md): `frontend/src/`, `backend/src/`, `e2e/` en la raíz del repositorio.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto y estructura base (monorepo frontend + backend + e2e).

- [ ] T001 Crear la estructura de carpetas del monorepo por plan.md: `frontend/src/{components,pages,services,styles,state}`, `frontend/tests/{unit,integration}`, `backend/src/{models,services,integrations,api,repositories}`, `backend/tests/{contract,integration}`, `e2e/`, y `backend/data/` (directorio de ficheros JSON) con `.gitkeep`
- [ ] T002 [P] Inicializar el frontend en `frontend/` con Vite + React 18 + TypeScript 5.x, añadir `react-router-dom`, `vite-plugin-pwa` y configurar `frontend/vite.config.ts` (plugin PWA instalable/offline)
- [ ] T003 [P] Inicializar el backend en `backend/` con Node.js 20 + Fastify + TypeScript 5.x y configurar `backend/tsconfig.json` y script de arranque en `backend/package.json`
- [ ] T004 [P] Configurar ESLint + Prettier compartidos para `frontend/` y `backend/` (config en la raíz `.eslintrc.cjs` y `.prettierrc`)
- [ ] T005 [P] Añadir tooling de pruebas de validación: Vitest en `frontend/` y `backend/`, y Playwright en `e2e/playwright.config.ts` (sin escribir casos todavía; se usan en la fase de pulido con quickstart.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura núcleo que DEBE completarse antes de cualquier historia: tipos de dominio, capa de repositorio JSON, esqueleto de la API/BFF, manejo de errores, cliente HTTP del frontend, shell de la PWA y tokens de diseño.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase.

- [ ] T006 [P] Definir los tipos/entidades de dominio y sus esquemas de validación (Evento, Sesión, Ponente, Empresa participante, Perfil de objetivos, Agenda personalizada, AgendaItem, Ruta, Alerta logística) en `backend/src/models/` según data-model.md
- [ ] T007 Implementar la capa de repositorio JSON genérica en `backend/src/repositories/json-repository.ts` (lectura/escritura atómica por colección en `backend/data/`, resolución de referencias por `id`, directorio de datos configurable/aislado para tests) — interfaz estable que permita migrar a BD más adelante
- [ ] T008 [P] Configurar la app Fastify y el enrutado base bajo `/api` en `backend/src/api/server.ts`, con middleware de manejo de errores y formato de error `{ "error": "<código>", "mensaje": "<texto>" }` (convención de contracts/api.md) en `backend/src/api/error-handler.ts`
- [ ] T009 [P] Definir las interfaces de los adaptadores de integración externa (motor de extracción de eventos y proveedor de mapas/tráfico) en `backend/src/integrations/` con implementaciones stub/mock para el MVP (el cliente nunca llama a servicios externos — Principio VI)
- [ ] T010 [P] Implementar el cliente HTTP del frontend hacia el BFF en `frontend/src/services/api-client.ts` (única vía de acceso a datos; nunca a servicios externos — Principio VI), con manejo de estados de carga/error (Principio VIII)
- [ ] T011 Crear el shell de la PWA y el enrutado en `frontend/src/App.tsx` y `frontend/src/main.tsx` (React Router con rutas: Mis eventos, Importar, Objetivos, Agenda, Logística; estados de carga/error globales)
- [ ] T012 [P] Añadir los tokens de diseño (paleta `--ink`, `--paper`, etc.) y tipografías (Space Grotesk, IBM Plex Sans, IBM Plex Mono) en `frontend/src/styles/tokens.css`, respetando la identidad de `design/design.md` sin introducir un cuarto color de acento (Principio III)

**Checkpoint**: Fundación lista — las historias de usuario pueden empezar.

---

## Phase 3: User Story 1 - Importar un evento (Priority: P1) 🎯 MVP

**Goal**: Importar un evento desde múltiples fuentes (URL, PDF, imagen, calendario, correo, QR, buscador), extraer sus datos, señalar campos faltantes y permitir completarlos manualmente.

**Independent Test**: Importar un evento por cualquiera de los canales y comprobar que la app muestra fecha, ubicación, sesiones y ponentes extraídos, señalando los campos que faltan — sin depender de otras historias.

### Implementation for User Story 1

- [ ] T013 [P] [US1] Implementar los repositorios de Evento, Sesión, Ponente y Empresa participante sobre la capa JSON en `backend/src/repositories/{event,session,speaker,company}-repository.ts`
- [ ] T014 [US1] Implementar el servicio de importación en `backend/src/services/import-service.ts` que invoca el adaptador de extracción (T009), mapea la fuente a entidades y calcula `campos_faltantes` (FR-006, FR-007)
- [ ] T015 [US1] Implementar `POST /api/events/import` en `backend/src/api/routes/events-import.ts` (Body `{fuente, payload}`; **201** `EventDraft` con `campos_faltantes`; **422** `fuente_ilegible`) — FR-001–FR-007
- [ ] T016 [US1] Implementar `PATCH /api/events/{id}` en `backend/src/api/routes/events-patch.ts` para completar/corregir datos del evento (**200** `Event`) — FR-008
- [ ] T017 [P] [US1] Crear la página Importar en `frontend/src/pages/ImportEvent.tsx` con selector de fuente (URL/PDF/imagen/calendario/correo/QR/buscador) y estados de carga/error, incluido `illegible-card` para la respuesta 422 (FR-001–FR-005, Principio VIII)
- [ ] T018 [US1] Crear la vista de revisión del evento importado en `frontend/src/pages/EventReview.tsx` que muestra datos extraídos, señala visiblemente los campos faltantes y permite editarlos (FR-007, FR-008)

**Checkpoint**: Un evento puede importarse, revisarse y corregirse de forma independiente.

---

## Phase 4: User Story 2 - Definir mis objetivos para el evento (Priority: P1)

**Goal**: Solicitar y guardar los objetivos del usuario para un evento (selección múltiple), modificables en cualquier momento, y avisar de que la agenda se recalculará si ya existe.

**Independent Test**: Sobre un evento ya importado, seleccionar uno o varios objetivos y comprobar que el perfil queda guardado, sin necesidad de que la agenda exista todavía.

### Implementation for User Story 2

- [ ] T019 [P] [US2] Implementar el repositorio de Perfil de objetivos sobre la capa JSON en `backend/src/repositories/goal-profile-repository.ts` (relación 1—1 con Evento)
- [ ] T020 [US2] Implementar el servicio de objetivos en `backend/src/services/goals-service.ts` (validación ≥1 objetivo, selección múltiple, actualiza `progreso_onboarding` a `objetivos_definidos`) — FR-009, FR-010, FR-011
- [ ] T021 [US2] Implementar `PUT /api/events/{id}/goals` en `backend/src/api/routes/events-goals.ts` (**200** `GoalProfile`; incluye `agenda_recalculo_disponible: true` si ya hay agenda, SIN recalcular) — FR-009–FR-011, Principio IV
- [ ] T022 [US2] Crear la página Objetivos en `frontend/src/pages/Goals.tsx` con la lista de objetivos (aprender, clientes, empleo, inversores, networking, presentar, colaboradores, disfrutar), selección múltiple y aviso de recálculo pendiente cuando ya existe agenda (FR-010, Principio IV)

**Checkpoint**: Los objetivos de un evento se definen, consultan y modifican de forma independiente.

---

## Phase 5: User Story 3 - Recibir una agenda priorizada según mis objetivos (Priority: P1)

**Goal**: Generar una agenda que clasifique cada sesión (imprescindible/opcional/descartable) con motivo de recomendación y detección de conflictos, y proponer un recálculo (con confirmación explícita) cuando cambian objetivos o datos.

**Independent Test**: Con evento importado y objetivos definidos, generar la agenda y comprobar la clasificación por prioridad, el motivo por sesión y la señalización de conflictos.

**Dependency note**: Depende de datos de US1 (sesiones) y US2 (objetivos), pero se valida de forma independiente con esos datos presentes.

### Implementation for User Story 3

- [ ] T023 [P] [US3] Implementar el repositorio de Agenda personalizada sobre la capa JSON en `backend/src/repositories/agenda-repository.ts` (relación 1—1 con Evento, `items: AgendaItem[]`)
- [ ] T024 [US3] Implementar el servicio de priorización en `backend/src/services/agenda-service.ts`: clasifica sesiones por objetivos, genera `motivo_recomendacion`, detecta conflictos de horario y marca alternativas (FR-012, FR-013, FR-014)
- [ ] T025 [US3] Implementar el cálculo de la propuesta de recálculo (diff) en `agenda-service.ts` sin aplicarla (FR-015, Principio IV)
- [ ] T026 [US3] Implementar `POST /api/events/{id}/agenda` en `backend/src/api/routes/events-agenda.ts` (**200** `Agenda`; **409** `sin_objetivos` si no hay objetivos) — FR-009, FR-012–FR-014
- [ ] T027 [US3] Implementar `GET /api/events/{id}/agenda/recalculo` (**200** `AgendaDiff`, propuesta sin aplicar) y `POST /api/events/{id}/agenda/aplicar` (**200** `Agenda` actualizada, solo tras confirmación) en `backend/src/api/routes/events-agenda-recalc.ts` — FR-015, Principio IV
- [ ] T028 [P] [US3] Crear la página Agenda en `frontend/src/pages/Agenda.tsx` con sesiones agrupadas por prioridad, motivo por sesión y señalización de conflictos con su alternativa (FR-012–FR-014)
- [ ] T029 [US3] Crear el componente `agenda-diff-card` en `frontend/src/components/AgendaDiffCard.tsx` que muestra la propuesta de recálculo con doble acción (confirmar / descartar), aplicando el cambio solo al confirmar (FR-015, Principio IV)

**Checkpoint**: La agenda se genera, explica, señala conflictos y solo se recalcula tras confirmación.

---

## Phase 6: User Story 5 - Gestionar mis eventos desde un único punto de entrada (Priority: P1)

**Goal**: Pantalla de inicio "Mis eventos" que lista y clasifica los eventos (en curso/próximo/cerrado), destaca el que está en curso, muestra el progreso de onboarding pendiente, permite retomar cada evento en su punto exacto, añadir uno nuevo y muestra un estado de bienvenida si no hay eventos.

**Independent Test**: Con cero, uno o varios eventos en distintos estados, comprobar que la home los clasifica y prioriza correctamente y navega al punto exacto de cada uno.

### Implementation for User Story 5

- [ ] T030 [US5] Implementar el servicio de "Mis eventos" en `backend/src/services/events-list-service.ts`: deriva el estado (en_curso/proximo/cerrado) por fechas, ordena destacando el evento en curso y expone el `progreso_onboarding` y el punto de retorno (FR-023, FR-024, FR-026, FR-028)
- [ ] T031 [US5] Implementar `GET /api/events` (**200** `Event[]` con `estado_derivado` y `progreso_onboarding`; `[]` para estado de bienvenida) en `backend/src/api/routes/events-list.ts` — FR-023, FR-024, FR-025, FR-026, FR-029
- [ ] T032 [US5] Implementar `GET /api/events/{id}` (**200** `EventDetail` con punto de retorno; **404** si no existe) en `backend/src/api/routes/events-detail.ts` — FR-028
- [ ] T033 [P] [US5] Crear la página Mis eventos en `frontend/src/pages/MyEvents.tsx`: lista con nombre/fechas/ubicación/estado, evento en curso destacado en primer lugar, indicadores de pasos de onboarding pendientes y acceso a eventos cerrados (FR-023–FR-026)
- [ ] T034 [US5] Añadir el estado de bienvenida (sin eventos) y la acción "añadir evento nuevo" que enlaza al flujo de importación sin perder los eventos existentes, más la navegación al punto de retorno al seleccionar un evento, en `frontend/src/pages/MyEvents.tsx` (FR-027, FR-028, FR-029)

**Checkpoint**: La home lista, clasifica, prioriza y permite retomar/añadir eventos de forma independiente.

---

## Phase 7: User Story 4 - Planificador logístico (Priority: P2)

**Goal**: Calcular ruta y hora de salida recomendada desde un origen, ofrecer transporte y aparcamiento, advertir de huecos insuficientes entre salas, emitir alertas (tráfico/retraso/cambio de ubicación) y proponer nueva ruta/hora con confirmación explícita.

**Independent Test**: Con evento importado (con ubicación) y un origen indicado, comprobar que la app calcula ruta y hora de salida, sin depender de preguntas/notas/contactos.

### Implementation for User Story 4

- [ ] T035 [P] [US4] Implementar los repositorios de Ruta y Alerta logística sobre la capa JSON en `backend/src/repositories/{route,alert}-repository.ts` (Ruta con `estado` propuesta/confirmada)
- [ ] T036 [US4] Implementar el servicio de logística en `backend/src/services/logistics-service.ts` usando el adaptador de mapas/tráfico (T009): ruta, hora de salida recomendada, opciones de transporte, aparcamiento y avisos de desplazamiento entre salas (FR-016–FR-020)
- [ ] T037 [US4] Implementar la generación de alertas y la propuesta de nueva hora de salida (sin aplicar) en `logistics-service.ts` (FR-021, FR-022, Principio IV)
- [ ] T038 [US4] Implementar `POST /api/events/{id}/route` (**200** `Route` con hora de salida, transporte, `parking[]` si coche y `avisos_desplazamiento[]`) en `backend/src/api/routes/events-route.ts` — FR-016–FR-020
- [ ] T039 [US4] Implementar `GET /api/events/{id}/alerts` (**200** `Alert[]` con `propuesta_hora_salida`) y `POST /api/events/{id}/route/confirmar` (**200** `Route` con `estado: "confirmada"`, solo tras confirmación) en `backend/src/api/routes/events-alerts.ts` — FR-021, FR-022, Principio IV
- [ ] T040 [P] [US4] Crear la página Logística en `frontend/src/pages/Logistics.tsx` con entrada de origen, ruta, hora de salida, opciones de transporte y aparcamiento, y avisos de desplazamiento (FR-016–FR-020)
- [ ] T041 [US4] Crear el componente `alert-card` en `frontend/src/components/AlertCard.tsx` que muestra la alerta y la propuesta de nueva hora de salida con doble acción, aplicándola solo al confirmar (FR-021, FR-022, Principio IV)

**Checkpoint**: La logística calcula ruta/hora, alerta de imprevistos y solo actualiza tras confirmación.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales y validación end-to-end de la feature.

- [ ] T042 [P] Revisar estados de carga y error visibles en todas las páginas y operaciones (importación, agenda, ruta) para cumplir el Principio VIII, en `frontend/src/`
- [ ] T043 [P] Verificar la trazabilidad: toda Sesión, Ruta y Alerta referencia su Evento en la capa de repositorio (Principio VIII), en `backend/src/repositories/`
- [ ] T044 [P] Manejar los casos límite de spec.md en los servicios correspondientes de `backend/src/services/`: evento sin sesiones priorizables, agenda pedida sin objetivos, sin origen indicado, sin transporte público cercano, evento multi-sede, **dos eventos en curso solapados** (mostrar ambos en "en curso" ordenados por la actividad más inmediata — T030), conflicto entre dos fuentes del mismo evento y cambio del programa tras generar la agenda (proponer recálculo, Principio IV)
- [ ] T045 Ejecutar la validación de `quickstart.md` (6 escenarios) con Playwright en `e2e/` y confirmar el cumplimiento de los criterios de éxito SC-001…SC-009
- [ ] T046 [P] Actualizar la documentación de arranque local (frontend + backend + directorio `backend/data/`) en `README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede empezar de inmediato.
- **Foundational (Phase 2)**: Depende de Setup — BLOQUEA todas las historias.
- **User Stories (Phases 3–7)**: Todas dependen de Foundational.
  - US1, US2, US5 (P1) son independientes entre sí una vez lista la fundación.
  - US3 (P1) usa datos de US1 (sesiones) y US2 (objetivos), pero se valida de forma independiente con esos datos presentes.
  - US4 (P2) usa datos de US1 (ubicación); se valida de forma independiente.
- **Polish (Phase 8)**: Depende de las historias que se quieran incluir.

### User Story Dependencies

- **US1 (P1)**: Solo Foundational. Es el cimiento de datos (MVP).
- **US2 (P1)**: Solo Foundational. Independiente.
- **US3 (P1)**: Foundational + datos de US1 y US2.
- **US5 (P1)**: Solo Foundational. Independiente (deriva estado a partir de eventos existentes).
- **US4 (P2)**: Foundational + ubicación de US1.

### Within Each User Story

- Repositorios → servicios → endpoints → páginas/componentes de UI.

### Parallel Opportunities

- Setup: T002, T003, T004, T005 en paralelo.
- Foundational: T006, T008, T009, T010, T012 en paralelo (T007 y T011 son núcleo secuencial).
- Una vez lista la fundación, US1/US2/US5 pueden desarrollarse en paralelo por distintas personas.
- Dentro de cada historia, las tareas marcadas [P] (repositorios y páginas en ficheros distintos) pueden ir en paralelo.

---

## Implementation Strategy

### MVP First (P1)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational — CRÍTICO).
2. Implementar US1 → US2 → US3 y US5 (todas P1).
3. **PARAR y VALIDAR** cada historia de forma independiente con su test independiente.
4. Este conjunto P1 constituye el MVP: importar → objetivos → agenda → gestionar mis eventos.

### Incremental Delivery

1. Setup + Foundational → fundación lista.
2. US1 → validar → demo.
3. US2 → validar → demo.
4. US3 → validar → demo (agenda priorizada = valor central).
5. US5 → validar → demo (home multi-evento).
6. US4 (P2) → validar → demo (logística).
7. Polish → validación E2E con quickstart.md.

---

## Notes

- [P] = ficheros distintos, sin dependencias pendientes.
- [Story] mapea cada tarea a su historia para trazabilidad.
- Principio IV (NO NEGOCIABLE): todo cambio sensible (recálculo de agenda, nueva hora de salida) se propone y solo se aplica tras confirmación explícita — ver T025/T027/T029 y T037/T039/T041.
- Principio VI: el frontend solo habla con el BFF; las integraciones externas viven en `backend/src/integrations/`.
- Commit tras cada tarea o grupo lógico; parar en cada checkpoint para validar la historia.
