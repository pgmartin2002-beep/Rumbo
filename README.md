# Rumbo

PWA móvil que ayuda a quien asiste a un evento a **importarlo**, **definir sus objetivos**,
recibir una **agenda priorizada**, **planificar la logística** (ruta y hora de salida), **preparar
preguntas** por sesión, **vivir el evento** con un modo simplificado y **capturar notas y
contactos** en el momento.

Este repo implementa tres features:

- Feature 001 — _Onboarding del evento y Agenda personalizada por objetivos_
  (ver `specs/001-onboarding-agenda-personalizada/`).
- Feature 002 — _Preparar interacciones y vivir el evento_: preguntas por sesión, modo
  simplificado ("qué toca ahora y dónde"), notas de texto/voz y contactos, con captura sin
  conexión (ver `specs/002-interacciones-y-evento/`).
- Feature 003 — _Extracción de eventos desde fuentes reales con IA_: importar un evento pegando
  la URL pública de su web, obteniendo el contenido desde el backend y usando IA (Anthropic
  Claude) para estructurar nombre, fechas, ubicación, sesiones y ponentes, con protección frente
  a SSRF y un presupuesto de 30s (ver `specs/003-extraccion-evento-ia/`).

## Arquitectura

Monorepo con tres paquetes:

| Carpeta     | Qué es                                              | Stack                                   |
| ----------- | --------------------------------------------------- | --------------------------------------- |
| `frontend/` | PWA instalable (única vía de acceso a datos)        | React 18 + Vite + TypeScript + PWA      |
| `backend/`  | BFF: orquesta integraciones externas (extracción, mapas, generación de preguntas, transcripción de voz) | Node.js + Fastify + TypeScript |
| `e2e/`      | Validación end-to-end del quickstart                | Playwright                              |

- **Persistencia (MVP)**: ficheros JSON en `backend/data/` (sin base de datos). La capa de
  repositorio expone una interfaz estable que permite migrar a una BD más adelante.
- **Principio VI**: el frontend **solo** habla con el backend (`/api/*`); nunca con servicios
  externos. En desarrollo, las integraciones externas usan adaptadores mock.

## Prerrequisitos

- Node.js 20+ y npm.

## Arranque local

Instala dependencias en cada paquete y arranca backend y frontend en dos terminales:

```bash
# 1) Backend (BFF) — expone /api en http://localhost:3001
cd backend
npm install
npm run dev            # tsx watch; usa backend/data/ como almacén JSON

# 2) Frontend (PWA) — sirve en http://localhost:5173
cd frontend
npm install
npm run dev            # Vite; proxya /api a http://localhost:3001
```

Abre http://localhost:5173. Si no hay eventos verás el estado de bienvenida.

### Variables de entorno del backend

| Variable                  | Por defecto      | Descripción                                                         |
| -------------------------- | ---------------- | -------------------------------------------------------------------- |
| `PORT`                    | `3001`           | Puerto del BFF.                                                     |
| `RUMBO_DATA_DIR`          | `backend/data`   | Directorio del almacén de ficheros JSON.                            |
| `ANTHROPIC_API_KEY`       | _(ninguna)_      | Clave del motor de IA (feature 003). Sin ella, importar por URL degrada a "fuente ilegible" (ver `specs/003-extraccion-evento-ia/`). |
| `RUMBO_AI_MODEL`          | `claude-haiku-4-5-20251001` | Modelo de Anthropic Claude usado para extraer eventos desde HTML.   |
| `RUMBO_AI_MAX_HTML_BYTES` | `2097152` (2 MB)  | Tamaño máximo del HTML leído de la URL antes de cortar la lectura.   |
| `RUMBO_AI_MAX_CHARS`      | `60000`          | Tamaño máximo del texto (tras limpiar el HTML) enviado a la IA.     |

Copia `backend/.env.example` a `backend/.env` para configurarlas en desarrollo local (se cargan
automáticamente al arrancar el backend).

## Verificación

```bash
# Typecheck
cd backend && npm run typecheck
cd frontend && npm run typecheck

# Unit (backend): SSRF, obtención de HTML, limpieza de texto y motor de IA (feature 003)
cd backend && npm run test

# Build de producción de la PWA
cd frontend && npm run build

# E2E (arranca backend + frontend automáticamente)
cd e2e
npm install
npx playwright install chromium   # primera vez
npx playwright test
```

Los tests E2E cubren los 6 escenarios de `specs/001-onboarding-agenda-personalizada/quickstart.md`
(importar, objetivos, agenda priorizada con conflictos, recálculo con confirmación explícita,
logística y "Mis eventos"), incluida la comprobación del Principio VI (sin llamadas externas), y
los 4 escenarios de `specs/002-interacciones-y-evento/quickstart.md` (preguntas por sesión, modo
simplificado con solape de sesiones, notas con captura offline y contactos con detección de
duplicados), y el bloqueo de SSRF de la importación por URL de la feature 003 (destinos internos y
metadatos de nube, sin llamadas de red reales — `specs/003-extraccion-evento-ia/quickstart.md`).
El camino real "URL pública + IA" no tiene cobertura E2E automática (depende de red externa y de
una clave de pago); se valida a mano siguiendo el Escenario 1 de ese mismo `quickstart.md`.

## Desarrollo dirigido por especificación (Spec Kit)

El trabajo sigue el ciclo: `constitution → specify → clarify → plan → tasks → analyze → implement`.
Los artefactos de cada feature viven en `specs/<id-feature>/`. La constitución del proyecto está en
`.specify/memory/constitution.md`.