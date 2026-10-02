// LA MEDICIÓN COMPLETA: ¿la app MEJORA con la rejilla limpia, o solo cambia?
//
//     node scripts/medir-rejilla-swing.mjs
//
// Se lanza a mano desde Actions → «¿Mejora la app con la rejilla limpia?».
//
// ─────────────────────────────────────────────────────────────────────────
// LA PREGUNTA, Y POR QUÉ NO ES LA DEL DIAGNÓSTICO
// ─────────────────────────────────────────────────────────────────────────
// El diagnóstico del 2026-09-30 contestó **«¿la vela de fin de semana CAMBIA
// el stop?»**: sí, el ATR +18,5 % de mediana y el stop de la app +5,2 %, con
// 12 de 14 pares por encima del umbral, y con las fechas delante — 44 de las
// 51 velas estrechas son sábado o domingo y CERO son lunes o viernes.
//
// Y decía expresamente que eso **no autorizaba nada**. Cambiar el stop y
// mejorar no son lo mismo. Esto mide lo segundo.
//
// ⚠️⚠️ LAS SEÑALES NO SON LAS MISMAS, y hay que leer toda la tabla con eso
// puesto. Esto no puntúa las señales de hoy: cambia el dato con el que se
// calculan, así que cambia EMA20, EMA50, RSI, ATR y los soportes a la vez.
// Salen otras señales, en otras fechas y en otros pares. La comparación es
// «la app contra OTRA app», o sea dos muestras independientes — y dos muestras
// de ~1.800 operaciones se diferencian solas (error típico ~0,024 por unidad
// de riesgo, más que el umbral). **Lo que el ruido no hace es repetirse en las
// dos mitades**, y por eso ése es el criterio que decide.
//
// El listón está en `lib/preregistro-rejilla-swing.mjs`, con fecha
// 2026-09-30 y escrito ANTES de estos números, incluido lo que significa cada
// resultado posible — también «empeora», que es el que más falta hacía cerrar
// antes de verlo.
//
// ⚠️⚠️ NO CAMBIA NADA. Lee velas, calcula y escribe en el log. No toca un
// archivo de la app, ni una señal, ni la rama `datos`, ni el historial, ni
// ninguno de los experimentos que ya corren. El workflow va con
// `permissions: contents: read`.
//
// ⚠️ CUESTA 14 CRÉDITOS DE LOS 800: los 14 pares directos, en dos tandas de 7
// con una pausa de 65 s. **Una sola descarga para las dos rejillas** — la
// limpia se calcula a partir de la misma, no se vuelve a pedir nada.

import { medir, generarSenales } from './lib/backtest-nucleo.mjs'
import { NIVELES_SWAP } from './lib/costes.mjs'
import { actual } from './lib/geometrias.mjs'
import {
  FECHA_PREREGISTRO,
  LO_QUE_MIDIO_EL_DIAGNOSTICO,
  LO_QUE_NO_APLICA,
  MEJORA_MINIMA,
  QUE_DICE_LA_MEDICION,
  QUE_NO_AUTORIZA,
  SWAP_DE_CONTROL,
  VARA,
  juzgar,
} from './lib/preregistro-rejilla-swing.mjs'
import { limpiar, reparto } from './lib/rejilla-limpia.mjs'
import { nombreDia } from './lib/rejilla-diaria.mjs'
import { resolver } from './lib/resolver.mjs'
import { PARES, leerLlave, obtenerVelas } from './lib/velas.mjs'
import { computarBarrido } from '../src/lib/marketCalc.js'

// Los mismos ajustes que el banco de pruebas y que el vigía, para que esto
// mida la app de verdad y no una prima lejana suya.
const CALENTAMIENTO = 80
const THR = 0.5
const TOP_N = 3
const VELAS = Number(process.env.VELAS || 1500)

