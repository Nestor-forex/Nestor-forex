// Banco de pruebas: corre las reglas del barrido sobre los últimos ~300 días
// REALES y dice cuánto habrían acertado.
//
// Por qué existe
// --------------
// Hasta ahora las reglas se escribían porque sonaban razonables, se publicaban
// y se esperaba a ver qué pasaba. Con eso se avanza y se retrocede: cada
// cambio es una apuesta y solo se sabe si fue buena semanas después, con
// dinero de por medio.
//
// Aquí se responde antes de publicar y con un número.
//
// A partir de ahora ninguna regla debería entrar a la app sin pasar por aquí.
//
// Cómo evita hacer trampa
// -----------------------
// El error clásico de un backtest es mirar el futuro sin darse cuenta. Aquí se
// evita así: para juzgar el día i, a `computarBarrido` SOLO se le entregan los
// días 0..i. No existe forma de que un indicador vea un precio posterior,
// porque esos días no están en los datos que recibe. `prueba-backtest.mjs` lo
// comprueba generando las señales sobre medio mercado y sobre el mercado
// entero y exigiendo que el tramo común salga idéntico.
//
// La entrada es el cierre del día en que aparece la señal, y el resultado se
// juzga con las velas POSTERIORES, con el mismo `resolver.mjs` que usa el
// vigía de verdad. Si el resolver se equivoca, se equivoca igual en los dos
// sitios: no hay dos verdades.
//
// Corre en GitHub Actions porque el entorno de la sesión de Claude tiene
// bloqueado api.twelvedata.com:
//   Actions → "Banco de pruebas de las reglas" → Run workflow

import { computarBarrido } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { generarSenales } from './lib/backtest-nucleo.mjs'
import { GEOMETRIAS } from './lib/geometrias.mjs'
import { resolver } from './lib/resolver.mjs'

// Días de arranque que no se juzgan: el EMA50 y el RSI necesitan historia
// antes de valer algo.
const CALENTAMIENTO = 80

// Los mismos ajustes que usa el vigía, para que esto mida la app de verdad y
// no una prima lejana suya.
const THR = 0.5
const TOP_N = 3

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave())
const completo = computarBarrido(fechas, rates, rangosPar)

// --------------------------------------------------------------------------

// Mide una lista de señales ya generadas.
function medir(senales, porClave) {
  let ganadas = 0
  let perdidas = 0
  let pips = 0
  let sinJuzgar = 0
  // Suma de resultados medidos en "veces el riesgo de ESA operación". Se
  // acumula operación por operación, no dividiendo el total de pips entre un
  // riesgo promedio: con riesgos distintos en cada par, el promedio daría un
  // número parecido pero no el correcto.
  let sumaR = 0

  for (const s of senales) {
    const r = porClave.get(`${s.id}@${s.vistoEl}`)
    if (!r || (r.resultado !== 'ganada' && r.resultado !== 'perdida')) {
      sinJuzgar++
      continue
    }
    if (r.resultado === 'ganada') {
      ganadas++
      // Ganó: se llevó exactamente su relación riesgo/beneficio.
      sumaR += s.pipBeneficio / s.pipRiesgo
    } else {
      perdidas++
      // Perdió: se fue al stop, o sea exactamente 1 riesgo.
      sumaR -= 1
    }
    pips += r.pips
  }

  const total = ganadas + perdidas
  return {
    total,
    ganadas,
    sinJuzgar,
    pips: Math.round(pips),
    acierto: total ? (ganadas / total) * 100 : null,
    // Lo que de verdad importa: cuánto se gana o se pierde POR CADA UNIDAD DE
    // RIESGO. Los pips sueltos engañan —100 pips en GBP/JPY no son 100 pips en
    // EUR/CHF— y además dos geometrías con riesgos distintos no se pueden
    // comparar en pips. Esto sí: es el número que dice si el sistema gana.
    //
    // Y es lo que Néstor nota en la cuenta: como el lote se calcula para
    // arriesgar siempre el mismo dinero, +0.20 por operación significa ganar
    // un 20% de lo que se arriesga en cada una, sea el par que sea.
    porRiesgo: total ? sumaR / total : null,
  }
}

// Genera y juzga con una geometría dada.
function correr(geometria) {
  const senales = generarSenales(fechas, rates, rangosPar, {
    calentamiento: CALENTAMIENTO,
    thr: THR,
    topN: TOP_N,
    geometria,
  })
  const { resultados } = resolver(senales, completo)
  return { senales, porClave: new Map(resultados.map((r) => [r.clave, r])) }
}

const fila = (nombre, m) => {
  const acierto = m.acierto === null ? '   —  ' : `${m.acierto.toFixed(0).padStart(4)}%`
  const porR = m.porRiesgo === null ? '    —' : `${m.porRiesgo >= 0 ? '+' : ''}${m.porRiesgo.toFixed(2)}`
  console.log(
    `${nombre.padEnd(46)} ${String(m.total).padStart(5)}   ${acierto}   ${String(m.pips).padStart(7)}   ${porR.padStart(7)}`
  )
}

