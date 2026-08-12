# Phase 0 · Research: Onboarding y Agenda personalizada (001)

Este documento consolida las decisiones técnicas del plan y resuelve las incógnitas del
Technical Context. Formato por entrada: Decisión · Justificación · Alternativas consideradas.

## 1. Plataforma de cliente: Web móvil / PWA

- **Decisión**: PWA responsive con React 18 + TypeScript + Vite y `vite-plugin-pwa`.
- **Justificación**: la constitución (Principio II) solo exige experiencia móvil táctil, no
  nativo. El diseño ya está maquetado en HTML/CSS (`rumbo-mockup.html`), por lo que una PWA
  reutiliza directamente los tokens y componentes sin reescribir la identidad. Instalable y con
  soporte offline básico de shell.
- **Alternativas consideradas**: React Native/Flutter (híbrido) — descartado por añadir toolchain
  nativa sin necesidad para el MVP; Android nativo — descartado por acoplar a una sola plataforma
  en contra del Principio II.

## 2. Backend propio (BFF) para integraciones externas

- **Decisión**: backend Node.js 20 + Fastify (TypeScript) como Backend-for-Frontend.
- **Justificación**: el Principio VI prohíbe llamadas directas del cliente a servicios externos
  sensibles. El motor de extracción y el proveedor de mapas/tráfico se consumen desde el BFF,
  que expone al cliente contratos estables (ver `contracts/api.md`). TypeScript compartido
  reduce fricción entre front y back.
- **Alternativas consideradas**: llamadas directas desde el cliente — rechazado por Principio VI
  (exposición de credenciales, sin capa de control); serverless functions — válido a futuro,
  pero un servicio único simplifica el MVP.

## 3. Persistencia: ficheros JSON con capa de repositorio (MVP)

- **Decisión**: persistir en **ficheros JSON** en el backend, uno por colección, tras una capa de
  repositorio con interfaz estable (`find`, `save`, `delete`). Sin base de datos en el MVP.
- **Justificación**: para un MVP la persistencia en fichero es suficiente, arranca sin
  infraestructura externa (sin servidor de BD) y persiste entre reinicios del backend. La capa de
  repositorio abstrae el almacenamiento, de modo que migrar a PostgreSQL u otra BD más adelante no
  afecta a servicios ni a rutas. Encaja con el Principio II (tecnología concreta ligera y
  diferida).
- **Alternativas consideradas**: **PostgreSQL** — potente pero excesivo para el MVP (requiere
  servidor, migraciones); **solo en memoria** — descartado porque perdería los eventos al
  reiniciar, rompiendo la premisa multi-evento de la Historia 5; **SQLite** — intermedio válido,
  pero el fichero JSON es aún más simple y directo para el volumen esperado (decenas de eventos).
- **Nota de modelo**: las "claves foráneas" del `data-model.md` se representan como referencias
  por `id` entre ficheros; la integridad referencial la garantiza la capa de repositorio, no un
  motor SQL.

## 4. Motor de extracción de eventos (URL / PDF / imagen / calendario / QR)

- **Decisión**: adaptador único `EventExtraction` en el backend con una interfaz común
  `extract(source) → EventDraft`, independiente de la fuente; la implementación concreta del
  motor (OCR, parsing de PDF, scraping de URL, parse iCal) se especifica en una **spec de
  backend/integración aparte** (Principio V).
- **Justificación**: la spec 001 asume que "existe un servicio de extracción" (Suposiciones) y no
  decide su tecnología. Aislar el contrato permite empezar con un motor mock y sustituirlo.
- **Alternativas consideradas**: un parser por fuente acoplado a la ruta — descartado por
  dispersar la lógica; decidir el proveedor de OCR aquí — fuera de alcance de esta spec.
- **Pendiente para spec de backend**: elección del proveedor de OCR/scraping y su tolerancia a
  fuentes incompletas (FR-007) e ilegibles (estado `illegible-card`).

## 5. Mapas, transporte y tráfico

- **Decisión**: adaptador `MapsProvider` en el backend; el diseño ya atribuye rutas y tráfico a
  **Google Maps** (`route-card`, `.data-attr`), que se toma como proveedor de referencia.
- **Justificación**: FR-016–FR-022 requieren ruta, hora de salida, transporte, aparcamiento y
  avisos de tráfico. El diseño fija la atribución a Google Maps; se respeta.
- **Alternativas consideradas**: otros proveedores (Mapbox, HERE) — válidos, pero el diseño ya
  compromete la atribución visual a Google Maps; cambiarla implicaría revisar la identidad.
- **Pendiente para spec de backend**: credenciales, cuotas y la fuente exacta de tráfico en
  tiempo real (FR-021). En la spec de producto, FR-021 y la HU3 esc.4 ya quedan cerradas
  indicando que estos datos llegan "a través de un proveedor externo consumido desde el backend";
  el proveedor concreto se decide en la spec de backend.

## 6. Confirmación explícita de cambios sensibles (Principio IV)

- **Decisión**: el recálculo de agenda (FR-015) y la actualización de ruta/hora de salida
  (FR-022) NO se aplican automáticamente: el backend calcula una **propuesta** (diff) y el
  cliente la presenta con doble acción (`agenda-diff-card`: "Aplicar nueva agenda" / "Mantener
  la actual"; `alert-card`: "Confirmar nueva salida" / "Mantener la mía"). El estado solo cambia
  tras confirmación.
- **Justificación**: alinea implementación con Principio IV y con las decisiones ya cerradas en
  `design.md`.
- **Alternativas consideradas**: aplicar y permitir deshacer — rechazado: el Principio IV prohíbe
  cambios automáticos silenciosos en agenda y logística.

## 7. Objetivos: ¿uno o varios por evento? (aclaración de la spec)

- **Decisión**: permitir **selección múltiple** de objetivos por evento.
- **Justificación**: el escenario de HU2 lista ocho objetivos y habla de "una o varias opciones";
  el diseño (pantalla Objetivos) usa chips de selección múltiple. La priorización de agenda
  pondera todos los objetivos elegidos.
- **Alternativas consideradas**: un único objetivo principal — descartado por reducir la
  personalización que persigue SC-004.
- **Nota**: la HU2 escenario 2 de la spec ya recoge esta decisión (selección múltiple); no quedan aclaraciones abiertas al respecto.

## 8. Testing y trazabilidad (Principio VIII)

- **Decisión**: Vitest + React Testing Library (frontend), Fastify inject para contratos de API,
  Playwright para los flujos de aceptación P1 (importar → objetivos → agenda). Cada nota, ruta,
  alerta y sesión referencia su evento (clave foránea) para garantizar trazabilidad.
- **Justificación**: los criterios de éxito (SC-001…SC-009) son medibles y verificables en
  pruebas E2E; la trazabilidad es un requisito explícito del Principio VIII.
- **Alternativas consideradas**: solo pruebas manuales — descartado por los criterios medibles.

## Incógnitas restantes (delegadas, no bloquean la 001)

Estas quedan fuera del alcance de esta spec de producto y se resolverán en specs de
backend/integración (Principio V), sin bloquear el diseño de la 001:

- Proveedor y tolerancia del motor de extracción (OCR/scraping).
- Fuente de tráfico/transporte en tiempo real y credenciales de mapas.
- Criterio de desempate cuando varias sesiones encajan igual con los objetivos (caso límite spec).
- Política de archivado de eventos cerrados a largo plazo (caso límite spec).
