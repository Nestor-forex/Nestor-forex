// Banco de pruebas: corre las reglas del barrido sobre los últimos ~300 días
// REALES y dice cuánto habrían acertado.
//
// Por qué existe
// --------------
// Hasta ahora las reglas se escribían porque sonaban razonables, se publicaban
// y se esperaba a ver qué pasaba. Con eso se avanza y se retrocede: cada
// cambio es una apuesta y solo se sabe si fue buena semanas después, con
// dinero de por medio.
//
// Aquí se responde antes de publicar y con un número.
//
// A partir de ahora ninguna regla debería entrar a la app sin pasar por aquí.
//
// Cómo evita hacer trampa
// -----------------------
// El error clásico de un backtest es mirar el futuro sin darse cuenta. Aquí se
// evita así: para juzgar el día i, a `computarBarrido` SOLO se le entregan los
// días 0..i. No existe forma de que un indicador vea un precio posterior,
// porque esos días no están en los datos que recibe. `prueba-backtest.mjs` lo
// comprueba generando las señales sobre medio mercado y sobre el mercado
// entero y exigiendo que el tramo común salga idéntico.
//
// La entrada es el cierre del día en que aparece la señal, y el resultado se
// juzga con las velas POSTERIORES, con el mismo `resolver.mjs` que usa el
// vigía de verdad. Si el resolver se equivoca, se equivoca igual en los dos
// sitios: no hay dos verdades.
//
// Corre en GitHub Actions porque el entorno de la sesión de Claude tiene
// bloqueado api.twelvedata.com:
//   Actions → "Banco de pruebas de las reglas" → Run workflow

import { computarBarrido } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { generarSenales } from './lib/backtest-nucleo.mjs'
import { GEOMETRIAS } from './lib/geometrias.mjs'
import { resolver } from './lib/resolver.mjs'

// Días de arranque que no se juzgan: el EMA50 y el RSI necesitan historia
// antes de valer algo.
const CALENTAMIENTO = 80

// Los mismos ajustes que usa el vigía, para que esto mida la app de verdad y
// no una prima lejana suya.
const THR = 0.5
const TOP_N = 3

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave())
const completo = computarBarrido(fechas, rates, rangosPar)

// --------------------------------------------------------------------------

// Mide una lista de señales ya generadas.
function medir(senales, porClave) {
  let ganadas = 0
  let perdidas = 0
  let pips = 0
  let sinJuzgar = 0
  // Suma de resultados medidos en "veces el riesgo de ESA operación". Se
  // acumula operación por operación, no dividiendo el total de pips entre un
  // riesgo promedio: con riesgos distintos en cada par, el promedio daría un
  // número parecido pero no el correcto.
  let sumaR = 0

  for (const s of senales) {
    const r = porClave.get(`${s.id}@${s.vistoEl}`)
    if (!r || (r.resultado !== 'ganada' && r.resultado !== 'perdida')) {
      sinJuzgar++
      continue
    }
    if (r.resultado === 'ganada') {
      ganadas++
      // Ganó: se llevó exactamente su relación riesgo/beneficio.
      sumaR += s.pipBeneficio / s.pipRiesgo
    } else {
      perdidas++
      // Perdió: se fue al stop, o sea exactamente 1 riesgo.
      sumaR -= 1
    }
    pips += r.pips
  }

  const total = ganadas + perdidas
  return {
    total,
    ganadas,
    sinJuzgar,
    pips: Math.round(pips),
    acierto: total ? (ganadas / total) * 100 : null,
    // Lo que de verdad importa: cuánto se gana o se pierde POR CADA UNIDAD DE
    // RIESGO. Los pips sueltos engañan —100 pips en GBP/JPY no son 100 pips en
    // EUR/CHF— y además dos geometrías con riesgos distintos no se pueden
    // comparar en pips. Esto sí: es el número que dice si el sistema gana.
    //
    // Y es lo que Néstor nota en la cuenta: como el lote se calcula para
    // arriesgar siempre el mismo dinero, +0.20 por operación significa ganar
    // un 20% de lo que se arriesga en cada una, sea el par que sea.
    porRiesgo: total ? sumaR / total : null,
  }
}

