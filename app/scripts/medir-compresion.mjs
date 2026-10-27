// ¿LAS SEÑALES DE UN PAR COMPRIMIDO MIDEN DISTINTO DE LAS DE UNO EXPANDIDO?
//
//     node scripts/medir-compresion.mjs
//
// Cuesta 14 créditos de Twelve Data (los 14 pares) y nada más.
//
// ⚠️⚠️ ES UN DIAGNÓSTICO, NO UNA REGLA NI UN FILTRO. Parte en montones las
// señales que la app YA produce y compara. No cambia una señal, no toca `src/`,
// y su workflow lleva permiso de SOLO LECTURA.
//
// El listón está en `lib/preregistro-compresion.mjs`, escrito el 2026-10-27,
// ANTES de la primera corrida. Ahí está también la hipótesis con su mecanismo
// —el stop sale del ATR, así que un ATR bajo deja el stop estrecho y el spread
// pesa más— y, lo que de verdad decide qué significa el resultado, la columna
// SIN COSTES: si la diferencia desaparece al quitar el peaje, era el peaje.
//
// ⚠️ Pase lo que pase, esto NO autoriza encender nada. Van NUEVE familias de
// filtros medidas y nueve que no pasan.

import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { computarBarrido, UMBRAL_FUERZA } from '../src/lib/marketCalc.js'
import { generarSenales, medir } from './lib/backtest-nucleo.mjs'
import { resolver } from './lib/resolver.mjs'
import { simetrica } from './lib/geometrias.mjs'
import { margen } from '../src/lib/diagnostico.js'
import { fechaDeCorte, partirPorFecha, repartirPorCompresion } from './lib/compresion-montones.mjs'
import {
  CORTE_COMPRIMIDO,
  CORTE_EXPANDIDO,
  FECHA_LISTON,
  MIN_OPS_POR_MONTON,
  UMBRAL_SIN_COSTES,
  juzgar,
} from './lib/preregistro-compresion.mjs'

const CALENTAMIENTO = 80
const TOP_N = 5
const VELAS = Number(process.env.VELAS || 1500)

console.log('\n╔════════════════════════════════════════════════════════════════════╗')
console.log('║  ¿IMPORTA QUE EL PAR VENGA COMPRIMIDO?                            ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log('')
console.log(`Listón escrito el ${FECHA_LISTON}, antes de la primera corrida.`)
console.log('')
console.log('⚠️  DIAGNÓSTICO, no una regla. Parte las señales que ya existen y')
console.log('    compara los montones. Nada se enciende con esto.')
console.log('')
console.log('HIPÓTESIS, escrita antes de medir: el montón COMPRIMIDO mide PEOR,')
console.log('y el mecanismo NO es dirección — es que el stop sale del ATR, así')
console.log('que con el ATR bajo el stop queda estrecho y el spread (fijo en')
console.log('pips) pesa más. La columna SIN COSTES es la que distingue las dos')
console.log('lecturas.')
console.log('')

// ── Las velas ─────────────────────────────────────────────────────────────

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave(), { velas: VELAS })
const completo = computarBarrido(fechas, rates, rangosPar)
console.log(`Días de mercado: ${fechas.length} · de ${fechas[0]} a ${fechas.at(-1)}`)

// ── Lo que se compara ─────────────────────────────────────────────────────
//
// Todo con la vara NEUTRA 1:1. Con la geometría real de la app, un corte
// puede seleccionar operaciones con buena proporción objetivo/riesgo sin
// acertar ni una dirección de más — y aquí se pregunta justo si la compresión
// dice algo del RESULTADO. Es la lección del COT (2026-09-14): el mismo filtro
// salía positivo en las dos mitades con una vara y negativo en las dos con la
// otra, y lo que lo movía era la geometría.
const senales = generarSenales(fechas, rates, rangosPar, {
  calentamiento: CALENTAMIENTO,
  thr: UMBRAL_FUERZA,
  topN: TOP_N,
  geometria: simetrica,
})
const { resultados } = resolver(senales, completo)
const porClave = new Map(resultados.map((x) => [x.clave, x]))

