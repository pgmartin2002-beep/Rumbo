# Contrato de API · Cliente ↔ BFF (Feature 001)

Contrato que el backend (BFF) expone al frontend PWA. El cliente **solo** habla con estos
endpoints; nunca con servicios externos (Principio VI). Formato JSON. Autenticación de usuario
asumida (fuera de alcance de esta spec). Todas las rutas van bajo `/api`.

Los detalles internos de orquestación e integración (motor de extracción, proveedor de mapas)
NO forman parte de este contrato: se especifican en specs de backend/integración (Principio V).

## Mis eventos (Historia 5)

### `GET /api/events`
Lista los eventos del usuario para la home. (FR-023, FR-024, FR-025, FR-026)
- **200** → `Event[]` con `estado_derivado` (en_curso|proximo|cerrado) y `progreso_onboarding`.
  Cada evento en curso incluye referencia a la actividad actual (dependencia con spec 002; en la
  001 puede venir `null`).
- Lista vacía → `[]` (el cliente muestra el estado de bienvenida, FR-029).

### `GET /api/events/{id}`
Devuelve el evento y su punto de retorno (objetivos pendientes / agenda lista). (FR-028)
- **200** → `EventDetail` · **404** si no existe.

## Importar evento (Historia 1)

### `POST /api/events/import`
Crea un evento a partir de una fuente. (FR-001–FR-006)
- **Body**: `{ "fuente": "url|pdf|imagen|calendario|correo|qr|buscador", "payload": <url|base64|texto> }`
- **201** → `EventDraft` con campos extraídos y `campos_faltantes: string[]` (FR-007).
- **422** → `{ "error": "fuente_ilegible" }` cuando no se reconoce (estado `illegible-card`).

### `PATCH /api/events/{id}`
Completa o corrige manualmente datos del evento. (FR-008)
- **Body**: campos parciales del evento · **200** → `Event`.

## Objetivos (Historia 2)

### `PUT /api/events/{id}/goals`
Define o modifica los objetivos del evento. (FR-009, FR-010, FR-011)
- **Body**: `{ "objetivos": ["aprender", "networking", ...] }` (≥1, selección múltiple).
- **200** → `GoalProfile`.
- Si existe agenda, la respuesta incluye `agenda_recalculo_disponible: true` (NO recalcula aún).

## Agenda (Historia 3)

### `POST /api/events/{id}/agenda`
Genera la agenda priorizada según los objetivos. (FR-012, FR-013, FR-014)
- **200** → `Agenda` con items clasificados (imprescindible|opcional|descartable), motivo y
  conflictos señalados.
- **409** → `{ "error": "sin_objetivos" }` si no hay objetivos definidos (FR-009).

### `GET /api/events/{id}/agenda/recalculo`
Devuelve la **propuesta** de agenda recalculada como diff, sin aplicarla. (FR-015, Principio IV)
- **200** → `AgendaDiff` (sesiones que suben/bajan/entran). El cliente la muestra en
  `agenda-diff-card`.

### `POST /api/events/{id}/agenda/aplicar`
Aplica la propuesta **solo tras confirmación explícita** del usuario. (FR-015, Principio IV)
- **200** → `Agenda` actualizada.

## Logística (Historia 4)

### `POST /api/events/{id}/route`
Calcula ruta y hora de salida recomendada. (FR-016–FR-020)
- **Body**: `{ "origen": "...", "medio": "publico|coche|a_pie" }`
- **200** → `Route` (hora_salida_recomendada, duración, opciones de transporte; si `coche`,
  incluye `parking[]`, FR-019) + `avisos_desplazamiento[]` cuando el hueco entre sesiones es
  insuficiente (FR-020).

### `GET /api/events/{id}/alerts`
Alertas logísticas activas (tráfico, retraso, cambio de ubicación). (FR-021)
- **200** → `Alert[]`; cada alerta con `propuesta_hora_salida` cuando aplica.

### `POST /api/events/{id}/route/confirmar`
Confirma una nueva hora de salida propuesta. (FR-022, Principio IV)
- **Body**: `{ "alerta_id": "..." }` · **200** → `Route` con `estado: "confirmada"`.
- Sin esta llamada, la ruta NO cambia (no hay actualización automática silenciosa).

## Convenciones de error y estados

- Errores → `{ "error": "<código>", "mensaje": "<texto legible>" }`.
- El cliente DEBE mostrar estados de carga y error visibles en cada operación (Principio VIII):
  importación en curso, generación de agenda, cálculo de ruta.
