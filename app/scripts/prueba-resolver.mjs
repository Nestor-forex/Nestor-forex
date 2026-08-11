// Prueba del cálculo de si una señal acertó. Sin internet y sin claves:
//
//     node scripts/prueba-resolver.mjs
//
// Es la lógica de la que sale el porcentaje de acierto, o sea el número con
// el que Néstor va a decidir si le confía dinero a la app. Si esto se
// equivoca a favor propio, el número engaña. Por eso hay tantas
// comprobaciones para tan pocas líneas.

import { claveDe, resolver, resumir } from './lib/resolver.mjs'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

// Cuatro velas de mentira, para poder decir exactamente por dónde pasó el
// precio en cada una.
const BARRAS = ['t0', 't1', 't2', 't3']

// `highs`/`lows` van alineados con BARRAS.
const mundo = (highs, lows, { name = 'EUR/USD' } = {}) => ({
  fechas: BARRAS,
  pares: [{ name, highs, lows }],
})

const senal = (extra = {}) => ({
  id: 'EUR/USD|COMPRA|tendencia',
  vistoEl: '2026-08-07T10:00:00.000Z',
  vela: 't0',
  par: 'EUR/USD',
  lado: 'COMPRA',
  tipo: 'tendencia',
  precio: 1.08,
  sl: 1.07,
  tp: 1.1,
  rr: 2,
  pipRiesgo: 100,
  pipBeneficio: 200,
  ...extra,
})

console.log('\n1. Una compra que llega al objetivo')
{
  //                        t0     t1     t2(toca 1.10)  t3
  const d = mundo([1.085, 1.09, 1.101, 1.10], [1.079, 1.085, 1.095, 1.099])
  const { resultados, abiertas } = resolver([senal()], d)
  comprobar(resultados.length === 1 && resultados[0].resultado === 'ganada', 'la da por ganada')
  comprobar(resultados[0].pips === 200, 'suma los pips de beneficio (+200)')
  comprobar(resultados[0].velaFinal === 't2', 'dice en qué vela se resolvió')
  comprobar(resultados[0].diasTardados === 2, 'dice cuántos días tardó')
  comprobar(abiertas === 0, 'no queda ninguna abierta')
}

console.log('\n2. Una compra que llega al stop')
{
  const d = mundo([1.085, 1.09, 1.09, 1.09], [1.079, 1.069, 1.08, 1.08])
  const { resultados } = resolver([senal()], d)
  comprobar(resultados[0].resultado === 'perdida', 'la da por perdida')
  comprobar(resultados[0].pips === -100, 'resta los pips de riesgo (−100)')
}

console.log('\n3. La misma vela toca el stop Y el objetivo')
{
  // No se puede saber cuál tocó primero: la vela solo guarda máximo y mínimo.
  const d = mundo([1.085, 1.101, 1.09, 1.09], [1.079, 1.069, 1.08, 1.08])
  const { resultados } = resolver([senal()], d)
  comprobar(
    resultados[0].resultado === 'perdida',
    'cuenta como PERDIDA — el historial no debe equivocarse a favor propio'
  )
}

console.log('\n4. Todavía no ha llegado a ninguno de los dos')
{
  const d = mundo([1.085, 1.09, 1.088, 1.09], [1.079, 1.075, 1.078, 1.08])
  const { resultados, abiertas } = resolver([senal()], d)
  comprobar(resultados.length === 0, 'no la juzga todavía')
  comprobar(abiertas === 1, 'la cuenta como abierta')
}

console.log('\n5. La vela en la que apareció no cuenta')
{
  // t0 ya toca el objetivo, pero es la vela de la señal: la entrada es a su
  // cierre, así que lo que pasó ANTES dentro de esa misma vela no vale.
  const d = mundo([1.15, 1.09, 1.088, 1.09], [1.079, 1.085, 1.078, 1.08])
  const { resultados, abiertas } = resolver([senal()], d)
  comprobar(resultados.length === 0 && abiertas === 1, 'no la da por ganada con su propia vela')
}

console.log('\n6. Una venta va al revés')
{
  const v = senal({ id: 'EUR/USD|VENTA|tendencia', lado: 'VENTA', sl: 1.09, tp: 1.06 })
  // Baja hasta 1.059: para una venta, eso es llegar al objetivo.
  const gana = mundo([1.085, 1.08, 1.07, 1.07], [1.079, 1.07, 1.059, 1.065])
  comprobar(resolver([v], gana).resultados[0].resultado === 'ganada', 'bajar al objetivo la gana')

  // Sube hasta 1.091: para una venta, eso es el stop.
  const pierde = mundo([1.085, 1.091, 1.07, 1.07], [1.079, 1.08, 1.06, 1.065])
  comprobar(resolver([v], pierde).resultados[0].resultado === 'perdida', 'subir al stop la pierde')
}

console.log('\n7. Señales viejas y ya juzgadas')
{
  const d = mundo([1.085, 1.09, 1.101, 1.10], [1.079, 1.085, 1.095, 1.099])

  const vieja = senal({ vela: 'vela-que-ya-no-descargamos' })
  const r1 = resolver([vieja], d)
  comprobar(r1.caducadas === 1, 'una señal fuera de las velas descargadas se marca caducada')
  comprobar(r1.resultados[0].resultado === 'caducada', 'y no se reintenta para siempre')

  const r2 = resolver([senal()], d, new Set([claveDe(senal())]))
  comprobar(r2.resultados.length === 0, 'una ya juzgada no se vuelve a juzgar')
}

