# Implementation Plan: Generación de preguntas para sesiones con LLM

**Branch**: `005-preguntas-sesion-llm` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-preguntas-sesion-llm/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Integra el motor LLM (Anthropic Claude) en la generación de preguntas preparadas por sesión (Actividad 3: "Preparar las interacciones"), sustituyendo el stub determinista de la feature 002.
El backend construye un prompt enriquecido con el título de la sesión, tema/descripción, ponentes con empresa, nombre del evento y objetivos del perfil del asistente (si existen).
A través de *tool use* forzado (`generar_preguntas`), el LLM genera exactamente 4 preguntas estructuradas (2 generales/estratégicas y 2 técnicas/de profundización), que son validadas estrictamente por el backend antes de persistirlas en `preguntas.json`.
Se implementa un timeout estricto de 15 segundos (`AbortSignal.timeout(15_000)`), soporte para regeneración (sustituye las preguntas sugeridas previas conservando intactas todas las preguntas manuales creadas por el usuario), degradación controlada ante falta de API key o fallos de red (HTTP 503 sin bloquear la UI ni la redacción manual de preguntas), y adaptadores desacoplados que permiten ejecutar suites unitarias y E2E sin depender de credenciales externas.

## Technical Context

**Language/Version**: TypeScript 5.6 sobre Node.js 20+ (backend y frontend) — mismo stack que las features 001–004.

**Primary Dependencies**: Fastify 4 (backend) y `@anthropic-ai/sdk` (ya instalado en `backend/package.json` desde la feature 003). React 18 + React Router 6 (frontend) sin nuevas dependencias externas.

**Storage**: Ficheros JSON a través de la capa `Repository<T>` existente (`backend/src/repositories/json-repository.ts`), persistiendo en `backend/data/preguntas.json`. Se extiende el modelo `PreguntaPreparada` con el campo opcional `tipo?: 'general' | 'tecnica'` de forma 100% retrocompatible.

**Testing**: Vitest para pruebas unitarias de adaptadores (`AnthropicQuestionGenerationAdapter`, `StubQuestionGenerationAdapter`), validación de esquema (`esPreguntasGeneradasValidas`) y lógica de servicio (`QuestionsService`). Playwright para pruebas E2E en `e2e/tests/preguntas.spec.ts` que validan el flujo completo de generación, regeneración, preguntas manuales y degradación.

**Target Platform**: PWA mobile-first responsive (Principio II); backend Node.js Fastify.

**Project Type**: Web monorepo (`backend/` + `frontend/` + `e2e/`).

**Performance Goals**:
- Generación de preguntas con Claude 3.5 Haiku en menos de 5 segundos en el 85% de los casos (SC-001).
- Timeout estricto de 15 segundos en llamadas a la API de Anthropic (FR-007, SC-002).
- Carga de tokens optimizada (< 1.000 tokens de entrada y < 300 tokens de salida).

**Constraints**:
- Ninguna credencial de IA ni detalle de prompts expuesto al cliente móvil (Principio VI, FR-002, SC-005).
- Respeto al principio de "Proponer y Confirmar" (Principio IV): las preguntas generadas son sugerencias que el usuario consulta, regenera o complementa con sus propias preguntas.
- Preservación íntegra de las preguntas manuales al regenerar sugerencias (FR-006, SC-003).
- Las pruebas en CI y entornos sin clave externa deben ejecutarse sin errores mediante stubs (FR-012, SC-004).

**Scale/Scope**: Monousuario local MVP; generación bajo demanda por sesión individual.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Propósito: Aprovechar y Ejecutar | PASS — Cumple directamente la Actividad 3 del MVP ("Preparar las interacciones"): ayuda al asistente a formular preguntas estratégicas y técnicas de alto valor para sesiones y networking. |
| II. Móvil Primero, Tecnología Diferida | PASS — La UI de `SessionQuestions.tsx` está diseñada para pantallas móviles, con lectura ágil (exactamente 4 preguntas sugeridas) y sin bloquear la navegación. |
| III. Identidad de Diseño Rumbo | PASS — Mantiene los estilos, componentes de estado (`States.tsx`), tarjetas y badges (`amber` / `teal`) de la identidad de diseño Rumbo. |
| IV. Proponer y Confirmar (NO NEGOCIABLE) | PASS — La IA propone un lote de preguntas sugeridas; el usuario decide si utilizarlas, regenerarlas o añadir sus propias preguntas manuales. Ninguna acción destructiva ocurre silenciosamente. |
| V. Separación de Responsabilidades por Spec | PASS — Esta spec acota la integración del LLM en el backend y el refresco de preguntas de sesión, sin solaparse con logística ni onboarding. |
| VI. IA y MCP a Través de Capas Controladas | PASS — Toda la interacción con Anthropic Claude reside exclusivamente en `backend/src/integrations/question-generation.ts`, protegiendo credenciales y aislando el cliente móvil. |
| VII. Continuidad y No Duplicación de Specs | PASS — Extiende la capacidad de preguntas definida en la spec 002 respetando el repositorio existente `preguntas.json` y los endpoints de `sessions-questions.ts`. |
| VIII. Calidad Mínima de Experiencia Móvil | PASS — 4 preguntas estructuradas evitan bloques kilométricos; estados de carga (`generando…`) y de error (503/422) informativos y no bloqueantes. |

Sin violaciones. No aplica Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/005-preguntas-sesion-llm/
├── plan.md              # Este archivo
├── research.md          # Fase 0 (decisiones técnicas R1–R8)
├── data-model.md        # Fase 1 (PreguntaPreparada, ContextoGeneracionPreguntas, validación)
├── quickstart.md        # Fase 1 (guía de validación end-to-end y escenarios)
├── contracts/
│   └── api.md          # Fase 1 (contratos HTTP de /api/events/:id/sesiones/:sesionId/preguntas)
└── tasks.md             # Fase 2 (/speckit-tasks — generado en paso posterior)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── index.ts                  # + TipoPregunta en PreguntaPreparada
│   │   └── validation.ts             # + esPreguntasGeneradasValidas
│   ├── integrations/
│   │   └── question-generation.ts    # + AnthropicQuestionGenerationAdapter con tool use + Stub
│   ├── services/
│   │   └── questions-service.ts      # + recopilación de contexto y persistencia con tipo
│   ├── api/
│   │   └── routes/
│   │       └── sessions-questions.ts # + manejo de códigos 422 y 503
│   └── context.ts                    # + cableado de generador de preguntas según entorno/API key
└── tests/
    └── question-generation.test.ts   # Tests unitarios de adaptadores y validación

frontend/
├── src/
│   ├── pages/
│   │   └── SessionQuestions.tsx      # + gestión de error 503 degradado, estados de carga
│   └── services/
│       └── types.ts                  # + TipoPregunta en interfaz Pregunta
```

**Structure Decision**: Monorepo existente `backend/` + `frontend/` + `e2e/`. Se actualizan los adaptadores y servicios existentes sin introducir paquetes adicionales.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Sin violaciones constitucionales. No aplica Complexity Tracking.
