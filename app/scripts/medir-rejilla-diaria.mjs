// DIAGNÓSTICO: ¿qué es esa vela que trae un cuarto de rango, y qué le hace al stop?
//
//     node scripts/medir-rejilla-diaria.mjs
//
// Se lanza a mano desde Actions → «Diagnóstico de la rejilla diaria».
//
// ─────────────────────────────────────────────────────────────────────────
// QUÉ SE SABE YA GRATIS, Y QUÉ COMPRAN LOS 14 CRÉDITOS
// ─────────────────────────────────────────────────────────────────────────
// Del `barrido.json` y del `senales.jsonl` REALES de producción, sin gastar un
// crédito (está todo en `lib/preregistro-rejilla-diaria.mjs`):
//
//   · **una de cada siete velas es estrecha, en los CATORCE pares** — las
//     posiciones 1, 8 y 15 de los 20 máximos publicados, espaciadas 7;
//   · el cojín de ATR es el **16,6 %** del stop de la app (46 señales reales);
//   · y por tanto **una sola vela nueva no puede mover el stop más de 1,84
//     pips**, que es menos que el spread. Techo aritmético: en Wilder la vela
//     más nueva pesa 1/14.
//
// ⚠️ Los dos últimos puntos contestan la pregunta PEQUEÑA («¿importa la vela de
// hoy?») con un NO. El primero abre la GRANDE: si una de cada siete es
// estrecha, el sesgo no lo acota el 1/14 — lo arrastra el promedio entero.
//
// **Lo único que no se puede tener gratis son LAS FECHAS.** El barrido las
// descarta al publicarse, así que desde fuera se ve el patrón de 1 cada 7 y no
// se puede saber qué día es. Sin el día no se puede elegir entre QUITAR y
// FUNDIR, y elegirlo a ojo sería ponerle nombre a algo que no se ha mirado.
//
// ⚠️⚠️ NO CAMBIA NADA. Lee velas, calcula y escribe en el log. No toca un
// archivo de la app, ni una señal, ni la rama `datos`, ni el historial, ni
// ninguno de los experimentos que ya corren. El workflow va con
// `permissions: contents: read`.
//
// ⚠️ CUESTA 14 CRÉDITOS DE LOS 800. Swing pide los 14 pares DIRECTOS, en dos
// tandas de 7 con una pausa de 65 s. El gasto fijo de esta app es 36 al día.

import {
  ARREGLOS,
  CAMBIO_MINIMO,
  FECHA_PREREGISTRO,
  LO_QUE_SE_SUPO_GRATIS,
  QUE_DICE_EL_DIAGNOSTICO,
  QUE_NO_AUTORIZA,
  QUIEN_DECIDE_ENTRE_LOS_DOS,
  juzgarConjunto,
  juzgarPar,
} from './lib/preregistro-rejilla-diaria.mjs'
import { compararArreglos, nombreDia } from './lib/rejilla-diaria.mjs'
import { PARES, leerLlave, obtenerVelas } from './lib/velas.mjs'

console.log('DIAGNÓSTICO DE LA REJILLA DIARIA — ¿qué le hace al stop la vela estrecha?')
console.log(`  preregistro del ${FECHA_PREREGISTRO}, escrito ANTES de estos números`)
console.log('')
console.log('  Lo que ya se supo GRATIS, del barrido y del historial de producción:')
console.log(
  `    · 1 de cada ${LO_QUE_SE_SUPO_GRATIS.espaciado} velas es estrecha, en los ` +
    `${LO_QUE_SE_SUPO_GRATIS.paresMirados} pares (posiciones ${LO_QUE_SE_SUPO_GRATIS.posicionesEstrechas.join(', ')})`
)
console.log(`    · ninguna es plana: ${LO_QUE_SE_SUPO_GRATIS.velasPlanas} de 280 con máximo = mínimo`)
console.log(
  `    · el cojín de ATR es el ${(100 * LO_QUE_SE_SUPO_GRATIS.cojinSobreStop).toFixed(1)} % del stop ` +
    `(${LO_QUE_SE_SUPO_GRATIS.senalesMiradas} señales reales)`
)
console.log(
  `    · TECHO de una sola vela: ${LO_QUE_SE_SUPO_GRATIS.techoUnaVelaPips} pips, ` +
    `menos que el spread (${LO_QUE_SE_SUPO_GRATIS.spreadTipicoPips})`
)
console.log('')
console.log('  Lo que compran los 14 créditos: LAS FECHAS. Nada más, y es lo único que falta.')
console.log('  NO escribe nada.')
console.log('')

