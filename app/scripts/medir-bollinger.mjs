// ¿SIRVEN LAS BANDAS DE BOLLINGER EN SWING?
//
//     node scripts/medir-bollinger.mjs
//
// Cuesta 14 créditos de Twelve Data (los 14 pares, en dos tandas).
//
// ⚠️ NO CAMBIA NADA. No toca un archivo de `src/`, ni una señal, ni el
// barrido publicado, ni el historial, ni ninguna de las reglas que ya corren
// en la sombra. Su workflow lleva permiso de solo lectura. Y pasar el listón
// TAMPOCO enciende nada: ver `QUE_HACER` en el preregistro.
//
// ⚠️ EL LISTÓN ESTÁ ESCRITO ANTES, en `lib/preregistro-bollinger.mjs` con
// fecha 2026-10-13 dentro, incluido CUÁL variante se juzga y por qué. El
// veredicto lo calcula `juzgar()`.

import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { computarBarrido, UMBRAL_FUERZA } from '../src/lib/marketCalc.js'
import { PAIR_NAMES } from '../src/lib/pairs.js'
import { generarSenales, medir } from './lib/backtest-nucleo.mjs'
import { resolver } from './lib/resolver.mjs'
import { simetrica } from './lib/geometrias.mjs'
import { ordenPorBollinger, reglaBollinger } from './lib/bollinger.mjs'
import {
  FECHA_DEL_LISTON,
  LECTURA_CANDIDATA,
  LECTURA_CONTROL,
  RSI_ESTIRADO,
  SWAP_EXIGIDO,
  VARIANTE_JUZGADA,
  QUE_HACER,
  juzgar,
} from './lib/preregistro-bollinger.mjs'

const CALENTAMIENTO = 80
// ⚠️ NO se escribe el número: lo importa. El 2026-10-12 el umbral que decide
// todas las señales tenía nueve copias a mano, y cada una era una forma de
// medir otra app sin que nadie se enterara.
const THR = UMBRAL_FUERZA
const TOP_N = 5
const VELAS = Number(process.env.VELAS || 1500)

console.log('\n╔════════════════════════════════════════════════════════════════════╗')
console.log('║  ¿SIRVEN LAS BANDAS DE BOLLINGER EN SWING?                        ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log(`\nListón escrito el ${FECHA_DEL_LISTON}, antes de esta corrida.`)
console.log(`Candidata: la lectura de ${LECTURA_CANDIDATA.toUpperCase()}, variante «${VARIANTE_JUZGADA}».`)
console.log(`Control:   la lectura de ${LECTURA_CONTROL.toUpperCase()} — el MISMO disparo, al revés.`)
console.log('El veredicto lo calcula `juzgar()`, no lo argumenta nadie.\n')

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave(), { velas: VELAS })
const completo = computarBarrido(fechas, rates, rangosPar)
console.log(`Días de mercado: ${fechas.length} · de ${fechas[0]} a ${fechas.at(-1)}`)

const CORTE = fechas[Math.floor((CALENTAMIENTO + fechas.length) / 2)]
console.log(`Corte de las dos mitades: ${CORTE}`)

// Meses de MERCADO, no de calendario.
//
// ⚠️ Dividir días de mercado entre 30,44 —los de un mes de calendario— infla
// las señales/mes un 45 %. Ya pasó el 2026-09-14 con el COT: la app apareció a
// 50,0 señales/mes cuando estaba medida en 36,1, y esa discrepancia es lo que
// lo destapó.
const DIAS_MERCADO_MES = 21.7
const MESES = (fechas.length - CALENTAMIENTO) / DIAS_MERCADO_MES
console.log(`Meses de mercado medidos: ${MESES.toFixed(1)}\n`)

// Todo con la vara NEUTRA 1:1 (`simetrica`). Es la que decide, y el motivo
// está escrito desde el 2026-09-14: con objetivos variables un filtro puede
// seleccionar operaciones con buena proporción objetivo/riesgo sin acertar ni
// una dirección de más. Con 1:1 el resultado depende SOLO de acertar el lado.
function correr(reglaEntrada, orden = null) {
  const senales = generarSenales(fechas, rates, rangosPar, {
    calentamiento: CALENTAMIENTO,
    thr: THR,
    topN: TOP_N,
    geometria: simetrica,
    reglaEntrada,
    orden,
  })
  const { resultados } = resolver(senales, completo)
  return { senales, porClave: new Map(resultados.map((r) => [r.clave, r])) }
}

