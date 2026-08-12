<!--
Sync Impact Report
==================
Version change: (none) → 1.0.0
Rationale: Initial ratification of the Rumbo project constitution (first concrete
version replacing the unfilled template scaffold).

Modified principles: N/A (initial adoption)

Added principles:
  - I. Propósito: Aprovechar y Ejecutar
  - II. Móvil Primero, Tecnología Diferida
  - III. Identidad de Diseño Rumbo
  - IV. Proponer y Confirmar (NO NEGOCIABLE)
  - V. Separación de Responsabilidades por Spec
  - VI. IA y MCP a Través de Capas Controladas
  - VII. Continuidad y No Duplicación de Specs
  - VIII. Calidad Mínima de Experiencia Móvil

Added sections:
  - Criterios de Éxito del MVP
  - Governance

Removed sections: None

Follow-up TODOs: None
-->

# Rumbo Constitution

Rumbo es una aplicación pensada para acompañar al asistente a un evento antes, durante y
después, convirtiendo su intención de "aprovecharlo" en una agenda priorizada, preguntas
preparadas, notas y contactos capturados en el momento, y un seguimiento que realmente se hace.
Esta constitución es el contrato de ingeniería del proyecto: las specs describen el "qué", los
planes deciden el "cómo" respetando estos principios, y las tareas implementan sin desviarse de
este marco.

## Core Principles

### I. Propósito: Aprovechar y Ejecutar

El objetivo principal de Rumbo NO es "entender" el evento, sino ayudar a "aprovecharlo" y a
ejecutar lo que viene después. Toda spec, plan o tarea DEBE poder trazarse a este propósito. El
flujo mínimo que el MVP DEBE cubrir es:

- Importar el evento a partir de las fuentes del usuario (URL, PDF, imagen, calendario, QR o
  similar).
- Definir objetivos personales para ese evento.
- Generar una agenda personalizada y priorizada en función de esos objetivos.
- Preparar preguntas por sesión o persona.
- Vivir el evento con un modo simplificado que diga "qué toca ahora" y dónde es.
- Tomar notas vinculadas a cada actividad.
- Registrar personas y conversaciones.
- Dejar preparado el terreno para el seguimiento posterior (follow-up e informe final, que
  tendrán sus propias specs).

**Rationale**: Fijar el propósito como criterio de aceptación evita que las features deriven
hacia "explorar programa" en lugar de "ejecutar el aprovechamiento del evento".

### II. Móvil Primero, Tecnología Diferida

La experiencia DEBE verse correctamente en un dispositivo móvil y permitir interacción táctil
(pulsar elementos, navegar entre pantallas, introducir texto/voz). NO se exige implementación
Android nativa. Las decisiones de tecnología concreta (Android, web móvil, híbrido) se toman más
adelante en los planes técnicos y NO DEBEN fijarse en las specs funcionales.

**Rationale**: Separar "experiencia móvil requerida" de "stack concreto" mantiene las specs
centradas en capacidad de usuario y deja libertad de implementación al plan.

### III. Identidad de Diseño Rumbo

La identidad "Rumbo" (paleta, tipografía, sello de prioridad como metáfora de tarjeta de
embarque) ya está definida y documentada en el diseño del MVP. Las specs y planes DEBEN respetar
esa identidad visual y de interacción. Solo SE PERMITEN desviaciones justificadas por
accesibilidad o funcionalidad, y DEBEN documentarse. NO se reabre en cada spec la discusión de
branding o estilo.

**Rationale**: Congelar la identidad evita re-litigar diseño en cada feature y garantiza
coherencia visual a través del producto.

### IV. Proponer y Confirmar (NO NEGOCIABLE)

La aplicación SIEMPRE propone; el usuario SIEMPRE confirma antes de aplicar cambios sensibles o
enviar algo. Este principio DEBE reflejarse en specs, planes y decisiones de backend/UX.

- Recalcular una agenda, cambiar una hora de salida o enviar un mensaje REQUIERE confirmación
  explícita del usuario.
- NO SE PERMITEN cambios automáticos silenciosos que alteren la agenda, la logística o el
  seguimiento sin consentimiento.

**Rationale**: La confianza del usuario depende de mantener el control; las acciones sensibles
sin consentimiento romperían el valor central del producto.

### V. Separación de Responsabilidades por Spec

