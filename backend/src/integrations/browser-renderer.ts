/**
 * Renderizador de navegador para agendas generadas con JavaScript (feature 004, US1). Lanza un único
 * Chromium por proceso cuya ÚNICA salida es el proxy SSRF-safe (research.md R3), abre un contexto
 * incógnito y una página nuevos por importación, ejecuta interacciones acotadas para revelar la
 * agenda (FR-006, research.md R4) y devuelve el DOM ya renderizado. Nunca lanza: ante cualquier
 * fallo/timeout devuelve un `ResultadoRender` con el estado correspondiente.
 */
import { chromium, type Browser, type BrowserContext, type Page, type Route } from 'playwright';
import { crearProxyEgressSSRF, type ProxyEgress } from './render-egress-proxy.js';
import { GuardiaCapacidadRender } from './render-capacity.js';
import {
  ESPERA_ACCION_MS,
  ESPERA_CAPACIDAD_MS,
  LIMITES_INTERACCION,
  MAX_RENDER_CONCURRENTE,
  RENDER_MS,
  SETTLE_MS,
} from './render-config.js';

export type EstadoRender =
  | 'completado'
  | 'no_disponible'
  | 'timeout'
  | 'capacidad'
  | 'bloqueado'
  | 'fallo';

export interface ResultadoRender {
  estado: EstadoRender;
  html: string | null;
  solicitudes_bloqueadas: number;
  duracion_ms: number;
}

export interface RenderizadorNavegador {
  renderizar(url: string, deadline: number): Promise<ResultadoRender>;
  cerrar(): Promise<void>;
}

const RECURSOS_BLOQUEADOS = new Set(['image', 'media', 'font']);
const TEXTO_CONSENTIMIENTO = /aceptar|accept|consent|entendido|got it|agree|rechazar|reject|dismiss/i;
const TEXTO_VER_MAS = /ver m[áa]s|load more|show more|mostrar m[áa]s|cargar m[áa]s/i;

/** Implementación real con Playwright/Chromium. Reutilizable entre importaciones. */
export class PlaywrightRenderizador implements RenderizadorNavegador {
  private browser: Browser | null = null;
  private proxy: ProxyEgress | null = null;
  private readonly capacidad = new GuardiaCapacidadRender(MAX_RENDER_CONCURRENTE, ESPERA_CAPACIDAD_MS);

  /** `crearProxy` es inyectable solo para pruebas (fixtures en loopback); en producción es el proxy SSRF-safe. */
  constructor(private readonly crearProxy: () => Promise<ProxyEgress> = () => crearProxyEgressSSRF()) {}

  async renderizar(url: string, deadline: number): Promise<ResultadoRender> {
    const inicio = Date.now();
    const restante = () => deadline - Date.now();
    if (restante() <= 0) return this.resultado('timeout', null, 0, inicio);

    const adquirido = await this.capacidad.adquirir();
    if (!adquirido) return this.resultado('capacidad', null, 0, inicio);

    let contexto: BrowserContext | null = null;
    let bloqueadas = 0;
    try {
      const browser = await this.asegurarNavegador();
      contexto = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false });
      await contexto.route('**/*', (ruta: Route) => {
        const req = ruta.request();
        const esquema = new URL(req.url()).protocol;
        if (esquema !== 'http:' && esquema !== 'https:') {
          bloqueadas++;
          return ruta.abort();
        }
        if (RECURSOS_BLOQUEADOS.has(req.resourceType())) {
          bloqueadas++;
          return ruta.abort();
        }
        return ruta.continue();
      });
      const pagina = await contexto.newPage();
      pagina.on('popup', (p: Page) => void p.close().catch(() => {}));

