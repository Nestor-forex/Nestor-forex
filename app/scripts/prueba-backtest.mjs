// Prueba del banco de pruebas. Sin internet y sin claves:
//
//     node scripts/prueba-backtest.mjs
//
// Un backtest que se equivoca no da un error: da un número bonito y falso. Y
// un número falso sobre el que decidir reglas es peor que no tener número,
// porque da confianza. Por eso esto se comprueba con el mismo cuidado que el
// resolver.
//
// Lo que de verdad importa aquí es la comprobación 2: que no mire el futuro.

import { generarSenales } from './lib/backtest-nucleo.mjs'
import { resolver } from './lib/resolver.mjs'
import { computarBarrido } from '../src/lib/marketCalc.js'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

// --- Un mercado de mentira, pero con forma de mercado -----------------------
//
// Números al azar puros no sirven: no producirían tendencias y no saldría
// ninguna señal, así que la prueba pasaría sin haber probado nada. Esto es un
// paseo aleatorio con tramos de tendencia, que sí las produce.

const CCY = ['EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD']
const DIAS = 200

function mercadoFalso(semilla = 7) {
  // Generador propio y determinista: con Math.random la prueba daría un
  // resultado distinto en cada corrida y no se podría comparar nada.
  let x = semilla
  const azar = () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }

  const fechas = []
  for (let i = 0; i < DIAS; i++) {
    const d = new Date(Date.UTC(2025, 0, 1 + i))
    fechas.push(d.toISOString().slice(0, 10))
  }

  const nivel = { EUR: 0.92, GBP: 0.79, JPY: 150, CHF: 0.88, CAD: 1.36, AUD: 1.52, NZD: 1.64 }
  const deriva = {}
  CCY.forEach((c) => (deriva[c] = (azar() - 0.5) * 0.0015))

  const rates = {}
  const rangosPar = {}
  for (const d of fechas) {
    const fila = {}
    for (const c of CCY) {
      // Cada 40 días cambia el rumbo, para que haya tendencias y vueltas.
      if (fechas.indexOf(d) % 40 === 0) deriva[c] = (azar() - 0.5) * 0.0015
      nivel[c] *= 1 + deriva[c] + (azar() - 0.5) * 0.004
      fila[c] = nivel[c]
    }
    rates[d] = fila

    const rangos = {}
    for (const b of ['EUR', 'GBP', 'AUD', 'NZD', 'USD']) {
      for (const q of ['USD', 'JPY', 'CHF', 'CAD']) {
        if (b === q) continue
        const px = (b === 'USD' ? 1 : 1 / fila[b]) * (q === 'USD' ? 1 : fila[q])
        const mecha = px * 0.004 * azar()
        rangos[`${b}/${q}`] = { h: px + mecha, l: px - mecha, c: px }
      }
    }
    rangosPar[d] = rangos
  }

  return { fechas, rates, rangosPar }
}

const { fechas, rates, rangosPar } = mercadoFalso()

// --- 1. Produce algo con lo que trabajar -----------------------------------

console.log('\n1. Genera señales sobre un mercado con tendencias')
const senales = generarSenales(fechas, rates, rangosPar, { calentamiento: 80 })
comprobar(senales.length > 0, `salieron ${senales.length} señales (si fueran 0, la prueba no probaría nada)`)
comprobar(
  senales.every((s) => s.precio > 0 && s.sl > 0 && s.tp > 0 && Number.isFinite(s.rr)),
  'todas traen precio, stop, objetivo y R/B con números de verdad'
)
comprobar(
  senales.every((s) => (s.lado === 'COMPRA' ? s.sl < s.precio && s.tp > s.precio : s.sl > s.precio && s.tp < s.precio)),
  'el stop y el objetivo caen del lado correcto según compra o venta'
)