// Genera y juzga con una geometría dada.
function correr(geometria) {
  const senales = generarSenales(fechas, rates, rangosPar, {
    calentamiento: CALENTAMIENTO,
    thr: THR,
    topN: TOP_N,
    geometria,
  })
  const { resultados } = resolver(senales, completo)
  return { senales, porClave: new Map(resultados.map((r) => [r.clave, r])) }
}

const fila = (nombre, m) => {
  const acierto = m.acierto === null ? '   —  ' : `${m.acierto.toFixed(0).padStart(4)}%`
  const porR = m.porRiesgo === null ? '    —' : `${m.porRiesgo >= 0 ? '+' : ''}${m.porRiesgo.toFixed(2)}`
  console.log(
    `${nombre.padEnd(46)} ${String(m.total).padStart(5)}   ${acierto}   ${String(m.pips).padStart(7)}   ${porR.padStart(7)}`
  )
}

console.log('---BACKTEST-INICIO---')
console.log(`Días descargados: ${fechas.length} · de ${fechas[0]} a ${fechas.at(-1)}`)
console.log(`Días medidos: ${fechas.length - CALENTAMIENTO} (los primeros ${CALENTAMIENTO} son de calentamiento)`)
console.log('')
console.log('GEOMETRÍA DEL STOP Y EL OBJETIVO')
console.log('Mismas señales en todas: mismos pares, mismo lado, mismo día.')
console.log('Lo ÚNICO que cambia es dónde se pone el stop y el objetivo.')
console.log('')
console.log('geometría                                        ops   acierto      pips   por 1R')
console.log('─'.repeat(86))

const resultadosPorGeometria = []
for (const [nombre, geo] of GEOMETRIAS) {
  const { senales, porClave } = correr(geo)
  const m = medir(senales, porClave)
  fila(nombre, m)
  resultadosPorGeometria.push({ nombre, geo, senales, porClave, m })
}
console.log('─'.repeat(86))
console.log('')
console.log('"por 1R" = cuánto se gana o se pierde por cada unidad de riesgo.')
console.log('Es LA columna: los pips sueltos no se pueden comparar entre geometrías')
console.log('con riesgos distintos. Positivo = el sistema gana. Negativo = pierde.')

// --------------------------------------------------------------------------
// Por qué sangran las ventas. En la medición anterior se llevaban el 87% de la
// pérdida y no sabíamos si era el mercado de estos meses o un fallo de la
// fórmula. Si fuera la fórmula, cambiar la geometría lo arreglaría; si es el
// mercado, las ventas seguirán perdiendo con TODAS las geometrías.
// --------------------------------------------------------------------------

console.log('')
console.log('COMPRAS vs VENTAS, con cada geometría')
console.log('')
console.log('geometría                                        lado     ops   acierto   por 1R')
console.log('─'.repeat(86))
for (const { nombre, senales, porClave } of resultadosPorGeometria) {
  for (const lado of ['COMPRA', 'VENTA']) {
    const m = medir(
      senales.filter((s) => s.lado === lado),
      porClave
    )
    const acierto = m.acierto === null ? '   —  ' : `${m.acierto.toFixed(0).padStart(4)}%`
    const porR = m.porRiesgo === null ? '    —' : `${m.porRiesgo >= 0 ? '+' : ''}${m.porRiesgo.toFixed(2)}`
    console.log(`${nombre.padEnd(46)} ${lado.padEnd(8)} ${String(m.total).padStart(4)}   ${acierto}   ${porR.padStart(7)}`)
  }
}
console.log('─'.repeat(86))
console.log('')
console.log('Si las ventas pierden con TODAS las geometrías, el problema no es')
console.log('dónde se pone el stop: es que en estos meses vender no funcionaba,')
console.log('o que la forma de elegir QUÉ vender está mal. Son arreglos distintos.')

