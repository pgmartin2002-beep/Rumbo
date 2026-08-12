# Especificación de Feature: Preparar interacciones y vivir el evento

**Rama**: `002-preparar-interacciones-vivir-evento`
**Creada**: 2026-07-30
**Estado**: Borrador
**Input**: Descripción del usuario: "MVP para una primera versión centrada en el flujo: 1. Importar evento (URL/PDF/calendario). 2. Definir objetivos. 3. Generar agenda personalizada. 4. Preparar preguntas por sesión o persona. 5. Tomar notas vinculadas a cada actividad. 6. Registrar contactos y conversaciones. 7. Generar follow-ups. 8. Crear un informe final con tareas pendientes. Navegación en cinco pantallas: Mi evento · Mi agenda · Personas · Notas · Seguimiento. Mensaje central: no solo ayuda a entender el evento, ayuda a aprovecharlo y a ejecutar lo que viene después." Esta spec cubre específicamente los puntos 4, 5 y 6 (preparar preguntas, tomar notas y registrar contactos), que corresponden a las Actividades 3 y 4 del mapa de historias ("Preparar las interacciones" y "Vivir el evento"). Los puntos 7 y 8 (follow-up e informe final) corresponden a la Actividad 5 y se especificarán en una spec independiente.

## Clarifications

### Session 2026-08-12

- Q: ¿Qué criterio debe usar la app para detectar que dos contactos registrados podrían ser la misma persona? → A: Coincidencia aproximada de nombre (tolera errores de escritura, orden de nombre/apellido y variaciones menores similares), sin bloquear el guardado, solo avisando de posible duplicado.
- Q: ¿Qué debe seguir funcionando sin conexión a internet: solo la captura de notas y contactos, o también el modo simplificado y la generación de preguntas? → A: Notas, contactos y modo simplificado funcionan sin conexión (usando la agenda y sesiones ya descargadas); solo la generación de preguntas nuevas y la transcripción de voz requieren conexión y quedan pendientes hasta recuperarla.
- Q: Cuando el usuario crea una nota durante un hueco entre sesiones, ¿debe poder vincularla manualmente a una sesión anterior o posterior, o siempre queda vinculada solo al evento en general? → A: Sí, el usuario puede reasignar manualmente la nota a cualquier sesión de su agenda después de crearla.
- Q: Si dos sesiones se solapan en la agenda y el usuario abre el modo simplificado en ese hueco de solape, ¿qué actividad debe mostrarle la app? → A: Muestra automáticamente la sesión de mayor prioridad según la agenda personalizada.
- Q: ¿Es obligatorio escribir una nota rápida al registrar un contacto, o puede guardarse un contacto solo con el nombre? → A: El nombre es obligatorio; la nota rápida es opcional y se puede añadir después.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de Usuario 1 - Preparar preguntas antes de cada sesión (Prioridad: P1)

Como asistente con mi agenda personalizada ya generada, quiero recibir preguntas generales y técnicas para cada sesión, para llegar con algo que decir y no quedarme en blanco durante el turno de preguntas o una conversación con el ponente.

**Por qué esta prioridad**: es el primer paso de "aprovechar" el evento, no solo "entenderlo". Sin preguntas preparadas, el usuario llega a las sesiones igual de perdido que sin la app, aunque ya tenga agenda.

**Test independiente**: se puede probar con un evento importado y una agenda ya generada, comprobando que cada sesión de la agenda muestra preguntas sugeridas, sin depender de que existan notas o contactos.

**Escenarios de aceptación**:
1. **Dado** que tengo una sesión en mi agenda con tema y, si está disponible, ponente identificado, **Cuando** consulto esa sesión, **Entonces** la app me muestra una lista de preguntas generales y técnicas relacionadas con el tema de la sesión.
2. **Dado** que estoy viendo las preguntas sugeridas de una sesión, **Cuando** pido que se regeneren, **Entonces** la app genera un nuevo conjunto de preguntas para esa misma sesión.
3. **Dado** que una sesión no tiene tema ni descripción suficiente en los datos importados, **Cuando** consulto sus preguntas sugeridas, **Entonces** la app me informa de que no hay información suficiente para generarlas y me permite escribir mis propias preguntas manualmente.
4. **Dado** que he escrito mis propias preguntas para una sesión, **Cuando** vuelvo a consultar esa sesión más tarde, **Entonces** encuentro mis preguntas guardadas junto con las sugeridas por la app.

