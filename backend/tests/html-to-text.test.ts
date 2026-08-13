import { describe, it, expect } from 'vitest';
import { htmlATexto } from '../src/services/html-to-text.js';

describe('htmlATexto', () => {
  it('elimina por completo scripts y estilos, incluido su contenido', () => {
    const html = '<html><head><style>body{color:red}</style></head><body><script>alert(1)</script>Hola</body></html>';
    expect(htmlATexto(html, 1000)).toBe('Hola');
  });

  it('quita el resto de etiquetas y colapsa espacios en blanco', () => {
    const html = '<div>  <p>Agenda</p>\n\n<p>del   evento</p>  </div>';
    expect(htmlATexto(html, 1000)).toBe('Agenda del evento');
  });

  it('decodifica entidades HTML comunes', () => {
    expect(htmlATexto('<p>A &amp; B &lt;C&gt; &quot;D&quot; &#39;E&#39;</p>', 1000)).toBe(
      'A & B <C> "D" \'E\'',
    );
  });

  it('recorta el resultado a maxCaracteres', () => {
    const html = `<p>${'x'.repeat(50)}</p>`;
    expect(htmlATexto(html, 10)).toHaveLength(10);
  });

  it('nunca lanza con HTML vacío o malformado', () => {
    expect(htmlATexto('', 100)).toBe('');
    expect(htmlATexto('<div><p>sin cerrar', 100)).toBe('sin cerrar');
  });
});
