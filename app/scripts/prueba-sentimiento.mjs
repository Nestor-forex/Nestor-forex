// Comprobaciones del lector de robots.txt. SIN INTERNET.
//
//     node scripts/prueba-sentimiento.mjs
//
// ⚠️ POR QUÉ ESTO EXISTE. Un fallo interpretando un robots.txt **no se ve**:
// devuelve un veredicto perfectamente creíble. Y el veredicto decide si una
// fuente se descarta o si se le pide el dato, así que equivocarse hacia
// «permitido» significa pedir algo que nos habían dicho que no.
//
// Los casos de abajo no son inventados al azar: cada uno es una forma concreta
// en que un analizador ingenuo se equivoca.

import { decidirConRobots } from './lib/robots.mjs'
import { veredictoBusqueda } from './lib/sitemaps.mjs'

let hechas = 0
let fallos = 0
const ok = (cond, que) => {
  hechas++
  if (cond) return true
  fallos++
  console.error(`  ✗ ${que}`)
  return false
}

const prohibe = (r) => r.veredicto === '⛔ LO PROHÍBE'
const permite = (r) => r.veredicto === 'no lo prohíbe'
const nose = (r) => r.veredicto === 'no se sabe'

console.log('1. Ante la duda, «no se sabe» — NUNCA «permitido»')
{
  const U = 'https://ejemplo.com/datos'
  ok(nose(decidirConRobots('', U)), 'un robots.txt vacío es «no se sabe»')
  ok(nose(decidirConRobots('   \n  \n', U)), 'solo espacios, también')
  ok(nose(decidirConRobots(null, U)), 'null es «no se sabe», no permitido')
  ok(nose(decidirConRobots(undefined, U)), 'undefined, igual')
  ok(nose(decidirConRobots(42, U)), 'un número es «no se sabe»')
  ok(nose(decidirConRobots('User-agent: *\nDisallow: /', 'no-es-una-url')), 'una dirección ilegible es «no se sabe»')
}

console.log('2. Lo básico')
{
  const R = 'User-agent: *\nDisallow: /privado/\n'
  ok(prohibe(decidirConRobots(R, 'https://x.com/privado/cosa')), 'la ruta prohibida sale prohibida')
  ok(permite(decidirConRobots(R, 'https://x.com/publico/cosa')), 'otra ruta no')
  ok(prohibe(decidirConRobots('User-agent: *\nDisallow: /', 'https://x.com/lo-que-sea')), '«Disallow: /» lo prohíbe todo')
}

console.log('3. ⚠️ Un «Disallow:» VACÍO significa «no prohíbo nada»')
{
  // El fallo clásico: como cadena vacía es el prefijo de TODO, un analizador
  // ingenuo lo trata como «Disallow: /» y prohíbe el sitio entero — justo lo
  // contrario de lo que dice.
  const R = 'User-agent: *\nDisallow:\n'
  ok(permite(decidirConRobots(R, 'https://x.com/lo-que-sea')), 'un Disallow vacío NO prohíbe nada')
}

console.log('4. ⚠️ Gana el prefijo MÁS LARGO, no el primero que coincida')
{
  // Con «el primero que coincida» este caso saldría prohibido, y es al revés:
  // el Allow es más específico.
  const R = 'User-agent: *\nDisallow: /api/\nAllow: /api/publico/\n'
  ok(permite(decidirConRobots(R, 'https://x.com/api/publico/datos.json')), 'el Allow más específico gana al Disallow amplio')
  ok(prohibe(decidirConRobots(R, 'https://x.com/api/privado/datos.json')), 'y el resto de /api/ sigue prohibido')

  // Y al revés: el orden dentro del archivo no debe importar.
  const R2 = 'User-agent: *\nAllow: /api/publico/\nDisallow: /api/\n'
  ok(permite(decidirConRobots(R2, 'https://x.com/api/publico/datos.json')), 'el orden de las líneas no cambia el veredicto')
}

console.log('5. ⚠️ Solo cuentan las reglas de «User-agent: *»')
{
  const R = 'User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nAllow: /\n'
  ok(permite(decidirConRobots(R, 'https://x.com/datos')), 'lo que le prohíben a Googlebot no nos toca')

  const R2 = 'User-agent: *\nDisallow: /datos\n\nUser-agent: Bingbot\nAllow: /datos\n'
  ok(prohibe(decidirConRobots(R2, 'https://x.com/datos')), 'ni lo que le permiten a Bingbot nos salva')
}

console.log('6. ⚠️ Varios «User-agent» seguidos COMPARTEN el bloque de reglas')
{
  // Es la forma estándar de agrupar, y un analizador que apaga el bloque en
  // cuanto ve un agente que no es «*» se saltaría el Disallow entero.
  const R = 'User-agent: Googlebot\nUser-agent: *\nDisallow: /datos\n'
  ok(prohibe(decidirConRobots(R, 'https://x.com/datos')), 'el «*» agrupado con otro agente SÍ nos afecta')

  // Y la inversa: después de una regla, un User-agent nuevo abre bloque nuevo.
  const R2 = 'User-agent: *\nDisallow: /uno\nUser-agent: Otro\nDisallow: /dos\n'
  ok(prohibe(decidirConRobots(R2, 'https://x.com/uno')), 'la regla del bloque «*» sigue valiendo')
  ok(permite(decidirConRobots(R2, 'https://x.com/dos')), 'la del bloque siguiente NO es nuestra')
}