### Historia de Usuario 2 - Saber qué toca ahora y dónde es (Prioridad: P1)

Como asistente durante el evento, quiero un modo simplificado que me diga qué actividad tengo ahora y dónde es, para no tener que revisar toda la agenda cada vez que quiero ubicarme.

**Por qué esta prioridad**: es la base operativa de la Actividad 4: sin saber "qué toca ahora", el resto de funciones (notas, contactos) pierden el contexto de a qué sesión pertenecen. Es imprescindible para el walking skeleton del MVP.

**Test independiente**: se puede probar con un evento y una agenda ya generados, simulando distintas horas del día y comprobando que el modo simplificado siempre muestra la actividad correspondiente a ese momento, sin depender de notas o contactos.

**Escenarios de aceptación**:
1. **Dado** que tengo una agenda generada y estoy dentro del horario del evento, **Cuando** abro el modo simplificado, **Entonces** la app me muestra la sesión que me corresponde en este momento según mi agenda y su ubicación (sala o zona).
2. **Dado** que estoy en el modo simplificado, **Cuando** termina la sesión actual y empieza la siguiente, **Entonces** la app actualiza automáticamente qué sesión y ubicación me muestra, sin que tenga que refrescar nada manualmente.
3. **Dado** que estoy en un hueco entre dos sesiones sin actividad asignada, **Cuando** abro el modo simplificado, **Entonces** la app me indica que no tengo nada agendado ahora mismo y me muestra cuál es mi próxima actividad.
4. **Dado** que estoy fuera del horario del evento (antes de que empiece o después de que termine), **Cuando** abro el modo simplificado, **Entonces** la app me indica que el evento no está activo en este momento y me muestra la primera o la última actividad del día, según corresponda.

### Historia de Usuario 3 - Tomar notas vinculadas a la sesión activa (Prioridad: P1)

Como asistente que está viviendo una sesión, quiero tomar notas por voz o texto que queden vinculadas automáticamente a esa sesión, para no perder ideas importantes ni tener que anotar a mano en qué sesión ocurrió cada cosa.

**Por qué esta prioridad**: es el problema central que Marcos vive hoy ("dos semanas después ya no recuerda con quién habló ni qué prometió"). Capturar en el momento, vinculado al contexto, es lo que hace posible el cierre y seguimiento más adelante.

**Test independiente**: se puede probar con una sesión activa en el modo simplificado, creando notas de texto y de voz y comprobando que quedan asociadas a esa sesión, sin depender de que existan contactos registrados.

**Escenarios de aceptación**:
1. **Dado** que estoy en el modo simplificado durante una sesión, **Cuando** creo una nota de texto, **Entonces** la app la guarda vinculada automáticamente a esa sesión.
2. **Dado** que estoy en el modo simplificado durante una sesión, **Cuando** dicto una nota por voz, **Entonces** la app la convierte en texto legible y la guarda vinculada a esa sesión.
3. **Dado** que tengo notas guardadas de sesiones anteriores, **Cuando** las consulto, **Entonces** puedo ver a qué sesión pertenece cada una y editar o eliminar cualquiera de ellas.
4. **Dado** que estoy en un hueco entre sesiones sin actividad asignada, **Cuando** creo una nota, **Entonces** la app la guarda vinculada al evento en general, señalando que no corresponde a ninguna sesión concreta, y me permite reasignarla manualmente después a cualquier sesión de mi agenda.

### Historia de Usuario 4 - Registrar un contacto en el momento (Prioridad: P1)

Como asistente que acabo de conocer a alguien interesante, quiero registrar rápidamente su nombre y una nota sobre la conversación, para no depender de mi memoria ni de tarjetas de papel que se pierden.

**Por qué esta prioridad**: junto con las notas, es la pieza que da sentido al seguimiento posterior (Actividad 5). Sin contactos registrados en el momento, no hay sobre qué generar follow-ups después.

**Test independiente**: se puede probar registrando un contacto durante el evento y comprobando que queda guardado con su nota y su contexto, sin depender de que existan notas de sesión ni de la funcionalidad de seguimiento.

