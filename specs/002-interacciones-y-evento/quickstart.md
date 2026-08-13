# Quickstart: Preparar interacciones y vivir el evento

Valida de extremo a extremo las 4 historias de usuario de `spec.md` sobre el mismo entorno local de
la feature 001 (ver `README.md` del repo).

## Prerrequisitos

```bash
cd backend && npm install && npm run dev     # http://localhost:3001
cd frontend && npm install && npm run dev    # http://localhost:5173, proxya /api
```

Necesitas un evento con onboarding completado (importado + objetivos + agenda generada), tal como
lo deja el quickstart de `specs/001-onboarding-agenda-personalizada/quickstart.md`. Anota el `id`
del evento y el `sesion_id` de al menos dos sesiones que se solapen en la agenda (o crea el evento
de prueba con sesiones solapadas a propósito, para el escenario 4).

## Escenario 1 — Preparar preguntas (Historia 1)

1. `POST /api/events/:id/sesiones/:sesionId/preguntas/generar` sobre una sesión **con** `tema`.
   - **Esperado**: 200, lista de preguntas generales y técnicas (contracts/api.md).
2. Repite la llamada (regenerar).
   - **Esperado**: 200, conjunto nuevo de preguntas; las anteriores `sugerida` ya no aparecen.
3. `POST /api/events/:id/sesiones/:sesionId/preguntas` con `{ "texto": "..." }` sobre esa misma
   sesión.
   - **Esperado**: 201, la pregunta aparece con `origen: "manual"`.
4. `GET /api/events/:id/sesiones/:sesionId/preguntas`.
   - **Esperado**: incluye tanto las `sugerida` como la `manual` del paso 3 (AC4 de Historia 1).
5. Repite el paso 1 sobre una sesión **sin** `tema`.
   - **Esperado**: 422 `informacion_insuficiente`; el cliente debe ofrecer la creación manual (AC3).

## Escenario 2 — Modo simplificado y solapes (Historia 2)

Ejecutar en el navegador (frontend), con el reloj del sistema ajustado o datos de sesión ya
próximos a la hora actual — este escenario es de cliente puro (research.md R5), no de API.

1. Con `ahora` dentro del rango de una sesión sin solape, abrir el modo simplificado.
   - **Esperado**: muestra esa sesión y su sala (AC1).
2. Avanzar el reloj hasta que termine esa sesión y empiece la siguiente, sin recargar la página.
   - **Esperado**: el modo simplificado cambia solo, sin acción manual (AC2).
3. Con `ahora` en un hueco entre sesiones.
   - **Esperado**: "nada agendado ahora", con la próxima actividad indicada (AC3).
4. Con `ahora` fuera de `[primera sesión, última sesión]`.
   - **Esperado**: "evento no activo", mostrando la primera o última actividad según corresponda (AC4).
5. Con `ahora` dentro del rango de dos sesiones solapadas (agenda con conflicto, FR-018).
   - **Esperado**: se muestra la sesión de mayor prioridad de la agenda personalizada, no ambas.

## Escenario 3 — Notas vinculadas a la sesión activa (Historia 3)

1. Con una sesión activa en el modo simplificado, `POST /api/events/:id/notas` con
   `{ "sesion_id": "<esa sesión>", "origen": "texto", "contenido": "..." }`.
   - **Esperado**: 201; la nota queda vinculada a esa sesión.
2. Repite con `{ "origen": "voz", "audio": "<payload>" }`.
   - **Esperado**: 201, `contenido` transcrito y `estado_transcripcion: "completada"`.
3. `GET /api/events/:id/notas`.
   - **Esperado**: cada nota muestra su sesión asociada; se puede editar (`PATCH`) o eliminar
     (`DELETE`) cualquiera (AC3).
4. `POST /api/events/:id/notas` con `sesion_id: null` (hueco entre sesiones).
   - **Esperado**: 201, `sesion_id: null`.
5. `PATCH /api/events/:id/notas/:notaId` con `{ "sesion_id": "<otra sesión>" }` sobre la nota del
   paso 4.
   - **Esperado**: 200, la nota queda reasignada (aclaración de sesión 2026-08-12).
6. Repetir el paso 1 y el escenario completo con el navegador en modo avión (DevTools → Network →
   Offline).
   - **Esperado**: la nota se guarda de inmediato en la UI (cola local, research.md R6); al volver
     la conexión, aparece sincronizada en `GET /api/events/:id/notas` sin pérdida (SC-006).

## Escenario 4 — Registrar contactos (Historia 4)

1. Con una sesión activa, `POST /api/events/:id/contactos` con
   `{ "sesion_id": "<esa sesión>", "nombre": "Marta Ruiz", "nota": "Habla de IA en salud" }`.
   - **Esperado**: 201, `posibles_duplicados: []`.
2. `GET /api/events/:id/contactos`.
   - **Esperado**: el contacto aparece con nombre, nota y sesión (AC2).
3. `PATCH /api/events/:id/contactos/:contactoId` con `{ "nota": "..." }` ampliando la nota.
   - **Esperado**: 200, el resto de campos se mantiene (AC3).
4. `POST /api/events/:id/contactos` sin ninguna sesión activa (`sesion_id: null`).
   - **Esperado**: 201, asociado al evento en general (AC4).
5. `POST /api/events/:id/contactos` con `{ "nombre": "Marta Ruiz " }` (variación menor del paso 1).
   - **Esperado**: 201, `posibles_duplicados` incluye el contacto del paso 1 (AC5); el contacto se
     crea de todos modos (no bloquea).
6. `POST /api/events/:id/contactos/:contactoId/fusionar` con `{ "con_id": "<contacto del paso 5>" }`.
   - **Esperado**: 200, un único contacto con la nota combinada; el segundo ya no aparece en
     `GET /api/events/:id/contactos`.
7. `POST /api/events/:id/contactos` con `{ "nombre": "Marta" }` (solo nombre, sin `nota`).
   - **Esperado**: 201, se guarda igual (aclaración de sesión 2026-08-12: la nota es opcional).

## Cobertura E2E (Playwright)

Añadir a `e2e/tests/` un spec por historia (`preguntas.spec.ts`, `modo-simplificado.spec.ts`,
`notas.spec.ts`, `contactos.spec.ts`), siguiendo el patrón de `e2e/tests/onboarding.spec.ts`
(arranque de backend+frontend vía `global-setup.ts`). Cada spec cubre al menos un camino feliz y
el caso límite marcado como "Esperado" arriba con mayor riesgo (offline en notas, solape en modo
simplificado, duplicado en contactos).