console.log('7. Comentarios, mayúsculas y espacios')
{
  const R = '# esto es un comentario\nUSER-AGENT:  *  \nDISALLOW:  /datos   # y esto también\n'
  ok(prohibe(decidirConRobots(R, 'https://x.com/datos')), 'mayúsculas, espacios de sobra y comentarios no estorban')
  ok(permite(decidirConRobots('# solo un comentario\n', 'https://x.com/datos')), 'un archivo de solo comentarios no prohíbe nada')
}

console.log('8. La ruta incluye lo que va después del «?»')
{
  // Varias de las candidatas llevan los parámetros en la dirección
  // (`index.php?path=sentiment_index`), así que mirar solo el pathname
  // dejaría fuera justo la parte que identifica el dato.
  const R = 'User-agent: *\nDisallow: /index.php?path=sentiment\n'
  ok(
    prohibe(decidirConRobots(R, 'https://x.com/index.php?path=sentiment_index&instrument=EUR/USD')),
    'la parte de después del «?» cuenta',
  )
}

console.log('9. El comodín final «*» se trata como prefijo')
{
  const R = 'User-agent: *\nDisallow: /priv*\n'
  ok(prohibe(decidirConRobots(R, 'https://x.com/privado/x')), '«/priv*» prohíbe todo lo que empiece por /priv')
  ok(permite(decidirConRobots(R, 'https://x.com/publico/x')), 'y no toca lo demás')
}

console.log('10. Siempre dice POR QUÉ')
{
  // Un veredicto sin motivo obliga a quien lo lee a fiarse. Y aquí el motivo
  // es lo que una persona va a contrastar con las condiciones de uso.
  for (const caso of [
    ['User-agent: *\nDisallow: /a', 'https://x.com/a'],
    ['User-agent: *\nAllow: /a', 'https://x.com/a'],
    ['User-agent: *\nDisallow: /otra', 'https://x.com/a'],
    ['', 'https://x.com/a'],
  ]) {
    const r = decidirConRobots(caso[0], caso[1])
    ok(typeof r.porque === 'string' && r.porque.length > 5, `el veredicto "${r.veredicto}" viene con motivo`)
  }
}

console.log('11. ⚠️⚠️ «No encontré» y «no pude mirar» NO son lo mismo')
{
  // Este bloque existe por un fallo REAL del 2026-09-14: la sonda dijo
  // «ninguna página con esas palabras» sobre AvaTrade habiendo leído CERO
  // páginas, porque sus cinco sitemaps dieron 403. El informe afirmaba «no la
  // publican» cuando lo que pasó es que no se pudo mirar.
  const nada = veredictoBusqueda({ leidos: 5, fallidos: 5, paginas: 0, encontradas: [] })
  ok(nada.estado === 'no-se-pudo', `con 0 páginas el estado debe ser «no-se-pudo» y fue «${nada.estado}»`)
  ok(/NO SE PUDO MIRAR/.test(nada.texto), 'y lo dice con esas palabras')
  ok(!/[Nn]inguna/.test(nada.texto), '⚠️ y NO usa la palabra «ninguna», que se leería como un hallazgo')
  ok(nada.texto.includes('5'), 'nombra cuántos archivos fallaron, para que se vea por qué')

  // El caso legítimo: sí se miró, y de verdad no hay.
  const vacio = veredictoBusqueda({ leidos: 3, fallidos: 0, paginas: 4000, encontradas: [] })
  ok(vacio.estado === 'sin-coincidencias', 'con páginas leídas y cero coincidencias, «sin-coincidencias»')
  ok(vacio.texto.includes('4000'), 'dice cuántas páginas miró — sin eso el «ninguna» no vale nada')
  ok(!/NO SE PUDO/.test(vacio.texto), 'y no se confunde con el caso anterior')
  ok(/NO demuestra que no exista/.test(vacio.texto), 'y sigue llevando su límite escrito')

  // Un tope alcanzado también tiene que decirse: la búsqueda no fue completa.
  const cortado = veredictoBusqueda({ leidos: 25, fallidos: 0, paginas: 900, encontradas: [], pendientes: 12 })
  ok(/12 archivos sin leer/.test(cortado.texto), 'si quedaron archivos sin leer, lo dice')
  ok(/NO fue completa/.test(cortado.texto), 'y avisa de que la búsqueda no fue completa')

  // Y el caso bueno.
  const hay = veredictoBusqueda({
    leidos: 2,
    paginas: 100,
    encontradas: ['https://x.com/a/sentiment', 'https://x.com/b/sentiment', 'https://x.com/a/sentiment'],
  })
  ok(hay.estado === 'hay-candidatas', 'con coincidencias, «hay-candidatas»')
  ok(hay.hallazgos.length === 2, `las repetidas se juntan: esperaba 2 y salieron ${hay.hallazgos.length}`)

  // Robustez: sin argumentos no revienta, y cae del lado seguro.
  ok(veredictoBusqueda().estado === 'no-se-pudo', 'sin argumentos cae en «no-se-pudo», no en «no existe»')
  ok(veredictoBusqueda({ paginas: 5, encontradas: null }).estado === 'sin-coincidencias', 'encontradas null no revienta')
}

console.log('')
if (fallos) {
  console.error(`✗ ${fallos} de ${hechas} comprobaciones fallaron.`)
  process.exit(1)
}
console.log(`✓ todo bien (${hechas} comprobaciones).`)
