# Data Model: Generación de preguntas para sesiones con LLM

**Feature Branch**: `005-preguntas-sesion-llm` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

Este documento describe el modelo de datos para la generación y persistencia de preguntas de sesión enriquecidas con LLM (Actividad 3: "Preparar las interacciones").

---

## 1. Entidades de Dominio Persistidas

### `PreguntaPreparada` (Extensión del modelo de 002)

Representa una pregunta asociada a una sesión de un evento, ya sea generada automáticamente por IA o redactada manualmente por el usuario.

| Campo | Tipo | Requerido | Descripción | Reglas de Validación |
|---|---|---|---|---|
| `id` | `UUID` (string) | Sí | Identificador único de la pregunta | Formato UUID v4 |
| `sesion_id` | `UUID` (string) | Sí | Referencia a la sesión a la que pertenece | Debe existir en `sesiones.json` |
| `texto` | `string` | Sí | Texto formulado de la pregunta | No vacío, longitud entre 3 y 500 caracteres |
| `tipo` | `TipoPregunta` | No | Categorización de la pregunta (`general` o `tecnica`) | Enum: `'general' \| 'tecnica'`. Las preguntas manuales o migradas pueden ser `undefined` |
| `origen` | `OrigenPregunta` | Sí | Origen de creación de la pregunta | Enum: `'sugerida' \| 'manual'` |
| `creado_en` | `ISODateTime` (string) | Sí | Fecha y hora de creación en formato ISO 8601 | Fecha ISO 8601 válida con zona horaria |

#### Enums

```typescript
export type TipoPregunta = 'general' | 'tecnica';
export type OrigenPregunta = 'sugerida' | 'manual';
```

#### Almacenamiento
- Fichero: `backend/data/preguntas.json`
- Operaciones soportadas por el repositorio: `list`, `findById`, `findBy`, `create`, `delete`.

---

## 2. Estructuras Transitorias de Generación con IA (In-Memory)

Estas estructuras no se persisten directamente en disco; se utilizan durante el ciclo de vida de la petición de generación.

### `ContextoGeneracionPreguntas`

Agrupa los datos recopilados de la sesión, los ponentes y el evento para contextualizar el prompt del LLM.

```typescript
export interface ContextoGeneracionPreguntas {
  eventoNombre: string | null;
  sesionTitulo: string;
  sesionTema: string | null;
  ponentes: {
    nombre: string;
    empresa: string | null;
  }[];
  objetivosUsuario: string[];
}
```

### `PreguntaGenerada`

Representa una pregunta individual devuelta y validada por el motor de IA.

```typescript
export interface PreguntaGenerada {
  texto: string;
  tipo: TipoPregunta;
}
```

### `RespuestaGeneracionTool`

Esquema de entrada para el *tool use* de Anthropic (`generar_preguntas`).

```typescript
export interface RespuestaGeneracionTool {
  preguntas: PreguntaGenerada[];
}
```

---

## 3. Reglas de Validación y Estados

### Reglas de Validación de Preguntas Generadas (`esPreguntasGeneradasValidas`)

1. El objeto debe contener un array `preguntas`.
2. El array `preguntas` debe contener exactamente 4 elementos (`minItems: 4`, `maxItems: 4`).
3. Cada elemento debe ser un objeto con:
   - `texto`: string no vacío (trim > 0).
   - `tipo`: exactamente `'general'` o `'tecnica'`.
4. El conjunto debe contener al menos 1 pregunta de tipo `'general'` y 1 de tipo `'tecnica'` (el prompt instruye explícitamente a producir 2 y 2).

### Transiciones de Estado y Regeneración

```
[Sin preguntas sugeridas]
       │
       ▼ (POST /preguntas/generar)
[4 Preguntas Sugeridas (2 generales + 2 técnicas)]
       │
       ├─► (POST /preguntas/generar - "Regenerar")
       │   └─► Borra las 4 sugeridas anteriores
       │   └─► Inserta las 4 nuevas sugeridas
       │   └─► PRESERVA intactas las preguntas con origen='manual'
       │
       └─► (POST /preguntas - "Añadir manual")
           └─► Inserta nueva pregunta con origen='manual'
           └─► PRESERVA las preguntas sugeridas existentes
```

---

## 4. Retrocompatibilidad y Migración de Datos

- Los registros existentes en `backend/data/preguntas.json` sin campo `tipo` son completamente válidos (el campo es opcional en la interfaz `PreguntaPreparada`).
- Cuando se invoque la regeneración sobre una sesión existente con preguntas generadas en versiones anteriores, las nuevas preguntas generadas incluirán el atributo `tipo`.
- Ninguna pregunta manual (`origen === 'manual'`) es afectada por la adición de este campo ni por operaciones de regeneración.
