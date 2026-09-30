// Comprobaciones de la rejilla diaria de Swing. SIN INTERNET y sin créditos.
//
//     node scripts/prueba-rejilla-diaria.mjs
//
// Vigila los fallos que no dan error: un ATR que no es el de la app, un día
// culpable inventado, un arreglo que se come el salto del fin de semana, y un
// veredicto que dice «no pasa nada» cuando lo que pasó es que no se pudo
// mirar.

import { atrWilder } from '../src/lib/marketCalc.js'
import {
  ATR_REVERSION,
  COJIN_ATR,
  PERIODO_ATR,
  UMBRAL_ESTRECHA,
  VELAS_LO10,
  comoQuedaria,
  compararArreglos,
  diaCulpable,
  diaDe,
  fundir,
  mediana,
  nombreDia,
  quitar,
  velasEstrechas,
} from './lib/rejilla-diaria.mjs'
import {
  ARREGLOS,
  CAMBIO_MINIMO,
  FECHA_PREREGISTRO,
  LO_QUE_SE_SUPO_GRATIS,
  MAYORIA,
  QUE_DICE_EL_DIAGNOSTICO,
  QUE_NO_AUTORIZA,
  juzgarConjunto,
  juzgarPar,
} from './lib/preregistro-rejilla-diaria.mjs'

let ok = 0
let mal = 0
const bien = (c, q) => (c ? (ok++, console.log(`  ✓ ${q}`)) : (mal++, console.log(`  ✗ ${q}`)))

// ─────────────────────────────────────────────────────────────────────────
// Un mercado inventado: seis velas normales y una estrecha, en bucle.
//
// ⚠️ La estrecha se pone en un día FIJO de la semana a propósito, porque es lo
// que el diagnóstico tiene que ser capaz de encontrar. Y las normales llevan
// un paseo para que el ATR no salga de un rango constante — un mercado
// demasiado liso ya hizo pasar una prueba comparando dos listas vacías
// (`prueba-barrido-publicado.mjs`, 2026-09-02).
// ─────────────────────────────────────────────────────────────────────────
function mercado({ semanas = 20, diaEstrecho = 0, estrechez = 0.25, conEstrechas = true } = {}) {
  const fechas = []
  const highs = []
  const lows = []
  const closes = []
  // 2026-01-04 es domingo, así que el índice 0 cae en el día 0.
  const base = Date.parse('2026-01-04T00:00:00Z')
  let precio = 1.1
  let semilla = 7
  const rnd = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5)

  for (let k = 0; k < semanas * 7; k++) {
    const d = new Date(base + k * 86400000)
    const fecha = d.toISOString().slice(0, 10)
    const dia = d.getUTCDay()
    const estrecha = conEstrechas && dia === diaEstrecho
    const ancho = (estrecha ? estrechez : 1) * 0.008 * (1 + 0.4 * rnd())
    precio += 0.002 * rnd() * (estrecha ? 0.2 : 1)
    fechas.push(fecha)
    highs.push(precio + ancho / 2)
    lows.push(precio - ancho / 2)
    closes.push(precio + ancho * 0.1 * rnd())
  }
  return { fechas, highs, lows, closes }
}

