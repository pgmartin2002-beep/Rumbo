# Rumbo — Handoff para continuar con la Spec 002 (Spec-Driven Development)

> Documento de traspaso para retomar el proyecto **Rumbo** y ejecutar la **Spec 002**
> siguiendo Spec-Driven Development "de libro": **clarify → plan → tasks → analyze →
> implement**. Escrito para pegarlo directamente en el Claude/Copilot del compañero.

---

## 1. Qué es Rumbo (contexto de producto)

PWA móvil que acompaña a un asistente a un evento (antes / durante / después):
importar evento → definir objetivos → **agenda priorizada** (metáfora de tarjeta de
embarque) → preparar interacciones → vivir el evento → seguimiento.

Metodología: **Spec-Driven Development** con Spec Kit + skills de Copilot
(`.github/skills/speckit-*`). La constitución del proyecto está en
`.specify/memory/constitution.md` (v1.0.0, 8 principios) y **prevalece** sobre cualquier
spec/plan/tarea.

### Principios que SIEMPRE deben respetarse
- **III — Identidad de diseño**: metáfora *boarding-pass* ya definida en
  `design/design.md` + `design/rumbo-mockup.html`. El color codifica **prioridad**, no
  marca. Nunca inventar un 4º color de acento.
- **IV — Proponer y confirmar (NO negociable)**: recalcular agenda, cambiar hora de
  salida o enviar algo requiere **confirmación explícita** del usuario. Nada de cambios
  automáticos silenciosos.
- **VI — IA / integraciones por capas controladas**: el frontend **solo** habla con
  `/api` del backend, nunca con servicios externos. Credenciales solo en backend.
- **VIII — Calidad móvil**: estados de carga y error **siempre visibles**; trazabilidad
  de qué nota/contacto pertenece a qué evento y sesión.

---

## 2. Stack y estructura del repo

- **Backend (BFF)**: Node 22, TypeScript **ESM** (imports con extensión `.js`),
  **Fastify**. Persistencia MVP en **ficheros JSON** (`JsonRepository`), sin base de
  datos. Puerto **3001** (`RUMBO_DATA_DIR` para aislar datos en tests). Sin dependencias
  de IA todavía.
- **Frontend**: React + Vite + React Router, **PWA**. Vite proxya `/api` → localhost:3001.
  Fuentes **auto-alojadas con `@fontsource`** (Space Grotesk / IBM Plex Sans / Mono), NO
  CDN externo (Principio VI).
- **E2E**: Playwright (perfil mobile-chrome). Arranca backend + frontend solo y usa datos
  limpios en `e2e/.e2e-data`. Actualmente **4/4 tests en verde**.
- **Carpetas**: `backend/`, `frontend/`, `e2e/`, `specs/`, `design/`, `.specify/`,
  `.github/skills/`.

