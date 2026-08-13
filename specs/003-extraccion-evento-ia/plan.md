# Implementation Plan: Extracción de eventos desde fuentes reales con IA

**Branch**: `003-extraccion-evento-ia` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-extraccion-evento-ia/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Sustituye el motor de extracción stub del onboarding (feature 001) — hoy solo acepta JSON ya
estructurado — por uno que, cuando el `payload` es una URL pública, obtiene su HTML desde el
backend (Principio VI), lo reduce a texto y usa la IA de Anthropic Claude para estructurar el
evento (nombre, fechas, ubicación, sesiones, ponentes), validando el resultado antes de persistir.
Se preserva sin cambios el camino de importación estructurada (JSON) del que dependen las demos y
la suite E2E de 001/002 (FR-007): el adaptador decide el camino a partir de la forma del `payload`,
no de un campo nuevo (research.md R8). Toda la obtención y la llamada a la IA ocurren en el backend,
con un presupuesto único de 30 s (fetch + IA), bloqueo de SSRF con protección frente a DNS
rebinding, y degradación controlada si falta la clave de IA — sin crear nunca eventos parciales.

## Technical Context

**Language/Version**: TypeScript 5.6 sobre Node.js 20+ (backend) — mismo stack que 001/002, sin
cambios de versión. El frontend no cambia en esta feature (mismo formulario de `/importar` ya
existente).

**Primary Dependencies**: Fastify 4 (ya presente, sin cambios). Nuevas en `backend/`:
`@anthropic-ai/sdk` (motor de IA, research.md R3) y `dotenv` (carga de `ANTHROPIC_API_KEY` en
desarrollo local, research.md R7). Obtención de HTML con el `fetch` nativo de Node 20 más un
`Agent` de `undici` para fijar la IP validada de conexión (research.md R1/R2) — `undici` se declara
como dependencia explícita aunque Node ya la use internamente, para poder importar `Agent`.

**Storage**: Ficheros JSON vía el `Repository<T>` ya existente
(`backend/src/repositories/json-repository.ts`); sin colecciones nuevas. Solo se añade un campo a
`Evento` (`fuente_valor`, data-model.md). El HTML obtenido y el texto enviado a la IA son
transitorios y nunca se escriben a disco (FR-010).

**Testing**: Vitest para los nuevos tests unitarios de backend (`AnthropicEventExtractionAdapter`
mockeado, SSRF, `htmlATexto` — primeros tests unitarios de este paquete, research.md R10) +
Playwright (`e2e/`) para el bloqueo SSRF y la degradación sin clave, de forma determinista y sin red
externa. El camino real "URL pública + IA" se valida a mano con `quickstart.md` (no en CI, por
depender de red y de una clave de pago).

**Target Platform**: Sin cambios — PWA mobile-first ya existente (Principio II); esta feature es
puramente de backend/integración.

**Project Type**: Web — mismo monorepo `frontend/` + `backend/` + `e2e/` de 001/002, sin paquetes
nuevos.

**Performance Goals**: Presupuesto total de 30 s (fetch + IA) por importación desde URL (FR-008,
SC-003, research.md R5); tamaño de HTML acotado a `RUMBO_AI_MAX_HTML_BYTES` (2 MB por defecto) y de
texto enviado a la IA a `RUMBO_AI_MAX_CHARS` (20 000 por defecto).

**Constraints**:
- Ninguna llamada a la IA ni al motor de extracción ocurre desde el cliente (Principio VI); el
  cliente solo sigue llamando a `POST /api/events/import`, sin cambios en su contrato de forma.
- Solo se permiten esquemas `http`/`https`; se bloquean destinos internos/privados y metadatos de
  nube en la URL de entrada y en cada salto de redirect (FR-013, research.md R2).
- Ninguna credencial de la IA se expone al cliente ni se registra en logs (FR-009).
- Sin clave de IA configurada, el sistema degrada a "fuente ilegible" en vez de fallar de forma
  opaca (FR-012).
- La importación estructurada existente (FR-007) no puede sufrir regresiones: la suite E2E de
  001/002 debe seguir en verde sin modificarla (SC-004).