console.log('')
console.log('1. El ATR es EL DE LA APP, no una reimplementación')
{
  const m = mercado({ semanas: 12 })
  const q = comoQuedaria(m.highs, m.lows, m.closes)
  const esperado = atrWilder(m.highs, m.lows, m.closes, PERIODO_ATR)
  bien(q != null, 'se puede calcular con 84 velas')
  bien(q.atr === esperado, `coincide EXACTAMENTE con atrWilder de la app (${q.atr.toExponential(4)})`)
  // ⚠️ La guarda que de verdad importa: el atrWilder de SWING recorre la serie
  // entera. Si algún día le pusieran la ventana de 60 que tiene el de
  // Intradía, este número cambiaría y esta prueba lo cantaría.
  const corto = atrWilder(m.highs.slice(-61), m.lows.slice(-61), m.closes.slice(-61), PERIODO_ATR)
  bien(
    corto !== esperado,
    'y NO coincide con el de las últimas 60 velas: en Swing no hay ventana (en Intradía sí)'
  )
  bien(q.stopApp > 0 && q.stopReversion > 0, 'los dos stops salen positivos')
  bien(
    Math.abs(q.stopReversion - ATR_REVERSION * q.atr) < 1e-12,
    'el stop de la reversión es exactamente 1,5 × ATR'
  )
  bien(
    Math.abs(q.stopApp - (q.cierre - q.lo10 + COJIN_ATR * q.atr)) < 1e-12,
    'el de la app es (cierre − lo10) + 0,5 × ATR'
  )

  // ⚠️⚠️ `lo10` SON LAS 10 ÚLTIMAS VELAS, NO LA SERIE ENTERA. Esta
  // comprobación no estaba en la primera versión de esta prueba, y al poner el
  // daño a propósito —`lo10` sobre toda la serie— las 87 seguían en verde: el
  // mercado inventado sube y baja poco, así que el mínimo global y el de 10
  // días quedaban casi pegados. Una prueba que se adapta a lo que encuentra no
  // comprueba nada.
  //
  // Un fondo viejo y hundido, lejos de las 10 últimas, lo separa de verdad.
  const m2 = mercado({ semanas: 12 })
  m2.lows[5] = m2.lows[5] - 0.5
  const q2 = comoQuedaria(m2.highs, m2.lows, m2.closes)
  const minGlobal = Math.min(...m2.lows)
  bien(q2.lo10 !== minGlobal, 'lo10 ignora un fondo viejo que está fuera de las 10 últimas')
  bien(
    q2.lo10 === Math.min(...m2.lows.slice(-VELAS_LO10)),
    `y es exactamente el mínimo de las ${VELAS_LO10} últimas`
  )
}

console.log('')
console.log('2. El día de la semana, en UTC y sin día por defecto')
{
  bien(diaDe('2026-01-04') === 0, '2026-01-04 es domingo')
  bien(diaDe('2026-09-30') === 3, '2026-09-30 es miércoles')
  bien(diaDe('2026-08-09') === 0, '2026-08-09 —la primera corrida del vigía— fue domingo')
  bien(diaDe('2026-09-30T13:00:00Z') === 3, 'una fecha con hora dentro también se entiende')
  // ⚠️ Ninguna de estas puede devolver un día: un día por defecto metería
  // velas en el cubo equivocado sin que nada falle.
  for (const basura of [null, undefined, '', 'ayer', '30/09/2026', 42, {}, '2026-13-45']) {
    bien(diaDe(basura) === null, `«${String(basura)}» → null, no un día inventado`)
  }
  bien(nombreDia(null) === '—', 'sin día no se imprime ningún nombre')
  bien(nombreDia(0) === 'domingo' && nombreDia(5) === 'viernes', 'los nombres cuadran')
}

console.log('')
console.log('3. Encontrar las velas estrechas, y su reparto ENTERO')
{
  const m = mercado({ semanas: 20, diaEstrecho: 0 })
  const e = velasEstrechas(m.fechas, m.highs, m.lows)
  bien(e != null, 'se pueden encontrar')
  bien(e.idx.length === 20, `salen las 20 esperadas (una por semana), no ${e.idx.length}`)
  bien(Object.keys(e.porDia).length === 1 && e.porDia[0] === 20, 'todas caen en domingo')
  bien(
    Object.keys(e.totalPorDia).length === 7,
    'y el reparto trae los SIETE días, no solo el ganador'
  )
  bien(
    Math.abs(e.proporcion - 1 / 7) < 0.01,
    `la proporción es ~1 de cada 7 (${(100 * e.proporcion).toFixed(1)} %)`
  )
  bien(
    e.rangoMedianoEstrechas < 0.5 * e.rangoMediano,
    'y las estrechas miden menos de la mitad que la mediana del par'
  )

  // El caso que tiene que salir vacío: un mercado sin ninguna vela estrecha.
  const limpio = velasEstrechas(...Object.values(mercado({ conEstrechas: false })).slice(0, 3))
  bien(limpio != null && limpio.idx.length === 0, 'un mercado sin estrechas devuelve lista vacía')

  // Y los casos donde no se puede mirar: `null`, nunca «no hay estrechas».
  bien(velasEstrechas([], [], []) === null, 'sin velas → null, no «no hay estrechas»')
  bien(
    velasEstrechas(['2026-01-04'], [NaN], [NaN]) === null,
    'con rangos ilegibles → null'
  )
}