const corte = fechaDeCorte(fechas.slice(CALENTAMIENTO))
console.log(`Señales: ${senales.length} · corte de mitades: ${corte}`)
console.log('')

// ── El reparto ────────────────────────────────────────────────────────────

const cubos = repartirPorCompresion(senales)
console.log(`CORTE: comprimido < ${CORTE_COMPRIMIDO} · expandido > ${CORTE_EXPANDIDO}`)
console.log('(entre los dos hay una banda muerta a propósito: pegar los montones')
console.log(' por un borde común no compara dos cosas distintas)')
console.log('')

// ⚠️ EL CUBO «SIN DATO» SE IMPRIME SIEMPRE, también cuando está vacío. La
// lección del carry (2026-10-13): el informe repartía en cubos y no decía que
// «sin dato» no era aleatorio, así que la tabla se leía como si cubriera el
// periodo entero. Un cubo que no se nombra se da por vacío.
if (cubos.sinDato.length) {
  console.log(`⚠️  ${cubos.sinDato.length} señales SIN compresión calculable. No se reparten:`)
  console.log('    meterlas en un montón convertiría un hueco de datos en un hecho')
  console.log('    sobre el mercado.')
} else {
  console.log('✓ Cero señales sin compresión: el reparto cubre todo el periodo.')
}
console.log('')

const num = (x) => (x === null || !Number.isFinite(x) ? '    —' : (x >= 0 ? '+' : '') + x.toFixed(3)).padStart(7)
const pct = (x) => (x === null || !Number.isFinite(x) ? '   — ' : `${x.toFixed(0)}%`.padStart(5))

const filaDe = (lista, opciones = {}) => medir(lista, porClave, { conSpread: true, ...opciones })

const MONTONES = [
  ['comprimido', `COMPRIMIDO (< ${CORTE_COMPRIMIDO})`],
  ['medio', 'en medio (banda muerta)'],
  ['expandido', `EXPANDIDO (> ${CORTE_EXPANDIDO})`],
]

console.log('CON COSTES (spread por par)')
console.log('')
console.log('montón                       ops   acierto   margen    por 1R    1ª mit   2ª mit')
console.log('─'.repeat(82))

const medidas = {}
for (const [clave, etiqueta] of MONTONES) {
  const m = filaDe(cubos[clave])
  const mitades = (partirPorFecha(cubos[clave], corte) || [[], []]).map((l) => filaDe(l).porRiesgo)
  medidas[clave] = { m, mitades }
  const mg = m.total ? `±${margen(m.total).toFixed(0)}`.padStart(6) : '     —'
  console.log(
    `${etiqueta.padEnd(28)} ${String(m.total).padStart(4)}    ${pct(m.acierto)}   ${mg}   ` +
      `${num(m.porRiesgo)}  ${num(mitades[0])}  ${num(mitades[1])}`,
  )
}
console.log('─'.repeat(82))
const todas = filaDe(senales)
const mitadesTodas = (partirPorFecha(senales, corte) || [[], []]).map((l) => filaDe(l).porRiesgo)
console.log(
  `${'TODAS juntas (la app)'.padEnd(28)} ${String(todas.total).padStart(4)}    ${pct(todas.acierto)}   ` +
    `${`±${margen(todas.total).toFixed(0)}`.padStart(6)}   ${num(todas.porRiesgo)}  ` +
    `${num(mitadesTodas[0])}  ${num(mitadesTodas[1])}`,
)

// ── ⚠️⚠️ LA COLUMNA QUE DECIDE QUÉ SIGNIFICA ─────────────────────────────

console.log('')
console.log('SIN COSTES  ← la que distingue «es el peaje» de «dice algo»')
console.log('')
console.log('montón                       ops   acierto    por 1R')
console.log('─'.repeat(56))
const sinCostes = {}
for (const [clave, etiqueta] of MONTONES) {
  const m = filaDe(cubos[clave], { conSpread: false })
  sinCostes[clave] = m
  console.log(
    `${etiqueta.padEnd(28)} ${String(m.total).padStart(4)}    ${pct(m.acierto)}   ${num(m.porRiesgo)}`,
  )
}
console.log('─'.repeat(56))

