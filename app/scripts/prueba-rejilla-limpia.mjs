// Comprobaciones de la rejilla LIMPIA de Swing y de su listón.
// SIN INTERNET y sin créditos.
//
//     node scripts/prueba-rejilla-limpia.mjs
//
// Vigila los fallos que NO dan error y que además serían perfectamente
// creíbles al leer el log:
//
//   · una vela fundida con el máximo del lunes y el CIERRE del domingo — una
//     vela que no existió, y que el informe enseñaría sin pestañear;
//   · un domingo que se funde en la vela de después sin mirar si esa vela se
//     queda (con un sábado en medio acabaría dentro de algo que se borra);
//   · un domingo al final de la serie que se queda sin lunes;
//   · una fecha ilegible que se borra por no entenderse;
//   · y un veredicto que dice «igual» cuando lo que pasó es que no se pudo
//     mirar.

import {
  DOMINGO,
  SABADO,
  limpiar,
  queHacerCon,
  reparto,
} from './lib/rejilla-limpia.mjs'
import {
  APORTE_MAXIMO_DE_UN_PAR,
  FECHA_PREREGISTRO,
  LO_QUE_MIDIO_EL_DIAGNOSTICO,
  MEJORA_MINIMA,
  QUE_DICE_LA_MEDICION,
  SENAL_MINIMA_RELATIVA,
  SWAP_DE_CONTROL,
  juzgar,
} from './lib/preregistro-rejilla-swing.mjs'

let ok = 0
let mal = 0
const bien = (c, q) => (c ? (ok++, console.log(`  ✓ ${q}`)) : (mal++, console.log(`  ✗ ${q}`)))

// ─────────────────────────────────────────────────────────────────────────
// Una semana de mentira, con las fechas reales de una semana real.
//
// 2026-01-02 es viernes, así que la serie sale:
//   vie 2 · SÁB 3 · DOM 4 · lun 5 · mar 6 · mié 7 · jue 8 · vie 9 · SÁB 10
// ─────────────────────────────────────────────────────────────────────────
const SEMANA = [
  '2026-01-02',
  '2026-01-03',
  '2026-01-04',
  '2026-01-05',
  '2026-01-06',
  '2026-01-07',
  '2026-01-08',
  '2026-01-09',
  '2026-01-10',
]

// Cada día lleva un número distinto por par y por divisa, para que cualquier
// confusión de índices salte a la vista en vez de dar un número plausible.
function rejilla(fechas = SEMANA, { par = 'EUR/USD' } = {}) {
  const rates = {}
  const rangosPar = {}
  fechas.forEach((f, i) => {
    rates[f] = { EUR: 1 + i / 100, GBP: 2 + i / 100 }
    rangosPar[f] = { [par]: { h: 10 + i, l: -10 - i } }
  })
  return { fechas: [...fechas], rates, rangosPar }
}

console.log('1. QUÉ SE HACE CON CADA DÍA')
bien(queHacerCon('2026-01-03') === 'quitar', 'el sábado se QUITA')
bien(queHacerCon('2026-01-04') === 'fundir', 'el domingo se FUNDE')
bien(queHacerCon('2026-01-05') === null, 'el lunes se queda')
bien(queHacerCon('2026-01-09') === null, 'el viernes se queda')
bien(SABADO === 6 && DOMINGO === 0, 'sábado 6 y domingo 0, en UTC')
// ⚠️ La asimetría: una fecha que no se entiende SE QUEDA. Quitar una vela de
// mercado por no entender su fecha sería inventarse un hueco en el precio;
// dejar una de más solo mantiene lo que la app ya usa hoy.
bien(queHacerCon('mañana') === null, 'una fecha ilegible SE QUEDA (no se quita)')
bien(queHacerCon(undefined) === null, 'sin fecha, se queda')
bien(queHacerCon('') === null, 'fecha vacía, se queda')

