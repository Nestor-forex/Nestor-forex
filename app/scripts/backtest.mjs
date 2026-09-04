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

import { costeEnPips, NIVELES_SWAP } from './lib/costes.mjs'
import { computarBarrido } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { generarSenales, medir, barridoSwap } from './lib/backtest-nucleo.mjs'
import { GEOMETRIAS, simetrica, actual, atrFijo } from './lib/geometrias.mjs'
import { reglaBarrido } from './lib/patrones.mjs'
import { resolver } from './lib/resolver.mjs'

// Días de arranque que no se juzgan: el EMA50 y el RSI necesitan historia
// antes de valer algo.
const CALENTAMIENTO = 80

// Los mismos ajustes que usa el vigía, para que esto mida la app de verdad y
// no una prima lejana suya.
const THR = 0.5
const TOP_N = 3

// Cuántos días se miden. Antes eran los 300 de la app (unos 14 meses), y con
// eso las ventas salieron a 120 operaciones: suficiente para ver que perdían,
// insuficiente para casi todo lo demás.
//
// El problema de fondo con 300 días no es el tamaño de la muestra, es que son
// UN SOLO humor de mercado. Estos meses el dólar ha caído casi sin pausa, así
// que una regla puede parecer buena solo porque el dólar cayó. Con varios años
// entran tramos de dólar subiendo, cayendo y quieto — y una regla que solo
// gana en uno de los tres no es una estrategia, es una apuesta disfrazada.
//
// No cuesta un crédito más: Twelve Data cobra por consulta, no por vela.
const VELAS = Number(process.env.VELAS || 1500)

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave(), { velas: VELAS })
const completo = computarBarrido(fechas, rates, rangosPar)

// --------------------------------------------------------------------------

// Lo que cuesta operar sale de scripts/lib/costes.mjs: spread por par (no uno
// solo para los 14, que hacía parecer baratos los cruces) y swap por noche.
//
// ⚠️ EL SWAP NO SE CONTABA HASTA AHORA, NI UN PIP. En intradía daría igual,
// pero aquí las operaciones duran una MEDIANA DE 12 O 13 DÍAS. A medio pip por
// noche son 6 pips por operación; a dos pips, 25. Sobre un sistema que mide
// −0,06 por unidad de riesgo, eso puede ser la diferencia entre "pierde
// poquito" y "pierde bastante".
//
// No se elige UN número de swap porque no lo sé: depende del diferencial de
// tipos de cada momento y del margen de cada bróker, y no tengo su histórico
// de cinco años. Se mide a varios niveles y se enseña a partir de cuál cambia
// la conclusión.

// Mide una lista de señales ya generadas.