// --------------------------------------------------------------------------
// Con la mejor geometría, ¿aportan algo los filtros? Se mira DESPUÉS de elegir
// geometría a propósito: un filtro que tapa los agujeros de una fórmula mala
// no dice nada útil.
// --------------------------------------------------------------------------

const mejor = resultadosPorGeometria.reduce((a, b) => ((b.m.porRiesgo ?? -99) > (a.m.porRiesgo ?? -99) ? b : a))

console.log('')
console.log(`FILTROS, sobre la mejor geometría (${mejor.nombre.trim()})`)
console.log('')
console.log('filtro                                           ops   acierto      pips   por 1R')
console.log('─'.repeat(86))

const rsiSano = (s) => (s.lado === 'COMPRA' ? s.rsi <= 70 : s.rsi >= 30)
const FILTROS = [
  ['Sin filtro', () => true],
  ['No comprar con RSI>70 / vender con RSI<30', rsiSano],
  ['Solo COMPRA con RSI 50-70', (s) => s.lado === 'COMPRA' && s.rsi > 50 && s.rsi <= 70],
  ['Solo COMPRA (nada de ventas)', (s) => s.lado === 'COMPRA'],
]
for (const [nombre, f] of FILTROS) {
  fila(nombre, medir(mejor.senales.filter(f), mejor.porClave))
}
console.log('─'.repeat(86))

// --------------------------------------------------------------------------
// LAS VENTAS. Pierden con las cinco geometrías, así que el problema no es
// donde va el stop. Quedan dos explicaciones muy distintas:
//
//   (a) El mercado de estos meses no daba para vender. Entonces las ventas
//       perderían en unos tramos y no en otros, y el arreglo sería saber
//       cuándo vender no funciona.
//   (b) La app elige mal QUÉ vender. Entonces perderían en todos los tramos,
//       y el arreglo sería cómo se eligen.
//
// Se mira siempre con la geometría de la app (la A), que es la que gana.
// --------------------------------------------------------------------------

// La geometría A ya se corrió arriba; se reutiliza en vez de repetir los 219
// días. Y se llama `app` y no `base` porque las señales traen un campo `base`
// (la divisa base del par) y tenerlos con el mismo nombre se presta a líos.
const app = resultadosPorGeometria[0]
const trimestreDe = (f) => `${f.slice(0, 4)}-T${Math.floor((Number(f.slice(5, 7)) - 1) / 3) + 1}`
const trimestres = [...new Set(app.senales.map((s) => trimestreDe(s.vistoEl)))].sort()

console.log('')
console.log('LAS VENTAS, TROCEADAS POR TRIMESTRE')
console.log('Con las compras al lado como control: si en un tramo las compras')
console.log('ganan y las ventas pierden, ese tramo fue de mercado subiendo.')
console.log('')
console.log('trimestre     COMPRA: ops  acierto   por 1R      VENTA: ops  acierto   por 1R')
console.log('─'.repeat(86))

let tramosVentaEnPerdida = 0
for (const tri of trimestres) {
  const enTri = app.senales.filter((s) => trimestreDe(s.vistoEl) === tri)
  const c = medir(
    enTri.filter((s) => s.lado === 'COMPRA'),
    app.porClave
  )
  const v = medir(
    enTri.filter((s) => s.lado === 'VENTA'),
    app.porClave
  )
  if (v.porRiesgo !== null && v.porRiesgo < 0) tramosVentaEnPerdida++
  const fmt = (m) =>
    `${String(m.total).padStart(4)}   ${m.acierto === null ? '   — ' : (m.acierto.toFixed(0) + '%').padStart(5)}   ` +
    `${(m.porRiesgo === null ? '—' : (m.porRiesgo >= 0 ? '+' : '') + m.porRiesgo.toFixed(2)).padStart(6)}`
  console.log(`${tri.padEnd(14)}        ${fmt(c)}            ${fmt(v)}`)
}
console.log('─'.repeat(86))
console.log(`Las ventas pierden en ${tramosVentaEnPerdida} de ${trimestres.length} trimestres.`)
console.log('Si pierden en TODOS, no fue el mercado: la app elige mal qué vender.')