const llave = leerLlave()

console.log(`Bajando 300 velas diarias de los ${PARES.length} pares (dos tandas, 65 s de pausa)…`)
// ⚠️ `rejilla: 'cruda'` a propósito: este guion ES el diagnóstico de la
// rejilla sucia — su trabajo entero es mirar las velas de fin de semana y
// decir qué día son. Con la rejilla limpia no habría ninguna que mirar y el
// informe saldría vacío sin dar error.
const { fechas, rangosPar, rates } = await obtenerVelas(llave, { velas: 300, minBarras: 100, rejilla: 'cruda' })
console.log(`  ${fechas.length} días con dato en los catorce`)
console.log(`  de ${fechas[0]} a ${fechas[fechas.length - 1]}`)
console.log('')

// El precio de cada par, igual que lo arma `computarBarrido`: q / b sobre las
// tasas contra el dólar. Lo que hace falta aquí son los cierres y los extremos
// reales de cada par, que es exactamente lo que el ATR de la app consume.
const filas = []
for (const par of PARES) {
  const [b, q] = par.split('/')
  const closes = fechas.map((d) => {
    const rb = b === 'USD' ? 1 : rates[d]?.[b]
    const rq = q === 'USD' ? 1 : rates[d]?.[q]
    return Number.isFinite(rb) && Number.isFinite(rq) && rb !== 0 ? rq / rb : NaN
  })
  const highs = fechas.map((d) => rangosPar?.[d]?.[par]?.h)
  const lows = fechas.map((d) => rangosPar?.[d]?.[par]?.l)
  const c = compararArreglos(fechas, highs, lows, closes)
  if (!c) {
    console.log(`  ⚠️ ${par}: no se pudo comparar`)
    continue
  }
  filas.push({ par, ...c })
}

if (!filas.length) {
  console.error('')
  console.error('✗ No se pudo comparar ningún par. Eso NO dice que la vela estrecha no importe:')
  console.error('  dice que no se pudo mirar. Son cosas distintas.')
  process.exit(1)
}

// ── 1. QUÉ DÍA ES. Es lo que se vino a comprar ───────────────────────────
console.log('════════════════════════════════════════════════════════════')
console.log('  1. QUÉ DÍA ES LA VELA ESTRECHA')
console.log('════════════════════════════════════════════════════════════')
const e0 = filas[0].estrechas
console.log(`  velas estrechas: ${e0.idx.length} de ${e0.n} (${(100 * e0.proporcion).toFixed(1)} %)`)
console.log(`  rango mediano del par: ${e0.rangoMediano.toExponential(3)}`)
console.log(`  rango mediano de las estrechas: ${(e0.rangoMedianoEstrechas ?? NaN).toExponential(3)}`)
console.log('')
console.log('  reparto por día de la semana (estrechas / total de ese día):')
for (let d = 0; d < 7; d++) {
  const est = e0.porDia[d] ?? 0
  const tot = e0.totalPorDia[d] ?? 0
  if (!tot) continue
  console.log(`    ${nombreDia(d).padEnd(10)} ${String(est).padStart(4)} / ${String(tot).padStart(4)}`)
}
console.log('')
const culpable = filas[0].culpable
if (culpable) {
  console.log(`  ⚠️ DÍA CULPABLE: ${culpable.nombre}`)
  console.log(
    `     concentra el ${(100 * culpable.concentra).toFixed(0)} % de las estrechas, y el ` +
      `${(100 * culpable.densa).toFixed(0)} % de sus velas son estrechas`
  )
} else {
  console.log('  ⚠️ NO HAY DÍA CULPABLE: las estrechas no se concentran en un solo día.')
  console.log('     Entonces no es la rejilla semanal, y el arreglo no puede ser «quitar ese día».')
}
console.log('')
console.log(`  📌 ${QUIEN_DECIDE_ENTRE_LOS_DOS}`)
console.log('')