console.log('')
console.log('2. LA LIMPIEZA')
const L = limpiar(rejilla())
bien(L.fechas.length === 6, `de 9 velas quedan 6 (quedaron ${L.fechas.length})`)
bien(!L.fechas.includes('2026-01-03'), 'el sábado 3 no está')
bien(!L.fechas.includes('2026-01-10'), 'el sábado 10 no está')
bien(!L.fechas.includes('2026-01-04'), 'el domingo 4 no está como vela propia')
bien(L.fechas.includes('2026-01-05'), 'el lunes 5 sí está')
bien(L.quitadas === 3, `se quitaron 3 filas de la serie (dijo ${L.quitadas})`)
bien(L.fundidas === 1, `una vela se fundió en otra (dijo ${L.fundidas})`)
bien(
  L.fechas.join(',') === '2026-01-02,2026-01-05,2026-01-06,2026-01-07,2026-01-08,2026-01-09',
  'el orden se conserva y no se repite ninguna'
)

console.log('')
console.log('3. ⚠️ EL DOMINGO SE FUNDE EN LOS EXTREMOS, PERO EL CIERRE ES DEL LUNES')
// El domingo es el índice 2 (h 12, l −12) y el lunes el 3 (h 13, l −13).
const lun = L.rangosPar['2026-01-05']['EUR/USD']
bien(lun.h === 13, `máximo = el mayor de los dos (13, dijo ${lun.h})`)
// 📌 Aquí me equivoqué al escribir la prueba y la prueba me lo cantó: puse
// −12 (el mínimo del domingo) cuando el del lunes es −13, y el menor de los
// dos es −13. El código estaba bien. Es lo que tiene que pasar.
bien(lun.l === -13, `mínimo = el menor de los dos (−13, dijo ${lun.l})`)
// ⚠️ ESTA ES LA COMPROBACIÓN QUE MÁS IMPORTA DE TODO EL ARCHIVO. Quedarse el
// cierre del domingo daría una vela con máximo de lunes y cierre de domingo:
// una vela que no existió nunca, y encima creíble en cualquier tabla.
bien(L.rates['2026-01-05'].EUR === 1.03, `el cierre es el del LUNES (1.03, dijo ${L.rates['2026-01-05'].EUR})`)
bien(L.rates['2026-01-05'].EUR !== 1.02, 'el cierre NO es el del domingo')
// Y las velas que no se funden no se tocan.
bien(L.rangosPar['2026-01-06']['EUR/USD'].h === 14, 'el martes queda intacto')
bien(L.rates['2026-01-02'].EUR === 1, 'el viernes queda intacto')

console.log('')
console.log('4. ⚠️ EL DOMINGO SE FUNDE EN EL SIGUIENTE QUE SE QUEDA, NO EN «EL DE DESPUÉS»')
// Una fuente que pusiera el sábado DESPUÉS del domingo (o dos velas seguidas
// para quitar) dejaría el domingo fundido dentro de algo que se borra, y su
// rango se perdería sin que nada fallara.
const raro = ['2026-01-02', '2026-01-04', '2026-01-03', '2026-01-05', '2026-01-06']
const R = limpiar(rejilla(raro))
bien(R.fechas.join(',') === '2026-01-02,2026-01-05,2026-01-06', 'quedan viernes, lunes y martes')
// domingo = índice 1 (h 11, l −11) · lunes = índice 3 (h 13, l −13)
bien(R.rangosPar['2026-01-05']['EUR/USD'].h === 13, 'el máximo del lunes manda')
bien(R.rangosPar['2026-01-05']['EUR/USD'].l === -13, 'y su mínimo también (−13 es menor que −11)')
bien(R.fundidas === 1, 'el domingo se fundió: su rango NO se perdió')
// Con el rango del domingo más ancho, tiene que aparecer en la vela fundida.
const ancho = rejilla(raro)
ancho.rangosPar['2026-01-04']['EUR/USD'] = { h: 99, l: -99 }
const A = limpiar(ancho)
bien(A.rangosPar['2026-01-05']['EUR/USD'].h === 99, 'un domingo más ancho SÍ ensancha la vela del lunes')
bien(A.rangosPar['2026-01-05']['EUR/USD'].l === -99, 'por los dos lados')

console.log('')
console.log('5. ⚠️ UN DOMINGO AL FINAL DE LA SERIE NO TIENE LUNES: SE QUITA')
// Y no es una excepción cómoda: es justo la vela con la que la app calcularía
// HOY, así que dejarla sería dejar el problema entero sin arreglar.
const F = limpiar(rejilla(['2026-01-08', '2026-01-09', '2026-01-10', '2026-01-11']))
bien(F.fechas.join(',') === '2026-01-08,2026-01-09', 'el sábado 10 y el domingo 11 finales desaparecen')
bien(F.fundidas === 0, 'no se fundió nada: no había dónde')
bien(F.quitadas === 2, `se quitaron las dos (dijo ${F.quitadas})`)

