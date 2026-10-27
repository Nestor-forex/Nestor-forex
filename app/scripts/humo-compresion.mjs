// HUMO de la medición de compresión, ANTES de gastar un crédito.
//
//     node scripts/humo-compresion.mjs
//
// No pide red, no pide llave y no toca nada. Comprueba que la plomería del
// diagnóstico funciona de punta a punta sobre un mercado inventado: que
// `computarBarrido` calcula la compresión, que la señal se la lleva, que el
// reparto en montones la ve, y que `juzgar()` devuelve algo.
//
// ⚠️ NO SIRVE PARA SACAR CONCLUSIONES SOBRE LA APP, y eso está medido: el
// 2026-10-24 un barrido de 54 mercados inventados dijo que en Intradía
// restringir el universo no desplazaba señales, y con datos reales SÍ las
// desplazaba (178 de 3.942). Un mercado inventado da decenas de señales y el
// real da miles. Esto comprueba la PLOMERÍA, nada más.

import { computarBarrido, UMBRAL_FUERZA } from '../src/lib/marketCalc.js'
import { generarSenales } from './lib/backtest-nucleo.mjs'
import { simetrica } from './lib/geometrias.mjs'
import { PAIR_NAMES } from '../src/lib/pairs.js'
import { repartirPorCompresion } from './lib/compresion-montones.mjs'
import { juzgar } from './lib/preregistro-compresion.mjs'

const CCY = ['EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD']
const DIAS = 400

let fallos = 0
const bien = (ok, txt) => {
  if (!ok) fallos++
  console.log(`  ${ok ? '✓' : '✗ MAL'}  ${txt}`)
}

// Azar DETERMINISTA: con `Math.random` una prueba que falla no se puede
// repetir, y entonces no es una prueba.
let semilla = 7
const azar = () => {
  semilla = (semilla * 1103515245 + 12345) % 2147483648
  return semilla / 2147483648
}

// El mercado inventado necesita DOS cosas a la vez, y costó aprenderlo:
// una ONDA para que haya divergencia de fuerza (si no, ningún par pasa el
// umbral y la prueba pasaría comparando listas vacías) y un PASEO para que
// haya retrocesos que muevan el RSI (si no, se queda clavado y el filtro
// rechaza todo). Más una compresión que cambia a trozos, que es lo que este
// humo viene a repartir.
const fechas = []
for (let i = 0; i < DIAS; i++) fechas.push(new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10))

const nivel = { EUR: 0.92, GBP: 0.79, JPY: 150, CHF: 0.88, CAD: 1.36, AUD: 1.52, NZD: 1.64 }
const fase = {}
CCY.forEach((c, k) => (fase[c] = (k * 2 * Math.PI) / CCY.length))

const rates = {}
// La amplitud del día: alterna tramos quietos y tramos movidos, para que el
// reparto tenga de los dos montones.
const amplitudDe = (i) => (Math.floor(i / 25) % 2 === 0 ? 0.0015 : 0.006)

fechas.forEach((d, i) => {
  const fila = {}
  for (const c of CCY) {
    const onda = Math.sin(i / 45 + fase[c]) * 0.0012
    nivel[c] *= 1 + onda + (azar() - 0.5) * amplitudDe(i)
    fila[c] = nivel[c]
  }
  rates[d] = fila
})

// ⚠️ EL PRECIO DEL PAR ES `q / b`, Y EL DÓLAR VALE 1 Y PUNTO. Las dos cosas
// están escritas en CLAUDE.md como tropiezos del 2026-09-22: con la división
// al revés, o haciendo oscilar el dólar, los cierres y los extremos se
// desalinean menos de un 1 % y el resultado sale creíble y falso.
const px = (par, d) => {
  const [b, q] = par.split('/')
  const vb = b === 'USD' ? 1 : rates[d][b]
  const vq = q === 'USD' ? 1 : rates[d][q]
  return vq / vb
}

// `rangosPar[fecha][par] = { h, l }` — la forma que devuelve `obtenerVelas`,
// comprobada en `velas.mjs` y no supuesta. Con la forma mal, `marketCalc` cae
// al `?? closes[i]` y mediría sobre cierres llamándolo rangos.
const rangosPar = {}
fechas.forEach((d, i) => {
  const fila = {}
  const a = amplitudDe(i)
  for (const par of PAIR_NAMES) {
    const p = px(par, d)
    fila[par] = { h: p * (1 + a), l: p * (1 - a) }
  }
  rangosPar[d] = fila
})

