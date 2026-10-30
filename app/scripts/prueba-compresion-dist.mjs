// Comprobaciones de la distribución de la compresión POR PAR Y POR VELA.
// SIN INTERNET y sin gastar un crédito.
//
//     node scripts/prueba-compresion-dist.mjs
//
// ⚠️⚠️ EL BLOQUE 1 EXISTE POR UN FALLO REAL, Y FUE EN LA APP HERMANA.
//
// Allí la primera versión del diagnóstico leía `{ fechas, rangosPar }` —los
// nombres de ESTE lector de velas— cuando el de allá devuelve
// `{ barras, rangos }`. Falló en producción gastando 7 créditos. Y la prueba de
// humo NO lo cazó porque el mercado inventado lo había escrito yo con los
// MISMOS nombres equivocados: el banco confirmaba mi propio error.
//
// Aquí los nombres son los contrarios, así que el mismo fallo al revés es
// igual de posible. El bloque 1 no se conforma con que el mercado falso
// funcione: LEE `velas.mjs` y exige que los nombres que la librería espera
// sean exactamente los que esa función devuelve.

import { readFileSync } from 'node:fs'
import {
  PAIRS,
  VELAS_ATRAS_COMPRESION,
  UMBRALES_COMPRESION,
  computarBarrido,
} from '../src/lib/marketCalc.js'
import { compresionDe } from '../src/lib/compresion.js'
import {
  distribucionDeCompresion,
  ventanaDeProduccion,
  percentiles,
  fraccionBajo,
  repartoDeEtiquetas,
} from './lib/compresion-dist.mjs'

let mal = 0
const comprobar = (texto, ok) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`)
  if (!ok) mal++
}

// ── Un mercado inventado, determinista ────────────────────────────────────
//
// ⚠️ Con OLAS de volatilidad dentro: sin ellas la compresión saldría clavada
// en 1 y la prueba pasaría comparando una lista de unos con otra, que es el
// agujero de «una prueba que se adapta a lo que encuentra».
//
// ⚠️ Y SOLO DÍAS DE MERCADO (lunes a viernes), porque es lo que `obtenerVelas`
// entrega desde el 2026-10-06. Meter sábados aquí mediría otra cosa.
function mercado(n = 400) {
  const CCY7 = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD']
  let semilla = 987654
  const azar = () => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648
    return semilla / 2147483648
  }
  const fechas = []
  const rates = {}
  const rangosPar = {}
  const nivel = { EUR: 0.92, GBP: 0.78, JPY: 150, CHF: 0.88, AUD: 1.52, NZD: 1.68, CAD: 1.38 }
  let dia = Date.UTC(2021, 0, 4) // un lunes
  for (let i = 0; i < n; i++) {
    // Saltar fin de semana: 0 domingo, 6 sábado.
    while ([0, 6].includes(new Date(dia).getUTCDay())) dia += 86400000
    const d = new Date(dia).toISOString().slice(0, 10)
    dia += 86400000
    fechas.push(d)
    rates[d] = {}
    const nivelHoy = {}
    CCY7.forEach((c, k) => {
      const ola = 0.35 + 0.95 * Math.abs(Math.sin((i / (41 + k * 13)) * Math.PI))
      nivel[c] *= 1 + (azar() - 0.5) * 0.012 * ola
      rates[d][c] = nivel[c]
      nivelHoy[c] = { ola }
    })
    // Los rangos van POR PAR, con nombre de par, que es lo que entrega el
    // lector de esta app (pide los 14 pares DIRECTOS, no los deriva).
    rangosPar[d] = {}
    for (const [b, q] of PAIRS) {
      const px = (q === 'USD' ? 1 : rates[d][q]) / (b === 'USD' ? 1 : rates[d][b])
      const ola = ((nivelHoy[b] ?? nivelHoy[q])?.ola ?? 1)
      const amp = px * 0.004 * ola * (0.5 + azar())
      rangosPar[d][`${b}/${q}`] = { h: px + amp, l: px - amp }
    }
  }
  return { fechas, rates, rangosPar }
}

console.log('\n1. ⚠️ EL CONTRATO: los nombres que espera la librería son los que devuelve `velas.mjs`')
{
  const fuente = readFileSync(new URL('./lib/velas.mjs', import.meta.url), 'utf8')
  // El lector arma la forma en un objeto literal (`const cruda = { ... }`) y
  // después devuelve esa variable, así que no vale buscar el `return`.
  const m = fuente.match(/const\s+cruda\s*=\s*\{\s*([a-zA-Z0-9_,\s]+?)\s*\}/)
  comprobar('se encontró la forma que arma `velas.mjs`', !!m)
  if (m) {
    const claves = m[1].split(',').map((s) => s.trim()).filter(Boolean)
    for (const k of ['fechas', 'rates', 'rangosPar']) {
      comprobar(`velas.mjs devuelve \`${k}\` (lo que la librería lee)`, claves.includes(k))
    }
    // Y la contraria: que NO devuelva los nombres de la app hermana.
    for (const k of ['barras', 'rangos']) {
      comprobar(`y NO devuelve \`${k}\` (ésos son de la app hermana)`, !claves.includes(k))
    }
    // ⚠️⚠️ La mitad que ata las dos puntas: que la librería LEA esos nombres.
    // Comprobar solo lo que `velas.mjs` devuelve dejaría pasar el fallo del
    // 2026-10-30, porque el error no estaba allí sino en quien lo leía.
    const lib = readFileSync(new URL('./lib/compresion-dist.mjs', import.meta.url), 'utf8')
    const firma = lib.match(/export function distribucionDeCompresion\(\{([^}]*)\}/)
    comprobar('se encontró la firma de `distribucionDeCompresion`', !!firma)
    if (firma) {
      const lee = firma[1].split(',').map((s) => s.trim()).filter(Boolean)
      comprobar(
        `la librería lee exactamente lo que velas.mjs arma (${lee.join(', ')})`,
        lee.length > 0 && lee.every((k) => claves.includes(k)),
      )
    }
  }
}

