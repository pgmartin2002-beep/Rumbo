# Modelo de datos: Extracción de eventos desde fuentes reales con IA

Extiende los tipos de `backend/src/models/index.ts` (feature 001). `Sesion`, `Ponente` y
`EmpresaParticipante` se **reutilizan sin cambios** (Principio VII); esta feature solo añade un
campo a `Evento` y formaliza dos estructuras transitorias que ya existían de forma implícita en
`event-extraction.ts`.

## Cambios sobre entidades existentes

### Evento (+1 campo)

| Campo | Tipo | Notas |
|---|---|---|
| `fuente_valor` | `string \| null` | **Nuevo**. La URL pública desde la que se importó, solo cuando el import fue por el camino real de esta feature (research.md R8, caso 2). `null` para importación estructurada, para el resto de tipos de `fuente_importacion` y para eventos de las features 001/002 anteriores a este cambio. |

**Reglas de validación**: si no es `null`, debe ser la misma cadena `payload` que se envió a
`POST /api/events/import` (no se reformatea ni se normaliza); no se valida como URL "bonita", solo
se persiste tal cual para trazabilidad (FR-010).

**Migración**: los ficheros JSON existentes (`eventos.json` de features 001/002) no tienen este
campo; el repositorio lo trata como `undefined` → equivalente a `null` al leer (mismo patrón laxo
que ya usa `JsonRepository<T>` para campos opcionales). No se requiere script de migración.

## Estructuras transitorias (no persistidas)

Viven solo durante la ejecución de `ImportService.importar` → `EventExtractionAdapter.extraer`;
nunca se guardan en `RUMBO_DATA_DIR` (FR-010: "sin almacenar contenido sensible innecesario").

### Contenido obtenido

Texto plano derivado del HTML de la URL (research.md R1/R4), usado como entrada de la IA.

| Campo | Tipo | Notas |
|---|---|---|
| `url_final` | `string` | URL tras seguir redirects (para logging de diagnóstico, no persistida) |
| `texto` | `string` | Salida de `htmlATexto(html)`, recortada a `RUMBO_AI_MAX_CHARS` |

### Datos de evento extraídos (`DatosEventoExtraidos`)

Ya existe como interfaz en `backend/src/integrations/event-extraction.ts` (feature 001); esta
feature **no cambia su forma**, solo añade un segundo productor (`AnthropicEventExtractionAdapter`,
research.md R3) además del stub estructurado, y una función de validación antes de persistir
(research.md R6):

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | `string \| null` | |
| `fecha_inicio` | `string \| null` | ISO 8601 si no es `null` |
| `fecha_fin` | `string \| null` | ISO 8601 si no es `null`; si ambas fechas existen, `fecha_fin >= fecha_inicio` |
| `ubicacion` | `string \| null` | |
| `requisitos_acceso` | `string \| null` | |
| `sesiones` | `{ titulo, inicio, fin, sala, tema, ponentes }[]` | `titulo`/`inicio`/`fin` no vacíos por sesión |
| `empresas` | `{ nombre, rol }[]` | |

**Regla de validación nueva** (`esDatosExtraidosValidos`, research.md R6): se aplica **solo** a la
salida de `AnthropicEventExtractionAdapter` (camino IA); el camino estructurado existente conserva
su comportamiento actual de `StubEventExtractionAdapter` sin cambios. Si la validación falla, el
adaptador devuelve `null` (fuente ilegible), igual que ya hace el stub con un payload inválido.

## Relaciones

```text
Evento 1──* Sesion         (reutilizada de 001, sin cambios)
Sesion 1──* Ponente        (reutilizada de 001, sin cambios)
Evento 1──* EmpresaParticipante  (reutilizada de 001, sin cambios)
"Contenido obtenido" ──> "Datos de evento extraídos" ──> Evento/Sesion/Ponente/EmpresaParticipante
  (transitorio, transitorio, persistidos — mismo pipeline que ya ejecuta ImportService)
```