// --- ¿Se concentra la pérdida en alguna divisa? ----------------------------
//
// En una VENTA de EUR/USD la app vende euros y compra dólares. Si casi toda la
// pérdida sale de vender la misma divisa, es una historia de mercado (esa
// divisa no paró de subir). Si está repartida, es la forma de elegir.

console.log('')
console.log('LAS VENTAS, POR DIVISA')
console.log('')
console.log('divisa    la app la VENDIÓ: ops  acierto   por 1R     la COMPRÓ: ops  acierto   por 1R')
console.log('─'.repeat(86))
const ventas = app.senales.filter((s) => s.lado === 'VENTA')
const divisas = [...new Set(ventas.flatMap((s) => [s.base, s.cotizada]))].sort()
for (const d of divisas) {
  // Vender EUR/USD = vender la base (EUR) y comprar la cotizada (USD).
  const vendida = medir(ventas.filter((s) => s.base === d), app.porClave)
  const comprada = medir(ventas.filter((s) => s.cotizada === d), app.porClave)
  if (!vendida.total && !comprada.total) continue
  const fmt = (m) =>
    `${String(m.total).padStart(4)}   ${m.acierto === null ? '   — ' : (m.acierto.toFixed(0) + '%').padStart(5)}   ` +
    `${(m.porRiesgo === null ? '—' : (m.porRiesgo >= 0 ? '+' : '') + m.porRiesgo.toFixed(2)).padStart(6)}`
  console.log(`${d.padEnd(10)}                 ${fmt(vendida)}              ${fmt(comprada)}`)
}
console.log('─'.repeat(86))

// --- ¿Y si hubiéramos hecho lo contrario? ----------------------------------
//
// El diagnóstico más duro. Una señal que pierde siempre NO es una señal sin
// información: es una con información y el signo cambiado. Si al comprar
// justo lo que la app manda vender el resultado se da la vuelta, entonces la
// fuerza relativa sí dice algo y lo estamos leyendo al revés.
//
// Si al invertirlas TAMBIÉN se pierde, entonces no hay señal ninguna: solo
// estamos pagando spread y ruido, y eso es un problema mucho más grande.

const invertido = (() => {
  const senales = generarSenales(fechas, rates, rangosPar, {
    calentamiento: CALENTAMIENTO,
    thr: THR,
    topN: TOP_N,
    geometria: GEOMETRIAS[0][1],
    invertirVentas: true,
  })
  const { resultados } = resolver(senales, completo)
  return { senales, porClave: new Map(resultados.map((r) => [r.clave, r])) }
})()

console.log('')
console.log('¿Y SI HUBIÉRAMOS HECHO LO CONTRARIO EN LAS VENTAS?')
console.log('')
console.log('qué se hizo                                      ops   acierto      pips   por 1R')
console.log('─'.repeat(86))
fila('Vender lo que dice vender (lo que hace hoy)', medir(ventas, app.porClave))
fila(
  'COMPRAR lo que dice vender (al revés)',
  medir(
    invertido.senales.filter((s) => s.ladoOriginal === 'VENTA'),
    invertido.porClave
  )
)
console.log('─'.repeat(86))
console.log('Si al revés GANA, la señal sirve y la estamos leyendo con el signo')
console.log('cambiado. Si al revés también pierde, no hay señal: solo ruido.')