### Convenciones / gotchas
- Commits con trailer: `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.
- Windows + PowerShell: sin operadores `&&` / `||` / `?:`; `Stop-Process` solo por `-Id`.
- Imports TypeScript con `.js` aunque el fichero sea `.ts` (ESM).

---

## 3. Estado de las specs

### Spec 001 — Onboarding + agenda personalizada ✅ (implementada y mergeada)
- `specs/001-onboarding-agenda-personalizada/` (spec, plan, tasks, research, data-model,
  quickstart, contracts/api.md).
- **Backend**: servicios `import`, `goals`, `agenda`, `events-list`, `logistics`;
  adaptadores stub (`StubEventExtractionAdapter`, `StubMapsProviderAdapter`); rutas en
  `backend/src/api/routes/`. Contexto/DI en `backend/src/context.ts`.
- **Frontend**: páginas `MyEvents`, `ImportEvent`, `EventReview`, `Goals`, `Agenda`,
  `Logistics` + componentes `AgendaDiffCard`, `AlertCard`, `States`. Sistema de diseño en
  `frontend/src/styles/tokens.css` (reescrito para seguir el boarding-pass real).
- **Modelo de datos existente y reutilizable**: `Evento`, `Sesion`
  (`{id, evento_id, titulo, inicio, fin, sala, tema, ponente_ids[]}`), `Ponente`
  (`{id, nombre, empresa}`), `Empresa`, `PerfilObjetivos`, `AgendaPersonalizada` con
  `AgendaItem` (`{sesion_id, prioridad, motivo_recomendacion, en_conflicto,
  es_alternativa_de}`). Repos JSON en `backend/src/repositories/`.
- Estado: **mergeada a `main`** (PRs #2 y #4). E2E 4/4.

### Spec 002 — Preparar interacciones y vivir el evento ⏳ (SOLO spec, es la tuya)
- Carpeta: `specs/002-interacciones-y-evento/`.
- ⚠️ **El fichero se llama `Reto Viberiano - spec-interacciones-y-evento.md`, NO
  `spec.md`.** Los skills de speckit esperan `spec.md`. Ver **§4 preparación**.
- **Alcance**: cubre los puntos 4, 5 y 6 del flujo global (preparar preguntas, tomar
  notas, registrar contactos) + el **modo simplificado** ("qué toca ahora y dónde").
  Follow-up e informe final (puntos 7-8) quedan para otra spec.
- **4 Historias de Usuario, todas P1**:
  1. Preparar preguntas (generales/técnicas) por sesión, regenerables + preguntas
     manuales del usuario.
  2. **Modo simplificado**: mostrar la sesión activa según la hora y su ubicación,
     autoactualizado; manejar huecos y estar fuera de horario.
  3. Tomar **notas** (texto y voz→texto) vinculadas automáticamente a la sesión activa;
     editar/eliminar.
  4. Registrar **contactos** en el momento (nombre + nota), vinculados a la sesión o al
     evento; editar; detectar posibles duplicados.
- **17 requisitos funcionales** (FR-001…FR-017), 6 criterios de éxito (SC-001…SC-006).
- **Entidades nuevas**: `Pregunta preparada`, `Nota`, `Contacto` (todas cuelgan de
  `Sesion`/`Evento` reutilizados del 001).
- **Ya contiene marcadores `[NECESITA ACLARACIÓN]`** que el paso *clarify* debe resolver:
  - Vincular manualmente una nota tomada en un hueco a una sesión anterior/posterior (US3-4).
  - Criterio de detección de contactos duplicados (US4-5 / FR-016): ¿nombre exacto,
    aproximado, otra señal?
  - Alcance del **modo sin conexión** (FR-017): ¿solo captura de notas/contactos, o
    también modo simplificado y generación de preguntas? Y cómo se sincroniza.
  - Comportamiento offline del modo simplificado (caso límite).
- **Dependencia dura**: requiere evento importado + objetivos + agenda generada (todo del
  001, ya disponible).
- **Fuera de alcance** (declarado): personalización de preguntas por perfil, copiloto de
  networking, captura por QR/NFC/foto de tarjeta, replanificación automática, y toda la
  Actividad 5 (informe/seguimiento).

### Spec 003 — Extracción de eventos desde URL con IA ⏳ (spec lista, sin implementar)
- `specs/003-extraccion-evento-ia/` (spec.md + checklists/requirements.md). **Mergeada a
  `main`** (PR #3). Sin plan/tasks/implementación.
- Motivo: hoy importar por URL real falla porque `StubEventExtractionAdapter` solo acepta
  JSON. Objetivo: fetch del HTML + IA (Anthropic Claude) para estructurar el evento.
- Decisiones ya clarificadas: **solo HTML crudo** en MVP (sin render JS), **timeout 30 s**,
  **guardas SSRF** (solo http/https público; bloquear localhost/IPs privadas/metadatos).
- **No es tu tarea ahora**, pero existe: no pises `feature.json` sin querer (ver §4).

---

## 4. Preparación imprescindible antes de empezar la Spec 002

Hay dos cosas que ajustar para que los skills de speckit trabajen sobre el 002:

1. **Renombrar la spec a `spec.md`** (los skills la buscan por ese nombre):
   ```powershell
   cd C:\Workspace\POC\rumbo
   git mv "specs/002-interacciones-y-evento/Reto Viberiano - spec-interacciones-y-evento.md" `
          "specs/002-interacciones-y-evento/spec.md"
   ```

2. **Apuntar `feature.json` al 002** (ahora apunta al 003). Los skills leen esta ruta:
   ```powershell
   Set-Content .specify/feature.json '{
     "feature_directory": "specs/002-interacciones-y-evento"
   }'
   ```

3. **Crear y situarte en la rama de la feature** (numeración secuencial → 002):
   ```powershell
   git checkout main
   git pull
   git checkout -b 002-preparar-interacciones-vivir-evento
   ```
   > Nota: la spec ya declara `Rama: 002-preparar-interacciones-vivir-evento`. Usa ese
   > nombre para mantener coherencia.