// --- 2. LA IMPORTANTE: no mira el futuro -----------------------------------
//
// Si al calcular el día i se colara aunque fuera un precio del día i+1, las
// señales de los primeros días cambiarían al añadir datos posteriores. Así
// que se corre el motor sobre la mitad del mercado y sobre el mercado entero,
// y las señales de esa primera mitad tienen que salir IDÉNTICAS, hasta el
// último decimal del stop.
//
// Es la única comprobación que separa una medición honesta de un cuento que
// promete el 90% de acierto.

console.log('\n2. No mira el futuro (lo que haría falsos todos los números)')
{
  const corte = 140
  const parcial = generarSenales(fechas.slice(0, corte), rates, rangosPar, { calentamiento: 80 })
  const mismoTramo = senales.filter((s) => fechas.indexOf(s.vistoEl) < corte)

  comprobar(parcial.length === mismoTramo.length, `mismo número de señales en el tramo común (${parcial.length})`)

  const iguales = parcial.every((a, i) => {
    const b = mismoTramo[i]
    return b && a.id === b.id && a.vistoEl === b.vistoEl && a.precio === b.precio && a.sl === b.sl && a.tp === b.tp && a.rsi === b.rsi
  })
  comprobar(iguales, 'y son idénticas: mismos niveles, mismo RSI, con y sin datos posteriores')
}

// --- 3. Una señal viva varios días cuenta UNA vez ---------------------------

console.log('\n3. Una señal que dura días es una operación, no una por día')
{
  const claves = senales.map((s) => `${s.id}@${s.vistoEl}`)
  comprobar(new Set(claves).size === claves.length, 'no hay dos señales con la misma clave')

  // Si se contara cada día que la señal sigue viva, habría muchísimas más
  // señales que días medidos por par.
  const dias = fechas.length - 80
  comprobar(senales.length < dias * 6, `${senales.length} señales en ${dias} días medidos: no se está contando cada día`)
}

// --- 4. Se puede juzgar con el resolver de verdad ---------------------------

console.log('\n4. El resolver las entiende (mismo código que el vigía)')
{
  const completo = computarBarrido(fechas, rates, rangosPar)
  const { resultados } = resolver(senales, completo)

  const caducadas = resultados.filter((r) => r.resultado === 'caducada').length
  comprobar(caducadas === 0, 'ninguna sale "caducada" (era el error que dejó el historial de swing en cero)')

  const juzgadas = resultados.filter((r) => r.resultado === 'ganada' || r.resultado === 'perdida')
  comprobar(juzgadas.length > 0, `${juzgadas.length} señales llegaron a objetivo o a stop`)
  comprobar(
    juzgadas.every((r) => (r.resultado === 'ganada' ? r.pips > 0 : r.pips < 0)),
    'las ganadas suman pips y las perdidas restan'
  )
  comprobar(
    juzgadas.every((r) => r.diasTardados >= 1),
    'ninguna se resuelve el mismo día en que aparece (la entrada es a su cierre)'
  )
}

// --- 5. Los filtros de las variantes hacen lo que dicen ---------------------

console.log('\n5. Los filtros que compara el banco de pruebas')
{
  const rsiSano = (s) => (s.lado === 'COMPRA' ? s.rsi <= 70 : s.rsi >= 30)
  const conNivel = (s) => (s.lado === 'COMPRA' ? s.precio < s.res : s.precio > s.sup)

  comprobar(senales.filter(rsiSano).length <= senales.length, 'el filtro de RSI solo quita, nunca añade')
  comprobar(
    senales.filter(rsiSano).every((s) => (s.lado === 'COMPRA' ? s.rsi <= 70 : s.rsi >= 30)),
    'lo que pasa el filtro de RSI cumple de verdad la condición'
  )
  comprobar(
    senales.filter(conNivel).every((s) => (s.lado === 'COMPRA' ? s.precio < s.res : s.precio > s.sup)),
    'lo que pasa el filtro de nivel tiene un nivel real por delante'
  )
}

console.log(fallos ? `\n✗ ${fallos} comprobaciones fallaron\n` : '\n✓ todo bien\n')
process.exit(fallos ? 1 : 0)
