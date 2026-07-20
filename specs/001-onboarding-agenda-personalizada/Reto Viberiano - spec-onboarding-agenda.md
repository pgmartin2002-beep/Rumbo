# Especificación de Feature: Onboarding del evento y Agenda personalizada por objetivos

**Rama**: `001-onboarding-agenda-personalizada`
**Creada**: 2026-07-17
**Estado**: Borrador
**Input**: Descripción del usuario: "Una aplicación (web+móvil) que acompaña al usuario antes, durante y después de un evento o challenge, convirtiendo una intención natural en acciones útiles [...]. MVP: 1. Importar evento mediante URL, PDF o calendario. 2. Definir objetivos personales. 3. Generar agenda personalizada. [...]"

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de Usuario 1 - Importar un evento (Prioridad: P1)

Como asistente a un evento, quiero importar el evento a la app usando la fuente que ya tengo a mano (una URL, un PDF, una imagen, una invitación de calendario, un correo, un código QR o una búsqueda), para no tener que introducir manualmente fechas, sesiones y ponentes.

**Por qué esta prioridad**: sin datos del evento en el sistema no existe agenda, ni preguntas, ni notas, ni nada del resto del producto. Es el cimiento de todo el MVP.

**Test independiente**: se puede probar importando un evento por cualquiera de los canales soportados y comprobando que la app muestra correctamente fecha, ubicación, sesiones y ponentes extraídos, sin depender de ninguna otra funcionalidad.

**Escenarios de aceptación**:
1. **Dado** que tengo la URL de la web oficial de un evento, **Cuando** la pego en la app para importar el evento, **Entonces** la app extrae y muestra fechas, ubicación, sesiones, ponentes, empresas participantes y requisitos de acceso.
2. **Dado** que tengo un PDF o una imagen con la agenda del evento, **Cuando** lo subo a la app, **Entonces** la app extrae la misma información estructurada (fechas, sesiones, ponentes) a partir del documento o imagen.
3. **Dado** que tengo una invitación de calendario o un correo electrónico sobre el evento, **Cuando** lo importo desde la app, **Entonces** la app crea el evento con los datos disponibles en esa fuente.
4. **Dado** que tengo un código QR del evento, **Cuando** lo escaneo desde la app, **Entonces** la app localiza e importa el evento correspondiente.
5. **Dado** que no tengo ninguna fuente digital a mano, **Cuando** busco el evento por nombre dentro de la app, **Entonces** puedo seleccionarlo de los resultados y añadirlo a mi lista de eventos.
6. **Dado** que la fuente importada no contiene toda la información (por ejemplo, faltan ponentes), **Cuando** se completa la importación, **Entonces** la app muestra el evento con los campos disponibles y señala de forma visible qué información falta.
7. **Dado** que la fuente importada es ilegible o no corresponde a un evento (por ejemplo, una imagen borrosa o una URL que no es de un evento), **Cuando** intento importarla, **Entonces** la app informa de que no ha podido extraer datos y me permite introducir la información manualmente o reintentar con otra fuente.

### Historia de Usuario 2 - Definir mis objetivos para el evento (Prioridad: P1)

Como asistente a un evento, quiero indicar qué busco conseguir (aprender, encontrar clientes, buscar empleo, conocer inversores, hacer networking, presentar un proyecto, encontrar colaboradores, o simplemente disfrutar sin perderme lo importante), para que la app adapte sus recomendaciones a lo que realmente me interesa.

**Por qué esta prioridad**: es el segundo requisito indispensable del MVP; sin objetivo declarado la agenda no se puede personalizar y todos los asistentes recibirían el mismo plan genérico.

**Test independiente**: se puede probar seleccionando uno o varios objetivos para un evento ya importado y comprobando que el perfil queda guardado, sin necesidad de que la agenda esté generada todavía.

