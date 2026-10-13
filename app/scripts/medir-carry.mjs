// ¿LAS SEÑALES QUE VAN A FAVOR DEL DIFERENCIAL MIDEN DISTINTO DE LAS QUE VAN
// EN CONTRA?
//
//     node scripts/medir-carry.mjs
//
// Cuesta 14 créditos de Twelve Data (los 14 pares). Las tasas salen del BIS,
// que es gratis y sin llave.
//
// ⚠️⚠️ ES UN DIAGNÓSTICO, NO UNA REGLA NI UN FILTRO. Parte en dos las señales
// que la app y la reversión YA producen y compara los dos montones. No cambia
// una señal, no toca `src/`, y su workflow lleva permiso de solo lectura.
//
// Si saliera que las de un lado miden mejor, eso NO autoriza encender nada:
// sería un FILTRO, y los filtros van al banco de pruebas con su listón escrito
// antes — van OCHO familias medidas y OCHO fallando. Esto contesta si hay algo
// que mirar, y nada más.
//
// ⚠️ Y la advertencia que está escrita en `sonda-tasas.mjs` desde antes de ver
// ningún dato: **la diferencia de tasas NO es el swap.** El banco central pone
// la referencia; el bróker le suma un margen que no publica nadie y que además
// es asimétrico. Esto mira el SIGNO, no el número.

import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { computarBarrido, UMBRAL_FUERZA } from '../src/lib/marketCalc.js'
import { generarSenales, medir } from './lib/backtest-nucleo.mjs'
import { resolver } from './lib/resolver.mjs'
import { simetrica } from './lib/geometrias.mjs'
import { monedasDe } from '../src/lib/pairs.js'
import { margen } from '../src/lib/diagnostico.js'
import { leerSerieCSV, OBSERVACIONES, ZONA_DIVISA } from '../src/lib/tasas.js'
import { DIAS_MARGEN, UMBRAL_NEUTRO, repartir } from './lib/carry.mjs'

const CALENTAMIENTO = 80
const THR = UMBRAL_FUERZA
const TOP_N = 5
const VELAS = Number(process.env.VELAS || 1500)
const RSI_ESTIRADO = 35

console.log('\n╔════════════════════════════════════════════════════════════════════╗')
console.log('║  ¿IMPORTA IR A FAVOR O EN CONTRA DEL DIFERENCIAL DE TASAS?        ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log('')
console.log('⚠️  DIAGNÓSTICO, no una regla. Parte las señales que ya existen y')
console.log('    compara los montones. Nada se enciende con esto.')
console.log('')

// ── Las tasas, del BIS ────────────────────────────────────────────────────
//
// Mismo endpoint que usa el publicador de tasas, con la serie entera. No
// cuesta un crédito de Twelve Data ni necesita ningún secreto.

const ZONAS = Object.values(ZONA_DIVISA).length ? Object.keys(ZONA_DIVISA).join('+') : ''
const URL_BIS =
  `https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/D.${ZONAS}` +
  `?lastNObservations=${OBSERVACIONES}&format=csv`

console.log('Bajando las tasas del BIS…')
// ⚠️ Con `try`. Un `fetch` que no llega REVIENTA con un volcado de pila, y eso
// se lee como «el guion está roto» cuando lo que pasa es que no hubo red. El
// entorno donde se programa esto tiene `stats.bis.org` bloqueado a propósito,
// así que el caso no es hipotético: es el normal fuera de Actions.
let csv
try {
  const r = await fetch(URL_BIS, { headers: { accept: 'text/csv' } })
  if (!r.ok) {
    console.error(`✗ El BIS respondió ${r.status}. Sin tasas no hay nada que partir.`)
    process.exit(1)
  }
  csv = await r.text()
} catch (e) {
  console.error('✗ No se pudo llegar al BIS. Sin tasas no hay nada que partir.')
  console.error(`  ${e?.cause?.message || e?.message || e}`)
  console.error('  Desde el entorno de estas sesiones `stats.bis.org` está bloqueado:')
  console.error('  esto hay que lanzarlo desde Actions.')
  process.exit(1)
}
const series = leerSerieCSV(csv)
const divisas = Object.keys(series)
console.log(`  ${divisas.length} divisas · ${divisas.map((d) => `${d}:${series[d].length}`).join(' ')}`)

// ⚠️ Si faltan divisas, se PARA. Medir con la mitad de las tasas repartiría
// media lista a «sin dato» y el informe se leería como «el carry no separa
// nada», cuando lo que pasa es que no se pudo mirar. Es la asimetría de
// `veredictoBusqueda`: sin páginas leídas no hay veredicto.
if (divisas.length < 8) {
  console.error(`✗ Solo llegaron ${divisas.length} de las 8 divisas. No se puede repartir con medias tasas.`)
  process.exit(1)
}
console.log(`  margen de seguridad antes de dar una tasa por conocida: ${DIAS_MARGEN} días`)
console.log(`  banda neutra: |diferencial| < ${UMBRAL_NEUTRO} puntos no se reparte\n`)

// ── Las velas ─────────────────────────────────────────────────────────────

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave(), { velas: VELAS })
const completo = computarBarrido(fechas, rates, rangosPar)
console.log(`Días de mercado: ${fechas.length} · de ${fechas[0]} a ${fechas.at(-1)}\n`)