console.log('\n2. Se niega a trabajar con el objeto de la app hermana')
{
  const m = mercado(120)
  let dioError = false
  try {
    distribucionDeCompresion({ barras: m.fechas, rates: m.rates, rangos: m.rangosPar })
  } catch (e) {
    dioError = /fechas/.test(e.message)
  }
  comprobar('pasarle `{ barras, rangos }` lanza un error que NOMBRA el problema', dioError)
}

console.log('\n3. ⚠️ LA VENTANA no se escribe a mano: sale de las fechas')
{
  const m = mercado(400)
  const v = ventanaDeProduccion(m.fechas)
  // 300 días de calendario son ~214 de mercado. Lo que se comprueba es que el
  // número caiga donde la aritmética lo pone, no un valor fijo.
  comprobar(`300 días de calendario dan ${v} de mercado (entre 200 y 225)`, v > 200 && v < 225)
  comprobar('ninguna fecha de la ventana es fin de semana', !m.fechas.some((d) => [0, 6].includes(new Date(d + 'T00:00:00Z').getUTCDay())))
  comprobar('una serie más corta que la ventana devuelve su propio largo', ventanaDeProduccion(m.fechas.slice(-30)) === 30)
  comprobar('sin fechas devuelve 0, no un número inventado', ventanaDeProduccion([]) === 0)
  comprobar('con una fecha ilegible devuelve 0', ventanaDeProduccion(['no-es-fecha']) === 0)
}

console.log('\n4. La distribución sale, y no es una lista de unos')
const d = distribucionDeCompresion(mercado(500))
{
  comprobar(`hay observaciones (${d.todas.length})`, d.todas.length > 1000)
  comprobar(
    `cubre los ${PAIRS.length} pares`,
    d.porPar.size === PAIRS.length && [...d.porPar.values()].every((v) => v.length > 0),
  )
  const p = percentiles(d.todas)
  comprobar(`la mediana es un número (${p.p50.toFixed(2)})`, Number.isFinite(p.p50))
  // Si p10 y p90 salieran pegados, el mercado inventado no tendría olas y toda
  // la prueba sería decorativa.
  comprobar(`p10 (${p.p10.toFixed(2)}) y p90 (${p.p90.toFixed(2)}) están separados`, p.p90 - p.p10 > 0.08)
  comprobar('los percentiles van en orden', p.min <= p.p10 && p.p10 <= p.p50 && p.p50 <= p.p90 && p.p90 <= p.max)
}

