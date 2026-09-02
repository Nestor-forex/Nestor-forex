// Prueba de los indicadores contra valores de referencia. Sin internet:
//
//     node scripts/prueba-indicadores.mjs
//
// POR QUÉ EXISTE ESTE ARCHIVO
// ---------------------------
// El RSI, el ATR y las medias son la base de TODO lo demás: de ellos salen el
// stop, el objetivo, la relación riesgo/beneficio y qué pares se proponen. Si
// uno se desvía, no se rompe nada visible — simplemente las señales empiezan a
// estar mal y el historial mide otra cosa. Es el peor tipo de error: silencioso
// y en el sitio donde más duele.
//
// Hasta ahora NADA los comprobaba. Estaban bien —se verificó uno por uno contra
// la referencia— pero estaban bien por buen trabajo, no por protección:
// cualquiera podía cambiar una línea y romperlos sin que ninguna prueba, ni el
// compilador, ni el revisor de código dijeran una palabra.
//
// DE DÓNDE SALEN LOS NÚMEROS ESPERADOS
// ------------------------------------
// De dos sitios independientes, nunca del propio código:
//
//   1. El juego de cierres de abajo es el ejemplo clásico de Welles Wilder
//      ("New Concepts in Technical Trading Systems", 1978), el hombre que
//      inventó el RSI y el ATR. Es el mismo que reproducen StockCharts y
//      prácticamente toda la literatura, y su primer valor de RSI —70,53— es
//      público y comprobable.
//
//   2. Los demás valores se calcularon con una implementación aparte, escrita
//      desde la DEFINICIÓN del indicador y no copiada de este código. Que dos
//      implementaciones distintas coincidan hasta el sexto decimal es una
//      prueba de verdad; comparar el código consigo mismo no prueba nada.
//
// Para el ATR hay además casos construidos a mano cuyo resultado se puede
// verificar con lápiz y papel, que es la comprobación más fuerte de todas.

import { emaLast, atrWilder, rsi } from '../src/lib/marketCalc.js'

let fallos = 0
const cerca = (obtenido, esperado, tol, que) => {
  const bien = Math.abs(obtenido - esperado) <= tol
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) {
    console.log(`      obtenido ${obtenido}, esperado ${esperado} (tolerancia ${tol})`)
    fallos++
  }
}
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

// Los 33 cierres del ejemplo de Wilder.
const CIERRES = [
  44.3389, 44.0902, 44.1497, 43.6124, 44.3278, 44.8264, 45.0955, 45.4245,
  45.8433, 46.0826, 45.8931, 46.0328, 45.614, 46.282, 46.282, 46.0028,
  46.0328, 46.4116, 46.2222, 45.6439, 46.2122, 46.2521, 45.7137, 46.4515,
  45.7835, 45.3548, 44.0288, 44.1783, 44.2181, 44.5672, 43.4205, 42.6628,
  43.1314,
]

// --- 1. RSI ---------------------------------------------------------------

console.log('\n1. RSI(14) contra el ejemplo de Wilder')
{
  // 70,53 es EL número publicado para este juego de datos. Si esta línea falla,
  // el RSI de la app dejó de ser el RSI y todas las señales están afectadas.
  cerca(rsi(CIERRES.slice(0, 15)), 70.532789, 1e-5, 'primer valor: 70,53 (el que publica la literatura)')
  cerca(rsi(CIERRES.slice(0, 20)), 57.974856, 1e-5, 'con 20 cierres, ya suavizando')
  cerca(rsi(CIERRES), 37.772952, 1e-5, 'con los 33 cierres')
}

console.log('\n2. El RSI se comporta como debe en los extremos')
{
  const soloSube = Array.from({ length: 40 }, (_, i) => 100 + i)
  const soloBaja = Array.from({ length: 40 }, (_, i) => 100 - i)
  cerca(rsi(soloSube), 100, 1e-9, 'un precio que solo sube da 100')
  cerca(rsi(soloBaja), 0, 1e-9, 'un precio que solo baja da 0')
  const r = rsi(CIERRES)
  comprobar(r > 0 && r < 100, 'un precio normal cae entre 0 y 100')
}

// --- 3. Medias ------------------------------------------------------------