**Escenarios de aceptación**:
1. **Dado** que acabo de importar un evento y aún no tengo objetivos definidos, **Cuando** entro por primera vez en el evento, **Entonces** la app me pregunta qué busco conseguir antes de mostrarme cualquier recomendación.
2. **Dado** que estoy definiendo mis objetivos, **Cuando** selecciono una o varias opciones de la lista (aprender, clientes, empleo, inversores, networking, presentar proyecto, colaboradores, disfrutar), **Entonces** la app guarda mi selección asociada a ese evento. [NECESITA ACLARACIÓN: ¿se permite seleccionar varios objetivos a la vez o solo uno principal por evento?]
3. **Dado** que ya tengo objetivos definidos para un evento, **Cuando** vuelvo a entrar más adelante, **Entonces** puedo consultarlos y modificarlos en cualquier momento antes o durante el evento.
4. **Dado** que cambio mis objetivos después de tener una agenda generada, **Cuando** confirmo el cambio, **Entonces** la app me avisa de que la agenda se recalculará en función de los nuevos objetivos.

### Historia de Usuario 3 - Recibir una agenda priorizada según mis objetivos (Prioridad: P1)

Como asistente con mis objetivos ya definidos, quiero recibir una agenda del evento organizada por prioridad (imprescindibles, opcionales, en conflicto), para saber exactamente a qué sesiones ir sin tener que leerme el programa completo.

**Por qué esta prioridad**: es el resultado tangible que entrega el valor prometido por el producto ("no solo entender el evento, sino aprovecharlo"). Depende de las historias 1 y 2, pero es la que convierte los datos importados en una decisión útil.

**Test independiente**: con un evento ya importado y unos objetivos ya definidos, se puede probar generando la agenda y comprobando que las sesiones quedan clasificadas por prioridad y que los conflictos de horario quedan señalados, sin depender de preguntas, notas o contactos.

**Escenarios de aceptación**:
1. **Dado** que tengo un evento importado con sus sesiones y mis objetivos definidos, **Cuando** solicito mi agenda personalizada, **Entonces** la app clasifica cada sesión como imprescindible, opcional o descartable en función de mis objetivos.
2. **Dado** que mi agenda tiene una sesión marcada como recomendada, **Cuando** consulto el motivo de la recomendación, **Entonces** la app muestra una explicación en lenguaje llano de por qué encaja con mis objetivos (por ejemplo, el tema o las empresas asistentes).
3. **Dado** que dos sesiones recomendadas coinciden en el mismo horario, **Cuando** genero la agenda, **Entonces** la app señala el conflicto y me indica cuál prioriza según mis objetivos, dejando la otra como alternativa.
4. **Dado** que dos sesiones recomendadas están en salas distintas con poco tiempo entre ellas, **Cuando** genero la agenda, **Entonces** la app advierte si el tiempo disponible para desplazarme entre salas es insuficiente. [NECESITA ACLARACIÓN: ¿de dónde obtiene la app los tiempos de desplazamiento entre salas — mapa del recinto, estimación manual, u otro origen?]
5. **Dado** que ya tengo una agenda generada, **Cuando** modifico mis objetivos o el evento actualiza su programa, **Entonces** puedo volver a generar la agenda y obtener una nueva priorización.

### Historia de Usuario 4 - Planificador logístico (Prioridad: P2)

Como asistente a un evento con mi agenda ya generada, quiero que la app me prepare la logística (ruta, hora de salida, transporte, aparcamiento y alertas), para llegar a tiempo a cada sesión sin tener que planificarlo yo mismo.

**Por qué esta prioridad**: aporta mucho valor y refuerza el mensaje de "ejecutar, no solo entender", pero el usuario puede aprovechar la agenda personalizada (P1) aunque todavía no tenga la logística resuelta. No es un bloqueante para el resto del MVP.

**Test independiente**: se puede probar con un evento importado que tenga ubicación y un punto de origen indicado por el usuario, comprobando que la app calcula ruta y hora de salida, sin depender de que existan preguntas, notas o contactos.

**Escenarios de aceptación**:
1. **Dado** que tengo un evento importado con ubicación y he indicado mi punto de origen (casa, hotel u oficina), **Cuando** solicito la logística del evento, **Entonces** la app me muestra la ruta recomendada y la hora de salida recomendada en función del inicio de mi primera actividad.
2. **Dado** que mi agenda tiene sesiones en salas o sedes distintas, **Cuando** consulto el tiempo entre dos sesiones consecutivas, **Entonces** la app calcula si el hueco disponible es suficiente para desplazarme y me avisa si no lo es.
3. **Dado** que prefiero transporte público, **Cuando** pido la ruta, **Entonces** la app me ofrece opciones de transporte público con sus horarios y tiempos estimados.
4. **Dado** que voy a desplazarme en coche, **Cuando** consulto opciones de aparcamiento, **Entonces** la app me muestra aparcamientos cercanos al recinto.
5. **Dado** que hay tráfico, un retraso en el transporte o un cambio de ubicación del evento, **Cuando** el sistema lo detecta, **Entonces** me envía una alerta con margen suficiente para ajustar mi hora de salida.
6. **Dado** que la ubicación de una sesión o sede cambia después de haber calculado mi ruta, **Cuando** ocurre el cambio, **Entonces** la app actualiza automáticamente la ruta y la hora de salida recomendada.