console.log('¿MEJORA LA APP CON LA REJILLA LIMPIA? — quitar el sábado, fundir el domingo')
console.log(`  preregistro del ${FECHA_PREREGISTRO}, escrito ANTES de estos números`)
console.log(`  vara: ${VARA}`)
console.log('')
console.log('  Lo que YA midió el diagnóstico (no se vuelve a discutir aquí):')
const d0 = LO_QUE_MIDIO_EL_DIAGNOSTICO
console.log(
  `    · ${d0.velasEstrechas} velas estrechas de ${d0.velasMiradas}: ${d0.enFinDeSemana} en fin de ` +
    `semana, ${d0.enLunesYViernes} en lunes o viernes`
)
console.log(
  `    · el ATR sube ${(100 * d0.subeATRMediana).toFixed(1)} % de mediana al limpiar; el stop de la app ` +
    `${(100 * d0.subeStopAppMediana).toFixed(1)} % (máximo ${(100 * d0.subeStopAppMaximo).toFixed(1)} %)`
)
console.log(`    · ${d0.paresPorEncimaDelUmbral} de ${d0.paresMirados} pares por encima del umbral`)
console.log(`    · y lo que manda en el stop es ${d0.loQueMandaEnElStop}`)
console.log('')
console.log('  NO escribe nada.')
console.log('')

const llave = leerLlave()
console.log(`Bajando ${VELAS} velas diarias de los ${PARES.length} pares (dos tandas, 65 s de pausa)…`)
const sucia = await obtenerVelas(llave, { velas: VELAS })
console.log(`  ${sucia.fechas.length} días con dato en los catorce`)
console.log(`  de ${sucia.fechas[0]} a ${sucia.fechas[sucia.fechas.length - 1]}`)
console.log('')

// ── La rejilla limpia, de la MISMA descarga ──────────────────────────────
const limpia = limpiar(sucia)

console.log('════════════════════════════════════════════════════════════')
console.log('  0. QUÉ SE QUITÓ DE VERDAD')
console.log('════════════════════════════════════════════════════════════')
// ⚠️ Esto no es adorno. Si `diaDe` cambiara de convenio (getDay en vez de
// getUTCDay), la limpieza seguiría corriendo sin error y quitaría los días
// equivocados. El reparto lo canta.
const r = reparto(sucia.fechas)
for (const [que, cuenta] of Object.entries(r)) {
  const filas = Object.entries(cuenta).sort((a, b) => Number(a[0]) - Number(b[0]))
  if (!filas.length) continue
  const texto = filas
    .map(([k, n]) => `${k === 'sinFecha' ? 'sin fecha' : nombreDia(Number(k))} ${n}`)
    .join(' · ')
  console.log(`  ${que.padEnd(7)} → ${texto}`)
}
console.log('')
console.log(`  velas: ${sucia.fechas.length} → ${limpia.fechas.length}`)
console.log(`  quitadas: ${limpia.quitadas} · fundidas en el día siguiente: ${limpia.fundidas}`)
console.log('')
if (!limpia.fechas.length || limpia.quitadas === 0) {
  console.error('✗ La limpieza no quitó ni una vela. Eso NO dice que la rejilla esté limpia:')
  console.error('  dice que algo no funcionó. Son cosas distintas.')
  process.exit(1)
}

// ── Las dos mediciones ───────────────────────────────────────────────────
//
// A) TODO en la rejilla limpia: las señales se generan Y se juzgan con ella.
//    Es la que decide, porque es la app que existiría.
// B) Señales limpias juzgadas en la rejilla de HOY: diagnóstico, para separar
//    el efecto de las señales del de la resolución. ⚠️ No es hipotético: la
//    vela de domingo del 2026-08-09 dejó 8 señales reales «caducada» para
//    siempre, sobre 18 visibles.
function correr(rejilla, rejillaParaResolver = rejilla) {
  const { fechas, rates, rangosPar } = rejilla
  const senales = generarSenales(fechas, rates, rangosPar, {
    calentamiento: CALENTAMIENTO,
    thr: THR,
    topN: TOP_N,
    geometria: actual,
  })
  const data = computarBarrido(
    rejillaParaResolver.fechas,
    rejillaParaResolver.rates,
    rejillaParaResolver.rangosPar
  )
  const { resultados } = resolver(senales, data)
  return { senales, porClave: new Map(resultados.map((x) => [x.clave, x])) }
}