console.log('')
console.log('6. LOS BORDES QUE NO DEBEN REVENTAR')
bien(limpiar().fechas.length === 0, 'sin argumentos devuelve una serie vacía y no revienta')
bien(limpiar({}).fechas.length === 0, 'sin fechas, ídem')
const sinRangos = limpiar({ fechas: SEMANA, rates: rejilla().rates })
bien(sinRangos.fechas.length === 6 && sinRangos.rangosPar === undefined, 'sin rangosPar sigue limpiando fechas y cierres')
const todoFinDeSemana = limpiar(rejilla(['2026-01-03', '2026-01-10']))
bien(todoFinDeSemana.fechas.length === 0, 'una serie de solo sábados queda vacía (y quien la lea tiene que fallar)')
// Una fecha ilegible no puede arrastrar al resto.
const conBasura = limpiar(rejilla(['2026-01-02', 'nada', '2026-01-03', '2026-01-05']))
bien(conBasura.fechas.includes('nada'), 'la fecha ilegible se conserva')
bien(!conBasura.fechas.includes('2026-01-03'), 'y el sábado de al lado se quita igual')

console.log('')
console.log('7. EL REPARTO, que es el que canta si `diaDe` cambiara de convenio')
const rep = reparto(SEMANA)
bien(rep.quitar['6'] === 2, 'cuenta los 2 sábados bajo «quitar»')
bien(rep.fundir['0'] === 1, 'y el domingo bajo «fundir»')
bien(rep.queda['1'] === 1 && rep.queda['5'] === 2, 'el lunes y los dos viernes se quedan')
bien(reparto(['x']).queda.sinFecha === 1, 'una fecha ilegible sale como «sinFecha», no inventada')
bien(Object.keys(reparto(undefined).quitar).length === 0, 'sin fechas no revienta')

// ─────────────────────────────────────────────────────────────────────────
console.log('')
console.log('8. EL LISTÓN: lo escrito antes, congelado')
bien(FECHA_PREREGISTRO === '2026-09-30', 'lleva su fecha dentro')
bien(MEJORA_MINIMA === 0.02, 'el umbral es 0,02 por unidad de riesgo')
bien(SWAP_DE_CONTROL === 0.5, 'el swap de control es 0,5 pips por noche')
bien(SENAL_MINIMA_RELATIVA === 0.7, 'la app no puede bajar del 70 % de sus señales')
bien(APORTE_MAXIMO_DE_UN_PAR === 0.4, 'ningún par puede aportar más del 40 % de la mejora')
bien(Object.isFrozen(LO_QUE_MIDIO_EL_DIAGNOSTICO), 'lo que midió el diagnóstico está congelado')
bien(LO_QUE_MIDIO_EL_DIAGNOSTICO.enLunesYViernes === 0, 'y guarda el dato que decidió el arreglo: 0 en lunes y viernes')
bien(LO_QUE_MIDIO_EL_DIAGNOSTICO.enFinDeSemana === 44, 'y las 44 de fin de semana')
// ⚠️ Los cuatro resultados posibles tienen que estar escritos ANTES. Si
// alguien borra «empeora», el día que la app mida peor con datos honestos no
// habrá nada escrito que impida volver a los datos sucios.
for (const k of ['mejora', 'noPasa', 'igual', 'empeora']) {
  bien(typeof QUE_DICE_LA_MEDICION[k] === 'string' && QUE_DICE_LA_MEDICION[k].length > 40, `«${k}» está escrito antes`)
}
bien(
  /aritmética/i.test(QUE_DICE_LA_MEDICION.empeora) && /no autoriza|NO autoriza/i.test(QUE_DICE_LA_MEDICION.empeora),
  '«empeora» dice expresamente que NO autoriza volver a la rejilla sucia'
)