### Casos límite

- ¿Qué pasa si el evento importado no tiene ninguna sesión con información suficiente para priorizar (por ejemplo, un PDF solo con el título del evento)?
- ¿Cómo se comporta la app si el usuario no define ningún objetivo y pide igualmente una agenda?
- ¿Qué ocurre si dos fuentes distintas del mismo evento (por ejemplo, URL y PDF) se importan por separado y entran en conflicto entre sí?
- ¿Qué pasa si el programa del evento cambia después de haber generado la agenda (se añade o elimina una sesión)?
- ¿Cómo se prioriza cuando todas las sesiones encajan igual de bien con los objetivos del usuario y no hay forma clara de diferenciarlas?
- ¿Qué pasa si el usuario no indica ningún punto de origen para calcular la ruta?
- ¿Cómo se comporta la app si no hay transporte público disponible cerca del recinto?
- ¿Cómo se gestiona la logística de un evento que se celebra en varias sedes distintas el mismo día?

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema DEBE permitir importar un evento a partir de una URL de su web oficial.
- **FR-002**: El sistema DEBE permitir importar un evento a partir de un PDF o una imagen de su agenda.
- **FR-003**: El sistema DEBE permitir importar un evento a partir de una invitación de calendario o un correo electrónico.
- **FR-004**: El sistema DEBE permitir importar un evento escaneando un código QR.
- **FR-005**: El sistema DEBE permitir buscar y añadir un evento directamente desde la app.
- **FR-006**: El sistema DEBE extraer de la fuente importada, cuando estén disponibles, las fechas, la ubicación, las sesiones, los ponentes, las empresas participantes y los requisitos de acceso del evento.
- **FR-007**: El sistema DEBE señalar de forma visible los campos del evento que no se hayan podido extraer de la fuente importada.
- **FR-008**: El sistema DEBE permitir al usuario completar o corregir manualmente los datos del evento que falten o sean incorrectos.
- **FR-009**: El sistema DEBE solicitar al usuario sus objetivos para el evento antes de generar cualquier recomendación de agenda.
- **FR-010**: El sistema DEBE ofrecer como opciones de objetivo, como mínimo: aprender sobre un tema, encontrar clientes, buscar empleo, conocer inversores, hacer networking, presentar un proyecto, encontrar colaboradores, y disfrutar del evento sin perderse lo importante.
- **FR-011**: El sistema DEBE permitir modificar los objetivos de un evento en cualquier momento antes o durante el evento.
- **FR-012**: El sistema DEBE generar una agenda personalizada que clasifique cada sesión del evento como imprescindible, opcional o descartable en función de los objetivos declarados por el usuario.
- **FR-013**: El sistema DEBE mostrar, para cada sesión recomendada, una explicación en lenguaje llano de por qué se recomienda.
- **FR-014**: El sistema DEBE detectar y señalar los conflictos de horario entre sesiones recomendadas.
- **FR-015**: El sistema DEBE recalcular la agenda cuando el usuario modifica sus objetivos o cuando cambian los datos del evento. [NECESITA ACLARACIÓN: ¿el recálculo es automático o requiere que el usuario lo confirme explícitamente?]
- **FR-016**: El sistema DEBE permitir indicar un punto de origen (casa, hotel, oficina u otro) para calcular la ruta hacia el evento.
- **FR-017**: El sistema DEBE calcular y mostrar la ruta recomendada y la hora de salida recomendada en función de la hora de inicio de la primera actividad del usuario.
- **FR-018**: El sistema DEBE ofrecer opciones de transporte (público y privado) con sus tiempos estimados.
- **FR-019**: El sistema DEBE mostrar opciones de aparcamiento cercano al recinto cuando el usuario elige desplazarse en coche.
- **FR-020**: El sistema DEBE calcular el tiempo necesario para desplazarse entre salas o sedes distintas del evento y advertir cuando el hueco disponible en la agenda es insuficiente.
- **FR-021**: El sistema DEBE enviar una alerta al usuario cuando detecte tráfico, retrasos en el transporte o cambios de ubicación que afecten a su plan. [NECESITA ACLARACIÓN: ¿qué fuente de datos de tráfico y transporte en tiempo real usará el sistema?]
- **FR-022**: El sistema DEBE actualizar la ruta y la hora de salida recomendada cuando cambie la ubicación de una sesión o sede ya planificada.

