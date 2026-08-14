# Research: Generación de preguntas para sesiones con LLM

**Feature Branch**: `005-preguntas-sesion-llm` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

Este documento consolida las decisiones de diseño técnico y la resolución de incertidumbres para la integración del motor LLM (Anthropic Claude) en la generación de preguntas de sesión en Rumbo (Actividad 3: "Preparar las interacciones").

---

## R1: Integración con Anthropic Claude SDK y Estructuración vía Tool Use

### Pregunta de investigación
¿Cómo invocar al LLM de forma fiable para garantizar que devuelve exactamente 4 preguntas estructuradas con texto y tipo (`general` o `tecnica`) sin riesgo de respuestas desestructuradas o texto conversacional no parseable?

### Decisión
Utilizar la API de mensajes de Anthropic (`@anthropic-ai/sdk`) con el mecanismo de *tool use* forzado (`tool_choice: { type: 'tool', name: 'generar_preguntas' }`), análogo al patrón establecido en la feature 003 (`registrar_evento`).

El esquema de la herramienta define:
- `preguntas`: Array con exactamente 4 elementos (`minItems: 4`, `maxItems: 4`).
- Cada elemento contiene:
  - `texto`: string no vacío con la formulación directa de la pregunta.
  - `tipo`: string con enum `["general", "tecnica"]`.

### Rationale
- Elimina la necesidad de parsear Markdown o lidiar con bloques de texto adicionales ("Aquí tienes tus preguntas...").
- Permite validación estricta de esquema antes de persistir o devolver los datos (FR-008).
- Es el estándar probado en el proyecto (feature 003), reduciendo deuda técnica y manteniendo consistencia.

### Alternativas consideradas
1. **Salida en texto libre / Markdown**: Requiere expresiones regulares o parsers frágiles; susceptible a cambios de formato entre versiones del modelo. Descartado.
2. **JSON en el cuerpo del mensaje (modo texto)**: Propenso a errores de escape y truncado si el modelo no cierra las llaves JSON. Descartado frente a la robustez de *tool use*.

---

## R2: Enriquecimiento del Contexto para el Prompt

### Pregunta de investigación
¿Qué información de la sesión y del evento debe incluirse en el prompt para que el LLM formule preguntas relevantes, contextualizadas y útiles para el asistente?

### Decisión
Construir un objeto estructurado `ContextoGeneracionPreguntas` que consolida:
1. **Título de la sesión** (`sesion.titulo`): Requerido.
2. **Tema o descripción** (`sesion.tema`): Si está presente, aporta el núcleo temático.
3. **Nombre del evento** (`evento.nombre`): Proporciona el marco general (ej. conferencia técnica vs negocio).
4. **Ponentes y empresas** (`ponentes: [{ nombre, empresa }]`): Resueltos a partir de `sesion.ponente_ids` y `repos.ponentes`.
5. **Objetivos del usuario** (`objetivos: Objetivo[]`): Obtenidos de `repos.perfiles_objetivos` para el `evento_id` (ej. `aprender`, `networking`, `inversores`).

El prompt de sistema instruye al modelo a actuar como un asistente de conferencias de alto nivel, generando preguntas directas y profesionales.

### Rationale
- Cumple con FR-003 y con la aclaración de la sesión 2026-08-14.
- Incorporar ponentes y empresas permite generar preguntas con referencias directas al trabajo u organización del ponente cuando aporte valor.
- Integrar los objetivos del usuario orienta sutilmente el enfoque sin desvirtuar la sesión.

### Alternativas consideradas
1. **Pasar únicamente el título y tema**: Pierde el contexto del ponente y el evento, produciendo preguntas genéricas. Descartado.
2. **Inyectar el programa completo del evento**: Excesivo consumo de tokens e irrelevante para una sesión individual. Descartado.

---

## R3: Categorización y Balance de Preguntas (2 Generales + 2 Técnicas)

### Pregunta de investigación
¿Cómo asegurar el cumplimiento del requisito FR-004 de generar exactamente 4 preguntas (2 generales/estratégicas y 2 técnicas/de profundización)?

### Decisión
1. En el **System Prompt**: Se especifica de manera explícita la regla de balance:
   - 2 preguntas de tipo `general` (visión estratégica, impacto de negocio, adopción organizativa, tendencias).
   - 2 preguntas de tipo `tecnica` (arquitectura, retos de implementación, dependencias, buenas prácticas, tooling).