// Y el stop mediano de cada montón, que es el mecanismo a la vista. Si la
// hipótesis es cierta, el montón comprimido tiene stops más cortos y por eso
// el mismo spread le pesa más.
const stopMediano = (lista) => {
  const v = lista.map((s) => s.pipRiesgo).filter(Number.isFinite).sort((a, b) => a - b)
  if (!v.length) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}
console.log('')
console.log('EL MECANISMO A LA VISTA: stop mediano de cada montón, en pips')
console.log('')
for (const [clave, etiqueta] of MONTONES) {
  const sp = stopMediano(cubos[clave])
  console.log(`  ${etiqueta.padEnd(28)} ${sp === null ? '—' : `${sp} pips`}`)
}
console.log('')
console.log('  (un stop más corto con el mismo spread = más peaje por operación.')
console.log('   Medido en este proyecto: en Swing 2 pips sobre un stop de ~155')
console.log('   pesan el 1,3 %; en Intradía, sobre ~30, el 7 %.)')

// ── EL VEREDICTO, que lo CALCULA `juzgar()` ───────────────────────────────

const d = {
  acComprimido: medidas.comprimido.m.acierto === null ? NaN : medidas.comprimido.m.acierto / 100,
  acExpandido: medidas.expandido.m.acierto === null ? NaN : medidas.expandido.m.acierto / 100,
  opsComprimido: medidas.comprimido.m.total,
  opsExpandido: medidas.expandido.m.total,
  r1Comprimido: medidas.comprimido.m.porRiesgo,
  r1Expandido: medidas.expandido.m.porRiesgo,
  mitadesComprimido: medidas.comprimido.mitades,
  mitadesExpandido: medidas.expandido.mitades,
  sinCostesComprimido: sinCostes.comprimido.porRiesgo,
  sinCostesExpandido: sinCostes.expandido.porRiesgo,
}

const v = juzgar(d)

console.log('')
console.log('═'.repeat(82))
console.log('EL VEREDICTO (lo calcula `juzgar()`, no lo argumenta nadie)')
console.log('═'.repeat(82))
console.log('')

if (v === null) {
  // ⚠️ `null` es «NO SE PUDO JUZGAR», que no es «no pasa». Misma asimetría que
  // `veredictoBusqueda`: sin datos no hay veredicto.
  console.log('⚠️  NO SE PUDO JUZGAR: falta algún número. No es «no pasa».')
  process.exit(1)
}

console.log(`Diferencia de acierto (expandido − comprimido): ${d.acExpandido !== d.acExpandido ? '—' : `${v.difPuntos.toFixed(1)} puntos`}`)
console.log(`Margen sumado de los dos montones: ±${v.sumaMargenes.toFixed(1)}`)
console.log(`Brecha SIN costes (expandido − comprimido): ${num(v.brechaSinCostes)} (umbral ${UMBRAL_SIN_COSTES})`)
console.log('')

if (v.pasa) {
  console.log('✅ PASA LOS CRITERIOS DEL LISTÓN.')
} else {
  console.log(`❌ NO PASA. Falla ${v.falta.length} criterio(s):`)
  for (const f of v.falta) console.log(`   · ${f}`)
}

console.log('')
console.log('LA LECTURA:')
console.log(`   ${v.lectura}`)
console.log('')
console.log('⚠️  LO QUE ESTO NO AUTORIZA, pase lo que pase:')
console.log('   · tocar ninguna señal de esta app, ni un umbral, ni el aviso al celular;')
console.log('   · tocar `COMPRESION_MIN` de la app hermana, que es el único sitio del')
console.log('     proyecto donde la compresión ya decide algo (las señales de rango);')
console.log(`   · aflojar un criterio al ver el resultado (el listón es del ${FECHA_LISTON});`)
console.log(`   · leer un montón de menos de ${MIN_OPS_POR_MONTON} operaciones como un diagnóstico.`)
console.log('')