### Entidades clave

- **Evento**: representa el evento o challenge importado. Atributos clave: nombre, fechas, ubicación, requisitos de acceso, fuente de importación. Relación: contiene sesiones y empresas participantes.
- **Sesión**: una charla, taller o actividad dentro del evento. Atributos clave: título, horario, sala, tema, ponente(s) asociados. Relación: pertenece a un evento; puede estar en conflicto de horario con otras sesiones.
- **Ponente**: persona que participa en una o varias sesiones. Atributos clave: nombre, empresa, tema de la sesión que imparte.
- **Empresa participante**: organización presente en el evento (como ponente, patrocinador o expositor). Atributos clave: nombre, relación con el evento.
- **Perfil de objetivos**: el conjunto de objetivos que el usuario declara para un evento concreto. Atributos clave: objetivo(s) seleccionados, evento asociado, fecha de última modificación.
- **Agenda personalizada**: el resultado de cruzar el evento con el perfil de objetivos del usuario. Atributos clave: lista de sesiones clasificadas por prioridad, conflictos detectados, motivo de recomendación por sesión.
- **Ruta**: el desplazamiento planificado del usuario hacia el evento o entre sesiones. Atributos clave: origen, destino, medio de transporte, hora de salida recomendada, duración estimada.
- **Alerta logística**: aviso generado ante un imprevisto que afecta al plan del usuario. Atributos clave: tipo (tráfico, retraso, cambio de ubicación), sesión o evento afectado, momento en que se genera.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El 90% de los eventos importados mediante URL, PDF, calendario o correo devuelven correctamente fecha y ubicación sin necesidad de corrección manual.
- **SC-002**: El 80% de las sesiones de un evento importado quedan correctamente identificadas (título y horario) sin corrección manual.
- **SC-003**: El 90% de los usuarios completan la definición de sus objetivos en menos de 1 minuto desde que importan el evento.
- **SC-004**: El 80% de los usuarios que reciben su agenda personalizada consideran, en una encuesta posterior, que las sesiones recomendadas encajaban con lo que buscaban en el evento.
- **SC-005**: El tiempo desde que el usuario importa el evento hasta que dispone de una agenda personalizada es inferior a 3 minutos en el 90% de los casos.
- **SC-006**: El 90% de los usuarios reciben la hora de salida recomendada con al menos 30 minutos de antelación respecto al inicio de la sesión correspondiente.
- **SC-007**: El 80% de las alertas de tráfico, retraso o cambio de ubicación se entregan con margen suficiente (al menos 15 minutos) para que el usuario ajuste su salida.

## Suposiciones

- El evento tiene un programa de sesiones disponible en alguna de las fuentes soportadas (web, PDF, imagen, calendario, correo o buscador interno) antes de que el usuario intente importarlo.
- Un usuario puede gestionar varios eventos en paralelo, cada uno con su propio perfil de objetivos y su propia agenda.
- Los objetivos se definen por evento, no de forma global para el usuario (los mismos intereses pueden variar de un evento a otro).
- Queda FUERA de alcance en esta spec: la preparación de preguntas por sesión o ponente, el copiloto de networking, la captura de contactos, las notas contextuales, el modo "durante el evento", la replanificación en tiempo real y el follow-up posterior — cada una se especificará en su propia spec.
- Se asume que existe un servicio o motor de extracción capaz de interpretar URLs, PDFs, imágenes, invitaciones de calendario y correos para obtener datos estructurados del evento (su implementación técnica no se decide en esta spec).
- Se asume que existe un proveedor externo de mapas, transporte y tráfico en tiempo real al que el sistema puede consultar (su elección técnica no se decide en esta spec).
- Se asume que el usuario proporciona o autoriza el acceso a su ubicación de origen, ya sea de forma manual o por geolocalización.
