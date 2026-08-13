# Contrato de API: Extracción de eventos desde fuentes reales con IA

No se añaden rutas nuevas. Esta feature cambia el **comportamiento interno** de
`POST /api/events/import` (feature 001) sin tocar su forma pública; usa el mismo formato de error
único de `backend/src/api/error-handler.ts`:

```json
{ "error": "<codigo>", "mensaje": "<texto legible>" }
```

## `POST /api/events/import`

- **Body**: `{ "fuente": string, "payload": string }` — sin cambios de forma. `fuente` sigue
  validándose contra el enum `FuenteImportacion` existente (`validarFuente`).
- **Comportamiento** (research.md R8): a partir del `payload`, no de `fuente`:
  - `payload` parsea como JSON de un objeto → importación estructurada existente, **sin** invocar
    la IA (FR-007, sin cambios respecto a 001/002).
  - `payload` es una URL `http`/`https` válida → obtención de contenido + extracción con IA
    (FR-001–FR-004).
  - Cualquier otro caso → `422 fuente_ilegible`.
- **201**: `Evento` (incluye el nuevo campo `fuente_valor`, ver `data-model.md`) +
  `campos_faltantes: string[]` — misma forma que hoy.
- **422** `fuente_ilegible` — mismo código que ya usa el stub, ahora también cubre:
  - La URL no responde, no es `2xx`, o el contenido no permite reconocer un evento (FR-006, US2 AC1).
  - La URL (o algún salto de redirect) apunta a un destino interno/privado — bloqueo SSRF,
    FR-013; el mensaje no debe filtrar detalles de red internos, solo "fuente ilegible".
  - Se supera el presupuesto total de 30 s (fetch + IA), FR-008, SC-003.
  - La IA no está configurada (`ANTHROPIC_API_KEY` ausente), FR-012 — degradación controlada, no
    `500`.
  - La IA devuelve una estructura no válida o vacía tras `esDatosExtraidosValidos` (research.md R6),
    FR-004.
  - En todos los casos anteriores: **no** se crea ningún evento parcial (US2 AC2).
- **400** `fuente_invalida`: `fuente` fuera del enum — sin cambios.

No se distingue entre los distintos motivos de `fuente_ilegible` en el código de error de cara al
cliente (US2 solo exige un mensaje comprensible y las acciones de recuperación ya existentes:
probar otra fuente o introducir los datos a mano); el detalle técnico, si se necesita, queda en los
logs del backend, nunca en la respuesta.
