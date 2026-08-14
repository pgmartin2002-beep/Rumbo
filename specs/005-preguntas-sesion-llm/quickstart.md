# Quickstart: Generación de preguntas para sesiones con LLM

**Feature Branch**: `005-preguntas-sesion-llm` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

Guía de validación end-to-end para comprobar las capacidades de generación y regeneración de preguntas con LLM, coexistencia con preguntas manuales y degradación controlada.

---

## Prerrequisitos

- **Node.js**: v20+
- **Dependencias instaladas**: `npm install` desde la raíz del workspace.
- **Variables de entorno (opcional para pruebas con LLM real)**:
  Crear o editar `backend/.env`:
  ```bash
  ANTHROPIC_API_KEY=sk-ant-api03-...
  RUMBO_AI_MODEL=claude-haiku-4-5-20251001
  ```
  *(Si no se define `ANTHROPIC_API_KEY`, el sistema utilizará el adaptador stub determinista en modo test o devolverá 503 en modo producción real, permitiendo validar la degradación controlada).*

---

## Escenario 1: Generar preguntas sugeridas con LLM para una sesión (US1)

**Objetivo**: Verificar que el LLM genera 4 preguntas contextuales (2 generales/estratégicas y 2 técnicas) basadas en el título, tema y ponente de la sesión.

1. **Iniciar el backend y frontend**:
   ```bash
   npm run dev
   ```
2. **Acceder a la aplicación**: Navegar a `http://localhost:5173/` en el navegador (o vista móvil responsive).
3. **Seleccionar un evento y abrir la Agenda**:
   - Abrir un evento que contenga sesiones con tema y ponente (ej. "The AI Trail" con ponente "Retool").
   - Pulsar sobre una sesión para abrir la vista de preguntas (`/eventos/:id/sesiones/:sesionId/preguntas`).
4. **Solicitar generación de preguntas**:
   - Pulsar **"Regenerar preguntas"** (o botón de generación inicial si no hay preguntas).
5. **Resultado esperado**:
   - Se muestran exactamente 4 preguntas sugeridas.
   - 2 preguntas corresponden a enfoque general/estratégico (adopción, valor, impacto).
   - 2 preguntas corresponden a enfoque técnico/profundización (arquitectura, implementación, herramientas).
   - Las preguntas hacen referencia coherente al tema o ponente de la sesión.

---

## Escenario 2: Regenerar preguntas preservando preguntas manuales (US2 & US4)

**Objetivo**: Comprobar que al regenerar las sugerencias con IA, las preguntas manuales creadas por el usuario permanecen inalteradas.

1. **Estando en la vista de preguntas de la sesión**:
   - Escribir una pregunta manual en el área de texto: *"¿Tienen previsto abrir oficinas en España?"*.
   - Pulsar **"Añadir pregunta"**.
   - Comprobar que la pregunta aparece con el indicador **"Tuya"**.
2. **Pulsar "Regenerar preguntas"**:
   - El botón muestra estado de carga temporal ("Regenerando…").
3. **Resultado esperado**:
   - Las 4 preguntas sugeridas anteriores se reemplazan por un nuevo lote de 4 preguntas.
   - La pregunta manual *"¿Tienen previsto abrir oficinas en España?"* sigue presente intacta con su badge **"Tuya"**.
   - Al recargar la página (`F5`), tanto las 4 sugerencias como la manual persisten.

---

## Escenario 3: Degradación controlada sin API Key o ante fallo de red (US3)

**Objetivo**: Garantizar que la aplicación no se bloquea ni genera errores no controlados si el servicio de IA no está disponible, permitiendo siempre la interacción manual.

1. **Simular backend sin clave de IA**:
   - Detener el backend.
   - En `backend/.env`, comentar o vaciar `ANTHROPIC_API_KEY=`.
   - Reiniciar el backend en modo producción normal (`npm run dev:backend`).
2. **Intentar generar preguntas**:
   - Navegar a una sesión y pulsar **"Regenerar preguntas"**.
3. **Resultado esperado**:
   - La aplicación no experimenta un crash ni pantalla blanca.
   - Se muestra un aviso informativo claro de que el servicio de IA no está disponible en este momento.
   - El formulario de texto para **"Añadir tu propia pregunta"** permanece habilitado y permite guardar preguntas manuales con éxito.

---

## Escenario 4: Sesión sin información suficiente (Edge Case)

**Objetivo**: Verificar el tratamiento de sesiones que no tienen título ni tema descriptivo.

1. **Navegar a una sesión sin tema declarado**:
   - Seleccionar una sesión con `tema: null` y título genérico.
   - Pulsar **"Regenerar preguntas"**.
2. **Resultado esperado**:
   - El sistema responde con error 422 (`informacion_insuficiente`).
   - La UI muestra la tarjeta informativa *"No hay información suficiente. Esta sesión no tiene tema suficiente para sugerir preguntas. Escribe las tuyas abajo."*.
   - El usuario puede escribir y guardar preguntas manuales con total normalidad.

---

## Validación Automatizada

Ejecutar la suite de tests unitarios y de integración del backend:

```bash
# Tests unitarios de adaptadores, validadores y servicios de preguntas
npm --prefix backend run test

# Tests de regresión E2E con Playwright (sin requerir red ni clave real)
npm --prefix e2e run test
```