// ── 2. Lo que cambia, con cada uno de los dos arreglos ───────────────────
const pc = (x) => (x == null ? '    —' : (x >= 0 ? '+' : '') + (100 * x).toFixed(1) + ' %')

for (const [nombre, texto] of Object.entries(ARREGLOS)) {
  console.log('════════════════════════════════════════════════════════════')
  console.log(`  2. ARREGLO «${nombre.toUpperCase()}» — ${texto}`)
  console.log('════════════════════════════════════════════════════════════')
  console.log('             ATR         stop de la APP   stop REVERSIÓN')
  for (const f of filas) {
    const a = f.arreglos[nombre]
    console.log(
      `  ${f.par.padEnd(9)} ${pc(a?.cambioATR).padStart(8)} ${pc(a?.cambioStopApp).padStart(16)} ` +
        `${pc(a?.cambioStopReversion).padStart(16)}`
    )
  }
  console.log('')
  console.log(`  velas: ${filas[0].n} → ${filas[0].arreglos[nombre]?.velas ?? '—'}`)
  console.log('')
  console.log('  ⚠️ Las tres columnas NO tienen por qué parecerse, y es lo que más hay que')
  console.log('     entender de esta tabla:')
  console.log('       · en la REVERSIÓN el ATR ES el stop entero (1,5 × ATR), así que esa')
  console.log('         columna es la misma que la del ATR;')
  console.log('       · en la regla de la APP el ATR es medio cojín encima del mínimo de 10')
  console.log(`         días — el ${(100 * LO_QUE_SE_SUPO_GRATIS.cojinSobreStop).toFixed(0)} % del stop de mediana—, así que se mueve mucho menos.`)
  console.log('')

  const veredictos = filas.map((f) => juzgarPar(f.arreglos[nombre], { cambioMinimo: CAMBIO_MINIMO }))
  const cuenta = {}
  veredictos.forEach((v) => (cuenta[v ?? 'noSePudoMirar'] = (cuenta[v ?? 'noSePudoMirar'] ?? 0) + 1))
  console.log(`  VEREDICTO por par (umbral del preregistro: ${(100 * CAMBIO_MINIMO).toFixed(0)} %):`)
  for (const [k, n] of Object.entries(cuenta).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(2)} de ${filas.length} → ${k}`)
  }
  const conjunto = juzgarConjunto(veredictos)
  console.log('')
  console.log(`  ►► CONJUNTO: ${conjunto ?? 'no se pudo mirar'}`)
  if (conjunto && QUE_DICE_EL_DIAGNOSTICO[conjunto]) {
    console.log(`     ${QUE_DICE_EL_DIAGNOSTICO[conjunto]}`)
  } else if (conjunto === 'mezclado') {
    console.log('     No hay mayoría en ninguna dirección. Si fuera la rejilla, el efecto')
    console.log('     tendría que salir en casi todos los pares: es la misma rejilla para los')
    console.log('     catorce. Que dependa del par apunta a otra causa, y medir más sobre un')
    console.log('     efecto sin mecanismo detrás es gastar créditos en un número que no se')
    console.log('     va a poder leer.')
  }
  console.log('')
}

// ── 3. Lo que NO autoriza ────────────────────────────────────────────────
console.log('════════════════════════════════════════════════════════════')
console.log(`  ⚠️ LO QUE ESTO AUTORIZA: ${QUE_NO_AUTORIZA}`)
console.log('════════════════════════════════════════════════════════════')
console.log('')
console.log('  📌 Y lo que NO se puede citar en contra: «en esta app los filtros no')
console.log('     funcionan, siete familias medidas y siete fallando». ESTO NO ES UN')
console.log('     FILTRO. Los filtros iban ENCIMA de la entrada; esto corrige el DATO')
console.log('     con el que se calcula la entrada, así que cambia EMA20, EMA50, RSI,')
console.log('     ATR y los soportes a la vez. Citarlo para frenar esto sería un')
console.log('     argumento mal usado — y ya fue mío una vez.')