Cada capacidad tiene su propio espacio. Ninguna spec DEBE convertirse en un documento monolítico
que mezcle UX, backend, MCP e infraestructura. Las specs DEBEN acotarse por responsabilidad:

- **Specs de producto/UX** (como 001 y 002): capacidades visibles para el usuario —onboarding
  del evento, agenda personalizada, modo simplificado, preguntas, notas, personas.
- **Specs de backend**: orquestación, servicios, contratos de datos y reglas de negocio.
- **Specs de integración** (MCP u otros): cómo se exponen herramientas y recursos al motor de IA.

**Rationale**: Acotar por responsabilidad mantiene las specs revisables, evita solapamientos y
permite evolucionar cada capa de forma independiente.

### VI. IA y MCP a Través de Capas Controladas

La IA y MCP se usan para aportar contexto y herramientas, NO como decoración.

- La IA PUEDE proponer preguntas, clasificar sesiones, sugerir rutas o generar resúmenes.
- MCP (o integraciones equivalentes) se usan para conectar con fuentes externas o herramientas
  (p. ej. extracción de agendas, contexto de sesiones, servicios de mapas), SIEMPRE a través de
  capas controladas.
- Las specs NO DEBEN asumir llamadas directas desde la interfaz móvil a servicios externos
  sensibles; cualquier integración se describe como parte de backend/servicios, NO como lógica
  en el cliente.

**Rationale**: Enrutar integraciones por capas controladas protege credenciales, permite
validación y evita acoplar el cliente a servicios externos.

### VII. Continuidad y No Duplicación de Specs

Las specs 001 (onboarding + agenda personalizada) y 002 (preparar interacciones y vivir el
evento) ya fijan parte del comportamiento: importar evento, definir objetivos, generar agenda,
preparar preguntas, modo simplificado, notas y personas. La constitución garantiza que:

- Las futuras specs NO rompen ni duplican estas responsabilidades.
- Las nuevas capacidades (p. ej. follow-up o informe final) se especifican como features
  independientes, colgando de este flujo, sin mezclar lo ya definido.

**Rationale**: Preservar el alcance ya definido evita regresiones y duplicación conforme el
producto crece.

### VIII. Calidad Mínima de Experiencia Móvil

Cualquier implementación DEBE cumplir:

- Lectura cómoda en móvil, sin bloques de texto kilométricos.
- Estructura clara por pantallas (evento, agenda, modo simplificado, notas, personas,
  seguimiento).
- Estados de carga y error visibles, sin dejar al usuario "a oscuras".
- Trazabilidad clara de qué sesión, nota o contacto pertenece a qué evento y actividad.

**Rationale**: Estos mínimos son verificables en revisión y protegen la usabilidad en el
contexto real de uso (móvil, durante un evento).

## Criterios de Éxito del MVP

El MVP se considera exitoso si un usuario puede:

- Importar un evento, definir objetivos y recibir una agenda priorizada sin leer el programa
  completo.
- Llegar a las sesiones con preguntas preparadas.
- Tomar notas y registrar personas sin perder el contexto de la sesión.
- Entender qué toca ahora y dónde debe estar en cada momento del día.
- Retomar un evento en curso o preparar uno próximo desde una vista única de "mis eventos".

Los planes técnicos y las tareas DEBEN alinearse con estos criterios de éxito, no solo con la
implementación de piezas sueltas.

## Governance

Esta constitución PREVALECE sobre otras prácticas del proyecto. En caso de conflicto entre una
spec, un plan o una tarea y esta constitución, prevalece la constitución hasta que se enmiende.

- **Enmiendas**: Toda modificación DEBE proponerse por escrito (PR sobre este archivo), incluir
  justificación y ser aprobada por los mantenedores del proyecto antes de fusionarse.
- **Versionado** (semántico):
  - **MAJOR**: eliminación o redefinición incompatible de principios o gobernanza.
  - **MINOR**: incorporación de un principio/sección nuevo o ampliación material de guía.
  - **PATCH**: aclaraciones, redacción, correcciones no semánticas.
- **Cumplimiento**: Toda spec, plan y revisión de PR DEBE verificar conformidad con estos
  principios. Cualquier complejidad o desviación DEBE justificarse explícitamente en el
  artefacto correspondiente.

**Version**: 1.0.0 | **Ratified**: 2026-08-12 | **Last Amended**: 2026-08-12