**Escenarios de aceptación**:
1. **Dado** que estoy hablando con alguien durante el evento, **Cuando** registro manualmente su nombre y una nota rápida, **Entonces** la app guarda el contacto vinculado a la sesión o momento en que lo conocí.
2. **Dado** que tengo varios contactos registrados, **Cuando** consulto mi lista de personas, **Entonces** veo cada contacto con su nombre, su nota y en qué sesión o momento lo conocí.
3. **Dado** que quiero ampliar la información de un contacto ya registrado, **Cuando** edito su nota, **Entonces** la app guarda los cambios manteniendo el resto de datos del contacto.
4. **Dado** que registro un contacto sin ninguna sesión activa en ese momento, **Cuando** guardo el contacto, **Entonces** la app lo asocia al evento en general en lugar de a una sesión concreta.
5. **Dado** que introduzco el nombre de un contacto que ya había registrado antes en el mismo evento, con un nombre igual o aproximadamente similar (tolerando errores de escritura o variaciones menores), **Cuando** intento guardarlo de nuevo, **Entonces** la app me avisa de la posible duplicidad y me permite fusionar la información o guardarlo como un contacto distinto.

### Casos límite

- Si el usuario abre el modo simplificado sin conexión a internet, la app sigue mostrando la actividad actual y su ubicación usando la agenda y sesiones ya descargadas previamente; solo la generación de preguntas nuevas y la transcripción de voz quedan en espera hasta recuperar la conexión.
- ¿Cómo se comporta la app si el usuario dicta una nota de voz en un entorno muy ruidoso y la transcripción resulta poco fiable?
- Si dos sesiones se solapan en la agenda (conflicto ya señalado en la Actividad 1) y el usuario abre el modo simplificado en ese hueco, la app le muestra automáticamente la sesión de mayor prioridad según su agenda personalizada.
- ¿Qué pasa si el usuario elimina una sesión de su agenda después de haber tomado notas o registrado contactos vinculados a ella?
- Un contacto registrado sin ninguna nota, solo con el nombre, se guarda igualmente (la nota rápida es opcional) y el usuario puede añadirla o editarla más tarde desde su lista de personas.
- ¿Qué pasa si el usuario quiere preguntas sugeridas para una sesión que aún no ha empezado, muy por adelantado?

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema DEBE generar preguntas generales y técnicas para cada sesión de la agenda a partir del tema y, cuando esté disponible, del ponente de la sesión.
- **FR-002**: El sistema DEBE permitir regenerar el conjunto de preguntas sugeridas de una sesión bajo petición del usuario.
- **FR-003**: El sistema DEBE permitir al usuario añadir sus propias preguntas manuales a una sesión, junto a las sugeridas.
- **FR-004**: El sistema DEBE informar cuando no dispone de información suficiente de una sesión para generar preguntas, y permitir en ese caso la creación manual.
- **FR-005**: El sistema DEBE mostrar, en un modo simplificado, la actividad que corresponde al usuario en el momento actual según su agenda, junto con su ubicación.
- **FR-006**: El sistema DEBE actualizar automáticamente el modo simplificado a medida que avanza el tiempo, sin requerir una acción manual del usuario.
- **FR-007**: El sistema DEBE indicar cuándo el usuario no tiene ninguna actividad asignada en el momento actual y mostrar cuál es su próxima actividad.
- **FR-008**: El sistema DEBE permitir crear notas de texto vinculadas a la sesión activa en el momento de la creación.
- **FR-009**: El sistema DEBE permitir crear notas por voz y convertirlas en texto legible, vinculándolas a la sesión activa en el momento de la creación.
- **FR-010**: El sistema DEBE permitir editar y eliminar cualquier nota después de creada.
- **FR-011**: El sistema DEBE permitir registrar manualmente un contacto con, como mínimo, un nombre; la nota rápida es opcional en el momento del registro y se puede añadir o completar después.
- **FR-012**: El sistema DEBE vincular cada contacto registrado a la sesión activa en el momento de su creación, o al evento en general si no hay ninguna sesión activa.
- **FR-013**: El sistema DEBE vincular cada nota registrada a la sesión activa en el momento de su creación, o al evento en general si no hay ninguna sesión activa. Cuando una nota queda vinculada al evento en general, el sistema DEBE permitir al usuario reasignarla manualmente después a cualquier sesión de su agenda.
- **FR-014**: El sistema DEBE permitir consultar la lista completa de notas y de contactos capturados durante un evento, mostrando la sesión o momento asociado a cada uno.
- **FR-015**: El sistema DEBE permitir editar la información de un contacto ya registrado.
- **FR-016**: El sistema DEBE avisar al usuario cuando registra un contacto cuyo nombre coincide, exacta o aproximadamente (tolerando errores de escritura, orden de nombre/apellido u otras variaciones menores), con uno ya existente en el mismo evento, y permitir fusionarlo o guardarlo como distinto.
- **FR-017**: El sistema DEBE permitir al usuario crear notas, registrar contactos y usar el modo simplificado (con la agenda y sesiones ya descargadas) sin conexión a internet, sincronizando los datos cuando la conexión se recupere. La generación de nuevas preguntas y la transcripción de voz a texto REQUIEREN conexión y quedan pendientes hasta que esta se recupere.
- **FR-018**: Cuando dos sesiones de la agenda se solapan en el momento actual, el sistema DEBE mostrar en el modo simplificado la sesión de mayor prioridad según la agenda personalizada del usuario.

