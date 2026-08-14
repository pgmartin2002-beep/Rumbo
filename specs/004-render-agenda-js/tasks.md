---
description: "Task list for feature 004 — Extracción de agendas generadas con JavaScript (render en backend)"
---

# Tasks: Extracción de agendas generadas con JavaScript (render en backend)

**Input**: Design documents from `/specs/004-render-agenda-js/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluidas — plan.md (Testing) y research.md R6 definen una estrategia de pruebas explícita (Vitest, seguridad del proxy, integración de navegador con fixtures locales, regresión E2E). Por la naturaleza de seguridad (SSRF) de la feature, las tareas de test son obligatorias.

**Organization**: agrupadas por historia de usuario. El proxy SSRF y el ciclo de vida del navegador son fundacionales porque el render de US1 no puede ejecutarse de forma segura sin ellos.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1, US2, US3)
- Rutas exactas incluidas en cada descripción

## Path Conventions

Monorepo web existente: `backend/src/`, `backend/tests/`, `frontend/src/`, `e2e/tests/`. No se crean paquetes nuevos (plan.md, Structure Decision).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependencias y configuración compartidas por todas las historias.

- [X] T001 Añadir `playwright` como dependencia de producción de `backend/` en `backend/package.json` (sin tocar `@playwright/test`, que sigue solo en `e2e/`) e instalar Chromium con `npx playwright install chromium` (research.md R1).
- [X] T002 [P] Definir constantes de presupuesto y límites en `backend/src/integrations/render-config.ts`: `PRESUPUESTO_TOTAL_MS = 45_000`, topes de fase `LIGERA_MS = 12_000`, `RENDER_MS = 22_000`, `IA_RENDER_MS = 10_000`, margen `1_000`, capacidad `MAX_RENDER_CONCURRENTE = 1`, `ESPERA_CAPACIDAD_MS = 2_000`, e interacción `{ consentimiento: 1, tabs: 7, verMas: 5, scroll: 5, totalAcciones: 16 }` — valores del plan.md, configurables por entorno pero no por la API (research.md R5).
- [X] T003 [P] Añadir a `backend/.env.example` las variables nuevas de la feature (p. ej. `RUMBO_RENDER_ENABLED`, `RUMBO_RENDER_PROXY_PORT`, overrides opcionales de presupuesto/límites), documentando que el render requiere `ANTHROPIC_API_KEY` igual que la ruta ligera (spec.md FR-011/FR-012).

**Checkpoint**: `npm --prefix backend install` y `npm --prefix backend run typecheck` pasan con las nuevas dependencias y constantes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: seguridad de red y ciclo de vida del navegador. **Bloquea todas las historias**: sin el proxy SSRF ni la gestión de capacidad el render no puede ejecutarse de forma segura (research.md R3, R5).

- [X] T004 Ampliar `backend/src/integrations/ssrf-guard.ts` con una política "solo público" reutilizable por el proxy: extraer/exponer una función que, dado un hostname, devuelva la IP pública validada o `null`, cubriendo además rangos IPv6 reservados/multicast adicionales señalados en research.md R3, sin romper el uso actual de `http-fetch.ts`.
- [X] T005 Implementar el proxy de salida SSRF-safe en `backend/src/integrations/render-egress-proxy.ts`: acepta solo HTTP y `CONNECT` HTTPS, resuelve y valida cada host con `ssrf-guard` (T004), rechaza destinos no públicos, y abre el socket upstream contra la IP validada preservando SNI; revalida en cada redirect y en cada subrecurso; nunca abre conexión a un destino denegado. Escucha solo en loopback.
- [X] T006 Implementar `RenderCapacityGuard` en `backend/src/integrations/render-capacity.ts`: semáforo de 1 render concurrente con espera máxima de 2 s (T002); si no hay capacidad, señala "capacidad" sin bloquear más allá del presupuesto.
- [X] T007 Implementar el ciclo de vida del navegador en `backend/src/integrations/browser-renderer.ts`: arranque perezoso de un único Chromium por proceso lanzado con el proxy (T005) como única salida, service workers deshabilitados, descargas/permisos/popups bloqueados y bloqueo de media/fuentes/imágenes vía `context.route`; contexto incógnito y página nuevos por importación, cerrados en `finally`; recreación del navegador una vez tras un crash (research.md R3, R5).

**Checkpoint**: el proxy y el navegador arrancan/paran de forma aislada; el navegador no tiene egress directo (verificable en T017).

---

## Phase 3: User Story 1 — Importar agenda generada con JavaScript (Priority: P1) 🎯 MVP

**Goal**: pegar una URL cuya agenda se genera con JavaScript y obtener un borrador con nombre, fechas y al menos una sesión, sin intervención manual (spec.md US1).

**Independent Test**: con una fixture local dinámica (sesiones hidratadas por JS, banner de consentimiento, pestañas de día y "ver más"), importar su URL crea un `Evento` `201` con ≥1 sesión, tras escalar al render una sola vez.

- [X] T008 [US1] Implementar las interacciones acotadas de agenda en `backend/src/integrations/browser-renderer.ts`: aceptar/descartar un consentimiento, desplegar hasta 7 pestañas de día, pulsar "ver más" hasta 5 veces y hasta 5 pasadas de scroll (máx. 16 acciones), esperando un crecimiento breve de DOM/texto por acción, sin seguir enlaces ni esperar `networkidle`; devolver el DOM final con `page.content()` (research.md R4, límites de T002).
- [X] T009 [US1] Ampliar la orquestación en `backend/src/integrations/event-extraction.ts`: tras la ruta ligera existente (HTML crudo → `htmlATexto` → IA), escalar al render **solo** cuando el resultado sea `null` o tenga 0 sesiones; pasar el DOM renderizado por el mismo `htmlATexto` → `MotorExtraccionIA` → `esDatosExtraidosValidos`; repartir el deadline único de 45 s en las fases del plan (T002) sin permitir que una etapa consuma el presupuesto de otra. Cuando el render no entra en juego (deshabilitado/no disponible, FR-011, o éxito ligero con >=1 sesión), la ruta ligera usa el presupuesto global completo (<=45 s) para no regresar respecto a 003 (research.md R2, R5; plan.md Performance Goals).
- [X] T010 [US1] Cablear el renderizador en `backend/src/context.ts`: construir `BrowserRenderer` + proxy + capacidad e inyectarlo en `CompositeEventExtractionAdapter`; si `RUMBO_RENDER_ENABLED` está desactivado o el navegador no arranca, inyectar un renderizador nulo que degrade a la ruta ligera (spec.md FR-011), registrando un único aviso al inicio.
- [X] T011 [P] [US1] Crear fixtures de agenda dinámica en `backend/tests/fixtures/rendered-agenda/`: una página que cargue sesiones por JavaScript tras hidratación, con banner de consentimiento, pestañas por día y botón "ver más", servida localmente de forma determinista para las pruebas.
- [X] T012 [US1] Test unitario en `backend/tests/event-extraction.test.ts`: la ruta ligera con ≥1 sesión no invoca el renderizador; resultados `null` y de 0 sesiones sí lo invocan; un render con ≥1 sesión gana; el deadline único de 45 s se propaga a las fases (con IA y fetch mockeados).
- [X] T013 [US1] Test de integración de navegador en `backend/tests/browser-renderer.test.ts`: contra la fixture de T011, el renderizador acepta el consentimiento, revela pestañas y "ver más", y el texto del DOM final llega a un `MotorExtraccionIA` fake que produce sesiones — sin red pública ni Anthropic real (research.md R6).
- [X] T014 [US1] Validar el Escenario 1 de `specs/004-render-agenda-js/quickstart.md` (importación dinámica con sesión, ≤45 s) y dejarlo reproducible con las fixtures/mocks.

**Checkpoint**: US1 es demostrable de forma aislada — una URL dinámica se importa como borrador con sesiones.

---

## Phase 4: User Story 2 — Robustez y seguridad cuando el render falla (Priority: P2)

**Goal**: ante fallo, timeout, falta de capacidad o intento de SSRF, mantener `fuente_ilegible` con recuperación, sin cuelgues, sin datos parciales y sin nuevos vectores de red (spec.md US2).

**Independent Test**: con navegador no disponible / saturado / con DOM sin sesiones, y con una fixture cuyo JS pide destinos internos, la app responde de forma controlada dentro del presupuesto y nunca crea eventos parciales ni alcanza destinos privados.

- [X] T015 [US2] Implementar la selección de resultado con fallback en `backend/src/integrations/event-extraction.ts`: si el render no está disponible, agota tiempo, no obtiene capacidad o no extrae sesiones, devolver el resultado ligero no nulo (con `sesiones` como campo faltante) y solo `null` (→ `422 fuente_ilegible`) cuando tampoco haya resultado ligero útil; garantizar que `ImportService` persiste solo tras la selección final (data-model.md, contracts/api.md).
- [X] T016 [US2] Añadir la observabilidad segura en `backend/src/integrations/browser-renderer.ts` y `event-extraction.ts`: registrar URL, ruta usada (ligera/render), duración por fase, clase de fallo, nº de solicitudes bloqueadas y rechazo por capacidad; nunca registrar HTML, DOM, cookies, cabeceras de autorización ni el texto enviado a la IA (research.md R5, spec.md FR-012).
- [X] T017 [US2] Tests de seguridad del proxy en `backend/tests/render-egress-proxy.test.ts`: rechaza host inicial privado, redirect a privado, subrecurso/XHR privado, `127.0.0.1`, `169.254.169.254`, esquemas no HTTP(S), y respuestas DNS que mezclan IP pública y privada (rebinding); afirmar que el proxy nunca abre conexión upstream a destinos denegados.
- [X] T018 [P] [US2] Test unitario de capacidad, tiempos e interacción en `backend/tests/browser-renderer.test.ts`: el semáforo limita a 1 render y respeta la espera de 2 s; los topes de fase se aplican; las reglas de parada de consentimiento/tabs/"ver más"/scroll se respetan (T002, research.md R4/R5).
- [X] T019 [US2] Test de integración de backend en `backend/tests/event-extraction.test.ts`: inyectando fetch, renderizador e IA fakes en `CompositeEventExtractionAdapter`, verificar que un fallo completo no escribe ningún repositorio (sin eventos/sesiones parciales) y devuelve `null`; además, afirmar que la respuesta y los mensajes de error nunca exponen credenciales de IA, detalles del navegador/proxy ni si se usó render (spec.md FR-009).
- [X] T020 [US2] Ampliar `e2e/tests/importar-url.spec.ts`: conservar los casos de bloqueo SSRF y "sin datos parciales" existentes y añadir cobertura de UI del estado `fuente_ilegible` cuando el render falla, usando una política de red de test que no salga a Internet (quickstart.md Escenarios 3 y 4).

**Checkpoint**: US2 verificable de forma aislada — fallos y ataques SSRF terminan en estado controlado sin efectos secundarios.

---

## Phase 5: User Story 3 — Mantener sin cambios lo que ya funciona (Priority: P3)

**Goal**: JSON estructurado y URLs server-rendered que ya funcionaban se importan igual, sin invocar navegador ni IA de más (spec.md US3).

**Independent Test**: importar JSON estructurado y una fixture estática con ≥1 sesión crea el evento igual que antes, sin render, y la suite existente de 001/002/003 sigue en verde.

- [X] T021 [US3] Test de regresión en `backend/tests/event-extraction.test.ts`: el payload JSON estructurado no invoca IA ni navegador; una URL cuyo HTML crudo ya da ≥1 sesión no invoca el navegador (contracts/api.md, spec.md FR-010).
- [X] T022 [US3] Ejecutar `npm --prefix backend test` y la suite `e2e` existente sin modificarlas para confirmar cero regresiones de 001/002/003 (spec.md SC-004); documentar el resultado en el checkpoint.

**Checkpoint**: US3 verificable de forma aislada — caminos previos intactos.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: documentación, despliegue y verificación final.

- [X] T023 [P] Documentar en `README.md` las variables de entorno nuevas y el paso `npx playwright install chromium`, aclarando que el render por URL requiere `ANTHROPIC_API_KEY`.
- [X] T024 [P] Añadir una nota de despliegue (p. ej. en `specs/004-render-agenda-js/quickstart.md` y para el deployer) sobre instalar Chromium de la misma versión y aislar la red del proceso de navegador para que solo alcance el proxy local (research.md R3; el aislamiento del proceso es responsabilidad de despliegue).
- [X] T025 Ejecutar `npm --prefix backend run lint`, `npm --prefix backend run typecheck` y `npm --prefix backend test` en verde; verificar que ningún fichero nuevo supera los límites de tamaño/nesting antes de dar por cerrada la feature.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → sin dependencias; T002 y T003 en paralelo tras T001.
- **Foundational (Phase 2)** → depende de Setup. Orden interno: T004 → T005; T006 y T007 pueden ir tras T005 (T007 usa el proxy). **Bloquea todas las historias.**
- **US1 (Phase 3)** → depende de Foundational. T008 tras T007; T009 tras T008; T010 tras T009. Tests T011 (P) libre; T012 tras T009; T013 tras T008/T011; T014 tras T010–T013.
- **US2 (Phase 4)** → depende de Foundational; se apoya en la orquestación de US1 (T009/T015 en el mismo fichero → secuenciales). T017/T018 pueden ir en paralelo entre sí; T019 tras T015; T020 tras T015/T016.
- **US3 (Phase 5)** → depende de que la orquestación de US1 exista; independiente de US2.
- **Polish (Phase 6)** → tras las historias objetivo.

Cada historia es entregable de forma incremental: US1 sola ya es un MVP funcional (con Foundational como base de seguridad).

## Parallel Execution Examples

- Setup: T002 y T003 juntas tras T001.
- Foundational: T006 y T007 tras T005 (ficheros distintos: `render-capacity.ts` y `browser-renderer.ts`).
- US1: T011 (fixtures) en paralelo con T008/T009 (código de producción).
- US2: T017 (`render-egress-proxy.test.ts`) y T018 (`browser-renderer.test.ts`) en paralelo por ser ficheros distintos.
- Polish: T023 y T024 en paralelo.

## Implementation Strategy

1. **MVP = Foundational + US1**: seguridad de red y navegador + camino de render feliz. Entrega el valor central (importar agendas JS) de forma segura.
2. **Incremento 2 = US2**: endurece robustez, capacidad, tiempos, observabilidad y cobertura adversarial de SSRF.
3. **Incremento 3 = US3**: blinda contra regresiones de los caminos existentes.
4. **Cierre = Polish**: documentación, despliegue y verificación final.

Los presupuestos de tiempo (45 s total; 12/22/10/1 s por fase) se implementan tal cual están definidos en `plan.md`, sin revisión (decisión del usuario).
