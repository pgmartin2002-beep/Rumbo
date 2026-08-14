/**
 * Guardia de capacidad de render (feature 004, research.md R5): semáforo que limita el número de
 * renders concurrentes por proceso. Si no hay hueco dentro de la espera máxima, `adquirir` resuelve
 * `false` para que la orquestación degrade al resultado ligero sin bloquear más allá del presupuesto.
 */
interface EnEspera {
  resolver: (adquirido: boolean) => void;
  temporizador: NodeJS.Timeout;
}

export class GuardiaCapacidadRender {
  private enUso = 0;
  private readonly cola: EnEspera[] = [];

  constructor(
    private readonly max: number,
    private readonly esperaMs: number,
  ) {}

  async adquirir(): Promise<boolean> {
    if (this.enUso < this.max) {
      this.enUso++;
      return true;
    }
    return new Promise<boolean>((resolve) => {
      const entrada: EnEspera = {
        resolver: resolve,
        temporizador: setTimeout(() => {
          const i = this.cola.indexOf(entrada);
          if (i >= 0) this.cola.splice(i, 1);
          resolve(false);
        }, this.esperaMs),
      };
      this.cola.push(entrada);
    });
  }

  liberar(): void {
    const siguiente = this.cola.shift();
    if (siguiente) {
      clearTimeout(siguiente.temporizador);
      siguiente.resolver(true); // el hueco se cede directamente; `enUso` no cambia
      return;
    }
    this.enUso = Math.max(0, this.enUso - 1);
  }
}
