// Comprueba las cuentas de la sonda de noticias (fase 4, 2026-11-13). Sin internet.
//
// Lo que vigila, en orden de lo que más cuesta si se rompe:
//   1. Que «no pude abrirlo» no se lea nunca como «no sirve» (ni como «sirve»).
//   2. Que una noticia sin fecha NO salga con la fecha de hoy ni de 1970.
//   3. Que un canal parado, que sigue respondiendo 200, no pase por vivo.
//   4. Que se lean RSS y Atom de verdad, con CDATA y entidades.

import { readFileSync } from 'node:fs'
import { PROHIBE, NO_PROHIBE, NO_SE_SABE } from './lib/robots.mjs'
import {
  leerCanal,
  leerFecha,
  limpiarTexto,
  divisasDe,
  veredictoFuente,
  veredictoGeneral,
  HORAS_FRESCA,
  MIN_ENTRADAS,
} from './lib/noticias.mjs'

let fallos = 0
const ok = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

const AHORA = Date.parse('2026-11-13T18:00:00Z')
const rss = (items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>X</title>${items}</channel></rss>`
const item = (t, link, fecha) =>
  `<item><title>${t}</title>${link ? `<link>${link}</link>` : ''}${fecha ? `<pubDate>${fecha}</pubDate>` : ''}</item>`

console.log('\n1 · Leer RSS')
{
  const c = leerCanal(
    rss(
      item('<![CDATA[EUR/USD cae tras el BCE]]>', 'https://a.com/1', 'Fri, 13 Nov 2026 15:00:00 GMT') +
        item('Fed &amp; dólar', 'https://a.com/2', 'Fri, 13 Nov 2026 14:00:00 +0000') +
        item('Sin fecha', 'https://a.com/3', ''),
    ),
  )
  ok(c.formato === 'rss' && c.entradas.length === 3, `formato rss y 3 entradas (${c.formato}, ${c.entradas.length})`)
  ok(c.entradas[0].titulo === 'EUR/USD cae tras el BCE', 'quita el CDATA')
  ok(c.entradas[1].titulo === 'Fed & dólar', 'traduce las entidades')
  ok(c.entradas[0].fecha === Date.parse('2026-11-13T15:00:00Z'), 'lee la fecha RFC 822')
  ok(c.entradas[2].fecha === null, '⚠️ sin fecha → null, nunca «ahora»')
  // El enlace solo en <guid isPermaLink="true">.
  const g = leerCanal(rss('<item><title>A</title><guid isPermaLink="true">https://g.com/x</guid><pubDate>Fri, 13 Nov 2026 10:00:00 GMT</pubDate></item>'))
  ok(g.entradas[0].enlace === 'https://g.com/x', 'toma el enlace del guid permanente')
}

console.log('\n2 · Leer Atom')
{
  const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>B</title>
    <entry><title type="html">Yen &lt;b&gt;fuerte&lt;/b&gt;</title>
      <link rel="replies" href="https://b.com/1#comentarios"/>
      <link rel="alternate" href="https://b.com/1"/>
      <updated>2026-11-13T12:00:00Z</updated></entry>
    <entry><title>Dos</title><link href="https://b.com/2"/><published>2026-11-12T12:00:00Z</published></entry>
  </feed>`
  const c = leerCanal(atom)
  ok(c.formato === 'atom' && c.entradas.length === 2, `formato atom y 2 entradas (${c.formato}, ${c.entradas.length})`)
  ok(c.entradas[0].enlace === 'https://b.com/1', 'prefiere el enlace «alternate», no el de comentarios')
  ok(c.entradas[1].enlace === 'https://b.com/2', 'sin rel, toma el único')
  ok(c.entradas[0].fecha === Date.parse('2026-11-13T12:00:00Z'), 'lee <updated>')
  ok(c.entradas[1].fecha === Date.parse('2026-11-12T12:00:00Z'), 'y <published>')
}

console.log('\n3 · Lo que no es un canal')
ok(leerCanal('<html><body>hola</body></html>').formato === null, 'una página HTML no es un canal')
ok(leerCanal('').formato === null && leerCanal(null).entradas.length === 0, 'vacío → nada')
ok(leerFecha('') === null && leerFecha(null) === null && leerFecha('   ') === null, '⚠️ fecha vacía → null, nunca 1970')
ok(leerFecha('mañana') === null, 'fecha ilegible → null')
ok(limpiarTexto('a&#39;b &#x2014; c') === "a'b — c", 'entidades numéricas')

console.log('\n4 · ¿Nombra una de nuestras divisas? (solo para contar)')
ok(divisasDe('EUR/USD slides as ECB holds').join() === 'USD,EUR', 'EUR/USD y BCE')
ok(divisasDe('Bank of Japan keeps rates').join() === 'JPY', 'Banco de Japón')
ok(divisasDe('Oil prices rise').length === 0, 'el petróleo no es una divisa nuestra')
ok(divisasDe('Kiwi rallies').join() === 'NZD', '«kiwi» es el NZD')