      const margenNav = Math.min(RENDER_MS, restante());
      if (margenNav <= 0) return this.resultado('timeout', null, bloqueadas, inicio);
      await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: margenNav });

      await this.interactuar(pagina, deadline);
      await this.esperarContenidoEstable(pagina, deadline);

      const html = await this.capturarFrames(pagina);
      return this.resultado('completado', html, bloqueadas, inicio);
    } catch (error) {
      const esTimeout = error instanceof Error && /timeout/i.test(error.message);
      return this.resultado(esTimeout ? 'timeout' : 'fallo', null, bloqueadas, inicio);
    } finally {
      await contexto?.close().catch(() => {});
      this.capacidad.liberar();
    }
  }

  async cerrar(): Promise<void> {
    await this.browser?.close().catch(() => {});
    await this.proxy?.cerrar().catch(() => {});
    this.browser = null;
    this.proxy = null;
  }

  private async asegurarNavegador(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) return this.browser;
    // Recreación tras crash: se descarta el navegador previo y se relanza una vez.
    this.browser = null;
    if (!this.proxy) this.proxy = await this.crearProxy();
    this.browser = await chromium.launch({
      headless: true,
      proxy: { server: `http://127.0.0.1:${this.proxy.puerto()}` },
    });
    return this.browser;
  }

  /** Interacciones acotadas para revelar la agenda (FR-006, límites de render-config). */
  private async interactuar(pagina: Page, deadline: number): Promise<void> {
    let acciones = 0;
    const puedeSeguir = () => acciones < LIMITES_INTERACCION.totalAcciones && deadline - Date.now() > ESPERA_ACCION_MS;
    const paso = async (accion: () => Promise<void>): Promise<void> => {
      if (!puedeSeguir()) return;
      acciones++;
      try {
        await accion();
        await pagina.waitForTimeout(ESPERA_ACCION_MS);
      } catch {
        /* interacción no disponible: se ignora y se continúa */
      }
    };

    // 1) Consentimiento (una vez).
    for (let i = 0; i < LIMITES_INTERACCION.consentimiento; i++) {
      await paso(async () => {
        const boton = pagina.getByRole('button', { name: TEXTO_CONSENTIMIENTO }).first();
        if (await boton.isVisible()) await boton.click({ timeout: ESPERA_ACCION_MS });
      });
    }

    // 2) Pestañas por día.
    const tabs = pagina.getByRole('tab');
    const numTabs = Math.min(await tabs.count().catch(() => 0), LIMITES_INTERACCION.tabs);
    for (let i = 0; i < numTabs; i++) {
      await paso(async () => {
        const tab = tabs.nth(i);
        if (await tab.isVisible()) await tab.click({ timeout: ESPERA_ACCION_MS });
      });
    }

    // 3) "Ver más" (mismo documento, no enlaces).
    for (let i = 0; i < LIMITES_INTERACCION.verMas; i++) {
      const boton = pagina.getByRole('button', { name: TEXTO_VER_MAS }).first();
      if (!(await boton.isVisible().catch(() => false))) break;
      await paso(() => boton.click({ timeout: ESPERA_ACCION_MS }));
    }

    // 4) Scroll incremental; parar cuando altura y texto dejan de crecer.
    let alturaPrevia = 0;
    let textoPrevio = 0;
    for (let i = 0; i < LIMITES_INTERACCION.scroll; i++) {
      if (!puedeSeguir()) break;
      await paso(async () => {
        await pagina.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      });
      const [altura, largo] = (await pagina
        .evaluate('[document.body.scrollHeight, document.body.innerText.length]')
        .catch(() => [alturaPrevia, textoPrevio])) as [number, number];
      if (altura <= alturaPrevia && largo <= textoPrevio) break;
      alturaPrevia = altura;
      textoPrevio = largo;
    }
  }

  private resultado(estado: EstadoRender, html: string | null, bloqueadas: number, inicio: number): ResultadoRender {
    return { estado, html, solicitudes_bloqueadas: bloqueadas, duracion_ms: Date.now() - inicio };
  }

  /**
   * Espera a que el contenido diferido (p. ej. sesiones que un widget en iframe carga tras la
   * hidratación) termine de aparecer: muestrea el texto total de los frames hasta que deja de
   * crecer o se agota un margen acotado. No usa `networkidle` (analítica/polling nunca cesan).
   */
  private async esperarContenidoEstable(pagina: Page, deadline: number): Promise<void> {
    const fin = Math.min(Date.now() + SETTLE_MS, deadline - 1_000);
    let previo = -1;
    while (Date.now() < fin) {
      const largo = await this.longitudTexto(pagina);
      if (largo > 0 && largo === previo) return;
      previo = largo;
      await pagina.waitForTimeout(ESPERA_ACCION_MS);
    }
  }

  private async longitudTexto(pagina: Page): Promise<number> {
    let total = 0;
    for (const frame of pagina.frames()) {
      try {
        total += (await frame.evaluate('document.body ? document.body.innerText.length : 0')) as number;
      } catch {
        /* frame no accesible: se ignora */
      }
    }
    return total;
  }

  /**
   * Combina el texto visible de todos los frames (muchas agendas se cargan en un iframe de una
   * plataforma externa; `page.content()` solo cubre el frame superior). Se usa `innerText` en vez
   * del HTML para no arrastrar los enormes bloques `<script>` (p. ej. i18n del widget) que taparían
   * la agenda al recortar por el límite de caracteres. Los iframes van primero.
   */
  private async capturarFrames(pagina: Page): Promise<string> {
    const principal = pagina.mainFrame();
    const ordenados = [...pagina.frames().filter((f) => f !== principal), principal];
    const partes: string[] = [];
    for (const frame of ordenados) {
      try {
        const texto = (await frame.evaluate('document.body ? document.body.innerText : ""')) as string;
        if (texto && texto.trim()) partes.push(texto);
      } catch {
        /* frame no accesible o que navegó: se ignora */
      }
    }
    return partes.join('\n\n');
  }
}
