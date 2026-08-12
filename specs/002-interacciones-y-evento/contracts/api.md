# Contrato de API: Preparar interacciones y vivir el evento

Extiende `backend/src/api/error-handler.ts` (feature 001): todo error de negocio responde con el
mismo formato único:

```json
{ "error": "<codigo>", "mensaje": "<texto legible>" }
```

El cliente (PWA) es el único consumidor de estos endpoints (Principio VI); nunca llama directamente
a un motor de generación de preguntas ni de transcripción de voz.

## Preguntas preparadas (FR-001–FR-004)

### `GET /api/events/:id/sesiones/:sesionId/preguntas`

Lista las preguntas (sugeridas + manuales) de una sesión.

- **200**: `PreguntaPreparada[]`
- **404** `sesion_no_encontrada`: la sesión no existe o no pertenece al evento.

### `POST /api/events/:id/sesiones/:sesionId/preguntas/generar`

(Re)genera las preguntas sugeridas de la sesión a partir de `tema` y `ponentes` (llama al
`QuestionGenerationAdapter`, ver research.md R2). Borra las anteriores `origen: 'sugerida'` de esa
sesión; conserva las `origen: 'manual'`.

- **200**: `PreguntaPreparada[]` (la lista completa tras regenerar)
- **422** `informacion_insuficiente`: la sesión no tiene `tema` suficiente para generar preguntas
  (FR-004). El cliente debe entonces ofrecer la creación manual.
- **404** `sesion_no_encontrada`.

### `POST /api/events/:id/sesiones/:sesionId/preguntas`

Añade una pregunta manual.

- **Body**: `{ "texto": string }`
- **201**: `PreguntaPreparada` (con `origen: 'manual'`)
- **400** `pregunta_invalida`: `texto` vacío.
- **404** `sesion_no_encontrada`.

## Notas (FR-008–FR-010, FR-013–FR-014, FR-017)

### `GET /api/events/:id/notas`

Lista todas las notas del evento, ordenadas por `creado_en` descendente.

- **200**: `Nota[]`

### `POST /api/events/:id/notas`

Crea una nota. El cliente envía el `sesion_id` que ya está mostrando (ver research.md R7); el
backend no lo recalcula.

- **Body** (texto): `{ "sesion_id": string | null, "origen": "texto", "contenido": string }`
- **Body** (voz): `{ "sesion_id": string | null, "origen": "voz", "audio": string }` — `audio` es el
  payload de audio (p. ej. base64); requiere conexión (FR-017), el cliente solo llama a esta ruta
  cuando está online.
- **201**: `Nota` (para voz, con `contenido` ya transcrito y `estado_transcripcion: 'completada'`)
- **400** `contenido_vacio`: nota de texto sin contenido.
- **404** `sesion_no_encontrada`: `sesion_id` no nulo pero inexistente en el evento.
- **422** `transcripcion_no_fiable`: el adaptador de voz no pudo transcribir con confianza; la nota
  se guarda igualmente con `contenido: ""` y `estado_transcripcion: 'pendiente'` para que el usuario
  la complete a mano (caso límite abierto en la spec).

### `PATCH /api/events/:id/notas/:notaId`

Edita el contenido y/o reasigna la sesión de una nota ya creada (FR-010, reasignación manual de la
aclaración de sesión 2026-08-12).

- **Body**: `{ "contenido"?: string, "sesion_id"?: string | null }`
- **200**: `Nota` actualizada
- **400** `contenido_vacio`.
- **404** `nota_no_encontrada` | `sesion_no_encontrada`.

### `DELETE /api/events/:id/notas/:notaId`

- **204**
- **404** `nota_no_encontrada`.

## Contactos (FR-011–FR-012, FR-014–FR-016)

### `GET /api/events/:id/contactos`

Lista todos los contactos del evento.

- **200**: `Contacto[]`

### `POST /api/events/:id/contactos`

Registra un contacto. Solo `nombre` es obligatorio (aclaración de sesión 2026-08-12).

- **Body**: `{ "sesion_id": string | null, "nombre": string, "nota"?: string }`
- **201**: `{ "contacto": Contacto, "posibles_duplicados": { "id": string, "nombre": string }[] }`
  — `posibles_duplicados` puede ser `[]`; el contacto se crea siempre, avisar de duplicados no
  bloquea el guardado (FR-016).
- **400** `nombre_requerido`.
- **404** `sesion_no_encontrada`.

### `PATCH /api/events/:id/contactos/:contactoId`

Edita nombre y/o nota de un contacto (FR-015).

- **Body**: `{ "nombre"?: string, "nota"?: string | null }`
- **200**: `Contacto` actualizado
- **400** `nombre_requerido`: si se envía `nombre` vacío.
- **404** `contacto_no_encontrado`.

### `POST /api/events/:id/contactos/:contactoId/fusionar`

Fusiona `contactoId` (destino, se conserva) con `con_id` (origen, se elimina) tras la confirmación
explícita del usuario en el cliente (Principio IV; regla de fusión en data-model.md).

- **Body**: `{ "con_id": string }`
- **200**: `Contacto` resultante (fusionado)
- **404** `contacto_no_encontrado`: `contactoId` o `con_id` no existen en el evento.

## Modo simplificado (FR-005–FR-007, FR-018)

No hay endpoint nuevo: se calcula en el cliente sobre `GET /api/events/:id/agenda` ya existente
(feature 001), ver research.md R5. Esta feature no añade contrato de API para este punto.