4. (Recomendable) Confirma que `check-prerequisites.ps1` resuelve bien la feature:
   ```powershell
   .specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly
   ```
   Debe devolver `FEATURE_DIR` y `FEATURE_SPEC` apuntando a `002-...`.

---

## 5. Flujo Spec-Driven a ejecutar (en este orden)

Ejecuta cada skill y **espera** a completarlo antes del siguiente. Todos operan sobre la
feature activa (la del `feature.json` que acabas de fijar).

### Paso 1 — `/speckit-clarify`
- Detecta ambigüedades y las graba en el propio `spec.md` (sección `## Clarifications`).
- **Prioriza resolver los `[NECESITA ACLARACIÓN]` ya presentes** (duplicados de contacto,
  alcance offline, vinculación manual de notas). Máx. 5 preguntas, de una en una.
- No avances al plan hasta cerrar las de alto impacto (afectan a modelo de datos y a los
  tests de aceptación).

### Paso 2 — `/speckit-plan`
- Genera los artefactos de diseño (plan.md, research.md, data-model.md, quickstart.md,
  contracts/) decidiendo el **cómo**.
- Decisiones técnicas esperables en este plan:
  - Nuevos servicios backend: preguntas, notas, contactos, y un cálculo de "sesión activa
    ahora" para el modo simplificado (deriva de la agenda del 001 por hora actual).
  - Nuevas entidades JSON (`Pregunta`, `Nota`, `Contacto`) + repos, **reutilizando**
    `Sesion`/`Evento`/`AgendaPersonalizada` del 001 sin duplicarlos (Principio VII).
  - Generación de preguntas y transcripción voz→texto: como **adaptadores/integraciones
    en backend** (Principio VI), reemplazables. Definir el degradado si no hay servicio.
  - Modo simplificado y autoactualización: cómo se refresca sin acción manual.
  - Offline / sincronización: según lo aclarado en el Paso 1.
  - Contratos de API nuevos, siguiendo el estilo de `001/contracts/api.md`.
- **Respeta la identidad de diseño (III)**: las nuevas pantallas usan el sistema de
  `frontend/src/styles/tokens.css`.

### Paso 3 — `/speckit-tasks`
- Genera `tasks.md`: tareas ordenadas por dependencias, marcadas `[P]` si son paralelas,
  agrupadas por historia P1. Enfoque TDD cuando aplique (tests antes que implementación).

### Paso 4 — `/speckit-analyze`
- Análisis de coherencia **no destructivo** entre `spec.md`, `plan.md` y `tasks.md`.
  Verifica que no falten requisitos, que no haya contradicciones ni tareas huérfanas, y
  que todo trace a la constitución. Corrige lo que marque antes de implementar.

### Paso 5 — `/speckit-implement`
- Ejecuta las tareas de `tasks.md` fase por fase, marcándolas `[X]` al completarlas.
- Al terminar: **typecheck + build de backend y frontend, y E2E en verde** antes de dar
  por cerrada la feature. Añade tests E2E para las nuevas historias.
- Verifica que no rompes el 001 (los 4 E2E existentes deben seguir pasando).

---

## 6. Checklist rápido de "hecho"

- [ ] `spec.md` renombrado y `feature.json` → 002; rama `002-...` creada.
- [ ] `/speckit-clarify` completado; todos los `[NECESITA ACLARACIÓN]` resueltos en el spec.
- [ ] `/speckit-plan` genera plan + data-model + contracts coherentes con 001 y la
      constitución.
- [ ] `/speckit-tasks` produce `tasks.md` por historias P1.
- [ ] `/speckit-analyze` sin inconsistencias pendientes.
- [ ] `/speckit-implement` con typecheck + build + E2E en verde (incl. tests nuevos).
- [ ] Commit(s) con trailer Co-authored-by y push a la rama; abrir PR.

---

## 7. Punto de partida de git (para orientarte)

- `main`: contiene 001 implementado + spec de 003 (PRs #2, #3, #4 ya mergeados).
- Ramas remotas existentes: `001-onboarding-agenda-personalizada`,
  `003-extraccion-evento-ia`.
- Identidad de commits del proyecto: `seirg <ignacio.rubiog@gmail.com>`.

> Si al hacer push aparece un 403, revisa qué cuenta de GitHub está autenticada
> (`gh auth status`): debe ser una con permiso de escritura en `pgmartin2002-beep/Rumbo`.