2. En la **validación de backend** (`esPreguntasGeneradasValidas`): Se valida que el array contenga exactamente 4 preguntas y que la distribución contenga al menos una general y una técnica (idealmente 2 y 2; si el modelo devuelve una distribución ligeramente distinta pero válida, el sanea/garantiza las 4 o rechaza si es corrupto).

### Rationale
- 4 preguntas es el número óptimo para lectura ágil en pantalla móvil sin scroll excesivo (Principio VIII).
- La división en 2 categorías cubre tanto el networking/interés general como el rigor técnico en el Q&A.

### Alternativas consideradas
1. **Número variable de preguntas (ej. 3 a 6)**: Dificulta la previsibilidad de la UI móvil y la consistencia en pruebas. Descartado.
2. **Sin distinción de categorías**: Hace que las preguntas tiendan a ser todas superficiales o todas hiper-específicas. Descartado.

---

## R4: Gestión de Tiempos Límite (Timeout 15s) y Señales de Cancelación

### Pregunta de investigación
¿Cómo implementar el límite de tiempo de 15 segundos requerido por FR-007 y SC-002 sin dejar operaciones colgadas en el servidor?

### Decisión
Utilizar `AbortSignal.timeout(15_000)` en la llamada del cliente Anthropic:
```typescript
const TIMEOUT_GENERACION_MS = 15_000;

const respuesta = await this.client.messages.create(
  {
    model: this.modelo,
    max_tokens: 1_024,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    tools: [GENERAR_PREGUNTAS_TOOL],
    tool_choice: { type: 'tool', name: 'generar_preguntas' },
    messages: [{ role: 'user', content: promptUsuario }],
  },
  { signal: AbortSignal.timeout(TIMEOUT_GENERACION_MS) },
);
```
Si se produce un aborto por timeout o error de red, la excepción se captura en el adaptador y se transforma en un error tipado o resultado nulo controlado.

### Rationale
- `AbortSignal.timeout` es nativo en Node 20+ y compatible con el SDK de Anthropic.
- 15 segundos es un margen generoso para inferencia de ~200 tokens con Claude 3.5 Haiku, evitando timeouts espurios en conexiones móviles inestables.
- 1.024 max_tokens es suficiente para 4 preguntas concisas y reduce la latencia de respuesta.

### Alternativas consideradas
1. **Timeout manual con `Promise.race`**: No cancela la conexión HTTP subyacente con la API de Anthropic, desperdiciando recursos. Descartado frente a `AbortSignal`.

---

## R5: Resiliencia, Fallbacks y Degradación Controlada

### Pregunta de investigación
¿Qué debe ocurrir cuando no hay API key configurada, falla la conexión o el servicio de IA no responde (FR-009, Principio VIII)?

### Decisión
1. **Falta de API Key o error del LLM**:
   - Si `ANTHROPIC_API_KEY` no está definida en el entorno, `crearGeneradorPreguntasIA()` devuelve `null`.
   - En `QuestionsService`, si no hay motor IA disponible o si la llamada al LLM falla (timeout, 5xx, rate limit), se lanza un `ApiError(503, 'servicio_ia_no_disponible', 'No se pudieron generar preguntas en este momento')`.
   - Si la sesión no tiene título ni tema suficiente, se lanza `ApiError(422, 'informacion_insuficiente', 'No hay información suficiente de la sesión para generar preguntas')` (manteniendo el comportamiento de la feature 002).
2. **Frontend**:
   - `SessionQuestions.tsx` captura `servicio_ia_no_disponible` y muestra un mensaje informativo ("No se pudieron sugerir preguntas automáticamente. Puedes redactar las tuyas a continuación.") sin bloquear la pantalla ni ocultar las preguntas manuales.
   - El formulario manual permanece siempre accesible y funcional (FR-010).

### Rationale
- Protege la experiencia del usuario en situaciones de mala conectividad o incidencias del proveedor de IA (Principio VIII).
- Distingue claramente entre un problema de datos de la sesión (422) y un problema de conectividad/servicio de IA (503).

