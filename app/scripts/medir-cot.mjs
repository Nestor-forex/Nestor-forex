// ¿SIRVE EL COT PARA FILTRAR LAS SEÑALES DE LA APP?
//
//     Actions → «Medir si el COT sirve como filtro» → Run workflow
//
// ─────────────────────────────────────────────────────────────────────────
// QUÉ ES ESTO Y QUÉ NO ES
// ─────────────────────────────────────────────────────────────────────────
// Néstor lo pidió el 2026-09-14 con estas palabras: «mide si el COT sirve para
// filtrar mis señales, pero hazlo como una medición interna como prueba […]
// sin que por ahora me haga cambios en la app y si no sirve lo dejamos tal cual
// como está ahora como información».
//
// Así que esto **no toca ni una línea de `src/`**. Es una medición aparte que
// lee las señales que la app ya produce y pregunta si el COT habría ayudado a
// descartar las malas.
//
// ⚠️ GASTA 14 CRÉDITOS de Twelve Data (las velas). El historial del COT es
// gratis y no gasta ninguno.
//
// ─────────────────────────────────────────────────────────────────────────
// DOS FAMILIAS, DOS LISTONES (añadido el 2026-11-02)
// ─────────────────────────────────────────────────────────────────────────
// La primera versión medía solo **los fondos** (`lev_money`, los hedge funds):
// once filas, las once perdieron, y lo que lo cerró fue que la dirección
// ganadora cambiaba entre mitades. Listón en `lib/preregistro-cot.mjs`
// (2026-09-14), veredicto SUSPENSO.
//
// Néstor preguntó el 2026-11-02 si «los minoristas pierden, hagamos lo
// contrario» estaba medido. **No lo estaba**, y los dos grupos no son espejos:
// el informe reparte a todo el mundo en CINCO familias, no en dos. Así que
// ahora se mide también **los pequeños** (`nonrept`, «los que no declaran»),
// con su propio listón en `lib/preregistro-cot-pequenos.mjs` (2026-11-02).
//
// ⚠️⚠️ `nonrept` NO ES EL SENTIMIENTO MINORISTA DE UN BRÓKER DE FOREX. Un solo
// contrato de euro del CME son 125.000 €, más de cien veces lo que mueve
// alguien que opera 0,01 lotes. Es un PARECIDO con cinco años de historia, y
// su aprobado no diría nada sobre el dato de verdad — está escrito con todas
// las letras en `QUE_SIGNIFICA_APROBAR_PEQUENOS`.
//
// 📌 Y de paso esta corrida **actualiza los números de los fondos**, que son
// del 2026-09-14 y por tanto ANTERIORES a la rejilla limpia (2026-10-06) y al
// swap por noches de calendario. No es un efecto secundario molesto: eran
// números viejos que seguían citándose.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ LA LIMITACIÓN QUE HAY QUE TENER DELANTE AL LEER LA TABLA
// ─────────────────────────────────────────────────────────────────────────
// Aquí el filtro **solo QUITA señales**: se generan las de la app y después se
// tachan las que el COT rechazaría.
//
// En la app de verdad pasaría otra cosa, y está documentado desde el
// 2026-08-25: la app se queda con los 5 mejores por lado, así que **al
// rechazar un par, el siguiente de la lista SUBE al hueco**. O sea que un
// filtro de verdad no quita señales, las CAMBIA por otras — y llegó a medirse
// un caso donde poner un filtro daba MÁS operaciones que no ponerlo.
//
// Se mide la versión que solo quita, y a propósito, por dos razones:
//
//   1. es la única que no obliga a tocar `marketCalc.js`, que es justo lo que
//      Néstor pidió que no se hiciera;
//   2. y contesta primero la pregunta de fondo: **¿el COT sabe algo sobre
//      cuáles de estas señales son malas?** Si la respuesta es no, la versión
//      con relleno sobra — no se puede rellenar con información que no existe.
//
// Si saliera que sí sabe algo, ENTONCES habría que medir la versión con
// relleno antes de encender nada. Eso queda dicho aquí para que nadie lo
// confunda con un aprobado.