console.log('---BACKTEST-INICIO---')
console.log(`Días descargados: ${fechas.length} · de ${fechas[0]} a ${fechas.at(-1)}`)
console.log(`Días medidos: ${fechas.length - CALENTAMIENTO} (los primeros ${CALENTAMIENTO} son de calentamiento)`)
console.log('')
console.log('GEOMETRÍA DEL STOP Y EL OBJETIVO')
console.log('Mismas señales en todas: mismos pares, mismo lado, mismo día.')
console.log('Lo ÚNICO que cambia es dónde se pone el stop y el objetivo.')
console.log('')
console.log('geometría                                        ops   acierto      pips   por 1R')
console.log('─'.repeat(86))

const resultadosPorGeometria = []
for (const [nombre, geo] of GEOMETRIAS) {
  const { senales, porClave } = correr(geo)
  const m = medir(senales, porClave)
  fila(nombre, m)
  resultadosPorGeometria.push({ nombre, geo, senales, porClave, m })
}
console.log('─'.repeat(86))
console.log('')
console.log('"por 1R" = cuánto se gana o se pierde por cada unidad de riesgo.')
console.log('Es LA columna: los pips sueltos no se pueden comparar entre geometrías')
console.log('con riesgos distintos. Positivo = el sistema gana. Negativo = pierde.')

// --------------------------------------------------------------------------
// Por qué sangran las ventas. En la medición anterior se llevaban el 87% de la
// pérdida y no sabíamos si era el mercado de estos meses o un fallo de la
// fórmula. Si fuera la fórmula, cambiar la geometría lo arreglaría; si es el
// mercado, las ventas seguirán perdiendo con TODAS las geometrías.
// --------------------------------------------------------------------------

console.log('')
console.log('COMPRAS vs VENTAS, con cada geometría')
console.log('')
console.log('geometría                                        lado     ops   acierto   por 1R')
console.log('─'.repeat(86))
for (const { nombre, senales, porClave } of resultadosPorGeometria) {
  for (const lado of ['COMPRA', 'VENTA']) {
    const m = medir(
      senales.filter((s) => s.lado === lado),
      porClave
    )
    const acierto = m.acierto === null ? '   —  ' : `${m.acierto.toFixed(0).padStart(4)}%`
    const porR = m.porRiesgo === null ? '    —' : `${m.porRiesgo >= 0 ? '+' : ''}${m.porRiesgo.toFixed(2)}`
    console.log(`${nombre.padEnd(46)} ${lado.padEnd(8)} ${String(m.total).padStart(4)}   ${acierto}   ${porR.padStart(7)}`)
  }
}
console.log('─'.repeat(86))
console.log('')
console.log('Si las ventas pierden con TODAS las geometrías, el problema no es')
console.log('dónde se pone el stop: es que en estos meses vender no funcionaba,')
console.log('o que la forma de elegir QUÉ vender está mal. Son arreglos distintos.')

// --------------------------------------------------------------------------
// Con la mejor geometría, ¿aportan algo los filtros? Se mira DESPUÉS de elegir
// geometría a propósito: un filtro que tapa los agujeros de una fórmula mala
// no dice nada útil.
// --------------------------------------------------------------------------

const mejor = resultadosPorGeometria.reduce((a, b) => ((b.m.porRiesgo ?? -99) > (a.m.porRiesgo ?? -99) ? b : a))

console.log('')
console.log(`FILTROS, sobre la mejor geometría (${mejor.nombre.trim()})`)
console.log('')
console.log('filtro                                           ops   acierto      pips   por 1R')
console.log('─'.repeat(86))

const rsiSano = (s) => (s.lado === 'COMPRA' ? s.rsi <= 70 : s.rsi >= 30)
const FILTROS = [
  ['Sin filtro', () => true],
  ['No comprar con RSI>70 / vender con RSI<30', rsiSano],
  ['Solo COMPRA con RSI 50-70', (s) => s.lado === 'COMPRA' && s.rsi > 50 && s.rsi <= 70],
  ['Solo COMPRA (nada de ventas)', (s) => s.lado === 'COMPRA'],
]
for (const [nombre, f] of FILTROS) {
  fila(nombre, medir(mejor.senales.filter(f), mejor.porClave))
}
console.log('─'.repeat(86))

console.log('')
console.log('Cómo leerlo, y con qué desconfianza:')
console.log(' · Con menos de ~30 operaciones el porcentaje puede ser suerte.')
console.log(' · Los filtros solo QUITAN operaciones, así que siempre es posible')
console.log('   encontrar uno que borre justo las malas de ESTOS 300 días sin que')
console.log('   sirva de nada en el futuro. Vale la pena un filtro cuando además')
console.log('   tiene una razón de mercado detrás, no solo un número bonito.')
console.log(' · Los pips no descuentan el spread del bróker.')
console.log(' · Son 10 meses. Un mercado distinto puede dar la vuelta a esto.')
console.log('---BACKTEST-FIN---')