### Entidades clave

- **Pregunta preparada**: pregunta general o técnica asociada a una sesión. Atributos clave: texto, sesión asociada, origen (sugerida por la app o escrita manualmente por el usuario).
- **Nota**: anotación de texto o voz transcrita capturada por el usuario. Atributos clave: contenido, momento de creación, sesión asociada (o evento en general si no hay sesión activa), origen (texto o voz).
- **Contacto**: persona registrada por el usuario durante el evento. Atributos clave: nombre (obligatorio), nota rápida asociada (opcional, se puede añadir o completar después), sesión o momento en que se conoció, posibles duplicados detectados.
- **Sesión** *(reutilizada de la spec de onboarding y agenda)*: contexto al que se vinculan preguntas, notas y contactos.
- **Agenda personalizada** *(reutilizada de la spec de onboarding y agenda)*: fuente que determina qué sesión está activa en cada momento para el modo simplificado.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El 70% de los usuarios consulta las preguntas sugeridas de al menos una sesión antes de que esta comience.
- **SC-002**: El 90% de los usuarios que abren el modo simplificado durante una sesión ven la actividad correcta sin necesidad de navegar manualmente por la agenda.
- **SC-003**: El tiempo medio para registrar un contacto (como mínimo, el nombre) es inferior a 15 segundos.
- **SC-004**: El 90% de las notas de voz quedan transcritas de forma legible sin que el usuario necesite corregirlas manualmente.
- **SC-005**: El 80% de los usuarios que asisten a un evento con esta funcionalidad terminan el evento con al menos una nota o un contacto registrado por cada sesión imprescindible de su agenda.
- **SC-006**: El 0% de las notas o contactos capturados sin conexión se pierden al recuperar la conectividad.

## Suposiciones

- Esta spec depende de que exista ya un evento importado, un perfil de objetivos y una agenda personalizada generada, tal como se define en la spec `001-onboarding-agenda-personalizada`.
- Un usuario puede tener varias sesiones activas o ninguna en un momento dado (por ejemplo, en un hueco entre charlas); el modo simplificado debe reflejar ambos casos.
- Las notas y los contactos se capturan durante el evento, pero pueden consultarse y editarse también después, ya que alimentan el cierre y seguimiento posterior (fuera de alcance de esta spec).
- Queda FUERA de alcance en esta spec: la personalización de preguntas según el perfil del usuario y el copiloto de networking (a quién conocer y por qué), la captura de contactos por QR, NFC o foto de tarjeta, la replanificación automática de la agenda ante cambios o cancelaciones, y todo lo relativo a la Actividad 5 (informe post-evento, resumen automático de conversaciones, borrador de mensajes de seguimiento, exportación a CRM) — se especificará en una spec independiente.
- La organización de la navegación en pantallas (Mi evento, Mi agenda, Personas, Notas, Seguimiento) es una decisión de diseño de producto que no se fija en esta spec, ya que corresponde al plan de implementación y no al qué/por qué.
- Se asume que existe un servicio capaz de generar preguntas a partir del tema y el ponente de una sesión, y un servicio de transcripción de voz a texto; su elección técnica no se decide en esta spec.
- Se asume que el usuario proporciona o autoriza el acceso al micrófono para las notas por voz.
