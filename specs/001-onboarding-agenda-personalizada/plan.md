# Implementation Plan: Onboarding del evento y Agenda personalizada por objetivos

**Branch**: `001-onboarding-agenda-personalizada` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-onboarding-agenda-personalizada/spec.md`

## Summary

La feature 001 cubre el arranque del flujo Rumbo: importar un evento desde múltiples fuentes
(URL, PDF, imagen, calendario/correo, QR o buscador interno), definir objetivos personales,
generar una agenda priorizada según esos objetivos, resolver la logística de desplazamiento
(ruta, hora de salida, transporte, aparcamiento, avisos) y gestionar varios eventos desde una
pantalla de inicio ("Mis eventos").

**Enfoque técnico**: aplicación **web móvil / PWA** con frontend en React + TypeScript que
reutiliza los tokens de diseño ya definidos (metáfora tarjeta de embarque), y un **backend
propio (BFF)** que orquesta las integraciones externas sensibles (motor de extracción de eventos
y proveedor de mapas/tráfico), conforme al Principio VI de la constitución. Todo cambio sensible
—recalcular agenda, cambiar hora de salida— se **propone** y requiere **confirmación explícita**
del usuario (Principio IV), tal como ya prevé el diseño (`agenda-diff-card`, `alert-card`).

## Technical Context

**Language/Version**: TypeScript 5.x (frontend y backend)

**Primary Dependencies**:
- Frontend: React 18, Vite, `vite-plugin-pwa` (instalable/offline), React Router. Estilos en CSS
  con los tokens de `design/design.md`; tipografías Space Grotesk, IBM Plex Sans, IBM Plex Mono.
- Backend (BFF): Node.js 20 + Fastify (TypeScript). Cliente HTTP hacia servicios externos.

**Storage**: persistencia en **ficheros JSON** en el backend (uno por colección: eventos,
sesiones, ponentes, empresas, perfiles de objetivos, agendas, rutas, alertas), detrás de una
**capa de repositorio** con interfaz estable. Enfoque deliberadamente ligero para el MVP; la
interfaz de repositorio permite sustituirlo por una base de datos (p. ej. PostgreSQL) más
adelante sin tocar la lógica de negocio.

**Testing**: Vitest + React Testing Library (frontend); Vitest + Fastify inject (backend,
contratos); Playwright para validación E2E de los flujos de aceptación clave. Los repositorios
JSON usan un directorio de datos temporal aislado en las pruebas.

**Target Platform**: navegadores móviles modernos (iOS Safari 16+, Android Chrome), instalable
como PWA. No se exige app nativa (Principio II).

**Project Type**: web application (frontend + backend).

**Performance Goals** (derivados de los criterios de éxito de la spec):
- Importar → agenda disponible en < 3 min p90 (SC-005).
- Objetivos completados en < 1 min (SC-003).
- Identificar evento "en curso" al abrir la home en < 2 s de render (SC-008).

**Constraints**:
- Toda integración externa (extracción, mapas/tráfico) pasa por el backend; el cliente NUNCA
  llama directamente a servicios externos sensibles (Principio VI).
- Cambios sensibles (recálculo de agenda FR-015, nueva hora de salida FR-022) requieren
  confirmación explícita (Principio IV).
- Respetar la identidad visual sin introducir un cuarto color de acento (Principio III).

**Scale/Scope**: MVP para uso individual multi-evento; 9 pantallas de diseño (5 de esta spec:
Mis eventos, Importar, Objetivos, Agenda, Logística). Carga esperada: decenas de eventos por
usuario, sesiones por evento en orden de decenas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Requisito | Cumplimiento en este plan | Estado |
|-----------|-----------|---------------------------|--------|
| I. Propósito: aprovechar y ejecutar | Cubrir importar→objetivos→agenda→logística→mis eventos | Es exactamente el alcance de la feature 001 | ✅ |
| II. Móvil primero, tecnología diferida | Experiencia móvil táctil; sin obligar a nativo | PWA responsive; stack decidido aquí (en el plan), no en la spec | ✅ |
| III. Identidad de diseño Rumbo | Respetar paleta, tipografía, metáfora de embarque | Reutiliza tokens de `design.md`; sin cuarto color | ✅ |
| IV. Proponer y confirmar (NO NEGOCIABLE) | Confirmación explícita en cambios sensibles | `agenda-diff-card` (FR-015) y `alert-card` (FR-022) con doble acción | ✅ |
| V. Separación de responsabilidades | No mezclar UX/backend/integración en un monolito | Contratos cliente↔BFF aquí; orquestación interna y detalle de integración se detallan en specs de backend/integración aparte | ✅ |
| VI. IA y MCP por capas controladas | Sin llamadas directas del cliente a servicios sensibles | Extracción y mapas pasan por el BFF | ✅ |
| VII. Continuidad y no duplicación | No invadir la 002 (preguntas, notas, personas, modo "ahora") | Este plan se limita a la 001; `now-board`/notas quedan fuera | ✅ |
| VIII. Calidad mínima de experiencia móvil | Estados de carga/error visibles; trazabilidad | Estados definidos por pantalla; toda sesión/ruta/alerta trazable a su evento | ✅ |

**Resultado del gate**: PASS. No hay violaciones que justificar en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-onboarding-agenda-personalizada/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md        # Fase 1 (/speckit-plan)
├── quickstart.md        # Fase 1 (/speckit-plan)
├── contracts/           # Fase 1 (/speckit-plan)
│   └── api.md           # Contrato cliente↔BFF para la feature 001
└── tasks.md             # Fase 2 (/speckit-tasks - NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/      # pass, event-pass, route-card, agenda-diff-card, alert-card, etc.
│   ├── pages/           # Mis eventos, Importar, Objetivos, Agenda, Logística
│   ├── services/        # cliente HTTP hacia el BFF (nunca a servicios externos)
│   ├── styles/          # tokens de diseño (--ink, --paper, ...), tipografías
│   └── state/           # estado de eventos/objetivos/agenda
└── tests/
    ├── unit/
    └── integration/

backend/
├── src/
│   ├── models/          # entidades y esquemas de validación
│   ├── services/        # orquestación: extracción, priorización de agenda, logística
│   ├── integrations/    # adaptadores a motor de extracción y a mapas/tráfico
│   ├── api/             # rutas del BFF (contratos de contracts/api.md)
│   └── repositories/    # capa de persistencia (ficheros JSON en el MVP)
└── tests/
    ├── contract/
    └── integration/

e2e/                     # Playwright: flujos de aceptación end-to-end
```

**Structure Decision**: se adopta la estructura **web application (frontend + backend)** porque
la feature exige tanto pantallas móviles como orquestación de integraciones externas que, por el
Principio VI, no pueden vivir en el cliente. `frontend/` consume exclusivamente el BFF; los
adaptadores a servicios externos quedan aislados en `backend/src/integrations/` para poder
sustituirlos sin tocar la lógica de negocio.

## Complexity Tracking

> No aplica: el Constitution Check pasa sin violaciones que justificar.
