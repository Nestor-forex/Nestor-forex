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
// Aquí se responde antes de publicar y con un número: "con esta regla, en los
// últimos 300 días habrían salido N señales y habrían acertado el X%".
//
// A partir de ahora ninguna regla debería entrar a la app sin pasar por aquí.
//
// Cómo evita hacer trampa
// -----------------------
// El error clásico de un backtest es mirar el futuro sin darse cuenta. Aquí se
// evita así: para juzgar el día i, a `computarBarrido` SOLO se le entregan los
// días 0..i. No existe forma de que un indicador vea un precio posterior,
// porque esos días no están en los datos que recibe.
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
import { resolver } from './lib/resolver.mjs'

// Días de arranque que no se juzgan: el EMA50 y el RSI necesitan historia
// antes de valer algo. Empezar en el día 1 mediría sobre todo ruido.
const CALENTAMIENTO = 80

// Los mismos ajustes que usa el vigía, para que esto mida la app de verdad y
// no una prima lejana suya.
const THR = 0.5
const TOP_N = 3
const RB_MINIMO = 1.5

// --------------------------------------------------------------------------
// 1. Recorrido hacia adelante: qué señales habría dado la app cada día.
// --------------------------------------------------------------------------

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave())

const senales = generarSenales(fechas, rates, rangosPar, {
  calentamiento: CALENTAMIENTO,
  thr: THR,
  topN: TOP_N,
})

// --------------------------------------------------------------------------
// 2. Juzgar TODAS contra las velas posteriores, con el resolver de verdad.
// --------------------------------------------------------------------------

const completo = computarBarrido(fechas, rates, rangosPar)
const { resultados } = resolver(senales, completo)
const porClave = new Map(resultados.map((r) => [r.clave, r]))
// El resolver marca la clave como `id@vistoEl`; aquí `vistoEl` es la fecha.
const veredicto = (s) => porClave.get(`${s.id}@${s.vistoEl}`)

// --------------------------------------------------------------------------
// 3. Las variantes. Todas son FILTROS: quitan señales, no cambian los niveles.
//    Eso permite generarlas una sola vez y luego mirar subconjuntos.
// --------------------------------------------------------------------------

// El RSI mide cuánto se ha estirado el movimiento. Comprar por encima de 70 es
// comprar en el techo. Hoy la app lo enseña pero no lo usa para nada: las 5
// señales perdedoras de intradía tenían RSI entre 77 y 86.
const rsiSano = (s) => (s.lado === 'COMPRA' ? s.rsi <= 70 : s.rsi >= 30)

// "Tierra de nadie": el precio ya rompió el extremo de los últimos 20 días, o
// sea que por delante no queda ningún nivel real al que apuntar. En intradía
// ese caso se delata solo porque el objetivo pasa a ser una distancia fija y
// el R/B sale siempre 1.67.
const conNivelDelante = (s) => (s.lado === 'COMPRA' ? s.precio < s.res : s.precio > s.sup)

const VARIANTES = [
  ['1. Las reglas de hoy, tal cual', () => true],
  ['2. + no comprar con RSI>70 / vender con RSI<30', rsiSano],
  ['3. + solo si hay un nivel real por delante', conNivelDelante],
  ['4. + las dos anteriores juntas', (s) => rsiSano(s) && conNivelDelante(s)],
  [`5. + las dos, y solo R/B ≥ ${RB_MINIMO} (lo que despierta el celular)`, (s) => rsiSano(s) && conNivelDelante(s) && s.rr >= RB_MINIMO],
  [`6. Solo el filtro de R/B ≥ ${RB_MINIMO} (lo que hay hoy en los avisos)`, (s) => s.rr >= RB_MINIMO],
]

function medir(lista) {
  let ganadas = 0
  let perdidas = 0
  let pips = 0
  let sinJuzgar = 0
  for (const s of lista) {
    const r = veredicto(s)
    if (!r || (r.resultado !== 'ganada' && r.resultado !== 'perdida')) {
      sinJuzgar++
      continue
    }
    if (r.resultado === 'ganada') ganadas++
    else perdidas++
    pips += r.pips
  }
  const total = ganadas + perdidas
  return { total, ganadas, perdidas, sinJuzgar, pips: Math.round(pips), acierto: total ? (ganadas / total) * 100 : null }
}

// --------------------------------------------------------------------------

console.log('---BACKTEST-INICIO---')
console.log(`Días descargados: ${fechas.length} · de ${fechas[0]} a ${fechas.at(-1)}`)
console.log(`Días medidos: ${fechas.length - CALENTAMIENTO} (los primeros ${CALENTAMIENTO} son de calentamiento)`)
console.log(`Señales que habría dado la app: ${senales.length}`)
console.log('')
console.log('regla                                                          ops   acierto      pips   pips/op')
console.log('─'.repeat(103))

for (const [nombre, filtro] of VARIANTES) {
  const m = medir(senales.filter(filtro))
  const acierto = m.acierto === null ? '   —  ' : `${m.acierto.toFixed(0).padStart(4)}%`
  const porOp = m.total ? (m.pips / m.total).toFixed(1) : '—'
  console.log(
    `${nombre.padEnd(60)} ${String(m.total).padStart(5)}   ${acierto}   ${String(m.pips).padStart(7)}   ${String(porOp).padStart(7)}`
  )
}

console.log('─'.repeat(103))
console.log('')

// El desglose por RSI es el que responde la pregunta concreta de si comprar
// estirado es tan malo como parece.
console.log('¿Importa el RSI al entrar? (solo señales ya juzgadas)')
const tramos = [
  ['COMPRA con RSI > 70 (estirado)', (s) => s.lado === 'COMPRA' && s.rsi > 70],
  ['COMPRA con RSI 50-70', (s) => s.lado === 'COMPRA' && s.rsi > 50 && s.rsi <= 70],
  ['COMPRA con RSI ≤ 50 (retroceso)', (s) => s.lado === 'COMPRA' && s.rsi <= 50],
  ['VENTA con RSI < 30 (estirado)', (s) => s.lado === 'VENTA' && s.rsi < 30],
  ['VENTA con RSI 30-50', (s) => s.lado === 'VENTA' && s.rsi >= 30 && s.rsi < 50],
  ['VENTA con RSI ≥ 50 (retroceso)', (s) => s.lado === 'VENTA' && s.rsi >= 50],
]
for (const [nombre, filtro] of tramos) {
  const m = medir(senales.filter(filtro))
  const acierto = m.acierto === null ? '  —' : `${m.acierto.toFixed(0)}%`
  console.log(`   ${nombre.padEnd(34)} ${String(m.total).padStart(4)} ops   acierto ${acierto.padStart(4)}   ${String(m.pips).padStart(6)} pips`)
}

console.log('')
console.log('Cómo leerlo, y con qué desconfianza:')
console.log(' · "ops" es el número de operaciones. Con menos de ~30 el porcentaje')
console.log('   no significa gran cosa: puede ser suerte.')
console.log(' · Los filtros solo QUITAN operaciones, así que siempre es posible')
console.log('   encontrar uno que borre justo las malas de ESTOS 300 días sin que')
console.log('   sirva de nada en el futuro. Vale la pena un filtro cuando además')
console.log('   tiene una razón de mercado detrás, no solo un número bonito.')
console.log(' · Los pips no descuentan el spread del bróker.')
console.log('---BACKTEST-FIN---')
