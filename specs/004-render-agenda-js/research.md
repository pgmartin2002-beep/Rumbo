# Investigación: Render de agendas JavaScript en backend

## R1 — Runtime de navegador

- **Decisión**: instalar `playwright` como dependencia de producción en `backend/` y usar Chromium de la misma versión. `@playwright/test` se mantiene exclusivamente para E2E.
- **Rationale**: el backend necesita una API de automatización y un navegador reproducible sin depender de `e2e/node_modules`. `playwright-core` obligaría a que la plataforma proporcione y mantenga un Chromium compatible.
- **Alternativas consideradas**: reutilizar el paquete E2E — descartado por acoplar el runtime del servicio a dependencias de prueba; `playwright-core` — descartado para el MVP por añadir un contrato operativo de navegador externo.

## R2 — Secuencia de extracción y fallback

- **Decisión**: ejecutar primero la ruta de 003 (HTML crudo → `htmlATexto` → IA). Se escala a render solo cuando el resultado sea `null` o tenga cero sesiones. Si el render extrae una o más sesiones, gana; si falla, tarda, no hay capacidad o sigue sin sesiones, se devuelve el resultado ligero no nulo, y solo se devuelve `null` si tampoco había resultado ligero.
- **Rationale**: cumple FR-004, evita el coste del navegador en URLs estáticas y conserva nombre/fechas parcialmente obtenidos para que el usuario pueda completar el borrador.
- **Alternativas consideradas**: renderizar siempre — descartado por latencia/coste; descartar un resultado ligero parcial tras fallo de render — descartado porque degrada la recuperación manual.

## R3 — Protección SSRF del navegador

- **Decisión**: ejecutar Chromium con un proxy local de salida obligatorio. El proxy valida cada petición HTTP y `CONNECT`: acepta solo HTTP(S), resuelve con la política de `ssrf-guard`, rechaza cualquier resultado no público y abre el socket contra la IP validada preservando SNI. El proceso de navegador se aísla de egress directo; se deshabilitan service workers y `page.route()` añade un segundo filtro de URL/recursos.
- **Rationale**: el filtrado de Playwright puede abortar URLs, pero Chromium resolvería el host de las solicitudes permitidas y dejaría una ventana de DNS rebinding. El proxy conserva la garantía de validación + fijación de IP de 003 para documentos, redirects, XHR y subrecursos.
- **Alternativas consideradas**: `page.route()` como control único — descartado por no fijar socket a IP; validar solo la URL inicial — descartado porque ignora redirects/subrecursos; permitir egress directo con sandbox — descartado porque no satisface FR-007.

## R4 — Interacciones y finalización del DOM

- **Decisión**: capturar `page.content()` tras navegación y acciones acotadas: un consentimiento, hasta siete tabs, cinco "ver más", cinco scrolls y dieciséis acciones. Cada acción espera un crecimiento breve del DOM/texto; no se usa `networkidle` y no se siguen enlaces.
- **Rationale**: cubre patrones habituales de agenda sin convertir el navegador en un crawler ni quedar bloqueado por analítica/polling.
- **Alternativas consideradas**: solo esperar carga — descartado por banners y tabs; esperar `networkidle` — descartado por tráfico de fondo permanente; seguir enlaces — fuera de alcance y expande SSRF/superficie de coste.

## R5 — Recursos, tiempos y observabilidad

- **Decisión**: deadline absoluto de 45 s con topes de fase 12/22/10/1 s. Un navegador por proceso y un contexto/página efímeros por importación; un render concurrente con espera máxima de 2 s. Registrar URL, ruta usada, duración por fase, clase de fallo, número de solicitudes bloqueadas y rechazo por capacidad, sin contenido sensible.
- **Rationale**: evita que una etapa consuma el presupuesto de otra, limita memoria/CPU y permite diagnosticar el resultado genérico `fuente_ilegible` sin exponer detalles al cliente.
- **Alternativas consideradas**: timeout por fase independiente — descartado porque podría superar 45 s; render paralelo ilimitado — descartado por el coste de Chromium; logs de HTML/DOM — descartados por privacidad y volumen.

## R6 — Estrategia de pruebas

- **Decisión**: usar fixtures locales que hidraten sesiones, requieran consentimiento, tabs y "ver más"; mockear IA y fetch para tests unitarios de selección/fallback; probar proxy con inicial, redirect, XHR/subrecurso y rebinding privados; conservar E2E sin red pública. Las dos URLs del incidente se validan manualmente tras desplegar.
- **Rationale**: evita dependencia de HTML cambiante, antibots, disponibilidad externa y cuota de IA, sin dejar sin validar la ruta de navegador.
- **Alternativas consideradas**: E2E contra AWS/AI Summit o Anthropic real — descartado por no ser determinista ni apto para CI.