console.log('\n8. La misma señal en dos momentos son dos operaciones')
{
  const a = senal({ vistoEl: '2026-08-07T10:00:00.000Z' })
  const b = senal({ vistoEl: '2026-08-08T10:00:00.000Z' })
  comprobar(claveDe(a) !== claveDe(b), 'se distinguen por el momento, no solo por el par y lado')
}

console.log('\n9. En swing todos los pares son exactos')
{
  const d1 = mundo([1.085, 1.09, 1.101, 1.10], [1.079, 1.085, 1.095, 1.099])
  const d2 = mundo([1.085, 1.09, 1.09, 1.09], [1.079, 1.069, 1.08, 1.08], { name: 'EUR/CHF' })

  const ganada = resolver([senal()], d1).resultados[0]
  // El `id` va junto con el par a propósito: `idDe` lo arma como
  // `par|lado|tipo`, así que dos pares distintos NUNCA comparten clave en la
  // app real. Cambiar aquí solo `par` dejaba dos señales con la misma clave,
  // algo que no puede pasar de verdad, y hacía fallar la cuenta ahora que
  // `resumir` junta las líneas repetidas de una misma señal.
  const cruce = senal({ par: 'EUR/CHF', id: 'EUR/CHF|COMPRA|tendencia' })
  const perdidaCruce = resolver([cruce], d2).resultados[0]

  // A diferencia de la app hermana de intradía, aquí los 14 pares se piden
  // directamente a Twelve Data, así que el máximo y el mínimo son los reales
  // también en los cruces. Por eso no hay cuentas "aproximadas" que separar.
  comprobar(ganada.exacto === true, 'un par contra el dólar es exacto')
  comprobar(perdidaCruce.exacto === true, 'un CRUCE también es exacto')

  const r = resumir([ganada, perdidaCruce])
  comprobar(r.todas.total === 2 && r.todas.acierto === 50, 'las cuentas salen bien')
  comprobar(r.todas.pips === 100, 'los pips netos se suman (+200 −100)')
  comprobar(r.exactas === undefined, 'no hay cuenta aparte de "exactas": sobra aquí')
}

console.log('\n10. Sin nada que juzgar no revienta')
{
  const d = mundo([1.08], [1.08])
  const r = resolver([], d)
  comprobar(r.resultados.length === 0 && r.abiertas === 0, 'lista vacía → nada')
  comprobar(resumir([]).todas.acierto === null, 'sin operaciones el acierto es null, no 0%')
}

// El error que dejó el historial de swing en cero durante días. El vigía de
// swing guarda el día de la señal en un campo llamado `cierre`; el de intradía
// lo llama `vela`. El resolver leía solo `vela`, así que en swing encontraba
// undefined, no lo hallaba en la lista de fechas, y marcaba TODAS las señales
// como "caducada" nada más nacer. Ninguna se juzgaba jamás.
//
// No se vio antes porque las pruebas usaban `vela`, igual que intradía: la
// prueba pasaba y la app estaba rota. Por eso ahora se comprueban los dos
// nombres, y con el nombre de swing PRIMERO.
console.log('\n11. El día de la señal se lee venga como venga (swing `cierre`, intradía `vela`)')
{
  const alObjetivo = mundo([1.08, 1.11], [1.08, 1.09])

  const comoSwing = { ...senal(), cierre: 't0' }
  delete comoSwing.vela
  const rs = resolver([comoSwing], alObjetivo)
  comprobar(rs.resultados[0]?.resultado === 'ganada', 'con `cierre` (swing) se juzga, no se caduca')
  comprobar(rs.resultados[0]?.velaEntrada === 't0', 'y guarda bien la vela de entrada')

  const rv = resolver([senal()], alObjetivo)
  comprobar(rv.resultados[0]?.resultado === 'ganada', 'con `vela` (intradía) sigue funcionando igual')

  // Sin ninguno de los dos sí debe caducar: es el caso real de una señal cuyo
  // día ya se salió de la ventana de velas descargadas.
  const sinDia = { ...senal() }
  delete sinDia.vela
  comprobar(resolver([sinDia], alObjetivo).resultados[0]?.resultado === 'caducada', 'sin fecha sí caduca')
}

console.log('\n12. Una "caducada" no es definitiva: si luego se puede juzgar, manda el veredicto')
{
  const clave = claveDe(senal())
  const antes = { clave, resultado: 'caducada', pips: null }
  const despues = { clave, resultado: 'ganada', pips: 200 }

  // Así es como quedan las dos líneas en el archivo: primero el "no pude",
  // después el veredicto de verdad. La cuenta debe quedarse con la segunda.
  const r = resumir([antes, despues])
  comprobar(r.todas.total === 1, 'la señal cuenta UNA vez, no dos')
  comprobar(r.todas.acierto === 100 && r.todas.pips === 200, 'gana el veredicto, no el "no pude"')

  comprobar(resumir([antes]).todas.total === 0, 'una caducada sola no suma ni resta')
}

console.log(fallos ? `\n✗ ${fallos} comprobaciones fallaron\n` : '\n✓ todo bien\n')
process.exit(fallos ? 1 : 0)