function grupo({ senales, porClave }) {
  // `porClave` se devuelve para poder saber DESPUÉS cuáles se juzgaron.
  const t = medir(senales, porClave, { conSpread: true })
  const m1 = medir(senales.filter((s) => s.vistoEl < CORTE), porClave, { conSpread: true })
  const m2 = medir(senales.filter((s) => s.vistoEl >= CORTE), porClave, { conSpread: true })
  const swap = medir(senales, porClave, { conSpread: true, swapPipsNoche: SWAP_EXIGIDO })
  return {
    ops: t.total,
    acierto: t.acierto,
    por1R: t.porRiesgo,
    mitad1: m1.porRiesgo,
    mitad2: m2.porRiesgo,
    swap: swap.porRiesgo,
    senales,
    porClave,
  }
}

// ── Las reglas ────────────────────────────────────────────────────────────

const ordenB = ordenPorBollinger()

const CANDIDATAS = [
  ['Bollinger, toque de banda (sola)', reglaBollinger({ lectura: LECTURA_CANDIDATA }), ordenB],
  [
    `Bollinger + RSI estirado (${RSI_ESTIRADO})  ← LA JUZGADA`,
    reglaBollinger({ lectura: LECTURA_CANDIDATA, rsiEstirado: RSI_ESTIRADO }),
    ordenB,
  ],
  [
    'Bollinger + fuerza relativa',
    reglaBollinger({ lectura: LECTURA_CANDIDATA, exigirFuerza: true }),
    ordenB,
  ],
  [
    'CONTROL: el mismo disparo, al revés',
    reglaBollinger({ lectura: LECTURA_CONTROL, rsiEstirado: RSI_ESTIRADO }),
    ordenB,
  ],
]

// La reversión M2, que es contra quien hay que ganar. Se corre AQUÍ y no se
// copia un número de la memoria: los de CLAUDE.md son de antes de la rejilla
// limpia (2026-10-06) y del swap por noches de calendario, así que compararse
// con ellos sería compararse con otra medición.
const REGLA_M2 = (p, esc, thr) =>
  p.dif < -thr && p.rsiV <= RSI_ESTIRADO ? 'COMPRA' : p.dif > thr && p.rsiV >= 100 - RSI_ESTIRADO ? 'VENTA' : null

console.log('LAS FILAS (vara neutra 1:1, spread por par descontado)')
console.log('')
console.log('regla                                      ops  señ/mes  acierto   por 1R   1ª mit   2ª mit   +swap')
console.log('─'.repeat(104))

const num = (x) => (x === null || !Number.isFinite(x) ? '    —' : (x >= 0 ? '+' : '') + x.toFixed(3)).padStart(7)
const pct = (x) => (x === null || !Number.isFinite(x) ? '  — ' : x.toFixed(0) + '%').padStart(5)

const resultados = new Map()
for (const [nombre, regla, orden] of CANDIDATAS) {
  const g = grupo(correr(regla, orden))
  resultados.set(nombre, g)
  console.log(
    `${nombre.padEnd(42)} ${String(g.ops).padStart(5)}   ${(g.ops / MESES).toFixed(1).padStart(5)}   ` +
      `${pct(g.acierto)}  ${num(g.por1R)}  ${num(g.mitad1)}  ${num(g.mitad2)}  ${num(g.swap)}`
  )
}

const gM2 = grupo(correr(REGLA_M2))
resultados.set('M2', gM2)
console.log('─'.repeat(104))
console.log(
  `${'la reversión M2 (contra quien hay que ganar)'.padEnd(42)} ${String(gM2.ops).padStart(5)}   ` +
    `${(gM2.ops / MESES).toFixed(1).padStart(5)}   ${pct(gM2.acierto)}  ${num(gM2.por1R)}  ` +
    `${num(gM2.mitad1)}  ${num(gM2.mitad2)}  ${num(gM2.swap)}`
)

const gApp = grupo(correr(null))
console.log(
  `${'la app tal cual, con la misma vara'.padEnd(42)} ${String(gApp.ops).padStart(5)}   ` +
    `${(gApp.ops / MESES).toFixed(1).padStart(5)}   ${pct(gApp.acierto)}  ${num(gApp.por1R)}  ` +
    `${num(gApp.mitad1)}  ${num(gApp.mitad2)}  ${num(gApp.swap)}`
)
console.log('─'.repeat(104))

