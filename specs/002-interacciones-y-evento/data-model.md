# Modelo de datos: Preparar interacciones y vivir el evento

Extiende los tipos de `backend/src/models/index.ts` (feature 001). Las entidades `Evento`,
`Sesion` y `AgendaPersonalizada`/`AgendaItem` se **reutilizan sin cambios** (Principio VII); esta
feature solo añade las tres entidades nuevas de abajo.

## Entidades nuevas

### PreguntaPreparada

Pregunta general o técnica asociada a una sesión (FR-001–FR-004).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `UUID` | |
| `sesion_id` | `UUID` | FK a `Sesion` |
| `texto` | `string` | No vacío |
| `origen` | `'sugerida' \| 'manual'` | `'sugerida'` = generada por el adaptador; `'manual'` = escrita por el usuario |
| `creado_en` | `ISODateTime` | |

**Reglas de validación**:
- `texto` no puede estar vacío ni ser solo espacios (`pregunta_invalida`, 400).
- `sesion_id` debe existir y pertenecer al mismo evento de la URL (`sesion_no_encontrada`, 404).

**Ciclo de vida**: al pedir "regenerar" (FR-002) se borran las preguntas `origen: 'sugerida'` de esa
sesión y se insertan las nuevas; las `origen: 'manual'` nunca se borran automáticamente (FR-003:
"junto a las sugeridas").

### Nota

Anotación de texto o voz transcrita (FR-008–FR-010, FR-013).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `UUID` | |
| `evento_id` | `UUID` | FK a `Evento` |
| `sesion_id` | `UUID \| null` | `null` = vinculada al evento en general (hueco entre sesiones) |
| `contenido` | `string` | Texto (tecleado o transcrito) |
| `origen` | `'texto' \| 'voz'` | |
| `estado_transcripcion` | `'pendiente' \| 'completada' \| null` | `null` si `origen: 'texto'`; `'pendiente'` mientras el audio capturado offline espera conexión para transcribirse (R3/R6 de research.md) |
| `creado_en` | `ISODateTime` | |
| `actualizado_en` | `ISODateTime` | |

**Reglas de validación**:
- `contenido` no vacío cuando `origen: 'texto'` o cuando `estado_transcripcion: 'completada'`
  (`contenido_vacio`, 400).
- `sesion_id`, si no es `null`, debe existir y pertenecer al mismo `evento_id` (`sesion_no_encontrada`, 404).

**Transiciones de estado** (solo para notas de voz): `pendiente → completada` cuando el backend
recibe el audio y el adaptador de transcripción devuelve texto; si el adaptador no puede transcribir
de forma fiable, la nota permanece con `contenido` editable a mano por el usuario (caso límite
abierto en la spec, sin bloquear la nota).

**Reasignación manual** (aclaración de sesión 2026-08-12): una nota con `sesion_id: null` puede
recibir un `PATCH` que le asigne cualquier `sesion_id` de una sesión del mismo evento.

### Contacto

Persona registrada durante el evento (FR-011–FR-012, FR-015–FR-016).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `UUID` | |
| `evento_id` | `UUID` | FK a `Evento` |
| `sesion_id` | `UUID \| null` | `null` = conocido sin sesión activa |
| `nombre` | `string` | **Obligatorio** (único campo obligatorio, aclaración de sesión 2026-08-12) |
| `nota` | `string \| null` | Opcional; se puede añadir o completar después |
| `creado_en` | `ISODateTime` | |
| `actualizado_en` | `ISODateTime` | |

**Reglas de validación**:
- `nombre` no vacío ni solo espacios (`nombre_requerido`, 400).
- `sesion_id`, si no es `null`, debe existir y pertenecer al mismo `evento_id` (`sesion_no_encontrada`, 404).

**Posibles duplicados**: no es un campo persistido. Se calcula al crear o listar contactos,
comparando `nombre` contra el resto de contactos del mismo `evento_id` con el algoritmo de
`research.md` R4. La API expone el resultado como `posibles_duplicados: {id, nombre}[]` en la
respuesta de creación (y opcionalmente en el listado), nunca bloqueando el guardado.

**Fusión** (FR-016): combina dos contactos del mismo evento en uno.
- `nombre` resultante = el del contacto "destino" (el que se conserva).
- `nota` resultante = concatenación de ambas notas no vacías (separadas por salto de línea) si
  ambas existen; si solo una existe, esa.
- `sesion_id` resultante = el del contacto destino.
- El contacto "origen" se elimina tras la fusión.

## Relaciones

```text
Evento 1──* Sesion                (reutilizada de 001)
Evento 1──1 AgendaPersonalizada    (reutilizada de 001)
Sesion  1──* PreguntaPreparada     (nueva)
Evento  1──* Nota                  (nueva) ── Nota *──1 Sesion (opcional)
Evento  1──* Contacto              (nueva) ── Contacto *──1 Sesion (opcional)
```

## Estado solo-cliente (no persistido en backend)

Vive en IndexedDB del navegador (`frontend/src/services/offline-store.ts`, ver research.md R6):

- **Cola de pendientes**: notas/contactos creados offline, con su `id` generado en cliente, a la
  espera de `POST` cuando vuelva la conexión.
- **Agenda cacheada**: última `AgendaVista` obtenida con éxito, usada por el modo simplificado
  (research.md R5) para funcionar sin red.
- **Audio pendiente de transcripción**: `Blob` de una nota de voz capturada offline, hasta poder
  enviarlo al backend.

Estos datos no forman parte del contrato de la API (`contracts/api.md`) porque nunca se leen ni
escriben directamente desde el backend; solo determinan qué y cuándo el cliente llama a la API.
