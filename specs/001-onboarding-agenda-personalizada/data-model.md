# Phase 1 · Data Model: Onboarding y Agenda personalizada (001)

Modelo derivado de las "Entidades clave" de `spec.md`. Todas las entidades pertenecen a un
usuario y, salvo el propio Evento, se vinculan a un Evento para garantizar trazabilidad
(Principio VIII).

> **Persistencia (MVP)**: se guarda en **ficheros JSON** tras una capa de repositorio (ver
> `research.md` §3). Las "FK" indicadas abajo son referencias por `id` entre ficheros; la
> integridad la garantiza el repositorio, no un motor SQL. La interfaz de repositorio permite
> migrar a una base de datos más adelante sin cambiar el modelo.

## Entidades

### Evento
El evento o challenge importado.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| nombre | string | requerido |
| fecha_inicio / fecha_fin | datetime | requeridas para clasificar estado |
| ubicacion | string \| null | señalada como faltante si null (FR-007) |
| requisitos_acceso | string \| null | opcional |
| fuente_importacion | enum(url, pdf, imagen, calendario, correo, qr, buscador) | requerido (FR-001–FR-005) |
| progreso_onboarding | enum(importado, objetivos_definidos, agenda_generada) | derivado |
| creado_en / actualizado_en | datetime | auditoría |

- **Estado derivado** (no persistido): `en_curso` / `proximo` / `cerrado`, calculado comparando
  fechas con el momento actual (FR-024).
- **Relaciones**: 1—* Sesión, 1—* Empresa participante, 1—1 Perfil de objetivos, 1—1 Agenda
  personalizada, 1—* Ruta, 1—* Alerta logística.

### Sesión
Charla, taller o actividad dentro del evento.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| evento_id | UUID | FK → Evento |
| titulo | string | requerido |
| inicio / fin | datetime | requeridos para detectar conflictos |
| sala | string \| null | usado por logística de desplazamiento |
| tema | string \| null | insumo para priorización y (spec 002) preguntas |

- **Relaciones**: *—* Ponente; puede solaparse con otras sesiones (conflicto de horario, FR-014).

### Ponente
Persona que participa en una o varias sesiones.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| nombre | string | requerido |
| empresa | string \| null | opcional |

- **Relaciones**: *—* Sesión (tabla puente `sesion_ponente`).

### Empresa participante
Organización presente en el evento.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| evento_id | UUID | FK → Evento |
| nombre | string | requerido |
| rol | enum(ponente, patrocinador, expositor) \| null | opcional |

### Perfil de objetivos
Objetivos que el usuario declara para un evento (Principio: objetivos por evento, no globales).

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| evento_id | UUID | FK → Evento (1—1) |
| objetivos | enum[]{aprender, clientes, empleo, inversores, networking, presentar, colaboradores, disfrutar} | ≥1; selección múltiple (research §7) |
| actualizado_en | datetime | requerido (FR-011) |

### Agenda personalizada
Resultado de cruzar Evento + Perfil de objetivos.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| evento_id | UUID | FK → Evento (1—1) |
| items | AgendaItem[] | ver abajo |
| generada_en | datetime | requerido |

**AgendaItem** (por sesión): `sesion_id`, `prioridad` enum(imprescindible, opcional,
descartable) (FR-012), `motivo_recomendacion` string (FR-013), `en_conflicto` bool (FR-014),
`es_alternativa_de` sesion_id \| null.

### Ruta
Desplazamiento planificado hacia el evento o entre sesiones.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| evento_id | UUID | FK → Evento |
| origen | string | punto de partida (FR-016) |
| destino | string | sede o sala |
| medio_transporte | enum(publico, coche, a_pie) | FR-018 |
| hora_salida_recomendada | datetime | FR-017; margen ≥30 min p90 (SC-006) |
| duracion_estimada | int (min) | del proveedor de mapas |
| estado | enum(propuesta, confirmada) | Principio IV: solo `confirmada` tras confirmación (FR-022) |

### Alerta logística
Aviso ante un imprevisto que afecta al plan.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| evento_id | UUID | FK → Evento |
| tipo | enum(trafico, retraso, cambio_ubicacion) | FR-021 |
| sesion_id | UUID \| null | sesión afectada, si aplica |
| generada_en | datetime | requerido |
| propuesta_hora_salida | datetime \| null | requiere confirmación (Principio IV) |

## Transiciones de estado

- **Evento.progreso_onboarding**: `importado` → (define objetivos) → `objetivos_definidos` →
  (genera agenda) → `agenda_generada`. La home (FR-026) muestra pasos completados/pendientes.
- **Ruta.estado / propuesta de agenda**: `propuesta` → (usuario confirma) → `confirmada`/aplicada.
  Sin confirmación NO hay cambio (Principio IV, FR-015/FR-022).
- **Evento (estado derivado)**: `proximo` → `en_curso` → `cerrado` según fechas (FR-024).

## Reglas de validación transversales

- Un Perfil de objetivos requiere al menos un objetivo antes de generar agenda (caso límite:
  "pide agenda sin objetivos" → la app solicita objetivos primero, FR-009).
- Toda Sesión, Ruta y Alerta DEBE referenciar un Evento (trazabilidad, Principio VIII).
- Los datos faltantes tras la importación se marcan visiblemente y son editables (FR-007, FR-008).
