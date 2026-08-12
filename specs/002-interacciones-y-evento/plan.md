# Implementation Plan: Preparar interacciones y vivir el evento

**Branch**: `002-interacciones-y-evento` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-interacciones-y-evento/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Cubre las Actividades 3 y 4 del mapa de historias sobre la base ya construida por la feature 001
(onboarding + agenda personalizada): preparar preguntas por sesión, un modo simplificado que dice
"qué toca ahora y dónde", notas de texto/voz vinculadas a la sesión activa, y registro de contactos
con detección de posibles duplicados. Se extiende el mismo monorepo (`backend/` Fastify + ficheros
JSON, `frontend/` React+Vite PWA) sin introducir servicios ni dependencias nuevas: la generación de
preguntas y la transcripción de voz se enrutan por adaptadores stub del backend (Principio VI); el
modo simplificado y la captura offline de notas/contactos se resuelven en el cliente sobre datos ya
cacheados, para cumplir el requisito de funcionar sin conexión (FR-017).

## Technical Context

**Language/Version**: TypeScript 5.6 sobre Node.js 20+ (backend) y navegador ES2020+ (frontend) —
mismo stack que la feature 001, sin cambios de versión.

**Primary Dependencies**: Fastify 4 (backend BFF, ya presente); React 18 + Vite 5 +
react-router-dom 6 + vite-plugin-pwa (frontend, ya presente). Sin dependencias nuevas: la
coincidencia aproximada de nombres (Levenshtein) se implementa a mano (research.md R4) y la cola de
sincronización offline usa IndexedDB nativa del navegador (research.md R6).

**Storage**: Ficheros JSON por colección vía el `Repository<T>` ya existente
(`backend/src/repositories/json-repository.ts`); tres colecciones nuevas: `preguntas.json`,
`notas.json`, `contactos.json` en `RUMBO_DATA_DIR`. En el cliente, IndexedDB para la cola de
pendientes offline y la última agenda cacheada (data-model.md, "Estado solo-cliente").

**Testing**: Vitest (unit, ya configurado en `backend/` y `frontend/`) + Playwright (`e2e/`) para
los escenarios de `quickstart.md`.

**Target Platform**: PWA responsive mobile-first (Principio II); mismo navegador objetivo que la
feature 001, sin exigir app nativa.

**Project Type**: Web — monorepo `frontend/` + `backend/` ya existente, extendido (no se crean
paquetes nuevos).

**Performance Goals**: Ninguno cuantitativo nuevo más allá de los ya fijados en Criterios de éxito
de la spec (SC-002, SC-003). El modo simplificado recalcula la actividad activa cada 30s en cliente
(research.md R5), granularidad suficiente para sesiones medidas en minutos.

**Constraints**:
- Notas, contactos y modo simplificado DEBEN funcionar sin conexión; generación de preguntas y
  transcripción de voz REQUIEREN conexión (FR-017, aclaración de sesión 2026-08-12).
- Ninguna integración de IA/transcripción se llama directamente desde el cliente (Principio VI):
  todas pasan por adaptadores del backend, stub en el MVP (mismo patrón que
  `backend/src/integrations/event-extraction.ts`).
- Ninguna fusión de contactos ocurre sin confirmación explícita del usuario en el cliente
  (Principio IV); el backend nunca fusiona automáticamente por la sola detección de un posible
  duplicado.

**Scale/Scope**: Un usuario por dispositivo, sin autenticación (igual que 001); un evento con
decenas de sesiones y decenas de notas/contactos — volumen trivial para ficheros JSON.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Propósito: Aprovechar y Ejecutar | PASS — preguntas preparadas, modo simplificado, notas y contactos son exactamente los puntos 4–6 del flujo MVP que exige la constitución. |
| II. Móvil Primero, Tecnología Diferida | PASS — se reutiliza la PWA mobile-first ya construida; no se fija stack nativo. |
| III. Identidad de Diseño Rumbo | PASS — nuevas pantallas reutilizan `tokens.css` (paleta ink/paper/card + acentos amber/teal/plum) y los mismos componentes de estado (`States.tsx`). Sin cuarto color de acento. |
| IV. Proponer y Confirmar (NO NEGOCIABLE) | PASS — la fusión de contactos y la reasignación de sesión de una nota son acciones explícitas del usuario; ningún dato se cambia solo, en línea con `AgendaDiffCard`/`AlertCard` ya existentes. |
| V. Separación de Responsabilidades por Spec | PASS — esta spec es de producto/UX (preguntas, notas, personas, modo simplificado); la elección de motor de IA/transcripción queda diferida a una spec de backend/integración, tal como marca la Suposición de la spec. |
| VI. IA y MCP a Través de Capas Controladas | PASS — `QuestionGenerationAdapter` y `VoiceTranscriptionAdapter` son adaptadores de backend (stub en MVP); el cliente solo llama a `/api/*`. |
| VII. Continuidad y No Duplicación de Specs | PASS — reutiliza `Sesion`, `Evento` y `AgendaPersonalizada`/`AgendaItem` de la feature 001 sin redefinirlos; el modo simplificado reutiliza la prioridad/conflicto ya calculados por `AgendaService` en vez de duplicar esa lógica. |
| VIII. Calidad Mínima de Experiencia Móvil | PASS — estados de carga/error/vacío con `useAsync`/`Loading`/`ErrorState` ya existentes; cada nota y contacto muestra siempre su sesión o "evento en general" (trazabilidad). |