console.log('Generando y resolviendo las señales de las dos rejillas…')
const A_hoy = correr(sucia)
const A_limpia = correr(limpia)
const B_limpiaEnSucia = correr(limpia, sucia)
console.log('')

// Señales por mes. ⚠️ El denominador es el SPAN DE CALENDARIO, que es el mismo
// para las dos rejillas — y eso es justo lo que hace la comparación honesta.
// Dividir entre el número de VELAS daría más señales/mes a la rejilla limpia
// solo por tener menos velas. Y ya se pagó el error contrario el 2026-09-14:
// dividir días de mercado entre 30,44 infló la columna un 45 %.
const dias = (a, b) => (new Date(b) - new Date(a)) / 86400000
const MESES = dias(sucia.fechas[CALENTAMIENTO], sucia.fechas[sucia.fechas.length - 1]) / 30.44
const porMes = (n) => n / MESES

const conCostes = { conSpread: true }
const med = (x, extra = {}) => medir(x.senales, x.porClave, { ...conCostes, ...extra })

const m = {
  hoy: med(A_hoy),
  limpia: med(A_limpia),
  limpiaEnSucia: med(B_limpiaEnSucia),
}

const pr = (x) => (x == null ? '    —' : `${x >= 0 ? '+' : ''}${x.toFixed(3)}`)
const ac = (x) => (x == null ? '  — ' : `${x.toFixed(0)}%`)

console.log('════════════════════════════════════════════════════════════')
console.log('  1. LA MEDICIÓN QUE DECIDE (A) — todo en su propia rejilla')
console.log('════════════════════════════════════════════════════════════')
console.log('rejilla                        señales   ops  acierto     pips   por 1R   señ/mes')
console.log('─'.repeat(82))
for (const [nombre, x, mm] of [
  ['la de hoy (con fin de semana)', A_hoy, m.hoy],
  ['LIMPIA (sin sábado)', A_limpia, m.limpia],
]) {
  console.log(
    `${nombre.padEnd(30)} ${String(x.senales.length).padStart(7)} ${String(mm.total).padStart(5)}   ` +
      `${ac(mm.acierto)}  ${String(mm.pips).padStart(7)}   ${pr(mm.porRiesgo).padStart(6)}   ` +
      `${porMes(x.senales.length).toFixed(1).padStart(7)}`
  )
}
console.log('─'.repeat(82))
console.log('')

// Cuántas señales coinciden entre las dos apps. Es el número que dice hasta
// qué punto esto es «la misma app medida mejor» o «otra app».
const claves = (x) => new Set(x.senales.map((s) => `${s.id}@${s.vistoEl}`))
const cHoy = claves(A_hoy)
const cLimpia = claves(A_limpia)
let comunes = 0
for (const k of cLimpia) if (cHoy.has(k)) comunes++
const solape = cHoy.size + cLimpia.size - comunes > 0 ? comunes / (cHoy.size + cLimpia.size - comunes) : null
console.log(
  `  📌 SOLAPE: ${comunes} señales idénticas (mismo par, mismo lado, mismo día) — ` +
    `${solape == null ? '—' : (100 * solape).toFixed(0) + ' %'} de la unión.`
)
console.log('     Cuanto más bajo, más cierto es que esto es OTRA app y no la misma mejor medida.')
console.log('')

