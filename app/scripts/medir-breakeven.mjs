// ¿VALE LA PENA MOVER EL STOP A BREAKEVEN?
//
//     Actions → «Medir si mover el stop a breakeven ayuda» → Run workflow
//
// ─────────────────────────────────────────────────────────────────────────
// QUÉ ES ESTO Y POR QUÉ HACÍA FALTA
// ─────────────────────────────────────────────────────────────────────────
// Néstor lo pidió el 2026-10-07. La respuesta de ese momento fue «no se puede
// saber con el historial»: el registro real anota ganada o perdida, y **no
// anota cuánto a favor llegó una operación antes de irse al stop**. Sin ese
// dato, cualquier número sobre breakeven sería inventado.
//
// El banco de pruebas sí tiene las velas, así que aquí sí se puede.
//
// ⚠️ ESTO NO TOCA NI UNA LÍNEA DE `src/`. Es una medición. El listón está en
// `lib/preregistro-breakeven.mjs`, escrito ANTES de la primera corrida, y el
// veredicto lo CALCULA `juzgar()`.
//
// ⚠️ GASTA 14 CRÉDITOS de Twelve Data (las velas de los 14 pares).
//
// ─────────────────────────────────────────────────────────────────────────
// SE MIDE CON LAS DOS VARAS, Y LA QUE DECIDE ES LA NEUTRA
// ─────────────────────────────────────────────────────────────────────────
// · La vara NEUTRA (1:1, `simetrica`) es la que decide. Con objetivo y stop a
//   la misma distancia, el resultado depende solo de acertar la dirección, así
//   que una mejora ahí es una mejora de verdad.
// · La geometría REAL de la app va como comprobación.
//
// 📌 Esto no es ceremonia: el 2026-09-14 el COT salió POSITIVO con la geometría
// real y NEGATIVO con la neutra, sobre las mismas operaciones y los mismos
// días. Si se hubiera decidido con la real se habría encendido un filtro que no
// sabe nada. Breakeven tiene el mismo riesgo y más fuerte, porque cambia por
// dónde SALE la operación — o sea que toca la geometría directamente.

import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { computarBarrido } from '../src/lib/marketCalc.js'
import { generarSenales } from './lib/backtest-nucleo.mjs'
import { actual, simetrica } from './lib/geometrias.mjs'
import { medirConBreakeven, concentracionDeLaMejora, clavesComunes } from './lib/breakeven.mjs'
import {
  juzgar,
  NIVELES_ARMADO,
  MEJORA_MINIMA,
  NIVELES_QUE_DEBEN_MEJORAR,
  SWAP_DE_CONTROL,
  CONCENTRACION_MAXIMA,
  FECHA_REDACCION,
} from './lib/preregistro-breakeven.mjs'

const CALENTAMIENTO = 80
const THR = 0.5
const TOP_N = 5
const VELAS = Number(process.env.VELAS || 1500)

console.log('\n╔════════════════════════════════════════════════════════════════════╗')
console.log('║  ¿VALE LA PENA MOVER EL STOP A BREAKEVEN?                          ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log(`\nListón escrito el ${FECHA_REDACCION}, antes de esta corrida.`)
console.log('El veredicto lo calcula `juzgar()`, no lo argumenta nadie.\n')

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave(), { velas: VELAS })
const completo = computarBarrido(fechas, rates, rangosPar)
console.log(`Días de mercado: ${fechas.length} · de ${fechas[0]} a ${fechas.at(-1)}`)

// El corte en mitades, por fecha y no por número de operaciones: así las dos
// mitades son dos periodos de mercado y no dos montones de señales.
const CORTE = fechas[Math.floor((CALENTAMIENTO + fechas.length) / 2)]
console.log(`Corte de las dos mitades: ${CORTE}\n`)

function senalesDe(geometria) {
  return generarSenales(fechas, rates, rangosPar, {
    calentamiento: CALENTAMIENTO,
    thr: THR,
    topN: TOP_N,
    geometria,
  })
}

// Mide un nivel de armado sobre un conjunto de señales, con sus dos mitades y
// su barrido de swap. `armarEn: null` es la línea de comparación, y sale de
// ESTE MISMO código para que la única diferencia sea el breakeven.
function fila(senales, armarEn, soloClaves) {
  const todo = medirConBreakeven(senales, completo, { armarEn, soloClaves })
  const m1 = medirConBreakeven(senales.filter((s) => s.cierre < CORTE), completo, { armarEn, soloClaves })
  const m2 = medirConBreakeven(senales.filter((s) => s.cierre >= CORTE), completo, { armarEn, soloClaves })
  const conSwap = medirConBreakeven(senales, completo, { armarEn, soloClaves, swapPipsNoche: SWAP_DE_CONTROL })
  return {
    armarEn,
    ops: todo.ops,
    acierto: todo.acierto,
    porRiesgo: todo.porRiesgo,
    porRiesgo1aMitad: m1.porRiesgo,
    porRiesgo2aMitad: m2.porRiesgo,
    porRiesgoConSwap: conSwap.porRiesgo,
    cuenta: todo.cuenta,
    _medida: todo,
  }
}

const pct = (x) => (x === null || x === undefined ? '  n/d' : `${(100 * x).toFixed(0)} %`)
const n3 = (x) => (x === null || x === undefined ? '  n/d' : (x >= 0 ? '+' : '') + x.toFixed(3))