Sin violaciones. No aplica Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-interacciones-y-evento/
├── plan.md              # Este archivo
├── research.md          # Fase 0 (decisiones técnicas R1–R7)
├── data-model.md        # Fase 1 (PreguntaPreparada, Nota, Contacto)
├── quickstart.md         # Fase 1 (validación end-to-end por historia)
├── contracts/
│   └── api.md            # Fase 1 (contrato REST de las rutas nuevas)
└── tasks.md              # Fase 2 (/speckit-tasks — no se crea aquí)
```

### Source Code (repository root)

Se extiende el monorepo existente (no se crean paquetes nuevos):

```text
backend/
├── src/
│   ├── models/
│   │   ├── index.ts              # + PreguntaPreparada, Nota, Contacto y sus enums
│   │   └── validation.ts         # + validarNombreContacto, validarContenidoNota, etc.
│   ├── repositories/
│   │   └── index.ts              # + repos: preguntas, notas, contactos
│   ├── integrations/
│   │   ├── question-generation.ts # QuestionGenerationAdapter + Stub (research.md R2)
│   │   └── voice-transcription.ts # VoiceTranscriptionAdapter + Stub (research.md R3)
│   ├── services/
│   │   ├── name-matching.ts       # normalizar/tokensOrdenados/Levenshtein (research.md R4)
│   │   ├── questions-service.ts
│   │   ├── notes-service.ts
│   │   └── contacts-service.ts
│   ├── api/routes/
│   │   ├── sessions-questions.ts  # GET/POST preguntas (+ /generar)
│   │   ├── events-notes.ts        # GET/POST/PATCH/DELETE notas
│   │   └── events-contacts.ts     # GET/POST/PATCH/fusionar contactos
│   └── context.ts                 # + wiring de los 3 servicios y 2 adaptadores nuevos
└── tests/                         # unit de servicios/adaptadores nuevos (vitest)

frontend/
├── src/
│   ├── pages/
│   │   ├── SimplifiedMode.tsx     # Modo simplificado ("Ahora"), research.md R5
│   │   ├── SessionQuestions.tsx   # Preguntas de una sesión (desde Agenda)
│   │   ├── Notes.tsx              # Notas (listar/crear texto+voz/editar/eliminar)
│   │   └── People.tsx             # Personas (listar/crear/editar/fusionar)
│   ├── components/
│   │   └── DuplicateContactModal.tsx
│   ├── services/
│   │   ├── active-session.ts      # función pura de research.md R5
│   │   └── offline-store.ts       # cola IndexedDB + cache de agenda, research.md R6
│   └── App.tsx                     # + rutas nuevas y navegación contextual del evento
└── tests/                          # unit de active-session.ts y offline-store.ts (vitest)

e2e/tests/
├── preguntas.spec.ts
├── modo-simplificado.spec.ts
├── notas.spec.ts
└── contactos.spec.ts
```

**Structure Decision**: se mantiene el monorepo de tres paquetes de la feature 001
(`backend/`, `frontend/`, `e2e/`) sin añadir ninguno nuevo. Dentro de `frontend/`, las cuatro
pantallas nuevas se cuelgan como rutas contextuales de un evento (`/eventos/:id/ahora`,
`/eventos/:id/agenda/:sesionId`, `/eventos/:id/notas`, `/eventos/:id/personas`), enlazadas desde
`EventReview` ("Mi evento") y desde las tarjetas de `Agenda` — igual que hoy `Agenda`/`Logistics` se
enlazan desde `EventReview` con botones CTA en vez de una barra de pestañas global. Esto respeta la
Suposición de la spec de que la organización de pantallas es una decisión de plan, no de spec, y
evita duplicar la navegación global "Mis eventos / Importar" que ya existe para el listado de
eventos.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No aplica: el Constitution Check no encontró violaciones.