console.log('')
console.log('4. El día culpable: las DOS condiciones, y nunca uno por defecto')
{
  const m = mercado({ semanas: 20, diaEstrecho: 3 })
  const c = diaCulpable(velasEstrechas(m.fechas, m.highs, m.lows))
  bien(c != null && c.dia === 3, `encuentra el miércoles (${c?.nombre})`)
  bien(c.concentra === 1 && c.densa === 1, 'y con concentración y densidad del 100 %')

  bien(diaCulpable(null) === null, 'sin datos no hay culpable')
  bien(
    diaCulpable({ idx: [], porDia: {}, totalPorDia: {} }) === null,
    'sin estrechas no hay culpable'
  )

  // ⚠️ Repartidas entre tres días: NO hay culpable. Sin esta condición, el día
  // con más estrechas ganaría aunque fuera un tercio.
  const repartido = { idx: [1, 2, 3], porDia: { 1: 1, 2: 1, 3: 1 }, totalPorDia: { 1: 5, 2: 5, 3: 5 } }
  bien(diaCulpable(repartido) === null, 'repartidas entre tres días → ningún culpable')

  // ⚠️ Y la otra condición: un día que concentra todas las estrechas pero del
  // que solo 2 de 40 velas son estrechas NO es el culpable — es casualidad.
  const raro = { idx: [1, 2], porDia: { 4: 2 }, totalPorDia: { 4: 40 } }
  bien(diaCulpable(raro) === null, 'un día con 2 estrechas de 40 velas tampoco es culpable')
}

console.log('')
console.log('5. QUITAR y FUNDIR hacen lo que dicen')
{
  const fechas = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']
  const highs = [10, 2.1, 12, 13]
  const lows = [9, 2.0, 11, 12]
  const closes = [9.5, 2.05, 11.5, 12.5]

  const q = quitar([1], fechas, highs, lows, closes)
  bien(q.fechas.length === 3 && !q.fechas.includes('2026-01-02'), 'quitar saca esa vela y solo esa')
  bien(q.highs.join() === '10,12,13', 'y no toca los máximos de las demás')

  const f = fundir([1], fechas, highs, lows, closes)
  bien(f.fechas.length === 3, 'fundir también deja 3 velas')
  bien(f.fechas[1] === '2026-01-03', 'la que sobrevive es la SIGUIENTE, no la estrecha')
  bien(f.highs[1] === 12 && f.lows[1] === 2.0, 'con el máximo de una y el MÍNIMO de la otra')
  bien(f.closes[1] === 11.5, 'y el cierre de la siguiente, no el de la estrecha')

  // ⚠️ Una estrecha al FINAL no tiene siguiente. Se quita, y eso importa: es
  // justo la vela con la que la app calcula hoy.
  const fFinal = fundir([3], fechas, highs, lows, closes)
  bien(fFinal.fechas.length === 3 && !fFinal.fechas.includes('2026-01-04'), 'una estrecha al final se quita')

  // ⚠️ El salto no se pierde al quitar: el rango verdadero del día siguiente
  // se mide contra el cierre de ANTES de la estrecha.
  const trasQuitar = Math.max(q.highs[1] - q.lows[1], Math.abs(q.highs[1] - q.closes[0]), Math.abs(q.lows[1] - q.closes[0]))
  bien(trasQuitar >= q.highs[1] - q.lows[1], 'y el salto contra el cierre anterior sigue contando')
}