import { computarBarrido, UMBRAL_FUERZA } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { generarSenales, medir } from './lib/backtest-nucleo.mjs'
import { simetrica, actual } from './lib/geometrias.mjs'
import { resolver } from './lib/resolver.mjs'
import { FAMILIAS } from '../src/lib/cot.js'
import { mayorAportePorPar } from './lib/aporte-por-par.mjs'
import {
  bajarHistoria,
  descubrirColumnas,
  diasEntre,
  familiasQueFaltan,
  indexarHistoria,
  sesgoDePar,
} from './lib/cot-historia.mjs'
import { FECHA_PREREGISTRO, PREREGISTRO_COT, QUE_SIGNIFICA_APROBAR_COT, juzgarCot } from './lib/preregistro-cot.mjs'
import {
  FECHA_PREREGISTRO_PEQUENOS,
  PREREGISTRO_PEQUENOS,
  QUE_SIGNIFICA_APROBAR_PEQUENOS,
  juzgarPequenos,
} from './lib/preregistro-cot-pequenos.mjs'

const CALENTAMIENTO = 80
// ⚠️ NO se escribe el número: lo importa. Tres copias a mano del umbral que
// decide todas las señales eran tres formas de medir otra app (2026-10-12).
const THR = UMBRAL_FUERZA
const TOP_N = 3
const VELAS = Number(process.env.VELAS || 1500)

// Los umbrales que se prueban, en puntos de porcentaje del interés abierto.
// Cinco, para poder mirar los VECINOS del mejor: un efecto real se degrada
// suave y una casualidad de rejilla no.
const UMBRALES = [0, 2, 5, 10, 15]

console.log('---MEDICION-COT-INICIO---')
console.log(`Fecha (UTC): ${new Date().toISOString()}`)
console.log('')
for (const [titulo, fecha, archivo, lista] of [
  ['EL LISTÓN DE LOS FONDOS', FECHA_PREREGISTRO, 'preregistro-cot.mjs', PREREGISTRO_COT],
  ['EL LISTÓN DE LOS PEQUEÑOS', FECHA_PREREGISTRO_PEQUENOS, 'preregistro-cot-pequenos.mjs', PREREGISTRO_PEQUENOS],
]) {
  console.log(`${titulo}, ESCRITO ANTES DE VER NADA`)
  console.log(`(fijado el ${fecha}, en scripts/lib/${archivo})`)
  for (const c of lista) {
    console.log('')
    console.log(`  · ${c.que}`)
    console.log(`    ${c.porque}`)
  }
  console.log('')
  console.log('─'.repeat(96))
  console.log('')
}

// ── Las velas y las señales de la app ────────────────────────────────────
const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave(), { velas: VELAS })
const completo = computarBarrido(fechas, rates, rangosPar)
console.log('')
console.log(`Días descargados: ${fechas.length} · de ${fechas[0]} a ${fechas.at(-1)}`)

// ── El historial del COT ─────────────────────────────────────────────────
//
// ⚠️ MIRAR ANTES DE PEDIR. Los nombres de columna de esta tabla son
// inconsistentes a propósito de la CFTC (`lev_money_positions_long` sin sufijo
// contra `nonrept_positions_long_all` con él) y desde donde se programa el host
// está BLOQUEADO, así que no se pueden comprobar. Un `$select` con una columna
// inexistente da 400 y aborta la medición entera; esto convierte ese 400 en un
// mensaje que dice qué nombres SÍ hay.
const disponibles = await descubrirColumnas()
const faltan = familiasQueFaltan(disponibles)
if (faltan.length) {
  console.log('')
  console.log('⚠️ LA CFTC NO TIENE ALGUNA COLUMNA QUE ESTE GUION PIDE:')
  for (const f of faltan) {
    console.log(`    familia «${f.familia}» pide ${f.columna}, que NO existe.`)
    console.log(`      las que SÍ hay con esa raíz: ${f.parecidas.join(', ') || '(ninguna)'}`)
  }
  console.log('')
  console.log('   Corregir los nombres en src/lib/cot.js (FAMILIAS) y volver a lanzar.')
  process.exit(1)
}