**Scale/Scope**: Igual que 001/002 — un usuario por dispositivo, sin autenticación; el volumen
(una importación a la vez, HTML de una sola página) es trivial frente a los límites del proveedor
de IA.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Propósito: Aprovechar y Ejecutar | PASS — habilita el primer paso real del flujo MVP ("importar el evento a partir de las fuentes del usuario"); hoy el onboarding (001) no es utilizable con una URL real. |
| II. Móvil Primero, Tecnología Diferida | PASS — no toca el frontend ni la experiencia móvil; el formulario `/importar` ya existente sigue igual. |
| III. Identidad de Diseño Rumbo | PASS — sin cambios de UI; el estado "fuente ilegible" ya usa los componentes de estado existentes (`States.tsx`). |
| IV. Proponer y Confirmar (NO NEGOCIABLE) | PASS — el resultado de la extracción sigue siendo un *borrador* editable en `EventReview` (igual que 001); no se aplica ni confirma nada de forma silenciosa; los campos no extraídos quedan marcados para revisión manual (US1 AC3). |
| V. Separación de Responsabilidades por Spec | PASS — esta es una spec de backend/integración (obtención + motor de IA), separada de la spec de producto/UX (001) que define el flujo de importación; no redefine pantallas ni entidades de producto. |
| VI. IA y MCP a Través de Capas Controladas | PASS — la IA se invoca solo desde `backend/src/integrations/`, nunca desde el cliente; misma capa controlada que ya usan `question-generation.ts`/`voice-transcription.ts` de la feature 002. |
| VII. Continuidad y No Duplicación de Specs | PASS — reutiliza `EventExtractionAdapter`, `ImportService` y las entidades `Evento`/`Sesion`/`Ponente`/`EmpresaParticipante` de 001 sin redefinirlas (research.md R8/R9); la importación estructurada de la que dependen 001/002 no cambia de comportamiento. |
| VIII. Calidad Mínima de Experiencia Móvil | PASS — reutiliza el estado de error "fuente ilegible" ya existente en `ImportEvent.tsx`, con acciones de recuperación visibles (US2); no introduce pantallas nuevas. |

Sin violaciones. No aplica Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-extraccion-evento-ia/
├── plan.md              # Este archivo
├── research.md          # Fase 0 (decisiones técnicas R1–R10)
├── data-model.md         # Fase 1 (Evento.fuente_valor + estructuras transitorias)
├── quickstart.md         # Fase 1 (validación end-to-end por historia)
├── contracts/
│   └── api.md            # Fase 1 (comportamiento extendido de POST /api/events/import)
└── tasks.md              # Fase 2 (/speckit-tasks — no se crea aquí)
```

### Source Code (repository root)

Se extiende el monorepo existente (no se crean paquetes nuevos):

```text
backend/
├── src/
│   ├── models/
│   │   ├── index.ts                  # + Evento.fuente_valor
│   │   └── validation.ts             # + esDatosExtraidosValidos (research.md R6)
│   ├── integrations/
│   │   ├── event-extraction.ts       # + AnthropicEventExtractionAdapter, discriminación
│   │   │                             #   JSON/URL (research.md R3, R8); Stub existente intacto
│   │   ├── http-fetch.ts             # fetch con timeout/deadline + Agent SSRF-safe (R1, R2, R5)
│   │   └── ssrf-guard.ts             # esIpPrivada / resolución + validación de destino (R2)
│   ├── services/
│   │   ├── html-to-text.ts           # htmlATexto (research.md R4)
│   │   └── import-service.ts         # sin cambios de contrato; pasa fuente_valor al crear Evento
│   ├── context.ts                    # + lectura de ANTHROPIC_API_KEY/RUMBO_AI_MODEL, wiring del
│   │                                  #   adaptador real o degradado (research.md R7)
│   └── api/routes/events-import.ts   # sin cambios (mismo contrato, contracts/api.md)
├── tests/
│   ├── event-extraction.test.ts      # AnthropicEventExtractionAdapter mockeado (R10)
│   ├── ssrf-guard.test.ts            # rangos privados, rebinding (R10)
│   └── html-to-text.test.ts          # recorte y limpieza de HTML (R10)
├── .env.example                      # ANTHROPIC_API_KEY, RUMBO_AI_MODEL, límites (R4/R7)
└── package.json                      # + @anthropic-ai/sdk, undici, dotenv

e2e/tests/
└── importar-url.spec.ts              # bloqueo SSRF + degradación sin clave (R10), sin red externa

frontend/                             # sin cambios en esta feature
```

**Structure Decision**: se mantiene el monorepo de tres paquetes de 001/002 (`backend/`,
`frontend/`, `e2e/`) sin añadir ninguno nuevo, y sin tocar `frontend/`. Dentro de `backend/`, la
extracción se reparte en piezas de una sola responsabilidad (`ssrf-guard.ts`, `http-fetch.ts`,
`html-to-text.ts`) en vez de ampliar `event-extraction.ts` con todo el pipeline, para que cada una
sea testeable de forma aislada (research.md R10) sin depender de red real ni de la IA. Esto respeta
el patrón ya establecido por 002 de adaptadores + servicios de una responsabilidad
(`name-matching.ts`, `active-session.ts`) en vez de lógica monolítica en un único archivo.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No aplica: el Constitution Check no encontró violaciones.
