# Quickstart: Extracción de eventos desde fuentes reales con IA

Valida de extremo a extremo las 3 historias de usuario de `spec.md` sobre el mismo entorno local de
las features 001/002 (ver `README.md` del repo).

## Prerrequisitos

```bash
cd backend
npm install
cp .env.example .env        # rellena ANTHROPIC_API_KEY para el Escenario 1
npm run dev                 # http://localhost:3001

cd frontend
npm install
npm run dev                 # http://localhost:5173, proxya /api
```

Sin `ANTHROPIC_API_KEY` configurada, el camino de URL real degrada a "fuente ilegible" de forma
controlada (research.md R7) — útil para validar el Escenario 2c sin gastar cuota de la IA.

## Escenario 1 — Importar por URL con agenda pública (Historia 1)

Requiere `ANTHROPIC_API_KEY` configurada y una URL pública real con agenda visible en el HTML (sin
JavaScript), por ejemplo la página de agenda de una conferencia con el formato clásico de tabla de
sesiones.

1. `POST /api/events/import` con `{ "fuente": "url", "payload": "<url pública>" }`.
   - **Esperado**: `201`, `Evento` con `nombre`, `fecha_inicio`, `fecha_fin` (AC1) y al menos una
     sesión con su franja horaria; `fuente_valor` igual a la URL enviada (contracts/api.md,
     data-model.md).
2. Si la página lista ponentes por sesión, revisa el evento creado.
   - **Esperado**: cada sesión con ponente incluye su nombre (AC2).
3. Si algún campo no se pudo extraer (p. ej. `ubicacion`).
   - **Esperado**: aparece en `campos_faltantes`, editable a mano desde `EventReview` (AC3,
     continuidad con FR-008 del 001).
4. Repite el paso 1 y cronometra la respuesta.
   - **Esperado**: responde (éxito o fallo) en ≤ 30 s (SC-003, research.md R5).

## Escenario 2 — Fuente ilegible, sin bloquear al usuario (Historia 2)

Todos estos pasos funcionan **sin** `ANTHROPIC_API_KEY` (degradan antes de llamar a la IA).

1. `POST /api/events/import` con `{ "fuente": "url", "payload": "https://ejemplo-inexistente-404.invalid/agenda" }`.
   - **Esperado**: `422 fuente_ilegible`; no se crea ningún evento (AC1, US2 AC2).
2. `POST /api/events/import` con `{ "fuente": "url", "payload": "http://127.0.0.1:3001/api/events" }`
   (destino interno).
   - **Esperado**: `422 fuente_ilegible` — bloqueo SSRF (FR-013), sin detalle de red en el mensaje.
3. `POST /api/events/import` con `{ "fuente": "url", "payload": "http://169.254.169.254/latest/meta-data/" }`
   (metadatos de nube).
   - **Esperado**: `422 fuente_ilegible` — mismo bloqueo SSRF.
4. Con el backend arrancado **sin** `ANTHROPIC_API_KEY`, `POST /api/events/import` con una URL
   pública real válida.
   - **Esperado**: `422 fuente_ilegible` (degradación controlada, FR-012), no `500`.
5. En el frontend, repite el paso 1 desde `/importar`.
   - **Esperado**: la UI muestra el estado de "fuente ilegible" con opciones de probar otra fuente o
     introducir los datos a mano (US2, ya soportado por `ImportEvent.tsx`).

## Escenario 3 — La importación estructurada sigue igual (Historia 3)

1. `POST /api/events/import` con `{ "fuente": "url", "payload": "<JSON estructurado, ver e2e/tests/fixtures.ts>" }`.
   - **Esperado**: `201`, evento creado igual que en 001/002, **sin** llamar a la IA (verificable
     porque funciona igual con y sin `ANTHROPIC_API_KEY` configurada) — AC1, FR-007.
2. Ejecuta la suite E2E existente de 001/002 sin modificarla.
   - **Esperado**: sigue en verde; ningún test de 001/002 depende del camino de IA (SC-004).

## Cobertura automática

- **Unit (Vitest, backend)**: `AnthropicEventExtractionAdapter` con el cliente de Anthropic
  mockeado (extracción válida, respuesta inválida, timeout, sin clave), `esIpPrivada`/resolución
  SSRF y `htmlATexto`, siguiendo research.md R10.
- **E2E (Playwright)**: añadir a `e2e/tests/` un spec (p. ej. `importar-url.spec.ts`) que cubra, sin
  red externa ni clave de IA: el bloqueo SSRF (Escenario 2, pasos 2–3) y el caso "IA sin configurar"
  (Escenario 2, paso 4) arrancando el backend de test sin `ANTHROPIC_API_KEY`. El Escenario 1 (URL
  pública real + IA) se valida a mano con esta guía, no en la suite automática (research.md R10).