console.log('')
console.log('6. La comparación completa, y que el efecto vaya en la dirección del mecanismo')
{
  const m = mercado({ semanas: 30, diaEstrecho: 0, estrechez: 0.2 })
  const c = compararArreglos(m.fechas, m.highs, m.lows, m.closes)
  bien(c != null, 'se puede comparar')
  bien(c.culpable?.dia === 0, 'el culpable sale domingo')
  bien(c.arreglos.quitar != null && c.arreglos.fundir != null, 'y vienen LOS DOS arreglos, siempre')

  // El mecanismo: si se quitan velas estrechas, el ATR tiene que SUBIR.
  bien(c.arreglos.quitar.cambioATR > 0, `al quitar, el ATR sube (${(100 * c.arreglos.quitar.cambioATR).toFixed(1)} %)`)
  bien(c.arreglos.fundir.cambioATR > 0, `al fundir, también (${(100 * c.arreglos.fundir.cambioATR).toFixed(1)} %)`)

  // ⚠️ Y la comprobación que separa esta app de la hermana: el stop de la app
  // se mueve MUCHO MENOS que el ATR, porque el ATR solo es medio cojín encima
  // de un nivel estructural. Si algún día el stop se moviera igual que el ATR,
  // alguien habría cambiado la geometría y esto tiene que cantarlo.
  bien(
    Math.abs(c.arreglos.quitar.cambioStopApp) < Math.abs(c.arreglos.quitar.cambioATR),
    'el stop de la APP se mueve menos que el ATR (aquí el ATR es medio cojín)'
  )
  bien(
    Math.abs(c.arreglos.quitar.cambioStopReversion - c.arreglos.quitar.cambioATR) < 1e-12,
    'y el de la REVERSIÓN se mueve exactamente igual que el ATR (ahí el ATR ES el stop)'
  )

  // Un mercado sin estrechas: los dos arreglos no cambian nada.
  const limpio = mercado({ semanas: 30, conEstrechas: false })
  const cl = compararArreglos(limpio.fechas, limpio.highs, limpio.lows, limpio.closes)
  bien(cl.estrechas.idx.length === 0, 'sin estrechas no hay nada que quitar')
  bien(Math.abs(cl.arreglos.quitar.cambioATR) < 1e-12, 'y el ATR no se mueve ni un poco')
  bien(cl.culpable === null, 'ni hay día culpable')

  bien(compararArreglos(['a'], [1], [1], [1]) === null, 'con cuatro datos no se inventa una comparación')
}