const crudo = await bajarHistoria('2019-01-01', { familias: ['fondos', 'pequenos'] })
const indices = {
  fondos: indexarHistoria(crudo, { familia: 'fondos' }),
  pequenos: indexarHistoria(crudo, { familia: 'pequenos' }),
}
console.log(`Informes del COT: ${crudo.length} filas`)
for (const familia of Object.keys(indices)) {
  const idx = indices[familia]
  console.log('')
  console.log(`  ${FAMILIAS[familia].etiqueta} — ${Object.keys(idx).length} divisas`)
  for (const d of Object.keys(idx).sort()) {
    console.log(`    ${d}: ${idx[d].length} informes, de ${idx[d][0].f} a ${idx[d].at(-1).f}`)
  }
}

// ⚠️ Si una familia no trajera NINGUNA divisa, las tablas saldrían vacías y el
// veredicto se calcularía sobre la nada. Un `null` en `porRiesgo` no es un
// suspenso: es «no se pudo medir», y los dos se leen igual en una tabla.
for (const familia of Object.keys(indices)) {
  const n = Object.keys(indices[familia]).length
  if (n >= 8) continue
  console.log('')
  console.log(`⚠️ La familia «${familia}» solo trajo ${n} divisas de 8.`)
  console.log('   La columna existe pero viene vacía, o cambió de significado. No se mide.')
  process.exit(1)
}

// 📌 Que las dos familias den números DISTINTOS es lo que demuestra que de
// verdad se están leyendo dos cosas. Si salieran iguales, lo más probable sería
// que `indexarHistoria` estuviera ignorando la familia y leyendo siempre la
// misma columna — y la tabla de los pequeños sería la de los fondos con otro
// rótulo, que es un error de medición y no un resultado.
{
  const d = Object.keys(indices.fondos).sort()[0]
  const a = indices.fondos[d]?.at(-1)
  const b = indices.pequenos[d]?.at(-1)
  console.log('')
  console.log(`Comprobación de que son dos cosas distintas (${d}, informe del ${a?.f}):`)
  console.log(`    fondos:   neto ${a?.neto}  (${a?.pct?.toFixed(1)} % del interés abierto)`)
  console.log(`    pequeños: neto ${b?.neto}  (${b?.pct?.toFixed(1)} % del interés abierto)`)
  if (a && b && a.neto === b.neto) {
    console.log('')
    console.log('⚠️ SON IDÉNTICOS. Eso no puede pasar con dos familias distintas: lo más')
    console.log('   probable es que se esté leyendo la misma columna dos veces. No se mide.')
    process.exit(1)
  }
}

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

// Le pega a cada señal el sesgo del COT que se conocía ESE día.
//
// ⚠️ Las señales para las que no había informe publicado se QUITAN de todo,
// también de la fila de referencia. Si la referencia las incluyera y las filas
// filtradas no, la comparación mediría dos universos distintos y la diferencia
// no significaría nada.
function conSesgo(senales, idx) {
  const out = []
  let sin = 0
  const retrasos = []
  for (const s of senales) {
    const r = sesgoDePar(idx, s.base, s.cotizada, s.vistoEl)
    if (!r) {
      sin++
      continue
    }
    const d = diasEntre(r.fechaDato, s.vistoEl)
    if (d != null) retrasos.push(d)
    out.push({ ...s, sesgo: r.sesgo })
  }
  return { senales: out, sin, retrasos }
}

