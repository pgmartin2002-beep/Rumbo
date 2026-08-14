# Modelo de datos: Render de agendas JavaScript

La feature reutiliza `Evento`, `Sesion`, `Ponente`, `EmpresaParticipante`, `DatosEventoExtraidos` y `Evento.fuente_valor` sin cambios (001–003). No crea datos persistidos nuevos.

## Estructuras transitorias

### Resultado de extracción ligera

| Campo | Tipo | Regla |
|---|---|---|
| `datos` | `DatosEventoExtraidos \| null` | Salida validada de HTML crudo + IA. |
| `sesiones_extraidas` | `number` | Determina el escalado: render solo si vale 0. |

### Resultado de renderizado

| Campo | Tipo | Regla |
|---|---|---|
| `html` | `string \| null` | DOM de `page.content()`; nunca se persiste ni registra. |
| `estado` | `completado \| no_disponible \| timeout \| capacidad \| bloqueado \| fallo` | Diagnóstico interno; no cambia el código público de error. |
| `solicitudes_bloqueadas` | `number` | Conteo para observabilidad, sin URLs ni cabeceras sensibles. |
| `duracion_ms` | `number` | Métrica de fase. |

### Presupuesto de importación URL

| Campo | Tipo | Regla |
|---|---|---|
| `deadline` | `number` | Marca temporal absoluta creada al iniciar la importación; total <=120 s. |
| `fase` | `ligera \| render \| ia_renderizada` | Cada fase usa el mínimo entre su tope y el tiempo restante. |

## Relaciones y selección

```text
URL → resultado ligero ──(>=1 sesión)──> DatosEventoExtraidos → Evento/Sesiones
                       └─(0 sesiones)──> render → IA → DatosEventoExtraidos → Evento/Sesiones
                                             └─(sin sesiones/fallo)──> resultado ligero útil | fuente_ilegible
```

`ImportService` solo persiste después de la selección final. Por tanto, fallo de red, proxy, navegador, capacidad o IA no crea registros parciales.