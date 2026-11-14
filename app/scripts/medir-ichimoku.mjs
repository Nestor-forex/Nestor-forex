// ¿SIRVE EL ICHIMOKU EN SWING?
//
//     node scripts/medir-ichimoku.mjs
//
// Cuesta 14 créditos de Twelve Data (los 14 pares, en dos tandas).
//
// ⚠️ NO CAMBIA NADA. No toca un archivo de `src/`, ni una señal, ni el barrido
// publicado, ni el historial, ni las reglas de la sombra. Su workflow lleva
// permiso de solo lectura. Y pasar el listón TAMPOCO enciende nada: ver
// `QUE_HACER` en el preregistro.
//
// ⚠️ EL LISTÓN ESTÁ ESCRITO ANTES, en `lib/preregistro-ichimoku.mjs` con fecha
// 2026-11-15 dentro, incluido CUÁL disparo es la candidata, cuál el control y
// CUÁL variante se juzga. El veredicto lo calcula `juzgar()`.

import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { computarBarrido, RSI_REVERSION, UMBRAL_FUERZA } from '../src/lib/marketCalc.js'
import { PAIR_NAMES } from '../src/lib/pairs.js'
import { generarSenales, medir } from './lib/backtest-nucleo.mjs'
import { resolver } from './lib/resolver.mjs'
import { simetrica } from './lib/geometrias.mjs'
import { ordenPorIchimoku, reglaIchimoku } from '../src/lib/ichimoku.js'
import {
  DISPARO_CANDIDATO,
  FECHA_DEL_LISTON,
  LECTURA_CANDIDATA,
  LECTURA_CONTROL,
  QUE_HACER,
  SWAP_EXIGIDO,
  VARIANTE_JUZGADA,
  juzgar,
} from './lib/preregistro-ichimoku.mjs'

const CALENTAMIENTO = 100
// ⚠️ Se importa, no se escribe: el Ichimoku no usa la fuerza, pero `generarSenales`
// la pide y la app la usa. Un `0.5` a mano aquí es justo lo que vigila
// `prueba-umbral.mjs`.
const THR = UMBRAL_FUERZA
const TOP_N = 5
const VELAS = Number(process.env.VELAS || 1500)

console.log('\n╔════════════════════════════════════════════════════════════════════╗')
console.log('║  ¿SIRVE EL ICHIMOKU EN SWING?                  ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log(`\nListón escrito el ${FECHA_DEL_LISTON}, antes de esta corrida.`)
console.log(`Candidata: ${VARIANTE_JUZGADA}, a favor del cruce.`)
console.log(`Control:   lectura ${LECTURA_CONTROL.toUpperCase()} — el MISMO disparo, al revés.`)
console.log('El veredicto lo calcula `juzgar()`, no lo argumenta nadie.\n')

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave(), { velas: VELAS })
const completo = computarBarrido(fechas, rates, rangosPar)
console.log(`Días de mercado: ${fechas.length} · de ${fechas[0]} a ${fechas.at(-1)}`)

const CORTE = fechas[Math.floor((CALENTAMIENTO + fechas.length) / 2)]
console.log(`Corte de las dos mitades: ${CORTE}`)

// Meses de MERCADO, no de calendario: dividir días de mercado entre 30,44
// infla las señales/mes un 45 % (pasó con el COT el 2026-09-14).
const MESES = (fechas.length - CALENTAMIENTO) / 21.7
console.log(`Meses de mercado medidos: ${MESES.toFixed(1)}\n`)

// Todo con la vara NEUTRA 1:1: con 1:1 el resultado depende SOLO de acertar el
// lado, que es lo que se pregunta.
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
  const t = medir(senales, porClave, { conSpread: true })
  const sin = medir(senales, porClave, { conSpread: false })
  const m1 = medir(senales.filter((s) => s.vistoEl < CORTE), porClave, { conSpread: true })
  const m2 = medir(senales.filter((s) => s.vistoEl >= CORTE), porClave, { conSpread: true })
  const swap = medir(senales, porClave, { conSpread: true, swapPipsNoche: SWAP_EXIGIDO })
  return {
    ops: t.total,
    acierto: t.acierto,
    por1R: t.porRiesgo,
    sinCostes: sin.porRiesgo,
    mitad1: m1.porRiesgo,
    mitad2: m2.porRiesgo,
    swap: swap.porRiesgo,
    senales,
    porClave,
  }
}

const REGLA_M2 = (p, esc, thr) =>
  p.dif < -thr && p.rsiV <= RSI_REVERSION ? 'COMPRA' : p.dif > thr && p.rsiV >= 100 - RSI_REVERSION ? 'VENTA' : null

const ORDEN = ordenPorIchimoku()
const FILAS = [
  ['Cruce fuerte (fuera de la nube) ← JUZGADA', reglaIchimoku({ disparo: DISPARO_CANDIDATO, lectura: LECTURA_CANDIDATA }), ORDEN],
  ['Cruce Tenkan/Kijun solo (información)', reglaIchimoku({ disparo: 'cruce', lectura: LECTURA_CANDIDATA }), ORDEN],
  ['Ruptura de la nube (información)', reglaIchimoku({ disparo: 'nube', lectura: LECTURA_CANDIDATA }), ORDEN],
  ['CONTROL: el mismo disparo, al revés', reglaIchimoku({ disparo: DISPARO_CANDIDATO, lectura: LECTURA_CONTROL }), ORDEN],
  ['la reversión M2 (la que corre en la sombra)', REGLA_M2, null],
  ['la app tal cual, misma vara', null, null],
]