const mediana = (a) => {
  if (!a.length) return null
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// Las dos lecturas del COT. Se prueban LAS DOS porque nadie sabe cuál es la
// buena — y por eso el criterio 5 del listón exige que la ganadora sea la
// misma en las dos mitades: si no, se estaría eligiendo a posteriori.
const DIRECCIONES = {
  seguir: (s, u) => (s.lado === 'COMPRA' ? s.sesgo >= u : s.sesgo <= -u),
  contra: (s, u) => (s.lado === 'COMPRA' ? s.sesgo <= -u : s.sesgo >= u),
}

// ⚠️ LOS MESES SE CUENTAN EN DÍAS DE CALENDARIO, NO EN DÍAS DE MERCADO.
//
// La primera versión hacía `(fechas.length - CALENTAMIENTO) / 30.44`, o sea
// dividía días de MERCADO entre los días que tiene un mes de calendario. El
// mercado abre unos 252 días al año y el calendario tiene 365, así que esa
// cuenta INFLA el ritmo un 45 %: la app salía a 50 señales al mes cuando en
// CLAUDE.md está medida en 36,1.
//
// No cambió el veredicto —el criterio de «al menos 10 al mes» se cumplía con
// las dos cuentas— pero una cifra inflada en un informe que después se cita es
// exactamente la clase de error que este proyecto lleva meses quitando.
const MESES = (diasEntre(fechas[CALENTAMIENTO], fechas.at(-1)) ?? 1) / 30.44

// ⚠️ `quienes` y NO `etiqueta`: dentro de esta función ya hay una `etiqueta`
// que es el rótulo de la fila. Dos cosas distintas con el mismo nombre en el
// mismo ámbito es el error que ya mordió con la `t` del Diario el 2026-07-30.
function tabla(nombre, geometria, familia) {
  const quienes = FAMILIAS[familia].etiqueta
  const { senales: todas, porClave } = correr(geometria)
  const { senales, sin, retrasos } = conSesgo(todas, indices[familia])

  // La mitad se parte por FECHA, no por número de operaciones: así las dos
  // mitades son dos tramos de mercado y no dos montones desiguales.
  const corte = fechas[Math.floor((CALENTAMIENTO + fechas.length) / 2)]
  const m1 = (s) => s.vistoEl < corte
  const m2 = (s) => s.vistoEl >= corte

  const mide = (f) => medir(senales.filter(f), porClave, { conSpread: true })
  // ⚠️ El MISMO universo de señales, solo sin descontar el spread. Es la
  // columna del criterio `sinCostes`: un filtro que solo quita puede parecer
  // mejor sin acertar una dirección de más, basta que quite los cruces (3-4
  // pips) y deje los pares con dólar (menos de 1).
  const mideSin = (f) => medir(senales.filter(f), porClave, { conSpread: false })
  const base = mide(() => true)
  const baseM1 = mide(m1)
  const baseM2 = mide(m2)

  console.log('')
  console.log('═'.repeat(96))
  console.log(`${nombre}  —  ${quienes}`)
  console.log('═'.repeat(96))
  console.log(`Señales de la app con COT publicado: ${senales.length}  (descartadas por no haberlo todavía: ${sin})`)
  console.log(`Retraso del dato usado: mediana ${mediana(retrasos)} días · máximo ${Math.max(...retrasos)} días`)
  console.log(`Mitades partidas en ${corte}`)
  console.log('')
  console.log('filtro                                    ops   señ/mes   acierto   por 1R    1ª mitad   2ª mitad')
  console.log('─'.repeat(96))

  const filaTxt = (etiqueta, m, mA, mB) => {
    const pc = (x) => (x == null ? '   — ' : `${x.toFixed(0).padStart(4)}%`)
    const r = (x) => (x == null ? '     —' : `${x >= 0 ? '+' : ''}${x.toFixed(3)}`)
    console.log(
      `${etiqueta.padEnd(40)} ${String(m.total).padStart(5)}   ${(m.total / MESES).toFixed(1).padStart(6)}   ` +
        `${pc(m.acierto)}   ${r(m.porRiesgo).padStart(7)}   ${r(mA.porRiesgo).padStart(8)}   ${r(mB.porRiesgo).padStart(8)}`,
    )
  }

  filaTxt('SIN FILTRO (la app tal cual)', base, baseM1, baseM2)
  console.log('─'.repeat(96))

  const resultados = []
  for (const [dir, fn] of Object.entries(DIRECCIONES)) {
    for (const u of UMBRALES) {
      const f = (s) => fn(s, u)
      const m = mide(f)
      const a = mide((s) => f(s) && m1(s))
      const b = mide((s) => f(s) && m2(s))
      const etiqueta =
        dir === 'seguir'
          ? `seguir a ${quienes}, |sesgo| ≥ ${u}`
          : `ir EN CONTRA de ${quienes}, |sesgo| ≥ ${u}`
      filaTxt(etiqueta, m, a, b)
      resultados.push({ dir, u, m, a, b, filtro: f })
    }
    console.log('─'.repeat(96))
  }

  return {
    base,
    baseM1,
    baseM2,
    resultados,
    quienes,
    // Lo que el veredicto necesita y no se puede recalcular después: las
    // señales de ESTE universo y las dos formas de medirlas.
    senales,
    mide,
    mideSin,
  }
}

console.log('')
console.log('«por 1R» = cuánto se gana o se pierde por cada unidad de riesgo, con costes.')
console.log('Es LA columna. Positivo = gana. Negativo = pierde.')
console.log('')
console.log('«sesgo» = neto% de la divisa de la izquierda menos el de la derecha, con el')
console.log('dólar valiendo 0 (su lado ya está dentro del número de la otra divisa).')
console.log('Positivo = ese grupo está comprado en ese par. Negativo = vendido.')

// ─────────────────────────────────────────────────────────────────────────
// El veredicto de una familia, que lo calcula su listón
// ─────────────────────────────────────────────────────────────────────────
function veredictoDe(neutra, lista, juzgar, queSignifica, extras = false) {
  // El mejor de todos, con la vara neutra.
  const mejor = neutra.resultados.reduce((a, b) => (b.m.porRiesgo > a.m.porRiesgo ? b : a))

  // ¿Los vecinos del mejor también mejoran? Vecinos = los umbrales de al lado
  // en la MISMA dirección.
  const mismos = neutra.resultados.filter((r) => r.dir === mejor.dir).sort((a, b) => a.u - b.u)
  const i = mismos.findIndex((r) => r.u === mejor.u)
  const vecinos = [mismos[i - 1], mismos[i + 1]].filter(Boolean)
  const vecinosMejoran = vecinos.length > 0 && vecinos.every((v) => v.m.porRiesgo > neutra.base.porRiesgo)

  // ¿Qué dirección gana en cada mitad? Se mira el mejor de cada dirección en
  // cada mitad por separado.
  const mejorDe = (dir, cual) =>
    neutra.resultados.filter((r) => r.dir === dir).reduce((a, b) => (b[cual].porRiesgo > a[cual].porRiesgo ? b : a))
  const ganaEn = (cual) => {
    const s = mejorDe('seguir', cual)[cual].porRiesgo
    const c = mejorDe('contra', cual)[cual].porRiesgo
    if (s == null || c == null) return null
    return s > c ? 'seguir' : 'contra'
  }

  const datos = {
    basePorR: neutra.base.porRiesgo,
    baseMitad1: neutra.baseM1.porRiesgo,
    baseMitad2: neutra.baseM2.porRiesgo,
    mejorPorR: mejor.m.porRiesgo,
    mejorMitad1: mejor.a.porRiesgo,
    mejorMitad2: mejor.b.porRiesgo,
    mejorSenalesMes: mejor.m.total / MESES,
    vecinosMejoran,
    direccionMitad1: ganaEn('a'),
    direccionMitad2: ganaEn('b'),
  }

  // Los dos criterios que solo tiene el listón de los pequeños. Se calculan
  // únicamente cuando hacen falta: `mayorAporte` recorre los 14 pares por
  // separado y no tiene sentido pagarlo para un listón que no lo pide.
  if (extras) {
    datos.baseSinCostes = neutra.mideSin(() => true).porRiesgo
    datos.mejorSinCostes = neutra.mideSin(mejor.filtro).porRiesgo
    datos.mayorAporteDeUnPar = mayorAportePorPar(neutra.mide, neutra.senales, mejor.filtro)
  }

  const veredicto = juzgar(datos)

  console.log('')
  console.log('═'.repeat(96))
  console.log(`EL VEREDICTO — ${neutra.quienes}`)
  console.log('═'.repeat(96))
  console.log('')
  console.log(
    `El mejor filtro de los diez: ${mejor.dir === 'seguir' ? 'SEGUIR a' : 'ir EN CONTRA de'} ${neutra.quienes}, |sesgo| ≥ ${mejor.u}`,
  )
  console.log(`  por 1R: ${mejor.m.porRiesgo?.toFixed(3)}   contra ${neutra.base.porRiesgo?.toFixed(3)} sin filtro`)
  console.log(
    `  mitades: ${mejor.a.porRiesgo?.toFixed(3)} y ${mejor.b.porRiesgo?.toFixed(3)}   contra ${neutra.baseM1.porRiesgo?.toFixed(3)} y ${neutra.baseM2.porRiesgo?.toFixed(3)}`,
  )
  console.log(`  señales al mes: ${(mejor.m.total / MESES).toFixed(1)}`)
  console.log(`  dirección que gana en la 1ª mitad: ${ganaEn('a')} · en la 2ª: ${ganaEn('b')}`)
  if (extras) {
    const n = (x) => (x == null ? '—' : x.toFixed(3))
    console.log(`  SIN costes: ${n(datos.mejorSinCostes)}   contra ${n(datos.baseSinCostes)} sin filtro`)
    console.log(
      `  el par que más aporta a la mejora: ${datos.mayorAporteDeUnPar == null ? '—' : `${(datos.mayorAporteDeUnPar * 100).toFixed(0)} %`}`,
    )
  }
  console.log('')
  for (const c of lista) {
    console.log(`  ${veredicto.criterios[c.id] ? '✅' : '❌'}  ${c.que}`)
  }
  console.log('')
  console.log(veredicto.aprobado ? `  → APROBADO los ${lista.length} criterios.` : '  → NO PASA el listón.')
  console.log('')
  console.log(queSignifica)
  return veredicto
}

// ⚠️ La vara NEUTRA va primero y es con la que se decide: stop y objetivo a la
// misma distancia. Es la única que permite comparar filtros entre sí sin que el
// acierto y el tamaño se mezclen. La geometría real de la app va después, como
// comprobación de que la conclusión no cambia.
const neutras = {}
for (const familia of ['fondos', 'pequenos']) {
  console.log('')
  console.log('')
  console.log('#'.repeat(96))
  console.log(`#  ${FAMILIAS[familia].etiqueta.toUpperCase()} — ${FAMILIAS[familia].descripcion}`)
  console.log('#'.repeat(96))
  neutras[familia] = tabla('CON LA VARA NEUTRA 1:1  ←  ES CON LA QUE SE DECIDE', simetrica, familia)
  tabla('CON LA GEOMETRÍA REAL DE LA APP  (comprobación)', actual, familia)
}

veredictoDe(neutras.fondos, PREREGISTRO_COT, juzgarCot, QUE_SIGNIFICA_APROBAR_COT)
veredictoDe(neutras.pequenos, PREREGISTRO_PEQUENOS, juzgarPequenos, QUE_SIGNIFICA_APROBAR_PEQUENOS, true)

console.log('')
console.log('⚠️ Y recordar la limitación de arriba: aquí el filtro solo QUITA señales.')
console.log('   En la app de verdad el hueco lo rellenaría la siguiente de la lista.')
console.log('---MEDICION-COT-FIN---')