// Genera y juzga con una geometría dada.
function correr(geometria, reglaEntrada = null, vista = {}, calentamiento = CALENTAMIENTO) {
  const senales = generarSenales(fechas, rates, rangosPar, {
    calentamiento,
    thr: THR,
    topN: TOP_N,
    geometria,
    reglaEntrada,
    vista,
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

// --------------------------------------------------------------------------
// LA MITAD QUE NO SE MIRÓ.
//
// El peligro de medir sobre muchos años no es tener pocos datos: es tener
// tantos que siempre se pueda encontrar ALGUNA regla que gane, por pura
// casualidad. Con suficientes intentos, el azar produce ganadores.
//
// La defensa clásica es partir el tiempo en dos: se mira la primera mitad
// para decidir y se comprueba en la segunda, que no se tocó. Si un resultado
// aparece en la primera y se evapora en la segunda, era casualidad.
//
// Aquí se imprimen las dos mitades una al lado de la otra para todo lo que
// importa. No es una prueba automática —nadie puede impedir mirar la segunda
// mitad— pero deja el número a la vista, que es lo que hace falta para no
// engañarse solo.
//
// Con la regla de medir NEUTRA (1:1), donde el resultado depende solo de
// acertar la dirección.
// --------------------------------------------------------------------------

const neutraPartida = correr(simetrica)
const corte = fechas[Math.floor(fechas.length / 2)]
const enMitad = (s, primera) => (primera ? s.vistoEl < corte : s.vistoEl >= corte)

// --------------------------------------------------------------------------
// EL FILTRO DE "NO PERSEGUIR" (RSI), MEDIDO DE FRENTE.
//
// Viene de la app hermana de intradía, donde se midió el 2026-08-25 y se
// encendió en 70. AQUÍ NO SE HEREDA ESE NÚMERO: son velas diarias y no de una
// hora, otras medias (EMA20/50 en vez de EMA9/21) y otro horizonte. El RSI de
// un día no significa lo mismo que el de una hora, así que hay que medirlo.
//
// Y hay una razón concreta para mirarlo en Swing: en los reportes diarios
// salen compras con el RSI en 74 y 77 con la nota "no perseguir" — la app lo
// AVISA pero no lo IMPIDE.
//
// LA LECCIÓN QUE TRAE DE ALLÁ, que es más valiosa que el filtro:
// los troceos a posteriori decían que entrar extendido daba 12% de acierto
// contra 50%. Medido de frente sobre 7.340 operaciones el efecto era de UN
// punto. La idea era buena y el número era ruido de 17 operaciones. Por eso
// aquí se mide con barrido de umbrales Y en las dos mitades del tiempo desde
// el principio, no al revés.
// --------------------------------------------------------------------------

{
  const corteRsi = fechas[Math.floor((CALENTAMIENTO + fechas.length) / 2)]
  console.log('')
  console.log('EL FILTRO DE "NO PERSEGUIR" (RSI), MEDIDO DE FRENTE')
  console.log('Regla de medir neutra 1:1 y spread descontado. 50% es la moneda al aire.')
  console.log(`Las dos mitades se parten en ${corteRsi}.`)
  console.log('')
  console.log('umbral                  ops   acierto   por 1R  │   1ª mitad   │   2ª mitad')
  console.log('─'.repeat(88))
  for (const u of [null, 80, 75, 70, 65, 60]) {
    const r = correr(simetrica, null, { rsiMax: u })
    const m = medir(r.senales, r.porClave, { conSpread: true })
    const m1 = medir(r.senales.filter((s) => s.vistoEl < corteRsi), r.porClave, { conSpread: true })
    const m2 = medir(r.senales.filter((s) => s.vistoEl >= corteRsi), r.porClave, { conSpread: true })
    const ac = (x) => (x === null ? '  — ' : (x.toFixed(0) + '%').padStart(4))
    const pr = (x) => (x === null ? '   —  ' : ((x >= 0 ? '+' : '') + x.toFixed(2)).padStart(6))
    console.log(
      `${(u === null ? 'sin filtro (hoy)' : `rechaza si RSI ≥ ${u}`).padEnd(22)} ` +
        `${String(m.total).padStart(4)}    ${ac(m.acierto)}   ${pr(m.porRiesgo)}  │ ` +
        `${String(m1.total).padStart(4)} ${ac(m1.acierto)} ${pr(m1.porRiesgo)} │ ` +
        `${String(m2.total).padStart(4)} ${ac(m2.acierto)} ${pr(m2.porRiesgo)}`
    )
  }
  console.log('─'.repeat(88))
  console.log('Qué tiene que pasar para encenderlo: que mejore en VARIOS umbrales')
  console.log('seguidos, en las DOS mitades, y que siga dejando señales de sobra.')
  console.log('Si solo mejora en uno, o solo en una mitad, es una coincidencia.')

  console.log('')
  console.log('EL MISMO, CON LA GEOMETRÍA REAL DE LA APP (con spread)')
  console.log('filtro                                           ops   acierto      pips   por 1R')
  console.log('─'.repeat(86))
  for (const u of [null, 75, 70, 65]) {
    const r = correr(actual, null, { rsiMax: u })
    fila(u === null ? 'sin filtro (hoy)' : `rechaza si RSI ≥ ${u}`, medir(r.senales, r.porClave, { conSpread: true }))
  }
  console.log('─'.repeat(86))
}

console.log('')
console.log('LAS DOS MITADES DEL TIEMPO (regla de medir neutra)')
console.log(`Corte en ${corte}. Un resultado que solo aparece en una mitad no es`)
console.log('un descubrimiento: es una casualidad con buena prensa.')
console.log('')
console.log('qué                        1ª mitad: ops  acierto   por 1R    2ª mitad: ops  acierto   por 1R')
console.log('─'.repeat(96))
for (const [nombre, filtro] of [
  ['Todo junto', () => true],
  ['Solo COMPRAS', (s) => s.lado === 'COMPRA'],
  ['Solo VENTAS', (s) => s.lado === 'VENTA'],
]) {
  const cel = (primera) => {
    const m = medir(
      neutraPartida.senales.filter((s) => filtro(s) && enMitad(s, primera)),
      neutraPartida.porClave
    )
    return (
      `${String(m.total).padStart(4)}   ${m.acierto === null ? '   — ' : (m.acierto.toFixed(0) + '%').padStart(5)}   ` +
      `${(m.porRiesgo === null ? '—' : (m.porRiesgo >= 0 ? '+' : '') + m.porRiesgo.toFixed(2)).padStart(6)}`
    )
  }
  console.log(`${nombre.padEnd(26)}     ${cel(true)}              ${cel(false)}`)
}
console.log('─'.repeat(96))

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

// --------------------------------------------------------------------------
// PRUEBA 1: ¿la inversión aguanta con una geometría neutra?
//
// Con la geometría de la app, comprar un par que viene cayendo pone el stop
// pegado (el mínimo reciente está ahí mismo) y el objetivo lejísimos. Eso solo
// ya infla el resultado, así que el +0.92 medía dos cosas mezcladas: si la
// señal apunta bien, y si la geometría regala.
//
// Con la simétrica (1 a 1, igual comprando que vendiendo) queda una sola cosa:
// el resultado por unidad de riesgo es 2 × aciertos − 1. Si aquí la inversión
// sigue ganando, es porque la señal apunta al lado contrario de verdad.
// --------------------------------------------------------------------------

const conGeo = (geo, invertir) => {
  const senales = generarSenales(fechas, rates, rangosPar, {
    calentamiento: CALENTAMIENTO,
    thr: THR,
    topN: TOP_N,
    geometria: geo,
    invertirVentas: invertir,
  })
  const { resultados } = resolver(senales, completo)
  return { senales, porClave: new Map(resultados.map((r) => [r.clave, r])) }
}

console.log('')
console.log('PRUEBA 1 · ¿AGUANTA LA INVERSIÓN CON UNA GEOMETRÍA NEUTRA?')
console.log('Stop y objetivo a la misma distancia, igual comprando que vendiendo.')
console.log('Así el resultado depende SOLO de acertar la dirección.')
console.log('')
console.log('qué se hizo                                      ops   acierto      pips   por 1R')
console.log('─'.repeat(86))
{
  const normal = conGeo(simetrica, false)
  const alReves = conGeo(simetrica, true)
  fila(
    'Vender lo que dice vender (1:1)',
    medir(normal.senales.filter((s) => s.lado === 'VENTA'), normal.porClave)
  )
  fila(
    'COMPRAR lo que dice vender (1:1)',
    medir(alReves.senales.filter((s) => s.ladoOriginal === 'VENTA'), alReves.porClave)
  )
  fila(
    'Las compras de siempre (1:1), de referencia',
    medir(normal.senales.filter((s) => s.lado === 'COMPRA'), normal.porClave)
  )
  console.log('─'.repeat(86))
  console.log('Con 1 a 1, acertar por encima del 50% es ganar y por debajo es perder.')
  console.log('')
  console.log('  Y trimestre a trimestre, la inversión con geometría neutra:')
  const inv = alReves.senales.filter((s) => s.ladoOriginal === 'VENTA')
  for (const tri of trimestres) {
    const m = medir(inv.filter((s) => trimestreDe(s.vistoEl) === tri), alReves.porClave)
    const ac = m.acierto === null ? '  — ' : (m.acierto.toFixed(0) + '%').padStart(4)
    const pr = m.porRiesgo === null ? '—' : (m.porRiesgo >= 0 ? '+' : '') + m.porRiesgo.toFixed(2)
    console.log(`  ${tri}   ${String(m.total).padStart(4)} ops   acierto ${ac}   por 1R ${pr.padStart(6)}`)
  }
}

// --------------------------------------------------------------------------
// PRUEBA 2: comprar retrocesos (la idea de la propuesta de Néstor).
//
// Hoy la app solo compra cuando el precio está por encima de la EMA20 y esta
// por encima de la EMA50. Cuando eso pasa, el RSI ya viene alto: medido, en
// 219 días hubo CERO compras con RSI ≤ 50. O sea que la app no puede comprar
// barato aunque quiera.
//
// La idea es cambiar la condición: en vez de exigir que el precio esté
// disparado, exigir que la tendencia de FONDO sea alcista (por encima de la
// media de 100 días) y entrar cuando el precio se ha caído un rato (RSI bajo).
// Es comprar el retroceso dentro de la tendencia, no la punta.
// --------------------------------------------------------------------------

const conRegla = (regla) => {
  const senales = generarSenales(fechas, rates, rangosPar, {
    calentamiento: CALENTAMIENTO,
    thr: THR,
    topN: TOP_N,
    reglaEntrada: regla,
  })
  const { resultados } = resolver(senales, completo)
  return medir(senales, new Map(resultados.map((r) => [r.clave, r])))
}

// Solo compras: las ventas ya sabemos que están rotas y meterlas aquí
// mezclaría dos preguntas.
const retroceso = (rsiMax, exigirFuerza) => (p, esc, thr) => {
  if (!(p.c > p.e100)) return null // el fondo tiene que ser alcista
  if (p.rsiV > rsiMax) return null // y el precio tiene que haber retrocedido
  if (exigirFuerza && !(p.dif > thr)) return null
  return 'COMPRA'
}

console.log('')
console.log('PRUEBA 2 · COMPRAR RETROCESOS EN VEZ DE PUNTAS')
console.log('Fondo alcista (precio sobre la media de 100 días) + precio retrocedido.')
console.log('')
console.log('regla de entrada                                 ops   acierto      pips   por 1R')
console.log('─'.repeat(86))
fila('Las compras de la app hoy (referencia)', medir(compras, app.porClave))
fila('R1. Fondo alcista + RSI<40 + fuerza a favor', conRegla(retroceso(40, true)))
fila('R2. Fondo alcista + RSI<45 + fuerza a favor', conRegla(retroceso(45, true)))
fila('R3. Fondo alcista + RSI<40, sin mirar fuerza', conRegla(retroceso(40, false)))
fila('R4. Fondo alcista + RSI<50 + fuerza a favor', conRegla(retroceso(50, true)))
console.log('─'.repeat(86))
console.log('Ojo: si salen pocas operaciones, el porcentaje no significa gran cosa.')

console.log('')
// --------------------------------------------------------------------------
// LA REGLA DE REVERSIÓN, ESCRITA DE FRENTE.
//
// Medir "la app al revés" dio +0,08 por unidad de riesgo sobre 876
// operaciones. Pero eso NO es una estrategia: es un diagnóstico con un signo
// cambiado. Las señales invertidas arrastran las condiciones de TENDENCIA de
// la app (medias alineadas, precio por fuera), que se pusieron ahí para
// perseguir un movimiento — justo lo contrario de lo que hace una regla de
// reversión. Si la reversión funciona, tiene que funcionar dicha de frente y
// con sus propias condiciones.
//
// Eso es lo que se mide aquí. Cuatro versiones, de la más simple a la más
// exigente, y una de control:
//
//   M1  Comprar el par cuya divisa base está DÉBIL, y vender el contrario.
//       Nada más. Es la reversión pura: comprar lo que se cayó.
//   M2  M1 pero solo cuando además el RSI está estirado (≤35 al comprar).
//       Un movimiento exagerado tiene más razones para devolverse.
//   M3  M1 pero solo cuando el precio está por debajo de su media de 20 días.
//       La misma idea con otra vara: distancia en vez de RSI.
//   M4  CONTROL: la inversión de antes, escrita de frente (débil + tendencia
//       bajista). Tiene que dar aproximadamente lo mismo que la inversión —si
//       no, es que esta parte del código no mide lo que dice medir.
//
// Todo con la regla de medir NEUTRA (1:1), con y sin spread, y partido en dos
// mitades. Una regla que solo gana en una mitad no es un descubrimiento.
// --------------------------------------------------------------------------

// `dif` es la fuerza de la divisa base menos la de la cotizada. La app compra
// cuando es MUY POSITIVA (base fuerte). Estas reglas hacen lo contrario.
const REGLAS_REVERSION = [
  ['M1. Comprar lo débil, vender lo fuerte', (p, esc, thr) => (p.dif < -thr ? 'COMPRA' : p.dif > thr ? 'VENTA' : null)],
  [
    'M2. …y solo con el RSI estirado',
    (p, esc, thr) => (p.dif < -thr && p.rsiV <= 35 ? 'COMPRA' : p.dif > thr && p.rsiV >= 65 ? 'VENTA' : null),
  ],
  [
    'M3. …y solo lejos de la media de 20',
    (p, esc, thr) => (p.dif < -thr && p.c < p.e20 ? 'COMPRA' : p.dif > thr && p.c > p.e20 ? 'VENTA' : null),
  ],
  [
    'M4. CONTROL: la inversión de antes',
    (p, esc, thr) => (p.dif < -thr && p.tend === 'Bajista' ? 'COMPRA' : p.dif > thr && p.tend === 'Alcista' ? 'VENTA' : null),
  ],
]

const corteRev = fechas[Math.floor(fechas.length / 2)]

console.log('')
console.log('LA REGLA DE REVERSIÓN, DE FRENTE (regla de medir neutra)')
console.log('Comprar lo que se cayó en vez de lo que subió. No es la app al revés:')
console.log('es la idea escrita con sus propias condiciones.')
console.log('')
console.log('regla                                    ops  acierto   por 1R   CON SPREAD')
console.log('─'.repeat(86))
const revCorridas = []
for (const [nombre, regla] of REGLAS_REVERSION) {
  const r = correr(simetrica, regla)
  revCorridas.push({ nombre, r })
  const m = medir(r.senales, r.porClave)
  const ms = medir(r.senales, r.porClave, { conSpread: true })
  const num = (x) => (x === null ? '   —  ' : (x >= 0 ? '+' : '') + x.toFixed(2)).padStart(7)
  console.log(
    `${nombre.padEnd(40)} ${String(m.total).padStart(5)}   ` +
      `${m.acierto === null ? '  — ' : (m.acierto.toFixed(0) + '%').padStart(4)}   ${num(m.porRiesgo)}   ${num(ms.porRiesgo)}`
  )
}
console.log('─'.repeat(86))
console.log('Para comparar, las COMPRAS de la app hoy, con la misma vara:')
{
  const m = medir(neutraPartida.senales.filter((s) => s.lado === 'COMPRA'), neutraPartida.porClave)
  const ms = medir(neutraPartida.senales.filter((s) => s.lado === 'COMPRA'), neutraPartida.porClave, { conSpread: true })
  const num = (x) => (x === null ? '   —  ' : (x >= 0 ? '+' : '') + x.toFixed(2)).padStart(7)
  console.log(
    `${'   la app tal cual (solo compras)'.padEnd(40)} ${String(m.total).padStart(5)}   ` +
      `${(m.acierto.toFixed(0) + '%').padStart(4)}   ${num(m.porRiesgo)}   ${num(ms.porRiesgo)}`
  )
}
console.log('')
console.log(`Y partidas en dos mitades (corte en ${corteRev}), CON spread:`)
console.log('')
console.log('regla                                 1ª mitad: ops  acierto  por 1R    2ª mitad: ops  acierto  por 1R')
console.log('─'.repeat(104))
for (const { nombre, r } of revCorridas) {
  const cel = (primera) => {
    const m = medir(
      r.senales.filter((s) => (primera ? s.vistoEl < corteRev : s.vistoEl >= corteRev)),
      r.porClave,
      { conSpread: true }
    )
    return (
      `${String(m.total).padStart(4)}   ${m.acierto === null ? '   — ' : (m.acierto.toFixed(0) + '%').padStart(5)}   ` +
      `${(m.porRiesgo === null ? '—' : (m.porRiesgo >= 0 ? '+' : '') + m.porRiesgo.toFixed(2)).padStart(6)}`
    )
  }
  console.log(`${nombre.padEnd(37)}     ${cel(true)}             ${cel(false)}`)
}
console.log('─'.repeat(104))
console.log('Si una regla gana en la primera mitad y se cae en la segunda, era')
console.log('casualidad. Lo que hay que buscar es que aguante en las dos.')

// --------------------------------------------------------------------------
// LA REVERSIÓN, PAGANDO SWAP.
//
// ⚠️ ESTA TABLA FALTABA, Y ES LA QUE DECIDE.
//
// Hasta ahora la reversión se medía con spread pero SIN swap, y el swap se
// medía solo sobre las señales de la app. O sea que la única regla candidata a
// ganar dinero nunca se había medido pagando las noches que se pasa abierta.
//
// Y aquí eso pesa mucho: una operación de swing dura una docena de días, o sea
// que paga una docena de noches. A 0,5 pips por noche son unos 6 pips, y sobre
// un riesgo típico de unos 60 pips eso es 0,10 por unidad de riesgo — más que
// de sobra para borrar un +0,09.
//
// La columna que importa es "por 1R". Si se vuelve negativa a un nivel de swap
// realista, la regla no sirve por mucho que el acierto siga siendo bonito.
// --------------------------------------------------------------------------

console.log('')
console.log('LA MISMA REVERSIÓN, PERO PAGANDO LAS NOCHES')
console.log('')

for (const { nombre, r } of revCorridas) {
  const b = barridoSwap(r.senales, r.porClave)
  if (!b.total) {
    console.log(`${nombre} — sin operaciones resueltas`)
    continue
  }
  console.log(`${nombre}  (${b.total} ops · duran ${b.mediana} días de mediana, ${b.media.toFixed(1)} de media)`)
  console.log('   swap/noche      acierto   por 1R   coste medio')
  const sinNada = medir(r.senales, r.porClave)
  console.log(
    `   sin costes       ${(sinNada.acierto ?? 0).toFixed(0).padStart(5)}%` +
      `  ${(sinNada.porRiesgo ?? 0).toFixed(3).padStart(7)}         —`
  )
  for (const { nivel, medicion: m, costeMedio } of b.filas) {
    const etiqueta = nivel === 0 ? 'solo spread' : `+ ${nivel.toFixed(2)} pips`
    console.log(
      `   ${etiqueta.padEnd(15)} ${(m.acierto ?? 0).toFixed(0).padStart(5)}%` +
        `  ${(m.porRiesgo ?? 0).toFixed(3).padStart(7)}   ${costeMedio.toFixed(1).padStart(6)} pips`
    )
  }
  // El nivel a partir del cual la regla deja de ganar. Es la pregunta
  // práctica: no "¿cuánto gana?" sino "¿cuánto aguanta antes de no ganar?".
  const ultimoBueno = [...b.filas].reverse().find((f) => (f.medicion.porRiesgo ?? -1) > 0)
  if (!ultimoBueno) {
    console.log('   → PIERDE ya solo con el spread. El swap ni hace falta.')
  } else if (ultimoBueno.nivel === b.filas.at(-1).nivel) {
    console.log(`   → aguanta hasta ${ultimoBueno.nivel} pips de swap por noche, el nivel más caro que se mide.`)
  } else {
    console.log(`   → deja de ganar por encima de ${ultimoBueno.nivel} pips de swap por noche.`)
  }
  console.log('')
}
console.log('El swap real depende del par, de la dirección y del momento: a veces se')
console.log('cobra y a veces se paga. Por eso lo que importa no es una fila sino a')
console.log('PARTIR DE CUÁL la conclusión cambia.')

// --------------------------------------------------------------------------
// LOS UMBRALES VECINOS: ¿es real o lo ajusté yo?
//
// M2 usa "RSI ≤ 35 al comprar, ≥ 65 al vender". Ese 35 lo elegí a mano, y ahí
// está el peligro: si uno prueba diez números y se queda con el que mejor
// salió, no descubrió nada — ajustó una curva a un pasado concreto y la va a
// ver desmoronarse en cuanto llegue un mercado nuevo.
//
// La forma de distinguir una cosa de la otra es mirar la VECINDAD. Un efecto
// real es ancho: si comprar con RSI ≤ 35 funciona porque el precio se estiró
// demasiado, entonces 30 y 40 tienen que funcionar también, y el resultado
// debe subir y bajar suavemente al moverse. Un pico solitario en 35, con 30 y
// 40 planos o negativos, no es un descubrimiento: es una casualidad de estos
// 5 años y no hay ninguna razón para que se repita.
//
// Se barre de 25 a 50 (con el espejo 75..50 del lado de las ventas), todo con
// spread descontado y partido en las dos mitades. Lo que hay que mirar no es
// cuál gana más, sino si TODA la fila es positiva y cambia poco a poco.
// --------------------------------------------------------------------------

console.log('')
console.log('¿ES REAL EL 35 DEL RSI, O LO AJUSTÉ YO? (con spread, regla neutra)')
console.log('Un efecto real es ancho: los vecinos tienen que acompañar.')
console.log('Un pico solitario es una curva ajustada al pasado.')
console.log('')
console.log('RSI ≤ (compra) / ≥ (venta)     ops  acierto   por 1R    1ª mitad   2ª mitad')
console.log('─'.repeat(86))
for (const u of [25, 30, 35, 40, 45, 50]) {
  const regla = (p, esc, thr) =>
    p.dif < -thr && p.rsiV <= u ? 'COMPRA' : p.dif > thr && p.rsiV >= 100 - u ? 'VENTA' : null
  const r = correr(simetrica, regla)
  const m = medir(r.senales, r.porClave, { conSpread: true })
  const mitad = (primera) => {
    const x = medir(
      r.senales.filter((s) => (primera ? s.vistoEl < corteRev : s.vistoEl >= corteRev)),
      r.porClave,
      { conSpread: true }
    )
    return (x.porRiesgo === null ? '   —' : (x.porRiesgo >= 0 ? '+' : '') + x.porRiesgo.toFixed(2)).padStart(7)
  }
  const marca = u === 35 ? '  ← el elegido' : ''
  console.log(
    `RSI ${String(u).padStart(2)} / ${100 - u}${' '.repeat(20)} ${String(m.total).padStart(5)}   ` +
      `${m.acierto === null ? '  — ' : (m.acierto.toFixed(0) + '%').padStart(4)}   ` +
      `${(m.porRiesgo === null ? '   —' : (m.porRiesgo >= 0 ? '+' : '') + m.porRiesgo.toFixed(2)).padStart(7)}   ` +
      `${mitad(true)}    ${mitad(false)}${marca}`
  )
}
console.log('─'.repeat(86))
console.log('Si toda la columna es positiva y sube/baja suave, el efecto es real.')
console.log('Si solo el 35 destaca y los vecinos se caen, lo ajusté yo y no sirve.')

// ==========================================================================
// EL ESPEJISMO DE LA PANTALLA DE HISTORIAL
//
// Néstor mira el Historial y ve 89% de acierto sobre 9 operaciones, con otras
// 8 "en curso". La pregunta es si ese número dice la verdad.
//
// Hay una razón MECÁNICA para que no la diga, y no tiene nada que ver con la
// suerte. La app pone el objetivo MÁS CERCA que el stop (R/B por debajo de 1
// en casi todas). Un objetivo cercano se toca antes que un stop lejano, así
// que las GANADAS se resuelven rápido y las PERDIDAS se quedan abiertas más
// tiempo.
//
// Consecuencia: en cualquier momento que mires la pantalla, las que ya
// terminaron están llenas de ganadoras y las perdedoras todavía están en la
// lista de "en curso", sin contar. El porcentaje sube solo, sin que la app
// acierte más.
//
// Esto se mide de dos formas:
//   1. Cuántos días tarda una ganada contra una perdida.
//   2. Simulando la pantalla: en 200 fechas repartidas por los 5 años, qué
//      habría mostrado el Historial ESE día, contra lo que de verdad acabaron
//      dando esas mismas señales.
// ==========================================================================

{
  const r = correr(actual)
  const conFecha = r.senales
    .map((x) => ({ s: x, res: r.porClave.get(`${x.id}@${x.vistoEl}`) }))
    .filter((x) => x.res && (x.res.resultado === 'ganada' || x.res.resultado === 'perdida'))

  const gan = conFecha.filter((x) => x.res.resultado === 'ganada')
  const per = conFecha.filter((x) => x.res.resultado === 'perdida')
  const mediana = (a) => {
    const v = a.map((x) => x.res.diasTardados).sort((p, q) => p - q)
    return v.length ? v[Math.floor(v.length / 2)] : null
  }
  const media = (a) => (a.length ? a.reduce((t, x) => t + x.res.diasTardados, 0) / a.length : null)

  console.log('')
  console.log('¿DICE LA VERDAD LA PANTALLA DE HISTORIAL?')
  console.log('')
  console.log('1) Cuánto tarda cada una en resolverse (geometría real de la app)')
  console.log('─'.repeat(86))
  console.log(`   ganadas   ${String(gan.length).padStart(4)} ops   mediana ${String(mediana(gan)).padStart(3)} días   media ${media(gan).toFixed(1).padStart(5)}`)
  console.log(`   perdidas  ${String(per.length).padStart(4)} ops   mediana ${String(mediana(per)).padStart(3)} días   media ${media(per).toFixed(1).padStart(5)}`)
  console.log('─'.repeat(86))
  console.log('   Si las perdidas tardan MÁS, la pantalla siempre enseña de más las')
  console.log('   ganadoras: las perdedoras todavía están en "en curso", sin contar.')

  // 2) La simulación de la pantalla.
  const fin = (x) => x.res.velaFinal
  const fechasObs = []
  for (let i = CALENTAMIENTO + 60; i < fechas.length; i += Math.max(1, Math.floor((fechas.length - CALENTAMIENTO - 60) / 200))) {
    fechasObs.push(fechas[i])
  }
  let sumaVista = 0
  let sumaReal = 0
  let n = 0
  let peor = { dif: -1 }
  for (const T of fechasObs) {
    const nacidas = conFecha.filter((x) => x.s.vistoEl <= T)
    const yaCerradas = nacidas.filter((x) => fin(x) <= T)
    if (yaCerradas.length < 20) continue
    const vista = yaCerradas.filter((x) => x.res.resultado === 'ganada').length / yaCerradas.length
    const real = nacidas.filter((x) => x.res.resultado === 'ganada').length / nacidas.length
    sumaVista += vista
    sumaReal += real
    n++
    if (vista - real > peor.dif) peor = { dif: vista - real, T, vista, real, cerradas: yaCerradas.length, abiertas: nacidas.length - yaCerradas.length }
  }
  console.log('')
  console.log(`2) La pantalla simulada en ${n} fechas repartidas por los ${fechas.length} días`)
  console.log('─'.repeat(86))
  console.log(`   lo que habría MOSTRADO el Historial (media)   ${((sumaVista / n) * 100).toFixed(1)}%`)
  console.log(`   lo que esas mismas señales acabaron dando     ${((sumaReal / n) * 100).toFixed(1)}%`)
  console.log(`   diferencia — el espejismo                     ${(((sumaVista - sumaReal) / n) * 100).toFixed(1)} puntos de más`)
  console.log(`   el día que más engañó: ${peor.T} → mostraba ${(peor.vista * 100).toFixed(0)}% con ${peor.cerradas} cerradas`)
  console.log(`   y ${peor.abiertas} en curso; la verdad de ese grupo era ${(peor.real * 100).toFixed(0)}%`)
  console.log('─'.repeat(86))
}

// ==========================================================================
// LA REJILLA: ¿ESTÁ EL OBJETIVO DEMASIADO CERCA?
//
// Las mismas señales, los mismos días, los mismos pares. Lo ÚNICO que cambia
// es a qué distancia se ponen el stop y el objetivo.
//
// La app de hoy da R/B por debajo de 1 casi siempre: arriesga 156 pips para
// buscar 101. Eso NO es malo por sí solo —con acertar mucho se compensa— pero
// significa que una perdida borra vez y media una ganada, y que hace falta
// acertar más del 60% solo para empatar.
//
// "por 1R" con spread es la única columna que decide.
// ==========================================================================

console.log('')
console.log('¿ESTÁ EL OBJETIVO DEMASIADO CERCA? (mismas señales, con spread)')
console.log('')
console.log('stop      objetivo        ops   acierto   por 1R   hace falta acertar')
console.log('─'.repeat(86))
for (const riesgoATR of [1, 1.5, 2]) {
  for (const veces of [0.75, 1, 1.5, 2]) {
    const r = correr((c, compra) => atrFijo(c, compra, { riesgoATR, veces }))
    const m = medir(r.senales, r.porClave, { conSpread: true })
    const ac = m.acierto === null ? '  — ' : (m.acierto.toFixed(0) + '%').padStart(4)
    const pr = m.porRiesgo === null ? '   —  ' : ((m.porRiesgo >= 0 ? '+' : '') + m.porRiesgo.toFixed(2)).padStart(6)
    // El acierto de equilibrio: con objetivo = veces × riesgo, empatas cuando
    // aciertas 1/(1+veces). Es la vara contra la que hay que leer el acierto.
    const equilibrio = (100 / (1 + veces)).toFixed(0)
    console.log(
      `${(riesgoATR + '× ATR').padEnd(10)}${(veces + '× el riesgo').padEnd(15)} ${String(m.total).padStart(5)}    ${ac}   ${pr}   ${equilibrio}%   ${m.acierto > 100 / (1 + veces) ? '✓ lo supera' : '✗ no llega'}`
    )
  }
}
console.log('─'.repeat(86))
console.log('La columna "hace falta acertar" es el acierto de equilibrio: con el')
console.log('objetivo al 0,75 del riesgo hay que acertar el 57% solo para empatar.')
console.log('Un acierto alto con el objetivo cerca no es lo mismo que ganar dinero.')


// --------------------------------------------------------------------------
// ¿CUÁNTO SE COME EL SWAP?
//
// El coste que hasta hoy no se contaba, ni un pip. En intradía daría igual
// porque se cierra el mismo día; aquí las operaciones duran una MEDIANA DE 12
// O 13 DÍAS, y cada noche abierta se paga.
//
// No se elige un número de swap porque no se sabe: depende del diferencial de
// tipos de cada momento y del margen de cada bróker, y no hay histórico de
// cinco años. Lo que sí se puede contestar honestamente es la pregunta que
// importa: ¿A PARTIR DE QUÉ SWAP CAMBIA LA CONCLUSIÓN?
//
// Néstor mira el swap real de su bróker, busca su fila, y ya sabe dónde está.
// --------------------------------------------------------------------------

console.log('')
console.log('══════════════════════════════════════════════════════════════════')
console.log('¿CUÁNTO SE COME EL SWAP? (mismas señales, regla neutra 1:1)')
console.log('══════════════════════════════════════════════════════════════════')
console.log('')
console.log('El swap es lo que el bróker cobra por cada NOCHE con la operación')
console.log('abierta. Hasta hoy el banco de pruebas lo ignoraba por completo.')
console.log('')

// ⚠️ ESTA SECCIÓN ESTUVO ROTA DESDE QUE SE ESCRIBIÓ, Y NADIE LO SUPO.
//
// Llamaba a `generarSenales(completo, {...})` — con el barrido ya calculado
// en vez de con (barras, rates, rangos), que es lo que esa función espera.
// Devolvía `undefined` y el script se caía con "Cannot read properties of
// undefined" al llegar aquí.
//
// El linter no lo veía, porque los dos nombres existen. Y como esto es lo
// último del informe y hay que descargar miles de velas para llegar, el fallo
// solo aparecía DESPUÉS de gastar los créditos del día. Se descubrió el
// 2026-09-03, en la primera corrida que llegó hasta aquí.
//
// 📌 Es el MISMO error que apareció en la app hermana al sacar esta cuenta del
// script. Dos veces el mismo fallo, en los dos repositorios, por la misma
// razón: una función con dos formas de llamarla y un linter que no distingue.
// Por eso ahora la cuenta vive en `barridoSwap`, que recibe listas ya
// generadas y tiene su propia prueba sin internet.
{
  const neutro = correr(simetrica)
  const b = barridoSwap(neutro.senales, neutro.porClave)
  console.log(`Cuánto duran las operaciones: mediana ${b.mediana} días, media ${b.media.toFixed(1)}.`)
  console.log(`Eso son las noches que se pagan en cada una.`)
  console.log('')

  console.log('swap/noche      ops  acierto   por 1R   coste medio')
  console.log('─────────────────────────────────────────────────────')
  const sinCostes = medir(neutro.senales, neutro.porClave)
  console.log(
    `sin costes    ${String(sinCostes.total).padStart(5)}` +
      `  ${(sinCostes.acierto ?? 0).toFixed(0).padStart(5)}%` +
      `  ${(sinCostes.porRiesgo ?? 0).toFixed(3).padStart(7)}` +
      `        —`
  )
  for (const { nivel, medicion: m, costeMedio } of b.filas) {
    const etiqueta = nivel === 0 ? 'solo spread' : `+ ${nivel.toFixed(2)} pips`
    console.log(
      `${etiqueta.padEnd(13)} ${String(m.total).padStart(5)}` +
        `  ${(m.acierto ?? 0).toFixed(0).padStart(5)}%` +
        `  ${(m.porRiesgo ?? 0).toFixed(3).padStart(7)}` +
        `  ${costeMedio.toFixed(1).padStart(6)} pips`
    )
  }
  console.log('')
  console.log('El acierto NO cambia entre filas: los costes no mueven si el precio')
  console.log('llegó al objetivo o al stop, solo lo que queda después. Lo que hay')
  console.log('que mirar es la columna "por 1R".')
  console.log('')
  console.log('Y ojo con la trampa de leer esto al revés: que el swap empeore poco')
  console.log('NO quiere decir que el sistema esté bien. Quiere decir que ya perdía')
  console.log('antes de contarlo.')
}

// --------------------------------------------------------------------------
// LA CONFLUENCIA DE MARCOS TEMPORALES.
//
// De dónde sale: Néstor vio una app de escritorio que anuncia "confluencia
// ponderada de 15m, 1h, 4h y 1D" y preguntó si podíamos probar ese método. De
// toda su lista de funciones era lo ÚNICO que esta app no había medido nunca:
// RSI, ATR, stop y objetivo automáticos, calculadora de lote y alertas ya
// estaban todos medidos aquí.
//
// Aquí las velas son diarias, así que los marcos son diario, semanal y mensual.
// Se reagrupa la serie de verdad (ver `reagrupar` en marketCalc.js); NO se
// aproxima con una media diaria más larga, que sería otra cosa.
//
// TRES COSAS QUE ESTA MEDICIÓN TIENE QUE SOBREVIVIR PARA CREÉRSELA:
//
//  1. EL CONTROL. Se mide también lo CONTRARIO —exigir que ningún marco largo
//     acompañe—. Si confluir y no confluir dan lo mismo, el filtro no está
//     midiendo nada, y eso hay que poder verlo.
//
//  2. LAS SEÑALES POR MES. El error del ADX en la app hermana fue mirar solo el
//     acierto: subió el umbral, el acierto mejoró, y la app se quedó siete
//     reportes seguidos sin decir nada. Un filtro que deja la app muda no sirve
//     aunque acierte.
//
//  3. LAS DOS MITADES DEL TIEMPO.
//
// ⚠️ Y EL CALENTAMIENTO SUBE A 140 DÍAS, para todas las filas de esta tabla
// incluida la de referencia. La EMA20 semanal necesita 20 semanas (~100 días) y
// la EMA6 mensual 6 meses (~130). Con el calentamiento normal de 80 los marcos
// largos dirían "Rango" durante meses y el filtro rechazaría todo por falta de
// datos, no por falta de confluencia. Comparar contra una referencia calentada
// a 80 mediría el calentamiento, no el filtro.
//
// Y sí cabe en producción: el vigía descarga 300 días.
// --------------------------------------------------------------------------

{
  const CAL_CONF = 140
  const corteConf = fechas[Math.floor((CAL_CONF + fechas.length) / 2)]
  const meses = (fechas.length - CAL_CONF) / 21

  console.log('')
  console.log('CONFLUENCIA DE MARCOS TEMPORALES (diario + semanal + mensual)')
  console.log('¿Ayuda exigir que la tendencia apunte al mismo lado en varios marcos?')
  console.log(`Regla neutra 1:1, spread descontado, calentamiento ${CAL_CONF} días.`)
  console.log(`Las dos mitades se parten en ${corteConf}.`)
  console.log('')
  console.log('exigencia                     ops  señ/mes  acierto   por 1R  │  1ª mitad  │  2ª mitad')
  console.log('─'.repeat(88))

  const EXIGENCIAS = [
    [null, 'sin filtro (hoy)'],
    [1, 'al menos 1 marco largo'],
    [2, 'los 2 marcos largos'],
    [-1, 'CONTROL: ninguno acompaña'],
  ]

  const porConfluencia = new Map()
  for (const [n, etiqueta] of EXIGENCIAS) {
    const r = correr(simetrica, null, { confluenciaMin: n }, CAL_CONF)
    porConfluencia.set(n, r)
    const m = medir(r.senales, r.porClave, { conSpread: true })
    const m1 = medir(r.senales.filter((s) => s.vistoEl < corteConf), r.porClave, { conSpread: true })
    const m2 = medir(r.senales.filter((s) => s.vistoEl >= corteConf), r.porClave, { conSpread: true })
    const ac = (x) => (x === null ? '  — ' : (x.toFixed(0) + '%').padStart(4))
    const pr = (x) => (x === null ? '   —  ' : ((x >= 0 ? '+' : '') + x.toFixed(2)).padStart(6))
    console.log(
      `${etiqueta.padEnd(28)} ${String(m.total).padStart(4)}   ${(m.total / meses).toFixed(1).padStart(5)}    ` +
        `${ac(m.acierto)}   ${pr(m.porRiesgo)}  │ ${ac(m1.acierto)} ${pr(m1.porRiesgo)} │ ` +
        `${ac(m2.acierto)} ${pr(m2.porRiesgo)}`
    )
  }
  console.log('─'.repeat(88))
  console.log('⚠️ Las operaciones pueden SUBIR con el filtro, y no es un error: la app')
  console.log('   se queda con los 5 mejores por lado, así que cuando el filtro rechaza')
  console.log('   un par, el siguiente sube a ese hueco y entra en otra fecha. El filtro')
  console.log('   no quita señales, las CAMBIA POR OTRAS. Pasó igual con el del RSI.')
  console.log('')
  console.log('Para encenderlo hace falta que "los 2 marcos" gane a "sin filtro" EN LAS')
  console.log('DOS MITADES, que el CONTROL salga claramente peor, y que queden señales')
  console.log('suficientes al mes. Si el control empata, el filtro no mide nada.')

  console.log('')
  console.log('EL MISMO, CON LA GEOMETRÍA REAL DE LA APP (con spread)')
  console.log('exigencia                                        ops   acierto      pips   por 1R')
  console.log('─'.repeat(86))
  for (const [n, etiqueta] of EXIGENCIAS) {
    const r = correr(actual, null, { confluenciaMin: n }, CAL_CONF)
    fila(etiqueta, medir(r.senales, r.porClave, { conSpread: true }))
  }
  console.log('─'.repeat(86))

  // Cuánto se solapan de verdad los marcos. Si el semanal dijera casi siempre
  // lo mismo que el diario, el filtro no podría aportar nada por construcción,
  // y ese sería el hallazgo — no el "por 1R".
  console.log('')
  console.log('¿CUÁNTO SE PARECEN LOS MARCOS ENTRE SÍ?')
  console.log('Si el semanal repitiera al diario, este filtro no podría aportar nada.')
  console.log('')
  let coincideSem = 0
  let coincideMes = 0
  let total = 0
  for (const p of completo.pares) {
    if (p.tend === 'Rango') continue
    total++
    if (p.tendSem === p.tend) coincideSem++
    if (p.tendMes === p.tend) coincideMes++
  }
  if (total) {
    console.log(`Del último día, ${total} pares con tendencia diaria clara:`)
    console.log(`  el semanal coincide en ${coincideSem} (${((coincideSem / total) * 100).toFixed(0)}%)`)
    console.log(`  el mensual coincide en ${coincideMes} (${((coincideMes / total) * 100).toFixed(0)}%)`)
  } else {
    console.log('Ningún par con tendencia diaria clara el último día.')
  }
  console.log('')
  console.log('LA MEJOR DE ELLAS, PAGANDO LAS NOCHES')
  const mejorConf = [1, 2].reduce((a, b) => {
    const ma = medir(porConfluencia.get(a).senales, porConfluencia.get(a).porClave, { conSpread: true })
    const mb = medir(porConfluencia.get(b).senales, porConfluencia.get(b).porClave, { conSpread: true })
    return (mb.porRiesgo ?? -99) > (ma.porRiesgo ?? -99) ? b : a
  })
  const rMejor = porConfluencia.get(mejorConf)
  const bConf = barridoSwap(rMejor.senales, rMejor.porClave)
  console.log(
    `${mejorConf === 2 ? 'Los 2 marcos largos' : 'Al menos 1 marco largo'}  ` +
      `(${bConf.total} ops · mediana ${bConf.mediana} días, media ${bConf.media.toFixed(1)})`
  )
  console.log('   swap/noche      acierto   por 1R   coste medio')
  const sinC = medir(rMejor.senales, rMejor.porClave)
  console.log(
    `   sin costes       ${(sinC.acierto ?? 0).toFixed(0).padStart(5)}%  ${(sinC.porRiesgo ?? 0).toFixed(3).padStart(7)}         —`
  )
  for (const { nivel, medicion: m, costeMedio } of bConf.filas) {
    const etiqueta = nivel === 0 ? 'solo spread' : `+ ${nivel.toFixed(2)} pips`
    console.log(
      `   ${etiqueta.padEnd(14)}  ${(m.acierto ?? 0).toFixed(0).padStart(5)}%` +
        `  ${(m.porRiesgo ?? 0).toFixed(3).padStart(7)}   ${costeMedio.toFixed(1).padStart(5)} pips`
    )
  }
}

// --------------------------------------------------------------------------
// AFLOJAR LOS FILTROS: ¿la app está muda por culpa suya?
//
// Lo pidió Néstor después de investigar por su cuenta, y su observación es
// buena: los operadores con experiencia usan POCOS indicadores, y una razón es
// justo esta — cada condición parece razonable por separado y apiladas son una
// pared que no deja pasar nada.
//
// Este proyecto ya se dio ese golpe en la app hermana: subir el ADX de 20 a 35
// mejoró el acierto y dejó SIETE reportes seguidos sin una sola señal, incluido
// el solape de Londres con Nueva York.
//
// ⚠️ CÓMO HAY QUE LEER ESTA TABLA, Y ES LO MÁS IMPORTANTE DE ELLA.
// Aflojar da MÁS señales. Eso NO es mejorar: está medido que las señales de
// esta app pierden dinero, y más señales de un sistema que pierde es perder
// más rápido. Lo único que puede justificar aflojar es que la app sirva como
// HERRAMIENTA DE INFORMACIÓN —que hable, que enseñe qué se mueve— sin que el
// resultado por operación empeore.
//
// Son dos objetivos distintos. Por eso las señales/mes van AL LADO del "por
// 1R" y no en otra tabla: la decisión es un intercambio, no una mejora.
// --------------------------------------------------------------------------

{
  const meses = (fechas.length - CALENTAMIENTO) / 21

  console.log('')
  console.log('AFLOJAR LOS FILTROS (regla neutra 1:1, con spread)')
  console.log('Cada fila quita o relaja una pared. Mirar las DOS columnas juntas:')
  console.log('más señales no es mejor si el resultado por operación empeora.')
  console.log('')
  console.log('qué se afloja                          ops  señ/mes  acierto   por 1R')
  console.log('─'.repeat(80))

  const linea = (nombre, r) => {
    const m = medir(r.senales, r.porClave, { conSpread: true })
    const ac = m.acierto === null ? '  — ' : (m.acierto.toFixed(0) + '%').padStart(4)
    const pr =
      m.porRiesgo === null
        ? '   —  '
        : ((m.porRiesgo >= 0 ? '+' : '') + m.porRiesgo.toFixed(2)).padStart(6)
    console.log(
      `${nombre.padEnd(34)} ${String(m.total).padStart(5)}   ${(m.total / meses).toFixed(1).padStart(5)}    ${ac}   ${pr}`
    )
  }

  const conThr = (t, vista = {}) => {
    const senales = generarSenales(fechas, rates, rangosPar, {
      calentamiento: CALENTAMIENTO,
      thr: t,
      topN: TOP_N,
      geometria: simetrica,
      vista,
    })
    const { resultados } = resolver(senales, completo)
    return { senales, porClave: new Map(resultados.map((r) => [r.clave, r])) }
  }

  // 1. El umbral de fuerza. Es la primera puerta: por debajo de `thr` el par ni
  //    se considera.
  console.log('· El umbral de fuerza relativa (hoy 0.5)')
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    linea(`  fuerza > ${t.toFixed(2)}${t === THR ? '  (hoy)' : ''}`, conThr(t))
  }

  // 2. La exigencia de tendencia. Es la pared más alta: pide DOS cosas a la vez
  //    (precio sobre la EMA20, y EMA20 sobre EMA50), y la segunda tarda mucho
  //    en cumplirse después de un giro.
  console.log('')
  console.log('· Cuánta tendencia se exige')
  for (const [clave, nombre] of [
    ['alineada', '  medias alineadas  (hoy)'],
    ['media', '  solo precio sobre la EMA20'],
    ['ninguna', '  nada: manda solo la fuerza'],
  ]) {
    linea(nombre, correr(simetrica, null, { tendenciaMin: clave }))
  }

  // 3. Las dos aflojadas a la vez, que es lo que de verdad se plantea.
  console.log('')
  console.log('· Las dos a la vez')
  for (const t of [0.25, 0.5]) {
    for (const clave of ['media', 'ninguna']) {
      linea(`  fuerza > ${t} + tendencia ${clave}`, conThr(t, { tendenciaMin: clave }))
    }
  }

  // 4. Lo que cuesta tener las ventas en pausa. No es un filtro de umbral: es
  //    media app apagada, y conviene tener el número al lado de los demás.
  console.log('')
  console.log('· Lo que cuesta la pausa de las ventas')
  const base = correr(simetrica)
  linea('  solo compras (lo que se ve hoy)', {
    senales: base.senales.filter((s) => s.lado === 'COMPRA'),
    porClave: base.porClave,
  })
  linea('  compras y ventas', base)

  console.log('─'.repeat(80))
  console.log('Con la geometría REAL de la app:')
  console.log('filtro                                           ops   acierto      pips   por 1R')
  for (const clave of ['alineada', 'media', 'ninguna']) {
    const r = correr(actual, null, { tendenciaMin: clave })
    fila(`tendencia ${clave}`, medir(r.senales, r.porClave, { conSpread: true }))
  }
}

// --------------------------------------------------------------------------
// EL BARRIDO DE LIQUIDEZ (idea traída por Néstor de los métodos ICT / SMC)
//
// QUÉ ES, SIN JERGA
// El precio perfora un máximo o un mínimo anterior —donde está acumulada la
// gente con sus stops— y CIERRA DE VUELTA DENTRO. La idea es que ese pinchazo
// no era el inicio de un movimiento sino la recogida de esos stops, y que el
// precio suele volverse después.
//
// POR QUÉ ESTA IDEA Y NO OTRA DE SU LISTA
// Néstor trajo una investigación sobre lo que usan los operadores
// profesionales. La mayor parte de esa lista —Level 2, Volume Profile,
// Bookmap, Bloomberg— pide datos que NO tenemos: nosotros vemos el resumen de
// cada vela (apertura, máximo, mínimo, cierre) y ellos ven las órdenes en
// espera. Eso no se puede copiar, y explica por qué el estudio de las 14
// familias sobre datos OHLCV no encontró nada.
//
// Pero el barrido de liquidez SÍ se calcula con máximo, mínimo y cierre. Y hay
// una razón de fondo para probarlo antes que cualquier otra: **es un patrón de
// REVERSIÓN**, y la reversión es lo único que ha medido positivo en todo este
// proyecto (+0,051 por 1R en Swing con costes). No sería copiar una moda:
// sería una segunda vía, independiente, hacia el mismo efecto que ya
// encontramos. Cuando dos caminos distintos llevan al mismo sitio, eso sí
// es una señal de que hay algo.
//
// ⚠️ EL CONTROL ES LO QUE HACE QUE ESTO SEA UNA MEDICIÓN Y NO UN CUENTO.
// Se mide también el ROMPIMIENTO: perforar el mismo nivel y cerrar FUERA. Si
// las dos cosas dan lo mismo, entonces lo que importa no es "volverse" sino
// simplemente "tocar el nivel", y la historia del barrido de stops sobra.
// --------------------------------------------------------------------------

{
  const corteBar = fechas[Math.floor(fechas.length / 2)]
  const meses = (fechas.length - CALENTAMIENTO) / 21

  console.log('')
  console.log('EL BARRIDO DE LIQUIDEZ (regla nueva, vara neutra 1:1)')
  console.log('El precio perfora un extremo anterior y CIERRA DE VUELTA dentro.')
  console.log(`Las dos mitades se parten en ${corteBar}.`)
  console.log('')
  console.log('regla                                  ops  señ/mes  acierto  por 1R  │ 1ª mit │ 2ª mit')
  console.log('─'.repeat(92))

  const linea = (nombre, regla) => {
    const r = correr(simetrica, regla)
    const m = medir(r.senales, r.porClave, { conSpread: true })
    const m1 = medir(r.senales.filter((x) => x.vistoEl < corteBar), r.porClave, { conSpread: true })
    const m2 = medir(r.senales.filter((x) => x.vistoEl >= corteBar), r.porClave, { conSpread: true })
    const pr = (x) => (x === null ? '   —  ' : ((x >= 0 ? '+' : '') + x.toFixed(2)).padStart(6))
    const ac = (x) => (x === null ? '  — ' : (x.toFixed(0) + '%').padStart(4))
    console.log(
      `${nombre.padEnd(36)} ${String(m.total).padStart(5)}   ${(m.total / meses).toFixed(1).padStart(5)}    ` +
        `${ac(m.acierto)}  ${pr(m.porRiesgo)} │ ${pr(m1.porRiesgo)} │ ${pr(m2.porRiesgo)}`
    )
    return r
  }

  // El barrido de N días. Con N=1 es "el máximo/mínimo de AYER", que es el
  // nivel del que hablan los métodos ICT; con N=5 es el de la semana pasada.
  console.log('· Cuántos días atrás está el nivel que se barre')
  for (const n of [1, 3, 5, 10, 20]) {
    linea(`  B${n}. barrido de ${n} día${n > 1 ? 's' : ''}`, reglaBarrido(n))
  }

  console.log('')
  console.log('· Añadiéndole condiciones al mejor tamaño (10 días)')
  linea('  + fuerza relativa a favor', reglaBarrido(10, { exigirFuerza: true }))
  linea('  + RSI estirado (como la M2)', reglaBarrido(10, { rsiEstirado: true }))
  linea('  + las dos', reglaBarrido(10, { exigirFuerza: true, rsiEstirado: true }))

  console.log('')
  // ⚠️ CUIDADO CON EL NOMBRE DE ESTAS FILAS. Se llamaron «rompimiento» en la
  // primera versión y era ENGAÑOSO: un rompimiento, tal como se entiende
  // normalmente, es VENDER cuando el precio hace un mínimo nuevo (seguir el
  // movimiento). Aquí es al revés: se COMPRA ese mínimo nuevo. Comprobado con
  // el código en la mano, no de memoria — un par que perfora el suelo y cierra
  // abajo sale `true` para 'COMPRA', no para 'VENTA'.
  //
  // O sea que estas filas son «comprar la caída sin esperar a que rebote»:
  // reversión más profunda todavía que el barrido, no lo contrario de él. Las
  // dos compran debilidad; lo que cambia es si se exige que el precio ya haya
  // recuperado al cierre (barrido) o no (esto).
  console.log('· CONTROL: perfora y NO recupera — y se compra igual')
  console.log('  Comprar el mínimo nuevo mientras sigue cayendo, sin esperar rebote.')
  console.log('  Si esto da lo mismo, lo que importa es tocar el nivel, no volverse.')
  for (const n of [1, 5, 10, 20]) {
    linea(`  C${n}. comprar la caída de ${n} día${n > 1 ? 's' : ''}`, reglaBarrido(n, { volver: false }))
  }

  console.log('─'.repeat(92))
  console.log('Para comparar, con la misma vara:')
  {
    const base = correr(simetrica)
    const m = medir(base.senales, base.porClave, { conSpread: true })
    console.log(
      `  la app hoy                         ${String(m.total).padStart(5)}   ${(m.total / meses).toFixed(1).padStart(5)}    ` +
        `${(m.acierto ?? 0).toFixed(0).padStart(3)}%  ${((m.porRiesgo ?? 0) >= 0 ? '+' : '') + (m.porRiesgo ?? 0).toFixed(2)}`
    )
    const rev = correr(simetrica, REGLAS_REVERSION[1][1])
    const mr = medir(rev.senales, rev.porClave, { conSpread: true })
    console.log(
      `  la reversión M2 (lo mejor medido)  ${String(mr.total).padStart(5)}   ${(mr.total / meses).toFixed(1).padStart(5)}    ` +
        `${(mr.acierto ?? 0).toFixed(0).padStart(3)}%  ${((mr.porRiesgo ?? 0) >= 0 ? '+' : '') + (mr.porRiesgo ?? 0).toFixed(2)}`
    )
  }

  // Si el barrido y la reversión eligieran las mismas operaciones, no sería
  // una vía independiente sino la misma regla con otro nombre — y entonces
  // "dos caminos llevan al mismo sitio" dejaría de ser un argumento.
  console.log('')
  console.log('¿ES UNA VÍA INDEPENDIENTE O LA REVERSIÓN CON OTRO NOMBRE?')
  {
    const bar = correr(simetrica, reglaBarrido(10))
    const rev = correr(simetrica, REGLAS_REVERSION[1][1])
    const clave = (x) => `${x.par}|${x.lado}|${x.vistoEl}`
    const enRev = new Set(rev.senales.map(clave))
    const comunes = bar.senales.filter((x) => enRev.has(clave(x))).length
    const pct = bar.senales.length ? (comunes / bar.senales.length) * 100 : 0
    console.log(
      `De las ${bar.senales.length} señales del barrido de 10 días, ${comunes} (${pct.toFixed(0)}%) ` +
        `coinciden con la reversión M2.`
    )
    console.log('Cuanto MENOS coincidan, más independiente es el hallazgo (si lo hay).')
  }
}

console.log('')
console.log('Cómo leerlo, y con qué desconfianza:')
console.log(' · Con menos de ~30 operaciones el porcentaje puede ser suerte.')
console.log(' · Los filtros solo QUITAN operaciones, así que siempre es posible')
console.log(`   encontrar uno que borre justo las malas de ESTOS ${fechas.length} días sin`)
console.log('   que sirva de nada en el futuro. Vale la pena un filtro cuando')
console.log('   además tiene una razón de mercado detrás, no un número bonito.')
console.log(' · Donde dice "con costes" ya van descontados spread por par y swap.')
console.log(` · Son ${fechas[0]} a ${fechas.at(-1)}. Un mercado distinto puede dar la vuelta a esto.`)
console.log('---BACKTEST-FIN---')
