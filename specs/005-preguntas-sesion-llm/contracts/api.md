# API Contract: Generación de preguntas para sesiones con LLM

**Feature Branch**: `005-preguntas-sesion-llm` | **Date**: 2026-08-14 | **Spec**: [spec.md](../spec.md)

Este documento especifica los contratos HTTP expuestos por el backend de Rumbo para la gestión y generación de preguntas por sesión.

---

## Endpoints

### 1. Listar preguntas de una sesión

Obtiene la lista completa de preguntas preparadas (tanto sugeridas por IA como redactadas a mano) asociadas a una sesión.

- **Método**: `GET`
- **Ruta**: `/api/events/:id/sesiones/:sesionId/preguntas`
- **Autenticación**: Ninguna (MVP monousuario local)

#### Parámetros de Ruta

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | `string` (UUID) | Identificador del evento |
| `sesionId` | `string` (UUID) | Identificador de la sesión |

#### Respuestas

##### 200 OK
Devuelve el listado de preguntas preparadas asociadas a la sesión.

```json
[
  {
    "id": "fea68aaf-82c9-45d8-b1f6-951ab5837607",
    "sesion_id": "8ffd1bb1-4bd5-42ae-aaea-2d7e81c7d9e0",
    "texto": "¿Cuál ha sido el mayor impacto en negocio al desplegar agentes en producción?",
    "tipo": "general",
    "origen": "sugerida",
    "creado_en": "2026-08-14T10:28:46.174Z"
  },
  {
    "id": "6165f11e-6d5b-4f67-b57b-53f6b29d673e",
    "sesion_id": "8ffd1bb1-4bd5-42ae-aaea-2d7e81c7d9e0",
    "texto": "¿Cómo gestionáis el control de latencia y costes en llamadas multi-step a LLMs?",
    "tipo": "tecnica",
    "origen": "sugerida",
    "creado_en": "2026-08-14T10:28:46.174Z"
  },
  {
    "id": "b1a2c3d4-0000-4000-8000-000000000001",
    "sesion_id": "8ffd1bb1-4bd5-42ae-aaea-2d7e81c7d9e0",
    "texto": "¿Tienen vacantes abiertas en el equipo de ingeniería en Madrid?",
    "origen": "manual",
    "creado_en": "2026-08-14T11:00:00.000Z"
  }
]
```

##### 404 Not Found
Si la sesión o el evento no existen.

```json
{
  "codigo": "sesion_no_encontrada",
  "mensaje": "La sesión no existe en este evento"
}
```

---

### 2. Generar / Regenerar preguntas sugeridas con LLM

Invoca el motor de IA en backend para analizar los metadatos de la sesión y generar exactamente 4 preguntas (2 generales y 2 técnicas). Reemplaza cualquier pregunta sugerida previamente en esta sesión, manteniendo intactas las preguntas manuales creadas por el usuario.

- **Método**: `POST`
- **Ruta**: `/api/events/:id/sesiones/:sesionId/preguntas/generar`
- **Autenticación**: Ninguna
- **Cuerpo de la petición**: Vacío

#### Parámetros de Ruta

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | `string` (UUID) | Identificador del evento |
| `sesionId` | `string` (UUID) | Identificador de la sesión |

#### Respuestas

##### 200 OK
Devuelve la lista actualizada de preguntas de la sesión (las 4 nuevas sugeridas más las manuales existentes).

```json
[
  {
    "id": "11111111-2222-3333-4444-555555555551",
    "sesion_id": "8ffd1bb1-4bd5-42ae-aaea-2d7e81c7d9e0",
    "texto": "¿Cuáles son las principales barreras culturales que habéis visto al adoptar este enfoque?",
    "tipo": "general",
    "origen": "sugerida",
    "creado_en": "2026-08-14T12:00:00.000Z"
  },
  {
    "id": "11111111-2222-3333-4444-555555555552",
    "sesion_id": "8ffd1bb1-4bd5-42ae-aaea-2d7e81c7d9e0",
    "texto": "¿Qué métricas recomendáis para medir el ROI de estas iniciativas en los primeros 6 meses?",
    "tipo": "general",
    "origen": "sugerida",
    "creado_en": "2026-08-14T12:00:00.000Z"
  },
  {
    "id": "11111111-2222-3333-4444-555555555553",
    "sesion_id": "8ffd1bb1-4bd5-42ae-aaea-2d7e81c7d9e0",
    "texto": "¿Qué arquitectura de embeddings utilizáis para garantizar baja latencia en búsqueda semántica?",
    "tipo": "tecnica",
    "origen": "sugerida",
    "creado_en": "2026-08-14T12:00:00.000Z"
  },
  {
    "id": "11111111-2222-3333-4444-555555555554",
    "sesion_id": "8ffd1bb1-4bd5-42ae-aaea-2d7e81c7d9e0",
    "texto": "¿Cómo habéis resuelto la consistencia eventual entre el vector store y la base de datos relacional?",
    "tipo": "tecnica",
    "origen": "sugerida",
    "creado_en": "2026-08-14T12:00:00.000Z"
  },
  {
    "id": "b1a2c3d4-0000-4000-8000-000000000001",
    "sesion_id": "8ffd1bb1-4bd5-42ae-aaea-2d7e81c7d9e0",
    "texto": "¿Tienen vacantes abiertas en el equipo de ingeniería en Madrid?",
    "origen": "manual",
    "creado_en": "2026-08-14T11:00:00.000Z"
  }
]
```

##### 404 Not Found
```json
{
  "codigo": "sesion_no_encontrada",
  "mensaje": "La sesión no existe en este evento"
}
```

##### 422 Unprocessable Entity
Si la sesión carece de título y tema/descripción suficientes para contextualizar la generación.
```json
{
  "codigo": "informacion_insuficiente",
  "mensaje": "No hay información suficiente de la sesión para generar preguntas"
}
```

##### 503 Service Unavailable
Si `ANTHROPIC_API_KEY` no está configurada, o la llamada al LLM supera el timeout de 15 segundos, o el proveedor devuelve un error de red/5xx.
```json
{
  "codigo": "servicio_ia_no_disponible",
  "mensaje": "No se pudieron generar preguntas en este momento"
}
```

---

### 3. Añadir pregunta manual a una sesión

Permite al usuario registrar sus propias preguntas preparadas para una sesión, independientemente de la disponibilidad del motor de IA.

- **Método**: `POST`
- **Ruta**: `/api/events/:id/sesiones/:sesionId/preguntas`
- **Autenticación**: Ninguna
- **Cuerpo de la petición**:
```json
{
  "texto": "¿Habéis valorado migrar a modelos open source locales?"
}
```

#### Respuestas

##### 201 Created
```json
{
  "id": "c1d2e3f4-5555-6666-7777-888888888888",
  "sesion_id": "8ffd1bb1-4bd5-42ae-aaea-2d7e81c7d9e0",
  "texto": "¿Habéis valorado migrar a modelos open source locales?",
  "origen": "manual",
  "creado_en": "2026-08-14T12:05:00.000Z"
}
```

##### 400 Bad Request
Si el texto está vacío, excede la longitud máxima o no es un string válido.
```json
{
  "codigo": "texto_invalido",
  "mensaje": "El texto de la pregunta no puede estar vacío"
}
```

##### 404 Not Found
```json
{
  "codigo": "sesion_no_encontrada",
  "mensaje": "La sesión no existe en este evento"
}
```
