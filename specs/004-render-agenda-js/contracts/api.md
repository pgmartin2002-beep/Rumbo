# Contrato de API: Render de agendas JavaScript

No se añaden rutas ni campos. La feature amplía internamente `POST /api/events/import` de 001/003.

## `POST /api/events/import`

**Body**: `{ "fuente": string, "payload": string }` — sin cambios.

| Entrada | Comportamiento |
|---|---|
| JSON estructurado | Se conserva el camino stub; no usa IA ni navegador. |
| URL HTTP(S) con >=1 sesión por HTML crudo | Se conserva el resultado ligero; no renderiza. |
| URL HTTP(S) con 0 sesiones por HTML crudo | Renderiza en backend, aplica interacción limitada y vuelve a extraer con IA. |

### Respuestas

- **201**: el mismo `Evento` más `campos_faltantes: string[]`. Si la ruta ligera aportó datos pero el render no mejora la agenda, se puede devolver ese borrador con `sesiones` como campo faltante.
- **422** `fuente_ilegible`: URL ilegible, destino bloqueado por SSRF, no hay configuración de IA, no existe resultado ligero útil y el render falla/no está disponible/no obtiene sesiones, o se excede el presupuesto total (120 s). Nunca se incluyen detalles de red, proxy, Chromium o credenciales.
- **400** `fuente_invalida`: sin cambios.

La respuesta no revela si se usó render. Ese dato queda solo en observabilidad segura del backend (FR-012).