console.log('\n1. `computarBarrido` calcula la compresión')
const completo = computarBarrido(fechas, rates, rangosPar)
bien(completo.pares.length === PAIR_NAMES.length, `${completo.pares.length} pares`)
const conComp = completo.pares.filter((p) => Number.isFinite(p.compresion))
bien(conComp.length === PAIR_NAMES.length, `los ${conComp.length} traen compresión finita`)
const valores = conComp.map((p) => p.compresion)
bien(
  valores.every((v) => v > 0 && v < 20),
  `rango de valores: ${Math.min(...valores).toFixed(2)} a ${Math.max(...valores).toFixed(2)}`,
)

console.log('\n1b. Y SIN `rangosPar` el cambio sigue siendo aditivo')
// Hay una prueba que exige que sin rangos el resultado sea idéntico al método
// viejo. La compresión no puede romper eso.
const sinRangos = computarBarrido(fechas, rates)
bien(sinRangos.pares.length === PAIR_NAMES.length, 'sigue dando los 14 pares')
bien(
  sinRangos.pares.every((p) => p.compresion === null || Number.isFinite(p.compresion)),
  'y la compresión es un número o null, nunca basura',
)

console.log('\n2. La señal se lleva la compresión')
const senales = generarSenales(fechas, rates, rangosPar, {
  calentamiento: 120,
  // ⚠️ IMPORTADO, no escrito a mano. El guardián de `prueba-umbral.mjs` cazó
  // este mismo archivo con un `0.5` dentro: es el fallo del 2026-10-12 (el
  // umbral que decide TODAS las señales, copiado en nueve guiones) en
  // pequeño, y lo cometí yo el día que escribí esto.
  thr: UMBRAL_FUERZA,
  topN: 5,
  geometria: simetrica,
})
bien(senales.length > 0, `${senales.length} señales (más de cero: el mercado inventado dispara)`)
const conCompSenal = senales.filter((s) => Number.isFinite(s.compresion))
bien(conCompSenal.length === senales.length, `las ${conCompSenal.length} traen compresión`)

console.log('\n3. El reparto ve los dos montones')
const cubos = repartirPorCompresion(senales)
console.log(
  `     comprimido ${cubos.comprimido.length} · medio ${cubos.medio.length} · ` +
    `expandido ${cubos.expandido.length} · sin dato ${cubos.sinDato.length}`,
)
bien(cubos.sinDato.length === 0, 'ninguna señal cae en «sin dato»')
bien(cubos.comprimido.length > 0 && cubos.expandido.length > 0, 'los DOS montones tienen señales')
bien(
  cubos.comprimido.length + cubos.medio.length + cubos.expandido.length === senales.length,
  'no se pierde ninguna',
)

console.log('\n4. El mecanismo se ve: el montón comprimido tiene stops más cortos')
// Si esto NO saliera, la hipótesis del listón estaría mal planteada desde la
// aritmética, no desde el mercado — y habría que arreglar el listón antes de
// gastar un crédito, no después.
const medianaStop = (l) => {
  const v = l.map((s) => s.pipRiesgo).filter(Number.isFinite).sort((a, b) => a - b)
  return v.length ? v[Math.floor(v.length / 2)] : null
}
const sc = medianaStop(cubos.comprimido)
const se = medianaStop(cubos.expandido)
console.log(`     stop mediano: comprimido ${sc} pips · expandido ${se} pips`)
bien(sc !== null && se !== null, 'los dos montones dan un stop mediano')
bien(sc < se, 'el comprimido tiene el stop MÁS CORTO (es el mecanismo de la hipótesis)')

console.log('\n5. `juzgar()` devuelve algo coherente con datos de verdad del humo')
const v = juzgar({
  acComprimido: 0.4,
  acExpandido: 0.5,
  opsComprimido: cubos.comprimido.length,
  opsExpandido: cubos.expandido.length,
  r1Comprimido: -0.1,
  r1Expandido: 0.01,
  mitadesComprimido: [-0.11, -0.09],
  mitadesExpandido: [0.0, 0.02],
  sinCostesComprimido: -0.08,
  sinCostesExpandido: 0.03,
})
bien(v !== null, 'no devuelve null (o sea, los datos del humo le bastan)')
bien(typeof v.pasa === 'boolean', 'da un veredicto booleano')
bien(typeof v.lectura === 'string' && v.lectura.length > 20, 'y una lectura con texto')
// Con los montones del humo (pocas señales) debería fallar el mínimo de
// operaciones, que es exactamente lo que ese criterio existe para hacer.
bien(
  v.falta.some((f) => /ops y hacen falta/.test(f)),
  'y con los pocos montones del humo se queja del mínimo de operaciones',
)

console.log(fallos === 0 ? '\n✓ la plomería funciona. Se puede gastar el crédito.\n' : `\n✗ ${fallos} fallo(s). NO lanzar la medición todavía.\n`)
process.exit(fallos === 0 ? 0 : 1)