console.log('\n5 · El veredicto de una fuente')
{
  const fresco = (n, sinFecha = 0) =>
    leerCanal(
      rss(
        Array.from({ length: n }, (_, i) =>
          item(`Titular ${i}`, `https://c.com/${i}`, i < sinFecha ? '' : new Date(AHORA - (i + 1) * 3_600_000).toUTCString()),
        ).join(''),
      ),
    )
  const sirve = veredictoFuente({ http: 200, robots: NO_PROHIBE, canal: fresco(10), ahora: AHORA })
  ok(sirve.estado === 'sirve', `diez titulares frescos con fecha y enlace → sirve (${sirve.motivo})`)
  ok(veredictoFuente({ http: 200, robots: NO_SE_SABE, canal: fresco(10), ahora: AHORA }).estado === 'sirve', 'sin robots.txt legible no se tumba (robots solo descarta)')

  ok(veredictoFuente({ http: 403, robots: NO_PROHIBE, canal: null }).estado === 'no-se-pudo', '⚠️ un 403 es «no se pudo», NO «no sirve»')
  ok(veredictoFuente({ http: null, robots: NO_PROHIBE, canal: null }).estado === 'no-se-pudo', 'sin respuesta → no se pudo')
  ok(veredictoFuente({ http: 200, robots: NO_PROHIBE, canal: leerCanal('<html></html>') }).estado === 'no-se-pudo', '200 con una página que no es canal → no se pudo')
  ok(veredictoFuente({ http: 200, robots: PROHIBE, canal: fresco(10), ahora: AHORA }).estado === 'no-sirve', 'robots.txt lo prohíbe → no sirve')

  ok(veredictoFuente({ http: 200, robots: NO_PROHIBE, canal: fresco(MIN_ENTRADAS - 1), ahora: AHORA }).estado === 'no-sirve', `menos de ${MIN_ENTRADAS} titulares → no sirve`)
  ok(veredictoFuente({ http: 200, robots: NO_PROHIBE, canal: fresco(10, 5), ahora: AHORA }).estado === 'no-sirve', 'la mitad sin fecha → no sirve')
  ok(veredictoFuente({ http: 200, robots: NO_PROHIBE, canal: fresco(10, 1), ahora: AHORA }).estado === 'sirve', 'una sola sin fecha entre diez no tumba el canal')

  const parado = leerCanal(rss(Array.from({ length: 5 }, (_, i) => item(`V${i}`, `https://d.com/${i}`, new Date(AHORA - (HORAS_FRESCA + 5 + i) * 3_600_000).toUTCString())).join('')))
  const vParado = veredictoFuente({ http: 200, robots: NO_PROHIBE, canal: parado, ahora: AHORA })
  ok(vParado.estado === 'no-sirve' && /parado/.test(vParado.motivo), `⚠️ un canal parado responde 200 y NO pasa por vivo (${vParado.motivo})`)

  const sinEnlace = leerCanal(rss(Array.from({ length: 5 }, (_, i) => item(`S${i}`, '', new Date(AHORA - 3_600_000).toUTCString())).join('')))
  ok(veredictoFuente({ http: 200, robots: NO_PROHIBE, canal: sinEnlace, ahora: AHORA }).estado === 'no-sirve', 'sin enlaces → no sirve (no se puede comprobar)')
}

console.log('\n6 · El veredicto de la sonda entera')
ok(veredictoGeneral([]).estado === 'no-se-pudo', 'sin resultados → no se pudo mirar')
ok(veredictoGeneral([{ id: 'a', estado: 'no-se-pudo' }, { id: 'b', estado: 'no-se-pudo' }]).estado === 'no-se-pudo', '⚠️ todo «no se pudo» → no se pudo, NUNCA «no hay fuentes»')
ok(veredictoGeneral([{ id: 'a', estado: 'no-sirve' }, { id: 'b', estado: 'no-se-pudo' }]).estado === 'ninguna-sirve', 'leídas y ninguna sirve → eso sí es un hallazgo')
const g = veredictoGeneral([{ id: 'a', estado: 'sirve' }, { id: 'b', estado: 'no-sirve' }])
ok(g.estado === 'hay-fuentes' && g.sirven.join() === 'a', 'con una que sirve → la nombra')

console.log('\n7 · Cableado de la sonda')
{
  const s = readFileSync(new URL('./sonda-noticias.mjs', import.meta.url), 'utf8')
  ok(/import \{[^}]*\bPROHIBE\b[^}]*\} from '\.\/lib\/robots\.mjs'/.test(s), 'compara robots.txt contra la constante de robots.mjs')
  ok(!/=== ['"]proh/i.test(s), 'y no contra una palabra escrita a mano (el fallo del 2026-10-22)')
  ok(/veredictoGeneral\(/.test(s) && /veredictoFuente\(/.test(s), 'el veredicto lo calcula la librería, no el guion')
  ok(!/TWELVEDATA_KEY|leerLlave/.test(s), 'no usa ninguna llave')
  ok(/NestorForexSwing\/1\.0/.test(s), 'se presenta con un User-Agent honesto')
}

console.log(fallos ? `\n✗ ${fallos} comprobación(es) fallaron` : '\n✓ todo bien')
process.exit(fallos ? 1 : 0)