console.log('')
console.log('7. El preregistro: el veredicto se CALCULA, y «no se pudo mirar» no es «no pasa nada»')
{
  bien(FECHA_PREREGISTRO === '2026-09-30', 'lleva la fecha dentro')
  bien(CAMBIO_MINIMO === 0.02, 'el umbral es el 2 %, el peso del spread en el stop')
  bien(Object.keys(ARREGLOS).length === 2, 'los DOS arreglos están nombrados antes de medir')
  bien(Object.keys(QUE_DICE_EL_DIAGNOSTICO).length === 3, 'y los tres resultados posibles también')
  bien(/nada/.test(QUE_NO_AUTORIZA), 'y queda escrito que no autoriza encender nada')
  bien(
    LO_QUE_SE_SUPO_GRATIS.espaciado === 7 && LO_QUE_SE_SUPO_GRATIS.velasPlanas === 0,
    'lo medido gratis está congelado (1 de cada 7, ninguna plana)'
  )
  // ⚠️ La coherencia del techo, recalculada aquí: si alguien mueve uno de los
  // tres números, el 1,84 deja de cuadrar y esto lo canta.
  const techo =
    LO_QUE_SE_SUPO_GRATIS.pesoDeUnaVela *
    LO_QUE_SE_SUPO_GRATIS.cojinSobreStop *
    LO_QUE_SE_SUPO_GRATIS.stopMedianoPips
  bien(Math.abs(techo - LO_QUE_SE_SUPO_GRATIS.techoUnaVelaPips) < 0.05, `el techo de 1 vela cuadra (${techo.toFixed(2)} pips)`)
  bien(
    LO_QUE_SE_SUPO_GRATIS.techoUnaVelaPips < LO_QUE_SE_SUPO_GRATIS.spreadTipicoPips,
    'y queda por debajo del spread, que es lo que contesta la pregunta pequeña'
  )

  bien(juzgarPar({ cambioATR: 0.001, cambioStopApp: 0.0002 }) === 'nada', 'un ATR que no se mueve → nada')
  bien(juzgarPar({ cambioATR: 0.10, cambioStopApp: 0.005 }) === 'soloLaSombra', 'ATR sí, stop de la app no → solo la sombra')
  bien(juzgarPar({ cambioATR: 0.10, cambioStopApp: 0.05 }) === 'cambiaLosStops', 'los dos → cambia los stops')
  bien(juzgarPar({ cambioATR: -0.10, cambioStopApp: -0.05 }) === 'cambiaLosStops', 'y se mira el valor absoluto, no el signo')

  // Los bordes exactos del umbral.
  bien(juzgarPar({ cambioATR: 0.02, cambioStopApp: 0.02 }) === 'cambiaLosStops', 'justo en el 2 % ya cuenta')
  bien(juzgarPar({ cambioATR: 0.0199, cambioStopApp: 0.5 }) === 'nada', 'justo por debajo, no')

  // ⚠️ `null` y no «nada»: lo que falta no es lo mismo que lo que no pasa.
  for (const roto of [null, undefined, {}, { cambioATR: null, cambioStopApp: 0.1 }, { cambioATR: 0.1, cambioStopApp: NaN }]) {
    bien(juzgarPar(roto) === null, 'sin número → null, nunca «nada»')
  }
}

console.log('')
console.log('8. El veredicto conjunto pide MAYORÍA de los 14 pares')
{
  bien(MAYORIA === 0.7, 'la mayoría exigida es el 70 %')
  const n = (k, c) => Array(c).fill(k)
  bien(
    juzgarConjunto([...n('cambiaLosStops', 10), ...n('nada', 4)]) === 'cambiaLosStops',
    '10 de 14 → hay veredicto'
  )
  bien(
    juzgarConjunto([...n('cambiaLosStops', 9), ...n('nada', 5)]) === 'mezclado',
    '9 de 14 → mezclado, no se fuerza un veredicto'
  )
  bien(juzgarConjunto(n('nada', 14)) === 'nada', 'los catorce de acuerdo en «nada» → nada')
  bien(juzgarConjunto(n('soloLaSombra', 14)) === 'soloLaSombra', 'y en «solo la sombra» → solo la sombra')
  // ⚠️ Los que no se pudieron mirar NO cuentan como votos, ni a favor ni en
  // contra: la mayoría se mide sobre los que sí se pudieron mirar.
  bien(
    juzgarConjunto([...n('cambiaLosStops', 7), ...n(null, 7)]) === 'cambiaLosStops',
    'los que no se pudieron mirar no votan'
  )
  bien(juzgarConjunto([]) === null, 'sin ningún par → null, no un veredicto')
  bien(juzgarConjunto(n(null, 14)) === null, 'catorce sin mirar → null, no «nada»')
}

console.log('')
console.log('9. Mediana, que es con la que se compara todo')
{
  bien(mediana([3, 1, 2]) === 2, 'impar')
  bien(mediana([4, 1, 2, 3]) === 2.5, 'par')
  bien(mediana([]) === null, 'vacía → null')
  bien(mediana([1, NaN, 3]) === 2, 'los NaN no cuentan')
  bien(mediana(null) === null, 'sin lista → null')
  bien(UMBRAL_ESTRECHA === 0.5, 'y «estrecha» es por debajo de la mitad de la mediana de su par')
}

console.log('')
console.log(`${ok} bien · ${mal} MAL`)
if (mal) process.exit(1)
