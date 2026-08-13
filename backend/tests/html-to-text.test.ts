import { describe, it, expect } from 'vitest';
import { htmlATexto, extraerDatosEmbebidos } from '../src/services/html-to-text.js';

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

describe('extraerDatosEmbebidos', () => {
  const evento = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'AI Conf',
    startDate: '2027-06-09',
  });

  it('incluye un <script type="application/ld+json"> con JSON válido', () => {
    const html = `<script type="application/ld+json">${evento}</script>`;
    expect(extraerDatosEmbebidos(html)).toEqual([evento]);
  });

  it('incluye un <script> genérico (sin type) cuyo contenido es JSON válido', () => {
    const html = `<script id="__NEXT_DATA__">${evento}</script>`;
    expect(extraerDatosEmbebidos(html)).toEqual([evento]);
  });

  it('antepone los application/ld+json a otros candidatos JSON válidos', () => {
    const otro = JSON.stringify({ algo: 'x'.repeat(40) });
    const html = `<script>${otro}</script><script type="application/ld+json">${evento}</script>`;
    expect(extraerDatosEmbebidos(html)).toEqual([evento, otro]);
  });

  it('ignora scripts con src (externos)', () => {
    const html = `<script src="/app.js" type="application/ld+json">${evento}</script>`;
    expect(extraerDatosEmbebidos(html)).toEqual([]);
  });

  it('ignora scripts cuyo contenido no es JSON válido (código JS normal)', () => {
    const html = `<script>${'a'.repeat(40)} function f() { return {ok:true} }</script>`;
    expect(extraerDatosEmbebidos(html)).toEqual([]);
  });

  it('ignora el formato de streaming de Next.js App Router (no es JSON de nivel superior)', () => {
    const html = `<script>self.__next_f.push([1,${JSON.stringify('1:"$Sreact.fragment"\ndatos de sesión'.repeat(3))}])</script>`;
    expect(extraerDatosEmbebidos(html)).toEqual([]);
  });

  it('ignora candidatos por debajo del tamaño mínimo (ruido de scripts triviales)', () => {
    const html = '<script>{}</script>';
    expect(extraerDatosEmbebidos(html)).toEqual([]);
  });

  it('nunca lanza con HTML vacío o sin scripts', () => {
    expect(extraerDatosEmbebidos('')).toEqual([]);
    expect(extraerDatosEmbebidos('<p>sin scripts aquí</p>')).toEqual([]);
  });
});

describe('htmlATexto — integración con datos embebidos (FR-014, research.md R11)', () => {
  it('antepone los candidatos JSON embebidos al texto visible', () => {
    const evento = JSON.stringify({ '@type': 'Event', name: 'AI Conf', startDate: '2027-06-09' });
    const html = `<script type="application/ld+json">${evento}</script><body><p>Bienvenido</p></body>`;
    expect(htmlATexto(html, 1000)).toBe(`${evento}\n\nBienvenido`);
  });

  it('respeta maxCaracteres sobre el conjunto combinado (candidatos + texto visible)', () => {
    const evento = JSON.stringify({ '@type': 'Event', name: 'x'.repeat(80) });
    const html = `<script type="application/ld+json">${evento}</script><p>Texto visible</p>`;
    const resultado = htmlATexto(html, 20);
    expect(resultado).toHaveLength(20);
    expect(resultado).toBe(evento.slice(0, 20));
  });

  it('sin candidatos válidos, se comporta igual que antes (solo texto visible)', () => {
    const html = '<script>alert(1)</script><p>Solo texto</p>';
    expect(htmlATexto(html, 1000)).toBe('Solo texto');
  });
});