// ── El solape con M2, que es información y NO decide ──────────────────────
//
// 📌 Se calcula y se imprime porque el 2026-09-07 le dije a Néstor que
// «comprar la caída» solapaba un 3 % con la reversión y el número real era
// 18 %. Un número que se recuerda es un número que se inventa.

const juzgada = CANDIDATAS[1][0]
const gJuzgada = resultados.get(juzgada)

// ⚠️ SOBRE LAS SEÑALES QUE DE VERDAD SE JUZGARON, no sobre todas las
// generadas. El humo las enseñó distintas (135 contra 137): las que siguen
// abiertas al final de la serie se generan pero no entran en `por 1R`. Si el
// solape y el reparto se midieran sobre todas, hablarían de un conjunto
// distinto del que dio el número que decide.
const juzgadas = (g) => g.senales.filter((s) => ['ganada', 'perdida'].includes(g.porClave.get(`${s.id}@${s.vistoEl}`)?.resultado))

const vJuzgada = juzgadas(gJuzgada)
// La clave es `id@vistoEl`, que es la del resto del proyecto: la misma
// combinación par/lado reaparece y cada aparición es una operación distinta.
const clavesM2 = new Set(juzgadas(gM2).map((s) => `${s.id}@${s.vistoEl}`))
const comunes = vJuzgada.filter((s) => clavesM2.has(`${s.id}@${s.vistoEl}`)).length
const solape = vJuzgada.length ? comunes / vJuzgada.length : null

console.log('')
console.log('SOLAPE CON LA REVERSIÓN M2 (información, no decide)')
console.log(
  solape === null
    ? '  no se pudo calcular: la variante juzgada no dio señales'
    : `  ${comunes} de ${vJuzgada.length} señales de la variante juzgada son TAMBIÉN de M2 — ${(solape * 100).toFixed(0)} %`
)
console.log('  Un solape alto dice «esto es M2 con otro sombrero». Por eso el')
console.log('  criterio que decide no es la independencia, es si le GANA a M2.')

// ── El reparto por par ────────────────────────────────────────────────────

const porPar = new Map()
// `par`, no `name`: así se llama el campo que escribe `generarSenales`. El
// humo lo cazó imprimiendo «undefined con el 100 %» — que es justo el aspecto
// que tiene un criterio de concentración roto, y habría tumbado la regla por
// el motivo equivocado.
for (const s of vJuzgada) porPar.set(s.par, (porPar.get(s.par) || 0) + 1)
const mayor = [...porPar.entries()].sort((a, b) => b[1] - a[1])[0]
const concentracion = vJuzgada.length && mayor ? mayor[1] / vJuzgada.length : null

console.log('')
console.log('REPARTO POR PAR (que el resultado no salga de un solo par)')
if (mayor) {
  console.log(`  el que más aporta: ${mayor[0]} con ${mayor[1]} de ${vJuzgada.length} (${(concentracion * 100).toFixed(0)} %)`)
  console.log(`  pares distintos con señal: ${porPar.size}`)
} else {
  console.log('  sin señales que repartir')
}

// ── EL DESGLOSE POR DIVISA ────────────────────────────────────────────────
//
// Lo pidió Néstor el 2026-10-20: «ver si es rentable en forma robusta en todas
// las divisas». El reparto de arriba contesta otra cosa —que el total no salga
// de un solo par— y hasta hoy el resultado de CADA par no se imprimía nunca.
//
// ⚠️⚠️ ESTO NO DECIDE NADA, Y LA TENTACIÓN ES OBVIA: al ver que una regla gana
// en cinco pares y pierde en nueve, lo que se quiere hacer es operar solo esos
// cinco. **Eso sería elegir DESPUÉS de ver la tabla** —el troceo a posteriori
// que este proyecto rechazó con el control de la confluencia (2026-09-04) y
// con el del barrido de liquidez— y necesitaría su propio preregistro, con los
// pares nombrados ANTES de medirlos.
//
// ⚠️ EL MARGEN VA PEGADO A CADA FILA, porque sin él la tabla engaña sola:
// repartir unas 550 operaciones entre 14 pares deja ~39 por par, y con 39 el
// margen del peor caso es ±16 puntos de acierto. Un par con +0,20 y otro con
// −0,20 pueden perfectamente ser el mismo par.
//
// Lo que la tabla SÍ dice con fuerza es el RECUENTO de la última línea: una
// regla que gana en 12 de 14 es robusta; una que gana en 7 es una moneda al
// aire. Ese número no depende del margen de cada fila.