console.log('════════════════════════════════════════════════════════════')
console.log('  2. LAS DOS MITADES — el criterio que de verdad decide')
console.log('════════════════════════════════════════════════════════════')
// El corte va por FECHA de calendario y es el MISMO para las dos rejillas: si
// cada una se partiera por la mitad de SUS velas, el corte caería en días
// distintos y las mitades no serían comparables.
const corte = sucia.fechas[Math.floor((CALENTAMIENTO + sucia.fechas.length) / 2)]
console.log(`  Corte en ${corte}, el mismo para las dos rejillas.`)
console.log('')
const mitad = (x, primera) =>
  medir(
    x.senales.filter((s) => (primera ? s.vistoEl < corte : s.vistoEl >= corte)),
    x.porClave,
    conCostes
  )
const mitades = {
  hoy: [mitad(A_hoy, true), mitad(A_hoy, false)],
  limpia: [mitad(A_limpia, true), mitad(A_limpia, false)],
}
console.log('rejilla                        1ª mitad: ops   por 1R     2ª mitad: ops   por 1R')
console.log('─'.repeat(82))
for (const [nombre, k] of [
  ['la de hoy', 'hoy'],
  ['LIMPIA', 'limpia'],
]) {
  const [a, b] = mitades[k]
  console.log(
    `${nombre.padEnd(30)} ${String(a.total).padStart(13)}   ${pr(a.porRiesgo).padStart(6)}     ` +
      `${String(b.total).padStart(13)}   ${pr(b.porRiesgo).padStart(6)}`
  )
}
console.log('─'.repeat(82))
console.log('')

console.log('════════════════════════════════════════════════════════════')
console.log('  3. PAGANDO SWAP')
console.log('════════════════════════════════════════════════════════════')
// ⚠️ Importa MÁS aquí que en otras mediciones: la rejilla limpia tiene menos
// velas, así que `diasTardados` baja y el swap medido baja con él. Parte de
// cualquier mejora podría ser eso y nada más — dos noches menos SIN que el
// precio haya hecho nada distinto.
console.log('swap/noche   la de hoy   LIMPIA   diferencia')
console.log('─'.repeat(50))
const conSwap = {}
for (const nivel of NIVELES_SWAP) {
  const a = med(A_hoy, { swapPipsNoche: nivel })
  const b = med(A_limpia, { swapPipsNoche: nivel })
  const dd = b.porRiesgo == null || a.porRiesgo == null ? null : b.porRiesgo - a.porRiesgo
  const marca = nivel === SWAP_DE_CONTROL ? '   ← el del listón' : ''
  console.log(
    `${nivel.toFixed(2).padStart(8)}    ${pr(a.porRiesgo).padStart(8)} ${pr(b.porRiesgo).padStart(8)}   ` +
      `${pr(dd).padStart(8)}${marca}`
  )
  if (nivel === SWAP_DE_CONTROL) {
    conSwap.hoy = a
    conSwap.limpia = b
  }
}
console.log('─'.repeat(50))
console.log('')

console.log('════════════════════════════════════════════════════════════')
console.log('  4. ¿VIENE DE UN SOLO PAR?')
console.log('════════════════════════════════════════════════════════════')
// Se mide QUITANDO cada par y viendo cuánta mejora desaparece con él. Repartir
// la mejora «por par» a pelo no se puede: `porRiesgo` es una media sobre
// conjuntos de operaciones distintos en cada rejilla.
const deltaTotal = (m.limpia.porRiesgo ?? 0) - (m.hoy.porRiesgo ?? 0)
const sin = (x, par) => medir(x.senales.filter((s) => s.par !== par), x.porClave, conCostes)
const aportes = []
for (const par of PARES) {
  const a = sin(A_hoy, par)
  const b = sin(A_limpia, par)
  if (a.porRiesgo == null || b.porRiesgo == null) continue
  const deltaSin = b.porRiesgo - a.porRiesgo
  aportes.push({ par, deltaSin, aporte: deltaTotal === 0 ? null : (deltaTotal - deltaSin) / deltaTotal })
}
aportes.sort((a, b) => (b.aporte ?? -9) - (a.aporte ?? -9))
console.log('par         mejora SIN ese par   aporta')
console.log('─'.repeat(46))
for (const a of aportes.slice(0, 5)) {
  console.log(
    `${a.par.padEnd(10)} ${pr(a.deltaSin).padStart(17)}   ${a.aporte == null ? '   —' : (100 * a.aporte).toFixed(0) + ' %'}`
  )
}
console.log('─'.repeat(46))
const aporteMaximo = aportes.length ? aportes[0].aporte : null
console.log('')