const num = (x) => (x === null || !Number.isFinite(x) ? '    —' : (x >= 0 ? '+' : '') + x.toFixed(3)).padStart(7)
const pct = (x) => (x === null || !Number.isFinite(x) ? '  — ' : x.toFixed(0) + '%').padStart(5)

console.log('LAS FILAS (vara neutra 1:1, spread por par descontado salvo «sin costes»)')
console.log('')
console.log('regla                                       ops señ/mes acierto  por 1R  sin cost  1ª mit  2ª mit   +swap')
console.log('─'.repeat(108))
const R = new Map()
for (const [nombre, regla, orden] of FILAS) {
  const g = grupo(correr(regla, orden))
  R.set(nombre, g)
  console.log(
    `${nombre.padEnd(43)} ${String(g.ops).padStart(5)} ${(g.ops / MESES).toFixed(1).padStart(6)}  ${pct(g.acierto)} ` +
      `${num(g.por1R)}  ${num(g.sinCostes)} ${num(g.mitad1)} ${num(g.mitad2)} ${num(g.swap)}`
  )
}
console.log('─'.repeat(108))

const gJ = R.get(FILAS[0][0])
const gControl = R.get(FILAS[3][0])
const gM2 = R.get(FILAS[4][0])

const juzgadas = (g) =>
  g.senales.filter((s) => ['ganada', 'perdida'].includes(g.porClave.get(`${s.id}@${s.vistoEl}`)?.resultado))
const vJ = juzgadas(gJ)

// ── Solape con M2: información, no decide ────────────────────────────────
const clavesM2 = new Set(juzgadas(gM2).map((s) => `${s.id}@${s.vistoEl}`))
const comunes = vJ.filter((s) => clavesM2.has(`${s.id}@${s.vistoEl}`)).length
console.log('')
console.log('SOLAPE CON LA REVERSIÓN M2 (información, no decide)')
console.log(
  vJ.length
    ? `  ${comunes} de ${vJ.length} señales de la juzgada son TAMBIÉN de M2 — ${((comunes / vJ.length) * 100).toFixed(0)} %`
    : '  no se pudo calcular: la juzgada no dio señales'
)

// ── Reparto por par ───────────────────────────────────────────────────────
const porPar = new Map()
for (const s of vJ) porPar.set(s.par, (porPar.get(s.par) || 0) + 1)
const mayor = [...porPar.entries()].sort((a, b) => b[1] - a[1])[0]
const concentracion = vJ.length && mayor ? mayor[1] / vJ.length : null
console.log('')
console.log('REPARTO POR PAR')
console.log(mayor ? `  el que más aporta: ${mayor[0]} con ${mayor[1]} de ${vJ.length} (${(concentracion * 100).toFixed(0)} %)` : '  sin señales')

// ── Desglose por divisa (no decide) ───────────────────────────────────────
function delPar(g, par) {
  const suyas = g.senales.filter((s) => s.par === par)
  if (!suyas.length) return { ops: 0, por1R: null }
  const m = medir(suyas, g.porClave, { conSpread: true })
  return { ops: m.total, por1R: m.total ? m.porRiesgo : null }
}
console.log('')
console.log('DESGLOSE POR PAR — ¿gana en todos o solo en unos pocos? (no decide)')
console.log(`${'par'.padEnd(10)} ${'ops'.padStart(5)} ${'margen'.padStart(7)}  ${'Ichim.'.padStart(8)} ${'control'.padStart(8)}`)
let gana = 0
let pierde = 0
for (const par of PAIR_NAMES) {
  const a = delPar(gJ, par)
  const b = delPar(gControl, par)
  if (a.por1R !== null) {
    if (a.por1R > 0) gana++
    else pierde++
  }
  const m = a.ops > 0 ? '±' + Math.round(98 / Math.sqrt(a.ops)) : '—'
  console.log(`${par.padEnd(10)} ${String(a.ops).padStart(5)} ${m.padStart(7)}  ${num(a.por1R).padStart(8)} ${num(b.por1R).padStart(8)}`)
}
console.log(`  la juzgada gana en ${gana} de ${gana + pierde} pares con señal`)

// ── El veredicto ──────────────────────────────────────────────────────────
const v = juzgar({
  candidata: gJ,
  control: gControl,
  candidataSwap: { por1R: gJ.swap },
  meses: MESES,
  porPar: concentracion,
})

console.log('')
console.log('╔════════════════════════════════════════════════════════════════════╗')
console.log('║  EL VEREDICTO                                                      ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log('')
if (v.noSePudoMedir) {
  console.log('⚠️  NO SE PUDO JUZGAR. Falta un número, y un falso verde es peor que un rojo:')
  console.log(`    ${v.noSePudoMedir}`)
} else {
  for (const [nombre, ok, detalle] of v.detalle) console.log(`  ${ok ? '✅' : '❌'} ${nombre.padEnd(40)} ${detalle}`)
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