const COLUMNAS = [
  ['sola', resultados.get(CANDIDATAS[0][0])],
  ['+RSI(J)', gJuzgada],
  ['+fuerza', resultados.get(CANDIDATAS[2][0])],
  ['M2', gM2],
  ['app', gApp],
]

/** El resultado de UN par dentro de una regla. `null` si no dio señales. */
function delPar(g, par) {
  // `par`, no `name`: así se llama el campo que escribe `generarSenales`. El
  // humo ya cazó una vez el «undefined con el 100 %» por confundirlos.
  const suyas = g.senales.filter((s) => s.par === par)
  if (!suyas.length) return { ops: 0, por1R: null }
  const m = medir(suyas, g.porClave, { conSpread: true })
  // `m.total` son las JUZGADAS: las que siguen abiertas al final de la serie
  // se generan y no entran en el número, igual que en la tabla de arriba.
  return { ops: m.total, por1R: m.total ? m.porRiesgo : null }
}

const margenDe = (n) => (n > 0 ? Math.round(98 / Math.sqrt(n)) : null)

console.log('')
console.log('DESGLOSE POR DIVISA — ¿gana en todas o solo en unas pocas?')
console.log('(por 1R con spread, vara neutra 1:1. El margen es del acierto de la variante juzgada.)')
console.log('')
console.log(`${'par'.padEnd(10)} ${'ops(J)'.padStart(6)} ${'margen'.padStart(7)}   ` + COLUMNAS.map(([n]) => n.padStart(8)).join(''))
console.log('─'.repeat(10 + 1 + 6 + 1 + 7 + 3 + 8 * COLUMNAS.length))

// Los 14 van SIEMPRE, también los que no dieron ni una señal. Esconder los
// vacíos dejaría en pantalla solo lo que parece significar algo, que es cómo
// se fabrica un espejismo — misma decisión que en `Diagnostico`.
const positivos = COLUMNAS.map(() => 0)
const negativos = COLUMNAS.map(() => 0)

for (const par of PAIR_NAMES) {
  const celdas = COLUMNAS.map(([, g], i) => {
    const { por1R } = delPar(g, par)
    if (por1R === null || !Number.isFinite(por1R)) return '       —'
    if (por1R > 0) positivos[i]++
    else negativos[i]++
    return ((por1R >= 0 ? '+' : '') + por1R.toFixed(2)).padStart(8)
  })
  const { ops } = delPar(gJuzgada, par)
  const m = margenDe(ops)
  console.log(
    `${par.padEnd(10)} ${String(ops).padStart(6)} ${(m === null ? '—' : '±' + m).padStart(7)}   ` + celdas.join('')
  )
}

console.log('─'.repeat(10 + 1 + 6 + 1 + 7 + 3 + 8 * COLUMNAS.length))
console.log(
  `${'GANA EN'.padEnd(10)} ${''.padStart(6)} ${''.padStart(7)}   ` +
    positivos.map((p, i) => `${p}/${p + negativos[i]}`.padStart(8)).join('')
)
console.log('')
console.log('  El recuento es la respuesta a «robusta en todas las divisas». Cada')
console.log('  fila suelta lleva un margen tan ancho que no distingue casi nada.')

// ── EL VEREDICTO ──────────────────────────────────────────────────────────

const v = juzgar({
  candidata: gJuzgada,
  candidataSwap: { por1R: gJuzgada.swap },
  m2: gM2,
  meses: MESES,
  porPar: concentracion,
})

console.log('')
console.log('╔════════════════════════════════════════════════════════════════════╗')
console.log('║  EL VEREDICTO                                                      ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log('')

if (v.noSePudoMedir) {
  console.log('⚠️  NO SE PUDO JUZGAR. Falta un número, y un falso verde es peor que')
  console.log('    un rojo:')
  console.log(`    ${v.noSePudoMedir}`)
} else {
  for (const [nombre, ok, detalle] of v.detalle) {
    console.log(`  ${ok ? '✅' : '❌'} ${nombre.padEnd(42)} ${detalle}`)
  }
  console.log('')
  console.log(`  → ${v.pasa ? 'PASA' : 'NO PASA'} el listón (${v.pasados} de ${v.total} criterios)`)
}

console.log('')
console.log('⚠️  LO QUE ESTO AUTORIZA')
console.log('')
for (const linea of [v.pasa ? QUE_HACER.pasa : QUE_HACER.noPasa, QUE_HACER.control, QUE_HACER.siempre]) {
  for (const trozo of linea.match(/.{1,70}(\s|$)/g) || []) console.log(`   ${trozo.trim()}`)
  console.log('')
}