// Todo con la vara NEUTRA 1:1. Con objetivos variables, un corte puede
// seleccionar operaciones con buena proporción objetivo/riesgo sin acertar ni
// una dirección de más — y aquí lo que se pregunta es justo si el carry dice
// algo sobre la DIRECCIÓN.
function correr(reglaEntrada) {
  const senales = generarSenales(fechas, rates, rangosPar, {
    calentamiento: CALENTAMIENTO,
    thr: THR,
    topN: TOP_N,
    geometria: simetrica,
    reglaEntrada,
  })
  const { resultados } = resolver(senales, completo)
  return { senales, porClave: new Map(resultados.map((x) => [x.clave, x])) }
}

const REGLA_M2 = (p, esc, thr) =>
  p.dif < -thr && p.rsiV <= RSI_ESTIRADO ? 'COMPRA' : p.dif > thr && p.rsiV >= 100 - RSI_ESTIRADO ? 'VENTA' : null

const CONJUNTOS = [
  ['las señales de la app', null],
  ['la reversión M2', REGLA_M2],
]

const num = (x) => (x === null || !Number.isFinite(x) ? '    —' : (x >= 0 ? '+' : '') + x.toFixed(3)).padStart(7)

for (const [nombre, regla] of CONJUNTOS) {
  const { senales, porClave } = correr(regla)
  const cubos = repartir(senales, series, monedasDe)

  console.log(`\n${nombre.toUpperCase()}  (vara neutra 1:1, spread por par)`)
  console.log('')
  console.log('montón                       ops   acierto   margen    por 1R')
  console.log('─'.repeat(64))

  const filas = []
  for (const [clave, etiqueta] of [
    ['aFavor', 'A FAVOR del diferencial'],
    ['enContra', 'EN CONTRA'],
    ['neutro', 'indiferente (banda neutra)'],
    ['sinDato', 'sin tasa publicada todavía'],
  ]) {
    const m = medir(cubos[clave], porClave, { conSpread: true })
    filas.push({ clave, m })
    const ac = m.acierto === null ? '   — ' : `${m.acierto.toFixed(0)}%`.padStart(5)
    const mg = m.total ? `±${margen(m.total).toFixed(0)}`.padStart(6) : '     —'
    console.log(`${etiqueta.padEnd(28)} ${String(m.total).padStart(4)}    ${ac}   ${mg}   ${num(m.porRiesgo)}`)
  }
  console.log('─'.repeat(64))
  const total = medir(senales, porClave, { conSpread: true })
  console.log(`${'TODAS juntas'.padEnd(28)} ${String(total.total).padStart(4)}    ${(total.acierto === null ? '   — ' : `${total.acierto.toFixed(0)}%`.padStart(5))}   ${`±${margen(total.total).toFixed(0)}`.padStart(6)}   ${num(total.porRiesgo)}`)

  // La diferencia entre los dos montones, con su margen al lado.
  //
  // ⚠️ EL MARGEN VA PEGADO AL NÚMERO Y NO EN UNA NOTA AL PIE. Partir en
  // montones hace las muestras más pequeñas, y un porcentaje de un montón
  // chico se lee como un diagnóstico cuando no distingue nada. Es el mismo
  // motivo por el que el Diario lleva el `±` desde el 2026-09-14.
  const aF = filas.find((f) => f.clave === 'aFavor').m
  const eC = filas.find((f) => f.clave === 'enContra').m
  if (Number.isFinite(aF.porRiesgo) && Number.isFinite(eC.porRiesgo)) {
    const d = aF.porRiesgo - eC.porRiesgo
    console.log('')
    console.log(`  diferencia (a favor − en contra): ${num(d)} por unidad de riesgo`)
    if (aF.acierto !== null && eC.acierto !== null) {
      const mA = margen(aF.total)
      const mE = margen(eC.total)
      const solapan = Math.abs(aF.acierto - eC.acierto) < mA + mE
      console.log(
        `  acierto ${aF.acierto.toFixed(0)}% ±${mA.toFixed(0)} contra ${eC.acierto.toFixed(0)}% ±${mE.toFixed(0)} — ` +
          `los márgenes ${solapan ? 'SE SOLAPAN: no distingue nada' : 'NO se solapan'}`
      )
    }
  } else {
    console.log('')
    console.log('  no se puede comparar: uno de los dos montones se quedó sin operaciones juzgadas')
  }
}

console.log('')
console.log('⚠️  LO QUE ESTO NO AUTORIZA')
console.log('')
console.log('   Que un montón mida mejor NO enciende nada. Sería un FILTRO, y los')
console.log('   filtros van al banco de pruebas con su listón escrito antes: van')
console.log('   ocho familias medidas y ocho fallando.')
console.log('')
console.log('   Y la diferencia de tasas NO es el swap: el bróker le suma un margen')
console.log('   que no publica nadie y que es asimétrico. Esto mira el signo.')
console.log('')
