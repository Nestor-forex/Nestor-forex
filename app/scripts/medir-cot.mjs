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
// El listón está en `lib/preregistro-cot.mjs`, escrito ANTES de correr esto.
//
// ⚠️ GASTA 14 CRÉDITOS de Twelve Data (las velas). El historial del COT es
// gratis y no gasta ninguno.
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

import { computarBarrido } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { generarSenales, medir } from './lib/backtest-nucleo.mjs'
import { simetrica, actual } from './lib/geometrias.mjs'
import { resolver } from './lib/resolver.mjs'
import { bajarHistoria, diasEntre, indexarHistoria, sesgoDePar } from './lib/cot-historia.mjs'
import { FECHA_PREREGISTRO, PREREGISTRO_COT, QUE_SIGNIFICA_APROBAR_COT, juzgarCot } from './lib/preregistro-cot.mjs'

const CALENTAMIENTO = 80
const THR = 0.5
const TOP_N = 3
const VELAS = Number(process.env.VELAS || 1500)

// Los umbrales que se prueban, en puntos de porcentaje del interés abierto.
// Cinco, para poder mirar los VECINOS del mejor: un efecto real se degrada
// suave y una casualidad de rejilla no.
const UMBRALES = [0, 2, 5, 10, 15]

console.log('---MEDICION-COT-INICIO---')
console.log(`Fecha (UTC): ${new Date().toISOString()}`)
console.log('')
console.log('EL LISTÓN, ESCRITO ANTES DE VER NADA')
console.log(`(fijado el ${FECHA_PREREGISTRO}, en scripts/lib/preregistro-cot.mjs)`)
for (const c of PREREGISTRO_COT) {
  console.log('')
  console.log(`  · ${c.que}`)
  console.log(`    ${c.porque}`)
}
console.log('')
console.log('─'.repeat(96))

// ── Las velas y las señales de la app ────────────────────────────────────
const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave(), { velas: VELAS })
const completo = computarBarrido(fechas, rates, rangosPar)
console.log('')
console.log(`Días descargados: ${fechas.length} · de ${fechas[0]} a ${fechas.at(-1)}`)

// ── El historial del COT ─────────────────────────────────────────────────
const crudo = await bajarHistoria('2019-01-01')
const idx = indexarHistoria(crudo)
console.log(`Informes del COT: ${crudo.length} filas · ${Object.keys(idx).length} divisas`)
for (const d of Object.keys(idx).sort()) {
  console.log(`    ${d}: ${idx[d].length} informes, de ${idx[d][0].f} a ${idx[d].at(-1).f}`)
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
function conSesgo(senales) {
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

const MESES = (fechas.length - CALENTAMIENTO) / 30.44

function tabla(nombre, geometria) {
  const { senales: todas, porClave } = correr(geometria)
  const { senales, sin, retrasos } = conSesgo(todas)

  // La mitad se parte por FECHA, no por número de operaciones: así las dos
  // mitades son dos tramos de mercado y no dos montones desiguales.
  const corte = fechas[Math.floor((CALENTAMIENTO + fechas.length) / 2)]
  const m1 = (s) => s.vistoEl < corte
  const m2 = (s) => s.vistoEl >= corte

  const mide = (f) => medir(senales.filter(f), porClave, { conSpread: true })
  const base = mide(() => true)
  const baseM1 = mide(m1)
  const baseM2 = mide(m2)

  console.log('')
  console.log('═'.repeat(96))
  console.log(nombre)
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
          ? `seguir a los fondos, |sesgo| ≥ ${u}`
          : `ir EN CONTRA de los fondos, |sesgo| ≥ ${u}`
      filaTxt(etiqueta, m, a, b)
      resultados.push({ dir, u, m, a, b })
    }
    console.log('─'.repeat(96))
  }

  return { base, baseM1, baseM2, resultados }
}