console.log('\n5. ⚠️ FIDELIDAD: el número es EL MISMO que calcula la app')
// Aquí NO basta el argumento de la app hermana («atrWilder solo mira las
// últimas 60»). En Swing `atrWilder` recorre TODO lo que recibe, así que la
// serie entera y la ventana de producción dan números distintos. Lo que se
// comprueba es que la librería use el MISMO tramo que el barrido.
{
  const m = mercado(500)
  const v = ventanaDeProduccion(m.fechas)
  const trozo = m.fechas.slice(-v)
  const app = computarBarrido(trozo, m.rates, m.rangosPar)
  const deApp = new Map(app.pares.map((p) => [p.name, p.compresion]))
  const dist = distribucionDeCompresion(m, { ventana: v })
  let iguales = 0
  for (const [b, q] of PAIRS) {
    const nombre = `${b}/${q}`
    const mio = dist.porPar.get(nombre).at(-1)
    if (Math.abs(mio - deApp.get(nombre)) < 1e-12) iguales++
  }
  comprobar(
    `los ${PAIRS.length} pares coinciden con computarBarrido hasta el último decimal (${iguales})`,
    iguales === PAIRS.length,
  )
  // Y la contraria, que es la que prueba que la ventana NO es decorativa: con
  // la serie entera el número sale DISTINTO. Si esto pasara, daría igual qué
  // tramo se use y la fidelidad de arriba sería casualidad.
  const entera = distribucionDeCompresion(m, { ventana: m.fechas.length })
  let distintos = 0
  for (const [b, q] of PAIRS) {
    const nombre = `${b}/${q}`
    if (Math.abs(entera.porPar.get(nombre).at(-1) - deApp.get(nombre)) > 1e-9) distintos++
  }
  comprobar(
    `con la serie ENTERA el número cambia en ${distintos} pares (la ventana importa)`,
    distintos > PAIRS.length / 2,
  )
}

console.log('\n6. `percentiles` y `fraccionBajo` no inventan ceros')
{
  comprobar('percentiles([]) es null, no ceros', percentiles([]) === null)
  comprobar('percentiles(null) es null', percentiles(null) === null)
  comprobar('fraccionBajo([], 0.75) es null, no 0', fraccionBajo([], 0.75) === null)
  comprobar('fraccionBajo(xs, NaN) es null', fraccionBajo([1, 2], NaN) === null)
  comprobar('fraccionBajo cuenta bien', fraccionBajo([0.5, 0.6, 1, 1], 0.75) === 50)
}

console.log('\n7. Los no calculables NO se cuentan como 1')
{
  // Con una serie demasiado corta para el ATR «de antes», `compresionDe`
  // devuelve null. Lo que no puede pasar es que aparezcan como 1,00 y creen un
  // pico falso justo en el valor que más decide.
  comprobar('compresionDe(x, 0) es null', compresionDe(1, 0) === null)
  comprobar('compresionDe(NaN, 1) es null', compresionDe(NaN, 1) === null)
  const corto = distribucionDeCompresion(mercado(60), { ventana: VELAS_ATRAS_COMPRESION + 1 })
  comprobar('ningún valor calculado es exactamente 1 por relleno', !corto.todas.some((x) => x === 1))
}

console.log('\n8. El reparto de etiquetas suma 100 y reparte de verdad')
{
  comprobar('repartoDeEtiquetas([]) es null', repartoDeEtiquetas([], UMBRALES_COMPRESION) === null)
  const r = repartoDeEtiquetas([0.5, 0.9, 1, 1, 1.5], { muy: 0.8, algo: 0.95, ancho: 1.2 })
  comprobar(`suma 100 % (${(r.muy + r.algo + r.normal + r.ancho).toFixed(1)})`, Math.abs(r.muy + r.algo + r.normal + r.ancho - 100) < 1e-9)
  comprobar('reparte por los cortes, no por descarte', r.muy === 20 && r.algo === 20 && r.normal === 40 && r.ancho === 20)
  // Los bordes: `algo` incluye su límite inferior y `normal` incluye `ancho`.
  const borde = repartoDeEtiquetas([0.8, 1.2], { muy: 0.8, algo: 0.95, ancho: 1.2 })
  comprobar('el valor igual a `muy` NO cuenta como «muy apretado»', borde.muy === 0)
  comprobar('el valor igual a `ancho` NO cuenta como «más suelto»', borde.ancho === 0)
}

console.log('')
if (mal) {
  console.log(`✗ ${mal} comprobación(es) MAL.`)
  process.exit(1)
}
console.log('✓ Todo bien.')