// Y lo mismo, trimestre a trimestre. Un resultado bueno que sale de UN solo
// tramo no es un descubrimiento, es una casualidad con buena prensa. Si dar la
// vuelta a las ventas solo gana en un trimestre, no sirve.
console.log('')
console.log('  ¿Y aguanta en los tres trimestres?')
const invertidasVenta = invertido.senales.filter((s) => s.ladoOriginal === 'VENTA')
for (const tri of trimestres) {
  const m = medir(
    invertidasVenta.filter((s) => trimestreDe(s.vistoEl) === tri),
    invertido.porClave
  )
  const acierto = m.acierto === null ? '  — ' : (m.acierto.toFixed(0) + '%').padStart(4)
  const porR = m.porRiesgo === null ? '—' : (m.porRiesgo >= 0 ? '+' : '') + m.porRiesgo.toFixed(2)
  console.log(`  ${tri}   ${String(m.total).padStart(4)} ops   acierto ${acierto}   por 1R ${porR.padStart(6)}`)
}

// --------------------------------------------------------------------------
// FASE 0: arreglar el lado de las ventas.
//
// Se prueban candidatas con una RAZÓN DE MERCADO detrás, no cualquier filtro
// que recorte la pérdida. La diferencia importa: un filtro sin razón es un
// número que funcionó en estos 300 días por casualidad, y en cuanto cambie el
// mercado deja de funcionar — con dinero de suscriptores dentro.
// --------------------------------------------------------------------------

console.log('')
console.log('FASE 0 · CANDIDATAS PARA EL LADO DE LAS VENTAS')
console.log('')
console.log('candidata                                        ops   acierto      pips   por 1R')
console.log('─'.repeat(86))

const compras = app.senales.filter((s) => s.lado === 'COMPRA')

// La debilidad de HOY puede ser un susto de un día que se deshace mañana. La
// de hace una semana ya es una tendencia. Vender solo cuando la divisa débil
// YA estaba débil evita venderle justo al rebote.
const debilidadPersistente = (s) =>
  s.fuerzaBaseAntes !== null && s.fuerzaCotizadaAntes !== null && s.fuerzaBaseAntes < s.fuerzaCotizadaAntes

// No vender contra el movimiento de fondo. Si el precio está por encima de su
// media de 100 días, el par lleva meses subiendo: venderlo es apostar contra
// la corriente, por mucho que la fuerza relativa de esta semana diga otra cosa.
const aFavorDelFondo = (s) => s.precio < s.e100

const CANDIDATAS = [
  ['V0. Como hoy: comprar y vender', () => true],
  ['V1. No vender nada (solo compras)', (s) => s.lado === 'COMPRA'],
  ['V2. Vender solo si la debilidad viene de antes', (s) => s.lado === 'COMPRA' || debilidadPersistente(s)],
  ['V3. Vender solo a favor del movimiento de fondo', (s) => s.lado === 'COMPRA' || aFavorDelFondo(s)],
  ['V4. V2 y V3 juntas', (s) => s.lado === 'COMPRA' || (debilidadPersistente(s) && aFavorDelFondo(s))],
]
for (const [nombre, f] of CANDIDATAS) fila(nombre, medir(app.senales.filter(f), app.porClave))
console.log('─'.repeat(86))
console.log('')
console.log('Y mirando SOLO las ventas que deja pasar cada una:')
console.log('')
console.log('candidata                                        ops   acierto      pips   por 1R')
console.log('─'.repeat(86))
for (const [nombre, f] of CANDIDATAS.slice(1)) {
  fila(nombre, medir(app.senales.filter((s) => s.lado === 'VENTA' && f(s)), app.porClave))
}
console.log('─'.repeat(86))
console.log(`(Para comparar: las compras solas son ${medir(compras, app.porClave).total} ops.)`)

console.log('')
console.log('Cómo leerlo, y con qué desconfianza:')
console.log(' · Con menos de ~30 operaciones el porcentaje puede ser suerte.')
console.log(' · Los filtros solo QUITAN operaciones, así que siempre es posible')
console.log('   encontrar uno que borre justo las malas de ESTOS 300 días sin que')
console.log('   sirva de nada en el futuro. Vale la pena un filtro cuando además')
console.log('   tiene una razón de mercado detrás, no solo un número bonito.')
console.log(' · Los pips no descuentan el spread del bróker.')
console.log(' · Son 10 meses. Un mercado distinto puede dar la vuelta a esto.')
console.log('---BACKTEST-FIN---')
