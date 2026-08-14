# Implementation Plan: Extracción de agendas generadas con JavaScript (render en backend)

**Branch**: `004-render-agenda-js` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-render-agenda-js/spec.md`

## Summary

La importación conservará HTML crudo → texto → IA como primer intento. Cuando esa ruta no extraiga ninguna sesión, un navegador controlado en backend capturará el DOM tras ejecutar JavaScript, realizará interacciones de agenda acotadas y reutilizará la conversión a texto, IA y validación existentes. El render usa un presupuesto total de 45 s, una sola capacidad concurrente, fallback al resultado ligero útil y una salida de red SSRF-safe para toda petición iniciada por el navegador.

## Technical Context

**Language/Version**: TypeScript 5.6 sobre Node.js 20+ en `backend/`; sin cambios de UI ni contrato en la PWA.

**Primary Dependencies**: Fastify 4, `@anthropic-ai/sdk`, `undici` y `dotenv` existentes; se añade `playwright` como dependencia de producción de `backend/` y se instala Chromium compatible en el entorno de despliegue. `@playwright/test` sigue limitado a `e2e/`.

**Storage**: Repositorios JSON existentes, sin colecciones ni migraciones. HTML, DOM, cookies, cabeceras y texto de IA son transitorios y no se persisten.

**Testing**: Vitest para orquestación, capacidad, límites e interacción; integración contra fixtures locales dinámicas y proxy SSRF; E2E Playwright existente para la UI. Nunca se automatizan webs públicas ni llamadas de pago a IA.

**Target Platform**: Backend Node.js con Chromium instalado, aislado para que únicamente pueda salir por un proxy local validado.

**Project Type**: Monorepo web con `backend/`, `frontend/` y `e2e/`; ampliación backend/integración que conserva `/importar`.

**Performance Goals**: Resultado en <=45 s por URL. Límite global: ruta ligera <=12 s, render/interacción/snapshot <=22 s, IA del DOM <=10 s y 1 s de margen; toda operación respeta además el tiempo global restante. El tope de 12 s de la ruta ligera reserva tiempo para el render **solo cuando el render está disponible y puede entrar en juego**; si el render está deshabilitado o no disponible (FR-011), o la fuente es estática y ya produce >=1 sesión (short-circuit), la ruta ligera dispone del presupuesto global completo (<=45 s), de modo que no se regresa respecto a la feature 003 (FR-010, SC-004).

**Constraints**:

- JSON estructurado no usa IA ni navegador; una URL con >=1 sesión por la ruta ligera tampoco renderiza.
- Todo tráfico HTTP(S) del navegador, incluido subrecurso y redirect, pasa por un proxy que valida host, rechaza destino no público y conecta a la IP validada; Chromium no tiene egress directo.
- Se bloquean descargas, permisos, service workers, popups, media, fuentes e imágenes; no se registran HTML, cookies, cabeceras de autorización ni prompts de IA.
- Máximo un render concurrente por proceso; si no se adquiere capacidad en 2 s, se devuelve el resultado ligero útil o `fuente_ilegible`.
- Interacciones: 1 consentimiento, 7 pestañas de día, 5 "ver más", 5 pasadas de scroll y 16 acciones totales; no se siguen enlaces ni se espera a `networkidle`.

**Scale/Scope**: MVP de baja concurrencia. Una instancia de navegador compartida por proceso, con contexto incógnito y página nuevos por importación; tras un crash se permite un reinicio antes de degradar.

## Constitution Check

*GATE: PASS antes de Fase 0; revalidado PASS tras Fase 1.*

| Principio | Evaluación |
|---|---|
| I. Propósito: Aprovechar y Ejecutar | PASS — permite importar agendas modernas, primer paso del flujo MVP. |
| II. Móvil Primero, Tecnología Diferida | PASS — el render externo queda en backend y no altera el flujo móvil. |
| III. Identidad de Diseño Rumbo | PASS — se reutilizan los estados de carga/error y el borrador revisable. |
| IV. Proponer y Confirmar | PASS — la extracción sigue produciendo un borrador, sin cambios sensibles automáticos. |
| V. Separación de Responsabilidades por Spec | PASS — amplía integración backend sin redefinir onboarding ni entidades de producto. |
| VI. IA y MCP a Través de Capas Controladas | PASS — IA, navegador y tráfico externo quedan detrás de adaptadores controlados. |
| VII. Continuidad y No Duplicación de Specs | PASS — conserva adaptador, servicio, entidades y contrato de 001–003. |
| VIII. Calidad Mínima de Experiencia Móvil | PASS — mantiene espera limitada y estado recuperable `fuente_ilegible`. |

No hay violaciones ni Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-render-agenda-js/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── tasks.md             # Lo crea /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/integrations/
│   ├── event-extraction.ts      # orquestación ligero → render → IA
│   ├── browser-renderer.ts      # navegador e interacciones acotadas
│   ├── render-capacity.ts       # semáforo/capacidad de render
│   ├── render-config.ts         # presupuestos y límites configurables
│   ├── render-egress-proxy.ts   # proxy HTTP(S) SSRF-safe
│   └── ssrf-guard.ts            # política de destinos públicos
├── src/services/html-to-text.ts  # reutilizado para DOM renderizado
├── src/context.ts                # wiring y configuración
├── tests/
│   ├── event-extraction.test.ts
│   ├── browser-renderer.test.ts
│   ├── render-egress-proxy.test.ts
│   └── fixtures/rendered-agenda/
└── package.json                  # + playwright

frontend/src/pages/ImportEvent.tsx # sin cambio funcional
e2e/tests/importar-url.spec.ts    # regresión UI y no datos parciales
```

**Structure Decision**: no se añade ruta pública ni entidad persistida. Navegador, política de red y capacidad son adaptadores aislados y testeables; `event-extraction.ts` decide la ruta y `ImportService` persiste solo el resultado final.

## Complexity Tracking

No aplica: el Constitution Check no encontró violaciones.