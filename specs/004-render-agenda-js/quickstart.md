# Quickstart: Validación de agendas renderizadas

## Prerrequisitos

```powershell
cd backend
npm install
npx playwright install chromium
Copy-Item .env.example .env
# Configura ANTHROPIC_API_KEY en backend/.env para las pruebas manuales reales.
npm test

cd ..\e2e
npm install
npm test
```

El entorno de despliegue debe instalar Chromium de la misma versión que `backend` y aislar el proceso de navegador para que solo alcance el proxy de salida local.

## Escenario 1 — Agenda dinámica con sesión (US1)

1. Arranca una fixture local que cargue sesiones por JavaScript y exponga consentimiento, tabs de día y "ver más".
2. Inyecta un motor de IA fake que transforme el DOM de la fixture en un evento con sesiones.
3. Importa su URL por `POST /api/events/import`.

**Esperado**: el camino ligero obtiene 0 sesiones, se invoca una sola vez el render, se revelan las sesiones y la respuesta es `201` con al menos una sesión. El total es <=45 s.

## Escenario 2 — Sin regresión del camino ligero (US3)

1. Importa JSON estructurado.
2. Importa una fixture estática cuya ruta ligera devuelve una o más sesiones.

**Esperado**: ambos devuelven `201`; JSON no llama IA/navegador y la URL estática no llama navegador.

## Escenario 3 — Fallos recuperables (US2)

1. Simula navegador no disponible, saturación de capacidad, timeout de render y DOM sin sesiones.
2. Repite con resultado ligero no nulo sin sesiones y con resultado ligero `null`.

**Esperado**: con resultado ligero útil se crea un borrador con `sesiones` en `campos_faltantes`; sin resultado útil devuelve `422 fuente_ilegible`; no se crean datos parciales.

## Escenario 4 — SSRF del navegador (FR-007)

1. Desde una fixture, solicita `127.0.0.1`, `169.254.169.254`, una red privada, un redirect privado y un subrecurso/XHR privado.
2. Simula DNS con dirección pública y privada y un rebinding posterior.

**Esperado**: el proxy bloquea cada solicitud y nunca abre una conexión upstream a esos destinos; el cliente recibe solo el resultado controlado sin detalles de red.

## Smoke manual de fuentes reales

Con IA configurada y el backend desplegado en su entorno aislado, prueba las URLs de AWS Summit Madrid y The AI Summit London. Registra únicamente URL, ruta usada, duración y resultado. No automatices esta comprobación: sus contenidos, defensas antibot y agendas cambian.