console.log('════════════════════════════════════════════════════════════')
console.log('  5. DIAGNÓSTICO (B) — ¿el efecto es de las SEÑALES o de la RESOLUCIÓN?')
console.log('════════════════════════════════════════════════════════════')
console.log('qué se midió                                    ops  acierto   por 1R')
console.log('─'.repeat(74))
for (const [nombre, mm] of [
  ['A) señales limpias, juzgadas en la rejilla LIMPIA', m.limpia],
  ['B) las MISMAS señales, juzgadas en la de HOY', m.limpiaEnSucia],
]) {
  console.log(`${nombre.padEnd(48)} ${String(mm.total).padStart(4)}   ${ac(mm.acierto)}   ${pr(mm.porRiesgo).padStart(6)}`)
}
console.log('─'.repeat(74))
console.log('')
console.log(`  señales sin juzgar: ${m.limpia.sinJuzgar} en A · ${m.limpiaEnSucia.sinJuzgar} en B`)
console.log('')
console.log('  📌 Si A y B se parecen, el efecto es de las SEÑALES. Si difieren, parte del')
console.log('     resultado es de cómo se JUZGA — y eso hay que decirlo en vez de dejar que')
console.log('     se lea como mérito de la entrada. No es hipotético: la vela de domingo del')
console.log('     2026-08-09 dejó 8 señales reales «caducada» para siempre, sobre 18 visibles.')
console.log('')

// ── El veredicto, CALCULADO ──────────────────────────────────────────────
const fallo = juzgar({
  hoy: { ...m.hoy, senalesMes: porMes(A_hoy.senales.length) },
  limpia: { ...m.limpia, senalesMes: porMes(A_limpia.senales.length) },
  mitades,
  conSwap,
  aporteMaximoDeUnPar: aporteMaximo,
})

console.log('════════════════════════════════════════════════════════════')
console.log('  ►► EL VEREDICTO, CALCULADO POR EL LISTÓN')
console.log('════════════════════════════════════════════════════════════')
for (const c of fallo.criterios) {
  console.log(`  ${c.pasa ? '✔' : '✗'} ${c.nombre.padEnd(48)} ${c.detalle}`)
}
console.log('')
console.log(`  VEREDICTO: ${fallo.veredicto ?? 'no se pudo mirar'}`)
console.log('')
if (fallo.veredicto && QUE_DICE_LA_MEDICION[fallo.veredicto]) {
  for (const linea of QUE_DICE_LA_MEDICION[fallo.veredicto].match(/.{1,74}(\s|$)/g) ?? []) {
    console.log(`  ${linea.trim()}`)
  }
}
console.log('')
console.log(`  umbral del listón: ${MEJORA_MINIMA.toFixed(2)} por unidad de riesgo`)
console.log('')
console.log('  ⚠️ Y el umbral SOLO no demuestra nada: con dos muestras independientes de')
console.log('     ~1.800 operaciones el error típico de cada media ronda 0,024, o sea MÁS')
console.log('     que el umbral. Lo que aprueba son LAS DOS MITADES.')
console.log('')
console.log(`  ⚠️ LO QUE ESTO AUTORIZA: ${QUE_NO_AUTORIZA}`)
console.log(`  📌 Lo que NO se puede citar en contra: ${LO_QUE_NO_APLICA}.`)