function tabla(nombre, geometria) {
  const senales = senalesDe(geometria)
  console.log('─'.repeat(92))
  console.log(nombre)
  console.log('─'.repeat(92))
  console.log(
    '  armado   ops  acierto   ganadas  en BE  perdidas   por 1R    1ª mit    2ª mit   con swap'
  )

  // ⚠️ PRIMERO se mira qué operaciones saben juzgar TODOS los métodos, y solo
  // esas entran en la tabla. Breakeven puede resolver una que sin él seguiría
  // viva, así que sin esto las columnas compararían conjuntos distintos. Lo
  // destapó el humo sobre un mercado inventado, antes de gastar un crédito.
  const sondeo = [null, ...NIVELES_ARMADO].map((a) => medirConBreakeven(senales, completo, { armarEn: a }))
  const comunes = clavesComunes(sondeo)
  const descartadas = Math.max(...sondeo.map((m) => m.ops)) - comunes.size
  if (descartadas > 0) {
    console.log(
      `  (${descartadas} operación(es) fuera: las resuelve un método y otro no. ` +
        `Se mide sobre las ${comunes.size} que todos saben juzgar.)`
    )
  }

  const sinBE = fila(senales, null, comunes)
  const pinta = (f, etq) =>
    console.log(
      `  ${etq.padEnd(8)}${String(f.ops).padStart(5)}  ${pct(f.acierto).padStart(7)}   ` +
        `${String(f.cuenta.ganada).padStart(7)}${String(f.cuenta.breakeven).padStart(7)}` +
        `${String(f.cuenta.perdida).padStart(10)}   ${n3(f.porRiesgo).padStart(6)}    ` +
        `${n3(f.porRiesgo1aMitad).padStart(6)}    ${n3(f.porRiesgo2aMitad).padStart(6)}     ` +
        `${n3(f.porRiesgoConSwap).padStart(6)}`
    )

  pinta(sinBE, 'SIN BE')
  const niveles = NIVELES_ARMADO.map((a) => fila(senales, a, comunes))
  for (const f of niveles) pinta(f, `${f.armarEn}×`)

  // La concentración se mide en el mejor nivel.
  const mejor = niveles.reduce((a, b) => ((b.porRiesgo ?? -Infinity) > (a.porRiesgo ?? -Infinity) ? b : a))
  const concentracion = concentracionDeLaMejora(mejor._medida, sinBE._medida)

  console.log('')
  if (sinBE._medida.sinJuzgar) console.log(`  (sin juzgar: ${sinBE._medida.sinJuzgar} señales que siguen vivas o fuera de la serie)`)
  return { sinBE, niveles, concentracion, mejor }
}

// ── La que decide ────────────────────────────────────────────────────────
const neutra = tabla('CON LA VARA NEUTRA 1:1 — ESTA ES LA QUE DECIDE', simetrica)

// ── Y la comprobación ────────────────────────────────────────────────────
const real = tabla('Con la geometría REAL de la app (comprobación, NO decide)', actual)

// ─────────────────────────────────────────────────────────────────────────
console.log('═'.repeat(92))
console.log('EL VEREDICTO, CALCULADO')
console.log('═'.repeat(92))
console.log(`\nCriterios: mejora ≥ ${MEJORA_MINIMA} · en las DOS mitades · mismas operaciones ·`)
console.log(`           ≥ ${NIVELES_QUE_DEBEN_MEJORAR} de ${NIVELES_ARMADO.length} niveles · aguanta ${SWAP_DE_CONTROL} de swap ·`)
console.log(`           ningún par aporta más del ${100 * CONCENTRACION_MAXIMA} % de la mejora\n`)

const v = juzgar(neutra)
if (v.mejor) {
  const mejora = v.mejor.porRiesgo - neutra.sinBE.porRiesgo
  console.log(`Mejor nivel de armado: ${v.mejor.armarEn}× el riesgo`)
  console.log(`  sin breakeven ... ${n3(neutra.sinBE.porRiesgo)}`)
  console.log(`  con breakeven ... ${n3(v.mejor.porRiesgo)}`)
  console.log(`  mejora .......... ${n3(mejora)}   (hace falta +${MEJORA_MINIMA})`)
  console.log(
    `  concentración ... ${neutra.concentracion === null ? 'n/d (no hay mejora que repartir)' : pct(neutra.concentracion)}`
  )
}

console.log('')
if (v.pasa) {
  console.log('✅ PASA EL LISTÓN.')
  console.log('')
  console.log('⚠️ Y pasar el listón es NECESARIO Y NO SUFICIENTE: estos mismos días ya se')
  console.log('   miraron para otras cosas. Encenderlo en la app sería una decisión aparte,')
  console.log('   de Néstor, con su propio PR y su verificación en navegador.')
} else {
  console.log('❌ NO PASA EL LISTÓN. Motivos:')
  for (const f of v.fallos) console.log(`   · ${f}`)
  console.log('')
  console.log('⚠️ Y la respuesta NO es aflojar un criterio: éste es el momento exacto para')
  console.log('   el que el listón se escribió antes.')
}

// La comprobación, dicha aparte y marcada como lo que es.
const vReal = juzgar(real)
console.log('')
console.log(
  `Con la geometría real de la app el veredicto sería: ${vReal.pasa ? 'PASA' : 'no pasa'}. ` +
    `${vReal.pasa !== v.pasa ? '⚠️ NO COINCIDE con la vara neutra, y manda la neutra.' : 'Coincide.'}`
)
console.log('')
