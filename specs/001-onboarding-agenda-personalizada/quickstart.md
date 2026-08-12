# Quickstart · Validación de la Feature 001

Guía para validar de extremo a extremo que la feature "Onboarding + Agenda personalizada"
funciona. No contiene código de implementación; los detalles viven en `tasks.md` y en el código.

## Prerrequisitos

- Node.js 20+, npm.
- **Sin base de datos**: la persistencia del MVP usa ficheros JSON en un directorio de datos del
  backend (se crea solo al arrancar).
- Variables de entorno del backend para el motor de extracción y el proveedor de mapas
  (credenciales fuera de alcance de esta spec; en desarrollo se usan adaptadores mock).

## Puesta en marcha (esperada tras la implementación)

```bash
# Backend (BFF)
cd backend && npm install && npm run dev      # expone /api en localhost

# Frontend (PWA)
cd frontend && npm install && npm run dev      # sirve la PWA en localhost
```

## Escenarios de validación (mapeados a criterios de éxito)

Cada escenario corresponde a historias de usuario y criterios de la spec. Se automatizan con
Playwright (E2E) y pruebas de contrato del BFF.

### 1. Importar un evento (Historia 1 · SC-001, SC-002)
- Importar un evento por URL/PDF/calendario.
- **Esperado**: se muestran fecha y ubicación; los campos no extraídos aparecen marcados como
  faltantes y son editables. Una fuente ilegible lleva al estado `illegible-card`, no a un error
  bloqueante.

### 2. Definir objetivos (Historia 2 · SC-003)
- Seleccionar uno o varios objetivos y guardarlos.
- **Esperado**: el perfil queda asociado al evento en < 1 min; se pueden modificar después.

### 3. Generar agenda priorizada (Historia 3 · SC-004, SC-005)
- Con evento y objetivos, generar la agenda.
- **Esperado**: cada sesión queda clasificada (imprescindible/opcional/descartable) con motivo;
  los conflictos de horario se señalan; disponible en < 3 min desde la importación.

### 4. Recalcular agenda con confirmación (Historia 3 · FR-015 · Principio IV)
- Cambiar objetivos con una agenda ya generada.
- **Esperado**: la app muestra una propuesta (`agenda-diff-card`) con "Aplicar" / "Mantener"; la
  agenda **solo** cambia si el usuario confirma. Sin confirmación, permanece igual.

### 5. Logística y hora de salida (Historia 4 · SC-006, SC-007)
- Indicar un origen y pedir la ruta.
- **Esperado**: se muestra la hora de salida recomendada (con ≥30 min de margen), opciones de
  transporte y, en coche, aparcamiento. Un aviso de tráfico propone nueva salida y **solo** la
  aplica tras confirmar (`alert-card`, FR-022).

### 6. Mis eventos (Historia 5 · SC-008, SC-009)
- Abrir la app con 0, 1 y varios eventos en distintos estados.
- **Esperado**: sin eventos → estado de bienvenida; con eventos → el "en curso" destacado
  primero; seleccionar un evento a medio configurar lleva al paso pendiente correcto.

## Comprobaciones de conformidad con la constitución

- **Principio IV**: verificar que NINGÚN cambio de agenda ni de hora de salida se aplica sin una
  acción explícita de confirmación (escenarios 4 y 5).
- **Principio VI**: verificar (en pruebas de red) que el frontend solo llama a `/api/*` y nunca a
  dominios externos de extracción o mapas.
- **Principio VIII**: verificar estados de carga/error visibles y que cada sesión/ruta/alerta
  referencia su evento.