console.log('')
console.log('«por 1R» = cuánto se gana o se pierde por cada unidad de riesgo, con costes.')
console.log('Es LA columna. Positivo = gana. Negativo = pierde.')
console.log('')
console.log('«sesgo» = neto% de la divisa de la izquierda menos el de la derecha, con el')
console.log('dólar valiendo 0 (su lado ya está dentro del número de la otra divisa).')
console.log('Positivo = los fondos están comprados en ese par. Negativo = vendidos.')

// ⚠️ La vara NEUTRA va primero y es con la que se decide: stop y objetivo a la
// misma distancia. Es la única que permite comparar filtros entre sí sin que el
// acierto y el tamaño se mezclen. La geometría real de la app va después, como
// comprobación de que la conclusión no cambia.
const neutra = tabla(
  'CON LA VARA NEUTRA 1:1  ←  ES CON LA QUE SE DECIDE',
  simetrica,
)
tabla('CON LA GEOMETRÍA REAL DE LA APP  (comprobación)', actual)

// ── El veredicto, que lo calcula el listón ───────────────────────────────
console.log('')
console.log('═'.repeat(96))
console.log('EL VEREDICTO')
console.log('═'.repeat(96))

// El mejor de todos, con la vara neutra.
const mejor = neutra.resultados.reduce((a, b) => (b.m.porRiesgo > a.m.porRiesgo ? b : a))

// ¿Los vecinos del mejor también mejoran? Vecinos = los umbrales de al lado en
// la MISMA dirección.
const mismos = neutra.resultados.filter((r) => r.dir === mejor.dir).sort((a, b) => a.u - b.u)
const i = mismos.findIndex((r) => r.u === mejor.u)
const vecinos = [mismos[i - 1], mismos[i + 1]].filter(Boolean)
const vecinosMejoran = vecinos.length > 0 && vecinos.every((v) => v.m.porRiesgo > neutra.base.porRiesgo)

// ¿Qué dirección gana en cada mitad? Se mira el mejor de cada dirección en cada
// mitad por separado.
const mejorDe = (dir, cual) =>
  neutra.resultados.filter((r) => r.dir === dir).reduce((a, b) => (b[cual].porRiesgo > a[cual].porRiesgo ? b : a))
const ganaEn = (cual) => {
  const s = mejorDe('seguir', cual)[cual].porRiesgo
  const c = mejorDe('contra', cual)[cual].porRiesgo
  if (s == null || c == null) return null
  return s > c ? 'seguir' : 'contra'
}

const veredicto = juzgarCot({
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
})

console.log('')
console.log(`El mejor filtro de los diez: ${mejor.dir === 'seguir' ? 'SEGUIR a los fondos' : 'ir EN CONTRA de los fondos'}, |sesgo| ≥ ${mejor.u}`)
console.log(`  por 1R: ${mejor.m.porRiesgo?.toFixed(3)}   contra ${neutra.base.porRiesgo?.toFixed(3)} sin filtro`)
console.log(`  mitades: ${mejor.a.porRiesgo?.toFixed(3)} y ${mejor.b.porRiesgo?.toFixed(3)}   contra ${neutra.baseM1.porRiesgo?.toFixed(3)} y ${neutra.baseM2.porRiesgo?.toFixed(3)}`)
console.log(`  señales al mes: ${(mejor.m.total / MESES).toFixed(1)}`)
console.log(`  dirección que gana en la 1ª mitad: ${ganaEn('a')} · en la 2ª: ${ganaEn('b')}`)
console.log('')
for (const c of PREREGISTRO_COT) {
  console.log(`  ${veredicto.criterios[c.id] ? '✅' : '❌'}  ${c.que}`)
}
console.log('')
console.log(veredicto.aprobado ? '  → APROBADO los cinco criterios.' : '  → NO PASA el listón.')
console.log('')
console.log(QUE_SIGNIFICA_APROBAR_COT)
console.log('')
console.log('⚠️ Y recordar la limitación de arriba: aquí el filtro solo QUITA señales.')
console.log('   En la app de verdad el hueco lo rellenaría la siguiente de la lista.')
console.log('---MEDICION-COT-FIN---')