### Alternativas consideradas
1. **Fallback silencioso a preguntas stub estáticas**: Confuso para el usuario si espera IA contextual y recibe plantillas rígidas sin saber qué ha ocurrido. Descartado.
2. **Bloquear la pantalla con un error fatal**: Viola el Principio VIII y la independencia de notas y preguntas manuales. Descartado.

---

## R6: Arquitectura de Adaptadores e Inyección para Pruebas Deterministas

### Pregunta de investigación
¿Cómo diseñar el adaptador de generación de preguntas para que las pruebas unitarias y suites E2E se ejecuten de forma rápida, determinista y sin depender de credenciales reales de IA (FR-012, SC-004)?

### Decisión
Definir una interfaz limpia `QuestionGenerationAdapter` e implementar:
1. `AnthropicQuestionGenerationAdapter`: Adaptador real que invoca el SDK de Anthropic con tool use y timeout.
2. `StubQuestionGenerationAdapter`: Adaptador determinista que genera 4 preguntas contextuales basadas en el título/tema sin tocar red.
3. `CompositeQuestionGenerationAdapter` (o selección en `createContext`):
   - En entorno normal con API key: instancia `AnthropicQuestionGenerationAdapter`.
   - En entorno de tests (cuando `process.env.NODE_ENV === 'test'` o no hay API key): utiliza `StubQuestionGenerationAdapter`.

### Rationale
- Permite que `npm test` y los tests E2E de Playwright se ejecuten en CI de forma 100% determinista y gratuita.
- Aísla la lógica del SDK en la capa `integrations/`, cumpliendo el Principio VI.

### Alternativas consideradas
1. **Mockear la red con MSW / nock en tests**: Añade dependencias y complejidad cuando la inyección de dependencias ya existe en el contenedor `AppContext`. Descartado.

---

## R7: Evolución del Modelo de Datos (`tipo` en `PreguntaPreparada`)

### Pregunta de investigación
¿Cómo persistir las preguntas generadas respetando el modelo existente de la feature 002 y añadiendo la categorización requerida por FR-004/FR-008?

### Decisión
Extender `PreguntaPreparada` en `backend/src/models/index.ts` y `frontend/src/services/types.ts` con un campo opcional `tipo`:
```typescript
export type TipoPregunta = 'general' | 'tecnica';
export type OrigenPregunta = 'sugerida' | 'manual';

export interface PreguntaPreparada {
  id: UUID;
  sesion_id: UUID;
  texto: string;
  tipo?: TipoPregunta; // 'general' | 'tecnica' para sugeridas; undefined/opcional para manuales o legadas
  origen: OrigenPregunta;
  creado_en: ISODateTime;
}
```

### Rationale
- El campo `tipo?: TipoPregunta` es 100% retrocompatible con los registros existentes en `backend/data/preguntas.json`.
- Permite mostrar etiquetas o clasificaciones en la UI si se desea, enriqueciendo la experiencia sin romper la persistencia (Principio VII).
- Las preguntas manuales creadas por el usuario no están obligadas a tener `tipo`.

### Alternativas consideradas
1. **Crear una nueva tabla/colección `preguntas_ia.json`**: Fragmentaría el almacenamiento de preguntas y complicaría las consultas por sesión. Descartado.

---

## R8: Experiencia de Usuario Móvil y Manejo de Estados en Frontend

### Pregunta de investigación
¿Qué mejoras visuales o de interacción en `SessionQuestions.tsx` son necesarias para reflejar el origen, categoría y estados de error del LLM sin sobrecargar la pantalla móvil?

### Decisión
1. Mantener los botones de acción ("Regenerar preguntas" y "Añadir pregunta manual").
2. Mostrar un indicador de carga claro ("Generando preguntas con IA…") durante la petición.
3. Mostrar las preguntas sugeridas con un badge sutil según su tipo (`Estratégica` / `Técnica`) o el badge existente `Sugerida`, distinguiéndolas claramente de las preguntas `Tuya` (manuales).
4. Ante error 503 (`servicio_ia_no_disponible`), mostrar una tarjeta informativa discreta que indique que el servicio de IA no está disponible temporalmente pero que se pueden escribir preguntas a mano.

### Rationale
- Cumple el Principio III (Identidad de Diseño Rumbo) y Principio VIII (Calidad Mínima de Experiencia Móvil).
- No bloquea al usuario y ofrece retroalimentación inmediata.