console.log('')
console.log('9. EL VEREDICTO SE CALCULA, nadie lo argumenta')
// Un caso que pasa los cinco criterios.
const bueno = {
  hoy: { porRiesgo: -0.04, senalesMes: 36 },
  limpia: { porRiesgo: 0.0, senalesMes: 34 },
  mitades: { hoy: [{ porRiesgo: -0.05 }, { porRiesgo: -0.03 }], limpia: [{ porRiesgo: -0.01 }, { porRiesgo: 0.01 }] },
  conSwap: { hoy: { porRiesgo: -0.09 }, limpia: { porRiesgo: -0.04 } },
  aporteMaximoDeUnPar: 0.2,
}
bien(juzgar(bueno).veredicto === 'mejora', 'los cinco criterios → «mejora»')
bien(juzgar(bueno).criterios.every((c) => c.pasa), 'y los cinco salen marcados como pasados')

// Cada criterio, roto de uno en uno.
const rompe = (cambio) => juzgar({ ...bueno, ...cambio })
bien(
  rompe({ mitades: { hoy: bueno.mitades.hoy, limpia: [{ porRiesgo: 0.05 }, { porRiesgo: -0.04 }] } }).veredicto === 'noPasa',
  'mejora mucho en una mitad y empeora en la otra → «noPasa» (es el criterio que decide)'
)
bien(
  rompe({ conSwap: { hoy: { porRiesgo: -0.09 }, limpia: { porRiesgo: -0.09 } } }).veredicto === 'noPasa',
  'si la mejora se cae al pagar swap → «noPasa»'
)
bien(rompe({ limpia: { porRiesgo: 0, senalesMes: 20 } }).veredicto === 'noPasa', 'si la app se queda muda → «noPasa»')
bien(rompe({ aporteMaximoDeUnPar: 0.8 }).veredicto === 'noPasa', 'si un par aporta el 80 % → «noPasa»')

// «igual» y «empeora» no son suspensos del listón: son respuestas distintas.
bien(
  juzgar({ ...bueno, limpia: { porRiesgo: -0.035, senalesMes: 34 } }).veredicto === 'igual',
  'un cambio por debajo del umbral → «igual», no «noPasa»'
)
bien(
  juzgar({ ...bueno, limpia: { porRiesgo: -0.09, senalesMes: 34 } }).veredicto === 'empeora',
  'un empeoramiento por encima del umbral → «empeora»'
)
// Los bordes exactos del umbral.
bien(juzgar({ ...bueno, limpia: { porRiesgo: -0.02, senalesMes: 34 } }).veredicto === 'mejora', 'justo +0,02 ya cuenta')
bien(
  juzgar({ ...bueno, limpia: { porRiesgo: -0.0201, senalesMes: 34 } }).veredicto === 'igual',
  'un pelo por debajo de +0,02 es «igual»'
)
bien(juzgar({ ...bueno, limpia: { porRiesgo: -0.06, senalesMes: 34 } }).veredicto === 'empeora', 'justo −0,02 es «empeora»')
// Una mitad que se queda EXACTAMENTE igual no es una mejora en esa mitad.
bien(
  rompe({ mitades: { hoy: bueno.mitades.hoy, limpia: [{ porRiesgo: -0.05 }, { porRiesgo: 0.05 }] } }).veredicto === 'noPasa',
  'una mitad que no se mueve no cuenta como mejora'
)

console.log('')
console.log('10. ⚠️ «NO SE PUDO MIRAR» NO ES «IGUAL»')
// Es el fallo de la sonda del sentimiento: un informe afirmó «no lo publican»
// habiendo leído cero páginas.
bien(juzgar(undefined).veredicto === null, 'sin datos devuelve null, no «igual»')
bien(juzgar({ hoy: { porRiesgo: -0.04 } }).veredicto === null, 'sin la rejilla limpia, null')
bien(juzgar({ hoy: {}, limpia: {} }).veredicto === null, 'con porRiesgo ausente, null')
bien(
  juzgar({ ...bueno, mitades: { hoy: bueno.mitades.hoy, limpia: [{ porRiesgo: 0.01 }] } }).criterios[1].detalle ===
    'no se pudo mirar',
  'una mitad que falta se dice «no se pudo mirar», no se da por buena'
)
bien(
  juzgar({ ...bueno, conSwap: {} }).criterios[2].pasa === false,
  'un swap que no se pudo medir NO pasa el criterio (no se asume que aguanta)'
)
bien(
  juzgar({ ...bueno, aporteMaximoDeUnPar: null }).criterios[4].pasa === false,
  'un aporte que no se pudo medir tampoco pasa'
)

console.log('')
console.log(`${ok} bien · ${mal} MAL`)
if (mal) process.exit(1)