console.log('\n3. Las medias exponenciales (EMA)')
{
  cerca(emaLast(CIERRES, 10), 44.120148, 1e-5, 'EMA(10)')
  cerca(emaLast(CIERRES, 20), 44.636446, 1e-5, 'EMA(20)')

  // Una media de un precio constante tiene que dar ese mismo precio, siempre.
  const plano = Array(50).fill(1.2345)
  cerca(emaLast(plano, 20), 1.2345, 1e-12, 'de un precio constante devuelve ese precio')

  // Y la corta reacciona antes que la larga: si el precio sube al final, la
  // EMA20 tiene que quedar por encima de la EMA50. Es la base de cómo la app
  // decide si hay tendencia — si esto se invirtiera, compraría en las caídas.
  const sube = [...Array(60).fill(1.0), ...Array.from({ length: 20 }, (_, i) => 1.0 + (i + 1) * 0.01)]
  comprobar(emaLast(sube, 20) > emaLast(sube, 50), 'la EMA corta reacciona antes que la larga al subir')
  const baja = [...Array(60).fill(1.0), ...Array.from({ length: 20 }, (_, i) => 1.0 - (i + 1) * 0.01)]
  comprobar(emaLast(baja, 20) < emaLast(baja, 50), 'y al bajar, al revés')
}

// --- 4. ATR ---------------------------------------------------------------
//
// Aquí los esperados se calculan con lápiz y papel, que es más fuerte que
// cualquier tabla publicada.

console.log('\n4. El ATR de Wilder, sobre casos calculables a mano')
{
  // 20 velas con rango de exactamente 2.0 y sin huecos entre ellas: pase lo que
  // pase con el suavizado, la media de un montón de doses es dos.
  const n = 20
  cerca(
    atrWilder(Array(n).fill(101), Array(n).fill(99), Array(n).fill(100)),
    2.0,
    1e-12,
    'con un rango constante de 2,0 devuelve exactamente 2,0'
  )

  // EL CASO QUE JUSTIFICA USAR WILDER Y NO UNA RESTA DE CIERRES.
  //
  // Si el precio salta de 100 a 120 de un día para otro, el movimiento real de
  // ese día NO es su rango interno (1), son los 20,5 de distancia desde el
  // cierre anterior. Un ATR que no cuente el hueco subestima el riesgo, y de
  // ahí sale un stop demasiado estrecho.
  //
  // TR de las 13 primeras velas = 1 cada una.
  // TR de la última = max(120-119, |120-99.5|, |119-99.5|) = 20,5.
  // ATR = (13·1 + 20,5) / 14
  const h = [...Array(14).fill(100), 120]
  const l = [...Array(14).fill(99), 119]
  const c = [...Array(14).fill(99.5), 119.5]
  cerca(atrWilder(h, l, c), (13 * 1 + 20.5) / 14, 1e-12, 'cuenta el hueco entre velas, no solo el rango del día')

  // Un mercado que se mueve el doble tiene que dar un ATR del doble. Si esta
  // proporción se rompiera, los stops dejarían de escalar con la volatilidad.
  const m = 30
  const normal = atrWilder(Array(m).fill(101), Array(m).fill(99), Array(m).fill(100))
  const doble = atrWilder(Array(m).fill(102), Array(m).fill(98), Array(m).fill(100))
  cerca(doble / normal, 2, 1e-9, 'el doble de movimiento da el doble de ATR')

  comprobar(atrWilder([1, 2], [0, 1], [0.5, 1.5]) === 0, 'con menos velas que el periodo devuelve 0 en vez de un número inventado')
}

// --- 5. Nada de esto depende del orden en que se llame --------------------
//
// Suena obvio, pero un indicador que guardara estado entre llamadas daría
// resultados distintos según el orden de los pares, y eso sería imposible de
// depurar mirando el barrido.

console.log('\n5. Llamarlos dos veces da lo mismo')
{
  comprobar(rsi(CIERRES) === rsi(CIERRES), 'el RSI no guarda estado')
  comprobar(emaLast(CIERRES, 20) === emaLast(CIERRES, 20), 'la EMA tampoco')
  const h = Array(20).fill(101)
  const l = Array(20).fill(99)
  const c = Array(20).fill(100)
  comprobar(atrWilder(h, l, c) === atrWilder(h, l, c), 'el ATR tampoco')
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'Los indicadores coinciden con la referencia.')
process.exit(fallos ? 1 : 0)
