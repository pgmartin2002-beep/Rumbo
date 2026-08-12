# Rumbo

PWA móvil que ayuda a quien asiste a un evento a **importarlo**, **definir sus objetivos**,
recibir una **agenda priorizada** y **planificar la logística** (ruta y hora de salida).

Este repo implementa la Feature 001 — _Onboarding del evento y Agenda personalizada por objetivos_
(ver `specs/001-onboarding-agenda-personalizada/`).

## Arquitectura

Monorepo con tres paquetes:

| Carpeta     | Qué es                                              | Stack                                   |
| ----------- | --------------------------------------------------- | --------------------------------------- |
| `frontend/` | PWA instalable (única vía de acceso a datos)        | React 18 + Vite + TypeScript + PWA      |
| `backend/`  | BFF: orquesta integraciones externas (extracción, mapas) | Node.js + Fastify + TypeScript     |
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

| Variable         | Por defecto      | Descripción                                    |
| ---------------- | ---------------- | ---------------------------------------------- |
| `PORT`           | `3001`           | Puerto del BFF.                                |
| `RUMBO_DATA_DIR` | `backend/data`   | Directorio del almacén de ficheros JSON.       |

## Verificación

```bash
# Typecheck
cd backend && npm run typecheck
cd frontend && npm run typecheck

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
logística y "Mis eventos"), incluida la comprobación del Principio VI (sin llamadas externas).

## Desarrollo dirigido por especificación (Spec Kit)

El trabajo sigue el ciclo: `constitution → specify → clarify → plan → tasks → analyze → implement`.
Los artefactos de cada feature viven en `specs/<id-feature>/`. La constitución del proyecto está en
`.specify/memory/constitution.md`.